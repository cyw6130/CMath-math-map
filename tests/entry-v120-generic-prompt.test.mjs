import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "generic-math-paper.pdf",
  pageCount: 10,
  text: "[[PAGE 1]] Corollary 1.2 Let M be a manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 2,
};

test("v1.20 prompt is strictly generic and contains no case-specific leakage", () => {
  const p = pool.v120DualOutputPrompt(options);
  assert.match(p, /严格推论区分/u);
  assert.match(p, /外部基础命题完整提取/u);
  
  for (const term of ["Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding", "Bauer", "Taubes"]) {
    assert.equal(p.includes(term), false, `v1.20 prompt leaked ${term}`);
  }
});
