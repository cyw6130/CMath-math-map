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
