/**
 * Entry Module — 负责提取与规整 Entry（Fact/Claim）
 * 边界：对应 CONTEXT.md Entry Module，对应 src/paper-import/entry/
 * 职责：论文 → Entry 目录（definition|algorithm|calculation / lemma|proposition|theorem）
 * 约束：与 Inference Module 分离，两条优化链独立迭代；#4 收口后此模块为 Entry 唯一入口。
 * 薄转发：根部 paper-entry-*.js 保留为 deprecated re-export，内部调用请改为此目录。
 *
 * This file is also a browser-facing deep entry point.  The browser loads the
 * UMD leaves first; Node resolves the same leaves through CommonJS.
 */
(function publishPaperEntryModule(root, factory) {
  "use strict";
  const api = factory(
    root,
    root?.CMathPaperEntryConsolidationV1
      ?? (typeof require === "function" ? require("./consolidation.js") : null),
    root?.CMathPaperEntryVerification
      ?? (typeof require === "function" ? require("./verification.js") : null),
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryModule = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperEntryModule(root, consolidation, verification) {
  "use strict";
  const MODULE_ID = "cmath.paper-import.entry/v1";
  if (!consolidation || typeof consolidation.consolidateRawEntryPool !== "function") {
    throw new Error("CMath Entry Module 缺少 consolidation 能力");
  }
  if (!verification || typeof verification.buildVerificationPrompt !== "function") {
    throw new Error("CMath Entry Module 缺少 verification 能力");
  }
  return Object.freeze({
    MODULE_ID,
    ...consolidation,
    ...verification,
  });
});
