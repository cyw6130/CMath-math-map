import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  assert.match(manifest.syncIdentity, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(manifest.runtimeAssets.length, 24);
  assert.deepEqual(
    [
      "math-graph-semantics-v3",
      "entry-model-v2",
      "inference-model-v2",
      "archive-math-state-adapter-v1",
      "entry-model-v1",
      "inference-model-v1",
      "paper-import-workflow-v2",
    ]
      .map((packageId) => manifest.canonicalPackages.find((item) => item.packageId === packageId))
      .map(({ packageId, version, contractVersion }) => ({ packageId, version, contractVersion })),
    [
      { packageId: "math-graph-semantics-v3", version: "v3", contractVersion: "cmath-gamma.math-map-semantics/v3" },
      { packageId: "entry-model-v2", version: "v2", contractVersion: "cmath.entry-archive/v2" },
      { packageId: "inference-model-v2", version: "v2", contractVersion: "cmath.inference-archive/v2" },
      { packageId: "archive-math-state-adapter-v1", version: "v1", contractVersion: "cmath.archive-math-state-adapter/v1" },
      { packageId: "entry-model-v1", version: "v1", contractVersion: "cmath.entry/v0.2" },
      { packageId: "inference-model-v1", version: "v1", contractVersion: "cmath.inference/v0.2" },
      { packageId: "paper-import-workflow-v2", version: "v2.1", contractVersion: "cmath.paper-import-workflow-result/v0.2" },
    ],
  );
  for (const asset of manifest.runtimeAssets) {
    const content = readFileSync(resolve(root, asset.target));
    const distributedHash = createHash("sha256").update(content).digest("hex");
    assert.equal(`sha256:${distributedHash}`, asset.distributedHash, `${asset.target} drifted from its synchronized asset`);
    assert.match(content.toString("utf8", 0, 700), /@cmath-provenance/);
    assert.match(content.toString("utf8", 0, 700), new RegExp(asset.contentHash));
  }
});

test("VNext canonical runtimes load with their synchronized dependency closure", async () => {
  const runtimeRoot = resolve(root, "capabilities/runtime/packages");
  const semantics = (await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/math-graph-semantics-v3/src/index.js")))).default;
  const entry = await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/entry-model-v1/src/index.mjs")));
  const inference = await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/inference-model-v1/src/index.mjs")));
  const workflow = await import(pathToFileURL(resolve(runtimeRoot, "research-process/orchestration/paper-import-workflow-v2/src/index.mjs")));
  assert.equal(typeof semantics.deriveMathState, "function");
  assert.equal(typeof entry.validateEntry, "function");
  assert.equal(typeof inference.validateInferenceRecord, "function");
  assert.equal(typeof workflow.runPaperImportWorkflowV2, "function");
});

test("production archive contracts project through the synchronized V3 adapter", async () => {
  const runtimeRoot = resolve(root, "capabilities/runtime/packages");
  const entry = await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/entry-model-v2/src/index.mjs")));
  const inference = await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/inference-model-v2/src/index.mjs")));
  const adapter = await import(pathToFileURL(resolve(runtimeRoot, "math-map/synchronization/archive-math-state-adapter-v1/src/index.mjs")));
  const calculation = entry.createEntry({
    id: "calculation:one",
    entryKind: "calculation",
    title: "Calculation",
    meaning: { text: "1 + 1 = 2", identity_claim: {}, context_refs: [] },
    revisions: [{ id: "revision:one" }],
    currentRevision: "revision:one",
  });

  assert.equal(entry.entryCategory(calculation), "Fact");
  assert.deepEqual(inference.INFERENCE_KINDS, ["proof", "organization"]);
  assert.deepEqual(adapter.projectArchiveToMathState({
    entries: [calculation],
    inferences: [],
    negationPairs: [],
    b0ClaimEntryIds: [],
  }), {
    mathState: {
      entries: [{ id: "calculation:one", entryClass: "fact", factKind: "calculation", title: "Calculation", statement: "1 + 1 = 2" }],
      inferences: [],
      negationPairs: [],
      b0ClaimEntryIds: [],
    },
    issues: [],
  });
});

test("frozen production workflows bind the current capability sync identity", async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const canonicalV5 = (await import(pathToFileURL(resolve(root, "src/paper-import/canonical/v5.js")))).default;

  assert.equal(canonicalV5.FROZEN_WORKFLOW.capabilitySyncIdentity, manifest.syncIdentity);
});

test("production V5.1 keeps Math State v3 separate from quality and compatibility contracts", async () => {
  const runtimeRoot = resolve(root, "capabilities/runtime/packages");
  const semantics = (await import(pathToFileURL(resolve(runtimeRoot, "math-map/state/math-graph-semantics-v3/src/index.js")))).default;
  const declaration = JSON.parse(readFileSync(resolve(root, "capabilities/adoption.json"), "utf8"));
  const scopesByCapability = new Map(declaration.adoptions.map(({ capabilityId, usageScopes }) => [capabilityId, usageScopes]));

  assert.doesNotThrow(() => semantics.deriveMathState({
    entries: [{ id: "calculation:one", entryClass: "fact", factKind: "calculation", title: "Calculation", statement: "1 + 1 = 2" }],
    inferences: [],
    negationPairs: [],
    b0ClaimEntryIds: [],
  }));
  assert.deepEqual(scopesByCapability.get("math-graph-semantics-v3"), ["production", "quality"]);
  for (const capabilityId of ["entry-model-v2", "inference-model-v2", "archive-math-state-adapter-v1"]) {
    assert.deepEqual(scopesByCapability.get(capabilityId), ["production"]);
  }
  for (const capabilityId of ["entry-model-v1", "inference-model-v1", "paper-import-workflow-v2"]) {
    assert.deepEqual(scopesByCapability.get(capabilityId), ["quality", "compatibility"]);
  }
  for (const [capabilityId, usageScopes] of scopesByCapability) {
    assert.ok(Array.isArray(usageScopes) && usageScopes.length, `${capabilityId} declares usageScopes`);
    assert.ok(usageScopes.every((scope) => ["production", "quality", "compatibility"].includes(scope)), `${capabilityId} uses known scopes`);
  }
});
