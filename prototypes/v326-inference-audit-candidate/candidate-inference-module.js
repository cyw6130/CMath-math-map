/**
 * Prototype Candidate for V3.26 Inference Module Audit.
 * 
 * Scope: Minimal, testable, inference-only repair logic without touching
 * production files or live model calls.
 * 
 * Contract conformance:
 * - Input: cmath.paper-entry-artifact/v1 (stamped by Entry module)
 * - Output: cmath.paper-inference-artifact/v1 (consumed by Format module & downstreams)
 */
"use strict";

const ENTRY_ARTIFACT_SCHEMA = "cmath.paper-entry-artifact/v1";
const INFERENCE_ARTIFACT_SCHEMA = "cmath.paper-inference-artifact/v1";
const CANDIDATE_VERSION = "v3.26-inference-candidate-v1";

/**
 * Diagnostic analysis of a project view's graph structure.
 * Calculates isolated entries, connected entries, proof chains, and closure state.
 */
function analyzeInferenceGraph(view) {
  const entries = Array.isArray(view?.entries) ? view.entries : [];
  const inferences = Array.isArray(view?.inferences) ? view.inferences : [];
  const b0List = Array.isArray(view?.b0ClaimEntryIds)
    ? view.b0ClaimEntryIds
    : (Array.isArray(view?.b0) ? view.b0 : (view?.derivedResearchState?.mathematicalState?.b0ClaimEntryIds || []));
  const b0Set = new Set(b0List.filter((id) => typeof id === "string" && id.trim()));
  const mainTargetId = view?.mainTargetEntryId || view?.derivedResearchState?.researchOverlay?.loopTargetEntryId || null;

  const entryById = new Map();
  entries.forEach((e) => {
    if (e && typeof e.id === "string") entryById.set(e.id, e);
  });

  const usedAsPremise = new Set();
  const usedAsConclusion = new Set();
  const proofConclusions = new Set();
  const orgConclusions = new Set();

  inferences.forEach((inf) => {
    if (!inf || typeof inf !== "object") return;
    const conc = typeof inf.conclusion === "string" ? inf.conclusion.trim() : "";
    const op = String(inf.operationKind || inf.type || "").trim();
    if (conc) {
      usedAsConclusion.add(conc);
      if (op === "proof") proofConclusions.add(conc);
      if (op === "organization") orgConclusions.add(conc);
    }
    (Array.isArray(inf.premises) ? inf.premises : []).forEach((p) => {
      if (typeof p === "string" && p.trim()) usedAsPremise.add(p.trim());
    });
  });

  const allReferenced = new Set([...usedAsPremise, ...usedAsConclusion]);
  const isolatedEntries = entries.filter((e) => !allReferenced.has(e.id));

  const isolatedFacts = isolatedEntries.filter((e) => e.entryClass === "fact" || ["definition", "algorithm", "calculation"].includes(e.type));
  const isolatedClaims = isolatedEntries.filter((e) => e.entryClass === "claim" || ["lemma", "proposition", "theorem"].includes(e.type));
  const isolatedB0 = isolatedClaims.filter((e) => b0Set.has(e.id));
  const isolatedOpenClaims = isolatedClaims.filter((e) => !b0Set.has(e.id));

  const isMainTargetEstablished = Boolean(
    mainTargetId && (b0Set.has(mainTargetId) || proofConclusions.has(mainTargetId))
  );

  return {
    entryCount: entries.length,
    factCount: entries.filter((e) => e.entryClass === "fact" || ["definition", "algorithm", "calculation"].includes(e.type)).length,
    claimCount: entries.filter((e) => e.entryClass === "claim" || ["lemma", "proposition", "theorem"].includes(e.type)).length,
    inferenceCount: inferences.length,
    proofCount: proofConclusions.size,
    organizationCount: orgConclusions.size,
    b0Count: b0Set.size,
    mainTargetId,
    isMainTargetEstablished,
    isolatedSummary: {
      total: isolatedEntries.length,
      ratio: entries.length > 0 ? (isolatedEntries.length / entries.length) : 0,
      facts: isolatedFacts.length,
      claims: isolatedClaims.length,
      b0Claims: isolatedB0.length,
      openClaims: isolatedOpenClaims.length,
    },
    isolatedEntryIds: isolatedEntries.map((e) => e.id),
    openClaimIds: isolatedOpenClaims.map((e) => e.id),
  };
}

/**
 * Candidate Inference Prompt Refinement Specification:
 * Describes the exact prompt adjustments for the assembly step.
 */
const CANDIDATE_ASSEMBLY_PROMPT_POLICY = Object.freeze({
  version: "v3.26-inference-candidate-assembly",
  changes: Object.freeze([
    {
      ruleId: "remove-inference-cap-suggestion",
      rationale: "Removing '- Inference 总数建议在 30 条以内' prevents under-generation in multi-step theorem pipelines (e.g. Knot-Hopf-RT).",
      action: "Remove arbitrary count cap; replace with completeness requirement.",
    },
    {
      ruleId: "mainline-proof-coverage-mandate",
      rationale: "Explicitly require end-to-end proof chains connecting foundational B0/definitions through key results to the main target.",
      action: "Add mainline narrative branch preservation instruction.",
    },
    {
      ruleId: "main-target-proof-enforcement",
      rationale: "Ensure internal main targets cannot be demoted to open claims or misclassified as B0 without proof.",
      action: "Require concluding proof for mainTargetEntryId before closure.",
    },
    {
      ruleId: "strictly-zero-modification-to-entry-and-format",
      rationale: "Keep Entry extraction and Format diagnostic contracts untouched to guarantee regression safety.",
      action: "Preserve Entry schemas, parser pipelines, and Format checker unchanged.",
    }
  ])
});

/**
 * Candidate Repair Validation:
 * In the assembly repair loop, verifies if any structural gaps remain and provides
 * precise issue feedback without touching Entry or Format modules.
 */
function collectCandidateInferenceIssues(candidateView, { entryArtifact = null } = {}) {
  const issues = [];
  const entries = Array.isArray(candidateView?.entries) ? candidateView.entries : [];
  const inferences = Array.isArray(candidateView?.inferences) ? candidateView.inferences : [];
  const b0List = Array.isArray(candidateView?.b0ClaimEntryIds)
    ? candidateView.b0ClaimEntryIds
    : (Array.isArray(candidateView?.b0) ? candidateView.b0 : []);
  const b0Set = new Set(b0List);
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  const mainTargetId = candidateView?.mainTargetEntryId;
  if (!mainTargetId || !entryMap.has(mainTargetId)) {
    issues.push("mainTargetEntryId 必须指向有效的 Entry 条目");
  } else {
    const mainTargetEntry = entryMap.get(mainTargetId);
    if (mainTargetEntry?.entryClass !== "claim" && !["lemma", "proposition", "theorem"].includes(mainTargetEntry?.type)) {
      issues.push(`mainTargetEntryId ${mainTargetId} 必须是 Claim（定理/引理/命题），不能是 Fact`);
    } else if (!b0Set.has(mainTargetId)) {
      const hasProof = inferences.some(
        (inf) => (inf.operationKind === "proof" || inf.type === "proof") && inf.conclusion === mainTargetId
      );
      if (!hasProof) {
        issues.push(`论文主目标 Claim ${mainTargetId}（${mainTargetEntry.title || mainTargetEntry.name || mainTargetId}）缺少推导证明：必须在 inferences 中补充以其为结论的 proof 推理`);
      }
    }
  }

  return issues;
}

module.exports = {
  ENTRY_ARTIFACT_SCHEMA,
  INFERENCE_ARTIFACT_SCHEMA,
  CANDIDATE_VERSION,
  CANDIDATE_ASSEMBLY_PROMPT_POLICY,
  analyzeInferenceGraph,
  collectCandidateInferenceIssues,
};
