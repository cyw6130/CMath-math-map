import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "capabilities/consumer-manifest.json");
test("Math Map consumes the canonical CMath capability export", () => {
  assert.ok(existsSync(manifestPath), "run npm run sync-capabilities first");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schema, "cmath.capability-consumer-manifest/v1");
  assert.equal(manifest.authority, "../CMath-capabilities/exports/canonical.json");
  assert.deepEqual(manifest.packages.map((item) => item.capabilityId), [
    "cmath-gamma.math-map-semantics/v2",
    "cmath-gamma.math-map-naming/v2",
    "cmath-gamma.research-loop-progress/v1",
    "cmath-gamma.math-map-visual-semantics/v1",
    "cmath-gamma.graph-core/v1",
    "cmath-gamma.math-map-workspace/v2",
    "cmath-gamma.math-rendering/v1",
    "cmath-gamma.alpha-project-adapter/v0.2",
    "cmath.paper-guide/v1",
    "cmath.guide-lead/v1",
    "cmath.lead-guided-extraction/v1",
    "cmath.dual-lane-extraction-aggregation/v1",
  ]);
  assert.ok(manifest.packages.every((item) => item.authorityRecord.canonicalPackage));
  assert.equal(manifest.mode, "canonical-runtime-assets");
  assert.equal(manifest.runtimeAssets.length, 15);
  for (const asset of manifest.runtimeAssets) {
    const content = readFileSync(resolve(root, asset.target));
    const distributedHash = createHash("sha256").update(content).digest("hex");
    assert.equal(`sha256:${distributedHash}`, asset.distributedHash, `${asset.target} drifted from its synchronized asset`);
    assert.match(content.toString("utf8", 0, 700), /@cmath-provenance/);
    assert.match(content.toString("utf8", 0, 700), new RegExp(asset.contentHash));
  }
});
