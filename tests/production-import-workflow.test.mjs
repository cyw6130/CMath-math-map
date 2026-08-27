import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Workflow = require("../src/paper-import/workflow/index.js");
const {
  createMemoryCheckpointStore,
  createIndexedDbCheckpointStore,
  computePdfFingerprint,
  runProductionPaperImport,
} = Workflow;
const client = require("../paper-import-client.js");

const WORKFLOW = {
  label: "V4.1",
  productionContractVersion: "production-paper-import/v1",
  mineruInputVersion: "cmath.paper-import.mineru/v1",
  entryExtractionVersion: "paper-entry-parallel-extraction-v1.31",
  entryConsolidationVersion: "paper-entry-consolidation-v1",
  entryVerificationVersion: "w7.1",
  b0BackfillVersion: "w8",
  inferenceRuntimeVersion: "v3.45",
  projectViewVersion: "cmath.project-view-model/v0.1",
};

function fakeSemanticPipeline({ calls, failW8 = false, failureMessage = "W8 test failure" } = {}) {
  return async ({ onStage, onArtifact, resumeArtifacts, markedMarkdown }) => {
    const emit = (stage, phase) => onStage?.(stage, { phase });
    const artifact = resumeArtifacts?.entry ?? { rawEntries: [], source: { sourceText: markedMarkdown, pageCount: 1, fileName: "paper.pdf" } };
    if (!resumeArtifacts?.entry) {
      calls.push("entry");
      emit("entry", "start");
      await onArtifact?.("entry", artifact);
    }
    const consolidated = resumeArtifacts?.consolidate ?? { entries: [{ id: "claim:main" }] };
    if (!resumeArtifacts?.consolidate) {
      calls.push("consolidate");
      emit("consolidate", "start");
      await onArtifact?.("consolidate", consolidated);
    }
    const w7 = resumeArtifacts?.["w7-verify"] ?? { entries: [{ id: "claim:main" }, { id: "fact:x" }] };
    if (!resumeArtifacts?.["w7-verify"]) {
      calls.push("w7-verify");
      emit("w7-verify", "start");
      await onArtifact?.("w7-verify", w7);
    }
    if (failW8 && !resumeArtifacts?.["w8-b0"]) {
      calls.push("w8-b0");
      emit("w8-b0", "start");
      throw new Error(failureMessage);
    }
    const w8 = resumeArtifacts?.["w8-b0"] ?? { entries: [{ id: "claim:main" }, { id: "fact:x" }, { id: "claim:external" }] };
    if (!resumeArtifacts?.["w8-b0"]) {
      calls.push("w8-b0");
      emit("w8-b0", "start");
      await onArtifact?.("w8-b0", w8);
    }
    const inference = resumeArtifacts?.inference ?? { mainTargetEntryId: "claim:main", entries: w8.entries, inferences: [] };
    if (!resumeArtifacts?.inference) {
      calls.push("inference");
      emit("inference", "start");
      await onArtifact?.("inference", inference);
    }
    emit("closure", "start");
    await onArtifact?.("closure", inference);
    return inference;
  };
}

test("Workflow 正式接口导出冻结阶段顺序并保留兼容别名", () => {
  const expectedStages = [
    "mineru",
    "entry",
    "consolidate",
    "w7-verify",
    "w8-b0",
    "inference",
    "closure",
  ];
  assert.deepEqual(Workflow.WORKFLOW_STAGES, expectedStages);
  assert.strictEqual(Workflow.STAGE_NAMES, Workflow.WORKFLOW_STAGES);
  assert.strictEqual(Workflow.STAGES, Workflow.WORKFLOW_STAGES);
  assert.deepEqual(Workflow.SEMANTIC_STAGES, expectedStages.slice(1));
});

test("PDF 指纹来自内容且 hash seam 可注入", async () => {
  const pdf = { name: "same-name.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  const seen = [];
  const fingerprint = await computePdfFingerprint(pdf, {
    hashImpl: async (bytes) => {
      seen.push([...bytes]);
      return "digest-from-seam";
    },
  });
  assert.equal(fingerprint, "digest-from-seam");
  assert.deepEqual(seen, [[1, 2, 3]]);
});

test("生产编排按固定顺序完成并保存无秘密 checkpoint", async () => {
  const backingStore = createMemoryCheckpointStore();
  const rawSaves = [];
  const store = {
    load: (key) => backingStore.load(key),
    save: async (key, checkpoint) => {
      rawSaves.push(structuredClone(checkpoint));
      return backingStore.save(key, checkpoint);
    },
    clear: (key) => backingStore.clear(key),
  };
  const calls = [];
  const events = [];
  const result = await runProductionPaperImport({
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: WORKFLOW,
    checkpointStore: store,
    hashImpl: async () => "pdf-digest",
    mineruClient: { importPdf: async () => { calls.push("mineru"); return { markedMarkdown: "[[PAGE 1]] source", task: { fullZipUrl: "https://signed.example/full.zip" }, uploadUrl: "https://signed.example/upload" }; } },
    semanticPipeline: fakeSemanticPipeline({ calls }),
    endpoint: "https://model.example/v1",
    apiKey: "model-secret",
    model: "same-model",
    onStage: (stage, info) => events.push({ stage, ...info }),
  });

  assert.equal(result.mainTargetEntryId, "claim:main");
  assert.deepEqual(calls, ["mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference"]);
  assert.deepEqual(events.filter((event) => event.phase === "complete").map((event) => event.stage), [
    "mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference", "closure",
  ]);
  assert.deepEqual(events.filter((event) => event.phase === "start").map((event) => event.stage), [
    "mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference", "closure",
  ]);
  const checkpoint = await store.load("production-paper-import:pdf-digest");
  const serialized = JSON.stringify(checkpoint);
  assert.doesNotMatch(serialized, /model-secret|Authorization|Bearer|fullZipUrl|uploadUrl|apiKey/iu);
  assert.doesNotMatch(JSON.stringify(rawSaves), /model-secret|Authorization|Bearer|fullZipUrl|uploadUrl|apiKey/iu);
  assert.equal(checkpoint.frozenWorkflow.entryExtractionVersion, WORKFLOW.entryExtractionVersion);
});

test("W8 失败后刷新只续跑 W8 及其后续阶段", async () => {
  const store = createMemoryCheckpointStore();
  const firstCalls = [];
  await assert.rejects(() => runProductionPaperImport({
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: WORKFLOW,
    checkpointStore: store,
    hashImpl: async () => "resume-digest",
    mineruClient: { importPdf: async () => { firstCalls.push("mineru"); return { markedMarkdown: "[[PAGE 1]] source" }; } },
    semanticPipeline: fakeSemanticPipeline({
      calls: firstCalls,
      failW8: true,
      failureMessage: "W8 test failure model-secret https://signed.example/result.zip?token=secret",
    }),
    endpoint: "https://model.example/v1", apiKey: "model-secret", model: "same-model",
  }), /W8 test failure/u);

  const failedCheckpoint = await store.load("production-paper-import:resume-digest");
  assert.doesNotMatch(JSON.stringify(failedCheckpoint), /model-secret|signed\.example|token=secret/iu);

  const secondCalls = [];
  const events = [];
  await runProductionPaperImport({
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: WORKFLOW,
    checkpointStore: store,
    hashImpl: async () => "resume-digest",
    mineruClient: { importPdf: async () => { secondCalls.push("mineru"); return { markedMarkdown: "[[PAGE 1]] source" }; } },
    semanticPipeline: fakeSemanticPipeline({ calls: secondCalls }),
    endpoint: "https://model.example/v1", apiKey: "k", model: "same-model",
    onStage: (stage, info) => events.push({ stage, ...info }),
  });

  assert.deepEqual(secondCalls, ["w8-b0", "inference"]);
  assert.ok(events.some((event) => event.stage === "entry" && event.phase === "resume"));
  assert.ok(events.some((event) => event.stage === "w7-verify" && event.phase === "resume"));
});

test("Frozen Workflow 身份不匹配时不恢复旧 checkpoint", async () => {
  const store = createMemoryCheckpointStore();
  const firstCalls = [];
  const pdf = { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer };
  await runProductionPaperImport({
    pdf, frozenWorkflow: WORKFLOW, checkpointStore: store, hashImpl: async () => "identity-digest",
    mineruClient: { importPdf: async () => { firstCalls.push("mineru"); return { markedMarkdown: "[[PAGE 1]] source" }; } },
    semanticPipeline: fakeSemanticPipeline({ calls: firstCalls }), endpoint: "https://model.example/v1", apiKey: "k", model: "same-model",
  });
  const secondCalls = [];
  await runProductionPaperImport({
    pdf, frozenWorkflow: { ...WORKFLOW, inferenceRuntimeVersion: "v3.46" }, checkpointStore: store,
    hashImpl: async () => "identity-digest",
    mineruClient: { importPdf: async () => { secondCalls.push("mineru"); return { markedMarkdown: "[[PAGE 1]] source" }; } },
    semanticPipeline: fakeSemanticPipeline({ calls: secondCalls }), endpoint: "https://model.example/v1", apiKey: "k", model: "same-model",
  });
  assert.deepEqual(secondCalls, ["mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference"]);
});

test("IndexedDB checkpoint store requires an IndexedDB implementation", async () => {
  const store = createIndexedDbCheckpointStore({ indexedDB: null });
  await assert.rejects(() => store.load("x"), /IndexedDB/iu);
});

test("真实语义链从 W7 checkpoint 恢复时保留合法 Entry Artifact contract", async () => {
  const store = createMemoryCheckpointStore();
  const pdf = { name: "resume-real.pdf", size: 3, arrayBuffer: async () => new Uint8Array([7, 7, 7]).buffer };
  const baseOptions = {
    pdf,
    checkpointStore: store,
    hashImpl: async () => "resume-real-digest",
    mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
    endpoint: "https://model.example/v1",
    apiKey: "secret",
    model: "same-model",
    providerLabel: "same-provider",
    reasoningEffort: "high",
    fetchImpl: async () => { throw new Error("chatImpl should own model calls"); },
  };
  const responseFor = (stage) => {
    if (stage === "extract") return { content: JSON.stringify({
      foundationEntries: [{ id: "def:space", entryClass: "fact", factKind: "definition", name: "空间", statement: "$X$。", page: 1 }],
      resultEntries: [{ id: "thm:main", entryClass: "claim", claimKind: "theorem", name: "主定理", statement: "$T$。", page: 1 }],
      inferenceHints: [],
    }) };
    if (stage === "w7-verify" || stage === "w8-b0") {
      return { content: JSON.stringify({ addEntries: [], corrections: [], removeIds: [] }) };
    }
    return { content: JSON.stringify({
      projectTitle: "恢复测试",
      mainTargetEntryId: "thm:main",
      b0: [],
      inferences: [{ operationKind: "proof", premises: ["def:space"], conclusion: "thm:main", argument: "由定义得到。", sourceLocator: "paper.pdf#page=1" }],
    }) };
  };

  const firstCalls = [];
  await assert.rejects(() => client.requestPaperProductionImport({
    ...baseOptions,
    chatImpl: async ({ stage }) => {
      firstCalls.push(stage);
      if (stage === "w8-b0") throw new Error("temporary W8 failure");
      return responseFor(stage);
    },
  }), /temporary W8 failure/u);
  assert.deepEqual(firstCalls, ["extract", "w7-verify", "w8-b0"]);

  const resumedCalls = [];
  const resumedStages = [];
  const view = await client.requestPaperProductionImport({
    ...baseOptions,
    chatImpl: async ({ stage }) => {
      resumedCalls.push(stage);
      return responseFor(stage);
    },
    onStage: (stage, info) => resumedStages.push({ stage, ...info }),
  });
  assert.equal(view.mainTargetEntryId, "thm:main");
  assert.deepEqual(resumedCalls, ["w8-b0", "assemble"], JSON.stringify(resumedStages));
});

test("公开入口接通真实冻结语义链并复用同一模型配置", async () => {
  const store = createMemoryCheckpointStore();
  const calls = [];
  const events = [];
  const chatImpl = async ({ stage, messages, model, reasoningEffort }) => {
    calls.push({ stage, model, reasoningEffort, prompt: messages?.[0]?.content ?? "" });
    if (stage === "extract") {
      return { content: JSON.stringify({
        foundationEntries: [{ id: "def:space", entryClass: "fact", factKind: "definition", name: "空间", statement: "$X$。", page: 1 }],
        resultEntries: [{ id: "thm:main", entryClass: "claim", claimKind: "theorem", name: "主定理", statement: "$T$。", page: 1 }],
        inferenceHints: [],
      }) };
    }
    if (stage === "w7-verify") return { content: JSON.stringify({ addEntries: [], corrections: [], removeIds: [] }) };
    if (stage === "w8-b0") return { content: JSON.stringify({ addEntries: [], corrections: [], removeIds: [] }) };
    return { content: JSON.stringify({
      projectTitle: "公开生产入口测试",
      mainTargetEntryId: "thm:main",
      b0: [],
      inferences: [{ operationKind: "proof", premises: ["def:space"], conclusion: "thm:main", argument: "由定义得到。", sourceLocator: "paper.pdf#page=1" }],
    }) };
  };
  const view = await client.requestPaperProductionImport({
    pdf: { name: "public.pdf", size: 3, arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer },
    gatewayUrl: "https://gateway.example/mineru",
    unzip: () => ({}),
    mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
    checkpointStore: store,
    hashImpl: async () => "public-digest",
    endpoint: "https://model.example/v1",
    apiKey: "secret",
    model: "same-model",
    providerLabel: "same-provider",
    reasoningEffort: "high",
    fetchImpl: async () => { throw new Error("fetch should not be used when chatImpl is injected"); },
    chatImpl,
    onStage: (stage, info) => events.push({ stage, ...info }),
  });
  assert.equal(view.mainTargetEntryId, "thm:main");
  assert.deepEqual(calls.slice(0, 4).map((call) => call.stage), ["extract", "w7-verify", "w8-b0", "assemble"]);
  assert.ok(calls.every((call) => call.model === "same-model"));
  assert.ok(calls.filter((call) => call.stage !== "extract").every((call) => call.reasoningEffort === "high"));
  assert.deepEqual(events.filter((event) => event.phase === "complete").map((event) => event.stage), [
    "mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference", "closure",
  ]);

  const resumeEvents = [];
  const resumedView = await client.requestPaperProductionImport({
    pdf: { name: "public.pdf", size: 3, arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer },
    checkpointStore: store,
    hashImpl: async () => "public-digest",
    mineruClient: { importPdf: async () => { throw new Error("completed MinerU stage must not repeat"); } },
    endpoint: "https://model.example/v1",
    apiKey: "new-session-secret",
    model: "same-model",
    providerLabel: "same-provider",
    reasoningEffort: "high",
    fetchImpl: async () => { throw new Error("completed model stages must not repeat"); },
    chatImpl: async () => { throw new Error("completed model stages must not repeat"); },
    onStage: (stage, info) => resumeEvents.push({ stage, ...info }),
  });
  assert.deepEqual(resumedView, view);
  assert.deepEqual(resumeEvents.map((event) => [event.stage, event.phase]), [
    ["mineru", "resume"],
    ["entry", "resume"],
    ["consolidate", "resume"],
    ["w7-verify", "resume"],
    ["w8-b0", "resume"],
    ["inference", "resume"],
    ["closure", "resume"],
  ]);
});
