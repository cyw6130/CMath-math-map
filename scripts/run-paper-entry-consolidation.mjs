#!/usr/bin/env node
/**
 * @file run-paper-entry-consolidation.mjs
 * Deterministic consolidation runner that reads a Raw Entry Pool artifact
 * and writes a final Paper Entry artifact with ZERO model/API calls.
 * Schema: cmath.paper-entry-artifact/v1
 * ConsolidationModuleVersion: paper-entry-consolidation-v1
 */
import fs from "node:fs";
import path from "node:path";

import paperEntryConsolidation from "../src/paper-import/paper-entry-consolidation-v1.js";
import paperEntryArtifact from "../src/paper-import/paper-entry-artifact-v1.js";

const {
  consolidateRawEntryPool,
  CONSOLIDATION_MODULE_VERSION,
  ENTRY_ARTIFACT_SCHEMA,
} = paperEntryConsolidation;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/run-paper-entry-consolidation.mjs <rawPoolPath> <outputPath>");
  console.log("Deterministically consolidates a cmath.paper-raw-entry-pool/v1 into a cmath.paper-entry-artifact/v1 JSON artifact (0 model calls).");
  process.exit(0);
}

const [rawPoolPath, outputPath] = args;
if (!rawPoolPath || !outputPath) {
  console.error("Usage: node scripts/run-paper-entry-consolidation.mjs <rawPoolPath> <outputPath>");
  process.exit(1);
}

const rawContent = fs.readFileSync(rawPoolPath, "utf8");
let rawPool;
try {
  rawPool = JSON.parse(rawContent);
} catch (err) {
  throw new Error(`Failed to parse raw entry pool JSON: ${err.message}`);
}

const startedAt = performance.now();
try {
  const artifact = consolidateRawEntryPool(rawPool, { strictMath: true });
  paperEntryArtifact.validatePaperEntryArtifact(artifact);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

  process.stdout.write(JSON.stringify({
    status: "completed",
    outputPath,
    schema: artifact.schema,
    entryModuleVersion: artifact.entryModuleVersion,
    durationMs: Math.round(performance.now() - startedAt),
    entries: artifact.entries.length,
    rawEntries: rawPool.rawEntries?.length ?? 0,
    deduplicated: (rawPool.rawEntries?.length ?? 0) - artifact.entries.length,
  }));
} catch (error) {
  const failure = {
    schema: ENTRY_ARTIFACT_SCHEMA,
    entryModuleVersion: CONSOLIDATION_MODULE_VERSION,
    status: "failed",
    source: rawPool?.source ?? null,
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), error: error.message },
  };
  const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
  fs.mkdirSync(path.dirname(failurePath), { recursive: true });
  fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "failed", failurePath, durationMs: failure.diagnostics.durationMs, message: error.message }));
  process.exitCode = 2;
}
