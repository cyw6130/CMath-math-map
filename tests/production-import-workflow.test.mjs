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

const VNEXT_WORKFLOW = {
  ...WORKFLOW,
  label: "paper-to-map-vnext-tracer-1",
  productionContractVersion: "production-paper-import/v2",
  resultContractVersion: "cmath.paper-to-map-result/v1",
  capabilityAuthority: "../CMath-capabilities/exports/canonical.json",
  capabilitySyncIdentity: "test-canonical-sync-v1",
  capabilityDependencies: [
    { role: "math-map-semantics", capabilityId: "math-graph-semantics-v3", version: "v3", contractVersion: "cmath-gamma.math-map-semantics/v3" },
    { role: "entry-contract", capabilityId: "entry-model-v1", version: "v1", contractVersion: "cmath.entry/v0.2" },
    { role: "inference-contract", capabilityId: "inference-model-v1", version: "v1", contractVersion: "cmath.inference/v0.2" },
    { role: "format-normalization", capabilityId: "paper-import-workflow-v2", version: "v2.1", contractVersion: "cmath.paper-import-workflow-result/v0.2", guaranteeId: "deterministic-assembly-normalization" },
  ],
};

const CAPABILITY_MANIFEST = {
  schema: "cmath.capability-consumer-manifest/v1",
  authority: VNEXT_WORKFLOW.capabilityAuthority,
  syncIdentity: VNEXT_WORKFLOW.capabilitySyncIdentity,
  canonicalPackages: VNEXT_WORKFLOW.capabilityDependencies.map(({ capabilityId, version, contractVersion }) => ({ capabilityId, version, contractVersion })),
};

function capabilityRuntime(semanticPipeline, manifest = CAPABILITY_MANIFEST) {
  return {
    manifest,
    semanticPipeline,
    validateMap: (map) => Boolean(
      map && Array.isArray(map.entries) && map.entries.length > 0 && Array.isArray(map.inferences)
    ),
  };
}

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

test("显式 VNext 身份通过生产 seam 返回统一 Paper-to-Map 结果", async () => {
  const store = createMemoryCheckpointStore();
  const calls = [];
  const result = await runProductionPaperImport({
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: VNEXT_WORKFLOW,
    capabilityRuntime: capabilityRuntime(fakeSemanticPipeline({ calls })),
    checkpointStore: store,
    hashImpl: async () => "vnext-result-digest",
    mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
    endpoint: "https://model.example/v1",
    apiKey: "model-secret",
    model: "same-model",
  });

  assert.equal(result.schema, "cmath.paper-to-map-result/v1");
  assert.equal(result.status, "complete");
  assert.equal(result.map.mainTargetEntryId, "claim:main");
  assert.deepEqual(result.sourceAnnotations, {
    source: { fileName: "paper.pdf", pageCount: 1 },
    items: [],
  });
  assert.deepEqual(result.unresolvedItems, []);
  assert.deepEqual(result.diagnostics, {
    mainTargetIdentified: true,
    openClaimCount: 0,
    mainProofChainComplete: null,
    missingStages: [],
  });
  assert.deepEqual(Object.fromEntries(Object.entries(result.stages).map(([stage, record]) => [stage, record.status])), {
    mineru: "complete",
    entry: "complete",
    consolidate: "complete",
    "w7-verify": "complete",
    "w8-b0": "complete",
    inference: "complete",
    closure: "complete",
  });
  assert.equal(result.identity.contentFingerprint, "vnext-result-digest");
  assert.deepEqual(result.identity.frozenWorkflow, VNEXT_WORKFLOW);
});

test("VNext 缺少能力同步清单时在 MinerU 调用前硬失败", async () => {
  let mineruCalls = 0;
  await assert.rejects(
    () => runProductionPaperImport({
      pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
      frozenWorkflow: VNEXT_WORKFLOW,
      checkpointStore: createMemoryCheckpointStore(),
      hashImpl: async () => "missing-capability-digest",
      mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
      semanticPipeline: fakeSemanticPipeline({ calls: [] }),
      endpoint: "https://model.example/v1",
      apiKey: "model-secret",
      model: "same-model",
    }),
    (error) => error?.code === "PAPER_TO_MAP_CAPABILITY_MISSING",
  );
  assert.equal(mineruCalls, 0);
});

test("VNext 能力版本不兼容时在 MinerU 调用前硬失败", async () => {
  let mineruCalls = 0;
  const incompatibleManifest = {
    ...CAPABILITY_MANIFEST,
    canonicalPackages: CAPABILITY_MANIFEST.canonicalPackages.map((item) => (
      item.capabilityId === "entry-model-v1" ? { ...item, version: "v0" } : item
    )),
  };
  await assert.rejects(
    () => runProductionPaperImport({
      pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
      frozenWorkflow: VNEXT_WORKFLOW,
      capabilityRuntime: capabilityRuntime(fakeSemanticPipeline({ calls: [] }), incompatibleManifest),
      checkpointStore: createMemoryCheckpointStore(),
      hashImpl: async () => "incompatible-capability-digest",
      mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
      endpoint: "https://model.example/v1",
      apiKey: "model-secret",
      model: "same-model",
    }),
    (error) => error?.code === "PAPER_TO_MAP_CAPABILITY_INCOMPATIBLE",
  );
  assert.equal(mineruCalls, 0);
});

test("VNext 的受控未解决项通过 checkpoint 序列化并恢复", async () => {
  const store = createMemoryCheckpointStore();
  let mineruCalls = 0;
  let semanticCalls = 0;
  const map = {
    schema: "cmath.project-view-model/v0.1",
    mainTargetEntryId: "claim:main",
    entries: [{ id: "claim:main", type: "Claim", statement: "Main claim" }],
    inferences: [{
      id: "inference:1",
      operationKind: "proof",
      premises: [],
      conclusion: "claim:main",
      argument: "source-backed",
      sourcePath: "https://signed.example/map.json?token=secret",
      sourceLocator: "[[PAGE 1]]",
    }],
  };
  const semanticPipeline = async (options) => {
    semanticCalls += 1;
    const base = await fakeSemanticPipeline({ calls: [] })(options);
    return {
      map: { ...base, ...map },
      sourceAnnotations: {
        items: [{ objectId: "claim:main", sourceLocator: "[[PAGE 1]]", sourcePath: "https://signed.example/result.zip?token=secret", page: 1 }],
      },
      unresolvedItems: [{
        id: "unresolved:inference:1",
        sourceStage: "inference",
        sourceLocator: "[[PAGE 1]]",
        candidateSummary: "A relation with an unsupported operation kind",
        failureCategory: "contract-invalid",
        validationError: "operationKind is not supported at https://signed.example/result.zip?token=secret Bearer model-secret",
        retryable: true,
      }],
    };
  };
  const common = {
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: VNEXT_WORKFLOW,
    capabilityRuntime: capabilityRuntime(semanticPipeline),
    hashImpl: async () => "vnext-unresolved-digest",
    mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
  };

  const first = await runProductionPaperImport({ ...common, checkpointStore: store });
  assert.equal(first.map.mainTargetEntryId, map.mainTargetEntryId);
  assert.equal(first.map.inferences[0].sourcePath, "[redacted-url]");
  assert.equal(first.sourceAnnotations.items[0].objectId, "claim:main");
  assert.equal(first.unresolvedItems[0].failureCategory, "contract-invalid");
  assert.doesNotMatch(JSON.stringify(first), /signed\.example|token=secret|model-secret/iu);

  const serializedCheckpoint = JSON.parse(JSON.stringify(
    await store.load("production-paper-import:vnext-unresolved-digest"),
  ));
  const restoredStore = createMemoryCheckpointStore({
    "production-paper-import:vnext-unresolved-digest": serializedCheckpoint,
  });
  const second = await runProductionPaperImport({ ...common, checkpointStore: restoredStore });
  assert.deepEqual(second, first);
  assert.equal(mineruCalls, 1);
  assert.equal(semanticCalls, 1);
});

test("VNext 缺少权威同步身份或合同版本时在 MinerU 调用前硬失败", async () => {
  let mineruCalls = 0;
  const missingSyncIdentity = {
    ...VNEXT_WORKFLOW,
    capabilitySyncIdentity: undefined,
  };
  const missingContractVersion = {
    ...VNEXT_WORKFLOW,
    capabilityDependencies: VNEXT_WORKFLOW.capabilityDependencies.map((dependency, index) => (
      index === 0 ? { ...dependency, contractVersion: undefined } : dependency
    )),
  };
  for (const [index, frozenWorkflow] of [missingSyncIdentity, missingContractVersion].entries()) {
    await assert.rejects(
      () => runProductionPaperImport({
        pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
        frozenWorkflow,
        capabilityRuntime: capabilityRuntime(fakeSemanticPipeline({ calls: [] })),
        checkpointStore: createMemoryCheckpointStore(),
        hashImpl: async () => `missing-identity-digest-${index}`,
        mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
      }),
      (error) => error?.code === "PAPER_TO_MAP_CAPABILITY_MISSING",
    );
  }
  assert.equal(mineruCalls, 0);
});

test("VNext 最终地图未通过能力校验时不产生 complete 结果", async () => {
  const calls = [];
  const runtime = capabilityRuntime(fakeSemanticPipeline({ calls }));
  runtime.validateMap = () => false;
  await assert.rejects(
    () => runProductionPaperImport({
      pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
      frozenWorkflow: VNEXT_WORKFLOW,
      capabilityRuntime: runtime,
      checkpointStore: createMemoryCheckpointStore(),
      hashImpl: async () => "invalid-map-digest",
      mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
    }),
    (error) => error?.code === "PAPER_TO_MAP_RESULT_INVALID",
  );
});

test("VNext 拒绝未知结果合同版本且不调用 MinerU", async () => {
  let mineruCalls = 0;
  await assert.rejects(
    () => runProductionPaperImport({
      pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
      frozenWorkflow: { ...VNEXT_WORKFLOW, resultContractVersion: "cmath.paper-to-map-result/v999" },
      capabilityRuntime: capabilityRuntime(fakeSemanticPipeline({ calls: [] })),
      checkpointStore: createMemoryCheckpointStore(),
      hashImpl: async () => "unknown-result-contract-digest",
      mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
    }),
    (error) => error?.code === "PAPER_TO_MAP_CAPABILITY_INCOMPATIBLE",
  );
  assert.equal(mineruCalls, 0);
});

test("VNext 遇到旧的裸 Project View closure 时从安全阶段恢复", async () => {
  const firstStore = createMemoryCheckpointStore();
  const firstCalls = [];
  const common = {
    pdf: { name: "paper.pdf", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    frozenWorkflow: VNEXT_WORKFLOW,
    capabilityRuntime: capabilityRuntime(fakeSemanticPipeline({ calls: firstCalls })),
    hashImpl: async () => "interrupted-closure-digest",
    mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
  };
  const first = await runProductionPaperImport({ ...common, checkpointStore: firstStore });
  const checkpoint = await firstStore.load("production-paper-import:interrupted-closure-digest");
  checkpoint.stages.closure.artifact = first.map;
  const interruptedStore = createMemoryCheckpointStore({
    "production-paper-import:interrupted-closure-digest": checkpoint,
  });
  let mineruCalls = 0;
  let semanticCalls = 0;
  const resumedPipeline = async (options) => {
    semanticCalls += 1;
    return fakeSemanticPipeline({ calls: [] })(options);
  };
  const resumed = await runProductionPaperImport({
    ...common,
    capabilityRuntime: capabilityRuntime(resumedPipeline),
    checkpointStore: interruptedStore,
    mineruClient: { importPdf: async () => { mineruCalls += 1; return { markedMarkdown: "[[PAGE 1]] source" }; } },
  });
  assert.equal(resumed.schema, "cmath.paper-to-map-result/v1");
  assert.equal(mineruCalls, 0);
  assert.equal(semanticCalls, 1);
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
