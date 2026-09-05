import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "manifold-algebra.pdf",
  pageCount: 15,
  text: "[[PAGE 1]] Lemma 3.1 Let X be a manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.28 prompt enforces strict unique deterministic ID naming without duplicate collision", () => {
  assert.equal(typeof pool.v128DualOutputPrompt, "function", "v128DualOutputPrompt must be exported");
  const p = pool.v128DualOutputPrompt(options);
  
  assert.match(p, /条目 ID 严格唯一性/u);
  assert.match(p, /严禁输出相同 ID 的多条条目/u);
  assert.match(p, /结构化命名模式/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.28 prompt leaked ${term}`);
  }
});
