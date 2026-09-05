import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import client from "../src/paper-import/paper-import-client.js";
import inference from "../src/paper-import/inference/index.js";

const lifecycleSource = fs.readFileSync(
  new URL("../src/paper-import/inference/lifecycle.js", import.meta.url),
  "utf8",
);
const clientSource = fs.readFileSync(
  new URL("../src/paper-import/paper-import-client.js", import.meta.url),
  "utf8",
);

function makeView(overrides = {}) {
  return {
    projectTitle: "Inference authority paper",
    mainTargetEntryId: "claim:main",
    b0ClaimEntryIds: [],
    entries: [
      {
        id: "fact:definition",
        entryClass: "fact",
        factKind: "definition",
        title: "定义 X",
        shortTitle: "X",
        statement: "设 $X$ 为对象。",
        sourceLocator: "paper.pdf#page=1",
      },
      {
        id: "claim:main",
        entryClass: "claim",
        claimKind: "theorem",
        title: "主定理",
        shortTitle: "主定理",
        statement: "$X$ 满足主结论。",
        sourceLocator: "paper.pdf#page=2",
      },
    ],
    inferences: [
      {
        id: "proof:main",
        operationKind: "proof",
        premises: ["fact:definition"],
        conclusion: "claim:main",
        argument: "由定义直接得到。",
        sourceLocator: "paper.pdf#page=2",
      },
    ],
    ...overrides,
  };
}

test("Inference facade is the sole public authority and client re-exports identical functions", () => {
  assert.equal(inference.MODULE_ID, "cmath.paper-import.inference/v1");
  assert.deepEqual(Object.keys(inference).sort(), [
    "MODULE_ID",
    "assemblyPrompt",
    "findOpenClaims",
    "paperProjectView",
    "requestPaperInferenceFromEntryArtifact",
  ].sort());
  for (const name of [
    "assemblyPrompt",
    "paperProjectView",
    "findOpenClaims",
    "requestPaperInferenceFromEntryArtifact",
  ]) {
    assert.equal(typeof inference[name], "function");
    assert.strictEqual(client[name], inference[name], `${name} must share the Inference Module identity`);
  }
});

test("browser lifecycle fails explicitly when a frozen inference strategy is missing", () => {
  const context = {
    globalThis: null,
    GammaMathMapSemantics: globalThis.GammaMathMapSemantics,
    CMathPaperCoreValidation: globalThis.CMathPaperCoreValidation,
    CMathPaperProjectView: globalThis.CMathPaperProjectView,
    CMathPaperModelTransport: globalThis.CMathPaperModelTransport,
  };
  context.globalThis = context;
  vm.runInNewContext(lifecycleSource, context);
  assert.throws(
    () => context.CMathPaperInferenceLifecycle.assemblyPrompt({
      fileName: "paper.pdf",
      pageCount: 1,
      text: "[[PAGE 1]] theorem",
      catalog: "[]",
      workflowVersion: "v3.45",
    }),
    /Inference 策略 v3\.45 没有加载/u,
  );
});

test("Node client preserves the original Inference Module loading error", () => {
  const loadError = new Error("inference dependency syntax failure");
  const context = { globalThis: null, require: () => { throw loadError; } };
  context.globalThis = context;
  assert.throws(
    () => vm.runInNewContext(clientSource, context),
    (error) => error === loadError,
  );
});

test("Inference authority preserves valid Project Views and rejects illegal proof/organization edges", () => {
  const view = inference.paperProjectView(makeView());
  assert.equal(view.mainTargetEntryId, "claim:main");
  assert.equal(view.inferences.length, 1);

  const invalidOrganization = makeView({
    inferences: [{
      id: "organization:invalid",
      operationKind: "organization",
      premises: ["fact:definition"],
      conclusion: "claim:main",
      argument: "非法跨越 Fact/Claim。",
      sourceLocator: "paper.pdf#page=2",
    }],
  });
  assert.throws(() => inference.paperProjectView(invalidOrganization), /organization 必须是 Fact 到 Fact/u);

  const invalidProof = makeView({
    mainTargetEntryId: "fact:definition",
    inferences: [{
      id: "proof:fact",
      operationKind: "proof",
      premises: ["fact:definition"],
      conclusion: "fact:definition",
      argument: "非法以 Fact 为结论。",
      sourceLocator: "paper.pdf#page=2",
    }],
  });
  assert.throws(() => inference.paperProjectView(invalidProof), /proof 必须以 Claim 为结论/u);
});

test("Inference authority preserves Claim proof cycles for Closure to interpret", () => {
  const cycle = {
    projectTitle: "Cycle paper",
    mainTargetEntryId: "claim:a",
    b0ClaimEntryIds: [],
    entries: [
      { id: "claim:a", entryClass: "claim", claimKind: "theorem", title: "A", statement: "A", sourceLocator: "paper.pdf#page=1" },
      { id: "claim:b", entryClass: "claim", claimKind: "lemma", title: "B", statement: "B", sourceLocator: "paper.pdf#page=1" },
    ],
    inferences: [
      { id: "proof:a", operationKind: "proof", premises: ["claim:b"], conclusion: "claim:a", argument: "B 推出 A。", sourceLocator: "paper.pdf#page=1" },
      { id: "proof:b", operationKind: "proof", premises: ["claim:a"], conclusion: "claim:b", argument: "A 推出 B。", sourceLocator: "paper.pdf#page=1" },
    ],
  };
  const view = inference.paperProjectView(cycle);
  assert.equal(view.inferences.length, 2);
  assert.deepEqual(view.inferences.map((item) => item.conclusion), ["claim:a", "claim:b"]);
});

test("Inference authority preserves B0 source checks and mainTarget Claim checks", () => {
  const missingB0Source = makeView({
    b0ClaimEntryIds: ["claim:main"],
  });
  assert.throws(() => inference.paperProjectView(missingB0Source), /B0 Claim claim:main 必须包含 sourceReference/u);

  const invalidTarget = makeView({ mainTargetEntryId: "fact:definition" });
  assert.throws(() => inference.paperProjectView(invalidTarget), /mainTargetEntryId 必须指向已存在的 Claim/u);
});

test("Inference authority keeps the historical repair loop and returns the repaired view", async () => {
  const artifact = {
    source: { fileName: "repair.pdf", pageCount: 2, sourceText: "Paper text" },
    entries: [
      { id: "fact:definition", entryClass: "fact", factKind: "definition", name: "定义 X", statement: "设 $X$。", page: 1 },
      { id: "claim:main", entryClass: "claim", claimKind: "theorem", name: "主定理", statement: "$X$ 成立。", page: 2 },
    ],
  };
  const repaired = {
    projectTitle: "Repaired paper",
    mainTargetEntryId: "claim:main",
    b0: [],
    inferences: [{
      type: "proof",
      premises: ["fact:definition"],
      conclusion: "claim:main",
      argument: "由定义得到。",
      page: 2,
    }],
  };
  let calls = 0;
  const view = await inference.requestPaperInferenceFromEntryArtifact({
    artifact,
    endpoint: "https://api.example.test/v1",
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async () => { throw new Error("fetch must not be used with chatImpl"); },
    chatImpl: async () => ({ content: JSON.stringify(calls++ === 0 ? { unexpected: true } : repaired) }),
  });

  assert.equal(calls, 2);
  assert.equal(view.mainTargetEntryId, "claim:main");
  assert.equal(view.inferences.length, 1);
});
