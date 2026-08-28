import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import {
  BENCHMARK_CAPABILITY_REQUIREMENTS,
  BenchmarkCapabilityError,
  loadBenchmarkCapabilityRuntime,
} from "../scripts/benchmark-capability-runtime.mjs";

const require = createRequire(import.meta.url);
const productionFacade = require("../src/paper-import/production/index.js");

test("loads the four synchronized benchmark capabilities", async () => {
  const runtime = await loadBenchmarkCapabilityRuntime();

  assert.equal(runtime.manifest.projectId, "cmath-math-map");
  assert.equal(runtime.syncIdentity, productionFacade.VNEXT_FROZEN_WORKFLOW.capabilitySyncIdentity);
  assert.equal(runtime.syncIdentity, runtime.manifest.syncIdentity);
  assert.equal(typeof runtime.semantics.deriveMathState, "function");
  assert.equal(typeof runtime.entry.validateEntry, "function");
  assert.equal(typeof runtime.inference.validateInferenceRecord, "function");
  assert.equal(typeof runtime.inference.validateInferenceSemantics, "function");
  assert.equal(typeof runtime.normalization.runPaperImportWorkflowV2, "function");
  assert.equal(Object.isFrozen(BENCHMARK_CAPABILITY_REQUIREMENTS), true);
});

test("fails when manifest syncIdentity differs from the public frozen workflow", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  manifest.syncIdentity = "sha256:" + (loaded.syncIdentity === "sha256:" + "0".repeat(64) ? "f" : "0").repeat(64);

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_INCOMPATIBLE");
      return true;
    },
  );
});

test("fails when the manifest does not name the canonical authority and generator", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const wrongAuthority = structuredClone(loaded.manifest);
  wrongAuthority.authority = "./local-capability-copy.json";
  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest: wrongAuthority }),
    (error) => error?.code === "BENCHMARK_CAPABILITY_INCOMPATIBLE",
  );

  const wrongGenerator = structuredClone(loaded.manifest);
  wrongGenerator.generatedBy = "local-script.mjs";
  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest: wrongGenerator }),
    (error) => error?.code === "BENCHMARK_CAPABILITY_INCOMPATIBLE",
  );
});

test("fails when a selected runtime asset bytes do not match its distributed hash", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  const semanticsAsset = manifest.runtimeAssets.find(({ packageId }) => packageId === "math-graph-semantics-v3");
  const zeroHash = "sha256:" + "0".repeat(64);
  semanticsAsset.distributedHash = semanticsAsset.distributedHash === zeroHash
    ? "sha256:" + "f".repeat(64)
    : zeroHash;

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_INCOMPATIBLE");
      return true;
    },
  );
});

test("fails with an incompatible code when a selected runtime hash is malformed", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  const semanticsAsset = manifest.runtimeAssets.find(({ packageId }) => packageId === "math-graph-semantics-v3");
  semanticsAsset.distributedHash = "sha256:not-a-hex-digest";

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_INCOMPATIBLE");
      return true;
    },
  );
});

test("fails with a missing code when a selected runtime hash is absent", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  const semanticsAsset = manifest.runtimeAssets.find(({ packageId }) => packageId === "math-graph-semantics-v3");
  delete semanticsAsset.distributedHash;

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_MISSING");
      return true;
    },
  );
});

test("fails with a stable missing code when a required package is absent", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  manifest.canonicalPackages = manifest.canonicalPackages.filter(
    ({ packageId }) => packageId !== "entry-model-v1",
  );

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_MISSING");
      return true;
    },
  );
});

test("fails with a stable incompatible code when a required contract changes", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  const entryPackage = manifest.canonicalPackages.find(({ packageId }) => packageId === "entry-model-v1");
  entryPackage.contractVersion = "cmath.entry/v0.1";

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_INCOMPATIBLE");
      return true;
    },
  );
});

test("fails with a stable runtime-invalid code when an asset cannot be imported", async () => {
  const loaded = await loadBenchmarkCapabilityRuntime();
  const manifest = structuredClone(loaded.manifest);
  const semanticsAsset = manifest.runtimeAssets.find(({ packageId }) => packageId === "math-graph-semantics-v3");
  const target = "capabilities/consumer-manifest.json";
  semanticsAsset.target = target;
  semanticsAsset.distributedHash = `sha256:${createHash("sha256")
    .update(readFileSync(new URL("../capabilities/consumer-manifest.json", import.meta.url)))
    .digest("hex")}`;

  await assert.rejects(
    loadBenchmarkCapabilityRuntime({ manifest }),
    (error) => {
      assert.equal(error instanceof BenchmarkCapabilityError, true);
      assert.equal(error.code, "BENCHMARK_CAPABILITY_RUNTIME_INVALID");
      return true;
    },
  );
});
