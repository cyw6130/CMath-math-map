import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");

test("isSparkScorer routes ox-alpha-free and muse-spark variants via the opencode-go path", () => {
  assert.equal(typeof scorer.isSparkScorer, "function", "isSparkScorer must be exported");
  assert.equal(scorer.isSparkScorer("ox-alpha-free"), true, "ox-alpha-free must route via opencode-go");
  assert.equal(scorer.isSparkScorer("opencode-go/ox-alpha-free"), true, "prefixed ox-alpha must route via opencode-go");
  assert.equal(scorer.isSparkScorer("muse-spark-1.2"), true);
  assert.equal(scorer.isSparkScorer("muse-spark-1.2-contributor"), true);
  // Gateway models stay on the direct HTTP path
  assert.equal(scorer.isSparkScorer("gpt-5.6-sol"), false);
  assert.equal(scorer.isSparkScorer("gpt-5.6-luna"), false);
  assert.equal(scorer.isSparkScorer("gpt-5.6-terra"), false);
});

test("resolveSparkProviderConfig passes explicit model through to the opencode-go endpoint", () => {
  const cfg = scorer.resolveSparkProviderConfig("ox-alpha-free");
  assert.equal(cfg.model, "ox-alpha-free");
  assert.ok(cfg.endpoint.includes("/v1"), "endpoint should be the opencode-go v1 API");
  assert.ok(cfg.apiKey.length > 0, "api key must resolve from keys file or env");
});
