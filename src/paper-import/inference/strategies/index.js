(function publishIndex(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportStrategyIndex = api;
})(typeof window !== "undefined" ? window : globalThis, function createIndex(root) {
  "use strict";
  const load = (version) => {
    const registry = root?.CMathPaperImportStrategies?.[version];
    if (typeof registry === "string") return registry;
    if (typeof require === "function") {
      try { const mod = require(`./${version}.js`); if (typeof mod === "string") return mod; } catch {}
    }
    return "";
  };
  return Object.freeze({
    sectionFor(version) {
      if (typeof version !== "string" || !version) return "";
      return load(version);
    },
  });
});
