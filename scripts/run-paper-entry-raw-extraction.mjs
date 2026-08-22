#!/usr/bin/env node
/**
 * @file run-paper-entry-raw-extraction.mjs
 * Parallel extraction runner that reads PDF text and writes a frozen Raw Entry Pool artifact.
 * Schema: cmath.paper-raw-entry-pool/v1
 * ExtractionModuleVersion: paper-entry-parallel-extraction-v1.3
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import paperRawEntryPool from "../paper-raw-entry-pool-v1.js";

const {
  extractParallelRawEntryPool,
  validateRawEntryPool,
  RAW_ENTRY_POOL_SCHEMA,
  EXTRACTION_MODULE_VERSION,
  resolveRunnerExecutionConfig,
} = paperRawEntryPool;

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
          stage: "extract",
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
          process.stderr.write(`[paper-entry-raw-extraction] extract prompt_cache_retention compatibility 400; retrying once\n`);
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

        const isGatewayRetryable = response.status >= 500 && response.status <= 599;
        if (attempt === 1 && isGatewayRetryable && !currentInit?.signal?.aborted) {
          process.stderr.write(`[paper-entry-raw-extraction] extract gateway ${response.status}; retrying once\n`);
          continue;
        }

        return new Response(responseText, { status: response.status, headers: response.headers });
      } catch (error) {
        calls.push({
          stage: "extract",
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
        process.stderr.write(`[paper-entry-raw-extraction] extract transient-network-error; retrying once\n`);
      }
    }
    throw new Error("unreachable fetch retry state");
  };
}

export async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = argv;
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/run-paper-entry-raw-extraction.mjs <pdfPath> <outputPath> [model] [mode] [version] [--provider=<provider>]");
    console.log("Options:");
    console.log("  --provider=<name> Provider to use ('luna' or 'opencode-go'). Default: 'luna'.");
    console.log("  --version=<ver>   Extraction version (e.g. v1.10, v1.9, v1.8, v1.7, v1.6, v1.5, v1.4, v1.3). Defaults to v1.3 for backward compatibility.");
    console.log("Extracts parallel chunk raw entries from PDF text into a cmath.paper-raw-entry-pool/v1 JSON artifact.");
    process.exit(0);
  }

  let versionOpt = "paper-entry-parallel-extraction-v1.3";
  let providerOpt = "luna";
  let maxParallelOpt = 1;
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--version=")) {
      versionOpt = arg.slice("--version=".length).trim();
    } else if (arg === "--version" || arg === "-v") {
      if (i + 1 < args.length) {
        versionOpt = args[i + 1].trim();
        i += 1;
      }
    } else if (arg === "--v1.8" || arg === "-v1.8") {
      versionOpt = "paper-entry-parallel-extraction-v1.8";
    } else if (arg === "--v1.9" || arg === "-v1.9") {
      versionOpt = "paper-entry-parallel-extraction-v1.9";
    } else if (arg === "--v1.33" || arg === "-v1.33") {
      versionOpt = "paper-entry-parallel-extraction-v1.33";
    } else if (arg === "--v1.32" || arg === "-v1.32") {
      versionOpt = "paper-entry-parallel-extraction-v1.32";
    } else if (arg === "--v1.31" || arg === "-v1.31") {
      versionOpt = "paper-entry-parallel-extraction-v1.31";
    } else if (arg === "--v1.30" || arg === "-v1.30") {
      versionOpt = "paper-entry-parallel-extraction-v1.30";
    } else if (arg === "--v1.29" || arg === "-v1.29") {
      versionOpt = "paper-entry-parallel-extraction-v1.29";
    } else if (arg === "--v1.28" || arg === "-v1.28") {
      versionOpt = "paper-entry-parallel-extraction-v1.28";
    } else if (arg === "--v1.27" || arg === "-v1.27") {
      versionOpt = "paper-entry-parallel-extraction-v1.27";
    } else if (arg === "--v1.26" || arg === "-v1.26") {
      versionOpt = "paper-entry-parallel-extraction-v1.26";
    } else if (arg === "--v1.25" || arg === "-v1.25") {
      versionOpt = "paper-entry-parallel-extraction-v1.25";
    } else if (arg === "--v1.24" || arg === "-v1.24") {
      versionOpt = "paper-entry-parallel-extraction-v1.24";
    } else if (arg === "--v1.23" || arg === "-v1.23") {
      versionOpt = "paper-entry-parallel-extraction-v1.23";
    } else if (arg === "--v1.22" || arg === "-v1.22") {
      versionOpt = "paper-entry-parallel-extraction-v1.22";
    } else if (arg === "--v1.21" || arg === "-v1.21") {
      versionOpt = "paper-entry-parallel-extraction-v1.21";
    } else if (arg === "--v1.20" || arg === "-v1.20") {
      versionOpt = "paper-entry-parallel-extraction-v1.20";
    } else if (arg === "--v1.16" || arg === "-v1.16") {
      versionOpt = "paper-entry-parallel-extraction-v1.16";
    } else if (arg === "--v1.15" || arg === "-v1.15") {
      versionOpt = "paper-entry-parallel-extraction-v1.15";
    } else if (arg === "--v1.14" || arg === "-v1.14") {
      versionOpt = "paper-entry-parallel-extraction-v1.14";
    } else if (arg === "--v1.13" || arg === "-v1.13") {
      versionOpt = "paper-entry-parallel-extraction-v1.13";
    } else if (arg === "--v1.12" || arg === "-v1.12") {
      versionOpt = "paper-entry-parallel-extraction-v1.12";
    } else if (arg === "--v1.11" || arg === "-v1.11") {
      versionOpt = "paper-entry-parallel-extraction-v1.11";
    } else if (arg === "--v1.10" || arg === "-v1.10") {
      versionOpt = "paper-entry-parallel-extraction-v1.10";
    } else if (arg === "--v1.7" || arg === "-v1.7") {
      versionOpt = "paper-entry-parallel-extraction-v1.7";
    } else if (arg === "--v1.6" || arg === "-v1.6") {
      versionOpt = "paper-entry-parallel-extraction-v1.6";
    } else if (arg === "--v1.5.2" || arg === "-v1.5.2") {
      versionOpt = "paper-entry-parallel-extraction-v1.5.2";
    } else if (arg === "--v1.5.1" || arg === "-v1.5.1") {
      versionOpt = "paper-entry-parallel-extraction-v1.5.1";
    } else if (arg === "--v1.5" || arg === "-v1.5") {
      versionOpt = "paper-entry-parallel-extraction-v1.5";
    } else if (arg === "--v1.4" || arg === "-v1.4") {
      versionOpt = "paper-entry-parallel-extraction-v1.4";
    } else if (arg === "--v1.3" || arg === "-v1.3") {
      versionOpt = "paper-entry-parallel-extraction-v1.3";
    } else if (arg.startsWith("--max-parallel=")) {
      maxParallelOpt = Number(arg.slice("--max-parallel=".length).trim()) || 1;
    } else if (arg.startsWith("--provider=")) {
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

  const [pdfPath, outputPath, rawModel, mode = "off-compact", posVersion] = positional;
  if (!pdfPath || !outputPath) {
    console.error("Usage: node scripts/run-paper-entry-raw-extraction.mjs <pdfPath> <outputPath> [model] [mode] [version] [--provider=<provider>]");
    process.exit(1);
  }

  if (posVersion && !args.some((a) => a.startsWith("--version") || a.startsWith("-v"))) {
    versionOpt = posVersion;
  }

  if (versionOpt === "v1.8" || versionOpt === "1.8") {
    versionOpt = "paper-entry-parallel-extraction-v1.8";
  } else if (versionOpt === "v1.33" || versionOpt === "1.33") {
    versionOpt = "paper-entry-parallel-extraction-v1.33";
  } else if (versionOpt === "v1.32" || versionOpt === "1.32") {
    versionOpt = "paper-entry-parallel-extraction-v1.32";
  } else if (versionOpt === "v1.31" || versionOpt === "1.31") {
    versionOpt = "paper-entry-parallel-extraction-v1.31";
  } else if (versionOpt === "v1.30" || versionOpt === "1.30") {
    versionOpt = "paper-entry-parallel-extraction-v1.30";
  } else if (versionOpt === "v1.29" || versionOpt === "1.29") {
    versionOpt = "paper-entry-parallel-extraction-v1.29";
  } else if (versionOpt === "v1.28" || versionOpt === "1.28") {
    versionOpt = "paper-entry-parallel-extraction-v1.28";
  } else if (versionOpt === "v1.27" || versionOpt === "1.27") {
    versionOpt = "paper-entry-parallel-extraction-v1.27";
  } else if (versionOpt === "v1.26" || versionOpt === "1.26") {
    versionOpt = "paper-entry-parallel-extraction-v1.26";
  } else if (versionOpt === "v1.25" || versionOpt === "1.25") {
    versionOpt = "paper-entry-parallel-extraction-v1.25";
  } else if (versionOpt === "v1.24" || versionOpt === "1.24") {
    versionOpt = "paper-entry-parallel-extraction-v1.24";
  } else if (versionOpt === "v1.23" || versionOpt === "1.23") {
    versionOpt = "paper-entry-parallel-extraction-v1.23";
  } else if (versionOpt === "v1.22" || versionOpt === "1.22") {
    versionOpt = "paper-entry-parallel-extraction-v1.22";
  } else if (versionOpt === "v1.21" || versionOpt === "1.21") {
    versionOpt = "paper-entry-parallel-extraction-v1.21";
  } else if (versionOpt === "v1.20" || versionOpt === "1.20") {
    versionOpt = "paper-entry-parallel-extraction-v1.20";
  } else if (versionOpt === "v1.9" || versionOpt === "1.9") {
    versionOpt = "paper-entry-parallel-extraction-v1.9";
  } else if (versionOpt === "v1.16" || versionOpt === "1.16") {
    versionOpt = "paper-entry-parallel-extraction-v1.16";
  } else if (versionOpt === "v1.15" || versionOpt === "1.15") {
    versionOpt = "paper-entry-parallel-extraction-v1.15";
  } else if (versionOpt === "v1.14" || versionOpt === "1.14") {
    versionOpt = "paper-entry-parallel-extraction-v1.14";
  } else if (versionOpt === "v1.13" || versionOpt === "1.13") {
    versionOpt = "paper-entry-parallel-extraction-v1.13";
  } else if (versionOpt === "v1.12" || versionOpt === "1.12") {
    versionOpt = "paper-entry-parallel-extraction-v1.12";
  } else if (versionOpt === "v1.11" || versionOpt === "1.11") {
    versionOpt = "paper-entry-parallel-extraction-v1.11";
  } else if (versionOpt === "v1.10" || versionOpt === "1.10") {
    versionOpt = "paper-entry-parallel-extraction-v1.10";
  } else if (versionOpt === "v1.7" || versionOpt === "1.7") {
    versionOpt = "paper-entry-parallel-extraction-v1.7";
  } else if (versionOpt === "v1.6" || versionOpt === "1.6") {
    versionOpt = "paper-entry-parallel-extraction-v1.6";
  } else if (versionOpt === "v1.5.2" || versionOpt === "1.5.2") {
    versionOpt = "paper-entry-parallel-extraction-v1.5.2";
  } else if (versionOpt === "v1.5.1" || versionOpt === "1.5.1") {
    versionOpt = "paper-entry-parallel-extraction-v1.5.1";
  } else if (versionOpt === "v1.5" || versionOpt === "1.5") {
    versionOpt = "paper-entry-parallel-extraction-v1.5";
  } else if (versionOpt === "v1.4" || versionOpt === "1.4") {
    versionOpt = "paper-entry-parallel-extraction-v1.4";
  } else if (versionOpt === "v1.3" || versionOpt === "1.3") {
    versionOpt = "paper-entry-parallel-extraction-v1.3";
  }

  const providerConfig = resolveProviderConfig(providerOpt, rawModel, options);
  const { model, endpoint, apiKey, providerLabel, providerId, useProxy, proxyUrl } = providerConfig;

  const { reasoningEffort, tokenBudget } = resolveRunnerExecutionConfig(mode);

  const fileName = path.basename(pdfPath);
  let text = options.text;
  let pageCount = options.pageCount;
  if (text === undefined || pageCount === undefined) {
    if (pdfPath.endsWith(".md") || pdfPath.endsWith(".markdown")) {
      const rawMd = fs.readFileSync(pdfPath, "utf8");
      text = rawMd.trim();
      const pageMatches = [...text.matchAll(/\[\[PAGE\s+(\d+)\]\]/gu)];
      pageCount = pageMatches.length > 0 ? Math.max(...pageMatches.map((m) => Number(m[1]))) : 1;
    } else {
      const rawText = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      text = rawText.split("\f")
        .map((page) => page.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim())
        .map((page, index) => (page ? `[[PAGE ${index + 1}]]\n${page}` : ""))
        .filter(Boolean)
        .join("\n\n")
        .trim();
      pageCount = Number(execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/u)?.[1] ?? 0);
    }
  }

  const calls = [];
  const stages = [];
  const baseFetch = options.fetchImpl || globalThis.fetch;
  const underlyingFetch = useProxy
    ? createProxyFetch({ proxyUrl, apiKey, fetchImpl: baseFetch })
    : baseFetch;
  const measuredFetch = createMeasuredFetch(calls, { fetchImpl: underlyingFetch });

  const abortController = new AbortController();
  const startedAt = performance.now();
  const checkpointPath = `${outputPath}.checkpoint.json`;
  const sourceHash = crypto.createHash("sha256").update(text).digest("hex");
  let checkpoint = {
    schema: "cmath.paper-entry-extraction-checkpoint/v1",
    extractionModuleVersion: versionOpt,
    provider: providerId,
    model,
    source: { fileName, pageCount, sourceHash },
    lanes: {},
  };
  if (["paper-entry-parallel-extraction-v1.10", "paper-entry-parallel-extraction-v1.9", "paper-entry-parallel-extraction-v1.8", "paper-entry-parallel-extraction-v1.7", "paper-entry-parallel-extraction-v1.6"].includes(versionOpt) && fs.existsSync(checkpointPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
      const compatible = saved?.schema === checkpoint.schema
        && saved.extractionModuleVersion === versionOpt
        && saved.provider === providerId
        && saved.model === model
        && saved.source?.sourceHash === sourceHash;
      if (compatible && saved.lanes && typeof saved.lanes === "object") checkpoint = saved;
    } catch {
      // Ignore malformed checkpoint and start a clean resumable run.
    }
  }
  try {
    const rawPool = await extractParallelRawEntryPool({
      fileName,
      pageCount,
      text,
      endpoint,
      apiKey,
      model,
      providerLabel,
      reasoningEffort,
      maxChunks: 4,
      maxParallelCalls: maxParallelOpt,
      tokenBudget,
      version: versionOpt,
      signal: abortController.signal,
      fetchImpl: measuredFetch,
      laneCache: ["paper-entry-parallel-extraction-v1.10", "paper-entry-parallel-extraction-v1.9", "paper-entry-parallel-extraction-v1.8", "paper-entry-parallel-extraction-v1.7", "paper-entry-parallel-extraction-v1.6"].includes(versionOpt) ? checkpoint.lanes : undefined,
      onLaneComplete: ["paper-entry-parallel-extraction-v1.10", "paper-entry-parallel-extraction-v1.9", "paper-entry-parallel-extraction-v1.8", "paper-entry-parallel-extraction-v1.7", "paper-entry-parallel-extraction-v1.6"].includes(versionOpt)
        ? async ({ cacheKey, entries }) => {
          checkpoint.lanes[cacheKey] = entries;
          fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
          fs.writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
        }
        : undefined,
      onStage: (stage, info = {}) => {
        stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
        process.stderr.write(`[paper-entry-raw-extraction] ${stage} ${JSON.stringify(info)}\n`);
      },
    });

    validateRawEntryPool(rawPool);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(rawPool, null, 2)}\n`);
  if (["paper-entry-parallel-extraction-v1.16", "paper-entry-parallel-extraction-v1.15", "paper-entry-parallel-extraction-v1.14", "paper-entry-parallel-extraction-v1.13", "paper-entry-parallel-extraction-v1.12", "paper-entry-parallel-extraction-v1.11", "paper-entry-parallel-extraction-v1.10", "paper-entry-parallel-extraction-v1.9", "paper-entry-parallel-extraction-v1.8", "paper-entry-parallel-extraction-v1.7", "paper-entry-parallel-extraction-v1.6"].includes(versionOpt) && fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
    }
    process.stdout.write(JSON.stringify({
      status: "completed",
      outputPath,
      schema: rawPool.schema,
      extractionModuleVersion: rawPool.extractionModuleVersion,
      durationMs: Math.round(performance.now() - startedAt),
      chunks: rawPool.chunks.length,
      rawEntries: rawPool.rawEntries.length,
      calls: calls.length,
    }));
  } catch (error) {
    abortController.abort(error);
    const failure = {
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: versionOpt,
      status: "failed",
      provider: providerId,
      model,
      source: { fileName, pageCount, characters: text?.length ?? 0 },
      diagnostics: { durationMs: Math.round(performance.now() - startedAt), stages, calls, error: error.message },
    };
    const failurePath = outputPath.replace(/\.json$/u, ".failed.json");
    fs.mkdirSync(path.dirname(failurePath), { recursive: true });
    fs.writeFileSync(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
    process.stdout.write(JSON.stringify({ status: "failed", failurePath, durationMs: failure.diagnostics.durationMs, calls, message: error.message }));
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCli().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
