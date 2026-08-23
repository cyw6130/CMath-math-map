import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "pure-math-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] We always work with theories that satisfy these minimal conditions: ...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.34 prompt enforces extraction of prose-stated condition lists and named key properties", () => {
  assert.equal(typeof pool.v134DualOutputPrompt, "function", "v134DualOutputPrompt must be exported");
  const p = pool.v134DualOutputPrompt(options);

  assert.match(p, /前提条件清单与命名关键性质独立提取/u);
  assert.match(p, /不得因这些内容没有编号标签而当作背景叙述跳过/u);

  // Inherited v1.31 mathematical-substance rules (base is v1.31)
  assert.match(p, /充要条件与代数拓扑约束零丢失/u);

  // Strict zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.34 prompt leaked ${term}`);
  }
});
