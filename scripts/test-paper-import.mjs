import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";

import paperImportClient from "../paper-import-client.js";

const [pdfPath, model = "deepseek-v4-flash", maxCharsRaw, reasoningEffort = "none"] = process.argv.slice(2);
if (!pdfPath) throw new Error("usage: node test-paper-import.mjs <pdf> [model] [maxChars] [reasoningEffort]");
const maxChars = maxCharsRaw ? Number(maxCharsRaw) : paperImportClient.MAX_PAPER_TEXT_CHARS;

const key = JSON.parse(fs.readFileSync(`${process.env.HOME}/.gamma-math-map/keys.json`, "utf8")).providers.opencode.apiKey;
const fileName = pdfPath.split("/").at(-1);

function proxyRequest(payload, timeoutMs = 1900000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request({ host: "127.0.0.1", port: 7100, path: "/api/model-proxy", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: timeoutMs }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode ?? 502,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("proxy request timed out")));
    request.on("error", reject);
    request.end(body);
  });
}

async function proxyFetch(targetUrl, init) {
  const auth = String(init?.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  const body = JSON.parse(init.body ?? "{}");
  const response = await proxyRequest({ targetUrl: String(targetUrl), apiKey: auth, body });
  console.error(`  [proxyFetch] proxy status ${response.status}, ${response.body.length} bytes: ${response.body.slice(0, 160)}`);
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers["content-type"] || "application/json; charset=utf-8" },
  });
}

const rawText = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
// 与浏览器端 extractPdfText 一致：逐页加 [[PAGE N]] 标记（pdftotext 以 \f 分页）
const text = rawText.split("\f")
  .map((page) => page.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim())
  .map((page, index) => (page ? `[[PAGE ${index + 1}]]\n${page}` : ""))
  .filter(Boolean)
  .join("\n\n")
  .trim();
const pageCount = Number(execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/u)?.[1] ?? 0);
console.log(`PDF: ${fileName} | pages: ${pageCount} | chars: ${text.length.toLocaleString()}`);
const truncated = text.length > maxChars;
const input = truncated ? `${text.slice(0, maxChars)}\n\n[文本超过 ${maxChars.toLocaleString()} 字符，已截断]` : text;

const started = Date.now();
const stages = [];
try {
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: key,
    model,
    providerLabel: "OpenCode Go",
    fileName,
    pageCount,
    text: input,
    fetchImpl: proxyFetch,
    reasoningEffort: reasoningEffort === "off" ? undefined : reasoningEffort,
    onStage: (stage, info = {}) => { stages.push({ stage, ...info }); console.log(`  stage: ${stage}`, Object.keys(info).length ? JSON.stringify(info).slice(0, 160) : ""); },
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`RESULT: PASS in ${seconds}s | entries: ${view.entries.length} | inferences: ${view.inferences.length} | b0: ${view.derivedResearchState?.mathematicalState?.b0ClaimEntryIds?.length ?? 0}`);
  console.log(`mainTarget: ${view.mainTargetEntryId} | openClaims: ${view.entries.filter((e) => e.entryClass === "claim").length} claims`);
  const outPath = `${import.meta.dirname}/output-${fileName.replace(/\.pdf$/iu, "")}-${model}.json`;
  fs.writeFileSync(outPath, `${JSON.stringify({ seconds: Number(seconds), stages, view }, null, 2)}\n`);
  console.log(`saved: ${outPath}`);
} catch (error) {
  console.log(`RESULT: FAIL in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`ERROR: ${error.message}`);
  process.exitCode = 2;
}
