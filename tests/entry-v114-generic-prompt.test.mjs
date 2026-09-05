import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");

function prompt() {
  return pool.v114DualOutputPrompt({
    fileName: "unseen-paper.pdf",
    pageCount: 12,
    text: "[[PAGE 1]] Definition 1. Let X be a mathematical object.",
    pageRange: { first: 1, last: 4 },
    blockIndex: 0,
    totalBlocks: 3,
  });
}

test("v1.14 prompt preserves generic Entry extraction requirements", () => {
  const value = prompt();

  assert.match(value, /所有明确编号或命名的 formal object/u);
  assert.match(value, /external:true/u);
  assert.match(value, /窗口重叠、同义名称、语言变体/u);
  assert.match(value, /指定页码和原文证据/u);
  assert.match(value, /假设、量词、公式/u);
  assert.match(value, /不要为了增加或压低数量/u);
});

test("v1.14 prompt contains no case-specific answer hints", () => {
  const value = prompt();
  const leakedTerms = ["Hopf", "Kirby", "Jones", "WRT", "Weyl", "MWW", "Gay-Kirby", "Meier-Schirmer-Zupan", "Lambert-Cole", "Feller", "Yasui", "unit-braiding", "yang-baxter", "Gold", "Gold×", "Sard"];

  for (const term of leakedTerms) {
    assert.equal(value.includes(term), false, `v1.14 prompt leaked ${term}`);
  }
});

test("v1.14 JSON example is source-agnostic", () => {
  const value = prompt();

  assert.match(value, /paper:def:object/u);
  assert.match(value, /paper:thm:result/u);
  assert.doesNotMatch(value, /映射度|Sard 定理|定义 X|定理 Y/u);
});
