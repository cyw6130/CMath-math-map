import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "pure-math-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] Theorem 1.1 Let X be a smooth manifold and alpha a nontorsion class...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.31 prompt enforces deep mathematical substance, necessary-and-sufficient condition preservation, and complete proof-chain coverage", () => {
  assert.equal(typeof pool.v131DualOutputPrompt, "function", "v131DualOutputPrompt must be exported");
  const p = pool.v131DualOutputPrompt(options);
  
  assert.match(p, /充要条件与代数拓扑约束零丢失/u);
  assert.match(p, /经典外部定理的实质断言完整性/u);
  assert.match(p, /支撑主定理的底层关键构造独立提取/u);
  
  // Strict zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.31 prompt leaked ${term}`);
  }
});

test("v1.31 prompt requests the canonical Fact and Claim entry format", () => {
  const p = pool.v131DualOutputPrompt(options);

  assert.match(p, /entryClass.*fact.*claim/u);
  assert.match(p, /factKind.*definition\|algorithm\|calculation/u);
  assert.match(p, /claimKind.*lemma\|proposition\|theorem/u);
  assert.match(p, /"entryClass":"fact".*"factKind":"definition"/u);
  assert.match(p, /"entryClass":"claim".*"claimKind":"theorem"/u);
  assert.doesNotMatch(p, /"type"\s*:/u);
});
