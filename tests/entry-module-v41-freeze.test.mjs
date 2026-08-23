import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJsonRobust(relPath) {
  const abs = path.join(repoRoot, relPath);
  try { return JSON.parse(fs.readFileSync(abs, "utf8")); }
  catch {
    try { return JSON.parse(execSync(`cat "${abs}"`, { encoding: "utf8" })); }
    catch {
      const tmp = path.join("/tmp", path.basename(abs));
      if (fs.existsSync(tmp)) return JSON.parse(fs.readFileSync(tmp, "utf8"));
      throw new Error(`Cannot read ${abs} (evicted)`);
    }
  }
}

test("frozen entry module V4.1 points to v1.31", () => {
  const frozen = readJsonRobust("benchmarks/paper-import/entry-module/frozen-entry-module.json");
  assert.equal(frozen.selectedModuleVersion, "paper-entry-parallel-extraction-v1.31");
  assert.equal(frozen.consolidationModuleVersion, "paper-entry-consolidation-v1");
  assert.equal(frozen.status, "frozen");
});

test("frozen inference module V4.1 points to entry v1.31 (T2)", () => {
  const frozen = readJsonRobust("benchmarks/paper-import/inference-module/frozen-inference-module.json");
  assert.equal(frozen.entryModuleVersion, "paper-entry-parallel-extraction-v1.31");
  assert.equal(frozen.selectedInferenceVersion, "v4");
});
