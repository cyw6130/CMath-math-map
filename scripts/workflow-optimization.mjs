#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOptimizationRegistry,
  completeOptimizationRun,
  planOptimizationTier,
  prepareOptimizationRun,
  validateOptimizationPolicy,
} from "./workflow-optimization-policy.mjs";
import { auditGeneralizationAssets } from "./freeze-generalization-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

export function loadOptimizationConfiguration() {
  const policy = validateOptimizationPolicy(readJson("benchmarks/paper-import/optimization-policy.json"));
  const generalizationManifest = readJson("benchmarks/paper-import/generalization-suite-v1.json");
  auditGeneralizationAssets(generalizationManifest, { rootDirectory: root });
  const registry = buildOptimizationRegistry({
    sourceManifest: readJson("benchmarks/paper-import/source-manifest.json"),
    generalizationManifest,
  });
  return { policy, registry };
}

export function createOptimizationPlan(tier = "quick") {
  const { policy, registry } = loadOptimizationConfiguration();
  return planOptimizationTier({ policy, registry, tier });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? "plan";
  const tier = option("--tier") ?? "quick";
  if (command === "plan") {
    const plan = createOptimizationPlan(tier);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    if (!plan.ready) process.exitCode = 2;
  } else if (command === "prepare") {
    const { policy, registry } = loadOptimizationConfiguration();
    const prepared = prepareOptimizationRun({
      policy,
      registry,
      tier,
      changedStage: option("--changed-stage"),
      baselineWorkflowIdentity: option("--baseline"),
      candidateModuleIdentity: option("--candidate"),
    });
    const output = option("--output");
    if (output) fs.writeFileSync(path.resolve(output), `${JSON.stringify(prepared, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(prepared, null, 2)}\n`);
  } else if (command === "complete") {
    const prepared = readJson(path.relative(root, path.resolve(option("--run"))));
    const caseResults = readJson(path.relative(root, path.resolve(option("--results"))));
    const completed = completeOptimizationRun({ preparedRun: prepared, caseResults });
    const output = option("--output");
    if (output) fs.writeFileSync(path.resolve(output), `${JSON.stringify(completed, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(completed, null, 2)}\n`);
  } else {
    throw new Error("usage: workflow-optimization.mjs <plan|prepare|complete> [options]");
  }
}
