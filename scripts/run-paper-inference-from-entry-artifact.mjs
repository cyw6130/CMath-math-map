import fs from "node:fs";
import path from "node:path";

import paperImportClient from "../src/paper-import/paper-import-client.js";
import paperImportV3Capability from "../src/paper-import/paper-import-v3-capability.js";
import guideLeadContract from "../src/paper-import/guide-lead-contract-v1.js";
import leadGuidedExtraction from "../src/paper-import/lead-guided-extraction-v1.js";
import dualLaneAggregation from "../src/paper-import/dual-lane-extraction-aggregation-v1.js";
import paperEntryArtifact from "../src/paper-import/paper-entry-artifact-v1.js";

const rawArgs = process.argv.slice(2);
const positional = [];
let providerOpt = null;
for (const a of rawArgs) {
  if (a.startsWith("--provider=")) providerOpt = a.slice("--provider=".length).trim();
  else if (a === "--provider" || a === "-p") { /* handled via next positional check */ }
  else if (!a.startsWith("-")) positional.push(a);
  else if (a.startsWith("--provider")) providerOpt = rawArgs[rawArgs.indexOf(a) + 1]?.trim() || providerOpt;
}
const [entryArtifactPath, outputPath, model = "gpt-5.6-luna", mode = "off-compact", workflowVersion = "v3.26"] = positional;
if (!entryArtifactPath || !outputPath) {
  throw new Error("usage: node scripts/run-paper-inference-from-entry-artifact.mjs <entryArtifactPath> <outputPath> [model] [mode] [workflowVersion] [--provider=<provider>]");
}

function resolveProviderConfig(providerName, explicitModel) {
  const norm = String(providerName || "").trim().toLowerCase();
  // auto-detect from model name if provider not given
  const autoProvider = norm || (explicitModel === "muse-spark-1.2-contributor" || explicitModel === "deepseek-v4-flash" ? "opencode-go" : "luna-gateway");
  if (autoProvider === "opencode-go" || autoProvider === "opencode") {
    const supported = new Set(["deepseek-v4-flash", "muse-spark-1.2-contributor", "ox-alpha-free", "kimi-k3"]);
    if (!supported.has(explicitModel)) throw new Error(`opencode-go supports deepseek-v4-flash, muse-spark-1.2-contributor, ox-alpha-free, and kimi-k3, received '${explicitModel}'`);
    let opencodeKey = process.env.OPENCODE_GO_API_KEY?.trim();
    if (!opencodeKey) {
      const keysPath = process.env.CMATH_KEYS_FILE?.trim() || path.join(process.env.HOME || "/Users/chenyuwen", ".gamma-math-map/keys.json");
      if (fs.existsSync(keysPath)) {
        try { opencodeKey = JSON.parse(fs.readFileSync(keysPath, "utf8"))?.providers?.opencode?.apiKey?.trim(); } catch {}
      }
    }
    if (!opencodeKey) throw new Error("OpenCode Go API key is required (set OPENCODE_GO_API_KEY or configure providers.opencode.apiKey)");
    return { providerId: "opencode-go", providerLabel: "OpenCode Go", endpoint: "https://opencode.ai/zen/go/v1", apiKey: opencodeKey, useProxy: true, proxyUrl: process.env.LOCAL_MODEL_PROXY_URL?.trim() || "http://127.0.0.1:7100/api/model-proxy" };
  }
  const codexLunaKeyPath = process.env.LUNA_API_KEY_FILE?.trim() || "/Users/chenyuwen/.config/opencode/secrets/openai_api_key";
  const apiKey = process.env.LUNA_API_KEY?.trim() || (fs.existsSync(codexLunaKeyPath) ? fs.readFileSync(codexLunaKeyPath, "utf8").trim() : "");
  if (!apiKey) throw new Error(`Luna API key is required (set LUNA_API_KEY or provide ${codexLunaKeyPath})`);
  return { providerId: "luna-gateway", providerLabel: "Luna Gateway", endpoint: "https://8.220.199.185.sslip.io/v1", apiKey, useProxy: false, proxyUrl: null };
}
const providerConfig = resolveProviderConfig(providerOpt, model);
const { providerId, providerLabel, endpoint, apiKey, useProxy, proxyUrl } = providerConfig;
const isCompact = mode === "off-compact";
const isMedium = mode === "medium-compact";
if (!isCompact && !isMedium && mode !== "high-generous") throw new Error(`unknown mode: ${mode}`);
const reasoningEffort = isCompact ? "none" : (isMedium ? "medium" : "high");
const tokenBudget = isCompact
  ? { integrate: 6000, normal: 10000, retry: 16000 }
  : isMedium
  ? { integrate: 8000, normal: 16000, retry: 32000 }
  : { integrate: 16000, normal: 32000, retry: 64000 };

const rawContent = fs.readFileSync(entryArtifactPath, "utf8");
let artifact;
try {
  artifact = JSON.parse(rawContent);
} catch (err) {
  throw new Error(`Failed to parse entry artifact JSON: ${err.message}`);
}

paperEntryArtifact.validatePaperEntryArtifact(artifact);

const fileName = artifact.source?.fileName || "paper.pdf";
const caseSlug = fileName.replace(/\.pdf$/iu, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "paper";
const pageCount = artifact.source?.pageCount ?? 1;
const textLength = artifact.source?.characters ?? (artifact.source?.sourceText || "").length;

const calls = [];
const stages = [];

async function measuredFetch(url, init) {
  const startedAt = performance.now();
  const requestBody = JSON.parse(init.body);
  let response;
  if (useProxy) {
    response = await fetch(proxyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUrl: url, apiKey, body: requestBody }) });
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
  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact,
    endpoint,
    apiKey,
    model,
    providerLabel,
    fetchImpl: measuredFetch,
    reasoningEffort,
    workflowVersion,
    workflowCapabilities: {
      paper: paperImportV3Capability,
      guideLead: guideLeadContract,
      leadGuided: leadGuidedExtraction,
      aggregate: dualLaneAggregation,
    },
    tokenBudget,
    onStage: (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
      process.stderr.write(`[paper-inference-from-entry] ${stage} ${JSON.stringify(info)}\n`);
    },
  });

  const runArtifact = {
    schema: "cmath.paper-import-run/v1",
    experimentId: `${providerId}-resumed-import-${caseSlug}-${mode}-${workflowVersion}`,
    condition: mode,
    workflowVersion,
    promptSetVersion: workflowVersion,
    resumedFromEntryArtifact: {
      schema: artifact.schema,
      entryModuleVersion: artifact.entryModuleVersion,
      entriesCount: artifact.entries?.length ?? 0,
    },
    provider: providerId,
    model,
    source: { fileName, pageCount, characters: textLength },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls },
    view,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(runArtifact, null, 2)}\n`);
  process.stdout.write(JSON.stringify({
    status: "completed",
    outputPath,
    durationMs: runArtifact.diagnostics.durationMs,
    calls: calls.length,
    entries: view.entries.length,
    inferences: view.inferences.length,
  }));
} catch (error) {
  const failure = {
    schema: "cmath.paper-import-run/v1",
    experimentId: `${providerId}-resumed-import-${caseSlug}-${mode}-${workflowVersion}`,
    status: "failed",
    condition: mode,
    workflowVersion,
    promptSetVersion: workflowVersion,
    provider: providerId,
    model,
    source: { fileName, pageCount, characters: textLength },
    diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls, error: error.message },
  };
  const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
  fs.mkdirSync(path.dirname(failurePath), { recursive: true });
  fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ status: "failed", failurePath, durationMs: failure.diagnostics.durationMs, calls, message: error.message }));
  process.exitCode = 2;
}
