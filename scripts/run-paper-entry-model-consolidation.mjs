#!/usr/bin/env node
/**
 * @file run-paper-entry-model-consolidation.mjs
 * Model-assisted consolidation runner that reads a Raw Entry Pool artifact
 * and writes a final Paper Entry artifact using exactly one model call.
 * Schema: cmath.paper-entry-artifact/v1
 * ConsolidationModuleVersion: paper-entry-consolidation-v1.1-model
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import paperEntryConsolidationModel from "../src/paper-import/paper-entry-consolidation-v1.1-model.js";
import paperEntryArtifact from "../src/paper-import/paper-entry-artifact-v1.js";

const {
  consolidatePaperEntryPoolWithModel,
  resolveRunnerExecutionConfig,
  CONSOLIDATION_MODULE_VERSION,
  ENTRY_ARTIFACT_SCHEMA,
} = paperEntryConsolidationModel;

export function isTransientNetworkError(error) {
  const message = `${error?.name ?? ""} ${error?.message ?? ""} ${error?.cause?.code ?? ""}`;
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR|socket|network|ECONNREFUSED/iu.test(message);
}

export function createProxyFetch({
  proxyUrl = process.env.LOCAL_MODEL_PROXY_URL?.trim() || "http://127.0.0.1:7100/api/model-proxy",
  apiKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  return async function proxyFetch(targetUrl, init = {}) {
    let requestBody = null;
    if (init.body) {
      if (typeof init.body === "string") {
        try {
          requestBody = JSON.parse(init.body);
        } catch {
          requestBody = init.body;
        }
      } else {
        requestBody = init.body;
      }
    }

    const authHeader = typeof init.headers?.get === "function"
      ? (init.headers.get("Authorization") || init.headers.get("authorization"))
      : (init.headers?.Authorization || init.headers?.authorization || "");
    const authKey = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/iu, "").trim() : "";
    const resolvedKey = authKey || apiKey;

    const proxyPayload = {
      targetUrl: String(targetUrl),
      apiKey: resolvedKey,
      body: requestBody,
    };

    let proxyResponse;
    try {
      proxyResponse = await fetchImpl(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(proxyPayload),
        signal: init?.signal,
      });
    } catch (err) {
      const isConnRefused = err?.cause?.code === "ECONNREFUSED" || /ECONNREFUSED|connect refused/iu.test(err?.message || "");
      if (isConnRefused) {
        const proxyErr = new Error(`Local model proxy server unavailable at ${proxyUrl} (connection refused)`);
        proxyErr.cause = err;
        throw proxyErr;
      }
      throw err;
    }

    const responseText = await proxyResponse.text();
    return new Response(responseText, {
      status: proxyResponse.status,
      headers: proxyResponse.headers,
    });
  };
}

export function resolveProviderConfig(providerName = "luna", explicitModel = null, options = {}) {
  const norm = String(providerName || "luna").trim().toLowerCase();

  if (norm === "luna" || norm === "luna-gateway") {
    const codexLunaKeyPath = options.lunaKeyPath
      || process.env.LUNA_API_KEY_FILE?.trim()
      || "/Users/chenyuwen/.config/opencode/secrets/openai_api_key";
    const apiKey = options.apiKey
      || process.env.LUNA_API_KEY?.trim()
      || (fs.existsSync(codexLunaKeyPath) ? fs.readFileSync(codexLunaKeyPath, "utf8").trim() : "");
    if (!apiKey) {
      throw new Error(`Luna API key is required (set LUNA_API_KEY or provide ${codexLunaKeyPath})`);
    }

    return {
      provider: "luna",
      providerId: "luna-gateway",
      providerLabel: "Luna Gateway",
      endpoint: options.endpoint || "https://8.220.199.185.sslip.io/v1",
      model: explicitModel || "gpt-5.6-luna",
      apiKey,
      useProxy: false,
      proxyUrl: null,
    };
  }

  if (norm === "opencode-go" || norm === "opencode") {
    const model = explicitModel || "deepseek-v4-flash";
    const supportedModels = new Set(["deepseek-v4-flash", "muse-spark-1.2-contributor"]);
    if (!supportedModels.has(model)) {
      throw new Error(`Provider 'opencode-go' supports models 'deepseek-v4-flash' and 'muse-spark-1.2-contributor' (received '${model}')`);
    }

    let opencodeKey = options.apiKey || process.env.OPENCODE_GO_API_KEY?.trim();
    if (!opencodeKey) {
      const defaultKeysPath = path.join(process.env.HOME || "/Users/chenyuwen", ".gamma-math-map/keys.json");
      const keysPath = options.keysPath || process.env.OPENCODE_KEYS_FILE?.trim() || defaultKeysPath;
      if (fs.existsSync(keysPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(keysPath, "utf8"));
          opencodeKey = parsed?.providers?.opencode?.apiKey?.trim();
        } catch (err) {
          throw new Error(`Failed to parse keys file at ${keysPath}: ${err.message}`);
        }
      }
    }
    if (!opencodeKey) {
      throw new Error("OpenCode Go API key is required (set OPENCODE_GO_API_KEY or provide providers.opencode.apiKey in ~/.gamma-math-map/keys.json)");
    }

    return {
      provider: "opencode-go",
      providerId: "opencode-go",
      providerLabel: "OpenCode Go",
      endpoint: options.endpoint || "https://opencode.ai/zen/go/v1",
      model,
      apiKey: opencodeKey,
      useProxy: true,
      proxyUrl: options.proxyUrl || process.env.LOCAL_MODEL_PROXY_URL?.trim() || "http://127.0.0.1:7100/api/model-proxy",
    };
  }

  throw new Error(`Unsupported provider '${providerName}'. Supported providers: 'luna', 'opencode-go'.`);
}

export function createMeasuredFetch(calls = [], { fetchImpl = globalThis.fetch } = {}) {
  return async function measuredFetch(url, init) {
    let currentInit = init;
    let currentRequestBody = null;
    try {
      currentRequestBody = typeof currentInit?.body === "string" ? JSON.parse(currentInit.body) : null;
    } catch {
      currentRequestBody = null;
    }

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const startedAt = performance.now();
      try {
        const response = await fetchImpl(url, currentInit);
        const responseText = await response.text();
        let responseBody;
        try { responseBody = JSON.parse(responseText); } catch { responseBody = null; }
        calls.push({
          stage: "consolidate",
          attempt,
          requestedMaxTokens: currentRequestBody?.max_tokens ?? null,
          reasoningEffort: currentRequestBody?.reasoning_effort ?? null,
          durationMs: Math.round(performance.now() - startedAt),
          status: response.status,
          finishReason: responseBody?.choices?.[0]?.finish_reason ?? null,
          usage: responseBody?.usage ?? null,
        });

        const isPromptCacheCompat400 = response.status === 400 && responseText.includes("prompt_cache_retention is not supported on this model");
        if (attempt === 1 && isPromptCacheCompat400 && !currentInit?.signal?.aborted) {
          process.stderr.write(`[paper-entry-model-consolidation] consolidate prompt_cache_retention compatibility 400; retrying once\n`);
          if (currentRequestBody && typeof currentRequestBody === "object" && "prompt_cache_retention" in currentRequestBody) {
            const nextBody = { ...currentRequestBody };
            delete nextBody.prompt_cache_retention;
            currentRequestBody = nextBody;
            currentInit = {
              ...currentInit,
              body: JSON.stringify(nextBody),
            };
          }
          continue;
        }

        const isGatewayRetryable = response.status === 502 || response.status === 503 || response.status === 504;
        if (attempt === 1 && isGatewayRetryable && !currentInit?.signal?.aborted) {
          process.stderr.write(`[paper-entry-model-consolidation] consolidate gateway ${response.status}; retrying once\n`);
          continue;
        }

        return new Response(responseText, { status: response.status, headers: response.headers });
      } catch (error) {
        calls.push({
          stage: "consolidate",
          attempt,
          requestedMaxTokens: currentRequestBody?.max_tokens ?? null,
          reasoningEffort: currentRequestBody?.reasoning_effort ?? null,
          durationMs: Math.round(performance.now() - startedAt),
          status: null,
          finishReason: null,
          usage: null,
          error: error?.cause?.code ?? error?.message ?? String(error),
        });
        if (attempt === 2 || !isTransientNetworkError(error) || currentInit?.signal?.aborted) throw error;
        process.stderr.write(`[paper-entry-model-consolidation] consolidate transient-network-error; retrying once\n`);
      }
    }
    throw new Error("unreachable fetch retry state");
  };
}

export async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = argv;
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/run-paper-entry-model-consolidation.mjs <rawPoolPath> <outputPath> [model] [mode] [--provider=<provider>]");
    console.log("Consolidates a cmath.paper-raw-entry-pool/v1 into a canonical cmath.paper-entry-artifact/v1 JSON artifact using exactly 1 model call.");
    console.log("Modes: off-compact, low-compact, medium-compact, high-compact, high-generous (or off, low, medium, high)");
    console.log("Options:");
    console.log("  --provider=<name> Provider to use ('luna' or 'opencode-go'). Default: 'luna'.");
    process.exit(0);
  }

  let providerOpt = "luna";
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--provider=")) {
      providerOpt = arg.slice("--provider=".length).trim();
    } else if (arg === "--provider" || arg === "-p") {
      if (i + 1 < args.length) {
        providerOpt = args[i + 1].trim();
        i += 1;
      }
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  const [rawPoolPath, outputPath, rawModel, mode = "off-compact"] = positional;
  if (!rawPoolPath || !outputPath) {
    console.error("Usage: node scripts/run-paper-entry-model-consolidation.mjs <rawPoolPath> <outputPath> [model] [mode] [--provider=<provider>]");
    process.exit(1);
  }

  let rawPool = options.rawPool;
  if (!rawPool) {
    const rawContent = fs.readFileSync(rawPoolPath, "utf8");
    try {
      rawPool = JSON.parse(rawContent);
    } catch (err) {
      throw new Error(`Failed to parse raw entry pool JSON: ${err.message}`);
    }
  }

  const providerConfig = resolveProviderConfig(providerOpt, rawModel, options);
  const { model, endpoint, apiKey, providerLabel, providerId, useProxy, proxyUrl } = providerConfig;

  const { reasoningEffort, tokenBudget } = resolveRunnerExecutionConfig(mode);

  const calls = [];
  const stages = [];
  const baseFetch = options.fetchImpl || globalThis.fetch;
  const underlyingFetch = useProxy
    ? createProxyFetch({ proxyUrl, apiKey, fetchImpl: baseFetch })
    : baseFetch;
  const measuredFetch = createMeasuredFetch(calls, { fetchImpl: underlyingFetch });

  const abortController = new AbortController();
  const startedAt = performance.now();

  try {
    const artifact = await consolidatePaperEntryPoolWithModel({
      rawPool,
      endpoint,
      apiKey,
      model,
      providerLabel,
      reasoningEffort,
      tokenBudget,
      signal: abortController.signal,
      fetchImpl: measuredFetch,
      onStage: (stage, info = {}) => {
        stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
        process.stderr.write(`[paper-entry-model-consolidation] ${stage} ${JSON.stringify(info)}\n`);
      },
    });

    paperEntryArtifact.validatePaperEntryArtifact(artifact);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

    const rawCount = rawPool.rawEntries?.length ?? 0;
    const preCount = artifact.diagnostics?.consolidationSummary?.preCanonicalCount ?? rawCount;

    process.stdout.write(JSON.stringify({
      status: "completed",
      outputPath,
      schema: artifact.schema,
      entryModuleVersion: artifact.entryModuleVersion,
      durationMs: Math.round(performance.now() - startedAt),
      entries: artifact.entries.length,
      rawEntries: rawCount,
      preCanonicalEntries: preCount,
      calls: calls.length || artifact.diagnostics?.calls?.length || 1,
    }));
  } catch (error) {
    abortController.abort(error);
    const failure = {
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: CONSOLIDATION_MODULE_VERSION,
      status: "failed",
      provider: providerId,
      model,
      source: rawPool?.source ?? null,
      diagnostics: {
        durationMs: Math.round(performance.now() - startedAt),
        stages,
        calls,
        error: error.message,
      },
    };
    const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
    fs.mkdirSync(path.dirname(failurePath), { recursive: true });
    fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
    process.stdout.write(JSON.stringify({
      status: "failed",
      failurePath,
      durationMs: failure.diagnostics.durationMs,
      calls: calls.length,
      message: error.message,
    }));
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCli().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
