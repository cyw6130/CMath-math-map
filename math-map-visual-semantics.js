/**
 * @cmath-provenance
 * @package math-map-visual-semantics-v1
 * @version v1
 * @canonicalSource packages/math-map/presentation/math-map-visual-semantics-v1/src/index.js
 * @contentHash sha256:ad805038e9aab4e0d83ea731b16edbd0cea150b19f52ad264621a014a846c20d
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
/* Stable visual projection for Gamma mathematical maps.
   This module reads semantic fields; it never decides mathematical truth. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathMapVisualSemantics = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const CAPABILITY_ID = "cmath-gamma.math-map-visual-semantics/v1";
  const DEFAULT_PALETTE = Object.freeze({
    background: "#0C1220",
    entryFill: "#D9A83F",
    entryStroke: "#E6EDF5",
    entryTitle: "#E6EDF5",
    factFill: "#8E9AAA",
    factStroke: "#D8DEE7",
    claimOpenFill: "#0C1220",
    claimOpenStroke: "#E58BA7",
    claimOpenTitle: "#F0A8BC",
    claimEstablishedFill: "#67CDB0",
    claimEstablishedStroke: "#E5F8F1",
    claimEstablishedTitle: "#91E0C9",
    inferenceFill: "#A793F0",
    inferenceStroke: "#D6CCFF",
    inferenceTitle: "#D6CCFF",
    foundationStroke: "#070A10",
    focusHalo: "rgba(117,174,235,.5)",
    focusTitle: "#A9CDF5",
    premiseStroke: "rgba(141,160,184,.55)",
    conclusionStroke: "#7FA8D9",
  });

  const CSS_TOKENS = Object.freeze({
    background: "--board",
    entryFill: "--math-map-entry",
    entryStroke: "--math-map-entry-stroke",
    entryTitle: "--math-map-entry-title",
    factFill: "--math-map-fact",
    factStroke: "--math-map-fact-stroke",
    claimOpenFill: "--board",
    claimOpenStroke: "--math-map-claim-open",
    claimOpenTitle: "--math-map-claim-open-title",
    claimEstablishedFill: "--math-map-claim-established",
    claimEstablishedStroke: "--math-map-claim-established-stroke",
    claimEstablishedTitle: "--math-map-claim-established-title",
    inferenceFill: "--math-map-inference",
    inferenceStroke: "--math-map-inference-stroke",
    inferenceTitle: "--math-map-inference-title",
    foundationStroke: "--math-map-foundation",
    focusHalo: "--math-map-focus-halo",
    focusTitle: "--math-map-focus-title",
    premiseStroke: "--math-map-premise",
    conclusionStroke: "--math-map-conclusion",
  });

  const LEGEND_ITEMS = Object.freeze([
    Object.freeze({ id: "fact", label: "Fact", shape: "circle", treatment: "filled-muted" }),
    Object.freeze({ id: "claim-open", label: "开放 Claim", shape: "circle", treatment: "ring" }),
    Object.freeze({ id: "claim-established", label: "已建立 Claim", shape: "circle", treatment: "filled" }),
    Object.freeze({ id: "inference", label: "Inference", shape: "diamond", treatment: "operation" }),
    Object.freeze({ id: "foundation", label: "B₀ · 基础 Claim", shape: "circle", treatment: "outer-ring" }),
    Object.freeze({ id: "focus", label: "当前目标", shape: "circle", treatment: "halo" }),
  ]);

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function claimEstablishedProgress(node = {}) {
    const raw = Number.isFinite(node.claimVisualEstablished)
      ? node.claimVisualEstablished
      : (node.isEstablished || (node.claimState ?? node.status) === "established" ? 1 : 0);
    return clamp(raw, 0, 1);
  }

  function classifyNode(node = {}) {
    const isInference = node.nodeKind === "inference";
    const isFact = !isInference && Boolean(node.isFact);
    const isClaim = !isInference && Boolean(node.isClaim);
    const establishedProgress = isClaim ? claimEstablishedProgress(node) : 0;
    return Object.freeze({
      role: isInference ? "inference" : isFact ? "fact" : isClaim ? "claim" : "entry",
      shape: isInference ? "diamond" : "circle",
      isInference,
      isFact,
      isClaim,
      claimState: isClaim ? (establishedProgress >= 0.5 ? "established" : "open") : null,
      establishedProgress,
      operationKind: isInference && node.operationKind === "organization" ? "organization" : (isInference ? "proof" : null),
      isFoundation: isClaim && Boolean(node.isBaseClaim || node.isFoundation || node.isClaimSeed),
      isBaseClaim: isClaim && Boolean(node.isBaseClaim || node.isFoundation || node.isClaimSeed),
      isFocused: Boolean(node.isActiveTarget),
    });
  }

  function paletteFromCss(cssValue) {
    const read = typeof cssValue === "function" ? cssValue : () => "";
    return Object.fromEntries(Object.entries(CSS_TOKENS).map(([key, token]) => [key, read(token) || DEFAULT_PALETTE[key]]));
  }

  return Object.freeze({
    CAPABILITY_ID,
    DEFAULT_PALETTE,
    CSS_TOKENS,
    LEGEND_ITEMS,
    classifyNode,
    claimEstablishedProgress,
    paletteFromCss,
  });
});
