import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { consolidateRawEntryPool } = require("../src/paper-import/entry/consolidation.js");

test("consolidateRawEntryPool groups and deduplicates entries with different IDs but identical theorem numbers", () => {
  const rawPool = {
    schema: "cmath.paper-raw-entry-pool/v1",
    source: { fileName: "paper.pdf", pageCount: 10, sourceText: "" },
    rawEntries: [
      {
        id: "paper:theorem:1.4-vanishing",
        type: "theorem",
        name: "定理 1.4 稳定同伦群消失",
        statement: "闭光滑4-流形满足 $b_2^+ > 1$ 时稳定同伦 SW 不变量消失。",
        page: 1
      },
      {
        id: "yasui:thm:stable-cohomotopy-vanishing-positive-definite",
        type: "theorem",
        name: "定理 1.4",
        statement: "闭光滑4-流形满足 $b_2^+ > 1$ 时稳定同伦 SW 不变量消失。",
        page: 1
      }
    ]
  };

  const artifact = consolidateRawEntryPool(rawPool);
  assert.equal(artifact.entries.length, 1, "Should merge two variants of Theorem 1.4 into single entry");
  assert.equal(artifact.diagnostics.deduplicated, 1);
});

test("consolidateRawEntryPool eliminates highly overlapping fuzzy duplicate statements", () => {
  const rawPool = {
    schema: "cmath.paper-raw-entry-pool/v1",
    source: { fileName: "paper.pdf", pageCount: 10, sourceText: "" },
    rawEntries: [
      {
        id: "paper:lemma:2.6-zero-sphere",
        type: "lemma",
        name: "引理 2.6 零自交球面",
        statement: "由2-柄邻域表示的非挠二次同调类在连通和中存在光滑嵌入的零自交球面。",
        page: 4
      },
      {
        id: "yasui:lemma:2-handle-double-sphere",
        type: "lemma",
        name: "引理 2.6",
        statement: "由2-柄邻域表示的非挠二次同调类在 $X \\# \\overline{X}$ 中存在光滑嵌入的零自交球面。",
        page: 4
      }
    ]
  };

  const artifact = consolidateRawEntryPool(rawPool);
  assert.equal(artifact.entries.length, 1, "Should deduplicate near-identical Lemma 2.6 statements");
});
