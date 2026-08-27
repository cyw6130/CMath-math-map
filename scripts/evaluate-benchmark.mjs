#!/usr/bin/env node
/**
 * evaluate-benchmark.mjs — Unified benchmark evaluator
 *
 * Produces deterministic format + semantic scores for a candidate project view
 * against a canonical benchmark reference.
 *
 * Usage:
 *   node scripts/evaluate-benchmark.mjs --case <caseId> --candidate <output.json>
 *   node scripts/evaluate-benchmark.mjs --case hopf-degree-theorem --self-compare
 *   node scripts/evaluate-benchmark.mjs --all-outputs           # evaluate all stored model outputs
 *   node scripts/evaluate-benchmark.mjs --report                # generate full qualification report
 *
 * Exit code: 0 always (scoring is informational). Errors print to stderr.
 *
 * Machine-readable output schema (JSON to stdout):
 * {
 *   caseId, referenceStatus, candidateFile?,
 *   formatScore, semanticScore, overallScore,
 *   eligibleForComparison,
 *   matchedEntries, missingEntries, extraEntries,
 *   b0Errors, proofEdgeErrors, sourceAttributionErrors,
 *   formatComponents: { normalization, entryValidity, inferenceValidity, b0Boundary, closureDAG },
 *   semanticComponents: { objectCoverage, b0Similarity, mainGoal, proofEdges, closureStates, sourceAttribution },
 *   openClaims, notes
 * }
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import paperImportClient from "../paper-import-client.js";
import semantics from "../math-map-semantics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const casesRoot = path.join(root, "benchmarks/paper-import/cases");
const modelOutputsDir = path.join(root, "benchmarks/model-outputs");
const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/source-manifest.json"), "utf8"));
const ACTIVE_CASES = sourceManifest.activeCases.map((item) => item.caseId);

// ---------------------------------------------------------------------------
// Case registry — maps output filenames to case IDs
// ---------------------------------------------------------------------------
const OUTPUT_CASE_MAP = {
  "output-hopf map-deepseek-v4-flash.json": "hopf-degree-theorem",
  "output-hopf map-deepseek-v4-pro.json": "hopf-degree-theorem",
  "output-1912.08783v2-deepseek-v4-flash.json": null, // unrelated small-quantum-group paper; never score as Knot–Hopf–RT
  "output-4-DIMENSIONAL SKEIN MODULES, HANDLE ATTACHMENTS, AND TANGLES-deepseek-v4-flash.json": "4-dim-skein-modules-handles-tangles",
  "output-CORNERED SKEIN LASAGNA THEORY-deepseek-v4-flash.json": "cornered-skein-lasagna-theory",
  "output-gauge_notes-deepseek-v4-flash.json": null, // unknown case
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadSpec(caseId) {
  const p = path.join(casesRoot, caseId, "benchmark-spec.json");
  if (!fs.existsSync(p)) throw new Error(`No benchmark-spec.json for case ${caseId}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadGold(caseId) {
  const p = path.join(casesRoot, caseId, "gold-project-view.json");
  if (!fs.existsSync(p)) throw new Error(`No gold-project-view.json for case ${caseId}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadReviewStatus(caseId) {
  const p = path.join(casesRoot, caseId, "review-status.json");
  if (!fs.existsSync(p)) return { status: "unknown" };
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/**
 * Extract project view from either a raw model output (has .view) or a direct project view.
 */
function extractView(raw) {
  if (raw.view) return raw.view;
  if (raw.entries !== undefined || raw.schema?.includes("project-view")) return raw;
  throw new Error("Cannot extract project view from candidate — expected .view or direct project-view schema");
}

/**
 * Normalize a candidate view using paperImportClient if possible.
 */
function normalizeCandidate(candidateView, spec) {
  const repairs = [];
  const preparedView = structuredClone(candidateView);
  if (!preparedView.projectTitle && typeof preparedView.project?.title === "string" && preparedView.project.title.trim()) {
    preparedView.projectTitle = preparedView.project.title.trim();
    repairs.push({ code: "projectTitle-from-project.title", formatPenalty: 5 });
  }
  try {
    const rawIssues = paperImportClient.collectRawProjectViewIssues(preparedView, {
      includeOpenClaimIssues: false,
    });
    if (rawIssues && rawIssues.length > 0) {
      return {
        view: null,
        normalizeError: rawIssues.join("; "),
        repairs,
      };
    }
    return {
      view: paperImportClient.paperProjectView(preparedView, {
        fileName: spec.targetPaper?.sourcePdf ?? "",
        requireB0Classification: true,
      }),
      normalizeError: null,
      repairs,
    };
  } catch (err) {
    return { view: null, normalizeError: err.message, repairs };
  }
}

/**
 * Concept-level entry matching: find a candidate entry semantically equivalent to a reference entry.
 * Matches by: exact ID > short title keyword > statement keyword.
 */
function findConceptMatch(candidateEntries, refEntry) {
  // Exact ID
  const exact = candidateEntries.find((e) => e.id === refEntry.id);
  if (exact) return exact;
  // Short title keywords
  const kws = [refEntry.shortTitle, refEntry.title].filter(Boolean).flatMap((t) => t.split(/[，,·\s]+/).filter((w) => w.length > 1));
  return candidateEntries.find((ce) => kws.some((kw) => (ce.shortTitle ?? "").includes(kw) || (ce.title ?? "").includes(kw)));
}

// ---------------------------------------------------------------------------
// Format Scoring (0..100)
// ---------------------------------------------------------------------------
function scoreFormat(normalizedView, normalizeError, spec, repairs = []) {
  // Component weights: normalization 25, entry validity 20, inference validity 20, b0 boundary 15, closure/DAG 20
  const components = { normalization: 0, entryValidity: 0, inferenceValidity: 0, b0Boundary: 0, closureDAG: 0 };
  const b0Errors = [];
  const proofEdgeErrors = [];
  const sourceAttributionErrors = [];

  if (normalizeError) {
    // Hard gate: cannot normalize → cap at 49
    return { formatScore: Math.min(49, 20), components, b0Errors: [normalizeError], proofEdgeErrors, sourceAttributionErrors, eligibleForComparison: false };
  }

  // 1. Normalization (25 pts)
  const repairPenalty = repairs.reduce((sum, repair) => sum + (repair.formatPenalty ?? 0), 0);
  components.normalization = Math.max(0, 25 - repairPenalty);

  const entries = normalizedView.entries ?? [];
  const inferences = normalizedView.inferences ?? [];
  const b0Set = new Set(normalizedView.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? []);
  const byId = new Map(entries.map((e) => [e.id, e]));

  // 2. Entry validity (20 pts) — check entryClass, factKind/claimKind, sourcePath present
  let entryIssues = 0;
  for (const e of entries) {
    if (!["fact", "claim"].includes(e.entryClass)) entryIssues++;
    else if (e.entryClass === "fact" && !["definition", "algorithm", "calculation"].includes(e.factKind)) entryIssues++;
    else if (e.entryClass === "claim" && !["theorem", "lemma", "proposition", "corollary"].includes(e.claimKind)) entryIssues++;
    if (!e.sourcePath || !/#page=\d+|#\d|#/.test(e.sourcePath)) entryIssues++;
  }
  components.entryValidity = entries.length > 0 ? Math.round(20 * Math.max(0, 1 - entryIssues / (entries.length * 2))) : 0;

  // 3. Inference validity (20 pts) — check operationKind, premises/conclusion resolve
  let inferenceIssues = 0;
  for (const inf of inferences) {
    if (!["proof", "organization"].includes(inf.operationKind)) inferenceIssues++;
    if (!inf.conclusion || !byId.has(inf.conclusion)) inferenceIssues++;
    for (const p of inf.premises ?? []) if (!byId.has(p)) inferenceIssues++;
    if (inf.conclusion && (inf.premises ?? []).includes(inf.conclusion)) {
      proofEdgeErrors.push(`self-dependency on ${inf.id}`);
      inferenceIssues++;
    }
  }
  const requiredProofCount = (spec.requiredObjects?.proofInferences ?? []).length;
  components.inferenceValidity = inferences.length > 0
    ? Math.round(20 * Math.max(0, 1 - inferenceIssues / (inferences.length * 2)))
    : (requiredProofCount === 0 ? 20 : 10);

  // 4. B0 boundary validity (15 pts)
  let b0Issues = 0;
  const specB0 = new Set(spec.boundaryB0Invariants?.exactB0ClaimIds ?? []);
  for (const id of b0Set) {
    const entry = byId.get(id);
    if (!entry) { b0Errors.push(`B0 id ${id} not in entries`); b0Issues++; }
    else if (!entry.sourceReference) { b0Errors.push(`B0 entry ${id} missing sourceReference`); b0Issues++; }
    if (entry?.entryClass !== "claim") { b0Errors.push(`B0 entry ${id} is not a claim`); b0Issues++; }
  }
  // Check source-attribution errors: B0 claims should not be derived (proof conclusions)
  const proofConclusions = new Set(inferences.filter((i) => i.operationKind === "proof").map((i) => i.conclusion));
  for (const id of b0Set) {
    if (proofConclusions.has(id)) {
      sourceAttributionErrors.push(`B0 entry ${id} has a proof inference — B0 claims must not be locally proved`);
      b0Issues++;
    }
  }
  // Check external results aren't proved locally (claims with "外部结果" in sourceReference)
  for (const inf of inferences) {
    if (inf.operationKind !== "proof") continue;
    const concluded = byId.get(inf.conclusion);
    if (concluded?.sourceReference && (concluded.sourceReference.includes("外部结果") || concluded.sourceReference.includes("非本文自证"))) {
      sourceAttributionErrors.push(`inference ${inf.id} proves an external result ${inf.conclusion} — source attribution error`);
      b0Issues++;
    }
  }
  components.b0Boundary = b0Issues === 0 ? 15 : Math.max(0, 15 - b0Issues * 3);

  // 5. Closure/DAG (20 pts)
  let dagIssues = 0;
  // Cycle detection via claim dependency graph
  const proofInfs = inferences.filter((i) => i.operationKind === "proof");
  const claimDeps = new Map();
  for (const inf of proofInfs) {
    if (!inf.conclusion) continue;
    const deps = claimDeps.get(inf.conclusion) ?? new Set();
    for (const p of inf.premises ?? []) {
      if (byId.has(p)) deps.add(p);
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
        proofEdgeErrors.push(`proof DAG contains a cycle: ${detectedCycle}`);
        dagIssues += 5;
        break;
      }
    }
  }
  // Gold-object coverage belongs to semantic scoring. Format scoring only
  // checks whether the candidate's own graph is internally executable;
  // equivalent mathematical entries are not required to reuse gold IDs.
  components.closureDAG = Math.max(0, 20 - dagIssues * 4);

  const formatScore = Object.values(components).reduce((a, b) => a + b, 0);
  const eligibleForComparison = !normalizeError && sourceAttributionErrors.length === 0;
  return { formatScore, components, b0Errors, proofEdgeErrors, sourceAttributionErrors, eligibleForComparison };
}

// ---------------------------------------------------------------------------
// Semantic Scoring (0..100) — compare against reference
// ---------------------------------------------------------------------------
function scoreSemantics(candidateView, referenceGold, spec) {
  // Component weights: object coverage 30, b0 similarity 20, main goal 10, proof edges 25, closure states 10, source attribution 5
  const refEntries = referenceGold.entries ?? [];
  const refInferences = referenceGold.inferences ?? [];
  const refB0 = new Set(referenceGold.b0ClaimEntryIds ?? []);
  const refById = new Map(refEntries.map((e) => [e.id, e]));
  const refProofInfs = refInferences.filter((i) => i.operationKind === "proof");

  const candEntries = candidateView.entries ?? [];
  const candInferences = candidateView.inferences ?? [];
  const candB0 = new Set(candidateView.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? []);
  const candById = new Map(candEntries.map((e) => [e.id, e]));
  const candProofInfs = candInferences.filter((i) => i.operationKind === "proof");

  const matchedEntries = [];
  const missingEntries = [];

  // 1. Object/claim coverage (30 pts)
  const allRefObjects = [
    ...(spec.requiredObjects?.facts ?? []),
    ...(spec.requiredObjects?.b0Claims ?? []),
    ...(spec.requiredObjects?.derivedClaims ?? []),
  ];
  let matched = 0;
  for (const req of allRefObjects) {
    const refEntry = refById.get(req.id) ?? req;
    const candMatch = findConceptMatch(candEntries, refEntry);
    if (candMatch) {
      matched++;
      matchedEntries.push({ refId: req.id, candId: candMatch.id });
    } else {
      missingEntries.push(req.id);
    }
  }
  const objectCoverage = allRefObjects.length > 0 ? Math.round(30 * matched / allRefObjects.length) : 0;

  // 2. B0 boundary similarity (20 pts) — Jaccard on matched B0 claims
  const refB0List = [...refB0];
  const refB0Matched = refB0List.filter((id) => {
    const refE = refById.get(id);
    return refE ? !!findConceptMatch(candEntries.filter((e) => candB0.has(e.id)), refE) : false;
  });
  const b0Similarity = refB0List.length > 0 ? Math.round(20 * refB0Matched.length / refB0List.length) : 20;

  // 3. Main goal identification (10 pts)
  const candMainId = candidateView.mainTargetEntryId ?? candidateView.derivedResearchState?.researchOverlay?.loopTargetEntryId;
  const candMainEntry = candById.get(candMainId);
  const refMainId = referenceGold.mainTargetEntryId;
  const refMainEntry = refById.get(refMainId);
  let mainGoal = 0;
  if (candMainEntry && refMainEntry) {
    const match = findConceptMatch([candMainEntry], refMainEntry);
    mainGoal = match ? 10 : 0;
  }

  // 4. Proof dependency edge similarity (25 pts)
  // Match ref proof edges to candidate proof edges by concept-matching premises and conclusions
  const matchPremSet = (refPrms, candEntry) => {
    // For each ref premise, find a conceptual match in candidate
    const candInf = candProofInfs.find((ci) => {
      const ciConclusion = candById.get(ci.conclusion);
      if (!ciConclusion || !findConceptMatch([ciConclusion], candEntry)) return false;
      const ciPremCount = (ci.premises ?? []).length;
      if (ciPremCount < refPrms.length * 0.5) return false;
      let matchCount = 0;
      for (const refPrm of refPrms) {
        const refPrmEntry = refById.get(refPrm);
        if (!refPrmEntry) continue;
        if ((ci.premises ?? []).some((cp) => findConceptMatch([candById.get(cp)].filter(Boolean), refPrmEntry))) matchCount++;
      }
      return matchCount >= Math.ceil(refPrms.length * 0.5);
    });
    return !!candInf;
  };

  let proofEdgeMatched = 0;
  for (const refInf of refProofInfs) {
    const refConcluded = refById.get(refInf.conclusion);
    if (!refConcluded) continue;
    if (matchPremSet(refInf.premises ?? [], refConcluded)) proofEdgeMatched++;
  }
  const proofEdges = refProofInfs.length > 0 ? Math.round(25 * proofEdgeMatched / refProofInfs.length) : 25;

  // 5. Closure/claim state similarity (10 pts)
  const refClosure = semantics.computeClaimClosure(refEntries, refInferences, { b0ClaimEntryIds: [...refB0] });
  const candClosure = semantics.computeClaimClosure(candEntries, candInferences, { b0ClaimEntryIds: [...candB0] });
  const refEstablished = new Set(Object.entries(refClosure.claimStates ?? {}).filter(([, v]) => v === "established").map(([k]) => k));
  const candEstablished = new Set(Object.entries(candClosure.claimStates ?? {}).filter(([, v]) => v === "established").map(([k]) => k));
  // Count how many ref established claims have a concept match in candidate established
  let closureMatched = 0;
  for (const refId of refEstablished) {
    const refE = refById.get(refId);
    if (!refE) continue;
    if (findConceptMatch(candEntries.filter((e) => candEstablished.has(e.id)), refE)) closureMatched++;
  }
  const closureStates = refEstablished.size > 0 ? Math.round(10 * closureMatched / refEstablished.size) : 0;

  // 6. Source page/attribution similarity (5 pts)
  // Supports both PDF (#page=N) and Markdown anchor (#section-id) formats
  let sourceMatched = 0;
  for (const req of allRefObjects) {
    const refE = refById.get(req.id);
    if (!refE?.sourcePath) continue;
    const candMatch = findConceptMatch(candEntries, refE);
    if (candMatch?.sourcePath) {
      // PDF case: compare page numbers (allow ±1 tolerance)
      const refPage = /page=(\d+)/.exec(refE.sourcePath)?.[1];
      const candPage = /page=(\d+)/.exec(candMatch.sourcePath)?.[1];
      if (refPage && candPage) {
        if (Math.abs(parseInt(refPage) - parseInt(candPage)) <= 1) sourceMatched++;
        continue;
      }
      // Markdown anchor case: exact sourcePath match or same base file
      const refBase = refE.sourcePath.replace(/#.*$/, "");
      const candBase = candMatch.sourcePath.replace(/#.*$/, "");
      if (refE.sourcePath === candMatch.sourcePath) {
        sourceMatched++;
      } else if (refBase === candBase) {
        // Same file, different anchor — partial credit
        sourceMatched += 0.5;
      }
    }
  }
  const sourceAttribution = allRefObjects.length > 0 ? Math.round(5 * sourceMatched / allRefObjects.length) : 0;

  const semanticScore = objectCoverage + b0Similarity + mainGoal + proofEdges + closureStates + sourceAttribution;
  return {
    semanticScore,
    components: { objectCoverage, b0Similarity, mainGoal, proofEdges, closureStates, sourceAttribution },
    matchedEntries,
    missingEntries,
    extraEntries: candEntries.filter((e) => !matchedEntries.some((m) => m.candId === e.id)).map((e) => e.id),
  };
}

// ---------------------------------------------------------------------------
// Evaluate a single candidate against a case
// ---------------------------------------------------------------------------
function evaluateCase(caseId, candidateRaw, candidateFile) {
  const spec = loadSpec(caseId);
  const gold = loadGold(caseId);
  const reviewStatus = loadReviewStatus(caseId);

  // Model outputs (never gold). Extract view.
  let rawView;
  try {
    rawView = extractView(candidateRaw);
  } catch (err) {
    return { caseId, candidateFile, referenceStatus: reviewStatus.status, error: err.message, eligibleForComparison: false, formatScore: 0, semanticScore: 0, overallScore: 0, formatComponents: {}, semanticComponents: {}, matchedEntries: [], missingEntries: [], b0Errors: [err.message], proofEdgeErrors: [], sourceAttributionErrors: [] };
  }

  // Normalize
  const { view: normalizedView, normalizeError, repairs = [] } = normalizeCandidate(rawView, spec);

  // Format scoring
  const formatResult = scoreFormat(normalizedView ?? rawView, normalizeError, spec, repairs);

  // Hard gate
  if (!formatResult.eligibleForComparison || formatResult.formatScore <= 49 || formatResult.sourceAttributionErrors.length > 0) {
    const fs_capped = Math.min(49, formatResult.formatScore);
    const notes = repairs.map((repair) => `Mechanical repair: ${repair.code} (-${repair.formatPenalty ?? 0} format points)`);
    if (normalizeError) notes.push(`Hard gate: ${normalizeError}`);
    if (formatResult.sourceAttributionErrors.length > 0) notes.push(`Hard gate: source attribution failure — ${formatResult.sourceAttributionErrors.join("; ")}`);
    if (formatResult.formatScore <= 49 && !normalizeError && formatResult.sourceAttributionErrors.length === 0) notes.push("Hard gate: format score ≤ 49");

    return {
      caseId, candidateFile, referenceStatus: reviewStatus.status,
      formatScore: fs_capped, semanticScore: 0, overallScore: Math.round(10 * (fs_capped * 0.4)) / 10,
      eligibleForComparison: false,
      formatComponents: formatResult.components, semanticComponents: {},
      matchedEntries: [], missingEntries: [], b0Errors: formatResult.b0Errors,
      proofEdgeErrors: formatResult.proofEdgeErrors, sourceAttributionErrors: formatResult.sourceAttributionErrors,
      openClaims: [], notes,
    };
  }

  // Semantic scoring — only possible if reference is eligible
  let semanticResult = { semanticScore: 0, components: {}, matchedEntries: [], missingEntries: [], extraEntries: [] };
  const notes = repairs.map((repair) => `Mechanical repair: ${repair.code} (-${repair.formatPenalty ?? 0} format points)`);

  if (reviewStatus.status === "needs-revision") {
    notes.push("Reference is needs-revision — semantic scoring skipped (not eligible as scoring authority)");
    return {
      caseId, candidateFile, referenceStatus: reviewStatus.status,
      formatScore: formatResult.formatScore,
      semanticScore: 0,
      overallScore: Math.min(49, Math.round(10 * (formatResult.formatScore * 0.4)) / 10),
      eligibleForComparison: false,
      formatComponents: formatResult.components,
      semanticComponents: {},
      matchedEntries: [], missingEntries: [],
      b0Errors: formatResult.b0Errors,
      proofEdgeErrors: formatResult.proofEdgeErrors,
      sourceAttributionErrors: formatResult.sourceAttributionErrors,
      openClaims: [],
      notes,
    };
  }

  semanticResult = scoreSemantics(normalizedView ?? rawView, gold, spec);

  const closureData = (() => {
    try {
      const v = normalizedView ?? rawView;
      const b0 = v.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [];
      const closure = semantics.computeClaimClosure(v.entries ?? [], v.inferences ?? [], { b0ClaimEntryIds: b0 });
      return (v.entries ?? []).filter((e) => e.entryClass === "claim" && closure.claimStates[e.id] !== "established").map((e) => e.id);
    } catch { return []; }
  })();

  if (reviewStatus.status === "provisional-reference") {
    notes.push("Reference is provisional-reference — scoring valid but reference is not yet accepted-gold");
  }

  const formatScore = formatResult.formatScore;
  const semanticScore = semanticResult.semanticScore;
  const overallScore = Math.round(10 * (0.4 * formatScore + 0.6 * semanticScore)) / 10;

  return {
    caseId, candidateFile, referenceStatus: reviewStatus.status,
    formatScore, semanticScore, overallScore,
    eligibleForComparison: true,
    formatComponents: formatResult.components,
    semanticComponents: semanticResult.components,
    matchedEntries: semanticResult.matchedEntries,
    missingEntries: semanticResult.missingEntries,
    b0Errors: formatResult.b0Errors,
    proofEdgeErrors: formatResult.proofEdgeErrors,
    sourceAttributionErrors: formatResult.sourceAttributionErrors,
    openClaims: closureData,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Self-comparison (reference vs. itself — should score near 100)
// ---------------------------------------------------------------------------
function selfCompare(caseId) {
  const gold = loadGold(caseId);
  return evaluateCase(caseId, gold, `<self:${caseId}>`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

if (args.includes("--report")) {
  // Full qualification/evaluation report
  const report = { generatedAt: new Date().toISOString(), caseStatuses: {}, modelOutputScores: [], selfCompareScores: [] };

  for (const c of ACTIVE_CASES) {
    const rs = loadReviewStatus(c);
    report.caseStatuses[c] = rs.status;
  }

  // Self-compare for scoring-eligible cases
  for (const c of ACTIVE_CASES) {
    const rs = loadReviewStatus(c);
    if (rs.status !== "needs-revision") {
      const r = selfCompare(c);
      report.selfCompareScores.push({ caseId: c, formatScore: r.formatScore, semanticScore: r.semanticScore, overallScore: r.overallScore });
    }
  }

  // Evaluate all stored model outputs
  const outputFiles = fs.readdirSync(modelOutputsDir).filter((f) => f.endsWith("-deepseek-v4-flash.json"));
  for (const file of outputFiles) {
    const caseId = OUTPUT_CASE_MAP[file];
    if (!caseId) {
      report.modelOutputScores.push({ file, caseId: null, note: "case mapping unknown — skipped" });
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(path.join(modelOutputsDir, file), "utf8"));
    const result = evaluateCase(caseId, raw, file);
    report.modelOutputScores.push({ file, caseId, formatScore: result.formatScore, semanticScore: result.semanticScore, overallScore: result.overallScore, eligibleForComparison: result.eligibleForComparison, referenceStatus: result.referenceStatus, b0Errors: result.b0Errors.length, proofEdgeErrors: result.proofEdgeErrors.length, sourceAttributionErrors: result.sourceAttributionErrors.length, missingEntries: result.missingEntries.length, notes: result.notes });
  }

  printResult(report);
} else if (args.includes("--all-outputs")) {
  const outputFiles = fs.readdirSync(modelOutputsDir).filter((f) => f.endsWith("-deepseek-v4-flash.json"));
  const results = [];
  for (const file of outputFiles) {
    const caseId = OUTPUT_CASE_MAP[file];
    if (!caseId) { results.push({ file, caseId: null, note: "case mapping unknown" }); continue; }
    const raw = JSON.parse(fs.readFileSync(path.join(modelOutputsDir, file), "utf8"));
    const result = evaluateCase(caseId, raw, file);
    results.push({ file, caseId, formatScore: result.formatScore, semanticScore: result.semanticScore, overallScore: result.overallScore, eligibleForComparison: result.eligibleForComparison, referenceStatus: result.referenceStatus, b0Errors: result.b0Errors, proofEdgeErrors: result.proofEdgeErrors, missingEntries: result.missingEntries, notes: result.notes });
  }
  printResult(results);
} else if (args.includes("--self-compare")) {
  const caseIdx = args.indexOf("--case");
  const caseId = caseIdx >= 0 ? args[caseIdx + 1] : null;
  if (!caseId) {
    // Self-compare all eligible cases
    printResult(ACTIVE_CASES.map(selfCompare));
  } else {
    printResult(selfCompare(caseId));
  }
} else {
  const caseIdx = args.indexOf("--case");
  const candidateIdx = args.indexOf("--candidate");
  const caseId = caseIdx >= 0 ? args[caseIdx + 1] : null;
  const candidateFile = candidateIdx >= 0 ? args[candidateIdx + 1] : null;

  if (!caseId || !candidateFile) {
    console.error("Usage:");
    console.error("  node scripts/evaluate-benchmark.mjs --case <caseId> --candidate <output.json>");
    console.error("  node scripts/evaluate-benchmark.mjs --case <caseId> --self-compare");
    console.error("  node scripts/evaluate-benchmark.mjs --all-outputs");
    console.error("  node scripts/evaluate-benchmark.mjs --report");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(candidateFile, "utf8"));
  const result = evaluateCase(caseId, raw, candidateFile);
  printResult(result);
}
