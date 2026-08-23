import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

const protocol = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/fixed-test-workflow.json"), "utf8"));
const runnerConfig = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/runner-config.json"), "utf8"));

test("protocol registers the four new workflow subjects", () => {
  const s = protocol.subjects;
  assert.equal(s.spark.provider, "opencode-go");
  assert.equal(s.spark.model, "muse-spark-1.2-contributor");
  assert.equal(s["k3-high"].provider, "opencode-go");
  assert.equal(s["k3-high"].model, "kimi-k3");
  assert.equal(s["k3-high"].mode, "high-generous");
  assert.equal(s["ox-high"].provider, "opencode-go");
  assert.equal(s["ox-high"].model, "ox-alpha-free");
  assert.equal(s["sol-medium"].mode, "medium-compact");
  assert.equal(s["sol-medium"].model, "gpt-5.6-sol");
});

test("runner-config mirrors the new supportedSubjects", () => {
  const s = runnerConfig.supportedSubjects;
  assert.equal(s.spark?.model, "muse-spark-1.2-contributor");
  assert.equal(s["k3-high"]?.model, "kimi-k3");
  assert.equal(s["ox-high"]?.model, "ox-alpha-free");
  assert.equal(s["sol-medium"]?.model, "gpt-5.6-sol");
});

test("resolveRunnerExecutionConfig covers every subject tier", () => {
  assert.equal(pool.resolveRunnerExecutionConfig("off-compact").reasoningEffort, "none");
  assert.equal(pool.resolveRunnerExecutionConfig("medium-compact").reasoningEffort, "medium");
  assert.equal(pool.resolveRunnerExecutionConfig("high-generous").reasoningEffort, "high");
});

test("both full-run runners accept the medium-compact tier", () => {
  for (const script of ["scripts/run-luna-paper-import.mjs", "scripts/run-paper-inference-from-entry-artifact.mjs"]) {
    const src = fs.readFileSync(path.join(root, script), "utf8");
    assert.ok(src.includes('"medium-compact"'), `${script} must accept mode=medium-compact`);
    assert.match(src, /unknown mode/u, `${script} keeps fail-loud on unknown modes`);
  }
});

