import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "geometry-paper.pdf",
  pageCount: 12,
  text: "[[PAGE 1]] Theorem 1.9 ...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 2,
};

test("v1.26 prompt enforces explicit modular scope on both variables and requires foundational geometric/algebraic structures", () => {
  assert.equal(typeof pool.v126DualOutputPrompt, "function", "v126DualOutputPrompt must be exported");
  const p = pool.v126DualOutputPrompt(options);
  
  assert.match(p, /同余模数作用域显式闭合/u);
  assert.match(p, /基础几何\/代数结构独立抽取/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.26 prompt leaked ${term}`);
  }
});
