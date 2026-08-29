#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import production from "../src/paper-import/production/index.js";
import {
  CODEX_CHATGPT_PROVIDER,
  createCodexChatGPTChat,
} from "./codex-chatgpt-transport.mjs";
import { auditGeneralizationAssets } from "./freeze-generalization-source.mjs";

export const SOL_RUNNER = Object.freeze({
  provider: CODEX_CHATGPT_PROVIDER,
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

async function run() {
  const caseId = option("--case");
  const output = option("--output");
  if (!caseId || !output) throw new Error("usage: run-sol-paper-import-source.mjs --case ID --output FILE");
  const { record, markedMarkdown } = resolveFrozenCase(caseId);
  const stages = [];
  const calls = [];
  const startedAt = Date.now();
  const chatImpl = createCodexChatGPTChat({ onCall: (call) => calls.push(call) });
  const view = await production.requestPaperProductionSemanticPipeline({
    endpoint: "https://codex-chatgpt-login.invalid/v1",
    apiKey: "codex-chatgpt-login-managed",
    model: SOL_RUNNER.model,
    providerLabel: "Luna Gateway",
    fileName: `${caseId}.pdf`,
    pageCount: record.pageCount,
    markedMarkdown,
    reasoningEffort: SOL_RUNNER.reasoningEffort,
    fetchImpl: async () => { throw new Error("HTTP model transport is disabled for Codex ChatGPT login"); },
    chatImpl,
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
