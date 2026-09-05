import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "geometry-paper.pdf",
  pageCount: 12,
  text: "[[PAGE 1]] Corollary 1.5 Let X be a 4-manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 2,
};

test("v1.24 prompt enforces strict corollary labeling without promotion to theorem", () => {
  assert.equal(typeof pool.v124DualOutputPrompt, "function", "v124DualOutputPrompt must be exported");
  const p = pool.v124DualOutputPrompt(options);
  
  assert.match(p, /严格推论身份保真/u);
  assert.match(p, /不得将推论直接升格为主定理/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.24 prompt leaked ${term}`);
  }
});
