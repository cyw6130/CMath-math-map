import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "capabilities/consumer-manifest.json");

test("Math Map exposes the canonical capability sync and verification commands", () => {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["sync-capabilities"],
    "node ../CMath-capabilities/scripts/sync-runtime-consumer.mjs cmath-math-map",
  );
  assert.equal(
    packageJson.scripts["test:capabilities"],
    "node --test tests/capabilities-consumer.test.mjs tests/canonical-capability-adoption.test.mjs",
  );
});

test("Math Map consumes the canonical CMath capability export", () => {
  assert.ok(existsSync(manifestPath), "run npm run sync-capabilities first");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schema, "cmath.capability-consumer-manifest/v1");
  assert.equal(manifest.authority, "../CMath-capabilities/exports/canonical.json");
  assert.equal(manifest.generatedBy, "CMath-capabilities/scripts/sync-runtime-consumer.mjs");
  assert.equal(manifest.projectId, "cmath-math-map");
  const adopted = JSON.parse(readFileSync(resolve(root, "capabilities/adoption.json"), "utf8"));
  const canonicalPackageIds = new Set(manifest.canonicalPackages.map((item) => item.packageId));
  assert.ok(adopted.adoptions.every((item) => canonicalPackageIds.has(item.capabilityId)));
  assert.equal(manifest.mode, "canonical-runtime-assets");
  assert.equal(manifest.runtimeAssets.length, 14);
  for (const asset of manifest.runtimeAssets) {
    const content = readFileSync(resolve(root, asset.target));
    const distributedHash = createHash("sha256").update(content).digest("hex");
    assert.equal(`sha256:${distributedHash}`, asset.distributedHash, `${asset.target} drifted from its synchronized asset`);
    assert.match(content.toString("utf8", 0, 700), /@cmath-provenance/);
    assert.match(content.toString("utf8", 0, 700), new RegExp(asset.contentHash));
  }
});
