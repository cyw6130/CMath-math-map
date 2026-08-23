import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const options = {
  fileName: "manifold-topology.pdf",
  pageCount: 12,
  text: "[[PAGE 1]] Theorem 1.4 Let X be a 4-manifold...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 3,
};

test("v1.22 prompt enforces deterministic ID naming and deduplication rules", () => {
  const p = pool.v122DualOutputPrompt(options);
  assert.match(p, /基于编号的确定性 ID 规范/u);
  assert.match(p, /严格跨块唯一性/u);
  
  for (const term of ["Hopf", "Kirby", "Jones", "WRT", "Yasui", "Gold", "MWW", "Sard", "R-matrix", "winding", "Bauer", "Taubes", "Skein"]) {
    assert.equal(p.includes(term), false, `v1.22 prompt leaked ${term}`);
  }
});
