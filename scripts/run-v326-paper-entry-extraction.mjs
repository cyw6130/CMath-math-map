#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import paperImportClient from "../src/paper-import/paper-import-client.js";
import paperImportV3Capability from "../src/paper-import/paper-import-v3-capability.js";
import guideLeadContract from "../src/paper-import/guide-lead-contract-v1.js";
import leadGuidedExtraction from "../src/paper-import/lead-guided-extraction-v1.js";
import dualLaneAggregation from "../src/paper-import/dual-lane-extraction-aggregation-v1.js";
import { createProxyFetch, createMeasuredFetch, resolveProviderConfig } from "./run-paper-entry-raw-extraction.mjs";

const [pdfPath, outputPath, mode = "off-compact", model = "deepseek-v4-flash"] = process.argv.slice(2);
if (!pdfPath || !outputPath) {
  throw new Error("usage: node scripts/run-v326-paper-entry-extraction.mjs <pdfPath> <outputPath> [off-compact] [model]");
}
if (mode !== "off-compact") throw new Error(`unsupported mode: ${mode}`);

const provider = resolveProviderConfig("opencode-go", model);
const proxyFetch = createProxyFetch({ proxyUrl: provider.proxyUrl, apiKey: provider.apiKey });
const calls = [];
const measuredFetch = createMeasuredFetch(calls, { fetchImpl: proxyFetch });
const rawText = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const text = rawText.split("\f")
  .map((page) => page.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim())
  .map((page, index) => (page ? `[[PAGE ${index + 1}]]\n${page}` : ""))
  .filter(Boolean)
  .join("\n\n")
  .trim();
const pageCount = Number(execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/u)?.[1] ?? 0);
const stages = [];
const startedAt = performance.now();

try {
  const artifact = await paperImportClient.requestPaperEntryArtifact({
    endpoint: provider.endpoint,
    apiKey: provider.apiKey,
    model: provider.model,
    providerLabel: provider.providerLabel,
    fileName: path.basename(pdfPath),
    pageCount,
    text,
    fetchImpl: measuredFetch,
    reasoningEffort: "none",
    maxChunks: 4,
    workflowCapabilities: {
      paper: paperImportV3Capability,
      guideLead: guideLeadContract,
      leadGuided: leadGuidedExtraction,
      aggregate: dualLaneAggregation,
    },
    onStage: (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
      process.stderr.write(`[v326-entry:opencode-go] ${stage} ${JSON.stringify(info)}\n`);
    },
  });
  const persistedArtifact = {
    ...JSON.parse(JSON.stringify(artifact)),
    diagnostics: {
    ...artifact.diagnostics,
    durationMs: Math.round(performance.now() - startedAt),
    stages,
    calls,
    },
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(persistedArtifact, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "completed", outputPath, durationMs: persistedArtifact.diagnostics.durationMs, calls: calls.length, entries: persistedArtifact.entries.length }));
} catch (error) {
  const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
  const failure = {
    schema: "cmath.paper-entry-artifact/v1",
    entryModuleVersion: "paper-entry-extraction-v1.1",
    status: "failed",
    provider: provider.providerId,
    model: provider.model,
    source: { fileName: path.basename(pdfPath), pageCount, characters: text.length },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls, error: error.message },
  };
  fs.mkdirSync(path.dirname(failurePath), { recursive: true });
  fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "failed", failurePath, message: error.message }));
  process.exitCode = 2;
}
