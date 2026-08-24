import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import mineru from "../src/paper-import/mineru/index.js";

const gatewayUrl = process.env.MINERU_LIVE_GATEWAY_URL?.trim() ?? "";
const pdfPath = process.env.MINERU_LIVE_PDF_PATH?.trim() ?? "";
const unzipModulePath = process.env.MINERU_LIVE_UNZIP_MODULE?.trim() ?? "";
const liveEnabled = Boolean(gatewayUrl && pdfPath && unzipModulePath);

test("真实 MinerU Gateway 返回可分页的 marked Markdown", { skip: !liveEnabled }, async () => {
  const unzipModule = await import(pathToFileURL(path.resolve(unzipModulePath)).href);
  const unzip = unzipModule.default ?? unzipModule.unzip ?? unzipModule.extract;
  assert.equal(typeof unzip, "function", "MINERU_LIVE_UNZIP_MODULE 必须导出 ZIP 解包函数");

  const bytes = fs.readFileSync(pdfPath);
  const file = {
    name: path.basename(pdfPath),
    size: bytes.byteLength,
    type: "application/pdf",
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  const client = mineru.createMineruClient({ gatewayUrl, unzip });
  const result = await client.importPdf(file, {
    timeoutMs: Number(process.env.MINERU_LIVE_TIMEOUT_MS ?? 20 * 60 * 1000),
  });

  assert.match(result.markedMarkdown, /^\[\[PAGE 1\]\]/u);
  assert.match(result.markedMarkdown, /\[\[PAGE 2\]\]/u);
  assert.equal(result.markedMarkdown.includes("Bearer "), false);
});
