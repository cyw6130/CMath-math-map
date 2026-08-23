import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");

const mkScore = (c, comp, tag) => ({
  schema: "cmath.paper-entry-sol-score/v1",
  correctness: c,
  completeness: comp,
  solEntryScore: c + comp,
  verdict: c + comp >= 40 ? "flawless" : (c + comp >= 27 ? "usable" : "unusable"),
  summary: `run-${tag}`,
});

test("aggregateMedianScore picks the median-total run and keeps its internal consistency", () => {
  assert.equal(typeof scorer.aggregateMedianScore, "function", "aggregateMedianScore must be exported");
  const runs = [mkScore(19, 14, "low"), mkScore(21, 18, "high"), mkScore(20, 16, "mid")];
  const agg = scorer.aggregateMedianScore(runs);
  assert.equal(agg.solEntryScore, 36);
  assert.equal(agg.correctness, 20);
  assert.equal(agg.completeness, 16);
  assert.equal(agg.summary, "run-mid");
});

test("aggregateMedianScore with even run count takes lower-middle element deterministically", () => {
  const runs = [mkScore(18, 12, "a"), mkScore(22, 18, "b"), mkScore(19, 15, "c"), mkScore(20, 17, "d")];
  const agg = scorer.aggregateMedianScore(runs);
  // sorted totals: 30, 34, 35, 40 -> lower-middle = 34 (run-c)
  assert.equal(agg.solEntryScore, 34);
  assert.equal(agg.correctness, 19);
});

test("aggregateMedianScore attaches run-level transparency metadata", () => {
  const runs = [mkScore(18, 12, "a"), mkScore(22, 18, "b"), mkScore(20, 16, "c")];
  const agg = scorer.aggregateMedianScore(runs);
  assert.equal(agg.scoreRuns?.length, 3);
  assert.deepEqual(agg.scoreRuns?.map((r) => r.solEntryScore).sort((a, b) => a - b), [30, 36, 40]);
  assert.equal(agg.aggregation, "median-of-3");
});
