/**
 * Resumable Paper Import checkpoint storage.
 *
 * Checkpoints deliberately have a small, allow-listed shape.  This module is
 * shared by the browser and Node test runner and never serializes the caller's
 * model configuration or MinerU transport objects.
 */
(function publishCheckpointStore(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportCheckpointStore = api;
})(typeof window !== "undefined" ? window : globalThis, function createCheckpointStoreModule(root) {
  "use strict";

  const CHECKPOINT_SCHEMA = "cmath.paper-import.checkpoint/v1";
  const DEFAULT_DB_NAME = "cmath-paper-import";
  const DEFAULT_STORE_NAME = "checkpoints";
  const WORKFLOW_STAGES = Object.freeze([
    "mineru",
    "entry",
    "consolidate",
    "w7-verify",
    "w8-b0",
    "inference",
    "closure",
  ]);
  const STAGE_NAMES = WORKFLOW_STAGES;

  function cloneJson(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function own(source, key) {
    return source && typeof source === "object" && Object.prototype.hasOwnProperty.call(source, key)
      ? source[key]
      : undefined;
  }

  function pick(source, keys) {
    if (!source || typeof source !== "object") return {};
    const result = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        result[key] = cloneJson(source[key]);
      }
    }
    return result;
  }

  function safeText(value, maxLength = 1000) {
    if (typeof value !== "string") return undefined;
    return value
      .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
      .replace(/https?:\/\/[^\s"'<>]+/giu, "[redacted-url]")
      .replace(/(["'](?:authorization|(?:(?:[a-z0-9]+)[_-]?)?(?:api[_-]?key|token|secret))["']\s*:\s*["'])[^"']*(["'])/giu, "$1[redacted]$2")
      .replace(/\b(authorization|(?:(?:[a-z0-9]+)[_-]?)?(?:api[_-]?key|token|secret))\s*[:=]\s*\S+/giu, "$1=[redacted]")
      .slice(0, maxLength);
  }

  function sanitizeNested(value, key = "", depth = 0) {
    if (depth > 8) return undefined;
    if (/authorization|api[_-]?key|token|secret/iu.test(key)) return "[redacted]";
    if (typeof value === "string") return safeText(value);
    if (["number", "boolean"].includes(typeof value) || value === null) return value;
    if (Array.isArray(value)) return value.map((item) => sanitizeNested(item, "", depth + 1)).filter((item) => item !== undefined);
    if (!value || typeof value !== "object") return undefined;
    const result = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const clean = sanitizeNested(childValue, childKey, depth + 1);
      if (clean !== undefined) result[childKey] = clean;
    }
    return result;
  }

  function sanitizeHint(hint) {
    if (!hint || typeof hint !== "object" || Array.isArray(hint)) return null;
    const clean = pick(hint, ["premiseRefs", "conclusionRef", "relationText", "page"]);
    for (const key of ["premiseRefs", "conclusionRef", "relationText"]) {
      if (clean[key] !== undefined) clean[key] = sanitizeNested(clean[key], key);
    }
    if (hint._provenance && typeof hint._provenance === "object") {
      clean._provenance = pick(hint._provenance, ["chunkIndex", "blockIndex", "pageRange", "lane", "version"]);
    }
    return clean;
  }

  function sanitizeLead(lead) {
    if (!lead || typeof lead !== "object" || Array.isArray(lead)) return null;
    const clean = {};
    for (const key of ["id", "title", "name", "summary"]) {
      const value = safeText(lead[key], 500);
      if (value !== undefined) clean[key] = value;
    }
    if (Array.isArray(lead.pages)) clean.pages = lead.pages.filter((page) => Number.isInteger(page) && page > 0);
    return clean;
  }

  function sanitizePaperGuide(guide) {
    if (!guide || typeof guide !== "object" || Array.isArray(guide)) return null;
    const clean = {};
    const title = safeText(guide.title, 500);
    if (title !== undefined) clean.title = title;
    if (guide.main_target && typeof guide.main_target === "object") clean.main_target = sanitizeLead(guide.main_target);
    if (Array.isArray(guide.leads)) clean.leads = guide.leads.map(sanitizeLead).filter(Boolean);
    if (Array.isArray(guide.key_results)) clean.key_results = guide.key_results.map(sanitizeLead).filter(Boolean);
    return clean;
  }

  function sanitizeStringMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const clean = {};
    for (const [key, rawValue] of Object.entries(value)) {
      const safeKey = safeText(key, 200);
      const safeValue = safeText(rawValue, 500);
      if (safeKey && safeValue !== undefined) clean[safeKey] = safeValue;
    }
    return clean;
  }

  function sanitizeNumericFields(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const clean = {};
    for (const key of keys) {
      if (typeof value[key] === "number" && Number.isFinite(value[key])) clean[key] = value[key];
    }
    return clean;
  }

  function sanitizeModuleIdentity(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const clean = {};
    for (const key of ["name", "schema", "backbone", "version"]) {
      const text = safeText(value[key], 200);
      if (text !== undefined) clean[key] = text;
    }
    return clean;
  }

  function sanitizeEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const result = pick(entry, [
      "id", "type", "entryClass", "factKind", "claimKind", "num", "name", "title",
      "shortTitle", "statement", "page", "external", "source", "sourceReference",
      "sourceLocator", "sourcePath", "displayLabel",
    ]);
    for (const key of ["source", "sourceReference", "sourceLocator", "sourcePath"]) {
      if (!Object.prototype.hasOwnProperty.call(result, key)) continue;
      const value = safeText(result[key]);
      if (value === undefined) delete result[key];
      else result[key] = value;
    }
    if (entry._provenance && typeof entry._provenance === "object") {
      result._provenance = pick(entry._provenance, ["chunkIndex", "blockIndex", "pageRange", "lane", "version"]);
    }
    return result;
  }

  function sanitizeRawPool(pool) {
    if (!pool || typeof pool !== "object" || Array.isArray(pool)) return null;
    const result = pick(pool, ["schema", "extractionModuleVersion"]);
    const source = own(pool, "source");
    result.source = pick(source, ["fileName", "pageCount", "characters", "sourceText"]);
    if (Array.isArray(pool.chunks)) {
      result.chunks = pool.chunks.map((chunk) => {
        const clean = pick(chunk, ["chunkIndex", "pageRange", "characterCount", "text"]);
        clean.rawEntries = Array.isArray(chunk?.rawEntries)
          ? chunk.rawEntries.map(sanitizeEntry).filter(Boolean)
          : [];
        if (Array.isArray(chunk?.inferenceHints)) clean.inferenceHints = chunk.inferenceHints.map(sanitizeHint).filter(Boolean);
        return clean;
      });
    }
    if (Array.isArray(pool.rawEntries)) result.rawEntries = pool.rawEntries.map(sanitizeEntry).filter(Boolean);
    if (Array.isArray(pool.unresolvedItems)) result.unresolvedItems = sanitizeUnresolvedItems(pool.unresolvedItems);
    if (Array.isArray(pool.inferenceHints)) {
      result.inferenceHints = pool.inferenceHints.map((hint) => pick(hint, [
        "premiseRefs", "conclusionRef", "relationText", "page", "_provenance",
      ])).map(sanitizeHint).filter(Boolean);
    }
    return result;
  }

  function sanitizeEntryArtifact(artifact) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return null;
    const result = pick(artifact, ["schema", "entryModuleVersion", "caseId"]);
    if (artifact.paperGuide !== undefined) result.paperGuide = sanitizePaperGuide(artifact.paperGuide);
    if (artifact.guideLeadSet && typeof artifact.guideLeadSet === "object") {
      result.guideLeadSet = { leads: Array.isArray(artifact.guideLeadSet.leads) ? artifact.guideLeadSet.leads.map(sanitizeLead).filter(Boolean) : [] };
    }
    if (artifact.aliases !== undefined) result.aliases = sanitizeStringMap(artifact.aliases);
    result.source = pick(artifact.source, ["fileName", "pageCount", "characters", "sourceText"]);
    if (Array.isArray(artifact.entries)) result.entries = artifact.entries.map(sanitizeEntry).filter(Boolean);
    if (Array.isArray(artifact.unresolvedItems)) result.unresolvedItems = sanitizeUnresolvedItems(artifact.unresolvedItems);
    if (artifact.lanes && typeof artifact.lanes === "object") {
      result.lanes = {
        coverageEntries: Array.isArray(artifact.lanes.coverageEntries)
          ? artifact.lanes.coverageEntries.map(sanitizeEntry).filter(Boolean) : [],
        leadGuidedEntries: Array.isArray(artifact.lanes.leadGuidedEntries)
          ? artifact.lanes.leadGuidedEntries.map(sanitizeEntry).filter(Boolean) : [],
      };
    }
    if (artifact.aggregation && typeof artifact.aggregation === "object") {
      result.aggregation = {
        records: Array.isArray(artifact.aggregation.records)
          ? artifact.aggregation.records.map(sanitizeEntry).filter(Boolean) : [],
        // Conflict payloads are diagnostic/model output and are not needed to
        // resume from the canonical Entry list.
        conflicts: [],
        counts: sanitizeNumericFields(artifact.aggregation.counts, [
          "coverage", "leadGuided", "total", "conflicts",
        ]),
      };
    }
    if (artifact.reviewInputs && typeof artifact.reviewInputs === "object") {
      result.reviewInputs = {
        missingExtractionCandidates: Array.isArray(artifact.reviewInputs.missingExtractionCandidates)
          ? artifact.reviewInputs.missingExtractionCandidates.map(sanitizeEntry).filter(Boolean) : [],
        protectedClaimIds: Array.isArray(artifact.reviewInputs.protectedClaimIds)
          ? artifact.reviewInputs.protectedClaimIds.map((id) => safeText(id, 200)).filter(Boolean) : [],
        canonicalIndex: sanitizeStringMap(artifact.reviewInputs.canonicalIndex),
      };
      const boundary = artifact.reviewInputs.externalBoundaryCandidates;
      if (boundary && typeof boundary === "object" && !Array.isArray(boundary)) {
        result.reviewInputs.externalBoundaryCandidates = {
          b0: Array.isArray(boundary.b0) ? boundary.b0.map((id) => safeText(id, 200)).filter(Boolean) : [],
          fixedEntries: Array.isArray(boundary.fixedEntries) ? boundary.fixedEntries.map(sanitizeEntry).filter(Boolean) : [],
          classifications: Array.isArray(boundary.classifications)
            ? boundary.classifications.map((item) => sanitizeNested(pick(item, ["id", "classification", "reason", "sourceReference", "page"]))).filter(Boolean)
            : [],
        };
      }
    }
    // Diagnostics are useful for display but may contain transport metadata.
    // Keep only counters and module identity, never model call records.
    if (artifact.diagnostics && typeof artifact.diagnostics === "object") {
      result.diagnostics = sanitizeNumericFields(artifact.diagnostics, ["durationMs", "deduplicated"]);
      result.diagnostics.consolidationSummary = {
        ...sanitizeNumericFields(artifact.diagnostics.consolidationSummary, [
          "rawEntryCount", "preCanonicalCount", "outputEntryCount", "modelCalls",
          "malformedCount", "invalidPageCount", "deduplicatedCount",
          "discardedDamagedCount", "consolidatedEntryCount",
        ]),
      };
      const rawPoolSchema = safeText(artifact.diagnostics.consolidationSummary?.rawPoolSchema, 200);
      if (rawPoolSchema !== undefined) result.diagnostics.consolidationSummary.rawPoolSchema = rawPoolSchema;
      result.diagnostics.moduleIdentity = sanitizeModuleIdentity(artifact.diagnostics.moduleIdentity);
      result.diagnostics.stages = Array.isArray(artifact.diagnostics.stages)
        ? artifact.diagnostics.stages.map((stage) => {
          const clean = sanitizeNumericFields(stage, ["atMs"]);
          const name = safeText(stage?.stage, 100);
          if (name !== undefined) clean.stage = name;
          return clean;
        })
        : [];
      // Model/network call diagnostics are not required to resume and may
      // contain transport metadata.  Preserve the Artifact contract with a
      // deliberately empty array instead of persisting those records.
      result.diagnostics.calls = [];
    }
    return result;
  }

  function sanitizeProjectView(view) {
    if (!view || typeof view !== "object" || Array.isArray(view)) return null;
    const result = pick(view, ["schema", "semanticModel", "mainTargetEntryId", "projectTitle"]);
    if (view.project && typeof view.project === "object") result.project = pick(view.project, ["id", "title"]);
    if (view.channelOptions && typeof view.channelOptions === "object") {
      result.channelOptions = {};
      for (const key of ["schema", "projectId", "boundaryLabel"]) {
        const value = safeText(view.channelOptions[key], 300);
        if (value !== undefined) result.channelOptions[key] = value;
      }
      if (view.channelOptions.adapterOptions !== undefined) result.channelOptions.adapterOptions = {};
    }
    if (view.derivedResearchState && typeof view.derivedResearchState === "object") {
      result.derivedResearchState = {};
      if (view.derivedResearchState.mathematicalState && typeof view.derivedResearchState.mathematicalState === "object") {
        result.derivedResearchState.mathematicalState = pick(view.derivedResearchState.mathematicalState, ["b0ClaimEntryIds"]);
      }
      if (view.derivedResearchState.researchOverlay && typeof view.derivedResearchState.researchOverlay === "object") {
        result.derivedResearchState.researchOverlay = pick(view.derivedResearchState.researchOverlay, ["loopTargetEntryId"]);
      }
    }
    if (Array.isArray(view.entries)) result.entries = view.entries.map(sanitizeEntry).filter(Boolean);
    if (Array.isArray(view.inferences)) {
      result.inferences = view.inferences.map((inference) => {
        const clean = pick(inference, [
          "id", "operationKind", "displayLabel", "shortTitle", "title", "statement",
          "premises", "conclusion", "argument", "sourcePath", "sourceLocator",
        ]);
        for (const key of ["sourceLocator", "sourcePath"]) {
          if (!Object.prototype.hasOwnProperty.call(clean, key)) continue;
          const value = safeText(clean[key]);
          if (value === undefined) delete clean[key];
          else clean[key] = value;
        }
        return clean;
      });
    }
    if (Array.isArray(view.unresolvedItems)) result.unresolvedItems = sanitizeUnresolvedItems(view.unresolvedItems);
    if (view.diagnostics && typeof view.diagnostics === "object" && !Array.isArray(view.diagnostics)) {
      result.diagnostics = pick(view.diagnostics, [
        "inferenceDegraded", "mainTargetIdentified", "mainProofChainComplete", "openClaimEntryIds", "isolatedEntryIds", "repairActions",
      ]);
      for (const key of ["openClaimEntryIds", "isolatedEntryIds", "repairActions"]) {
        if (Array.isArray(result.diagnostics[key])) {
          result.diagnostics[key] = result.diagnostics[key]
            .map((value) => safeText(value, 500))
            .filter((value) => typeof value === "string" && value);
        }
      }
    }
    return result;
  }

  function sanitizeSourceAnnotations(layer) {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) return { items: [] };
    const result = {};
    if (layer.source && typeof layer.source === "object") {
      result.source = {};
      const fileName = safeText(layer.source.fileName, 500);
      if (fileName !== undefined) result.source.fileName = fileName;
      if (Number.isInteger(layer.source.pageCount) && layer.source.pageCount > 0) result.source.pageCount = layer.source.pageCount;
    }
    result.items = Array.isArray(layer.items) ? layer.items.map((item) => {
      const clean = {};
      for (const key of ["objectId", "entryId", "inferenceId", "sourceLocator", "sourcePath", "label"]) {
        const value = safeText(item?.[key]);
        if (value !== undefined) clean[key] = value;
      }
      if (Number.isInteger(item?.page) && item.page > 0) clean.page = item.page;
      return clean;
    }) : [];
    return result;
  }

  function sanitizeUnresolvedItems(items) {
    if (!Array.isArray(items)) return [];
    const counts = new Map();
    return items.filter((item) => (
      item && typeof item === "object" && !Array.isArray(item)
      && ["sourceStage", "candidateSummary", "failureCategory", "validationError"]
        .every((field) => typeof item[field] === "string" && item[field].trim())
      && typeof item.retryable === "boolean"
    )).map((item, index) => {
      const clean = {};
      for (const key of [
        "id", "sourceStage", "sourceLocator", "sourcePath", "candidateSummary",
        "failureCategory", "validationError",
      ]) {
        const value = safeText(item?.[key]);
        if (value !== undefined) clean[key] = value;
      }
      if (Number.isInteger(item?.page) && item.page > 0) clean.page = item.page;
      if (typeof item?.retryable === "boolean") clean.retryable = item.retryable;
      if (!clean.id) clean.id = `unresolved:${clean.sourceStage}:${clean.failureCategory}:${index + 1}`;
      const baseId = clean.id;
      const count = (counts.get(baseId) ?? 0) + 1;
      counts.set(baseId, count);
      if (count > 1) clean.id = `${baseId}:${count}`;
      return clean;
    });
  }

  function sanitizePaperToMapResult(result) {
    if (result?.schema !== "cmath.paper-to-map-result/v1") return null;
    const clean = pick(result, ["schema", "status"]);
    clean.map = sanitizeProjectView(result.map);
    clean.sourceAnnotations = sanitizeSourceAnnotations(result.sourceAnnotations);
    clean.unresolvedItems = sanitizeUnresolvedItems(result.unresolvedItems);
    clean.diagnostics = {};
    for (const key of ["mainTargetIdentified", "mainProofChainComplete"]) {
      if (typeof result.diagnostics?.[key] === "boolean" || result.diagnostics?.[key] === null) {
        clean.diagnostics[key] = result.diagnostics[key];
      }
    }
    if (Number.isInteger(result.diagnostics?.openClaimCount) && result.diagnostics.openClaimCount >= 0) {
      clean.diagnostics.openClaimCount = result.diagnostics.openClaimCount;
    }
    clean.diagnostics.missingStages = Array.isArray(result.diagnostics?.missingStages)
      ? result.diagnostics.missingStages.map((stage) => safeText(stage, 100)).filter(Boolean)
      : [];
    clean.stages = {};
    if (result.stages && typeof result.stages === "object") {
      for (const stage of WORKFLOW_STAGES) {
        if (result.stages[stage] && typeof result.stages[stage] === "object") {
          clean.stages[stage] = pick(result.stages[stage], ["status", "attempt"]);
        }
      }
    }
    if (result.identity && typeof result.identity === "object") {
      clean.identity = {
        contentFingerprint: typeof result.identity.contentFingerprint === "string"
          ? safeText(result.identity.contentFingerprint, 500)
          : "",
        frozenWorkflow: sanitizeWorkflowIdentity(result.identity.frozenWorkflow),
      };
    }
    return clean;
  }

  function sanitizeStageArtifact(stage, artifact) {
    if (stage === "mineru") {
      return pick(artifact, ["markedMarkdown", "pageCount", "fileName"]);
    }
    if (stage === "entry") return sanitizeRawPool(artifact);
    if (stage === "consolidate" || stage === "w7-verify" || stage === "w8-b0") return sanitizeEntryArtifact(artifact);
    if (stage === "closure" && artifact?.schema === "cmath.paper-to-map-result/v1") {
      return sanitizePaperToMapResult(artifact);
    }
    if (stage === "inference" || stage === "closure") return sanitizeProjectView(artifact);
    return null;
  }

  function isUsableStageArtifact(stage, artifact) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return false;
    const validEntry = (entry, { raw = false, project = false } = {}) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      if (typeof entry.id !== "string" || !entry.id.trim()) return false;
      if (typeof entry.statement !== "string" || !entry.statement.trim()) return false;
      if (raw) {
        return Number.isInteger(entry.page) && entry.page > 0
          && (typeof entry.type === "string" || ["fact", "claim"].includes(entry.entryClass));
      }
      const kindValid = entry.entryClass === "fact"
        ? ["definition", "algorithm", "calculation"].includes(entry.factKind)
        : entry.entryClass === "claim" && ["lemma", "proposition", "theorem"].includes(entry.claimKind);
      if (!kindValid) return false;
      if (project) return typeof (entry.sourcePath ?? entry.sourceLocator) === "string" && Boolean((entry.sourcePath ?? entry.sourceLocator).trim());
      return true;
    };
    const validProjectMap = (map) => {
      if (!map || typeof map !== "object" || Array.isArray(map)) return false;
      if (!Array.isArray(map.entries) || map.entries.length === 0
        || !map.entries.every((entry) => validEntry(entry, { project: true }))) return false;
      if (!Array.isArray(map.inferences)) return false;
      const entryById = new Map(map.entries.map((entry) => [entry.id.trim(), entry]));
      const objectIds = new Set(entryById.keys());
      return map.inferences.every((inference) => {
        if (!inference || typeof inference !== "object" || Array.isArray(inference)) return false;
        const id = typeof inference.id === "string" ? inference.id.trim() : "";
        if (!id || objectIds.has(id)) return false;
        objectIds.add(id);
        if (!["proof", "organization"].includes(inference.operationKind)) return false;
        if (!Array.isArray(inference.premises)
          || (inference.operationKind === "organization" && inference.premises.length === 0)) return false;
        const premises = inference.premises.map((premise) => (typeof premise === "string" ? premise.trim() : ""));
        if (premises.some((premise) => !premise || !entryById.has(premise))) return false;
        if (new Set(premises).size !== premises.length) return false;
        const conclusion = typeof inference.conclusion === "string" ? inference.conclusion.trim() : "";
        const conclusionEntry = entryById.get(conclusion);
        if (!conclusionEntry || premises.includes(conclusion)) return false;
        if (inference.operationKind === "proof" && conclusionEntry.entryClass !== "claim") return false;
        if (inference.operationKind === "organization" && (
          conclusionEntry.entryClass !== "fact"
          || premises.some((premise) => entryById.get(premise)?.entryClass !== "fact")
        )) return false;
        if (typeof inference.argument !== "string" || !inference.argument.trim()) return false;
        const source = inference.sourcePath ?? inference.sourceLocator;
        return typeof source === "string" && Boolean(source.trim());
      });
    };
    if (stage === "mineru") return typeof artifact.markedMarkdown === "string" && Boolean(artifact.markedMarkdown.trim());
    if (stage === "entry") {
      const rawEntries = [
        ...(Array.isArray(artifact.rawEntries) ? artifact.rawEntries : []),
        ...(Array.isArray(artifact.chunks) ? artifact.chunks.flatMap((chunk) => Array.isArray(chunk?.rawEntries) ? chunk.rawEntries : []) : []),
      ];
      return rawEntries.length > 0 && rawEntries.every((entry) => validEntry(entry, { raw: true }));
    }
    if (["consolidate", "w7-verify", "w8-b0"].includes(stage)) {
      return Array.isArray(artifact.entries) && artifact.entries.length > 0
        && artifact.entries.every((entry) => validEntry(entry));
    }
    if (stage === "closure" && artifact.schema === "cmath.paper-to-map-result/v1") {
      return validProjectMap(artifact.map);
    }
    if (stage === "inference" || stage === "closure") {
      return validProjectMap(artifact);
    }
    return false;
  }

  function sanitizeWorkflowIdentity(workflow) {
    if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) return {};
    // Frozen Workflow identity is deliberately allow-listed.  The current
    // frozen contract has exactly these three fields; model credentials and
    // transport configuration are never identity fields and must not enter a
    // checkpoint even if a caller passes one combined options object.
    const identityKeys = [
      "label",
      "productionContractVersion",
      "resultContractVersion",
      "capabilityAuthority",
      "capabilitySyncIdentity",
      "mineruInputVersion",
      "entryExtractionVersion",
      "entryConsolidationVersion",
      "entryVerificationVersion",
      "b0BackfillVersion",
      "inferenceRuntimeVersion",
      "projectViewVersion",
    ];
    const result = {};
    for (const key of identityKeys) {
      if (!Object.prototype.hasOwnProperty.call(workflow, key)) continue;
      const value = workflow[key];
      if (typeof value === "string") result[key] = safeText(value, 500);
      else if (["number", "boolean"].includes(typeof value) || value === null) result[key] = value;
    }
    if (Array.isArray(workflow.capabilityDependencies)) {
      result.capabilityDependencies = workflow.capabilityDependencies
        .map((dependency) => {
          const clean = {};
          for (const key of ["role", "capabilityId", "version", "contractVersion", "guaranteeId"]) {
            const value = safeText(dependency?.[key], 200);
            if (value !== undefined) clean[key] = value;
          }
          return clean;
        })
        .filter((dependency) => dependency.role && dependency.capabilityId && dependency.version && dependency.contractVersion);
    }
    return result;
  }

  function sanitizeCheckpoint(checkpoint, keyOverride) {
    if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) return null;
    const key = typeof keyOverride === "string" && keyOverride
      ? keyOverride
      : (typeof checkpoint.key === "string" ? checkpoint.key : "");
    if (!key) return null;
    const result = {
      schema: CHECKPOINT_SCHEMA,
      key,
      contentFingerprint: typeof checkpoint.contentFingerprint === "string" ? safeText(checkpoint.contentFingerprint, 500) : "",
      frozenWorkflow: sanitizeWorkflowIdentity(checkpoint.frozenWorkflow),
      stages: {},
      updatedAt: typeof checkpoint.updatedAt === "string" ? checkpoint.updatedAt : new Date().toISOString(),
    };
    if (checkpoint.input && typeof checkpoint.input === "object") {
      result.input = {};
      const fileName = safeText(checkpoint.input.fileName, 500);
      const contentFingerprint = safeText(checkpoint.input.contentFingerprint, 500);
      if (fileName !== undefined) result.input.fileName = fileName;
      if (Number.isFinite(checkpoint.input.byteLength) && checkpoint.input.byteLength >= 0) result.input.byteLength = checkpoint.input.byteLength;
      if (contentFingerprint !== undefined) result.input.contentFingerprint = contentFingerprint;
    } else {
      result.input = { contentFingerprint: result.contentFingerprint };
    }
    const stages = checkpoint.stages && typeof checkpoint.stages === "object" ? checkpoint.stages : {};
    for (const stage of WORKFLOW_STAGES) {
      const record = stages[stage];
      if (!record || typeof record !== "object") continue;
      const clean = pick(record, ["status", "attempt", "updatedAt"]);
      if (["running", "complete", "degraded", "failed"].includes(clean.status)) {
        if (clean.status === "complete" || clean.status === "degraded") {
          const artifact = sanitizeStageArtifact(stage, record.artifact);
          if (!isUsableStageArtifact(stage, artifact)) continue;
          clean.artifact = artifact;
        }
        if (clean.status === "failed" && record.error && typeof record.error === "object") {
          clean.error = {};
          for (const key of ["message", "code"]) {
            const value = safeText(record.error[key], key === "code" ? 80 : 500);
            if (value !== undefined) clean.error[key] = value;
          }
        }
        result.stages[stage] = clean;
      }
    }
    return result;
  }

  function saveArgs(keyOrCheckpoint, maybeCheckpoint) {
    if (typeof keyOrCheckpoint === "string") return { key: keyOrCheckpoint, checkpoint: maybeCheckpoint };
    return { key: keyOrCheckpoint?.key, checkpoint: keyOrCheckpoint };
  }

  function createMemoryCheckpointStore(initial = {}) {
    const records = new Map();
    for (const [key, value] of Object.entries(initial ?? {})) {
      const clean = sanitizeCheckpoint(value, key);
      if (clean) records.set(key, clean);
    }
    return Object.freeze({
      async load(key) {
        return cloneJson(records.get(String(key)) ?? null);
      },
      async save(keyOrCheckpoint, maybeCheckpoint) {
        const args = saveArgs(keyOrCheckpoint, maybeCheckpoint);
        const clean = sanitizeCheckpoint(args.checkpoint, args.key);
        if (!clean) throw new Error("无法保存无效 Paper Import checkpoint");
        records.set(clean.key, clean);
        return cloneJson(clean);
      },
      async clear(key) {
        records.delete(String(key));
      },
      // Test and diagnostics seam; it still returns sanitized copies.
      async entries() {
        return [...records.entries()].map(([key, value]) => [key, cloneJson(value)]);
      },
    });
  }

  function requestTransaction(db, storeName, mode, action) {
    return new Promise((resolve, reject) => {
      let request;
      let requestResult;
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error("IndexedDB 事务失败"));
      };
      try {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        request = action(store);
        request.onsuccess = () => { requestResult = request.result; };
        request.onerror = () => fail(request.error || new Error("IndexedDB 请求失败"));
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(requestResult);
        };
        transaction.onerror = () => fail(transaction.error || new Error("IndexedDB 事务失败"));
        transaction.onabort = () => fail(transaction.error || new Error("IndexedDB 事务已中止"));
      } catch (error) {
        fail(error);
      }
    });
  }

  function openDatabase(indexedDB, dbName, storeName) {
    return new Promise((resolve, reject) => {
      if (!indexedDB || typeof indexedDB.open !== "function") {
        reject(new Error("当前环境没有 IndexedDB"));
        return;
      }
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB 打开失败"));
    });
  }

  function createIndexedDbCheckpointStore({ indexedDB = root?.indexedDB, dbName = DEFAULT_DB_NAME, storeName = DEFAULT_STORE_NAME } = {}) {
    let dbPromise;
    const db = () => (dbPromise ??= openDatabase(indexedDB, dbName, storeName));
    return Object.freeze({
      async load(key) {
        const database = await db();
        const record = await requestTransaction(database, storeName, "readonly", (store) => store.get(String(key)));
        return cloneJson(sanitizeCheckpoint(record?.checkpoint ?? record ?? null, String(key)));
      },
      async save(keyOrCheckpoint, maybeCheckpoint) {
        const args = saveArgs(keyOrCheckpoint, maybeCheckpoint);
        const clean = sanitizeCheckpoint(args.checkpoint, args.key);
        if (!clean) throw new Error("无法保存无效 Paper Import checkpoint");
        const database = await db();
        await requestTransaction(database, storeName, "readwrite", (store) => store.put({ key: clean.key, checkpoint: clean }));
        return cloneJson(clean);
      },
      async clear(key) {
        const database = await db();
        await requestTransaction(database, storeName, "readwrite", (store) => store.delete(String(key)));
      },
    });
  }

  function createDefaultCheckpointStore() {
    if (root?.indexedDB && typeof root.indexedDB.open === "function") return createIndexedDbCheckpointStore();
    return createMemoryCheckpointStore();
  }

  return Object.freeze({
    CHECKPOINT_SCHEMA,
    WORKFLOW_STAGES,
    STAGE_NAMES,
    sanitizeCheckpoint,
    sanitizeStageArtifact,
    sanitizeWorkflowIdentity,
    createMemoryCheckpointStore,
    createIndexedDbCheckpointStore,
    createDefaultCheckpointStore,
  });
});
