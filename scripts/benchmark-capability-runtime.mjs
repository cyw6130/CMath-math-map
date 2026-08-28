import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MANIFEST_PATH = resolve(SCRIPT_ROOT, "capabilities/consumer-manifest.json");
const PRODUCTION_FACADE_PATH = resolve(SCRIPT_ROOT, "src/paper-import/production/index.js");
const MANIFEST_SCHEMA = "cmath.capability-consumer-manifest/v1";
const PROJECT_ID = "cmath-math-map";
const MANIFEST_AUTHORITY = "../CMath-capabilities/exports/canonical.json";
const MANIFEST_GENERATOR = "CMath-capabilities/scripts/sync-runtime-consumer.mjs";
const MANIFEST_MODE = "canonical-runtime-assets";
const SYNC_IDENTITY_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const require = createRequire(import.meta.url);

const ERROR_CODES = Object.freeze({
  MISSING: "BENCHMARK_CAPABILITY_MISSING",
  INCOMPATIBLE: "BENCHMARK_CAPABILITY_INCOMPATIBLE",
  RUNTIME_INVALID: "BENCHMARK_CAPABILITY_RUNTIME_INVALID",
});

function freezeRequirement(requirement) {
  return Object.freeze({
    ...requirement,
    requiredExports: Object.freeze([...requirement.requiredExports]),
  });
}

export const BENCHMARK_CAPABILITY_REQUIREMENTS = Object.freeze([
  freezeRequirement({
    role: "semantics",
    capabilityId: "math-graph-semantics-v3",
    packageId: "math-graph-semantics-v3",
    version: "v3",
    contractVersion: "cmath-gamma.math-map-semantics/v3",
    canonicalSource: "packages/math-map/state/math-graph-semantics-v3/src/index.js",
    requiredExports: ["deriveMathState"],
  }),
  freezeRequirement({
    role: "entry",
    capabilityId: "entry-model-v1",
    packageId: "entry-model-v1",
    version: "v1",
    contractVersion: "cmath.entry/v0.2",
    canonicalSource: "packages/math-map/state/entry-model-v1/src/index.mjs",
    requiredExports: ["validateEntry"],
  }),
  freezeRequirement({
    role: "inference",
    capabilityId: "inference-model-v1",
    packageId: "inference-model-v1",
    version: "v1",
    contractVersion: "cmath.inference/v0.2",
    canonicalSource: "packages/math-map/state/inference-model-v1/src/index.mjs",
    requiredExports: ["validateInferenceRecord", "validateInferenceSemantics"],
  }),
  freezeRequirement({
    role: "normalization",
    capabilityId: "paper-import-workflow-v2",
    packageId: "paper-import-workflow-v2",
    version: "v2.1",
    contractVersion: "cmath.paper-import-workflow-result/v0.2",
    canonicalSource: "packages/research-process/orchestration/paper-import-workflow-v2/src/index.mjs",
    requiredExports: ["runPaperImportWorkflowV2"],
  }),
]);

export const BENCHMARK_CAPABILITY_ERROR_CODES = ERROR_CODES;

export class BenchmarkCapabilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BenchmarkCapabilityError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details = {}) {
  throw new BenchmarkCapabilityError(code, message, details);
}

function incompatible(message, details = {}) {
  fail(ERROR_CODES.INCOMPATIBLE, message, details);
}

function missing(message, details = {}) {
  fail(ERROR_CODES.MISSING, message, details);
}

function runtimeInvalid(message, details = {}) {
  fail(ERROR_CODES.RUNTIME_INVALID, message, details);
}

function validateManifestIdentity(manifest) {
  if (!isObject(manifest)) incompatible("Benchmark capability manifest must be an object");
  if (manifest.schema !== MANIFEST_SCHEMA) {
    incompatible(`Benchmark capability manifest must use ${MANIFEST_SCHEMA}`, { field: "schema" });
  }
  if (manifest.projectId !== PROJECT_ID) {
    incompatible(`Benchmark capability manifest projectId must be ${PROJECT_ID}`, { field: "projectId" });
  }
  if (manifest.authority !== MANIFEST_AUTHORITY) {
    incompatible(`Benchmark capability manifest authority must be ${MANIFEST_AUTHORITY}`, { field: "authority" });
  }
  if (manifest.generatedBy !== MANIFEST_GENERATOR) {
    incompatible(`Benchmark capability manifest generatedBy must be ${MANIFEST_GENERATOR}`, { field: "generatedBy" });
  }
  if (manifest.mode !== MANIFEST_MODE) {
    incompatible(`Benchmark capability manifest mode must be ${MANIFEST_MODE}`, { field: "mode" });
  }
  if (typeof manifest.syncIdentity !== "string" || !SYNC_IDENTITY_PATTERN.test(manifest.syncIdentity)) {
    incompatible("Benchmark capability manifest syncIdentity must be a sha256 identity", { field: "syncIdentity" });
  }
  if (!Array.isArray(manifest.canonicalPackages)) {
    incompatible("Benchmark capability manifest canonicalPackages must be an array", { field: "canonicalPackages" });
  }
  if (!Array.isArray(manifest.runtimeAssets)) {
    incompatible("Benchmark capability manifest runtimeAssets must be an array", { field: "runtimeAssets" });
  }
}

function expectedSyncIdentity(options) {
  const hasOverride = isObject(options)
    && Object.prototype.hasOwnProperty.call(options, "expectedSyncIdentity");
  if (hasOverride) return options.expectedSyncIdentity;
  let productionFacade;
  try {
    productionFacade = require(PRODUCTION_FACADE_PATH);
  } catch (error) {
    runtimeInvalid("Production Paper Import facade could not be loaded", { cause: error });
  }
  return productionFacade?.VNEXT_FROZEN_WORKFLOW?.capabilitySyncIdentity;
}

function findCanonicalPackage(manifest, requirement) {
  const packages = manifest.canonicalPackages.filter((item) => (
    item?.packageId === requirement.packageId || item?.capabilityId === requirement.capabilityId
  ));
  if (!packages.length) {
    missing(`Benchmark capability package is missing: ${requirement.packageId}`, { packageId: requirement.packageId });
  }
  const matching = packages.filter((item) => (
    item.capabilityId === requirement.capabilityId
      && item.packageId === requirement.packageId
      && item.version === requirement.version
      && item.contractVersion === requirement.contractVersion
  ));
  if (matching.length !== 1) {
    incompatible(
      `Benchmark capability package identity is incompatible: ${requirement.packageId}`,
      { packageId: requirement.packageId, expected: requirement, actual: packages },
    );
  }
  return matching[0];
}

function findRuntimeAsset(manifest, requirement) {
  const packageAssets = manifest.runtimeAssets.filter((item) => item?.packageId === requirement.packageId);
  const asset = packageAssets.find((item) => item?.canonicalSource === requirement.canonicalSource);
  if (!asset) {
    if (!packageAssets.length) {
      missing(`Benchmark capability runtime asset is missing: ${requirement.packageId}`, { packageId: requirement.packageId });
    }
    incompatible(
      `Benchmark capability runtime entry is incompatible: ${requirement.packageId}`,
      { packageId: requirement.packageId, expectedCanonicalSource: requirement.canonicalSource },
    );
  }
  if (asset.version !== requirement.version) {
    incompatible(
      `Benchmark capability runtime asset version is incompatible: ${requirement.packageId}`,
      { packageId: requirement.packageId, expectedVersion: requirement.version, actualVersion: asset.version },
    );
  }
  if (typeof asset.target !== "string" || !asset.target.trim()) {
    missing(`Benchmark capability runtime target is missing: ${requirement.packageId}`, { packageId: requirement.packageId });
  }
  return asset;
}

async function loadManifest(options) {
  if (options?.manifest !== undefined) return options.manifest;
  let source;
  try {
    source = await readFile(options?.manifestPath ?? DEFAULT_MANIFEST_PATH, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      missing("Benchmark capability consumer manifest is missing", { manifestPath: options?.manifestPath ?? DEFAULT_MANIFEST_PATH });
    }
    runtimeInvalid("Benchmark capability consumer manifest could not be loaded", {
      manifestPath: options?.manifestPath ?? DEFAULT_MANIFEST_PATH,
      cause: error,
    });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    runtimeInvalid("Benchmark capability consumer manifest is not valid JSON", { cause: error });
  }
}

async function importAsset(asset, requirement, rootDir) {
  const target = resolve(rootDir, asset.target);
  try {
    await access(target);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      missing(`Benchmark capability runtime file is missing: ${asset.target}`, {
        packageId: requirement.packageId,
        target: asset.target,
      });
    }
    runtimeInvalid(`Benchmark capability runtime file could not be accessed: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
      cause: error,
    });
  }
  if (asset.distributedHash === undefined) {
    missing(`Benchmark capability runtime distributed hash is missing: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
    });
  }
  if (typeof asset.distributedHash !== "string" || !SYNC_IDENTITY_PATTERN.test(asset.distributedHash)) {
    incompatible(`Benchmark capability runtime distributed hash is malformed: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
      distributedHash: asset.distributedHash,
    });
  }
  let bytes;
  try {
    bytes = await readFile(target);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      missing(`Benchmark capability runtime file is missing: ${asset.target}`, {
        packageId: requirement.packageId,
        target: asset.target,
      });
    }
    runtimeInvalid(`Benchmark capability runtime file could not be read: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
      cause: error,
    });
  }
  const actualDistributedHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (asset.distributedHash !== actualDistributedHash) {
    incompatible(`Benchmark capability runtime bytes differ from distributed hash: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
      expectedDistributedHash: asset.distributedHash,
      actualDistributedHash,
    });
  }
  try {
    return await import(pathToFileURL(target).href);
  } catch (error) {
    runtimeInvalid(`Benchmark capability runtime failed to load: ${asset.target}`, {
      packageId: requirement.packageId,
      target: asset.target,
      cause: error,
    });
  }
}

function publicModule(namespace, requirement) {
  const candidates = [namespace, namespace?.default];
  const module = candidates.find((candidate) => (
    isObject(candidate) && requirement.requiredExports.every((name) => typeof candidate[name] === "function")
  ));
  if (!module) {
    missing(
      `Benchmark capability runtime exports are incomplete: ${requirement.packageId}`,
      { packageId: requirement.packageId, requiredExports: requirement.requiredExports },
    );
  }
  return module;
}

export async function loadBenchmarkCapabilityRuntime(options = {}) {
  const manifest = await loadManifest(options);
  validateManifestIdentity(manifest);
  const expectedIdentity = expectedSyncIdentity(options);
  if (typeof expectedIdentity !== "string" || !SYNC_IDENTITY_PATTERN.test(expectedIdentity)) {
    incompatible("Public frozen workflow capabilitySyncIdentity must be a sha256 identity", {
      field: "capabilitySyncIdentity",
      actual: expectedIdentity,
    });
  }
  if (manifest.syncIdentity !== expectedIdentity) {
    incompatible("Benchmark capability manifest syncIdentity differs from the public frozen workflow", {
      expectedSyncIdentity: expectedIdentity,
      actualSyncIdentity: manifest.syncIdentity,
    });
  }
  const rootDir = options.rootDir ?? SCRIPT_ROOT;
  const modules = {};

  for (const requirement of BENCHMARK_CAPABILITY_REQUIREMENTS) {
    findCanonicalPackage(manifest, requirement);
    const asset = findRuntimeAsset(manifest, requirement);
    const namespace = await importAsset(asset, requirement, rootDir);
    modules[requirement.role] = publicModule(namespace, requirement);
  }

  return Object.freeze({
    manifest,
    syncIdentity: manifest.syncIdentity,
    semantics: modules.semantics,
    entry: modules.entry,
    inference: modules.inference,
    normalization: modules.normalization,
  });
}
