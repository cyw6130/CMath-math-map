import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Math Map can verify that generic map assets match its owned source data", () => {
  const result = spawnSync("npm", ["run", "build:generic-math-content", "--", "--check"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /generic math map assets are current \(8 files\)/u);
});
