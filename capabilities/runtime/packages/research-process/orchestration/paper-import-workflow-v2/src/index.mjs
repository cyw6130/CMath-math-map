/**
 * @cmath-provenance
 * @package paper-import-workflow-v2
 * @version v2.1
 * @canonicalSource packages/research-process/orchestration/paper-import-workflow-v2/src/index.mjs
 * @contentHash sha256:5deb860dcdd0813a6af2040422eeac31bda0a18d5b7c2f3db1d6bdd9845015fc
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import { createHash } from "node:crypto";
import { validatePdfSourceSnapshot } from "../../../import/pdf-source-snapshot-v1/src/index.mjs";

export const PAPER_IMPORT_WORKFLOW_RESULT_SCHEMA = "cmath.paper-import-workflow-result/v0.2";
export const STAGE_ARTIFACT_SCHEMA = "cmath.paper-import-stage-artifact/v0.1";
export const STAGE_TRACE_SCHEMA = "cmath.paper-import-stage-trace/v0.1";
export const CANDIDATE_SCHEMA = "cmath.paper-import-candidate/v0.1";
export const REVIEW_SCHEMA = "cmath.paper-import-review/v0.1";
export const WORKFLOW_STAGES = Object.freeze(["prepare", "guide", "target", "extract", "aggregate", "compile-candidate", "review"]);
export const ASSEMBLY_REPAIR_POLICY = Object.freeze({
  version: "v2.2",
  openClaimsAreValid: true,
  normalizeStructureBeforeModelRepair: true,
  focusedReviewCount: 1,
  modelRepairScope: "b0-and-formal-claim-proof-coverage",
  notProvedHereMeansOpen: false,
  forbidsEntryRewriting: true,
  forbidsInventedProofsAndSources: true,
});

export function shouldRequestModelAssemblyRepair({ structuralIssues = [], semanticIssues = [], focusedReviewCompleted = false } = {}) {
  if (!Array.isArray(structuralIssues) || !Array.isArray(semanticIssues)) throw new Error("assembly issue lists must be arrays");
  return !focusedReviewCompleted || semanticIssues.length > 0;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}
export function digest(value) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
const clone = (value) => value === undefined ? undefined : structuredClone(value);
function requiredObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be an object");
  return value;
}
function nonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(label + " must be a non-empty string");
  return value.trim();
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function stageTrace({ runId, stage, inputs, output, at }) {
  return { schema: STAGE_TRACE_SCHEMA, workflow: "paper-import-workflow-v2", run_id: runId, stage, status: "completed", input_digests: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, digest(value)])), output_digest: digest(output), started_at: at, completed_at: at };
}
function artifact({ runId, stage, inputs, output, at }) {
  const trace = stageTrace({ runId, stage, inputs, output, at });
  return deepFreeze({ schema: STAGE_ARTIFACT_SCHEMA, workflow: "paper-import-workflow-v2", run_id: runId, stage, output: clone(output), trace });
}
function invoke(extractor, method, args) {
  if (typeof extractor?.[method] !== "function") throw new Error("paper-dossier-extractor-v2 must provide " + method + "()");
  const result = extractor[method](args);
  if (result && typeof result.then === "function") throw new Error(method + "() must be synchronous for the pure orchestration contract");
  return requiredObject(result, method + " result");
}
function normalizeTarget(value, { paper, guide }) {
  if (value === undefined || value === null) {
    const sourceName = paper?.title ?? paper?.file_name ?? paper?.fileName ?? "paper";
    const slug = String(sourceName).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "paper";
    return { id: "document:" + slug, kind: "document", scope: "whole-document", question: null, derived_from_guide: Boolean(guide) };
  }
  const target = requiredObject(value, "target");
  return { ...clone(target), id: nonEmpty(target.id, "target.id") };
}
function recordsFrom(result, label) {
  if (!Array.isArray(result.records)) throw new Error(label + ".records must be an array");
  for (const record of result.records) { requiredObject(record, label + " record"); nonEmpty(record.id, label + " record.id"); }
  return clone(result.records);
}
function aggregateRecords(coverageRecords, leadRecords) {
  const records = [], byId = new Map(), conflicts = [];
  for (const [lane, laneRecords] of [["coverage", coverageRecords], ["lead-guided", leadRecords]]) {
    for (const record of laneRecords) {
      const existing = byId.get(record.id);
      if (!existing) { const merged = { ...clone(record), extraction_lanes: [lane] }; byId.set(record.id, merged); records.push(merged); continue; }
      const comparableExisting = { ...existing, extraction_lanes: undefined, fidelity_status: undefined, fidelity_review: undefined };
      const comparableIncoming = { ...record, extraction_lanes: undefined, fidelity_status: undefined, fidelity_review: undefined };
      if (digest(comparableExisting) === digest(comparableIncoming)) existing.extraction_lanes = [...new Set([...(existing.extraction_lanes ?? []), lane])];
      else conflicts.push({ record_id: record.id, existing: clone(existing), incoming: clone(record), lanes: [existing.extraction_lanes?.[0] ?? "coverage", lane] });
    }
  }
  return { records, conflicts, counts: { coverage: coverageRecords.length, lead_guided: leadRecords.length, aggregated: records.length, conflicts: conflicts.length } };
}

function defaultFidelityReview(record, { snapshot, aggregateOutput } = {}) {
  const issues = [];
  const source = record.source ?? {};
  const locator = source.locator ?? record.locator ?? (record.source_block_ids?.length ? `blocks=${record.source_block_ids.join(",")}` : null);
  const role = source.source_role ?? record.source_role ?? "unknown";

  if (!locator && (!record.source_block_ids || !record.source_block_ids.length)) {
    issues.push("missing_source_locator");
  }
  if (role === "navigation_or_overview" || role === "summary" || record.is_summary_only) {
    issues.push("summary_source_requires_underlying_evidence");
  }
  const hasConflict = aggregateOutput?.conflicts?.some((c) => c.record_id === record.id);
  if (hasConflict) {
    issues.push("aggregation_conflict_pending_adjudication");
  }

  let verdict = "passed";
  if (issues.includes("missing_source_locator") || issues.length > 0) {
    verdict = "needs_review";
  }

  return {
    record_id: record.id,
    verdict,
    accepted_kind: record.proposed_kind ?? record.kind ?? "candidate_entry",
    issues,
    evidence_refs: record.source_block_ids ?? (locator ? [locator] : [])
  };
}

function resolveSnapshot(snapshot) {
  requiredObject(snapshot, "snapshot");
  if (snapshot.schema === "cmath.pdf-source-snapshot/v0.1") {
    validatePdfSourceSnapshot(snapshot);
    return {
      digest: snapshot.source.pdf_sha256,
      page_count: snapshot.page_count,
      source: clone(snapshot.source)
    };
  }
  const sourceDigest = snapshot.source?.pdf_sha256
    ?? snapshot.source?.sha256
    ?? snapshot.source?.digest
    ?? snapshot.digest
    ?? snapshot.source_pdf_sha256
    ?? ("sha256:" + createHash("sha256").update(JSON.stringify(canonical(snapshot))).digest("hex"));
  return {
    digest: sourceDigest,
    page_count: snapshot.page_count ?? snapshot.file_count ?? snapshot.files?.length ?? 1,
    source: clone(snapshot.source ?? { digest: sourceDigest })
  };
}

export function runPaperImportWorkflowV2({ snapshot, paper = {}, target, guide: guideInput, extractor, reviewer = null, reviewExtension = null, options = {}, runId, now = new Date().toISOString() } = {}) {
  const resolvedSnapshot = resolveSnapshot(snapshot);
  requiredObject(paper, "paper"); requiredObject(extractor, "extractor");
  const sourceDigest = resolvedSnapshot.digest;
  const resolvedRunId = runId ? nonEmpty(runId, "runId") : "paper-import-workflow-v2:" + sourceDigest;
  const prepared = { schema: "cmath.paper-import-prepare/v0.1", kind: "prepared-paper", source_pdf_sha256: sourceDigest, page_count: resolvedSnapshot.page_count, paper: clone(paper) };
  const prepareArtifact = artifact({ runId: resolvedRunId, stage: "prepare", inputs: { snapshot }, output: prepared, at: now });
  const guide = guideInput === undefined ? invoke(extractor, "buildGuide", { snapshot: clone(snapshot), prepared: clone(prepared), paper: clone(paper), options: clone(options) }) : requiredObject(guideInput, "guide");
  const guideOutput = { schema: "cmath.paper-import-guide/v0.1", kind: "extraction-guide", guide: clone(guide) };
  const guideArtifact = artifact({ runId: resolvedRunId, stage: "guide", inputs: { prepare: prepared }, output: guideOutput, at: now });
  const selectedTarget = target === undefined && typeof extractor.selectTarget === "function" ? extractor.selectTarget({ snapshot: clone(snapshot), prepared: clone(prepared), guide: clone(guide), paper: clone(paper), options: clone(options) }) : target;
  const targetOutput = { schema: "cmath.paper-import-target/v0.1", kind: "import-target", target: normalizeTarget(selectedTarget, { paper, guide }) };
  const targetArtifact = artifact({ runId: resolvedRunId, stage: "target", inputs: { guide: guideOutput }, output: targetOutput, at: now });
  const coverageResult = invoke(extractor, "extractCoverage", { snapshot: clone(snapshot), prepared: clone(prepared), guide: clone(guide), target: clone(targetOutput.target), paper: clone(paper), options: clone(options) });
  const leadResult = invoke(extractor, "extractLeadGuided", { snapshot: clone(snapshot), prepared: clone(prepared), guide: clone(guide), target: clone(targetOutput.target), coverage: clone(coverageResult), paper: clone(paper), options: clone(options) });
  const extractOutput = { schema: "cmath.paper-import-extract/v0.1", kind: "dual-lane-extraction", coverage: { ...clone(coverageResult), records: recordsFrom(coverageResult, "coverage") }, lead_guided: { ...clone(leadResult), records: recordsFrom(leadResult, "lead-guided") } };
  const extractArtifact = artifact({ runId: resolvedRunId, stage: "extract", inputs: { guide: guideOutput, target: targetOutput }, output: extractOutput, at: now });
  const aggregateOutput = { schema: "cmath.paper-import-aggregate/v0.1", kind: "aggregated-extraction", ...aggregateRecords(extractOutput.coverage.records, extractOutput.lead_guided.records), lane_metadata: { coverage: clone(coverageResult.coverage ?? null), lead_guided: clone(leadResult.leads ?? leadResult.lead ?? null) } };
  const aggregateArtifact = artifact({ runId: resolvedRunId, stage: "aggregate", inputs: { extract: extractOutput }, output: aggregateOutput, at: now });
  
  // Preliminary candidate before review
  const rawCandidate = { schema: CANDIDATE_SCHEMA, kind: "paper_import_candidate", workflow: "paper-import-workflow-v2", run_id: resolvedRunId, source: { pdf_sha256: sourceDigest, page_count: resolvedSnapshot.page_count }, paper: clone(paper), target: clone(targetOutput.target), guide: clone(guide), records: clone(aggregateOutput.records), coverage: clone(aggregateOutput.lane_metadata.coverage), lead_guided: clone(aggregateOutput.lane_metadata.lead_guided), conflicts: clone(aggregateOutput.conflicts), candidate_boundary: { admission_performed: false, mutation_performed: false, store_write_performed: false, review_required: true, review_stage_executed: false, candidate_only: true } };
  const compileArtifact = artifact({ runId: resolvedRunId, stage: "compile-candidate", inputs: { aggregate: aggregateOutput }, output: rawCandidate, at: now });

  // Standard Source-Fidelity Review Stage
  const activeReviewer = reviewer ?? reviewExtension;
  const reviewRecords = [];
  const finalRecords = [];
  for (const record of aggregateOutput.records) {
    let reviewItem;
    if (typeof activeReviewer?.reviewRecord === "function") {
      reviewItem = activeReviewer.reviewRecord(record, { snapshot, candidate: rawCandidate, aggregateOutput, options });
    } else if (typeof activeReviewer === "function") {
      reviewItem = activeReviewer(record, { snapshot, candidate: rawCandidate, aggregateOutput, options });
    } else if (typeof activeReviewer?.run === "function") {
      // Legacy reviewExtension interface
      reviewItem = defaultFidelityReview(record, { snapshot, aggregateOutput });
    } else {
      reviewItem = defaultFidelityReview(record, { snapshot, aggregateOutput });
    }
    const verdict = reviewItem?.verdict ?? "needs_review";
    const reviewedRecord = {
      ...clone(record),
      fidelity_status: verdict,
      fidelity_review: clone(reviewItem)
    };
    reviewRecords.push(clone(reviewItem));
    finalRecords.push(reviewedRecord);
  }

  const reviewCounts = {
    total: finalRecords.length,
    passed: finalRecords.filter((r) => r.fidelity_status === "passed").length,
    failed: finalRecords.filter((r) => r.fidelity_status === "failed").length,
    needs_review: finalRecords.filter((r) => r.fidelity_status === "needs_review").length
  };

  const reviewOutput = {
    schema: REVIEW_SCHEMA,
    kind: "source_fidelity_review",
    workflow: "paper-import-workflow-v2",
    run_id: resolvedRunId,
    counts: reviewCounts,
    record_reviews: reviewRecords,
    conflicts: clone(aggregateOutput.conflicts)
  };
  const reviewArtifact = artifact({ runId: resolvedRunId, stage: "review", inputs: { "compile-candidate": rawCandidate }, output: reviewOutput, at: now });

  const candidate = {
    ...rawCandidate,
    records: finalRecords,
    fidelity_summary: reviewCounts,
    candidate_boundary: {
      admission_performed: false,
      mutation_performed: false,
      store_write_performed: false,
      review_required: true,
      review_stage_executed: true,
      candidate_only: true
    }
  };

  const stageArtifacts = {
    prepare: prepareArtifact,
    guide: guideArtifact,
    target: targetArtifact,
    extract: extractArtifact,
    aggregate: aggregateArtifact,
    "compile-candidate": compileArtifact,
    review: reviewArtifact
  };
  const traces = WORKFLOW_STAGES.map((stage) => stageArtifacts[stage].trace);
  const reviewInfo = {
    available: true,
    required: true,
    invoked: true,
    counts: reviewCounts,
    handoff: "candidate records have been source-fidelity reviewed and preserved in candidate dossier"
  };

  return deepFreeze({
    schema: PAPER_IMPORT_WORKFLOW_RESULT_SCHEMA,
    kind: "paper_import_workflow_result",
    workflow: "paper-import-workflow-v2",
    run_id: resolvedRunId,
    stages: [...WORKFLOW_STAGES],
    stageArtifacts,
    artifacts: stageArtifacts,
    traces,
    candidate: clone(candidate),
    candidateBoundary: clone(candidate.candidate_boundary),
    extensions: { review: reviewInfo },
    execution: { admission: false, mutation: false, store: false }
  });
}

