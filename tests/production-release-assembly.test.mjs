import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PRODUCTION_RELEASE,
  inspectProductionEntry,
  syncProductionEntry,
  productionAssetSource,
} from "../scripts/production-release.mjs";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("Pages excludes internal material without excluding production assets", () => {
  const config = read("_config.yml");
  for (const name of ["benchmarks", "prototypes", "archive", ".agent-os", "docs", "tests"]) {
    assert.ok(config.split("\n").includes(`  - ${name}`));
  }
  const excluded = config.split("\n").filter((line) => line.startsWith("  - ")).map((line) => line.slice(4));
  const html = read("index.html");
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/gu)) {
    assert.ok(!excluded.some((name) => asset === name || asset.startsWith(`${name}/`)), asset);
  }
});

test("production entry is generated from one release manifest", () => {
  const canonicalHtml = read("index.html");

  const inspection = inspectProductionEntry({ canonicalHtml });

  assert.equal(inspection.releaseId, PRODUCTION_RELEASE.id);
  assert.equal(inspection.scriptCount, PRODUCTION_RELEASE.scriptCount);
  assert.equal(inspection.scriptCount, 54);
  assert.match(canonicalHtml, new RegExp(`href="assets/styles/styles\\.css\\?v=${PRODUCTION_RELEASE.id}"`, "u"));
});

test("the default test command covers every test module", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts.test, "node --test tests/*.mjs");
});

test("production entry synchronization and drift checks are public project commands", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["sync:production-entry"], "node scripts/production-release.mjs");
  assert.equal(packageJson.scripts["check:production-entry"], "node scripts/production-release.mjs --check");
});

test("first-party assets share the release identity while vendored assets remain stable", () => {
  assert.equal(
    productionAssetSource("src/math-map/math-rendering-consumer.js"),
    `src/math-map/math-rendering-consumer.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(
    productionAssetSource("src/runtime/capabilities.js"),
    `src/runtime/capabilities.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(
    productionAssetSource("src/workbench/paper-import.js"),
    `src/workbench/paper-import.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(productionAssetSource("capabilities/browser/vendor/katex/katex.min.js"), "capabilities/browser/vendor/katex/katex.min.js");
});


test("release sync maintains only index.html", async () => {
  const root = mkdtempSync(join(tmpdir(), "cmath-single-entry-"));
  try {
    writeFileSync(join(root, "index.html"), read("index.html"));
    await syncProductionEntry({ root });
    await syncProductionEntry({ root, check: true });
    assert.deepEqual(readdirSync(root), ["index.html"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
