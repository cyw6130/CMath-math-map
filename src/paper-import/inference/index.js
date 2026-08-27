/**
 * Inference Module — canonical public facade for Inference assembly.
 *
 * The lifecycle implementation remains private to this facade so consumers
 * receive one stable, explicit API surface.
 */
(function publishCMathPaperInferenceModule(root, factory) {
  "use strict";
  const lifecycle = root?.CMathPaperInferenceLifecycle
    ?? (typeof require === "function" ? require("./lifecycle.js") : null);
  const api = factory(lifecycle);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperInferenceModule = api;
})(typeof window !== "undefined" ? window : globalThis, function createCMathPaperInferenceModule(lifecycle) {
  "use strict";

  if (!lifecycle
    || typeof lifecycle.assemblyPrompt !== "function"
    || typeof lifecycle.paperProjectView !== "function"
    || typeof lifecycle.findOpenClaims !== "function"
    || typeof lifecycle.requestPaperInferenceFromEntryArtifact !== "function") {
    throw new Error("CMath Inference Module 缺少 lifecycle 能力");
  }

  const MODULE_ID = "cmath.paper-import.inference/v1";
  return Object.freeze({
    MODULE_ID,
    assemblyPrompt: lifecycle.assemblyPrompt,
    paperProjectView: lifecycle.paperProjectView,
    findOpenClaims: lifecycle.findOpenClaims,
    requestPaperInferenceFromEntryArtifact: lifecycle.requestPaperInferenceFromEntryArtifact,
  });
});
