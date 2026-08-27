/**
 * @deprecated 薄转发 — 已迁至 src/paper-import/entry/artifact.js
 * 保留根部路径以兼容旧引入，内部调用请改为 canonical Entry Module 路径。
 */
(function publishLegacyPaperEntryArtifact(root) {
  "use strict";

  const isCommonJs = typeof module === "object" && module.exports;
  const api = isCommonJs
    ? require("./src/paper-import/entry/artifact.js")
    : (root && root.CMathPaperEntryArtifact);

  if (!api) {
    throw new Error("CMathPaperEntryArtifact not loaded");
  }
  if (isCommonJs) module.exports = api;
  if (root) root.CMathPaperEntryArtifactV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
