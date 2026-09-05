import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "pure-math-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] Lemma 2.3 (handle-slide invariance) ... proof of the main theorem invokes ...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.32 prompt enforces standalone extraction of proof-invoked infrastructure lemmas and attributed background constructions", () => {
  assert.equal(typeof pool.v132DualOutputPrompt, "function", "v132DualOutputPrompt must be exported");
  const p = pool.v132DualOutputPrompt(options);

  assert.match(p, /证明基础设施独立提取/u);
  assert.match(p, /证明过程中被显式调用或显式验证的命名引理/u);
  assert.match(p, /不得当作证明细节跳过/u);

  // v1.31 mathematical-substance rules must be inherited (base is v1.31)
  assert.match(p, /充要条件与代数拓扑约束零丢失/u);

  // Strict zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.32 prompt leaked ${term}`);
  }
});
