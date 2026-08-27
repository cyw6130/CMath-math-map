import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const facade = require("../src/paper-import/production/index.js");
const client = require("../paper-import-client.js");
const workflow = require("../src/paper-import/workflow/index.js");
const facadeSource = fs.readFileSync(
  new URL("../src/paper-import/production/index.js", import.meta.url),
  "utf8",
);

const FROZEN_WORKFLOW = {
  label: "V4.1-production-reproduction",
  productionContractVersion: "production-paper-import/v1",
  mineruInputVersion: "cmath.paper-import.mineru/v1",
  entryExtractionVersion: "paper-entry-parallel-extraction-v1.31",
  entryConsolidationVersion: "paper-entry-consolidation-v1",
  entryVerificationVersion: "w7.1",
  b0BackfillVersion: "w8",
  inferenceRuntimeVersion: "v3.45",
  projectViewVersion: "cmath.project-view-model/v0.1",
};

function modelResult(payload) {
  return { content: JSON.stringify(payload) };
}

function dependencyStubs({ rawPool = true } = {}) {
  return {
    CMathPaperEntryModule: {
      buildVerificationPrompt() {},
      buildB0BackfillPrompt() {},
      applyPatch() {},
      runVerificationPipeline() {},
      consolidateRawEntryPool() {},
      validatePaperEntryArtifact() {},
    },
    CMathPaperInferenceModule: {
      assemblyPrompt() {},
      requestPaperInferenceFromEntryArtifact() {},
      findOpenClaims() {},
      paperProjectView() {},
    },
    CMathPaperImportWorkflow: { runProductionPaperImport() {} },
    ...(rawPool ? { CMathPaperRawEntryPoolV1: { extractParallelRawEntryPool() {} } } : {}),
    CMathPaperModelTransport: {
      createModelTransport() {},
      isModelTransportError() {},
      ERROR_CODES: { HTTP: "HTTP_ERROR", SERVICE: "SERVICE_ERROR" },
      ModelTransportError: Error,
    },
  };
}

test("Production Paper Import facade exposes the small public authority surface", () => {
  assert.equal(facade.MODULE_ID, "cmath.paper-import.production/v1");
  assert.deepEqual(Object.keys(facade).sort(), [
    "MODULE_ID",
    "FROZEN_WORKFLOW",
    "endpointUrl",
    "requestPaperProjectView",
    "requestPaperProductionSemanticPipeline",
    "requestPaperProductionImport",
  ].sort());
  assert.deepEqual(facade.FROZEN_WORKFLOW, FROZEN_WORKFLOW);
  assert.equal(Object.isFrozen(facade.FROZEN_WORKFLOW), true);
});

test("client production and compatibility entrances are aliases of the facade", () => {
  assert.strictEqual(client.FROZEN_WORKFLOW, facade.FROZEN_WORKFLOW);
  assert.strictEqual(client.endpointUrl, facade.endpointUrl);
  assert.strictEqual(client.requestPaperProjectView, facade.requestPaperProjectView);
  assert.strictEqual(client.requestPaperProductionSemanticPipeline, facade.requestPaperProductionSemanticPipeline);
  assert.strictEqual(client.requestPaperProductionImport, facade.requestPaperProductionImport);
});

test("facade endpoint compatibility preserves secure URL normalization", () => {
  assert.equal(
    facade.endpointUrl("https://api.example.test/v1/?ignored=1#fragment"),
    "https://api.example.test/v1/chat/completions",
  );
  assert.equal(
    facade.endpointUrl("https://api.example.test/v1/chat/completions"),
    "https://api.example.test/v1/chat/completions",
  );
  assert.equal(
    facade.endpointUrl("http://localhost:8080/v1"),
    "http://localhost:8080/v1/chat/completions",
  );
  assert.throws(() => facade.endpointUrl("http://api.example.test/v1"), /HTTPS/u);
});

test("formal production entrance completes the frozen semantic pipeline", async () => {
  const store = workflow.createMemoryCheckpointStore();
  const stages = [];
  const calls = [];
  const chatImpl = async ({ stage, messages, model, reasoningEffort }) => {
    calls.push({ stage, prompt: messages?.[0]?.content ?? "", model, reasoningEffort });
    if (stage === "extract") {
      return modelResult({
        foundationEntries: [
          { id: "fact:space", entryClass: "fact", factKind: "definition", name: "空间", statement: "$X$。", page: 1 },
        ],
        resultEntries: [
          { id: "claim:main", entryClass: "claim", claimKind: "theorem", name: "主定理", statement: "$T$。", page: 1 },
        ],
        inferenceHints: [],
      });
    }
    if (stage === "w7-verify" || stage === "w8-b0") {
      return modelResult({ addEntries: [], corrections: [], removeIds: [] });
    }
    return modelResult({
      projectTitle: "Production facade paper",
      mainTargetEntryId: "claim:main",
      b0: [],
      inferences: [{
        operationKind: "proof",
        premises: ["fact:space"],
        conclusion: "claim:main",
        argument: "由定义得到。",
        page: 1,
      }],
    });
  };

  const view = await facade.requestPaperProductionImport({
    pdf: {
      name: "production-facade.pdf",
      size: 3,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    },
    frozenWorkflow: FROZEN_WORKFLOW,
    checkpointStore: store,
    hashImpl: async () => "production-facade-digest",
    mineruClient: { importPdf: async () => ({ markedMarkdown: "[[PAGE 1]] source" }) },
    endpoint: "https://model.example.test/v1",
    apiKey: "facade-secret",
    model: "facade-model",
    providerLabel: "facade-provider",
    reasoningEffort: "high",
    fetchImpl: async () => { throw new Error("fetch must not run when chatImpl is injected"); },
    chatImpl,
    onStage: (stage, info) => stages.push({ stage, ...info }),
  });

  assert.equal(view.mainTargetEntryId, "claim:main");
  assert.equal(view.entries.find((entry) => entry.id === "fact:space").entryClass, "fact");
  assert.equal(view.inferences[0].conclusion, "claim:main");
  assert.deepEqual(calls.slice(0, 4).map((call) => call.stage), ["extract", "w7-verify", "w8-b0", "assemble"]);
  assert.ok(calls.every((call) => call.model === "facade-model"));
  assert.deepEqual(
    stages.filter((event) => event.phase === "complete").map((event) => event.stage),
    ["mineru", "entry", "consolidate", "w7-verify", "w8-b0", "inference", "closure"],
  );
});

test("facade fails explicitly when a required core dependency is absent", () => {
  const context = { globalThis: null, ...dependencyStubs({ rawPool: false }) };
  context.globalThis = context;
  assert.throws(
    () => vm.runInNewContext(facadeSource, context),
    /Production Paper Import facade 缺少 Raw Entry Pool 能力/u,
  );
});
