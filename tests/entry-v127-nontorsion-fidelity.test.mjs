import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "manifold-algebra.pdf",
  pageCount: 15,
  text: "[[PAGE 1]] Let alpha be a nontorsion homology class...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.27 prompt enforces algebraic torsion fidelity, foundational structure extraction, and product/intersection preservation", () => {
  assert.equal(typeof pool.v127DualOutputPrompt, "function", "v127DualOutputPrompt must be exported");
  const p = pool.v127DualOutputPrompt(options);
  
  assert.match(p, /挠性与代数性质逐字保真/u);
  assert.match(p, /核心研究实体独立建定义/u);
  assert.match(p, /双同调\/张量运算符号保真/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.27 prompt leaked ${term}`);
  }
});
