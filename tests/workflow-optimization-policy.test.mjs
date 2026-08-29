import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildOptimizationRegistry,
  computeOptimizationIdentity,
  completeOptimizationRun,
  evaluateGeneralizationGuard,
  planOptimizationTier,
  prepareOptimizationRun,
  validateOptimizationPolicy,
} from "../scripts/workflow-optimization-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const policy = readJson("benchmarks/paper-import/optimization-policy.json");
const sourceManifest = readJson("benchmarks/paper-import/source-manifest.json");
const generalizationManifest = readJson("benchmarks/paper-import/generalization-suite-v1.json");

test("optimization policy binds every generation and evaluation role to Sol", () => {
  const validated = validateOptimizationPolicy(policy);
  assert.equal(validated.profileId, "sol-only-v1");
  for (const [role, model] of Object.entries(validated.models)) {
    assert.equal(model.model, "gpt-5.6-sol", `${role} must use Sol`);
    assert.equal(model.provider, "codex-chatgpt-login", `${role} must use the same provider identity`);
  }
  assert.deepEqual(validated.tiers.quick.suiteRoles, ["regression"]);
  assert.deepEqual(validated.tiers.candidate.suiteRoles, ["regression", "generalization"]);
  assert.deepEqual(validated.tiers.final.suiteRoles, ["regression", "generalization"]);
});

test("non-Sol stage or scorer is rejected before an experiment is planned", () => {
  for (const role of ["Entry", "W7.1", "W8", "Inference", "sourceScorer", "evaluationScorer"]) {
    const changed = structuredClone(policy);
    changed.models[role].model = "another-model";
    assert.throws(
      () => validateOptimizationPolicy(changed),
      (error) => error?.code === "WORKFLOW_OPTIMIZATION_POLICY_INVALID",
      role,
    );
  }
});

test("registry gives regression and generalization suites independent immutable identities", () => {
  const registry = buildOptimizationRegistry({ sourceManifest, generalizationManifest });
  assert.equal(registry.regression.role, "regression");
  assert.equal(registry.generalization.role, "generalization");
  assert.equal(registry.regression.cases.length, 5);
  assert.notEqual(registry.regression.identity, registry.generalization.identity);
  assert.match(registry.regression.identity, /^sha256:[a-f0-9]{64}$/u);
  assert.match(registry.generalization.identity, /^sha256:[a-f0-9]{64}$/u);

  const rotated = structuredClone(generalizationManifest);
  rotated.version = "v2";
  assert.notEqual(
    buildOptimizationRegistry({ sourceManifest, generalizationManifest: rotated }).generalization.identity,
    registry.generalization.identity,
  );
});

test("quick experiments may run on regression only while candidate and final fail closed without frozen generalization sources", () => {
  const assembling = structuredClone(generalizationManifest);
  assembling.status = "assembling";
  const registry = buildOptimizationRegistry({ sourceManifest, generalizationManifest: assembling });
  const quick = planOptimizationTier({ policy, registry, tier: "quick" });
  assert.equal(quick.ready, true);
  assert.deepEqual(quick.caseIds, sourceManifest.activeCases.map(({ caseId }) => caseId));

  for (const tier of ["candidate", "final"]) {
    const plan = planOptimizationTier({ policy, registry, tier });
    assert.equal(plan.ready, false);
    assert.ok(plan.blockers.includes("GENERALIZATION_SUITE_NOT_ACTIVE"));
    assert.equal(plan.caseIds.length, sourceManifest.activeCases.length + assembling.activeCases.length);
  }
});

test("candidate and final plans include every active cross-domain case once sources are frozen", () => {
  const active = structuredClone(generalizationManifest);
  active.status = "active";
  active.activeCases = [
    { caseId: "algebra-paper", domain: "algebra", sourceIdentitySha256: "a".repeat(64) },
    { caseId: "analysis-paper", domain: "analysis", sourceIdentitySha256: "b".repeat(64) },
    { caseId: "number-theory-paper", domain: "number-theory", sourceIdentitySha256: "c".repeat(64) },
    { caseId: "combinatorics-paper", domain: "combinatorics", sourceIdentitySha256: "d".repeat(64) },
  ];
  const registry = buildOptimizationRegistry({ sourceManifest, generalizationManifest: active });
  const plan = planOptimizationTier({ policy, registry, tier: "candidate" });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.caseIds.slice(-4), ["algebra-paper", "analysis-paper", "number-theory-paper", "combinatorics-paper"]);
  assert.deepEqual(plan.suiteIdentities, {
    regression: registry.regression.identity,
    generalization: registry.generalization.identity,
  });
});

test("active generalization suite must satisfy every planned domain", () => {
  const incomplete = structuredClone(generalizationManifest);
  incomplete.status = "active";
  incomplete.activeCases = [
    { caseId: "algebra-paper", domain: "algebra", sourceIdentitySha256: "a".repeat(64) },
  ];
  assert.throws(
    () => buildOptimizationRegistry({ sourceManifest, generalizationManifest: incomplete }),
    /does not satisfy domain analysis/u,
  );
});

test("optimization identity binds policy, suites, baseline, candidate and the single changed stage", () => {
  const registry = buildOptimizationRegistry({ sourceManifest, generalizationManifest });
  const input = {
    policy,
    registry,
    tier: "quick",
    changedStage: "Inference",
    baselineWorkflowIdentity: "workflow:baseline",
    candidateModuleIdentity: "inference:candidate:v1",
  };
  const first = computeOptimizationIdentity(input);
  assert.match(first, /^sha256:[a-f0-9]{64}$/u);
  for (const [field, value] of [
    ["tier", "candidate"],
    ["changedStage", "Entry"],
    ["baselineWorkflowIdentity", "workflow:other"],
    ["candidateModuleIdentity", "inference:candidate:v2"],
  ]) {
    assert.notEqual(computeOptimizationIdentity({ ...input, [field]: value }), first, field);
  }
});

test("generalization guard rejects source defects and per-paper semantic regression", () => {
  const baselineResults = [
    { caseId: "algebra", metrics: { semanticAccuracy: 0.95 } },
    { caseId: "analysis", metrics: { semanticAccuracy: 0.9 } },
  ];
  const candidateResults = [
    { caseId: "algebra", metrics: { semanticAccuracy: 0.94, sourceClean: true, hasFabrication: false, hasDistortion: false } },
    { caseId: "analysis", metrics: { semanticAccuracy: 0.9, sourceClean: true, hasFabrication: false, hasDistortion: false } },
  ];
  assert.equal(evaluateGeneralizationGuard({ policy, baselineResults, candidateResults }).passed, true);

  candidateResults[0].metrics.semanticAccuracy = 0.88;
  candidateResults[1].metrics.hasFabrication = true;
  const rejected = evaluateGeneralizationGuard({ policy, baselineResults, candidateResults });
  assert.equal(rejected.passed, false);
  assert.ok(rejected.reasonCodes.includes("GENERALIZATION_SEMANTIC_REGRESSION"));
  assert.ok(rejected.reasonCodes.includes("GENERALIZATION_FABRICATION"));
});

test("run records bind one changed stage, exact suites, and Sol on both sides of every case", () => {
  const active = structuredClone(generalizationManifest);
  active.status = "active";
  const registry = buildOptimizationRegistry({ sourceManifest, generalizationManifest: active });
  const prepared = prepareOptimizationRun({
    policy,
    registry,
    tier: "quick",
    changedStage: "Inference",
    baselineWorkflowIdentity: "workflow:baseline",
    candidateModuleIdentity: "inference:candidate-v1",
  });
  assert.equal(prepared.status, "prepared");
  const caseResults = prepared.caseIds.map((caseId) => ({
    caseId,
    sourceIdentitySha256: prepared.sourceIdentities[caseId],
    generation: { provider: "codex-chatgpt-login", model: "gpt-5.6-sol" },
    evaluation: { provider: "codex-chatgpt-login", model: "gpt-5.6-sol" },
    artifactIdentity: `sha256:${"a".repeat(64)}`,
    evaluationIdentity: `sha256:${"b".repeat(64)}`,
  }));
  const completed = completeOptimizationRun({ preparedRun: prepared, caseResults });
  assert.equal(completed.status, "completed");
  assert.match(completed.resultIdentity, /^sha256:[a-f0-9]{64}$/u);
  caseResults[0].evaluation.model = "other-model";
  assert.throws(() => completeOptimizationRun({ preparedRun: prepared, caseResults }), /not bound to complete Sol/u);
  caseResults[0].evaluation.model = "gpt-5.6-sol";
  caseResults[0].sourceIdentitySha256 = "0".repeat(64);
  assert.throws(() => completeOptimizationRun({ preparedRun: prepared, caseResults }), /not bound to complete Sol/u);
});
