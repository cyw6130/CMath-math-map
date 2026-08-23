import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import paperRawEntryPool from "../paper-raw-entry-pool-v1.js";
import paperEntryConsolidation from "../paper-entry-consolidation-v1.js";
import paperEntryArtifact from "../paper-entry-artifact-v1.js";

const {
  extractParallelRawEntryPool,
  validateRawEntryPool,
  resolveRunnerExecutionConfig,
} = paperRawEntryPool;
const { consolidateRawEntryPool } = paperEntryConsolidation;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/run-luna-paper-entry-extraction.mjs <pdfPath> <outputPath> [model] [mode]");
  console.log("Runs the two-stage modular Entry extraction pipeline (parallel raw pool -> deterministic consolidation).");
  process.exit(0);
}

const [pdfPath, outputPath, model = "gpt-5.6-luna", mode = "off-compact"] = args;
if (!pdfPath || !outputPath) {
  console.error("Usage: node scripts/run-luna-paper-entry-extraction.mjs <pdfPath> <outputPath> [model] [mode]");
  process.exit(1);
}

// Use the same credential authority as Codex's configured `sub2api` provider.
// The secret itself is never copied into this repository or run artifacts.
const codexLunaKeyPath = process.env.LUNA_API_KEY_FILE?.trim()
  || "/Users/chenyuwen/.config/opencode/secrets/openai_api_key";
const apiKey = process.env.LUNA_API_KEY?.trim()
  || (fs.existsSync(codexLunaKeyPath) ? fs.readFileSync(codexLunaKeyPath, "utf8").trim() : "");
if (!apiKey) throw new Error(`Luna API key is required (set LUNA_API_KEY or provide ${codexLunaKeyPath})`);

const endpoint = "https://8.220.199.185.sslip.io/v1";
const { reasoningEffort, tokenBudget } = resolveRunnerExecutionConfig(mode);

const fileName = path.basename(pdfPath);
const rawText = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const text = rawText.split("\f")
  .map((page) => page.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim())
  .map((page, index) => (page ? `[[PAGE ${index + 1}]]\n${page}` : ""))
  .filter(Boolean)
  .join("\n\n")
  .trim();
const pageCount = Number(execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/u)?.[1] ?? 0);
const calls = [];
const stages = [];

function isTransientNetworkError(error) {
  const message = `${error?.name ?? ""} ${error?.message ?? ""} ${error?.cause?.code ?? ""}`;
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR|socket|network/iu.test(message);
}

async function measuredFetch(url, init) {
  const requestBody = JSON.parse(init.body);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const startedAt = performance.now();
    try {
      const response = await fetch(url, init);
      const responseText = await response.text();
      let responseBody;
      try { responseBody = JSON.parse(responseText); } catch { responseBody = null; }
      calls.push({
        stage: "extract",
        attempt,
        requestedMaxTokens: requestBody.max_tokens ?? null,
        reasoningEffort: requestBody.reasoning_effort ?? null,
        durationMs: Math.round(performance.now() - startedAt),
        status: response.status,
        finishReason: responseBody?.choices?.[0]?.finish_reason ?? null,
        usage: responseBody?.usage ?? null,
      });
      return new Response(responseText, { status: response.status, headers: response.headers });
    } catch (error) {
      calls.push({
        stage: "extract",
        attempt,
        requestedMaxTokens: requestBody.max_tokens ?? null,
        reasoningEffort: requestBody.reasoning_effort ?? null,
        durationMs: Math.round(performance.now() - startedAt),
        status: null,
        finishReason: null,
        usage: null,
        error: error?.cause?.code ?? error?.message ?? String(error),
      });
      if (attempt === 2 || !isTransientNetworkError(error) || init.signal?.aborted) throw error;
      process.stderr.write(`[luna-paper-entry-extraction] extract transient-network-error; retrying once\n`);
    }
  }
  throw new Error("unreachable fetch retry state");
}

const startedAt = performance.now();
try {
  const rawPool = await extractParallelRawEntryPool({
    fileName,
    pageCount,
    text,
    endpoint,
    apiKey,
    model,
    providerLabel: "Luna Gateway",
    reasoningEffort,
    maxChunks: 4,
    tokenBudget,
    fetchImpl: measuredFetch,
    onStage: (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
      process.stderr.write(`[luna-paper-entry-extraction] ${stage} ${JSON.stringify(info)}\n`);
    },
  });

  validateRawEntryPool(rawPool);

  const rawPoolPath = outputPath.replace(/\.json$/u, ".raw-pool.json");
  fs.mkdirSync(path.dirname(rawPoolPath), { recursive: true });
  fs.writeFileSync(rawPoolPath, `${JSON.stringify(rawPool, null, 2)}\n`);

  // Deterministic consolidation (zero API calls)
  const artifact = consolidateRawEntryPool(rawPool, { strictMath: true });
  paperEntryArtifact.validatePaperEntryArtifact(artifact);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(JSON.stringify({
    status: "completed",
    outputPath,
    rawPoolPath,
    schema: artifact.schema,
    entryModuleVersion: artifact.entryModuleVersion,
    durationMs: Math.round(performance.now() - startedAt),
    calls: calls.length,
    entries: artifact.entries.length,
  }));
} catch (error) {
  const failure = {
    schema: "cmath.paper-entry-artifact/v1",
    entryModuleVersion: "paper-entry-consolidation-v1",
    status: "failed",
    provider: "luna-gateway",
    model,
    source: { fileName, pageCount, characters: text.length },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls, error: error.message },
  };
  const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
  fs.mkdirSync(path.dirname(failurePath), { recursive: true });
  fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "failed", failurePath, durationMs: failure.diagnostics.durationMs, calls, message: error.message }));
  process.exitCode = 2;
}
