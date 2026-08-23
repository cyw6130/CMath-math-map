import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "manifold-algebra.pdf",
  pageCount: 15,
  text: "[[PAGE 1]] Theorem 2.7 (due to Smith [12]) ...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.29 prompt enforces strict external citation tagging and explicit modulo scope for every congruence term", () => {
  assert.equal(typeof pool.v129DualOutputPrompt, "function", "v129DualOutputPrompt must be exported");
  const p = pool.v129DualOutputPrompt(options);
  
  assert.match(p, /外部归属强制标注/u);
  assert.match(p, /多同余条件双向闭合/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.29 prompt leaked ${term}`);
  }
});
