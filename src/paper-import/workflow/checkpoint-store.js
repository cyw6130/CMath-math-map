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
      .replace(/(["'](?:api[_-]?key|authorization|token|secret)["']\s*:\s*["'])[^"']*(["'])/giu, "$1[redacted]$2")
      .replace(/\b(api[_-]?key|authorization|token|secret)\s*[:=]\s*\S+/giu, "$1=[redacted]")
      .slice(0, maxLength);
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
    const result = pick(pool, ["schema", "extractionModuleVersion", "inferenceHints"]);
    const source = own(pool, "source");
    result.source = pick(source, ["fileName", "pageCount", "characters", "sourceText"]);
    if (Array.isArray(pool.chunks)) {
      result.chunks = pool.chunks.map((chunk) => {
        const clean = pick(chunk, ["chunkIndex", "pageRange", "characterCount", "text"]);
        clean.rawEntries = Array.isArray(chunk?.rawEntries)
          ? chunk.rawEntries.map(sanitizeEntry).filter(Boolean)
          : [];
        if (Array.isArray(chunk?.inferenceHints)) clean.inferenceHints = cloneJson(chunk.inferenceHints);
        return clean;
      });
    }
    if (Array.isArray(pool.rawEntries)) result.rawEntries = pool.rawEntries.map(sanitizeEntry).filter(Boolean);
    if (Array.isArray(pool.unresolvedItems)) result.unresolvedItems = sanitizeUnresolvedItems(pool.unresolvedItems);
    if (Array.isArray(result.inferenceHints)) {
      result.inferenceHints = result.inferenceHints.map((hint) => pick(hint, [
        "premiseRefs", "conclusionRef", "relationText", "page", "_provenance",
      ]));
    }
    return result;
  }

  function sanitizeEntryArtifact(artifact) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return null;
    const result = pick(artifact, [
      "schema", "entryModuleVersion", "paperGuide", "guideLeadSet", "aliases", "caseId",
    ]);
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
      result.aggregation = pick(artifact.aggregation, ["records", "conflicts", "counts"]);
      if (Array.isArray(artifact.aggregation.records)) {
        result.aggregation.records = artifact.aggregation.records.map(sanitizeEntry).filter(Boolean);
      }
    }
    if (artifact.reviewInputs && typeof artifact.reviewInputs === "object") {
      result.reviewInputs = pick(artifact.reviewInputs, [
        "missingExtractionCandidates", "externalEvidenceIndex", "externalBoundaryCandidates",
        "protectedClaimIds", "canonicalIndex",
      ]);
    }
    // Diagnostics are useful for display but may contain transport metadata.
    // Keep only counters and module identity, never model call records.
    if (artifact.diagnostics && typeof artifact.diagnostics === "object") {
      result.diagnostics = pick(artifact.diagnostics, [
        "durationMs", "deduplicated", "consolidationSummary", "moduleIdentity",
      ]);
      result.diagnostics.stages = Array.isArray(artifact.diagnostics.stages)
        ? artifact.diagnostics.stages.map((stage) => pick(stage, ["stage", "atMs"]))
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
      result.channelOptions = pick(view.channelOptions, ["schema", "projectId", "boundaryLabel", "adapterOptions"]);
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
    return result;
  }

  function sanitizeSourceAnnotations(layer) {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) return { items: [] };
    const result = {};
    if (layer.source && typeof layer.source === "object") {
      result.source = pick(layer.source, ["fileName", "pageCount"]);
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
    return items.filter((item) => (
      item && typeof item === "object" && !Array.isArray(item)
      && ["sourceStage", "candidateSummary", "failureCategory", "validationError"]
        .every((field) => typeof item[field] === "string" && item[field].trim())
      && typeof item.retryable === "boolean"
    )).map((item) => {
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
      return clean;
    });
  }

  function sanitizePaperToMapResult(result) {
    if (result?.schema !== "cmath.paper-to-map-result/v1") return null;
    const clean = pick(result, ["schema", "status"]);
    clean.map = sanitizeProjectView(result.map);
    clean.sourceAnnotations = sanitizeSourceAnnotations(result.sourceAnnotations);
    clean.unresolvedItems = sanitizeUnresolvedItems(result.unresolvedItems);
    clean.diagnostics = pick(result.diagnostics, [
      "mainTargetIdentified", "openClaimCount", "mainProofChainComplete", "missingStages",
    ]);
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
          ? result.identity.contentFingerprint
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
      if (["string", "number", "boolean"].includes(typeof value) || value === null) result[key] = value;
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
      contentFingerprint: typeof checkpoint.contentFingerprint === "string" ? checkpoint.contentFingerprint : "",
      frozenWorkflow: sanitizeWorkflowIdentity(checkpoint.frozenWorkflow),
      stages: {},
      updatedAt: typeof checkpoint.updatedAt === "string" ? checkpoint.updatedAt : new Date().toISOString(),
    };
    if (checkpoint.input && typeof checkpoint.input === "object") {
      result.input = pick(checkpoint.input, ["fileName", "byteLength", "contentFingerprint"]);
    } else {
      result.input = { contentFingerprint: result.contentFingerprint };
    }
    const stages = checkpoint.stages && typeof checkpoint.stages === "object" ? checkpoint.stages : {};
    for (const stage of WORKFLOW_STAGES) {
      const record = stages[stage];
      if (!record || typeof record !== "object") continue;
      const clean = pick(record, ["status", "attempt", "updatedAt"]);
      if (["running", "complete", "failed"].includes(clean.status)) {
        if (clean.status === "complete") {
          const artifact = sanitizeStageArtifact(stage, record.artifact);
          if (artifact !== null) clean.artifact = artifact;
        }
        if (clean.status === "failed" && record.error && typeof record.error === "object") {
          clean.error = pick(record.error, ["message", "code"]);
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
        return cloneJson(record?.checkpoint ?? record ?? null);
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
