#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import production from "../src/paper-import/production/index.js";
import { auditGeneralizationAssets } from "./freeze-generalization-source.mjs";

export const SOL_RUNNER = Object.freeze({
  provider: "luna-gateway",
  model: "gpt-5.6-sol",
  mode: "medium-compact",
  reasoningEffort: "medium",
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function resolveFrozenCase(caseId) {
  const regression = readJson("benchmarks/paper-import/source-manifest.json").activeCases;
  const generalizationManifest = readJson("benchmarks/paper-import/generalization-suite-v1.json");
  auditGeneralizationAssets(generalizationManifest, { rootDirectory: root });
  const record = [...regression, ...generalizationManifest.activeCases].find((item) => item.caseId === caseId);
  if (!record) throw new Error(`unknown frozen case: ${caseId}`);
  const markedPath = path.join(root, record.markedMarkdown.path);
  const markedMarkdown = fs.readFileSync(markedPath, "utf8");
  if (sha256(Buffer.from(markedMarkdown, "utf8")) !== record.markedMarkdown.sha256) {
    throw new Error(`frozen source digest mismatch: ${caseId}`);
  }
  return { record, markedMarkdown };
}

export function resolveSolCredential() {
  const direct = process.env.LUNA_API_KEY?.trim();
  if (direct) return direct;
  const file = process.env.LUNA_API_KEY_FILE?.trim();
  if (file && fs.existsSync(file) && fs.statSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink()) {
    const value = fs.readFileSync(file, "utf8").trim();
    if (value) return value;
  }
  throw new Error("Sol runner requires LUNA_API_KEY or LUNA_API_KEY_FILE");
}

async function run() {
  const caseId = option("--case");
  const output = option("--output");
  if (!caseId || !output) throw new Error("usage: run-sol-paper-import-source.mjs --case ID --output FILE");
  const { record, markedMarkdown } = resolveFrozenCase(caseId);
  const apiKey = resolveSolCredential();
  const endpoint = process.env.LUNA_API_ENDPOINT?.trim() || "https://8.220.199.185.sslip.io/v1";
  const stages = [];
  const calls = [];
  const startedAt = Date.now();
  const measuredFetch = async (url, init) => {
    const callStartedAt = Date.now();
    const body = JSON.parse(init.body);
    if (body.model !== SOL_RUNNER.model || body.reasoning_effort !== SOL_RUNNER.reasoningEffort) {
      throw new Error("model request escaped the Sol-only policy");
    }
    const response = await fetch(url, init);
    calls.push({
      stage: stages.at(-1)?.stage ?? null,
      model: body.model,
      reasoningEffort: body.reasoning_effort,
      durationMs: Date.now() - callStartedAt,
      status: response.status,
    });
    return response;
  };
  const view = await production.requestPaperProductionSemanticPipeline({
    endpoint,
    apiKey,
    model: SOL_RUNNER.model,
    providerLabel: "Luna Gateway",
    fileName: `${caseId}.pdf`,
    pageCount: record.pageCount,
    markedMarkdown,
    reasoningEffort: SOL_RUNNER.reasoningEffort,
    fetchImpl: measuredFetch,
    maxChunks: 4,
    allowPartialSuccess: true,
    allowRefinementDegradation: true,
    allowInferenceDegradation: true,
    onStage: (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Date.now() - startedAt });
      process.stderr.write(`[sol-paper-import] ${caseId} ${stage}\n`);
    },
  });
  const artifact = {
    schema: "cmath.sol-paper-import-run/v1",
    caseId,
    provider: SOL_RUNNER.provider,
    model: SOL_RUNNER.model,
    mode: SOL_RUNNER.mode,
    reasoningEffort: SOL_RUNNER.reasoningEffort,
    sourceIdentitySha256: record.sourceIdentitySha256,
    workflow: production.VNEXT_FROZEN_WORKFLOW,
    diagnostics: { durationMs: Date.now() - startedAt, stages, calls },
    view,
  };
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "completed", caseId, outputPath, calls: calls.length }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) await run();
