/**
 * @file paper-entry-artifact-v1.js
 * Contract and validation helpers for the independently cacheable Entry extraction artifact.
 * Schema: cmath.paper-entry-artifact/v1
 * Module: paper-entry-extraction-v1.1
 */
(function publishPaperEntryArtifact(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryArtifactV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createPaperEntryArtifactModule(root) {
  "use strict";

  const ENTRY_ARTIFACT_SCHEMA = "cmath.paper-entry-artifact/v1";
  const ENTRY_MODULE_VERSION = "paper-entry-extraction-v1.1";
  const VALID_ENTRY_MODULE_VERSIONS = Object.freeze([
    "paper-entry-extraction-v1",
    "paper-entry-extraction-v1.1",
    "paper-entry-consolidation-v1",
    "paper-entry-consolidation-v1.1-model",
  ]);

  function stripControlCharacters(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  function isObject(val) {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  function nonEmptyString(val, label) {
    if (typeof val !== "string" || !val.trim()) {
      throw new Error(`${label} 必须是非空字符串`);
    }
    return val.trim();
  }

  const coreValidation = (typeof require === "function")
    ? require("./src/paper-import/core/validation.js")
    : ((typeof root !== "undefined" && root && root.CMathPaperCoreValidation) || null);
  if (!coreValidation || typeof coreValidation.hasBalancedMathDelimiters !== "function") {
    throw new Error("CMathPaperCoreValidation not loaded");
  }
  const { hasBalancedMathDelimiters, validateMathDelimiters } = coreValidation;

  function validateEntry(entry, index) {
    if (!isObject(entry)) {
      throw new Error(`entries[${index}] 必须是对象`);
    }
    nonEmptyString(entry.id, `entries[${index}].id`);

    if (entry.entryClass !== "fact" && entry.entryClass !== "claim") {
      throw new Error(`entries[${index}] (${entry.id}) 必须使用 entryClass=fact|claim`);
    }
    if ("type" in entry || "kind" in entry) {
      throw new Error(`entries[${index}] (${entry.id}) 正式 Entry 不能包含 type/kind 草稿别名`);
    }
    if (entry.entryClass === "fact") {
      if (!["definition", "algorithm", "calculation"].includes(entry.factKind)) {
        throw new Error(`entries[${index}] (${entry.id}) 的 factKind 必须是 definition|algorithm|calculation`);
      }
      if ("claimKind" in entry) throw new Error(`entries[${index}] (${entry.id}) 的 Fact 不能包含 claimKind`);
    } else {
      if (!["lemma", "proposition", "theorem"].includes(entry.claimKind)) {
        throw new Error(`entries[${index}] (${entry.id}) 的 claimKind 必须是 lemma|proposition|theorem`);
      }
      if ("factKind" in entry) throw new Error(`entries[${index}] (${entry.id}) 的 Claim 不能包含 factKind`);
    }

    const statement = entry.statement ?? entry.description ?? entry.content ?? "";
    if (typeof statement !== "string" || !statement.trim()) {
      throw new Error(`entries[${index}] (${entry.id}) 缺少非空数学陈述 (statement)`);
    }
    validateMathDelimiters(statement, `entries[${index}] (${entry.id}).statement`);

    if (entry.title) validateMathDelimiters(entry.title, `entries[${index}] (${entry.id}).title`);
    if (entry.name) validateMathDelimiters(entry.name, `entries[${index}] (${entry.id}).name`);
    if (entry.shortTitle) validateMathDelimiters(entry.shortTitle, `entries[${index}] (${entry.id}).shortTitle`);
  }

  /**
   * Recursively deep freeze an object to enforce immutability.
   */
  function freezePaperEntryArtifact(target) {
    if (target === null || typeof target !== "object") return target;
    const propNames = Object.getOwnPropertyNames(target);
    for (const name of propNames) {
      const value = target[name];
      if (value !== null && typeof value === "object") {
        freezePaperEntryArtifact(value);
      }
    }
    return Object.freeze(target);
  }

  /**
   * Deep clone an object using standard JSON serialization.
   */
  function cloneJson(val) {
    if (val === undefined) return undefined;
    return JSON.parse(JSON.stringify(val));
  }

  /**
   * Validates that an object conforms to the cmath.paper-entry-artifact/v1 contract.
   * Throws descriptive error on invalid inputs.
   */
  function validatePaperEntryArtifact(artifact) {
    if (!isObject(artifact)) {
      throw new Error("Paper Entry Artifact 必须是非空 JSON 对象");
    }

    // 1. Top-level schema & version
    if (artifact.schema !== ENTRY_ARTIFACT_SCHEMA) {
      throw new Error(`无效的 artifact schema: 预期 "${ENTRY_ARTIFACT_SCHEMA}"，实际收到 "${artifact.schema}"`);
    }
    if (!VALID_ENTRY_MODULE_VERSIONS.includes(artifact.entryModuleVersion)) {
      throw new Error(`无效的 entryModuleVersion: 预期 "${ENTRY_MODULE_VERSION}" 或 "paper-entry-extraction-v1"，实际收到 "${artifact.entryModuleVersion}"`);
    }

    // 2. Source information
    if (!isObject(artifact.source)) {
      throw new Error("artifact.source 必须是对象");
    }
    nonEmptyString(artifact.source.fileName, "artifact.source.fileName");
    if (!Number.isInteger(artifact.source.pageCount) || artifact.source.pageCount < 1) {
      throw new Error(`artifact.source.pageCount 必须是正整数，收到 ${artifact.source.pageCount}`);
    }
    nonEmptyString(artifact.source.sourceText, "artifact.source.sourceText");
    if (typeof artifact.source.characters !== "number" || artifact.source.characters !== artifact.source.sourceText.length) {
      throw new Error(`artifact.source.characters (${artifact.source.characters}) 与 sourceText.length (${artifact.source.sourceText.length}) 不一致`);
    }
    if (artifact.source.pageCount > 1 && !artifact.source.sourceText.includes("[[PAGE ")) {
      throw new Error("多页论文 sourceText 必须包含 [[PAGE x]] 页码标记以支持免二次读取 PDF 的下游装配");
    }

    const isConsolidation = artifact.entryModuleVersion === "paper-entry-consolidation-v1"
      || artifact.entryModuleVersion === "paper-entry-consolidation-v1.1-model";

    // 3. Paper Guide & Guide Lead Set (strict on v1/v1.1, nullable/optional on consolidation modules)
    if (!isConsolidation) {
      if (!isObject(artifact.paperGuide)) {
        throw new Error("artifact.paperGuide 必须是对象");
      }
      if (!isObject(artifact.guideLeadSet) || !Array.isArray(artifact.guideLeadSet.leads)) {
        throw new Error("artifact.guideLeadSet 必须是包含 leads 数组的对象");
      }
    } else {
      if (artifact.paperGuide !== null && artifact.paperGuide !== undefined && !isObject(artifact.paperGuide)) {
        throw new Error("artifact.paperGuide 必须是对象或 null");
      }
      if (artifact.guideLeadSet !== null && artifact.guideLeadSet !== undefined && !isObject(artifact.guideLeadSet)) {
        throw new Error("artifact.guideLeadSet 必须是对象或 null");
      }
    }

    // 4. Extraction Lanes
    if (!isConsolidation) {
      if (!isObject(artifact.lanes)) {
        throw new Error("artifact.lanes 必须是对象");
      }
      const coverageEntries = artifact.lanes.coverageEntries ?? artifact.lanes.coverage;
      const leadGuidedEntries = artifact.lanes.leadGuidedEntries ?? artifact.lanes.leadGuided;
      if (!Array.isArray(coverageEntries)) {
        throw new Error("artifact.lanes.coverageEntries 必须是数组");
      }
      if (!Array.isArray(leadGuidedEntries)) {
        throw new Error("artifact.lanes.leadGuidedEntries 必须是数组");
      }
    } else if (artifact.lanes !== null && artifact.lanes !== undefined) {
      if (!isObject(artifact.lanes)) throw new Error("artifact.lanes 必须是对象");
      const coverageEntries = artifact.lanes.coverageEntries ?? artifact.lanes.coverage;
      if (coverageEntries && !Array.isArray(coverageEntries)) throw new Error("artifact.lanes.coverageEntries 必须是数组");
    }

    // 5. Aggregation
    if (!isConsolidation) {
      if (!isObject(artifact.aggregation)) {
        throw new Error("artifact.aggregation 必须是对象");
      }
      if (!Array.isArray(artifact.aggregation.records)) {
        throw new Error("artifact.aggregation.records 必须是数组");
      }
      if (!Array.isArray(artifact.aggregation.conflicts)) {
        throw new Error("artifact.aggregation.conflicts 必须是数组");
      }
    } else if (artifact.aggregation !== null && artifact.aggregation !== undefined) {
      if (!isObject(artifact.aggregation)) throw new Error("artifact.aggregation 必须是对象");
      if (artifact.aggregation.records && !Array.isArray(artifact.aggregation.records)) throw new Error("artifact.aggregation.records 必须是数组");
    }

    // 6. Entries (the frozen integrated canonical entries)
    if (!Array.isArray(artifact.entries) || artifact.entries.length === 0) {
      throw new Error("artifact.entries 必须是非空数组");
    }
    const seenIds = new Set();
    for (let i = 0; i < artifact.entries.length; i += 1) {
      const entry = artifact.entries[i];
      validateEntry(entry, i);
      if (seenIds.has(entry.id)) {
        throw new Error(`artifact.entries 包含重复的 entry ID: "${entry.id}"`);
      }
      seenIds.add(entry.id);
    }

    // 7. Aliases
    if (!isObject(artifact.aliases)) {
      throw new Error("artifact.aliases 必须是对象");
    }
    for (const [k, v] of Object.entries(artifact.aliases)) {
      if (typeof k !== "string" || typeof v !== "string") {
        throw new Error(`artifact.aliases 键值对必须全为字符串: ${k} -> ${v}`);
      }
    }

    // 8. Review Inputs
    if (!isConsolidation) {
      if (!isObject(artifact.reviewInputs)) {
        throw new Error("artifact.reviewInputs 必须是对象");
      }
      if (!Array.isArray(artifact.reviewInputs.missingExtractionCandidates)) {
        throw new Error("artifact.reviewInputs.missingExtractionCandidates 必须是数组");
      }
      if (artifact.reviewInputs.externalEvidenceIndex !== null && !isObject(artifact.reviewInputs.externalEvidenceIndex)) {
        throw new Error("artifact.reviewInputs.externalEvidenceIndex 必须是对象或 null");
      }
      if (artifact.reviewInputs.externalBoundaryCandidates !== null && !isObject(artifact.reviewInputs.externalBoundaryCandidates)) {
        throw new Error("artifact.reviewInputs.externalBoundaryCandidates 必须是对象或 null");
      }
      if (!Array.isArray(artifact.reviewInputs.protectedClaimIds)) {
        throw new Error("artifact.reviewInputs.protectedClaimIds 必须是数组");
      }
      for (const id of artifact.reviewInputs.protectedClaimIds) {
        if (typeof id !== "string") {
          throw new Error(`artifact.reviewInputs.protectedClaimIds 元素必须为字符串，收到 ${id}`);
        }
      }
    } else if (artifact.reviewInputs !== null && artifact.reviewInputs !== undefined) {
      if (!isObject(artifact.reviewInputs)) throw new Error("artifact.reviewInputs 必须是对象");
    }

    // 9. Diagnostics
    if (!isObject(artifact.diagnostics)) {
      throw new Error("artifact.diagnostics 必须是对象");
    }
    if (typeof artifact.diagnostics.durationMs !== "number" || artifact.diagnostics.durationMs < 0) {
      throw new Error("artifact.diagnostics.durationMs 必须是非负数");
    }
    if (!Array.isArray(artifact.diagnostics.stages)) {
      throw new Error("artifact.diagnostics.stages 必须是数组");
    }
    if (!Array.isArray(artifact.diagnostics.calls)) {
      throw new Error("artifact.diagnostics.calls 必须是数组");
    }

    // 10. JSON roundtrip check
    try {
      const serialized = JSON.stringify(artifact);
      JSON.parse(serialized);
    } catch (err) {
      throw new Error(`artifact 无法进行确定性 JSON 序列化: ${err.message}`);
    }

    return true;
  }

  function cleanEntryFields(entry) {
    if (!isObject(entry)) return entry;
    const cleaned = { ...entry };
    for (const key of Object.keys(cleaned)) {
      if (typeof cleaned[key] === "string") {
        cleaned[key] = stripControlCharacters(cleaned[key]);
      }
    }
    return cleaned;
  }

  /**
   * Normalize an input object into the canonical paper-entry-artifact/v1 shape.
   */
  function normalizePaperEntryArtifact(input) {
    if (!isObject(input)) throw new Error("Input must be an object");
    const sourceText = stripControlCharacters(String(input.source?.sourceText ?? input.sourceText ?? input.text ?? ""));
    const fileName = stripControlCharacters(String(input.source?.fileName ?? input.fileName ?? "").trim());
    const pageCount = Number(input.source?.pageCount ?? input.pageCount ?? 1);
    const characters = sourceText.length;
    const targetVersion = (typeof input.entryModuleVersion === "string" && VALID_ENTRY_MODULE_VERSIONS.includes(input.entryModuleVersion))
      ? input.entryModuleVersion
      : ENTRY_MODULE_VERSION;

    const rawCoverage = Array.isArray(input.lanes?.coverageEntries)
      ? input.lanes.coverageEntries
      : (Array.isArray(input.lanes?.coverage) ? input.lanes.coverage : (Array.isArray(input.coverageEntries) ? input.coverageEntries : []));
    const rawLeadGuided = Array.isArray(input.lanes?.leadGuidedEntries)
      ? input.lanes.leadGuidedEntries
      : (Array.isArray(input.lanes?.leadGuided) ? input.lanes.leadGuided : (Array.isArray(input.leadGuidedEntries) ? input.leadGuidedEntries : []));

    const coverageEntries = rawCoverage.map(cleanEntryFields);
    const leadGuidedEntries = rawLeadGuided.map(cleanEntryFields);

    const rawRecords = Array.isArray(input.aggregation?.records)
      ? input.aggregation.records
      : (Array.isArray(input.aggregation) ? input.aggregation : []);
    const records = rawRecords.map(cleanEntryFields);
    const conflicts = Array.isArray(input.aggregation?.conflicts) ? input.aggregation.conflicts : [];
    const counts = input.aggregation?.counts || {
      coverage: coverageEntries.length,
      leadGuided: leadGuidedEntries.length,
      total: records.length,
      conflicts: conflicts.length,
    };
    const provenance = input.aggregation?.provenance || input.aggregation?.lane_provenance || null;

    const rawEntries = Array.isArray(input.entries) ? input.entries : records;
    const entries = rawEntries.map(cleanEntryFields);
    const aliases = isObject(input.aliases) ? { ...input.aliases } : {};

    const reviewInputs = {
      missingExtractionCandidates: Array.isArray(input.reviewInputs?.missingExtractionCandidates)
        ? input.reviewInputs.missingExtractionCandidates.map(cleanEntryFields)
        : (Array.isArray(input.missingExtractionCandidates) ? input.missingExtractionCandidates.map(cleanEntryFields) : []),
      externalEvidenceIndex: input.reviewInputs?.externalEvidenceIndex ?? input.externalEvidenceIndex ?? null,
      externalBoundaryCandidates: input.reviewInputs?.externalBoundaryCandidates ?? input.externalBoundaryCandidates ?? input.externalBoundaryInventory ?? null,
      protectedClaimIds: Array.isArray(input.reviewInputs?.protectedClaimIds)
        ? input.reviewInputs.protectedClaimIds
        : (Array.isArray(input.protectedClaimIds) ? input.protectedClaimIds : []),
      canonicalIndex: input.reviewInputs?.canonicalIndex ?? input.canonicalIndex ?? null,
    };

    const diagnostics = {
      durationMs: Number(input.diagnostics?.durationMs ?? input.durationMs ?? 0),
      stages: Array.isArray(input.diagnostics?.stages) ? input.diagnostics.stages : (Array.isArray(input.stages) ? input.stages : []),
      calls: Array.isArray(input.diagnostics?.calls) ? input.diagnostics.calls : (Array.isArray(input.calls) ? input.calls : []),
      reviewDiagnostics: input.diagnostics?.reviewDiagnostics ?? input.reviewDiagnostics ?? null,
      modelCallMetadata: input.diagnostics?.modelCallMetadata ?? input.modelCallMetadata ?? null,
      moduleIdentity: input.diagnostics?.moduleIdentity ?? {
        name: targetVersion,
        schema: ENTRY_ARTIFACT_SCHEMA,
        backbone: "v3.26",
      },
    };

    const artifact = {
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: targetVersion,
      source: {
        fileName,
        pageCount,
        characters,
        sourceText,
      },
      paperGuide: cloneJson(input.paperGuide ?? null),
      guideLeadSet: cloneJson(input.guideLeadSet ?? null),
      lanes: {
        coverageEntries: cloneJson(coverageEntries),
        leadGuidedEntries: cloneJson(leadGuidedEntries),
      },
      aggregation: {
        records: cloneJson(records),
        conflicts: cloneJson(conflicts),
        counts: cloneJson(counts),
        ...(provenance ? { provenance: cloneJson(provenance) } : {}),
      },
      entries: cloneJson(entries),
      aliases,
      reviewInputs: cloneJson(reviewInputs),
      diagnostics: cloneJson(diagnostics),
    };

    validatePaperEntryArtifact(artifact);
    return artifact;
  }

  /**
   * Helper to construct and freeze a valid paper entry artifact.
   */
  function createPaperEntryArtifact(options) {
    const normalized = normalizePaperEntryArtifact(options);
    return freezePaperEntryArtifact(normalized);
  }

  return Object.freeze({
    ENTRY_ARTIFACT_SCHEMA,
    ENTRY_MODULE_VERSION,
    VALID_ENTRY_MODULE_VERSIONS,
    validatePaperEntryArtifact,
    normalizePaperEntryArtifact,
    createPaperEntryArtifact,
    freezePaperEntryArtifact,
    hasBalancedMathDelimiters,
    validateMathDelimiters,
    validateEntry,
    stripControlCharacters,
  });
});
