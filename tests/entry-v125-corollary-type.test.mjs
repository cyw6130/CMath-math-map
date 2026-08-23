import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "geometry-paper.pdf",
  pageCount: 12,
  text: "[[PAGE 1]] Corollary 1.5 Let X be a 4-manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 2,
};

test("v1.25 prompt explicitly unifies corollary enum and prompt type rules", () => {
  assert.equal(typeof pool.v125DualOutputPrompt, "function", "v125DualOutputPrompt must be exported");
  const p = pool.v125DualOutputPrompt(options);
  
  assert.match(p, /type 只能是 definition\|algorithm\|calculation\|lemma\|proposition\|theorem\|corollary/u);
  assert.match(p, /原文写为 Corollary\/推论 时使用 type: "corollary"/u);
  
  // Zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.25 prompt leaked ${term}`);
  }
});
