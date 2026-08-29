import { createHash } from "node:crypto";

export const WORKFLOW_OPTIMIZATION_POLICY_SCHEMA = "cmath.workflow-optimization-policy/v1";
export const WORKFLOW_OPTIMIZATION_ERROR_CODES = Object.freeze({
  POLICY_INVALID: "WORKFLOW_OPTIMIZATION_POLICY_INVALID",
  SUITE_INVALID: "WORKFLOW_OPTIMIZATION_SUITE_INVALID",
  INPUT_INVALID: "WORKFLOW_OPTIMIZATION_INPUT_INVALID",
});

const MODEL_ROLES = Object.freeze(["Entry", "W7.1", "W8", "Inference", "sourceScorer", "evaluationScorer"]);
const STAGES = new Set(["Entry", "W7.1", "W8", "Inference"]);
const TIERS = new Set(["quick", "candidate", "final"]);
const SOL_MODEL = "gpt-5.6-sol";
const SOL_PROVIDER = "luna-gateway";

export class WorkflowOptimizationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WorkflowOptimizationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new WorkflowOptimizationError(code, message, details);
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!record(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function validateOptimizationPolicy(value) {
  if (!record(value) || value.schema !== WORKFLOW_OPTIMIZATION_POLICY_SCHEMA || !nonempty(value.profileId)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, "optimization policy schema or profileId is invalid");
  }
  if (!record(value.models) || Object.keys(value.models).length !== MODEL_ROLES.length) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, "optimization policy must bind every model role exactly once");
  }
  for (const role of MODEL_ROLES) {
    const model = value.models[role];
    if (!record(model) || model.model !== SOL_MODEL || model.provider !== SOL_PROVIDER
      || !nonempty(model.mode) || !nonempty(model.reasoningEffort)) {
      fail(
        WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID,
        `${role} must be bound to ${SOL_PROVIDER}/${SOL_MODEL}`,
        { role },
      );
    }
  }
  const expectedRoles = {
    quick: ["regression"],
    candidate: ["regression", "generalization"],
    final: ["regression", "generalization"],
  };
  if (!record(value.tiers)) fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, "tiers are required");
  for (const tier of TIERS) {
    const configured = value.tiers[tier];
    if (!record(configured) || JSON.stringify(configured.suiteRoles) !== JSON.stringify(expectedRoles[tier])) {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, `${tier} suite roles are invalid`, { tier });
    }
    if (configured.sourceTier !== tier || typeof configured.promotionAuthority !== "boolean") {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, `${tier} source tier or authority is invalid`, { tier });
    }
  }
  if (value.tiers.quick.promotionAuthority || value.tiers.candidate.promotionAuthority
    || value.tiers.final.promotionAuthority !== true) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, "only final tier may have promotion authority");
  }
  const promotionFields = [
    "minimumSemanticAccuracy",
    "maximumPerPaperAccuracyRegression",
    "minimumCoverage",
    "minimumMainProofChainCoverage",
    "coverageNearTieTolerance",
  ];
  if (!record(value.promotion) || promotionFields.some((field) => (
    !Number.isFinite(value.promotion[field]) || value.promotion[field] < 0 || value.promotion[field] > 1
  ))) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.POLICY_INVALID, "promotion thresholds must be unit numbers");
  }
  return freeze(structuredClone(value));
}

function regressionSuite(sourceManifest) {
  if (!record(sourceManifest) || sourceManifest.schema !== "cmath.paper-source-manifest/v2"
    || !Array.isArray(sourceManifest.activeCases) || sourceManifest.activeCases.length === 0) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "a non-empty v2 regression source manifest is required");
  }
  const cases = sourceManifest.activeCases.map((item) => ({
    caseId: item.caseId,
    sourceIdentitySha256: item.sourceIdentitySha256,
  }));
  if (cases.some((item) => !nonempty(item.caseId) || !/^[a-f0-9]{64}$/u.test(item.sourceIdentitySha256 ?? ""))
    || new Set(cases.map(({ caseId }) => caseId)).size !== cases.length) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "regression cases must have unique ids and source identities");
  }
  const base = { role: "regression", version: "source-manifest-v2", status: "active", cases };
  return { ...base, identity: digest(base) };
}

function generalizationSuite(manifest) {
  if (!record(manifest) || manifest.schema !== "cmath.benchmark-generalization-suite/v1"
    || manifest.role !== "generalization" || !nonempty(manifest.suiteId) || !nonempty(manifest.version)
    || !["assembling", "active", "retired"].includes(manifest.status)
    || !Array.isArray(manifest.activeCases) || !Array.isArray(manifest.plannedDomains)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "generalization suite manifest is invalid");
  }
  const cases = manifest.activeCases.map((item) => ({
    caseId: item.caseId,
    domain: item.domain,
    sourceIdentitySha256: item.sourceIdentitySha256,
  }));
  if (cases.some((item) => !nonempty(item.caseId) || !nonempty(item.domain)
    || !/^[a-f0-9]{64}$/u.test(item.sourceIdentitySha256 ?? ""))
    || new Set(cases.map(({ caseId }) => caseId)).size !== cases.length) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "generalization cases must have domains and unique frozen source identities");
  }
  if (manifest.status === "active" && cases.length === 0) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "an active generalization suite cannot be empty");
  }
  for (const planned of manifest.plannedDomains) {
    if (!record(planned) || !nonempty(planned.domain) || !Number.isInteger(planned.minimumActiveCases)
      || planned.minimumActiveCases < 1) {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "planned domain requirements are invalid");
    }
    const count = cases.filter((item) => item.domain === planned.domain).length;
    if (manifest.status === "active" && count < planned.minimumActiveCases) {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, `active suite does not satisfy domain ${planned.domain}`);
    }
  }
  const base = {
    suiteId: manifest.suiteId,
    role: manifest.role,
    version: manifest.version,
    status: manifest.status,
    sourceContract: manifest.sourceContract,
    cases,
    plannedDomains: manifest.plannedDomains,
    rotationPolicy: manifest.rotationPolicy,
  };
  return { ...base, identity: digest(base) };
}

export function buildOptimizationRegistry({ sourceManifest, generalizationManifest } = {}) {
  return freeze({
    regression: regressionSuite(sourceManifest),
    generalization: generalizationSuite(generalizationManifest),
  });
}

export function planOptimizationTier({ policy: rawPolicy, registry, tier } = {}) {
  const policy = validateOptimizationPolicy(rawPolicy);
  if (!TIERS.has(tier) || !record(registry)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "tier and registry are required");
  }
  const roles = policy.tiers[tier].suiteRoles;
  const suites = roles.map((role) => registry[role]);
  if (suites.some((suite) => !record(suite))) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.SUITE_INVALID, "planned suite is missing");
  }
  const blockers = [];
  if (roles.includes("generalization") && registry.generalization.status !== "active") {
    blockers.push("GENERALIZATION_SUITE_NOT_ACTIVE");
  }
  if (roles.includes("generalization") && registry.generalization.cases.length === 0) {
    blockers.push("GENERALIZATION_SUITE_EMPTY");
  }
  return freeze({
    schema: "cmath.workflow-optimization-plan/v1",
    tier,
    profileId: policy.profileId,
    ready: blockers.length === 0,
    promotionAuthority: policy.tiers[tier].promotionAuthority,
    suiteIdentities: Object.fromEntries(suites.map((suite) => [suite.role, suite.identity])),
    caseIds: suites.flatMap((suite) => suite.cases.map(({ caseId }) => caseId)),
    sourceIdentities: Object.fromEntries(suites.flatMap((suite) => suite.cases.map((item) => [item.caseId, item.sourceIdentitySha256]))),
    models: policy.models,
    blockers,
  });
}

export function computeOptimizationIdentity({
  policy: rawPolicy,
  registry,
  tier,
  changedStage,
  baselineWorkflowIdentity,
  candidateModuleIdentity,
} = {}) {
  const policy = validateOptimizationPolicy(rawPolicy);
  if (!TIERS.has(tier) || !STAGES.has(changedStage) || !record(registry)
    || !nonempty(baselineWorkflowIdentity) || !nonempty(candidateModuleIdentity)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "optimization identity input is incomplete");
  }
  return digest({
    policyIdentity: digest(policy),
    suiteIdentities: {
      regression: registry.regression?.identity,
      generalization: registry.generalization?.identity,
    },
    tier,
    changedStage,
    baselineWorkflowIdentity,
    candidateModuleIdentity,
  });
}

export function prepareOptimizationRun({
  policy: rawPolicy,
  registry,
  tier,
  changedStage,
  baselineWorkflowIdentity,
  candidateModuleIdentity,
} = {}) {
  const plan = planOptimizationTier({ policy: rawPolicy, registry, tier });
  if (!plan.ready) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "optimization tier is blocked", { blockers: plan.blockers });
  }
  const optimizationIdentity = computeOptimizationIdentity({
    policy: rawPolicy,
    registry,
    tier,
    changedStage,
    baselineWorkflowIdentity,
    candidateModuleIdentity,
  });
  return freeze({
    schema: "cmath.workflow-optimization-run/v1",
    status: "prepared",
    optimizationIdentity,
    tier,
    changedStage,
    baselineWorkflowIdentity,
    candidateModuleIdentity,
    profileId: plan.profileId,
    promotionAuthority: plan.promotionAuthority,
    suiteIdentities: plan.suiteIdentities,
    caseIds: plan.caseIds,
    sourceIdentities: plan.sourceIdentities,
    models: plan.models,
    invariant: "one-stage-change",
  });
}

export function completeOptimizationRun({ preparedRun, caseResults } = {}) {
  if (!record(preparedRun) || preparedRun.schema !== "cmath.workflow-optimization-run/v1"
    || preparedRun.status !== "prepared" || !Array.isArray(caseResults)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "prepared run and case results are required");
  }
  const expected = preparedRun.caseIds;
  const actual = caseResults.map((item) => item?.caseId);
  if (new Set(actual).size !== actual.length || expected.length !== actual.length
    || expected.some((caseId) => !actual.includes(caseId))) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "case results must exactly match the prepared suite");
  }
  for (const result of caseResults) {
    if (!record(result.generation) || result.generation.provider !== SOL_PROVIDER || result.generation.model !== SOL_MODEL
      || !record(result.evaluation) || result.evaluation.provider !== SOL_PROVIDER || result.evaluation.model !== SOL_MODEL
      || result.sourceIdentitySha256 !== preparedRun.sourceIdentities?.[result.caseId]
      || !/^sha256:[a-f0-9]{64}$/u.test(result.artifactIdentity ?? "")
      || !/^sha256:[a-f0-9]{64}$/u.test(result.evaluationIdentity ?? "")) {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, `case ${result.caseId} is not bound to complete Sol generation and evaluation`);
    }
  }
  return freeze({
    ...structuredClone(preparedRun),
    status: "completed",
    caseResults: structuredClone(caseResults),
    resultIdentity: digest({ optimizationIdentity: preparedRun.optimizationIdentity, caseResults }),
  });
}

export function evaluateGeneralizationGuard({ policy: rawPolicy, baselineResults, candidateResults } = {}) {
  const policy = validateOptimizationPolicy(rawPolicy);
  if (!Array.isArray(baselineResults) || !Array.isArray(candidateResults)) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "generalization results must be arrays");
  }
  const baseline = new Map(baselineResults.map((item) => [item.caseId, item]));
  if (baseline.size !== baselineResults.length || candidateResults.length !== baselineResults.length) {
    fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "generalization result sets must match uniquely");
  }
  const reasonCodes = new Set();
  const perCase = candidateResults.map((candidate) => {
    const prior = baseline.get(candidate.caseId);
    if (!prior || !record(candidate.metrics) || !record(prior.metrics)) {
      fail(WORKFLOW_OPTIMIZATION_ERROR_CODES.INPUT_INVALID, "generalization case or metrics are missing");
    }
    const reasons = [];
    if (!candidate.metrics.sourceClean) reasons.push("GENERALIZATION_SOURCE_UNCLEAN");
    if (candidate.metrics.hasFabrication) reasons.push("GENERALIZATION_FABRICATION");
    if (candidate.metrics.hasDistortion) reasons.push("GENERALIZATION_DISTORTION");
    const delta = candidate.metrics.semanticAccuracy - prior.metrics.semanticAccuracy;
    if (!Number.isFinite(delta) || delta < -policy.promotion.maximumPerPaperAccuracyRegression) {
      reasons.push("GENERALIZATION_SEMANTIC_REGRESSION");
    }
    reasons.forEach((reason) => reasonCodes.add(reason));
    return { caseId: candidate.caseId, semanticDelta: Number(delta.toFixed(12)), passed: reasons.length === 0, reasonCodes: reasons };
  });
  return freeze({
    schema: "cmath.workflow-generalization-guard/v1",
    passed: reasonCodes.size === 0,
    perCase,
    reasonCodes: [...reasonCodes].sort(),
  });
}
