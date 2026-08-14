#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const DEFAULT_PORT = 4317;
const GITHUB_PAGES_ORIGIN = "https://cyw6130.github.io";
const LOCAL_ORIGIN = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/u;
const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function isAllowedOrigin(origin) {
  return !origin || origin === GITHUB_PAGES_ORIGIN || LOCAL_ORIGIN.test(origin);
}

export function safePdfName(value) {
  let decoded = "paper.pdf";
  try { decoded = decodeURIComponent(String(value || "paper.pdf")); } catch { /* use fallback */ }
  const stem = basename(decoded).replace(/\.pdf$/iu, "").replace(/[^a-z0-9._-]+/giu, "-").replace(/^-+|-+$/gu, "") || "paper";
  return `${stem.slice(0, 100)}.pdf`;
}

function sendJson(response, status, value, origin = null) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  });
  response.end(body);
}

async function readPdfBody(request, limit = MAX_PDF_BYTES) {
  const declared = Number(request.headers["content-length"] ?? 0);
  if (declared > limit) throw Object.assign(new Error("PDF 文件不能超过 25 MB"), { statusCode: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("PDF 文件不能超过 25 MB"), { statusCode: 413 });
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  if (body.length < 5 || body.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw Object.assign(new Error("上传内容不是有效的 PDF 文件"), { statusCode: 400 });
  }
  return body;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout = `${stdout}${chunk}`.slice(-1_000_000); });
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-1_000_000); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(stderr.trim() || stdout.trim() || `Harness exited with code ${code}`));
    });
  });
}

export async function runHarnessImport({ pdfPath, outputDirectory, harnessRoot, modelProjectRoot }) {
  const cli = resolve(harnessRoot, "bin/cmath");
  if (!existsSync(cli)) throw new Error(`找不到 CMath Harness：${cli}`);
  if (!modelProjectRoot) throw new Error("请设置 CMATH_MODEL_PROJECT_ROOT，指向含 research/model-routing.json 的数学项目");
  await mkdir(outputDirectory, { recursive: true });
  await runCommand(process.execPath, [
    cli,
    "import-paper",
    "--pdf", pdfPath,
    "--project", outputDirectory,
    "--model-project", resolve(modelProjectRoot),
    "--stage-only",
  ], { cwd: harnessRoot, env: process.env });
  const projectView = JSON.parse(await readFile(join(outputDirectory, "candidate-project-view.json"), "utf8"));
  if (!projectView || typeof projectView !== "object" || Array.isArray(projectView)) {
    throw new Error("Harness 返回的 candidate-project-view.json 不是 JSON 对象");
  }
  return projectView;
}

export function createPaperImportServer(options = {}) {
  const runner = options.runner ?? runHarnessImport;
  const harnessRoot = resolve(options.harnessRoot ?? process.env.CMATH_HARNESS_ROOT ?? join(MODULE_ROOT, "..", "CMath-harness"));
  const modelProjectRoot = options.modelProjectRoot ?? process.env.CMATH_MODEL_PROJECT_ROOT ?? null;
  return createServer(async (request, response) => {
    const origin = request.headers.origin ?? null;
    if (!isAllowedOrigin(origin)) return sendJson(response, 403, { error: "该网页来源无权调用本机论文导入服务" });
    if (request.method === "OPTIONS" && request.url === "/v1/import-paper") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-CMath-Filename",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      return response.end();
    }
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, { status: "ready", candidateOnly: true }, origin);
    }
    if (request.method !== "POST" || request.url !== "/v1/import-paper") {
      return sendJson(response, 404, { error: "Not found" }, origin);
    }
    if (request.headers["content-type"]?.split(";", 1)[0] !== "application/pdf") {
      return sendJson(response, 415, { error: "Content-Type 必须是 application/pdf" }, origin);
    }

    let workspace = null;
    try {
      const pdf = await readPdfBody(request, options.maxPdfBytes);
      workspace = await mkdtemp(join(tmpdir(), "cmath-paper-import-"));
      const fileName = safePdfName(request.headers["x-cmath-filename"]);
      const pdfPath = join(workspace, fileName);
      const outputDirectory = join(workspace, "output");
      await writeFile(pdfPath, pdf, { flag: "wx" });
      const projectView = await runner({ pdfPath, outputDirectory, harnessRoot, modelProjectRoot });
      if (!projectView || typeof projectView !== "object" || Array.isArray(projectView)) {
        throw new Error("Harness 没有返回有效的 Project View JSON 对象");
      }
      sendJson(response, 200, {
        status: "completed",
        fileName: "candidate-project-view.json",
        projectView,
      }, origin);
    } catch (error) {
      sendJson(response, error.statusCode ?? 500, { error: error.message || "论文导入失败" }, origin);
    } finally {
      if (workspace) {
        try {
          await rm(workspace, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error(`Failed to clean paper import workspace: ${cleanupError.message}`);
        }
      }
    }
  });
}

function parsePort(argv) {
  const index = argv.indexOf("--port");
  if (index < 0) return Number(process.env.PORT ?? process.env.CMATH_PAPER_IMPORT_PORT ?? DEFAULT_PORT);
  return Number(argv[index + 1]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = parsePort(process.argv.slice(2));
  const host = process.env.HOST ?? process.env.CMATH_PAPER_IMPORT_HOST ?? "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port must be an integer between 1 and 65535");
  const server = createPaperImportServer();
  server.listen(port, host, () => {
    console.log(`CMath paper import service listening on ${host}:${port}`);
  });
}
