#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const authorityRoot = resolve(projectRoot, "../CMath-capabilities");
const canonical = JSON.parse(readFileSync(resolve(authorityRoot, "exports/canonical.json"), "utf8"));
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const required = [
  ["cmath-gamma.math-map-semantics/v2", "math-graph-semantics-v2"],
  ["cmath-gamma.math-map-naming/v2", "math-map-naming-v2"],
  ["cmath-gamma.research-loop-progress/v1", "research-loop-progress-v1"],
  ["cmath-gamma.math-map-visual-semantics/v1", "math-map-visual-semantics-v1"],
  ["cmath-gamma.graph-core/v1", "graph-core-v1"],
  ["cmath-gamma.math-map-workspace/v2", "math-map-workspace-v2"],
  ["cmath-gamma.math-rendering/v1", "math-rendering-v1"],
  ["cmath-gamma.alpha-project-adapter/v0.2", "alpha-project-adapter-v0.2"],
  ["cmath.paper-guide/v1", "paper-dossier-extractor-v2"],
  ["cmath.guide-lead/v1", "guide-lead-contract-v1"],
  ["cmath.lead-guided-extraction/v1", "lead-guided-extraction-v1"],
  ["cmath.dual-lane-extraction-aggregation/v1", "dual-lane-extraction-aggregation-v1"],
];
const runtimeMappings = [
  ["math-graph-semantics-v2", "packages/math-map/state/math-graph-semantics-v2/src/index.js", "math-map-semantics.js"],
  ["math-map-naming-v2", "packages/math-map/presentation/math-map-naming-v2/src/index.js", "math-map-naming.js"],
  ["research-loop-progress-v1", "packages/math-map/presentation/research-loop-progress-v1/src/index.js", "research-loop-progress.js"],
  ["math-map-visual-semantics-v1", "packages/math-map/presentation/math-map-visual-semantics-v1/src/index.js", "math-map-visual-semantics.js"],
  ["graph-core-v1", "packages/math-map/presentation/graph-core-v1/src/graph-contract.js", "graph-contract.js"],
  ["graph-core-v1", "packages/math-map/presentation/graph-core-v1/src/index.js", "graph-canvas.js"],
  ["math-map-workspace-v2", "packages/math-map/presentation/math-map-workspace-v2/src/math-map-model.js", "math-map-model.js"],
  ["math-map-workspace-v2", "packages/math-map/presentation/math-map-workspace-v2/src/math-map-lab.js", "math-map-lab.js"],
  ["math-rendering-v1", "packages/math-map/rendering/math-rendering-v1/browser-assets/math-text.js", "math-text.js"],
  ["math-rendering-v1", "packages/math-map/rendering/math-rendering-v1/browser-assets/math-rendering-loader.js", "math-rendering-loader.js"],
  ["alpha-project-adapter-v0.2", "packages/math-map/synchronization/alpha-project-adapter-v0.2/src/index.js", "math-map-project-adapter.js"],
  ["paper-dossier-extractor-v2", "packages/research-process/import/paper-dossier-extractor-v2/browser-assets/paper-import-v3.js", "paper-import-v3-capability.js"],
  ["guide-lead-contract-v1", "packages/research-process/import/guide-lead-contract-v1/browser-assets/guide-lead-contract.js", "guide-lead-contract-v1.js"],
  ["lead-guided-extraction-v1", "packages/research-process/import/lead-guided-extraction-v1/browser-assets/lead-guided-extraction.js", "lead-guided-extraction-v1.js"],
  ["dual-lane-extraction-aggregation-v1", "packages/research-process/import/dual-lane-extraction-aggregation-v1/browser-assets/dual-lane-extraction-aggregation.js", "dual-lane-extraction-aggregation-v1.js"],
];
const packageRecords = new Map();
const packages = required.map(([capabilityId, packageId]) => {
  const record = canonical.canonicalPackages.find((item) => item.canonicalPackage?.endsWith(`/${packageId}`));
  if (!record) throw new Error(`Missing canonical capability package: ${packageId}`);
  const provided = record.provides?.some((port) => (typeof port === "string" ? port : port.port) === capabilityId);
  if (!provided && record.id !== packageId) throw new Error(`Canonical package ${packageId} does not provide ${capabilityId}`);
  packageRecords.set(packageId, record);
  return { capabilityId, packageId, version: record.version, authorityRecord: record };
});
const runtimeAssets = runtimeMappings.map(([packageId, canonicalSource, target]) => {
  const record = packageRecords.get(packageId);
  const sourceBytes = readFileSync(resolve(authorityRoot, canonicalSource));
  const contentHash = sha256(sourceBytes);
  const header = [
    "/**", " * @cmath-provenance", ` * @package ${packageId}`, ` * @version ${record.version}`,
    ` * @canonicalSource ${canonicalSource}`, ` * @contentHash sha256:${contentHash}`,
    " * @syncAuthority CMath-capabilities/exports/canonical.json",
    " * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.", " */", ""
  ].join("\n");
  const distributedBytes = Buffer.concat([Buffer.from(header), sourceBytes]);
  const targetPath = resolve(projectRoot, target);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, distributedBytes);
  return { packageId, version: record.version, canonicalSource, target, contentHash: `sha256:${contentHash}`, distributedHash: `sha256:${sha256(distributedBytes)}` };
});
const output = { schema: "cmath.capability-consumer-manifest/v1", authority: "../CMath-capabilities/exports/canonical.json", generatedBy: "scripts/consume-capabilities.mjs", projectId: "cmath-math-map", mode: "canonical-runtime-assets", packages, runtimeAssets };
mkdirSync(resolve(projectRoot, "capabilities"), { recursive: true });
writeFileSync(resolve(projectRoot, "capabilities/consumer-manifest.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Consumed ${packages.length} canonical packages and synchronized ${runtimeAssets.length} runtime assets`);
