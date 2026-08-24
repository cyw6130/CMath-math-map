(function publishMineruModule(root, factory) {
  "use strict";
  const marked = root?.CMathMineruMarkedMarkdown
    ?? (typeof require === "function" ? require("./marked-markdown.js") : null);
  let client = root?.CMathMineruClient ?? null;
  if (!client && typeof require === "function") {
    try { client = require("./client.js"); } catch { client = null; }
  }
  const api = factory(marked, client);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportMineru = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createMineruModule(marked, client) {
  "use strict";
  if (!marked || typeof marked.buildMarkedMarkdown !== "function") {
    throw new Error("MinerU marked Markdown 能力没有加载");
  }
  return Object.freeze({
    MODULE_ID: "cmath.paper-import.mineru/v1",
    buildMarkedMarkdown: marked.buildMarkedMarkdown,
    createMineruClient: client?.createMineruClient,
  });
});
