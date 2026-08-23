import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "algebra-topology-paper.pdf",
  pageCount: 15,
  text: "[[PAGE 1]] Let M be an A-bimodule...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.21 prompt enforces base algebra fidelity and forbids ungrounded computation", () => {
  const p = pool.v121DualOutputPrompt(options);
  assert.match(p, /代数基底与系数环保真/u);
  assert.match(p, /严禁模型心算与公式推导/u);
  
  for (const term of ["Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding", "Bauer", "Taubes", "Skein"]) {
    assert.equal(p.includes(term), false, `v1.21 prompt leaked ${term}`);
  }
});
