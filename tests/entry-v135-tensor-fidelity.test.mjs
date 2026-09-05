import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "4d-skein-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] Theorem: The gluing map gives an isomorphism of bimodule tensor products...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.35 prompt enforces balanced-tensor and algebra-action notation fidelity with zero hallucination", () => {
  assert.equal(typeof pool.v135DualOutputPrompt, "function", "v135DualOutputPrompt must be exported");
  const p = pool.v135DualOutputPrompt(options);

  assert.match(p, /平衡张量积与作用代数记号逐字保真/u);
  assert.match(p, /严禁添加源文献未陈述的额外边界或代数条件/u);

  // Inherited v1.34 + v1.31 rules
  assert.match(p, /前提条件清单与命名关键性质独立提取/u);
  assert.match(p, /充要条件与代数拓扑约束零丢失/u);

  // Strict zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.35 prompt leaked ${term}`);
  }
});
