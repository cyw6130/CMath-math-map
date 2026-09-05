/** Small cacheable module contracts around the historical V3.26 workflow. */
(function publishPaperImportModules(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportModulesV326 = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperImportModules(root) {
  "use strict";

  const ENTRY_ARTIFACT_SCHEMA = "cmath.paper-entry-artifact/v1";
  const INFERENCE_ARTIFACT_SCHEMA = "cmath.paper-inference-artifact/v1";
  const FORMAT_REPORT_SCHEMA = "cmath.paper-format-report/v1";
  const MODULAR_WORKFLOW_VERSION = "v3.26-modular";
  const ENTRY_MODULE_VERSION = "v3.26-entry-v1";
  const INFERENCE_MODULE_VERSION = "v3.26-inference-v1";
  const FORMAT_MODULE_VERSION = "v3.26-format-v1";

  const entryContract = root?.CMathPaperEntryArtifactV1
    ?? (typeof require === "function" ? require("./paper-entry-artifact-v1.js") : null);

  function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function cloneJson(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function moduleMetadata(moduleName, moduleVersion, extra = {}) {
    return { workflowVersion: MODULAR_WORKFLOW_VERSION, backbone: "v3.26", module: moduleName, moduleVersion, ...extra };
  }

  function createEntryModuleArtifact(artifact, { caseId = null, sourceArtifact = null } = {}) {
    if (!isObject(artifact)) throw new Error("Entry artifact must be an object");
    const canonical = entryContract?.createPaperEntryArtifact
      ? entryContract.createPaperEntryArtifact(artifact)
      : cloneJson(artifact);
    if (entryContract?.validatePaperEntryArtifact) entryContract.validatePaperEntryArtifact(canonical);
    const result = cloneJson(canonical);
    result.moduleMetadata = moduleMetadata("entry", ENTRY_MODULE_VERSION, {
      ...(caseId ? { caseId } : {}), ...(sourceArtifact ? { sourceArtifact } : {}),
    });
    return result;
  }

  function selectProjectView(input) {
    if (!isObject(input)) throw new Error("Inference input must be an object");
    if (isObject(input.view)) return input.view;
    if (isObject(input.projectView)) return input.projectView;
    // A bare Project View is accepted only when it carries the two required
    // graph collections.  This prevents an arbitrary JSON object from being
    // silently treated as a map and makes the module boundary explicit.
    if (Array.isArray(input.entries) && Array.isArray(input.inferences)) return input;
    throw new Error("Inference input must contain a Project View");
  }

  function createInferenceModuleArtifact({ entryArtifact, inferenceResult, caseId = null } = {}) {
    if (!isObject(entryArtifact)) throw new Error("Inference artifact requires an Entry artifact");
    if (entryContract?.validatePaperEntryArtifact) entryContract.validatePaperEntryArtifact(entryArtifact);
    const view = selectProjectView(inferenceResult);
    if (!isObject(view) || !Array.isArray(view.entries) || !Array.isArray(view.inferences)) {
      throw new Error("Inference result must contain a project view with entries and inferences arrays");
    }
    return {
      schema: INFERENCE_ARTIFACT_SCHEMA,
      moduleMetadata: moduleMetadata("inference", INFERENCE_MODULE_VERSION, {
        ...(caseId ? { caseId } : {}), entryArtifactSchema: entryArtifact.schema,
        entryModuleVersion: entryArtifact.moduleMetadata?.moduleVersion ?? entryArtifact.entryModuleVersion,
      }),
      entryArtifactRef: {
        schema: entryArtifact.schema, sourceFileName: entryArtifact.source?.fileName ?? null,
        entryCount: entryArtifact.entries?.length ?? 0,
      },
      workflowVersion: inferenceResult?.workflowVersion ?? "v3.26",
      view: cloneJson(view), diagnostics: cloneJson(inferenceResult?.diagnostics ?? null),
    };
  }

  function getB0Ids(view) {
    const state = view?.derivedResearchState?.mathematicalState;
    const raw = view?.b0ClaimEntryIds ?? view?.b0 ?? state?.b0ClaimEntryIds ?? [];
    return Array.isArray(raw) ? raw.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()) : [];
  }

  function check(name, passed, points, detail = null) {
    return { name, passed: Boolean(passed), points: passed ? points : 0, maxPoints: points, ...(detail ? { detail } : {}) };
  }

  // Deterministic structural checks only. This is not semantic Sol scoring.
  function validateFormatArtifact(input, { caseId = null, sourcePath = null } = {}) {
    const checks = [];
    let view = null;
    try { view = selectProjectView(input); } catch (error) { checks.push(check("json_object", false, 4, error.message)); }
    const objectPassed = isObject(view);
    if (!checks.some((item) => item.name === "json_object")) checks.push(check("json_object", objectPassed, 4));

    const entries = Array.isArray(view?.entries) ? view.entries : [];
    const inferences = Array.isArray(view?.inferences) ? view.inferences : [];
    const entryIds = new Set();
    let uniqueIds = true; let entryFields = true; let balancedMath = true;
    for (const entry of entries) {
      const rawId = typeof entry?.id === "string" ? entry.id.trim() : null;
      if (!isObject(entry) || !rawId || entryIds.has(rawId)) uniqueIds = false;
      if (rawId) entryIds.add(rawId);
      const kind = entry?.entryClass === "fact" ? entry.factKind : entry?.entryClass === "claim" ? entry.claimKind : entry?.type;
      if (!entry?.id || !entry?.statement || (!entry?.entryClass && !kind)) entryFields = false;
      for (const field of [entry?.title, entry?.statement, entry?.shortTitle, entry?.displayLabel]) {
        if (entryContract?.hasBalancedMathDelimiters && typeof field === "string" && !entryContract.hasBalancedMathDelimiters(field)) balancedMath = false;
      }
    }
    checks.push(check("entries_present", entries.length > 0, 4, "entries=" + entries.length));
    checks.push(check("entry_ids_unique", uniqueIds, 5));
    checks.push(check("entry_fields", entryFields, 4));
    checks.push(check("math_delimiters", balancedMath, 5));

    const inferenceIds = new Set(); let inferenceShape = true; let referencesValid = true;
    let proofConclusionsClaims = true; let organizationsConnectFacts = true;
    let noSelfLoops = true;
    for (const inference of inferences) {
      if (!isObject(inference)) { inferenceShape = false; continue; }
      const infId = typeof inference.id === "string" ? inference.id.trim() : "";
      if (!infId || inferenceIds.has(infId)) inferenceShape = false;
      if (infId) inferenceIds.add(infId);
      if (!["proof", "organization"].includes(inference.operationKind)) inferenceShape = false;

      const validPremises = Array.isArray(inference.premises) && inference.premises.length > 0
        && inference.premises.every((id) => typeof id === "string" && id.trim())
        && new Set(inference.premises.map((id) => id.trim())).size === inference.premises.length;
      const validConclusion = typeof inference.conclusion === "string" && Boolean(inference.conclusion.trim());
      if (!validPremises || !validConclusion) inferenceShape = false;

      const premiseIds = Array.isArray(inference.premises) ? inference.premises.map((id) => (typeof id === "string" ? id.trim() : id)) : [];
      const conclusionId = typeof inference.conclusion === "string" ? inference.conclusion.trim() : inference.conclusion;

      if (premiseIds.some((id) => !entryIds.has(id))) referencesValid = false;
      if (!entryIds.has(conclusionId)) referencesValid = false;
      if (premiseIds.includes(conclusionId)) {
        noSelfLoops = false;
      }
      const premiseEntries = premiseIds.map((id) => entries.find((entry) => (typeof entry?.id === "string" ? entry.id.trim() : entry?.id) === id)).filter(Boolean);
      const conclusionEntry = entries.find((entry) => (typeof entry?.id === "string" ? entry.id.trim() : entry?.id) === conclusionId);
      if (inference.operationKind === "proof" && conclusionEntry?.entryClass !== "claim") proofConclusionsClaims = false;
      if (inference.operationKind === "organization" && (premiseEntries.some((entry) => entry.entryClass !== "fact") || conclusionEntry?.entryClass !== "fact")) {
        organizationsConnectFacts = false;
      }
      for (const field of [inference.title, inference.statement, inference.argument, inference.shortTitle, inference.displayLabel]) {
        if (entryContract?.hasBalancedMathDelimiters && typeof field === "string" && !entryContract.hasBalancedMathDelimiters(field)) balancedMath = false;
      }
    }
    checks.push(check("inference_shape", inferenceShape, 5, "inferences=" + inferences.length));
    checks.push(check("inference_references", referencesValid, 5));
    // These are structural invariants reported separately while keeping the
    // historical 40-point format scale unchanged (zero-weight diagnostics).
    checks.push(check("proof_conclusion_claim", proofConclusionsClaims, 0, "proof conclusions must reference Claim entries"));
    checks.push(check("organization_fact_link", organizationsConnectFacts, 0, "organization relations must connect Fact entries"));
    checks.push(check("inference_no_self_loop", noSelfLoops, 0, "inference premises must not contain its conclusion"));

    const mainTarget = typeof view?.mainTargetEntryId === "string" ? view.mainTargetEntryId.trim() : null;
    const mainTargetValid = typeof mainTarget === "string" && entryIds.has(mainTarget);
    const b0 = getB0Ids(view); const b0Valid = b0.every((id) => entryIds.has(id));
    checks.push(check("main_target", mainTargetValid, 4, mainTargetValid ? null : "mainTargetEntryId must reference an Entry"));
    checks.push(check("b0_references", b0Valid, 4, b0Valid ? null : "B0 contains an unknown Entry id"));
    const earned = checks.reduce((sum, item) => sum + item.points, 0);
    const max = checks.reduce((sum, item) => sum + item.maxPoints, 0);
    return {
      schema: FORMAT_REPORT_SCHEMA,
      moduleMetadata: moduleMetadata("format", FORMAT_MODULE_VERSION, { ...(caseId ? { caseId } : {}) }),
      sourcePath, inputSchema: input?.schema ?? null, passed: checks.every((item) => item.passed),
      formatScore: earned, formatScoreMax: max,
      counts: { entries: entries.length, inferences: inferences.length, b0: b0.length }, checks,
    };
  }

  return Object.freeze({ ENTRY_ARTIFACT_SCHEMA, INFERENCE_ARTIFACT_SCHEMA, FORMAT_REPORT_SCHEMA,
    MODULAR_WORKFLOW_VERSION, ENTRY_MODULE_VERSION, INFERENCE_MODULE_VERSION, FORMAT_MODULE_VERSION,
    createEntryModuleArtifact, createInferenceModuleArtifact, validateFormatArtifact, selectProjectView, getB0Ids });
});
