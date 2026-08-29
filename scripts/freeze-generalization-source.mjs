#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mineru from "../src/paper-import/mineru/index.js";
import { computeSourceIdentity, NORMALIZATION_VERSION, normalizeMarkedMarkdown } from "./freeze-benchmark-sources.mjs";

export const GENERALIZATION_MINERU_VERSION = "mineru-model/vlm@gateway-contract-v1";
export const DEFAULT_MINERU_GATEWAY = "https://cmath-mineru-gateway.cmath-math-map.workers.dev/api/mineru";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "benchmarks/paper-import/generalization-suite-v1.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function fail(message) { throw new Error(`generalization source freeze: ${message}`); }

function cleanId(value, label) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(text)) fail(`${label} must be a kebab-case identifier`);
  return text;
}

function cleanText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) fail(`${label} is required`);
  return text;
}

function findZipMember(names, suffixPattern, label) {
  const matches = names.filter((name) => suffixPattern.test(name));
  if (matches.length !== 1) fail(`result ZIP must contain exactly one ${label}; found ${matches.length}`);
  return matches[0];
}

export function readMineruZip(zipPath) {
  const names = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
    .split(/\r?\n/u).map((name) => name.trim()).filter(Boolean);
  if (names.some((name) => name.startsWith("/") || name.split("/").includes(".."))) {
    fail("result ZIP contains an unsafe member path");
  }
  const fullMarkdownName = findZipMember(names, /(?:^|\/)(?:[^/]+_)?full\.md$/u, "full.md");
  const contentListName = findZipMember(names, /(?:^|\/)(?:[^/]+_)?content_list\.json$/u, "content_list.json");
  return {
    fullMarkdown: execFileSync("unzip", ["-p", zipPath, fullMarkdownName], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
    contentList: execFileSync("unzip", ["-p", zipPath, contentListName], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
  };
}

export function buildFrozenGeneralizationCase({ caseId, domain, title, sourceUrl, pdfBytes, fullMarkdown, contentList, mineruVersion = GENERALIZATION_MINERU_VERSION } = {}) {
  const normalizedCaseId = cleanId(caseId, "caseId");
  const normalizedDomain = cleanId(domain, "domain");
  const normalizedTitle = cleanText(title, "title");
  const normalizedSourceUrl = new URL(cleanText(sourceUrl, "sourceUrl"));
  if (normalizedSourceUrl.protocol !== "https:") fail("sourceUrl must use HTTPS");
  if (!(pdfBytes instanceof Uint8Array) || pdfBytes.length === 0) fail("pdfBytes must be non-empty");
  const marked = mineru.buildMarkedMarkdown({ fullMarkdown, contentList });
  const normalized = normalizeMarkedMarkdown(marked);
  const markdownBytes = Buffer.from(normalized.markdown, "utf8");
  const pdfSha256 = sha256(pdfBytes);
  const markdownSha256 = sha256(markdownBytes);
  const cleaningActions = [...new Set(normalized.cleaningActions)];
  const markedMarkdownPath = `benchmarks/paper-import/mineru-extracted/generalization/${normalizedCaseId}/${normalizedCaseId}-marked.md`;
  return Object.freeze({
    record: Object.freeze({
      caseId: normalizedCaseId,
      domain: normalizedDomain,
      title: normalizedTitle,
      sourcePdf: Object.freeze({ url: normalizedSourceUrl.toString(), sha256: pdfSha256 }),
      markedMarkdown: Object.freeze({ path: markedMarkdownPath, sha256: markdownSha256, bytes: markdownBytes.length }),
      mineru: Object.freeze({ version: cleanText(mineruVersion, "mineruVersion"), model: "vlm" }),
      normalization: Object.freeze({ version: NORMALIZATION_VERSION, cleaningActions }),
      pageCount: normalized.pages.length,
      sourceIdentitySha256: computeSourceIdentity({ pdfSha256, markdownSha256, mineruVersion, normalizationVersion: NORMALIZATION_VERSION, pageBoundaries: normalized.pages, cleaningActions }),
    }),
    markedMarkdown: normalized.markdown,
  });
}

export function addCaseToManifest(manifest, record) {
  if (!manifest || manifest.schema !== "cmath.benchmark-generalization-suite/v1") fail("manifest schema is invalid");
  if (manifest.status !== "assembling") fail("released generalization suite versions are immutable");
  if (!manifest.plannedDomains?.some((item) => item.domain === record.domain)) fail(`domain ${record.domain} is not planned`);
  if (manifest.activeCases?.some((item) => item.caseId === record.caseId)) fail(`case ${record.caseId} already exists`);
  return { ...structuredClone(manifest), activeCases: [...manifest.activeCases, structuredClone(record)].sort((left, right) => left.caseId.localeCompare(right.caseId)) };
}

export function auditGeneralizationAssets(manifest, { rootDirectory = root } = {}) {
  if (!manifest || manifest.schema !== "cmath.benchmark-generalization-suite/v1" || !Array.isArray(manifest.activeCases)) {
    fail("manifest schema is invalid");
  }
  const findings = [];
  for (const record of manifest.activeCases) {
    const relativePath = record?.markedMarkdown?.path;
    if (typeof relativePath !== "string" || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) {
      fail(`case ${record?.caseId ?? "unknown"} has an unsafe marked Markdown path`);
    }
    const assetPath = path.join(rootDirectory, relativePath);
    if (!fs.existsSync(assetPath)) fail(`case ${record.caseId} marked Markdown asset is missing`);
    const bytes = fs.readFileSync(assetPath);
    const normalized = normalizeMarkedMarkdown(bytes.toString("utf8"));
    if (normalized.markdown !== bytes.toString("utf8")) fail(`case ${record.caseId} marked Markdown is not canonical`);
    if (bytes.length !== record.markedMarkdown.bytes || sha256(bytes) !== record.markedMarkdown.sha256) {
      fail(`case ${record.caseId} marked Markdown digest does not match`);
    }
    if (normalized.pages.length !== record.pageCount) fail(`case ${record.caseId} page count does not match`);
    const identity = computeSourceIdentity({
      pdfSha256: record?.sourcePdf?.sha256,
      markdownSha256: record.markedMarkdown.sha256,
      mineruVersion: record?.mineru?.version,
      normalizationVersion: record?.normalization?.version,
      pageBoundaries: normalized.pages,
      cleaningActions: record?.normalization?.cleaningActions,
    });
    if (identity !== record.sourceIdentitySha256) fail(`case ${record.caseId} source identity does not match`);
    findings.push({ caseId: record.caseId, pageCount: record.pageCount, sourceIdentitySha256: identity });
  }
  return Object.freeze({ passed: true, cases: Object.freeze(findings) });
}

export function releaseGeneralizationManifest(manifest, options = {}) {
  if (manifest.status !== "assembling") fail("only an assembling suite can be released");
  auditGeneralizationAssets(manifest, options);
  for (const requirement of manifest.plannedDomains ?? []) {
    const count = manifest.activeCases.filter((item) => item.domain === requirement.domain).length;
    if (count < requirement.minimumActiveCases) fail(`domain ${requirement.domain} has ${count}/${requirement.minimumActiveCases} required cases`);
  }
  return { ...structuredClone(manifest), status: "active", releasedAt: new Date().toISOString() };
}

async function responseJson(response, label) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) fail(`${label} failed with HTTP ${response.status}`);
  return body;
}

async function uploadAndWait({ gateway, pdfBytes, caseId, pollIntervalMs = 5000, timeoutMs = 20 * 60 * 1000 }) {
  const base = gateway.replace(/\/+$/u, "");
  const uploaded = await responseJson(await fetch(`${base}/upload-file?name=${encodeURIComponent(`${caseId}.pdf`)}&model_version=vlm`, {
    method: "POST", headers: { "Content-Type": "application/pdf" }, body: pdfBytes,
  }), "MinerU upload");
  const batchId = uploaded?.data?.batch_id;
  if (!batchId) fail("MinerU upload returned no batch id");
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (Date.now() >= deadline) fail(`MinerU batch ${batchId} timed out`);
    const result = await responseJson(await fetch(`${base}/results/${encodeURIComponent(batchId)}`), "MinerU result poll");
    const extraction = result?.data?.extract_result ?? {};
    process.stderr.write(`[MinerU] ${caseId}: ${extraction.state || "unknown"}\n`);
    if (extraction.state === "failed") fail(extraction.err_msg || `MinerU batch ${batchId} failed`);
    if (extraction.state === "done") {
      const response = await fetch(`${base}/download/${encodeURIComponent(batchId)}`);
      if (!response.ok) fail(`MinerU ZIP download failed with HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function runCli() {
  const command = process.argv[2];
  if (command === "audit" || command === "release") {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const result = command === "audit" ? auditGeneralizationAssets(manifest) : releaseGeneralizationManifest(manifest);
    if (command === "release" && process.argv.includes("--write")) {
      fs.writeFileSync(manifestPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    }
    process.stdout.write(`${JSON.stringify({ command, write: process.argv.includes("--write"), result }, null, 2)}\n`);
    return;
  }
  if (command !== "add") fail("usage: freeze-generalization-source.mjs <add|audit|release> [options]");
  const caseId = cleanId(option("--case-id"), "caseId");
  const domain = cleanId(option("--domain"), "domain");
  const title = cleanText(option("--title"), "title");
  const sourceUrl = cleanText(option("--source-url"), "sourceUrl");
  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) fail(`PDF download failed with HTTP ${sourceResponse.status}`);
  const pdfBytes = new Uint8Array(await sourceResponse.arrayBuffer());
  if (pdfBytes.length > 25 * 1024 * 1024) fail("PDF exceeds the 25 MiB gateway limit");
  const zipBytes = await uploadAndWait({ gateway: option("--gateway") ?? DEFAULT_MINERU_GATEWAY, pdfBytes, caseId });
  const temporaryDirectory = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "cmath-mineru-"));
  const zipPath = path.join(temporaryDirectory, "result.zip");
  try {
    fs.writeFileSync(zipPath, zipBytes);
    const frozen = buildFrozenGeneralizationCase({ caseId, domain, title, sourceUrl, pdfBytes, ...readMineruZip(zipPath) });
    const manifest = addCaseToManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")), frozen.record);
    if (process.argv.includes("--write")) {
      const markdownPath = path.join(root, frozen.record.markedMarkdown.path);
      fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
      fs.writeFileSync(markdownPath, frozen.markedMarkdown, "utf8");
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
    process.stdout.write(`${JSON.stringify({ write: process.argv.includes("--write"), record: frozen.record }, null, 2)}\n`);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) await runCli();
