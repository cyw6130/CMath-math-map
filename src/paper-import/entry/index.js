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
    root?.CMathPaperEntryArtifact
      ?? (typeof require === "function" ? require("./artifact.js") : null),
    root?.CMathPaperEntryLifecycle
      ?? (typeof require === "function" ? require("./lifecycle.js") : null),
    root?.CMathPaperEntryConsolidationV1
      ?? (typeof require === "function" ? require("./consolidation.js") : null),
    root?.CMathPaperEntryVerification
      ?? (typeof require === "function" ? require("./verification.js") : null),
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryModule = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperEntryModule(root, artifact, lifecycle, consolidation, verification) {
  "use strict";
  const MODULE_ID = "cmath.paper-import.entry/v1";
  if (!artifact || typeof artifact.createPaperEntryArtifact !== "function") {
    throw new Error("CMath Entry Module 缺少 artifact 能力");
  }
  if (!lifecycle || typeof lifecycle.requestPaperEntryArtifact !== "function") {
    throw new Error("CMath Entry Module 缺少 lifecycle 能力");
  }
  if (!consolidation || typeof consolidation.consolidateRawEntryPool !== "function") {
    throw new Error("CMath Entry Module 缺少 consolidation 能力");
  }
  if (!verification || typeof verification.buildVerificationPrompt !== "function") {
    throw new Error("CMath Entry Module 缺少 verification 能力");
  }
  return Object.freeze({
    MODULE_ID,
    ENTRY_ARTIFACT_SCHEMA: artifact.ENTRY_ARTIFACT_SCHEMA,
    ENTRY_MODULE_VERSION: artifact.ENTRY_MODULE_VERSION,
    VALID_ENTRY_MODULE_VERSIONS: artifact.VALID_ENTRY_MODULE_VERSIONS,
    validatePaperEntryArtifact: artifact.validatePaperEntryArtifact,
    normalizePaperEntryArtifact: artifact.normalizePaperEntryArtifact,
    createPaperEntryArtifact: artifact.createPaperEntryArtifact,
    freezePaperEntryArtifact: artifact.freezePaperEntryArtifact,
    hasBalancedMathDelimiters: artifact.hasBalancedMathDelimiters,
    validateMathDelimiters: artifact.validateMathDelimiters,
    validateEntry: artifact.validateEntry,
    stripControlCharacters: artifact.stripControlCharacters,
    canonicalizeEntry: artifact.canonicalizeEntry,
    ENTRY_LIFECYCLE_MODULE_ID: lifecycle.ENTRY_LIFECYCLE_MODULE_ID,
    entryReviewPrompt: lifecycle.entryReviewPrompt,
    applyEntryReviewPatches: lifecycle.applyEntryReviewPatches,
    requestPaperEntryArtifact: lifecycle.requestPaperEntryArtifact,
    CONSOLIDATION_MODULE_VERSION: consolidation.CONSOLIDATION_MODULE_VERSION,
    RAW_ENTRY_POOL_SCHEMA: consolidation.RAW_ENTRY_POOL_SCHEMA,
    consolidateRawEntryPool: consolidation.consolidateRawEntryPool,
    normalizeEntryType: consolidation.normalizeEntryType,
    FACT_KINDS: verification.FACT_KINDS,
    CLAIM_KINDS: verification.CLAIM_KINDS,
    buildVerificationPrompt: verification.buildVerificationPrompt,
    buildB0BackfillPrompt: verification.buildB0BackfillPrompt,
    applyPatch: verification.applyPatch,
    runVerificationPipeline: verification.runVerificationPipeline,
  });
});
