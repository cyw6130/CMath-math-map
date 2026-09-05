import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "pure-math-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] Lemma 5.2 (invariance under handle slides) We prove that ...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.33 prompt enforces lane discipline: self-proven invariance lemmas go to resultEntries, only cited results go to foundation", () => {
  assert.equal(typeof pool.v133DualOutputPrompt, "function", "v133DualOutputPrompt must be exported");
  const p = pool.v133DualOutputPrompt(options);

  assert.match(p, /双通道归属纪律/u);
  assert.match(p, /本文自己给出证明的断言（含不变性验证、约化步骤、规范性引理）一律放入 resultEntries/u);
  assert.match(p, /只有本文引用而未证明的外部结果才放入 foundationEntries/u);

  // Inherited v1.31 + v1.32 rules
  assert.match(p, /充要条件与代数拓扑约束零丢失/u);
  assert.match(p, /证明基础设施独立提取/u);

  // Strict zero-leakage assertion
  for (const term of [
    "Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding",
    "Bauer", "Taubes", "Froyshov", "Banyaga", "Skein", "Ren-Willis", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.33 prompt leaked ${term}`);
  }
});
