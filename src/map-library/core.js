/** Shared Map Library record rules for browser and Node consumers. */
(function publishMapLibraryCore(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMapLibraryCore = api;
})(typeof window !== "undefined" ? window : globalThis, function createMapLibraryCore(root) {
  "use strict";

  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const MAP_RECORD_SCHEMA = "cmath.local-map-record/v1";
  const GENERATED_MAP_SCHEMA = "cmath.paper-to-map-result/v1";
  let nodeCanonicalSemantics = null;

  function loadDependency(globalName, localPath) {
    if (root?.[globalName]) return root[globalName];
    if (typeof require !== "function") return null;
    return require(localPath);
  }

  function canonicalSemantics() {
    if (root?.GammaMathMapSemanticsV3) return root.GammaMathMapSemanticsV3;
    if (typeof require !== "function") return root?.GammaMathMapSemantics ?? null;
    if (nodeCanonicalSemantics) return nodeCanonicalSemantics;
    const previousGlobalSemantics = globalThis.GammaMathMapSemantics;
    try {
      nodeCanonicalSemantics = require(
        "../../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js",
      );
      return nodeCanonicalSemantics;
    } finally {
      if (previousGlobalSemantics === undefined) delete globalThis.GammaMathMapSemantics;
      else globalThis.GammaMathMapSemantics = previousGlobalSemantics;
    }
  }

  function canonicalAdapter() {
    return loadDependency("GammaCanonicalMathMapAdapter", "../../canonical-math-map-adapter.js");
  }

  function checkpointStore() {
    return loadDependency(
      "CMathPaperImportCheckpointStore",
      "../paper-import/workflow/checkpoint-store.js",
    );
  }

  function cloneJson(value) {
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function validateProjectView(data) {
    if (data?.schema !== PROJECT_VIEW_SCHEMA
      || !data.project
      || !Array.isArray(data.entries)
      || !Array.isArray(data.inferences)) {
      throw new TypeError(`expected ${PROJECT_VIEW_SCHEMA} with project, entries and inferences`);
    }
    return data;
  }

  function validateCanonicalMathMap(data) {
    const semantics = canonicalSemantics();
    if (typeof semantics?.deriveMathState !== "function") {
      throw new Error("标准数学地图 v3 校验能力没有加载");
    }
    semantics.deriveMathState(data);
    return data;
  }

  function isCanonicalMathMap(data) {
    try {
      validateCanonicalMathMap(data);
      return Object.keys(data).sort().join(",") === "b0ClaimEntryIds,entries,inferences,negationPairs";
    } catch {
      return false;
    }
  }

  function validateSupportedMap(data) {
    return isCanonicalMathMap(data) ? validateCanonicalMathMap(data) : validateProjectView(data);
  }

  function generatedMapView(value) {
    return value?.schema === GENERATED_MAP_SCHEMA ? value.map : value;
  }

  function sanitizeGeneratedResult(value) {
    if (value?.schema !== GENERATED_MAP_SCHEMA) return null;
    if (isCanonicalMathMap(value.map)) return cloneJson(value);
    const clean = checkpointStore()?.sanitizeStageArtifact?.("closure", value);
    if (clean?.schema !== GENERATED_MAP_SCHEMA || clean.map?.schema !== PROJECT_VIEW_SCHEMA) {
      throw new TypeError("论文解析结果不符合 Generated Map 合同");
    }
    return clean;
  }

  function normalizeMapRecord(record) {
    const generatedResult = record?.generatedResult === undefined
      ? null
      : sanitizeGeneratedResult(record.generatedResult);
    if (record?.generatedResult !== undefined && generatedResult?.schema !== GENERATED_MAP_SCHEMA) {
      throw new TypeError(`expected ${GENERATED_MAP_SCHEMA} generatedResult`);
    }
    const data = validateSupportedMap(generatedResult?.map ?? record?.data);
    const id = String(record?.id || `imported:${data.project?.id || "map"}`).trim();
    const title = String(record?.title || data.project?.title || id).trim();
    const numberingLedger = isCanonicalMathMap(data)
      ? canonicalAdapter()?.create(data, { projectId: id, numberingLedger: record?.numberingLedger })?.numberingLedger
      : null;
    if (isCanonicalMathMap(data) && !numberingLedger) {
      throw new Error("标准数学地图未能生成命名编号账本");
    }
    return {
      schema: MAP_RECORD_SCHEMA,
      id,
      title,
      boundaryLabel: String(record?.boundaryLabel || data.channelOptions?.boundaryLabel || "本地导入 · 数学地图").trim(),
      importedAt: Number.isFinite(record?.importedAt) ? record.importedAt : Date.now(),
      isImported: true,
      data,
      ...(numberingLedger ? { numberingLedger } : {}),
      ...(generatedResult ? { generatedResult } : {}),
    };
  }

  return Object.freeze({
    GENERATED_MAP_SCHEMA,
    MAP_RECORD_SCHEMA,
    PROJECT_VIEW_SCHEMA,
    generatedMapView,
    isCanonicalMathMap,
    normalizeMapRecord,
    sanitizeGeneratedResult,
    validateCanonicalMathMap,
    validateProjectView,
    validateSupportedMap,
  });
});
