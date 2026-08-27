import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rawPoolModule = require("../paper-raw-entry-pool-v1.js");
const entryModule = require("../src/paper-import/entry/index.js");
const entryArtifactModule = require("../src/paper-import/entry/artifact.js");
const checkpointStore = require("../src/paper-import/workflow/checkpoint-store.js");

const V131 = "paper-entry-parallel-extraction-v1.31";

function sixPageSource() {
  return Array.from({ length: 6 }, (_, index) => `[[PAGE ${index + 1}]]\nPage ${index + 1} source`).join("\n\n");
}

function pageSource(pageCount) {
  return Array.from({ length: pageCount }, (_, index) => `[[PAGE ${index + 1}]]\nPage ${index + 1} source`).join("\n\n");
}

test("Entry VNext 在单窗口失败时保留成功窗口并记录未解决项", async () => {
  const pool = await rawPoolModule.extractParallelRawEntryPool({
    fileName: "partial.pdf",
    pageCount: 6,
    text: sixPageSource(),
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    maxParallelCalls: 2,
    chatImpl: async ({ chunkIndex }) => {
      if (chunkIndex === 0) {
        throw new Error("gateway failed https://signed.example/result.zip?token=secret Bearer model-secret apiKey=sk-live-123 authorization=Basic-secret token=raw-token secret:raw-secret payload={\"api_key\":\"sk-json\",\"token\":\"tok-json\"}");
      }
      return {
        content: JSON.stringify({
          foundationEntries: [],
          resultEntries: [{
            id: "claim:survives",
            entryClass: "claim",
            claimKind: "theorem",
            name: "Surviving theorem",
            statement: "$T$ holds.",
            page: 6,
          }],
          inferenceHints: [],
        }),
      };
    },
  });

  assert.equal(pool.rawEntries.length, 1);
  assert.equal(pool.rawEntries[0].id, "claim:survives");
  assert.equal(pool.unresolvedItems.length, 1);
  assert.deepEqual(pool.unresolvedItems[0], {
    id: "unresolved:entry-window:0",
    sourceStage: "entry",
    sourceLocator: "pages 1-5",
    candidateSummary: "Entry extraction window 1 failed",
    failureCategory: "window-extraction-failed",
    validationError: "gateway failed [redacted-url] Bearer [redacted] apiKey=[redacted] authorization=[redacted] token=[redacted] secret=[redacted] payload={\"api_key\":\"[redacted]\",\"token\":\"[redacted]\"}",
    retryable: true,
  });
  assert.doesNotMatch(JSON.stringify(pool), /signed\.example|token=secret|model-secret|sk-live|Basic-secret|raw-token|raw-secret|sk-json|tok-json/iu);
});

test("Entry VNext consolidation 为每个非法候选生成未解决项", () => {
  const sourceText = "[[PAGE 1]]\nSource\n\n[[PAGE 2]]\nMore source";
  const rawPool = rawPoolModule.createRawEntryPool({
    source: {
      fileName: "candidates.pdf",
      pageCount: 2,
      characters: sourceText.length,
      sourceText,
    },
    chunks: [{
      chunkIndex: 0,
      pageRange: { first: 1, last: 2 },
      characterCount: sourceText.length,
      text: sourceText,
      rawEntries: [
        { id: "fact:good", entryClass: "fact", factKind: "definition", statement: "$X$ is a space.", page: 1 },
        { id: "claim:bad-page", entryClass: "claim", claimKind: "theorem", statement: "$T$.", page: 99 },
        { id: "entry:bad-kind", entryClass: "other", statement: "$Y$.", page: 2 },
        { id: "claim:broken-math", entryClass: "claim", claimKind: "lemma", statement: "$z=1", page: 2 },
      ],
    }],
    unresolvedItems: [{
      id: "unresolved:entry-window:2",
      sourceStage: "entry",
      sourceLocator: "pages 5-6",
      candidateSummary: "Entry extraction window 3 failed",
      failureCategory: "window-extraction-failed",
      validationError: "gateway failed",
      retryable: true,
    }],
  });

  const artifact = entryModule.consolidateRawEntryPool(rawPool, { strictMath: true, allowPartialSuccess: true });
  assert.deepEqual(artifact.entries.map((entry) => entry.id), ["fact:good"]);
  assert.equal(artifact.unresolvedItems.length, 4);
  assert.deepEqual(artifact.unresolvedItems.map((item) => item.failureCategory), [
    "window-extraction-failed",
    "candidate-invalid-page",
    "candidate-invalid",
    "candidate-damaged-math",
  ]);
  assert.ok(artifact.unresolvedItems.every((item) => (
    item.sourceStage === "entry"
    && typeof item.candidateSummary === "string"
    && typeof item.validationError === "string"
    && item.retryable === true
  )));
});

test("Entry VNext 在零个合法候选时硬失败并携带未解决项", () => {
  const sourceText = "[[PAGE 1]]\nSource";
  const rawPool = rawPoolModule.createRawEntryPool({
    source: { fileName: "empty.pdf", pageCount: 1, sourceText },
    chunks: [{
      chunkIndex: 0,
      pageRange: { first: 1, last: 1 },
      text: sourceText,
      rawEntries: [
      { id: "claim:bad-page", entryClass: "claim", claimKind: "theorem", statement: "$T$.", page: 3 },
      { id: "claim:broken", entryClass: "claim", claimKind: "lemma", statement: "$z=1", page: 1 },
      ],
    }],
  });

  assert.throws(
    () => entryModule.consolidateRawEntryPool(rawPool, { strictMath: true, allowPartialSuccess: true }),
    (error) => {
      assert.equal(error.code, "PAPER_TO_MAP_ENTRY_EMPTY");
      assert.deepEqual(error.unresolvedItems.map((item) => item.failureCategory), [
        "candidate-invalid-page",
        "candidate-damaged-math",
      ]);
      return true;
    },
  );
});

test("Entry VNext artifact 规范化和安全断点保留未解决项", () => {
  const sourceText = "[[PAGE 1]]\nSource";
  const artifact = entryArtifactModule.normalizePaperEntryArtifact({
    entryModuleVersion: "paper-entry-consolidation-v1.1-model",
    source: { fileName: "resume.pdf", pageCount: 1, sourceText },
    entries: [{ id: "fact:x", entryClass: "fact", factKind: "definition", statement: "$X$ is defined.", page: 1 }],
    aliases: { "fact:x": "fact:x" },
    diagnostics: { durationMs: 1, stages: [], calls: [] },
    unresolvedItems: [{
      id: "unresolved:entry-window:1",
      sourceStage: "entry",
      sourceLocator: "https://signed.example/file?token=secret",
      candidateSummary: "Entry extraction window 2 failed",
      failureCategory: "window-extraction-failed",
      validationError: "Bearer model-secret timeout",
      retryable: true,
    }],
  });

  assert.equal(artifact.unresolvedItems.length, 1);
  const saved = checkpointStore.sanitizeStageArtifact("consolidate", artifact);
  assert.deepEqual(saved.unresolvedItems, [{
    id: "unresolved:entry-window:1",
    sourceStage: "entry",
    sourceLocator: "[redacted-url]",
    candidateSummary: "Entry extraction window 2 failed",
    failureCategory: "window-extraction-failed",
    validationError: "Bearer [redacted] timeout",
    retryable: true,
  }]);
  assert.doesNotMatch(JSON.stringify(saved), /signed\.example|token=secret|model-secret/iu);
});

test("Entry VNext 重试只重跑失败窗口并复用成功窗口断点", async () => {
  const laneCache = {};
  const firstCalls = [];
  const common = {
    fileName: "retry.pdf",
    pageCount: 6,
    text: sixPageSource(),
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    maxParallelCalls: 1,
    onLaneComplete: async ({ cacheKey, entries }) => { laneCache[cacheKey] = entries; },
  };
  const responseFor = (chunkIndex) => ({
    content: JSON.stringify({
      foundationEntries: [],
      resultEntries: [{
        id: `claim:window-${chunkIndex}`,
        entryClass: "claim",
        claimKind: "theorem",
        statement: `$T_${chunkIndex}$ holds.`,
        page: chunkIndex === 0 ? 1 : 6,
      }],
      inferenceHints: [],
    }),
  });

  const first = await rawPoolModule.extractParallelRawEntryPool({
    ...common,
    chatImpl: async ({ chunkIndex }) => {
      firstCalls.push(chunkIndex);
      if (chunkIndex === 1) throw new Error("temporary failure");
      return responseFor(chunkIndex);
    },
  });
  assert.deepEqual(firstCalls, [0, 1]);
  assert.deepEqual(Object.keys(laneCache), ["0:combined"]);
  assert.equal(first.unresolvedItems.length, 1);

  const retryCalls = [];
  const retried = await rawPoolModule.extractParallelRawEntryPool({
    ...common,
    laneCache,
    chatImpl: async ({ chunkIndex }) => {
      retryCalls.push(chunkIndex);
      return responseFor(chunkIndex);
    },
  });
  assert.deepEqual(retryCalls, [1]);
  assert.deepEqual(retried.rawEntries.map((entry) => entry.id), ["claim:window-0", "claim:window-1"]);
  assert.deepEqual(retried.unresolvedItems, []);
});

test("Entry VNext 在所有窗口失败时以稳定错误码硬失败", async () => {
  await assert.rejects(
    rawPoolModule.extractParallelRawEntryPool({
      fileName: "all-fail.pdf",
      pageCount: 6,
      text: sixPageSource(),
      extractionModuleVersion: V131,
      allowPartialSuccess: true,
      maxParallelCalls: 2,
      chatImpl: async () => { throw new Error("temporary failure"); },
    }),
    (error) => {
      assert.equal(error.code, "PAPER_TO_MAP_ENTRY_EMPTY");
      assert.equal(error.unresolvedItems.length, 2);
      assert.ok(error.unresolvedItems.every((item) => item.failureCategory === "window-extraction-failed"));
      return true;
    },
  );
});

test("Entry VNext 多窗口失败的未解决项顺序不受并发完成顺序影响", async () => {
  const pool = await rawPoolModule.extractParallelRawEntryPool({
    fileName: "multi-fail.pdf",
    pageCount: 11,
    text: pageSource(11),
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    maxParallelCalls: 3,
    chatImpl: async ({ chunkIndex }) => {
      if (chunkIndex === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error("late failure");
      }
      if (chunkIndex === 2) throw new Error("early failure");
      return {
        content: JSON.stringify({
          foundationEntries: [],
          resultEntries: [{
            id: "claim:middle",
            entryClass: "claim",
            claimKind: "theorem",
            statement: "$M$ holds.",
            page: 7,
          }],
          inferenceHints: [],
        }),
      };
    },
  });

  assert.deepEqual(pool.rawEntries.map((entry) => entry.id), ["claim:middle"]);
  assert.deepEqual(pool.unresolvedItems.map((item) => item.id), [
    "unresolved:entry-window:0",
    "unresolved:entry-window:2",
  ]);
});

test("Raw Entry Pool 拒绝不完整的未解决项契约", () => {
  const sourceText = "[[PAGE 1]]\nSource";
  assert.throws(() => rawPoolModule.createRawEntryPool({
    source: { fileName: "invalid-unresolved.pdf", pageCount: 1, sourceText },
    chunks: [{ chunkIndex: 0, text: sourceText, rawEntries: [] }],
    unresolvedItems: [{
      id: "unresolved:entry-window:0",
      sourceStage: "entry",
      candidateSummary: "Window failed",
      failureCategory: "window-extraction-failed",
      validationError: "timeout",
    }],
  }), /retryable/iu);
});

test("Entry VNext 不把取消或断点写入异常降级为内容失败", async () => {
  const abortError = new Error("cancelled");
  abortError.name = "AbortError";
  await assert.rejects(rawPoolModule.extractParallelRawEntryPool({
    fileName: "cancel.pdf",
    pageCount: 6,
    text: sixPageSource(),
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    maxParallelCalls: 1,
    chatImpl: async () => { throw abortError; },
  }), (error) => error === abortError);

  await assert.rejects(rawPoolModule.extractParallelRawEntryPool({
    fileName: "checkpoint-fail.pdf",
    pageCount: 6,
    text: sixPageSource(),
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    maxParallelCalls: 1,
    chatImpl: async ({ chunkIndex }) => ({
      content: JSON.stringify({
        foundationEntries: [],
        resultEntries: [{ id: `claim:${chunkIndex}`, entryClass: "claim", claimKind: "theorem", statement: "$T$.", page: chunkIndex === 0 ? 1 : 6 }],
        inferenceHints: [],
      }),
    }),
    onLaneComplete: async () => { throw new Error("checkpoint unavailable"); },
  }), /checkpoint unavailable/iu);
});

test("Entry VNext 把模型数组中的非对象候选记录为未解决项", async () => {
  const pool = await rawPoolModule.extractParallelRawEntryPool({
    fileName: "non-object.pdf",
    pageCount: 1,
    text: "[[PAGE 1]]\nSource",
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
    chatImpl: async () => ({
      content: JSON.stringify({
        foundationEntries: ["not-an-entry"],
        resultEntries: [{ id: "fact:valid", entryClass: "fact", factKind: "definition", statement: "$X$.", page: 1 }],
        inferenceHints: [],
      }),
    }),
  });

  assert.deepEqual(pool.rawEntries.map((entry) => entry.id), ["fact:valid"]);
  assert.deepEqual(pool.unresolvedItems.map((item) => item.failureCategory), ["candidate-invalid"]);
});

test("Entry VNext 不持久化或整合损坏的上游未解决项", () => {
  const sourceText = "[[PAGE 1]]\nSource";
  const malformed = {
    schema: rawPoolModule.RAW_ENTRY_POOL_SCHEMA,
    extractionModuleVersion: V131,
    source: { fileName: "malformed.pdf", pageCount: 1, characters: sourceText.length, sourceText },
    chunks: [{ chunkIndex: 0, text: sourceText, rawEntries: [] }],
    rawEntries: [{ id: "fact:valid", entryClass: "fact", factKind: "definition", statement: "$X$.", page: 1 }],
    unresolvedItems: [{ id: "broken" }],
    diagnostics: { durationMs: 0, stages: [], calls: [] },
  };

  assert.deepEqual(checkpointStore.sanitizeStageArtifact("entry", malformed).unresolvedItems, []);
  assert.throws(
    () => entryModule.consolidateRawEntryPool(malformed, { allowPartialSuccess: true, strictMath: true }),
    /unresolvedItems\[0\]/u,
  );
});

test("Entry VNext 对配置和鉴权失败保持系统错误", async () => {
  const base = {
    fileName: "systemic.pdf",
    pageCount: 1,
    text: "[[PAGE 1]]\nSource",
    extractionModuleVersion: V131,
    allowPartialSuccess: true,
  };
  await assert.rejects(
    rawPoolModule.extractParallelRawEntryPool({ ...base, fetchImpl: null }),
    (error) => error?.code === "CONFIGURATION_ERROR",
  );
  await assert.rejects(
    rawPoolModule.extractParallelRawEntryPool({
      ...base,
      endpoint: "https://model.example/v1/chat/completions",
      apiKey: "bad-key",
      fetchImpl: async () => ({ ok: false, status: 401, text: async () => "unauthorized" }),
    }),
    (error) => error?.code === "HTTP_ERROR" && error?.status === 401,
  );
});
