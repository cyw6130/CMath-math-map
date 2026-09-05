import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

const options = {
  fileName: "generic-paper.pdf",
  pageCount: 20,
  text: "[[PAGE 1]] Definition 1.1 A modular category... Theorem 1.4 Let X be...",
  pageRange: { first: 1, last: 5 },
  blockIndex: 0,
  totalBlocks: 4,
};

test("v1.31.1 removes domain-specific topology examples and is fully generic", () => {
  assert.equal(typeof pool.v1311DualOutputPrompt, "function", "v1311DualOutputPrompt must be exported");
  const p = pool.v1311DualOutputPrompt(options);
  // Must contain the genericized rule text
  assert.match(p, /无论是代数、几何、拓扑、范畴还是逻辑约束/u);
  assert.match(p, /不以学科领域为转移/u);
  // Must NOT contain domain-specific examples that anchor attention to 4-manifold topology
  for (const term of [
    "非挠性", "nontorsion", "紧致光滑", "定向依赖", "b_2", "spin", "辛", "4-流形", "Seiberg",
    "Hopf", "Kirby", "Yasui", "Gold", "Skein", "Bauer", "Taubes", "Froyshov", "Banyaga", "Furuta"
  ]) {
    assert.equal(p.includes(term), false, `v1.31.1 leaked ${term}`);
  }
});
