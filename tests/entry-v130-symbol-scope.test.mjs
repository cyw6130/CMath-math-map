import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "manifold-topology.pdf",
  pageCount: 15,
  text: "[[PAGE 1]] Theorem 1.9 Let X be a 4-manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.30 prompt enforces explicit modulo scope on both terms, product/intersection symbol fidelity, and zero referential compression", () => {
  assert.equal(typeof pool.v130DualOutputPrompt, "function", "v130DualOutputPrompt must be exported");
  const p = pool.v130DualOutputPrompt(options);
  
  assert.match(p, /同余模数双向显式闭合/u);
  assert.match(p, /空间乘积与同调类运算符号保真/u);
  assert.match(p, /复合长条件零引用概括/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.30 prompt leaked ${term}`);
  }
});
