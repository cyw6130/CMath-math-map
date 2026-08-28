/**
 * Pure, auditable promotion gates for benchmark module experiments and
 * end-to-end workflow candidates.
 */

import { createHash } from "node:crypto";

export const BENCHMARK_MODULE_EXPERIMENT_SCHEMA = "cmath.benchmark-module-experiment/v0.1";
export const BENCHMARK_PROMOTION_GATE_SCHEMA = "cmath.benchmark-promotion-gate/v0.1";

export const BENCHMARK_MODULE_EXPERIMENT_STAGES = Object.freeze({
  ENTRY: "Entry",
  W7_1: "W7.1",
  W8: "W8",
  INFERENCE: "Inference",
});

export const BENCHMARK_PROMOTION_GATE_ERROR_CODES = Object.freeze({
  INPUT_INVALID: "BENCHMARK_PROMOTION_GATE_INPUT_INVALID",
  STAGE_INVALID: "BENCHMARK_PROMOTION_GATE_STAGE_INVALID",
  IDENTITY_INVALID: "BENCHMARK_PROMOTION_GATE_IDENTITY_INVALID",
  FROZEN_STAGES_INVALID: "BENCHMARK_PROMOTION_GATE_FROZEN_STAGES_INVALID",
  CASE_SET_INVALID: "BENCHMARK_PROMOTION_GATE_CASE_SET_INVALID",
  RESULTS_INVALID: "BENCHMARK_PROMOTION_GATE_RESULTS_INVALID",
  POLICY_INVALID: "BENCHMARK_PROMOTION_GATE_POLICY_INVALID",
  METRICS_INVALID: "BENCHMARK_PROMOTION_GATE_METRICS_INVALID",
});

// Keep the shorter name available for callers that treat the gate as the
// single public benchmark-promotion error surface.
export const BENCHMARK_PROMOTION_ERROR_CODES = BENCHMARK_PROMOTION_GATE_ERROR_CODES;

export class BenchmarkPromotionGateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BenchmarkPromotionGateError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new BenchmarkPromotionGateError(code, message, details);
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function clonePlainData(value, field, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || seen.has(value) || (!Array.isArray(value) && !isRecord(value))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
      `${field} must contain only acyclic JSON-compatible data`,
      { field },
    );
  }
  seen.add(value);
  const cloned = Array.isArray(value)
    ? value.map((child, index) => clonePlainData(child, `${field}[${index}]`, seen))
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      clonePlainData(child, `${field}.${key}`, seen),
    ]));
  seen.delete(value);
  return cloned;
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function canonicalStage(value) {
  if (!nonemptyString(value)) return null;
  const token = value.trim().toLowerCase().replace(/[_-]/gu, ".");
  return {
    entry: BENCHMARK_MODULE_EXPERIMENT_STAGES.ENTRY,
    "w7.1": BENCHMARK_MODULE_EXPERIMENT_STAGES.W7_1,
    w8: BENCHMARK_MODULE_EXPERIMENT_STAGES.W8,
    inference: BENCHMARK_MODULE_EXPERIMENT_STAGES.INFERENCE,
  }[token] ?? null;
}

function normalizeStageIdentities(value, field) {
  requireRecord(value, field, BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID);
  const normalized = {};
  for (const [rawStage, identity] of Object.entries(value)) {
    const stage = canonicalStage(rawStage);
    if (!stage || stage in normalized) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
        `${field} must contain each canonical stage exactly once`,
        { field, stage: rawStage },
      );
    }
    normalized[stage] = requireIdentity(identity, `${field}.${rawStage}`);
  }
  const stages = Object.values(BENCHMARK_MODULE_EXPERIMENT_STAGES);
  if (Object.keys(normalized).length !== stages.length || stages.some((stage) => !(stage in normalized))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
      `${field} must contain Entry, W7.1, W8, and Inference identities`,
      { field },
    );
  }
  return Object.fromEntries(stages.map((stage) => [stage, normalized[stage]]));
}

export function computeFrozenWorkflowIdentity(stageIdentities) {
  const normalized = normalizeStageIdentities(stageIdentities, "stageIdentities");
  return `sha256:${createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}

function requireIdentity(value, field) {
  if (!nonemptyString(value)) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
      `${field} must be a non-empty identity string`,
      { field },
    );
  }
  return value.trim();
}

function requireRecord(value, field, code = BENCHMARK_PROMOTION_GATE_ERROR_CODES.INPUT_INVALID) {
  if (!isRecord(value)) fail(code, `${field} must be an object`, { field });
  return value;
}

function validateFrozenStages(value, changedStage, baselineStageIdentities) {
  requireRecord(
    value,
    "frozenStages",
    BENCHMARK_PROMOTION_GATE_ERROR_CODES.FROZEN_STAGES_INVALID,
  );
  const expected = Object.values(BENCHMARK_MODULE_EXPERIMENT_STAGES)
    .filter((stage) => stage !== changedStage);
  const normalized = {};
  for (const [rawStage, identity] of Object.entries(value)) {
    const stage = canonicalStage(rawStage);
    if (!stage || expected.includes(stage) === false || stage in normalized) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.FROZEN_STAGES_INVALID,
        "frozenStages must contain exactly one non-empty identity for every other stage",
        { field: "frozenStages", stage: rawStage },
      );
    }
    normalized[stage] = requireIdentity(identity, `frozenStages.${rawStage}`);
  }
  for (const stage of expected) {
    if (normalized[stage] !== baselineStageIdentities[stage]) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.FROZEN_STAGES_INVALID,
        "frozenStages identities must equal the bound baseline workflow stages",
        { field: "frozenStages", stage },
      );
    }
  }
  if (Object.keys(normalized).length !== expected.length || expected.some((stage) => !(stage in normalized))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.FROZEN_STAGES_INVALID,
      "frozenStages must contain exactly the three stages other than changedStage",
      { field: "frozenStages", expected },
    );
  }
  return Object.fromEntries(expected.map((stage) => [stage, normalized[stage]]));
}

export function createModuleExperimentRecord(input) {
  requireRecord(input, "input");
  if (input.changedStages !== undefined || Array.isArray(input.changedStage)) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.STAGE_INVALID,
      "a module experiment may change exactly one stage",
      { field: "changedStage" },
    );
  }
  const changedStage = canonicalStage(input.changedStage);
  if (!changedStage) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.STAGE_INVALID,
      "changedStage must be one of Entry, W7.1, W8, or Inference",
      { field: "changedStage", allowed: Object.values(BENCHMARK_MODULE_EXPERIMENT_STAGES) },
    );
  }
  const baselineWorkflowIdentity = requireIdentity(input.baselineWorkflowIdentity, "baselineWorkflowIdentity");
  const baselineStageIdentities = normalizeStageIdentities(
    input.baselineStageIdentities,
    "baselineStageIdentities",
  );
  if (baselineWorkflowIdentity !== computeFrozenWorkflowIdentity(baselineStageIdentities)) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
      "baselineWorkflowIdentity must bind the complete baseline stage identity set",
      { field: "baselineWorkflowIdentity" },
    );
  }
  const candidateModuleIdentity = requireIdentity(input.candidateModuleIdentity, "candidateModuleIdentity");
  if (candidateModuleIdentity === baselineStageIdentities[changedStage]) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
      "candidateModuleIdentity must differ from the changed baseline stage identity",
      { field: "candidateModuleIdentity", changedStage },
    );
  }
  const caseId = requireIdentity(input.caseId, "caseId");
  requireRecord(input.metrics, "metrics", BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID);
  const frozenStages = validateFrozenStages(input.frozenStages, changedStage, baselineStageIdentities);

  return deepFreeze({
    schema: BENCHMARK_MODULE_EXPERIMENT_SCHEMA,
    kind: "module-candidate",
    changedStage,
    baselineWorkflowIdentity,
    candidateModuleIdentity,
    caseId,
    metrics: clonePlainData(input.metrics, "metrics"),
    baselineStageIdentities,
    frozenStages,
    promotionAuthority: false,
    canRewriteFrozenWorkflow: false,
  });
}

const ORDERED_PROMOTION_CHECKS = Object.freeze([
  "contract",
  "source-and-semantic",
  "coverage-and-main-proof",
  "tie-break",
]);

const REASON_PRIORITY = Object.freeze([
  "CONTRACT_ILLEGAL",
  "SOURCE_UNCLEAN",
  "FABRICATION",
  "DISTORTION",
  "SEMANTIC_ACCURACY_BELOW_MINIMUM",
  "PER_PAPER_SEMANTIC_REGRESSION",
  "COVERAGE_BELOW_MINIMUM",
  "MAIN_PROOF_CHAIN_BELOW_MINIMUM",
  "AVERAGE_COVERAGE_REGRESSION",
  "TIE_BREAK_STABILITY_WORSE",
  "TIE_BREAK_COST_WORSE",
  "TIE_BREAK_SPEED_WORSE",
  "NO_MEASURABLE_IMPROVEMENT",
]);

const POLICY_FIELDS = Object.freeze([
  "minimumSemanticAccuracy",
  "maximumPerPaperAccuracyRegression",
  "minimumCoverage",
  "minimumMainProofChainCoverage",
  "coverageNearTieTolerance",
]);

const UNIT_METRIC_FIELDS = Object.freeze([
  "semanticAccuracy",
  "entryCoverage",
  "inferenceCoverage",
  "claimStateCoverage",
  "mainProofChainCoverage",
  "stability",
]);

function unitNumber(value, field, code) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    fail(code, `${field} must be a finite number between 0 and 1`, { field, value });
  }
  return value;
}

function validatePolicy(value) {
  requireRecord(value, "policy", BENCHMARK_PROMOTION_GATE_ERROR_CODES.POLICY_INVALID);
  const policy = {};
  for (const field of POLICY_FIELDS) {
    policy[field] = unitNumber(
      value[field],
      `policy.${field}`,
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.POLICY_INVALID,
    );
  }
  if (policy.coverageNearTieTolerance > 0.05) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.POLICY_INVALID,
      "policy.coverageNearTieTolerance cannot exceed 0.05",
      { field: "policy.coverageNearTieTolerance", maximum: 0.05 },
    );
  }
  return policy;
}

function validateMetrics(value, field) {
  requireRecord(value, field, BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID);
  for (const booleanField of ["contractLegal", "sourceClean", "hasFabrication", "hasDistortion"]) {
    if (typeof value[booleanField] !== "boolean") {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
        `${field}.${booleanField} must be a boolean`,
        { field: `${field}.${booleanField}` },
      );
    }
  }
  const metrics = {
    contractLegal: value.contractLegal,
    sourceClean: value.sourceClean,
    hasFabrication: value.hasFabrication,
    hasDistortion: value.hasDistortion,
  };
  for (const metricField of UNIT_METRIC_FIELDS) {
    metrics[metricField] = unitNumber(
      value[metricField],
      `${field}.${metricField}`,
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
    );
  }
  metrics.coverage = rounded((
    metrics.entryCoverage + metrics.inferenceCoverage + metrics.claimStateCoverage
  ) / 3);
  for (const metricField of ["cost", "durationMs"]) {
    if (!Number.isFinite(value[metricField]) || value[metricField] < 0) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.METRICS_INVALID,
        `${field}.${metricField} must be a non-negative finite number`,
        { field: `${field}.${metricField}` },
      );
    }
    metrics[metricField] = value[metricField];
  }
  return metrics;
}

function validateFixedCaseIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.CASE_SET_INVALID,
      "fixedCaseIds must be a non-empty array",
      { field: "fixedCaseIds" },
    );
  }
  const caseIds = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.CASE_SET_INVALID,
        "fixedCaseIds cannot be sparse",
        { field: `fixedCaseIds[${index}]` },
      );
    }
    caseIds.push(requireIdentity(value[index], `fixedCaseIds[${index}]`));
  }
  if (new Set(caseIds).size !== caseIds.length) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.CASE_SET_INVALID,
      "fixedCaseIds must be unique",
      { field: "fixedCaseIds" },
    );
  }
  return caseIds;
}

function validateFixedSourceIdentities(value, fixedCaseIds) {
  requireRecord(
    value,
    "fixedSourceIdentities",
    BENCHMARK_PROMOTION_GATE_ERROR_CODES.CASE_SET_INVALID,
  );
  const keys = Object.keys(value);
  if (keys.length !== fixedCaseIds.length || keys.some((caseId) => !fixedCaseIds.includes(caseId))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.CASE_SET_INVALID,
      "fixedSourceIdentities must bind exactly the fixed case set",
      { field: "fixedSourceIdentities" },
    );
  }
  return Object.fromEntries(fixedCaseIds.map((caseId) => [
    caseId,
    requireIdentity(value[caseId], `fixedSourceIdentities.${caseId}`),
  ]));
}

function validateStageArtifacts(value, field) {
  requireRecord(value, field, BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID);
  const stages = Object.values(BENCHMARK_MODULE_EXPERIMENT_STAGES);
  const normalized = {};
  for (const [rawStage, artifact] of Object.entries(value)) {
    const stage = canonicalStage(rawStage);
    if (!stage || stage in normalized || !isRecord(artifact)
      || artifact.complete !== true || !nonemptyString(artifact.identity)) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
        `${field} must contain one complete identity-bound artifact for every stage`,
        { field, stage: rawStage },
      );
    }
    normalized[stage] = { identity: artifact.identity.trim(), complete: true };
  }
  if (Object.keys(normalized).length !== stages.length || stages.some((stage) => !(stage in normalized))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
      `${field} must cover Entry, W7.1, W8, and Inference`,
      { field },
    );
  }
  return Object.fromEntries(stages.map((stage) => [stage, normalized[stage]]));
}

function validateResults(value, field, fixedCaseIds, fixedSourceIdentities, expectedWorkflowIdentity) {
  if (!Array.isArray(value)) {
    fail(BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID, `${field} must be an array`, { field });
  }
  const byCaseId = new Map();
  for (const [index, item] of value.entries()) {
    requireRecord(item, `${field}[${index}]`, BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID);
    const caseId = requireIdentity(item.caseId, `${field}[${index}].caseId`);
    if (byCaseId.has(caseId) || !fixedCaseIds.includes(caseId)) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
        `${field} must contain each fixed case exactly once and no unknown cases`,
        { field, caseId },
      );
    }
    if (item.tier !== "final" || item.endToEndComplete !== true) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
        `${field} results must be final-tier complete end-to-end runs`,
        { field, caseId },
      );
    }
    if (item.workflowIdentity !== expectedWorkflowIdentity
      || item.sourceIdentity !== fixedSourceIdentities[caseId]
      || !nonemptyString(item.artifactIdentity)) {
      fail(
        BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
        `${field} result identities must match the evaluated workflow and fixed canonical source`,
        { field, caseId },
      );
    }
    byCaseId.set(caseId, {
      caseId,
      tier: "final",
      endToEndComplete: true,
      workflowIdentity: item.workflowIdentity,
      sourceIdentity: item.sourceIdentity,
      artifactIdentity: item.artifactIdentity.trim(),
      stageArtifacts: validateStageArtifacts(item.stageArtifacts, `${field}[${index}].stageArtifacts`),
      metrics: validateMetrics(item.metrics, `${field}[${index}].metrics`),
    });
  }
  if (byCaseId.size !== fixedCaseIds.length || fixedCaseIds.some((caseId) => !byCaseId.has(caseId))) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.RESULTS_INVALID,
      `${field} must cover the complete fixed case set`,
      { field, expectedCaseIds: fixedCaseIds, actualCaseIds: [...byCaseId.keys()] },
    );
  }
  return byCaseId;
}

function rounded(value) {
  return Number(value.toFixed(12));
}

function average(results, field) {
  return rounded(results.reduce((sum, item) => sum + item.metrics[field], 0) / results.length);
}

function aggregate(results) {
  return {
    semanticAccuracy: average(results, "semanticAccuracy"),
    coverage: average(results, "coverage"),
    mainProofChainCoverage: average(results, "mainProofChainCoverage"),
    stability: average(results, "stability"),
    cost: average(results, "cost"),
    durationMs: average(results, "durationMs"),
  };
}

function decideTieBreak(baseline, candidate) {
  if (candidate.stability !== baseline.stability) {
    return {
      decision: candidate.stability > baseline.stability ? "promote" : "reject",
      winner: "stability",
      reasonCode: candidate.stability > baseline.stability ? null : "TIE_BREAK_STABILITY_WORSE",
    };
  }
  if (candidate.cost !== baseline.cost) {
    return {
      decision: candidate.cost < baseline.cost ? "promote" : "reject",
      winner: "cost",
      reasonCode: candidate.cost < baseline.cost ? null : "TIE_BREAK_COST_WORSE",
    };
  }
  if (candidate.durationMs !== baseline.durationMs) {
    return {
      decision: candidate.durationMs < baseline.durationMs ? "promote" : "reject",
      winner: "speed",
      reasonCode: candidate.durationMs < baseline.durationMs ? null : "TIE_BREAK_SPEED_WORSE",
    };
  }
  return { decision: "reject", winner: null, reasonCode: "NO_MEASURABLE_IMPROVEMENT" };
}

function addUniqueReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

export function evaluateEndToEndPromotion(input) {
  requireRecord(input, "input");
  const baselineWorkflowIdentity = requireIdentity(input.baselineWorkflowIdentity, "baselineWorkflowIdentity");
  const candidateWorkflowIdentity = requireIdentity(input.candidateWorkflowIdentity, "candidateWorkflowIdentity");
  if (baselineWorkflowIdentity === candidateWorkflowIdentity) {
    fail(
      BENCHMARK_PROMOTION_GATE_ERROR_CODES.IDENTITY_INVALID,
      "candidateWorkflowIdentity must differ from baselineWorkflowIdentity",
      { field: "candidateWorkflowIdentity" },
    );
  }
  const fixedCaseIds = validateFixedCaseIds(input.fixedCaseIds);
  const fixedSourceIdentities = validateFixedSourceIdentities(input.fixedSourceIdentities, fixedCaseIds);
  const policy = validatePolicy(input.policy);
  const baselineByCase = validateResults(
    input.baselineResults,
    "baselineResults",
    fixedCaseIds,
    fixedSourceIdentities,
    baselineWorkflowIdentity,
  );
  const candidateByCase = validateResults(
    input.candidateResults,
    "candidateResults",
    fixedCaseIds,
    fixedSourceIdentities,
    candidateWorkflowIdentity,
  );
  const reasons = [];
  const perCase = fixedCaseIds.map((caseId) => {
    const baseline = baselineByCase.get(caseId);
    const candidate = candidateByCase.get(caseId);
    const caseReasons = [];
    if (!candidate.metrics.contractLegal) caseReasons.push("CONTRACT_ILLEGAL");
    if (!candidate.metrics.sourceClean) caseReasons.push("SOURCE_UNCLEAN");
    if (candidate.metrics.hasFabrication) caseReasons.push("FABRICATION");
    if (candidate.metrics.hasDistortion) caseReasons.push("DISTORTION");
    if (candidate.metrics.semanticAccuracy < policy.minimumSemanticAccuracy) {
      caseReasons.push("SEMANTIC_ACCURACY_BELOW_MINIMUM");
    }
    const semanticDelta = rounded(candidate.metrics.semanticAccuracy - baseline.metrics.semanticAccuracy);
    if (semanticDelta < -policy.maximumPerPaperAccuracyRegression) {
      caseReasons.push("PER_PAPER_SEMANTIC_REGRESSION");
    }
    if ([
      candidate.metrics.entryCoverage,
      candidate.metrics.inferenceCoverage,
      candidate.metrics.claimStateCoverage,
    ].some((coverage) => coverage < policy.minimumCoverage)) {
      caseReasons.push("COVERAGE_BELOW_MINIMUM");
    }
    if (candidate.metrics.mainProofChainCoverage < policy.minimumMainProofChainCoverage) {
      caseReasons.push("MAIN_PROOF_CHAIN_BELOW_MINIMUM");
    }
    caseReasons.forEach((reason) => addUniqueReason(reasons, reason));
    return {
      caseId,
      baseline: baseline.metrics,
      candidate: candidate.metrics,
      deltas: {
        semanticAccuracy: semanticDelta,
        coverage: rounded(candidate.metrics.coverage - baseline.metrics.coverage),
        mainProofChainCoverage: rounded(
          candidate.metrics.mainProofChainCoverage - baseline.metrics.mainProofChainCoverage,
        ),
      },
      passed: caseReasons.length === 0,
      reasonCodes: caseReasons,
    };
  });
  const baselineResults = fixedCaseIds.map((caseId) => baselineByCase.get(caseId));
  const candidateResults = fixedCaseIds.map((caseId) => candidateByCase.get(caseId));
  const baseline = aggregate(baselineResults);
  const candidate = aggregate(candidateResults);
  const coverageDelta = rounded(candidate.coverage - baseline.coverage);
  let decision = "reject";
  let tieBreak = { applied: false, winner: null };

  if (reasons.length === 0) {
    if (coverageDelta > policy.coverageNearTieTolerance) {
      decision = "promote";
    } else if (coverageDelta < -policy.coverageNearTieTolerance) {
      addUniqueReason(reasons, "AVERAGE_COVERAGE_REGRESSION");
    } else {
      const result = decideTieBreak(baseline, candidate);
      decision = result.decision;
      tieBreak = { applied: true, winner: result.winner };
      if (result.reasonCode) addUniqueReason(reasons, result.reasonCode);
    }
  }

  return deepFreeze({
    schema: BENCHMARK_PROMOTION_GATE_SCHEMA,
    decision,
    eligible: decision === "promote",
    baselineWorkflowIdentity,
    candidateWorkflowIdentity,
    frozenWorkflowMutation: null,
    orderedChecks: [...ORDERED_PROMOTION_CHECKS],
    policy,
    fixedCaseIds: [...fixedCaseIds],
    fixedSourceIdentities,
    perCase,
    aggregates: { baseline, candidate, coverageDelta },
    tieBreak,
    reasonCodes: [...reasons].sort((left, right) => (
      REASON_PRIORITY.indexOf(left) - REASON_PRIORITY.indexOf(right)
    )),
  });
}
