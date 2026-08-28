import assert from "node:assert/strict";
import test from "node:test";

import {
  BENCHMARK_PROMOTION_GATE_ERROR_CODES,
  BENCHMARK_PROMOTION_GATE_SCHEMA,
  BENCHMARK_MODULE_EXPERIMENT_SCHEMA,
  computeFrozenWorkflowIdentity,
  createModuleExperimentRecord,
  evaluateEndToEndPromotion,
} from "../scripts/benchmark-promotion-gate.mjs";

const baselineStageIdentities = {
  Entry: "entry:frozen:v1",
  "W7.1": "w7.1:frozen:v1",
  W8: "w8:frozen:v1",
  Inference: "inference:frozen:v1",
};

const moduleRecordInput = {
  changedStage: "Entry",
  baselineWorkflowIdentity: computeFrozenWorkflowIdentity(baselineStageIdentities),
  baselineStageIdentities,
  candidateModuleIdentity: "entry:candidate:v2",
  caseId: "case-a",
  metrics: { coverage: 0.72, semanticAccuracy: 0.95 },
  frozenStages: {
    "W7.1": "w7.1:frozen:v1",
    W8: "w8:frozen:v1",
    Inference: "inference:frozen:v1",
  },
};

test("模块实验记录只能成为 module-candidate，且不能取得 Frozen Workflow 改写权", () => {
  const record = createModuleExperimentRecord(moduleRecordInput);

  assert.equal(record.schema, BENCHMARK_MODULE_EXPERIMENT_SCHEMA);
  assert.equal(record.kind, "module-candidate");
  assert.equal(record.changedStage, "Entry");
  assert.equal(record.promotionAuthority, false);
  assert.equal(record.canRewriteFrozenWorkflow, false);
  assert.equal("frozenWorkflowIdentity" in record, false);
  assert.deepEqual(record.frozenStages, moduleRecordInput.frozenStages);
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.metrics), true);
  assert.throws(() => {
    record.metrics.coverage = 1;
  }, TypeError);
});

test("模块实验必须只改变一个阶段并冻结其余三个阶段", () => {
  assert.throws(
    () => createModuleExperimentRecord({ ...moduleRecordInput, changedStage: ["Entry", "W8"] }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.STAGE_INVALID,
  );
  assert.throws(
    () => createModuleExperimentRecord({
      ...moduleRecordInput,
      frozenStages: { W8: "w8:frozen:v1", Inference: "inference:frozen:v1" },
    }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.FROZEN_STAGES_INVALID,
  );
  assert.throws(
    () => createModuleExperimentRecord({
      ...moduleRecordInput,
      baselineWorkflowIdentity: "sha256:wrong",
    }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
  );
  assert.throws(
    () => createModuleExperimentRecord({
      ...moduleRecordInput,
      candidateModuleIdentity: baselineStageIdentities.Entry,
    }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
  );
  assert.throws(
    () => createModuleExperimentRecord({ ...moduleRecordInput, metrics: new Map([["coverage", 1]]) }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
  );
  assert.throws(
    () => createModuleExperimentRecord({ ...moduleRecordInput, metrics: { score: () => 1 } }),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
  );
});

test("Entry、W7.1、W8、Inference 四类模块都绑定同一基线且只替换自身", () => {
  for (const changedStage of Object.keys(baselineStageIdentities)) {
    const frozenStages = Object.fromEntries(
      Object.entries(baselineStageIdentities).filter(([stage]) => stage !== changedStage),
    );
    const record = createModuleExperimentRecord({
      ...moduleRecordInput,
      changedStage,
      candidateModuleIdentity: `${changedStage}:candidate:v2`,
      frozenStages,
    });
    assert.equal(record.changedStage, changedStage);
    assert.deepEqual(record.frozenStages, frozenStages);
  }
});

function metrics(overrides = {}) {
  const coverage = overrides.coverage ?? 0.82;
  return {
    contractLegal: true,
    sourceClean: true,
    hasFabrication: false,
    hasDistortion: false,
    semanticAccuracy: 0.95,
    entryCoverage: coverage,
    inferenceCoverage: coverage,
    claimStateCoverage: coverage,
    mainProofChainCoverage: 0.8,
    stability: 0.9,
    cost: 10,
    durationMs: 1000,
    ...overrides,
  };
}

function result(caseId, metricOverrides = {}, overrides = {}) {
  return {
    caseId,
    tier: "final",
    endToEndComplete: true,
    workflowIdentity: "workflow:candidate:v2",
    sourceIdentity: `source:${caseId}`,
    artifactIdentity: `artifact:${caseId}:candidate`,
    stageArtifacts: {
      Entry: { identity: `entry:${caseId}`, complete: true },
      "W7.1": { identity: `w7.1:${caseId}`, complete: true },
      W8: { identity: `w8:${caseId}`, complete: true },
      Inference: { identity: `inference:${caseId}`, complete: true },
    },
    metrics: metrics(metricOverrides),
    ...overrides,
  };
}

function baselineResult(caseId, metricOverrides = {}, overrides = {}) {
  return result(caseId, metricOverrides, {
    workflowIdentity: "workflow:frozen:v1",
    artifactIdentity: `artifact:${caseId}:baseline`,
    ...overrides,
  });
}

function promotionInput(overrides = {}) {
  const fixedCaseIds = ["paper-a", "paper-b"];
  return {
    baselineWorkflowIdentity: "workflow:frozen:v1",
    candidateWorkflowIdentity: "workflow:candidate:v2",
    fixedCaseIds,
    fixedSourceIdentities: Object.fromEntries(fixedCaseIds.map((caseId) => [caseId, `source:${caseId}`])),
    policy: {
      minimumSemanticAccuracy: 0.8,
      maximumPerPaperAccuracyRegression: 0.05,
      minimumCoverage: 0.7,
      minimumMainProofChainCoverage: 0.7,
      coverageNearTieTolerance: 0.02,
    },
    baselineResults: fixedCaseIds.map((caseId) => baselineResult(caseId, { coverage: 0.7 })),
    candidateResults: fixedCaseIds.map((caseId) => result(caseId, { coverage: 0.9 })),
    ...overrides,
  };
}

test("合法端到端候选逐篇通过后才能按固定集平均覆盖率晋级", () => {
  const output = evaluateEndToEndPromotion(promotionInput());

  assert.equal(output.schema, BENCHMARK_PROMOTION_GATE_SCHEMA);
  assert.equal(output.decision, "promote");
  assert.equal(output.eligible, true);
  assert.equal(output.candidateWorkflowIdentity, "workflow:candidate:v2");
  assert.equal(output.frozenWorkflowMutation, null);
  assert.deepEqual(output.orderedChecks, [
    "contract",
    "source-and-semantic",
    "coverage-and-main-proof",
    "tie-break",
  ]);
  assert.deepEqual(output.reasonCodes, []);
  assert.equal(output.perCase.length, 2);
  assert.equal(output.aggregates.baseline.coverage, 0.7);
  assert.equal(output.aggregates.candidate.coverage, 0.9);
  assert.equal(output.aggregates.coverageDelta, 0.2);
  assert.equal(Object.isFrozen(output), true);
  assert.equal(Object.isFrozen(output.perCase), true);
  assert.equal(Object.isFrozen(output.aggregates), true);
});

test("最终晋级门可约束完整五篇固定论文集", () => {
  const fixedCaseIds = ["paper-a", "paper-b", "paper-c", "paper-d", "paper-e"];
  const input = promotionInput({
    fixedCaseIds,
    fixedSourceIdentities: Object.fromEntries(fixedCaseIds.map((caseId) => [caseId, `source:${caseId}`])),
    baselineResults: fixedCaseIds.map((caseId) => baselineResult(caseId, { coverage: 0.7 })),
    candidateResults: fixedCaseIds.map((caseId) => result(caseId, { coverage: 0.85 })),
  });
  const output = evaluateEndToEndPromotion(input);
  assert.equal(output.decision, "promote");
  assert.deepEqual(output.fixedCaseIds, fixedCaseIds);
  assert.equal(output.perCase.length, 5);
});

test("固定集平均提升不能掩盖任一论文的语义准确性实质退步", () => {
  const input = promotionInput();
  input.baselineResults = [
    baselineResult("paper-a", { semanticAccuracy: 0.95, coverage: 0.7 }),
    baselineResult("paper-b", { semanticAccuracy: 0.85, coverage: 0.7 }),
  ];
  input.candidateResults = [
    result("paper-a", { semanticAccuracy: 0.89, coverage: 1 }),
    result("paper-b", { semanticAccuracy: 1, coverage: 1 }),
  ];

  const output = evaluateEndToEndPromotion(input);
  assert.equal(output.decision, "reject");
  assert.equal(output.eligible, false);
  assert.ok(output.reasonCodes.includes("PER_PAPER_SEMANTIC_REGRESSION"));
  assert.equal(output.frozenWorkflowMutation, null);
});

test("覆盖提高不能掩盖伪造或歪曲", () => {
  const input = promotionInput();
  input.candidateResults[0] = result("paper-a", {
    coverage: 1,
    sourceClean: false,
    hasFabrication: true,
  });

  const output = evaluateEndToEndPromotion(input);
  assert.equal(output.decision, "reject");
  assert.ok(output.reasonCodes.includes("FABRICATION"));
  assert.ok(output.reasonCodes.includes("SOURCE_UNCLEAN"));
});

test("结果接近时依次只用稳定性、成本和速度决胜", () => {
  const stableInput = promotionInput();
  stableInput.candidateResults = stableInput.fixedCaseIds.map((caseId) => result(caseId, {
    coverage: 0.71,
    stability: 0.95,
    cost: 100,
    durationMs: 10000,
  }));
  assert.equal(evaluateEndToEndPromotion(stableInput).decision, "promote");
  assert.equal(evaluateEndToEndPromotion(stableInput).tieBreak.winner, "stability");

  const costInput = promotionInput();
  costInput.baselineResults = costInput.fixedCaseIds.map((caseId) => baselineResult(caseId, {
    coverage: 0.7,
    stability: 0.9,
    cost: 10,
    durationMs: 1000,
  }));
  costInput.candidateResults = costInput.fixedCaseIds.map((caseId) => result(caseId, {
    coverage: 0.71,
    stability: 0.9,
    cost: 9,
    durationMs: 5000,
  }));
  assert.equal(evaluateEndToEndPromotion(costInput).tieBreak.winner, "cost");

  const speedInput = structuredClone(costInput);
  speedInput.candidateResults.forEach((item) => {
    item.metrics.cost = 10;
    item.metrics.durationMs = 900;
  });
  assert.equal(evaluateEndToEndPromotion(speedInput).tieBreak.winner, "speed");
});

test("固定集必须完整、唯一、final 且端到端完成", () => {
  const missing = promotionInput();
  missing.candidateResults = missing.candidateResults.slice(0, 1);
  assert.throws(
    () => evaluateEndToEndPromotion(missing),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
  );

  const partial = promotionInput();
  partial.candidateResults[0] = result("paper-a", {}, { tier: "candidate" });
  assert.throws(
    () => evaluateEndToEndPromotion(partial),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
  );

  for (const poisonedResult of [
    result("paper-a", {}, { workflowIdentity: "workflow:other" }),
    result("paper-a", {}, { sourceIdentity: "source:other" }),
    result("paper-a", {}, {
      stageArtifacts: {
        Entry: { identity: "entry:paper-a", complete: true },
        "W7.1": { identity: "w7.1:paper-a", complete: true },
        W8: { identity: "w8:paper-a", complete: false },
        Inference: { identity: "inference:paper-a", complete: true },
      },
    }),
  ]) {
    const poisoned = promotionInput();
    poisoned.candidateResults[0] = poisonedResult;
    assert.throws(
      () => evaluateEndToEndPromotion(poisoned),
      (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
    );
  }
});

test("合同、逐篇底线和主证明链按门序拒绝候选", () => {
  const illegal = promotionInput();
  illegal.candidateResults[0] = result("paper-a", { contractLegal: false });
  assert.ok(evaluateEndToEndPromotion(illegal).reasonCodes.includes("CONTRACT_ILLEGAL"));

  const below = promotionInput();
  below.candidateResults[0] = result("paper-a", {
    semanticAccuracy: 0.79,
    coverage: 0.69,
    mainProofChainCoverage: 0.69,
  });
  assert.deepEqual(evaluateEndToEndPromotion(below).reasonCodes, [
    "SEMANTIC_ACCURACY_BELOW_MINIMUM",
    "PER_PAPER_SEMANTIC_REGRESSION",
    "COVERAGE_BELOW_MINIMUM",
    "MAIN_PROOF_CHAIN_BELOW_MINIMUM",
  ]);

  const crossPaper = promotionInput();
  crossPaper.candidateResults[0] = result("paper-a", { coverage: 0.69 });
  crossPaper.candidateResults[1] = result("paper-b", { contractLegal: false });
  assert.deepEqual(evaluateEndToEndPromotion(crossPaper).reasonCodes, [
    "CONTRACT_ILLEGAL",
    "COVERAGE_BELOW_MINIMUM",
  ]);

  const incompleteState = promotionInput();
  incompleteState.candidateResults[0] = result("paper-a", {
    coverage: 0.9,
    inferenceCoverage: 0.69,
  });
  assert.ok(evaluateEndToEndPromotion(incompleteState).reasonCodes.includes("COVERAGE_BELOW_MINIMUM"));
});

test("近似平局容差不能扩大成可绕过覆盖约束的区间", () => {
  const input = promotionInput();
  input.policy.coverageNearTieTolerance = 1;
  assert.throws(
    () => evaluateEndToEndPromotion(input),
    (error) => error?.code === BENCHMARK_PROMOTION_GATE_ERROR_CODES.POLICY_INVALID,
  );
});
