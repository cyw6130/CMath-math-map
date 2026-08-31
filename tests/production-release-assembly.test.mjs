import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRODUCTION_RELEASE,
  inspectProductionEntries,
  productionAssetSource,
} from "../scripts/production-release.mjs";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("production entries are generated from one release manifest", () => {
  const canonicalHtml = read("index.html");
  const mirrorHtml = read("index-v5.html");

  const inspection = inspectProductionEntries({ canonicalHtml, mirrorHtml });

  assert.equal(mirrorHtml, canonicalHtml);
  assert.equal(inspection.releaseId, PRODUCTION_RELEASE.id);
  assert.equal(inspection.scriptCount, PRODUCTION_RELEASE.scriptCount);
  assert.equal(inspection.scriptCount, 54);
  assert.match(canonicalHtml, new RegExp(`href="styles\\.css\\?v=${PRODUCTION_RELEASE.id}"`, "u"));
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
    productionAssetSource("math-rendering-consumer.js"),
    `math-rendering-consumer.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(
    productionAssetSource("src/runtime/capabilities.js"),
    `src/runtime/capabilities.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(
    productionAssetSource("src/workbench/paper-import.js"),
    `src/workbench/paper-import.js?v=${PRODUCTION_RELEASE.id}`,
  );
  assert.equal(productionAssetSource("vendor/katex/katex.min.js"), "vendor/katex/katex.min.js");
});
