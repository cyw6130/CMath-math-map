import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import paperImportClient from "../paper-import-client.js";
import paperImportV3Capability from "../paper-import-v3-capability.js";
import guideLeadContract from "../guide-lead-contract-v1.js";
import leadGuidedExtraction from "../lead-guided-extraction-v1.js";
import dualLaneAggregation from "../dual-lane-extraction-aggregation-v1.js";

const [pdfPath, outputPath, model = "gpt-5.6-luna", mode = "high-generous", workflowVersion = "v1", provider = "luna-gateway"] = process.argv.slice(2);
if (!pdfPath || !outputPath) {
  throw new Error("usage: node scripts/run-luna-paper-import.mjs <pdfPath> <outputPath> [model] [mode] [workflowVersion] [provider]");
}
if (!["v1", "v2", "v3", "v3.1", "v3.2", "v3.3", "v3.4", "v3.5", "v3.6", "v3.7", "v3.8", "v3.9", "v3.9.1", "v3.9.2", "v3.9.3", "v3.9.4", "v3.9.5", "v3.9.6", "v3.9.7", "v3.9.8", "v3.9.9", "v3.10", "v3.10.1", "v3.11", "v3.12", "v3.13", "v3.14", "v3.15", "v3.16", "v3.17", "v3.18", "v3.19", "v3.20", "v3.21", "v3.22", "v3.23", "v3.24", "v3.25", "v3.26", "v3.27", "v3.28", "v3.29", "v3.30", "v3.31", "v3.32", "v3.33", "v3.34", "v3.35", "v3.36", "v3.37", "v3.38", "v3.39", "v3.40", "v3.41"].includes(workflowVersion)) throw new Error("unknown workflow version: " + workflowVersion);
function readLocalProviderKey(providerName) {
  const keysPath = process.env.CMATH_KEYS_FILE?.trim()
    || path.join(process.env.HOME || "/Users/chenyuwen", ".gamma-math-map/keys.json");
  if (!fs.existsSync(keysPath)) return "";
  const keys = JSON.parse(fs.readFileSync(keysPath, "utf8"));
  return keys?.providers?.[providerName]?.apiKey?.trim() || "";
}

const isOpenCodeGo = provider === "opencode-go";
if (!isOpenCodeGo && provider !== "luna-gateway") throw new Error(`unsupported provider: ${provider}`);
if (isOpenCodeGo && !["deepseek-v4-flash", "muse-spark-1.2-contributor"].includes(model)) {
  throw new Error(`opencode-go supports deepseek-v4-flash and muse-spark-1.2-contributor, received ${model}`);
}
const codexLunaKeyPath = process.env.LUNA_API_KEY_FILE?.trim()
  || "/Users/chenyuwen/.config/opencode/secrets/openai_api_key";
const apiKey = isOpenCodeGo
  ? (process.env.OPENCODE_GO_API_KEY?.trim() || readLocalProviderKey("opencode"))
  : (process.env.LUNA_API_KEY?.trim() || (fs.existsSync(codexLunaKeyPath) ? fs.readFileSync(codexLunaKeyPath, "utf8").trim() : ""));
if (!apiKey) throw new Error(isDeepSeekFlash
  ? "OpenCode Go API key is required (set OPENCODE_GO_API_KEY or configure providers.opencode.apiKey)"
  : `Luna API key is required (set LUNA_API_KEY or provide ${codexLunaKeyPath})`);
const endpoint = isOpenCodeGo ? "https://opencode.ai/zen/go/v1" : "https://8.220.199.185.sslip.io/v1";
const providerLabel = isOpenCodeGo ? "OpenCode Go" : "Luna Gateway";
const providerId = isOpenCodeGo ? "opencode-go" : "luna-gateway";
const isCompact = mode === "off-compact";
const isMedium = mode === "medium-compact";
const isV337 = workflowVersion === "v3.37";
const isV338 = workflowVersion === "v3.38";
const isV339 = workflowVersion === "v3.39";
const isV340 = workflowVersion === "v3.40";
const isV341 = workflowVersion === "v3.41";
if (!isCompact && !isMedium && mode !== "high-generous") throw new Error(`unknown mode: ${mode}`);
const reasoningEffort = isCompact ? "none" : (isMedium ? "medium" : "high");
// V3.9.2 emits compact JSON and runs with reasoning disabled. Its observed
// completions are well below these ceilings; keep a smaller ceiling for this
// version while leaving historical versions on their old budgets.
const tokenBudget = isCompact
  ? (["v3.9.2", "v3.9.3", "v3.9.4", "v3.9.5", "v3.9.6", "v3.9.7", "v3.9.8", "v3.9.9", "v3.10", "v3.10.1", "v3.11", "v3.12", "v3.13", "v3.14", "v3.15", "v3.16", "v3.17", "v3.18", "v3.19", "v3.20", "v3.21", "v3.22", "v3.23", "v3.24", "v3.25", "v3.26", "v3.27", "v3.28", "v3.29", "v3.30", "v3.31", "v3.32", "v3.33", "v3.34", "v3.35", "v3.36"].includes(workflowVersion) || isV337 || isV338 || isV339 || isV340 || isV341
    ? { integrate: 6000, normal: 10000, retry: 16000 }
    : { integrate: 8000, normal: 16000, retry: 32000 })
    : isMedium ? { integrate: 8000, normal: 16000, retry: 32000 }
    : { integrate: 16000, normal: 32000, retry: 64000 };
const fileName = path.basename(pdfPath);
const caseSlug = fileName.replace(/\.pdf$/iu, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "paper";
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

async function measuredFetch(url, init) {
  const startedAt = performance.now();
  const requestBody = JSON.parse(init.body);
  let response;
  if (isOpenCodeGo) {
    const proxyUrl = process.env.LOCAL_MODEL_PROXY_URL?.trim() || "http://127.0.0.1:7100/api/model-proxy";
    response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: url, apiKey, body: requestBody }),
    });
  } else {
    response = await fetch(url, init);
  }
  const responseText = await response.text();
  let responseBody;
  try { responseBody = JSON.parse(responseText); } catch { responseBody = null; }
  calls.push({
    stage: stages.at(-1)?.stage ?? null,
    requestedMaxTokens: requestBody.max_tokens ?? null,
    reasoningEffort: requestBody.reasoning_effort ?? null,
    durationMs: Math.round(performance.now() - startedAt),
    status: response.status,
    finishReason: responseBody?.choices?.[0]?.finish_reason ?? null,
    usage: responseBody?.usage ?? null,
  });
  return new Response(responseText, { status: response.status, headers: response.headers });
}

const startedAt = performance.now();
try {
  const view = await paperImportClient.requestPaperProjectView({
    endpoint, apiKey, model, providerLabel, fileName, pageCount, text,
    fetchImpl: measuredFetch, reasoningEffort, maxChunks: 4, workflowVersion,
    workflowCapabilities: { paper: paperImportV3Capability, guideLead: guideLeadContract, leadGuided: leadGuidedExtraction, aggregate: dualLaneAggregation },
    tokenBudget,
    onStage: (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
      process.stderr.write(`[paper-import:${providerId}] ${stage} ${JSON.stringify(info)}\n`);
    },
  });
  const artifact = {
    schema: "cmath.paper-import-run/v1",
    experimentId: `${providerId}-paper-import-${caseSlug}-${mode}-${workflowVersion}`,
    condition: mode,
    workflowVersion,
    promptSetVersion: workflowVersion,
    provider: providerId,
    model,
    source: { fileName, pageCount, characters: text.length },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls },
    view,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(JSON.stringify({
    status: "completed", outputPath, durationMs: artifact.diagnostics.durationMs, calls: calls.length,
    entries: view.entries.length, inferences: view.inferences.length,
  }));
} catch (error) {
  const failure = {
    schema: "cmath.paper-import-run/v1",
    experimentId: `${providerId}-paper-import-${caseSlug}-${mode}-${workflowVersion}`,
    status: "failed", condition: mode, workflowVersion, promptSetVersion: workflowVersion,
    provider: providerId, model, source: { fileName, pageCount, characters: text.length },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls, error: error.message },
  };
  const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
  fs.mkdirSync(path.dirname(failurePath), { recursive: true });
  fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "failed", failurePath, durationMs: failure.diagnostics.durationMs, calls, message: error.message }));
  process.exitCode = 2;
}
