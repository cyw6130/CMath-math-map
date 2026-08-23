/**
 * @cmath-provenance
 * @package math-rendering-v1
 * @version v1
 * @canonicalSource packages/math-map/rendering/math-rendering-v1/browser-assets/math-rendering-loader.js
 * @contentHash sha256:efe17847852974e4722b1af571d7f1aaa4a3ba9dd56a77760b53a8b0ada47f15
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
/* Loads the versioned Gamma Math Rendering capability on any frontend page. */
(() => {
  "use strict";

  const capabilityId = "cmath-gamma.math-rendering/v1";
  const currentScript = document.currentScript;
  const baseUrl = new URL(".", currentScript?.src || document.baseURI);

  function ensureStylesheet() {
    const href = new URL("vendor/katex/katex.min.css", baseUrl).href;
    if (document.querySelector(`link[href="${href}"], link[href$="vendor/katex/katex.min.css"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.gammaMathAsset = "katex-css";
    document.head.appendChild(link);
  }

  function loadScript(path, ready) {
    if (ready()) return Promise.resolve();
    const src = new URL(path, baseUrl).href;
    const existing = [...document.scripts].find((script) => script.src === src);
    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      const finish = () => ready() ? resolve() : reject(new Error(`Gamma math asset did not initialize: ${path}`));
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error(`Gamma math asset failed to load: ${path}`)), { once: true });
      if (!existing) {
        script.src = src;
        script.dataset.gammaMathAsset = path;
        document.head.appendChild(script);
      }
    });
  }

  function mountDeclarativeMath() {
    const render = (root) => window.GammaMath?.renderAll(root);
    const start = () => {
      render(document);
      if (!window.MutationObserver) return;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) render(node);
        }));
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }

  ensureStylesheet();
  const ready = loadScript("vendor/katex/katex.min.js", () => Boolean(window.katex))
    .then(() => loadScript("math-text.js", () => window.GammaMath?.capabilityId === capabilityId))
    .then(() => {
      mountDeclarativeMath();
      return window.GammaMath;
    });

  window.GammaMathRendering = Object.freeze({ capabilityId, version: "v1", ready });
})();
