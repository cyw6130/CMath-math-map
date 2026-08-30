/** Production capability assembly for the static browser host. */
(function publishCapabilityRuntime(hostRoot, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (hostRoot) hostRoot.CMathCapabilityRuntime = api;
})(typeof window !== "undefined" ? window : globalThis, function createCapabilityRuntimeModule() {
  "use strict";

  const RUNTIME_ID = "cmath.capability-runtime/v1";
  const PAPER_IMPORT_ID = "cmath.paper-import.production/v1";
  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const PROJECT_ADAPTER_ID = "cmath-gamma.alpha-project-adapter/v0.2";
  const SEMANTICS_ID = "cmath-gamma.math-map-semantics/v3";
  const MATH_STATE_CONTRACT = "cmath.math-map-state/v3";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  let archiveAdapterPromise;

  function requireMethod(owner, method, label) {
    if (typeof owner?.[method] !== "function") {
      throw new Error(`Capability Runtime 缺少 ${label}.${method}()`);
    }
  }

  function requireIdentity(actual, expected, label) {
    if (actual !== expected) {
      throw new Error(`Capability Runtime 拒绝不兼容的 ${label}：${actual ?? "未声明身份"}`);
    }
  }

  function createCapabilityRuntime({ root } = {}) {
    if (!root || typeof root !== "object") throw new TypeError("Capability Runtime 需要浏览器 root");

    const paperImport = root.CMathPaperImportProductionFacade;
    requireIdentity(paperImport?.MODULE_ID, PAPER_IMPORT_ID, "Paper Import");
    requireMethod(paperImport, "endpointUrl", "paperImport");
    requireMethod(paperImport, "requestPaperProductionImport", "paperImport");

    async function modelFetch(targetUrl, init) {
      if (!LOCAL_HOSTS.has(String(root.location?.hostname ?? ""))) return root.fetch(targetUrl, init);
      const auth = init?.headers?.Authorization;
      const apiKey = typeof auth === "string" ? auth.replace(/^Bearer\s+/iu, "").trim() : "";
      let body = null;
      if (typeof init?.body === "string") {
        try { body = JSON.parse(init.body); } catch { /* forward raw body */ }
      }
      const response = await root.fetch("/api/model-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: String(targetUrl), apiKey, body: body ?? init?.body ?? null }),
      });
      const ResponseConstructor = root.Response ?? globalThis.Response;
      return new ResponseConstructor(await response.text(), {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8" },
      });
    }

    const core = root.CMathMapLibraryCore;
    requireIdentity(core?.PROJECT_VIEW_SCHEMA, PROJECT_VIEW_SCHEMA, "Map Library Project View");
    for (const method of [
      "generatedMapView",
      "isCanonicalMathMap",
      "mergeLibraryBackup",
      "normalizeLibraryState",
      "sanitizeGeneratedResult",
    ]) requireMethod(core, method, "mapLibrary");

    const lifecycle = root.CMathMapLibraryLifecycle;
    for (const method of [
      "createHttpMapLibraryAdapter",
      "createIndexedDbMapLibraryAdapter",
      "createMapLibrary",
    ]) requireMethod(lifecycle, method, "mapLibrary");

    const canonicalSemantics = root.GammaMathMapSemanticsV3;
    requireIdentity(canonicalSemantics?.CAPABILITY_ID, SEMANTICS_ID, "Math Map Semantics");
    requireMethod(canonicalSemantics, "deriveMathState", "mapRuntime.canonicalSemantics");
    const semantics = root.GammaMathMapSemantics;
    requireMethod(semantics, "computeClaimClosure", "mapRuntime.semantics");
    const contentLoader = root.GammaMathMapContentLoader;
    requireIdentity(contentLoader?.PROJECT_VIEW_SCHEMA, PROJECT_VIEW_SCHEMA, "Math Map Content Loader");
    requireMethod(contentLoader, "load", "mapRuntime.contentLoader");
    const projectAdapter = root.GammaMathMapProjectAdapter;
    requireIdentity(projectAdapter?.CAPABILITY_ID, PROJECT_ADAPTER_ID, "Project View Adapter");
    requireMethod(projectAdapter, "create", "mapRuntime.projectAdapter");
    const canonicalAdapter = root.GammaCanonicalMathMapAdapter;
    requireMethod(canonicalAdapter, "create", "mapRuntime.canonicalAdapter");
    const productFocusPresentation = root.CMathProductFocusPresentation;
    requireMethod(productFocusPresentation, "installProductFocusPresentation", "mapRuntime.productFocusPresentation");
    const genericPreviewLoader = root.GammaGenericMathMapPreviewLoader;
    requireMethod(genericPreviewLoader, "loadFile", "mapRuntime.genericPreviewLoader");

    async function projectArchiveToMathState(archive) {
      archiveAdapterPromise ??= import("../../capabilities/runtime/packages/math-map/synchronization/archive-math-state-adapter-v1/src/index.mjs");
      const archiveAdapter = await archiveAdapterPromise;
      requireIdentity(
        archiveAdapter.ARCHIVE_MATH_STATE_ADAPTER_CONTRACT?.stateContract,
        MATH_STATE_CONTRACT,
        "Archive Math State Adapter",
      );
      requireMethod(archiveAdapter, "projectArchiveToMathState", "mapRuntime.archiveAdapter");
      return archiveAdapter.projectArchiveToMathState(archive);
    }

    const hostname = String(root.location?.hostname ?? "");
    const adapter = LOCAL_HOSTS.has(hostname)
      ? lifecycle.createHttpMapLibraryAdapter()
      : lifecycle.createIndexedDbMapLibraryAdapter({
        onError: (error) => root.console?.warn?.("IndexedDB 操作失败，继续使用当前会话缓存:", error),
      });
    const library = lifecycle.createMapLibrary({
      adapter,
      onError(stage, error) {
        const label = stage === "load-state" ? "地图库组织状态" : "数学地图库";
        root.console?.warn?.(`无法读取${label}，继续使用当前会话缓存:`, error);
      },
    });
    for (const method of ["deleteMap", "load", "mergeMaps", "saveMap", "saveMaps", "saveState"]) {
      requireMethod(library, method, "mapLibrary");
    }

    return Object.freeze({
      id: RUNTIME_ID,
      paperImport: Object.freeze({ ...paperImport, fetch: modelFetch }),
      mapLibrary: Object.freeze({ ...core, ...library }),
      mapRuntime: Object.freeze({
        canonicalAdapter,
        canonicalSemantics,
        contentLoader,
        genericPreviewLoader,
        projectArchiveToMathState,
        productFocusPresentation,
        projectAdapter,
        semantics,
      }),
    });
  }

  return Object.freeze({ RUNTIME_ID, createCapabilityRuntime });
});
