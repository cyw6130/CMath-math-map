import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "topology-paper.pdf",
  pageCount: 10,
  text: "[[PAGE 1]] Theorem 2.7 Let X be a 4-manifold satisfying conditions (1)-(3)...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 2,
};

test("v1.23 prompt enforces explicit expansion of multi-part hypotheses and forbids vague referential shortcuts", () => {
  assert.equal(typeof pool.v123DualOutputPrompt, "function", "v123DualOutputPrompt must be exported");
  const p = pool.v123DualOutputPrompt(options);
  
  assert.match(p, /禁止概括省略长复合条件/u);
  assert.match(p, /严禁写成“见原文条件”/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.23 prompt leaked ${term}`);
  }
});
