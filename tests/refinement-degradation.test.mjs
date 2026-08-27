import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const entryModule = require("../src/paper-import/entry/index.js");

function baseArtifact() {
  const sourceText = "[[PAGE 1]]\nDefinitions\n\n[[PAGE 2]]\nMain result and citation [12].";
  return entryModule.consolidateRawEntryPool({
    source: { fileName: "refinement.pdf", pageCount: 2, sourceText },
    rawEntries: [
      { id: "fact:base", entryClass: "fact", factKind: "definition", statement: "$X$ is a space.", page: 1 },
      { id: "claim:remove", entryClass: "claim", claimKind: "lemma", statement: "$R$.", page: 1 },
      { id: "claim:main", entryClass: "claim", claimKind: "theorem", statement: "$T$.", page: 2 },
    ],
  });
}

function emptyPatch() {
  return { addEntries: [], corrections: [], removeIds: [] };
}

test("W7.1 → W8 成功时原子应用合法补丁并保持阶段顺序", async () => {
  const calls = [];
  const artifact = await entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    sourceText: "[[PAGE 1]] $A$.\n[[PAGE 2]] $T'$. [12] $E$.",
    caseId: "success",
    allowDegraded: true,
    validateArtifact: entryModule.validatePaperEntryArtifact,
    requestPatch: async ({ stage }) => {
      calls.push(stage);
      if (stage === "w7-verify") return {
        addEntries: [{ id: "fact:added", entryClass: "fact", factKind: "definition", statement: "$A$.", page: 1, sourceQuote: "$A$." }],
        corrections: [{ id: "claim:main", statement: "$T'$.", page: 2, sourceQuote: "$T'$." }],
        removeIds: ["claim:remove"],
      };
      return {
        addEntries: [{
          id: "claim:external",
          entryClass: "claim",
          claimKind: "theorem",
          statement: "$E$.",
          page: 2,
          external: true,
          sourceReference: "[12]",
          sourceQuote: "[12] $E$.",
        }],
        corrections: [],
        removeIds: [],
      };
    },
  });

  assert.deepEqual(calls, ["w7-verify", "w8-b0"]);
  assert.deepEqual(artifact.entries.map((entry) => entry.id), ["fact:base", "claim:main", "fact:added", "claim:external"]);
  assert.equal(artifact.entries.find((entry) => entry.id === "claim:main").statement, "$T'$.");
  assert.ok(artifact.entries.every((entry) => !("sourceQuote" in entry)));
  assert.deepEqual(artifact.unresolvedItems ?? [], []);
  assert.equal(entryModule.validatePaperEntryArtifact(artifact), true);
});

test("W7.1 调用失败时保留 consolidation 产物、记录降级并继续 W8", async () => {
  const events = [];
  const artifact = await entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    sourceText: "[[PAGE 2]] [12] $E$.",
    allowDegraded: true,
    validateArtifact: entryModule.validatePaperEntryArtifact,
    onArtifact: async (stage, value, info) => events.push({ stage, value, info }),
    requestPatch: async ({ stage }) => {
      if (stage === "w7-verify") {
        throw new Error('gateway https://signed.example/file?token=secret Bearer model-secret apiKey=sk-live payload={"access_token":"access-live","client_secret":"client-live"}');
      }
      return {
        addEntries: [{ id: "claim:external", entryClass: "claim", claimKind: "theorem", statement: "$E$.", page: 2, external: true, sourceReference: "[12]", sourceQuote: "[12] $E$." }],
        corrections: [],
        removeIds: [],
      };
    },
  });

  assert.ok(artifact.entries.some((entry) => entry.id === "claim:external"));
  assert.equal(artifact.unresolvedItems.length, 1);
  assert.equal(artifact.unresolvedItems[0].sourceStage, "w7-verify");
  assert.doesNotMatch(JSON.stringify(artifact), /signed\.example|model-secret|sk-live|token=secret|access-live|client-live/iu);
  assert.equal(events[0].info.status, "degraded");
  assert.equal(events[1].info.status, "complete");
});

test("W7.1 无效补丁不污染最近合法 Artifact", async () => {
  const original = baseArtifact();
  const artifact = await entryModule.runVerificationPipeline({
    artifact: original,
    sourceText: "[[PAGE 1]] $broken",
    allowDegraded: true,
    includeB0: false,
    validateArtifact: entryModule.validatePaperEntryArtifact,
    requestPatch: async () => ({
      addEntries: [{ id: "fact:broken", entryClass: "fact", factKind: "definition", statement: "$broken", page: 1, sourceQuote: "$broken" }],
      corrections: [],
      removeIds: [],
    }),
  });

  assert.deepEqual(artifact.entries, original.entries);
  assert.equal(artifact.unresolvedItems[0].failureCategory, "automatic-refinement-failed");
});

test("W7.1 不接受源文本未支持的自动新增条件", async () => {
  const artifact = await entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    sourceText: "[[PAGE 1]] Only the original definition appears.",
    allowDegraded: true,
    includeB0: false,
    validateArtifact: entryModule.validatePaperEntryArtifact,
    requestPatch: async () => ({
      addEntries: [{
        id: "fact:hallucinated",
        entryClass: "fact",
        factKind: "definition",
        statement: "An unsupported extra condition.",
        page: 1,
        sourceQuote: "An unsupported extra condition.",
      }],
      corrections: [],
      removeIds: [],
    }),
  });

  assert.equal(artifact.entries.some((entry) => entry.id === "fact:hallucinated"), false);
  assert.match(artifact.unresolvedItems[0].validationError, /sourceQuote/u);
});

test("W8 调用或无效补丁失败时保留 W7.1 的最近合法产物", async () => {
  for (const w8Failure of [
    () => { throw new Error("W8 unavailable"); },
    () => ({
      addEntries: [{ id: "fact:not-external", entryClass: "fact", factKind: "definition", statement: "$F$.", page: 2, sourceQuote: "$F$." }],
      corrections: [],
      removeIds: [],
    }),
  ]) {
    const artifact = await entryModule.runVerificationPipeline({
      artifact: baseArtifact(),
      sourceText: "[[PAGE 2]] $T_7$. $F$.",
      allowDegraded: true,
      validateArtifact: entryModule.validatePaperEntryArtifact,
      requestPatch: async ({ stage }) => {
        if (stage === "w7-verify") return { ...emptyPatch(), corrections: [{ id: "claim:main", statement: "$T_7$.", page: 2, sourceQuote: "$T_7$." }] };
        return w8Failure();
      },
    });

    assert.equal(artifact.entries.find((entry) => entry.id === "claim:main").statement, "$T_7$.");
    assert.equal(artifact.entries.some((entry) => entry.id === "fact:not-external"), false);
    assert.equal(artifact.unresolvedItems.at(-1).sourceStage, "w8-b0");
  }
});

test("默认模式仍失败关闭，恢复可从 W8 单独重跑", async () => {
  await assert.rejects(entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    requestPatch: async () => { throw new Error("legacy failure"); },
  }), /legacy failure/u);

  const calls = [];
  const artifact = await entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    sourceText: "[[PAGE 2]] Source",
    startStage: "w8-b0",
    allowDegraded: true,
    validateArtifact: entryModule.validatePaperEntryArtifact,
    requestPatch: async ({ stage }) => { calls.push(stage); return emptyPatch(); },
  });
  assert.deepEqual(calls, ["w8-b0"]);
  assert.equal(entryModule.validatePaperEntryArtifact(artifact), true);

  const abortError = new Error("cancelled");
  abortError.name = "AbortError";
  await assert.rejects(entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    allowDegraded: true,
    requestPatch: async () => { throw abortError; },
  }), (error) => error === abortError);

  await assert.rejects(entryModule.runVerificationPipeline({
    artifact: baseArtifact(),
    allowDegraded: true,
    includeB0: false,
    requestPatch: async () => emptyPatch(),
    onArtifact: async () => { throw new Error("checkpoint unavailable"); },
  }), /checkpoint unavailable/u);

  for (const error of [
    Object.assign(new Error("missing model config"), { code: "CONFIGURATION_ERROR" }),
    Object.assign(new Error("unauthorized"), { code: "HTTP_ERROR", status: 401 }),
  ]) {
    await assert.rejects(entryModule.runVerificationPipeline({
      artifact: baseArtifact(),
      allowDegraded: true,
      requestPatch: async () => { throw error; },
    }), (actual) => actual === error);
  }
});
