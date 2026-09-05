#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const paperImportClient = require("../src/paper-import/paper-import-client.js");
const { unzipSync } = require("../capabilities/browser/vendor/fflate/fflate.min.js");

export const DEFAULT_CONCURRENCY = 6;
export const DEFAULT_MODEL = "muse-spark-1.3-contributor";
export const DEFAULT_ENDPOINT = "https://opencode.ai/zen/go/v1";
export const DEFAULT_MINERU_GATEWAY = "https://cmath-mineru-gateway.cmath-math-map.workers.dev/api/mineru";

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} 必须是正整数`);
  return parsed;
}

export function parseArgs(argv = []) {
  const pdfPaths = [];
  let concurrency = DEFAULT_CONCURRENCY;
  let outputDir = "v521-paper-batch-output";
  let positionalOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = String(argv[index]);
    if (positionalOnly) {
      pdfPaths.push(arg);
      continue;
    }
    if (arg === "--") {
      positionalOnly = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--concurrency" || arg.startsWith("--concurrency=")) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : argv[++index];
      concurrency = positiveInteger(value, "--concurrency");
      continue;
    }
    if (arg === "--output-dir" || arg.startsWith("--output-dir=")) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : argv[++index];
      if (typeof value !== "string" || !value.trim() || value.startsWith("-")) throw new Error("--output-dir 必须是非空路径");
      outputDir = value;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`未知参数：${arg}`);
    pdfPaths.push(arg);
  }

  if (!pdfPaths.length) throw new Error("至少需要一份 PDF；用法：node scripts/run-v521-paper-batch.mjs --concurrency 6 --output-dir <dir> <pdf...>");
  return { concurrency, outputDir: path.resolve(outputDir), pdfPaths };
}

export async function runBoundedPool(items, concurrency, worker) {
  const values = Array.from(items ?? []);
  const limit = positiveInteger(concurrency, "并发数");
  if (typeof worker !== "function") throw new TypeError("worker 必须是函数");
  const results = new Array(values.length);
  let nextIndex = 0;

  async function consume() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      try {
        results[index] = { status: "fulfilled", value: await worker(values[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => consume()));
  return results;
}

function readApiKey(env = process.env) {
  const fromEnv = typeof env.OPENCODE_GO_API_KEY === "string" ? env.OPENCODE_GO_API_KEY.trim() : "";
  if (fromEnv) return fromEnv;
  const home = typeof env.HOME === "string" && env.HOME.trim() ? env.HOME : os.homedir();
  const keysPath = path.join(home, ".gamma-math-map", "keys.json");
  return fs.readFile(keysPath, "utf8")
    .then((text) => {
      try {
        const keys = JSON.parse(text);
        return typeof keys?.providers?.opencode?.apiKey === "string"
          ? keys.providers.opencode.apiKey.trim()
          : "";
      } catch {
        return "";
      }
    })
    .catch(() => "");
}

function pdfFile(fileName, bytes, stat) {
  const data = Buffer.from(bytes);
  return {
    name: fileName,
    type: "application/pdf",
    size: data.byteLength,
    lastModified: Number.isFinite(stat?.mtimeMs) ? stat.mtimeMs : 0,
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

function safeError(error, secret = "") {
  const details = { name: error?.name || "Error" };
  if (typeof error?.code === "string" && error.code) details.code = error.code.slice(0, 80);
  if (Number.isInteger(error?.status)) details.status = error.status;
  if (typeof error?.reason === "string" && error.reason) details.reason = error.reason.slice(0, 120);
  if (typeof error?.message === "string" && error.message) {
    details.message = error.message
      .replace(/Bearer\s+[^\s]+/giu, "[redacted]")
      .replace(/https?:\/\/[^\s)]+/giu, "[url]")
      .replace(/\s+/gu, " ")
      .slice(0, 240);
    if (secret) details.message = details.message.split(secret).join("[redacted]");
  }
  return details;
}

function safeStage(stage, info, atMs) {
  const result = { stage: String(stage), atMs };
  for (const key of ["phase", "operation", "state"]) {
    if (typeof info?.[key] === "string" && info[key]) result[key] = info[key].slice(0, 120);
  }
  for (const key of ["pageCount", "entries", "inferences", "openClaimCount"]) {
    if (Number.isFinite(info?.[key])) result[key] = info[key];
  }
  return result;
}

async function responseDiagnostics(response) {
  if (typeof response?.clone !== "function") return {};
  try {
    const text = await response.clone().text();
    const body = JSON.parse(text);
    const usage = body?.usage;
    const result = {};
    if (usage && typeof usage === "object") {
      const numericUsage = {};
      for (const [key, value] of Object.entries(usage)) {
        if (Number.isFinite(value)) numericUsage[key] = value;
      }
      if (Object.keys(numericUsage).length) result.usage = numericUsage;
    }
    const finishReason = body?.choices?.[0]?.finish_reason
      ?? body?.choices?.[0]?.finishReason
      ?? (body?.status === "incomplete" ? "length" : null);
    if (typeof finishReason === "string" && finishReason) result.finishReason = finishReason.slice(0, 80);
    return result;
  } catch {
    return {};
  }
}

function outputStem(pdfPath, index, usedNames) {
  const base = path.basename(pdfPath).replace(/\.pdf$/iu, "") || `paper-${index + 1}`;
  const safe = base.replace(/[^a-zA-Z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || `paper-${index + 1}`;
  const count = usedNames.get(safe) ?? 0;
  usedNames.set(safe, count + 1);
  return count ? `${safe}-${count + 1}` : safe;
}

async function runOnePaper(job, options) {
  const startedAt = Date.now();
  const stages = [];
  const modelCalls = [];
  let currentModelStage = null;
  const fileName = path.basename(job.pdfPath);
  const resultPath = path.join(options.outputDir, `${job.outputStem}.json`);
  const failurePath = path.join(options.outputDir, `${job.outputStem}.failed.json`);
  const nativeFetch = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);

  const modelFetch = async (url, init = {}) => {
    const callStartedAt = Date.now();
    const requestBody = (() => {
      try { return JSON.parse(init.body ?? "{}"); } catch { return {}; }
    })();
    try {
      if (typeof nativeFetch !== "function") throw new Error("当前 Node 环境没有 fetch");
      const response = await nativeFetch(url, init);
      modelCalls.push({
        stage: currentModelStage,
        model: options.model,
        status: Number.isInteger(response?.status) ? response.status : null,
        durationMs: Date.now() - callStartedAt,
        ...(await responseDiagnostics(response)),
        ...(typeof requestBody?.model === "string" ? { requestedModel: requestBody.model } : {}),
      });
      return response;
    } catch (error) {
      modelCalls.push({
        stage: currentModelStage,
        model: options.model,
        status: null,
        durationMs: Date.now() - callStartedAt,
        error: safeError(error, options.apiKey),
      });
      throw error;
    }
  };

  try {
    const stat = await fs.stat(job.pdfPath);
    const bytes = await fs.readFile(job.pdfPath);
    const pdf = pdfFile(fileName, bytes, stat);
    const view = await options.requestPaperProductionImport({
      pdf,
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      model: options.model,
      providerLabel: "OpenCode Go",
      frozenWorkflow: paperImportClient.V5_FROZEN_WORKFLOW,
      fetchImpl: modelFetch,
      mineruFetchImpl: nativeFetch,
      gatewayUrl: options.mineruGatewayUrl,
      unzip: (zipBytes) => unzipSync(zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes)),
      onStage: (stage, info = {}) => {
        if (["generate", "repair"].includes(stage) && info.phase === "start") currentModelStage = stage;
        stages.push(safeStage(stage, info, Date.now() - startedAt));
      },
    });
    const durationMs = Date.now() - startedAt;
    const artifact = {
      schema: "cmath.v521-paper-batch-result/v1",
      status: "complete",
      pdf: { fileName },
      model: { provider: "opencode-go", model: options.model, endpoint: options.endpoint },
      result: view,
      diagnostics: { durationMs, stages, modelCalls },
    };
    await fs.writeFile(resultPath, `${JSON.stringify(artifact, null, 2)}\n`);
    return { status: "complete", fileName, outputFile: path.basename(resultPath), durationMs, modelCalls };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const failure = {
      schema: "cmath.v521-paper-batch-result/v1",
      status: "failed",
      pdf: { fileName },
      model: { provider: "opencode-go", model: options.model, endpoint: options.endpoint },
      diagnostics: { durationMs, stages, modelCalls, error: safeError(error, options.apiKey) },
    };
    try { await fs.writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`); } catch (writeError) {
      return { status: "failed", fileName, outputFile: null, durationMs, modelCalls, error: safeError(writeError, options.apiKey) };
    }
    return { status: "failed", fileName, outputFile: path.basename(failurePath), durationMs, modelCalls, error: failure.diagnostics.error };
  }
}

export async function runBatch({
  pdfPaths,
  outputDir,
  concurrency = DEFAULT_CONCURRENCY,
  model = DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  mineruGatewayUrl,
  apiKey,
  env = process.env,
  fetchImpl,
  requestPaperProductionImport = paperImportClient.requestPaperProductionImport,
} = {}) {
  const paths = Array.from(pdfPaths ?? []);
  if (!paths.length) throw new Error("至少需要一份 PDF");
  const resolvedOutputDir = path.resolve(outputDir ?? "v521-paper-batch-output");
  const resolvedMineruGateway = typeof mineruGatewayUrl === "string" && mineruGatewayUrl.trim()
    ? mineruGatewayUrl.trim()
    : env.CMATH_MINERU_GATEWAY_URL?.trim() || DEFAULT_MINERU_GATEWAY;
  const key = typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : await readApiKey(env);
  if (!key) throw new Error("OpenCode Go API key is required (set OPENCODE_GO_API_KEY or configure ~/.gamma-math-map/keys.json)");
  if (typeof requestPaperProductionImport !== "function") throw new TypeError("requestPaperProductionImport 必须是函数");
  const limit = positiveInteger(concurrency, "并发数");
  await fs.mkdir(resolvedOutputDir, { recursive: true });

  const usedNames = new Map();
  const jobs = paths.map((pdfPath, index) => ({
    pdfPath: path.resolve(pdfPath),
    outputStem: outputStem(pdfPath, index, usedNames),
  }));
  const startedAt = Date.now();
  const settled = await runBoundedPool(jobs, limit, (job) => runOnePaper(job, {
    outputDir: resolvedOutputDir,
    apiKey: key,
    model,
    endpoint,
    mineruGatewayUrl: resolvedMineruGateway,
    fetchImpl,
    requestPaperProductionImport,
  }));
  const papers = settled.map((entry, index) => entry.status === "fulfilled"
    ? entry.value
    : {
      status: "failed",
      fileName: path.basename(jobs[index].pdfPath),
      outputFile: null,
      durationMs: null,
      modelCalls: [],
      error: safeError(entry.reason, key),
    });
  const manifest = {
    schema: "cmath.v521-paper-batch-manifest/v1",
    status: papers.every((paper) => paper.status === "complete") ? "complete" : "failed",
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    concurrency: limit,
    total: papers.length,
    completed: papers.filter((paper) => paper.status === "complete").length,
    failed: papers.filter((paper) => paper.status === "failed").length,
    model: { provider: "opencode-go", model, endpoint },
    mineruGateway: resolvedMineruGateway,
    papers,
  };
  const manifestPath = path.join(resolvedOutputDir, "manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...manifest, manifestPath };
}

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write("用法：node scripts/run-v521-paper-batch.mjs --concurrency 6 --output-dir <dir> <pdf...>\n");
    return { status: "help" };
  }
  const manifest = await runBatch(args);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    manifestPath: manifest.manifestPath,
    completed: manifest.completed,
    failed: manifest.failed,
    durationMs: manifest.durationMs,
  })}\n`);
  if (manifest.failed) process.exitCode = 1;
  return manifest;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().catch((error) => {
    process.stderr.write(`[v521-paper-batch] ${safeError(error).message ?? safeError(error).name}\n`);
    process.exitCode = 1;
  });
}
