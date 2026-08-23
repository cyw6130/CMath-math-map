#!/usr/bin/env node
/**
 * audit-paper-benchmarks.mjs
 * Strengthened audit script covering all six canonical benchmark cases.
 * Checks:
 *   - Required files present
 *   - review-status has a valid status (including new provisional-reference/needs-revision)
 *   - gold-project-view.json has projectTitle at top level
 *   - No duplicate entry IDs in gold entries
 *   - No duplicate derived claim IDs in benchmark-spec.json
 *   - B0 set integrity (all entries exist, all have sourceReference)
 *   - Proof DAG real integrity: no cycles, no unresolved premises/conclusions
 *   - Closure count validation using spec.closureInvariants
 *   - Source manifest integrity for cases that require it
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import semantics from "../math-map-semantics.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const casesRoot = join(root, "benchmarks/paper-import/cases");

// All six canonical case IDs
const ALL_CASES = [
  "hopf-degree-theorem",
  "knot-hopf-rt",
  "4-dim-skein-modules-handles-tangles",
  "cornered-skein-lasagna-theory",
  "kirby-2018-trisections",
  "yasui-2019-geometrically-simply-connected-4-manifolds",
];

// Cases that have a source-manifest entry (the 4 original PDF-import cases)
const SOURCE_MANIFEST_CASES = new Set([
  "4-dim-skein-modules-handles-tangles",
  "cornered-skein-lasagna-theory",
  "kirby-2018-trisections",
  "yasui-2019-geometrically-simply-connected-4-manifolds",
]);

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// Extended valid statuses including new taxonomy
const VALID_STATUSES = new Set([
  "structural-draft",
  "provisional-reference",
  "needs-revision",
  "semantic-reviewed",
  "mathematically-reviewed",
  "accepted-gold",
]);

// Statuses that can serve as semantic scoring authority (not needs-revision)
const SCORING_ELIGIBLE_STATUSES = new Set([
  "provisional-reference",
  "semantic-reviewed",
  "mathematically-reviewed",
  "accepted-gold",
]);

let sourceByCase = new Map();
try {
  const sourceManifest = JSON.parse(readFileSync(join(root, "benchmarks/paper-import/source-manifest.json"), "utf8"));
  sourceByCase = new Map(sourceManifest.files.map((item) => [item.caseId, item]));
} catch {
  // source manifest optional for new cases
}

const results = [];

for (const dir of ALL_CASES) {
  const base = join(casesRoot, dir);
  const errors = [];
  const warnings = [];

  // --- Required files ---
  const specPath = join(base, "benchmark-spec.json");
  const goldPath = join(base, "gold-project-view.json");
  const reviewPath = join(base, "review-status.json");
  const checklistPath = join(base, "review-checklist.md");
  const evidencePath = join(base, "source-evidence.md");
  const readmePath = join(base, "README.md");

  if (!existsSync(specPath)) { errors.push("missing benchmark-spec.json"); }
  if (!existsSync(goldPath)) { errors.push("missing gold-project-view.json"); }
  if (!existsSync(reviewPath)) { errors.push("missing review-status.json"); }
  if (!existsSync(checklistPath)) { errors.push("missing review-checklist.md"); }
  if (!existsSync(evidencePath)) { errors.push("missing source-evidence.md"); }
  if (!existsSync(readmePath)) { errors.push("missing README.md reviewer packet"); }

  if (existsSync(checklistPath)) {
    const checklistText = readFileSync(checklistPath, "utf8");
    if (!checklistText.includes("## Reviewer packet")) errors.push("review-checklist.md missing reviewer packet");
  }

  // --- Source manifest checks (only for PDF-import cases) ---
  if (SOURCE_MANIFEST_CASES.has(dir)) {
    const source = sourceByCase.get(dir);
    if (!source) {
      errors.push("missing source manifest entry");
    } else {
      if (!existsSync(source.sourcePdf)) errors.push("source PDF is unreadable");
      else if (sha256(source.sourcePdf) !== source.sourcePdfSha256) errors.push("source PDF SHA-256 mismatch");
      if (existsSync(source.extractedText) && sha256(source.extractedText) !== source.extractedTextSha256)
        errors.push("extracted text SHA-256 mismatch");
    }
  }

  if (errors.some(e => e.startsWith("missing benchmark-spec.json") || e.startsWith("missing gold-project-view.json"))) {
    const report = { schema: "cmath.paper-benchmark-audit/v2", benchmarkId: null, caseId: dir, status: "structural-draft", reviewStatus: null, auditedFiles: [], counts: {}, errors };
    writeFileSync(join(base, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    results.push(report);
    continue;
  }

  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const gold = JSON.parse(readFileSync(goldPath, "utf8"));
  const review = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, "utf8")) : {};

  // --- projectTitle check ---
  if (!gold.projectTitle) errors.push("gold-project-view.json missing top-level projectTitle");
  else if (gold.projectTitle !== gold.project?.title) warnings.push("projectTitle does not match project.title");

  // --- Review status checks ---
  if (!VALID_STATUSES.has(review.status)) errors.push(`invalid review status ${review.status ?? "(missing)"}`);

  if (review.status === "accepted-gold") {
    if (!review.reviewer?.name || !review.reviewer?.date) errors.push("accepted-gold requires reviewer name and date");
    if (!review.evidence?.theoremStatement || !review.evidence?.sourcePages || !review.evidence?.dependencyCorrectness || !review.evidence?.proofDirection)
      errors.push("accepted-gold requires theorem, source-page, dependency, and proof-direction evidence");
    if (review.checklist?.allPassed !== true) errors.push("accepted-gold requires checklist.allPassed=true");
  }

  if (!review.evidence?.extractedSourceText || !existsSync(review.evidence.extractedSourceText)) {
    if (review.status !== "provisional-reference" && review.status !== "needs-revision") {
      // For provisional-reference the source text might be the original PDF filename rather than an extracted file
      warnings.push("review evidence extractedSourceText is missing or unreadable (acceptable for provisional-reference/needs-revision)");
    }
  }

  // --- Duplicate entry ID check in gold ---
  const entries = gold.entries ?? [];
  const entryIdCounts = new Map();
  for (const e of entries) entryIdCounts.set(e.id, (entryIdCounts.get(e.id) ?? 0) + 1);
  for (const [id, count] of entryIdCounts) {
    if (count > 1) errors.push(`duplicate entry ID in gold: ${id} (appears ${count} times)`);
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const allIds = new Set(byId.keys());

  // --- Duplicate derived claim ID check in spec ---
  const specDerived = spec.requiredObjects?.derivedClaims ?? [];
  const specDerivedIdCounts = new Map();
  for (const e of specDerived) specDerivedIdCounts.set(e.id, (specDerivedIdCounts.get(e.id) ?? 0) + 1);
  for (const [id, count] of specDerivedIdCounts) {
    if (count > 1) errors.push(`duplicate derivedClaim ID in benchmark-spec: ${id} (appears ${count} times)`);
  }

  // --- Required object checks ---
  const required = [
    ...(spec.requiredObjects?.facts ?? []),
    ...(spec.requiredObjects?.b0Claims ?? []),
    ...(spec.requiredObjects?.derivedClaims ?? []),
  ];
  for (const expected of required) {
    const actual = byId.get(expected.id);
    if (!actual) { errors.push(`missing entry ${expected.id}`); continue; }
    for (const key of ["entryClass", "factKind", "claimKind"]) {
      if (expected[key] && actual[key] !== expected[key]) errors.push(`${expected.id}: ${key}=${actual[key]} expected ${expected[key]}`);
    }
    if (expected.mustHaveSourceReference && !actual.sourceReference) errors.push(`${expected.id}: missing sourceReference`);
  }

  // --- B0 set integrity ---
  const b0 = new Set(gold.b0ClaimEntryIds ?? []);
  for (const expected of spec.requiredObjects?.b0Claims ?? []) {
    if (!b0.has(expected.id)) errors.push(`B0 missing ${expected.id}`);
  }
  const expectedB0 = new Set(spec.boundaryB0Invariants?.exactB0ClaimIds ?? []);
  if (expectedB0.size > 0) {
    if (b0.size !== expectedB0.size || [...b0].some((id) => !expectedB0.has(id)))
      errors.push("B0 set does not exactly match boundaryB0Invariants.exactB0ClaimIds");
  }
  for (const id of b0) {
    if (!allIds.has(id)) errors.push(`B0 references missing entry ${id}`);
    else if (!byId.get(id).sourceReference) errors.push(`${id}: B0 claim missing sourceReference`);
  }

  // --- mainTargetEntryId ---
  if (gold.mainTargetEntryId !== spec.targetPaper?.mainTargetEntryId)
    errors.push("mainTargetEntryId mismatch between gold and spec");
  if (gold.mainTargetEntryId && !allIds.has(gold.mainTargetEntryId))
    errors.push(`mainTargetEntryId ${gold.mainTargetEntryId} does not resolve to an existing entry`);

  // --- Inference validity ---
  const inferences = gold.inferences ?? [];
  const inferenceIdCounts = new Map();
  for (const inf of inferences) inferenceIdCounts.set(inf.id, (inferenceIdCounts.get(inf.id) ?? 0) + 1);
  for (const [id, count] of inferenceIdCounts) {
    if (count > 1) errors.push(`duplicate inference ID in gold: ${id} (appears ${count} times)`);
  }
  const inferenceById = new Map(inferences.map((inf) => [inf.id, inf]));

  for (const expected of spec.requiredObjects?.proofInferences ?? []) {
    const actual = inferenceById.get(expected.id);
    if (!actual) { errors.push("missing inference " + expected.id); continue; }
    if (actual.operationKind !== expected.operationKind) errors.push(expected.id + ": operationKind mismatch (got " + actual.operationKind + " expected " + expected.operationKind + ")");
    if (actual.conclusion !== expected.conclusion) errors.push(expected.id + ": conclusion mismatch");
    if (actual.sourcePath !== expected.sourcePath) errors.push(expected.id + ": sourcePath mismatch");
    const actualPremises = new Set(actual.premises ?? []);
    const expectedPremises = new Set(expected.requiredPremises ?? []);
    if (actualPremises.size !== expectedPremises.size || [...expectedPremises].some((id) => !actualPremises.has(id)))
      errors.push(expected.id + ": premises mismatch");
    for (const id of actual.premises ?? []) {
      if (!allIds.has(id)) errors.push(expected.id + ": premise references missing entry " + id);
    }
    if (!actual.conclusion || !allIds.has(actual.conclusion)) errors.push(expected.id + ": conclusion references missing entry");
    if (actual.conclusion && (actual.premises ?? []).includes(actual.conclusion)) errors.push(expected.id + ": self-dependency");
  }

  for (const expected of spec.requiredObjects?.organizationInferences ?? []) {
    const actual = inferenceById.get(expected.id);
    if (!actual) { errors.push("missing inference " + expected.id); continue; }
    if (actual.operationKind !== "organization") errors.push(expected.id + ": operationKind mismatch");
    if (actual.conclusion !== expected.conclusion) errors.push(expected.id + ": conclusion mismatch");
    const actualPremises = new Set(actual.premises ?? []);
    const expectedPremises = new Set(expected.requiredPremises ?? []);
    if (actualPremises.size !== expectedPremises.size || [...expectedPremises].some((id) => !actualPremises.has(id)))
      errors.push(expected.id + ": premises mismatch");
  }

  // Check all inferences in gold for validity
  for (const inf of inferences) {
    for (const id of inf.premises ?? []) {
      if (!allIds.has(id)) errors.push(`inference ${inf.id}: premise ${id} does not resolve to an entry`);
    }
    if (inf.conclusion && !allIds.has(inf.conclusion)) errors.push(`inference ${inf.id}: conclusion ${inf.conclusion} does not resolve to an entry`);
    if (inf.conclusion && (inf.premises ?? []).includes(inf.conclusion)) errors.push(`inference ${inf.id}: self-dependency`);
    // Check invalid operationKind
    const validOpKinds = new Set(["proof", "organization"]);
    if (!validOpKinds.has(inf.operationKind)) errors.push(`inference ${inf.id}: invalid operationKind '${inf.operationKind}' (must be proof|organization)`);
  }

  // --- Proof DAG cycle detection (claim dependency graph) ---
  const proofInferences = inferences.filter((inf) => inf.operationKind === "proof");
  const claimDeps = new Map();
  for (const inf of proofInferences) {
    if (!inf.conclusion) continue;
    const deps = claimDeps.get(inf.conclusion) ?? new Set();
    for (const p of inf.premises ?? []) {
      if (allIds.has(p)) deps.add(p);
    }
    claimDeps.set(inf.conclusion, deps);
  }
  const visiting = new Set(), visited = new Set();
  const cyclePath = [];
  let detectedCycle = null;
  const hasCycle = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    cyclePath.push(id);
    for (const dep of claimDeps.get(id) ?? []) {
      if (visiting.has(dep)) {
        const start = cyclePath.indexOf(dep);
        detectedCycle = [...cyclePath.slice(start), dep].join(" -> ");
        return true;
      }
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      }
    }
    cyclePath.pop();
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of claimDeps.keys()) {
    if (!visited.has(id)) {
      if (hasCycle(id)) {
        errors.push(`proof inference graph contains a cycle: ${detectedCycle}`);
        break;
      }
    }
  }

  // --- Derived claims must have proofs ---
  const proofTargets = new Set(proofInferences.map((inf) => inf.conclusion));
  for (const expected of spec.requiredObjects?.derivedClaims ?? []) {
    if (!proofTargets.has(expected.id) && !b0.has(expected.id))
      errors.push(`derived claim ${expected.id} has no proof inference and is not in B0`);
  }

  // --- Real closure computation via semantics ---
  let closureResult = null;
  try {
    closureResult = semantics.computeClaimClosure(entries, inferences, { b0ClaimEntryIds: [...b0] });
  } catch (err) {
    errors.push(`closure computation failed: ${err.message}`);
  }

  // --- Closure count validation ---
  const closureCounts = spec.closureInvariants?.expectedCounts;
  if (closureCounts) {
    const factCount = entries.filter((e) => e.entryClass === "fact").length;
    const b0Count = b0.size;
    const derivedCount = entries.filter((e) => e.entryClass === "claim" && !b0.has(e.id)).length;
    const actualEstablished = new Set(closureResult?.establishedClaimIds ?? []);
    const actualOpen = Object.entries(closureResult?.claimStates ?? {}).filter(([, s]) => s === "open").map(([id]) => id);

    const checks = [
      ["facts", factCount],
      ["b0Claims", b0Count],
      ["c0Total", factCount + b0Count],
      ["derivedClaims", derivedCount],
      ["totalEntries", entries.length],
      ["totalInferences", inferences.length],
      ["proofInferences", inferences.filter((inf) => inf.operationKind === "proof").length],
      ["organizationInferences", inferences.filter((inf) => inf.operationKind === "organization").length],
      ["establishedClaims", actualEstablished.size],
      ["openClaims", actualOpen.length],
    ];
    for (const [key, actual] of checks) {
      if (closureCounts[key] !== undefined && closureCounts[key] !== actual)
        errors.push(`closure count ${key}=${actual} expected ${closureCounts[key]}`);
    }
    const expectedEstablished = new Set(spec.closureInvariants.expectedEstablishedClaimIds ?? []);
    if (expectedEstablished.size > 0) {
      if (expectedEstablished.size !== actualEstablished.size || [...expectedEstablished].some((id) => !actualEstablished.has(id)))
        errors.push("closure established claim set mismatch");
    }
  }

  // --- Source-attribution errors (hard gate for needs-revision) ---
  const sourceAttributionErrors = [];
  for (const inf of inferences) {
    const concluded = byId.get(inf.conclusion);
    if (concluded && inf.operationKind === "proof") {
      // Check if the concluded claim is actually an external result cited in the paper
      // (sourceReference containing "外部结果" or "非本文自证" is a signal)
      if (concluded.sourceReference && (
        concluded.sourceReference.includes("外部结果") ||
        concluded.sourceReference.includes("非本文自证")
      )) {
        sourceAttributionErrors.push(
          `inference ${inf.id} proves ${inf.conclusion} but the claim is marked as an external result — must be B0 or removed`
        );
      }
    }
  }
  errors.push(...sourceAttributionErrors);

  // --- Determine final status ---
  const effectiveStatus = errors.length > 0 ? "structural-draft" : review.status;
  const isScoringEligible = SCORING_ELIGIBLE_STATUSES.has(review.status) && errors.length === 0;

  const report = {
    schema: "cmath.paper-benchmark-audit/v2",
    benchmarkId: spec.benchmarkId,
    caseId: dir,
    status: effectiveStatus,
    reviewStatus: review.status,
    scoringEligible: isScoringEligible,
    auditedFiles: ["benchmark-spec.json", "gold-project-view.json", "source-evidence.md", "review-status.json", "review-checklist.md"],
    counts: {
      requiredEntries: required.length,
      entries: entries.length,
      inferences: inferences.length,
    },
    errors,
    warnings,
  };
  writeFileSync(join(base, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  results.push(report);
}

const failed = results.filter((r) => r.errors.length > 0);
const byStatus = {};
for (const r of results) {
  byStatus[r.reviewStatus ?? "unknown"] = (byStatus[r.reviewStatus ?? "unknown"] ?? 0) + 1;
}
console.log(JSON.stringify({
  cases: results.length,
  statusCounts: byStatus,
  structuralErrors: failed.length,
  scoringEligible: results.filter((r) => r.scoringEligible).length,
  reports: results.map(({ caseId, status, reviewStatus, scoringEligible, errors, warnings }) => ({
    caseId, status, reviewStatus, scoringEligible, errors, warnings,
  })),
}, null, 2));
if (failed.length) process.exitCode = 1;
