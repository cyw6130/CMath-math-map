import assert from "node:assert/strict";
import test from "node:test";

import mineru from "../src/paper-import/mineru/index.js";
import gateway from "../workers/mineru-gateway/index.js";
import gatewayWorker from "../workers/mineru-gateway/worker.mjs";

test("从 MinerU content_list 按内容块顺序恢复 1-based 页锚", () => {
  const marked = mineru.buildMarkedMarkdown({
    fullMarkdown: "# A paper\n\nDefinition of X.\n\nTheorem Y.",
    contentList: [
      { type: "text", text: "# A paper", page_idx: 0 },
      { type: "text", text: "Definition of X.", page_idx: 0 },
      { type: "text", text: "Theorem Y.", page_idx: 1 },
    ],
  });

  assert.equal(
    marked,
    "[[PAGE 1]]\n# A paper\n\nDefinition of X.\n\n[[PAGE 2]]\nTheorem Y.",
  );
});

test("页锚恢复在缺页或无法定位内容块时显式失败", () => {
  assert.throws(
    () => mineru.buildMarkedMarkdown({
      fullMarkdown: "Page one\n\nPage three",
      contentList: [
        { type: "text", text: "Page one", page_idx: 0 },
        { type: "text", text: "Page three", page_idx: 2 },
      ],
    }),
    /无法可靠定位第 2 页|跳过了 page_idx/u,
  );
  assert.throws(
    () => mineru.buildMarkedMarkdown({
      fullMarkdown: "Page one",
      contentList: [{ type: "text", text: "not in markdown", page_idx: 0 }],
    }),
    /拒绝猜测页锚/u,
  );
});

test("内容块锚点位于 Markdown 标题前缀之后时仍在整个块前插入页标", () => {
  assert.equal(
    mineru.buildMarkedMarkdown({
      fullMarkdown: "# Paper title\n\nTheorem Y.",
      contentList: [
        { type: "text", text: "Paper title", page_idx: 0 },
        { type: "text", text: "Theorem Y.", page_idx: 1 },
      ],
    }),
    "[[PAGE 1]]\n# Paper title\n\n[[PAGE 2]]\nTheorem Y.",
  );
});

test("MinerU 的空文本占位块由同页后续实体块提供页锚", () => {
  assert.equal(
    mineru.buildMarkedMarkdown({
      fullMarkdown: "Page one.\n\n![](images/page-two.jpg)\n\nPage two.",
      contentList: [
        { type: "text", text: "Page one.", page_idx: 0 },
        { type: "text", text: "", page_idx: 1 },
        { type: "image", img_path: "images/page-two.jpg", page_idx: 1 },
        { type: "text", text: "Page two.", page_idx: 1 },
      ],
    }),
    "[[PAGE 1]]\nPage one.\n\n[[PAGE 2]]\n![](images/page-two.jpg)\n\nPage two.",
  );

  assert.throws(
    () => mineru.buildMarkedMarkdown({
      fullMarkdown: "Page one.",
      contentList: [
        { type: "text", text: "Page one.", page_idx: 0 },
        { type: "text", text: "", page_idx: 1 },
      ],
      pageCount: 2,
    }),
    /无法可靠定位全部页面/u,
  );
});

test("页码等辅助块不会用正文中的同名数字推进匹配游标", () => {
  assert.equal(
    mineru.buildMarkedMarkdown({
      fullMarkdown: "Page one.\n\n![](images/page-two.jpg)\n\nSection 2.",
      contentList: [
        { type: "text", text: "Page one.", page_idx: 0 },
        { type: "page_number", text: "2", page_idx: 0 },
        { type: "text", text: "", page_idx: 1 },
        { type: "image", img_path: "images/page-two.jpg", page_idx: 1 },
        { type: "text", text: "Section 2.", page_idx: 1 },
      ],
    }),
    "[[PAGE 1]]\nPage one.\n\n[[PAGE 2]]\n![](images/page-two.jpg)\n\nSection 2.",
  );
});

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
    text: async () => JSON.stringify(value),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

test("通过 Gateway 上传、轮询并以注入的 ZIP 解包适配器生成 marked Markdown", async () => {
  const calls = [];
  const zipBytes = new Uint8Array([80, 75, 3, 4]).buffer;
  let pollCount = 0;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/upload")) {
      return jsonResponse({ batch_id: "batch-1", file_urls: ["https://upload.example/file-1"] });
    }
    if (String(url) === "https://upload.example/file-1") return jsonResponse({}, 200);
    if (String(url).endsWith("/results/batch-1")) {
      pollCount += 1;
      return jsonResponse(pollCount === 1
        ? { batch_id: "batch-1", extract_result: { state: "running" } }
        : { batch_id: "batch-1", extract_result: { state: "done", full_zip_url: "https://cdn.example/result.zip" } });
    }
    if (String(url) === "https://cdn.example/result.zip") {
      return { ok: true, status: 200, arrayBuffer: async () => zipBytes };
    }
    throw new Error(`unexpected URL ${url}`);
  };
  const client = mineru.createMineruClient({
    gatewayUrl: "https://gateway.example/api/mineru",
    fetchImpl,
    unzip: async (bytes) => {
      assert.deepEqual(Array.from(new Uint8Array(bytes)), [80, 75, 3, 4]);
      return {
        "paper_full.md": "# Title\n\nTheorem Y.",
        "paper_content_list.json": JSON.stringify([
          { type: "text", text: "# Title", page_idx: 0 },
          { type: "text", text: "Theorem Y.", page_idx: 1 },
        ]),
      };
    },
    pollIntervalMs: 0,
  });
  const result = await client.importPdf(
    { name: "paper.pdf", size: 3, type: "application/pdf", arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    { timeoutMs: 1000 },
  );

  assert.equal(result.batchId, "batch-1");
  assert.equal(result.markedMarkdown, "[[PAGE 1]]\n# Title\n\n[[PAGE 2]]\nTheorem Y.");
  assert.equal(calls[0].init.method, "POST");
  assert.doesNotMatch(JSON.stringify(calls[0]), /MinerU-secret|Bearer/u);
  assert.equal(calls[1].url, "https://upload.example/file-1");
  assert.equal(calls[1].init.method, "PUT");
  assert.equal(calls[1].init.headers?.Authorization, undefined);
  assert.ok(calls[1].init.body instanceof ArrayBuffer, "signed upload must use raw bytes rather than a typed File body");
});

test("跨域网页通过 Gateway 代理 PDF 上传，避免 OSS 签名地址的浏览器 CORS", async () => {
  const calls = [];
  const zipBytes = new Uint8Array([80, 75, 3, 4]).buffer;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/upload-file?name=paper.pdf")) {
      return jsonResponse({ code: 0, msg: "ok", data: { batch_id: "batch-proxy" } });
    }
    if (String(url).endsWith("/results/batch-proxy")) {
      return jsonResponse({ code: 0, msg: "ok", data: { batch_id: "batch-proxy", extract_result: { state: "done", full_zip_url: "https://cdn.example/proxy.zip" } } });
    }
    if (String(url) === "https://cdn.example/proxy.zip") return { ok: true, status: 200, arrayBuffer: async () => zipBytes };
    throw new Error(`unexpected URL ${url}`);
  };
  const client = mineru.createMineruClient({
    gatewayUrl: "https://gateway.example/api/mineru",
    fetchImpl,
    unzip: async () => ({
      "paper_full.md": "# Title",
      "paper_content_list.json": JSON.stringify([{ type: "text", text: "# Title", page_idx: 0 }]),
    }),
    pollIntervalMs: 0,
  });
  const result = await client.importPdf(
    { name: "paper.pdf", size: 3, type: "application/pdf", arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    { timeoutMs: 1000, proxyUpload: true },
  );
  assert.equal(result.batchId, "batch-proxy");
  assert.match(calls[0].url, /\/upload-file\?name=paper\.pdf/u);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/pdf");
  assert.ok(calls[0].init.body instanceof ArrayBuffer);
  assert.equal(calls.filter((call) => call.url.includes("upload.example")).length, 0);
});

test("轮询超时会显式失败并停止等待", async () => {
  const client = mineru.createMineruClient({
    gatewayUrl: "https://gateway.example/api/mineru",
    fetchImpl: async () => jsonResponse({ batch_id: "batch-timeout", extract_result: { state: "running" } }),
    pollIntervalMs: 0,
  });
  await assert.rejects(
    () => client.pollTask("batch-timeout", { timeoutMs: 0 }),
    /超时|timeout/u,
  );
});

test("轮询请求本身无响应时也遵守总超时", async () => {
  const client = mineru.createMineruClient({
    gatewayUrl: "https://gateway.example/api/mineru",
    fetchImpl: async () => new Promise(() => {}),
    pollIntervalMs: 0,
  });
  await assert.rejects(
    () => client.pollTask("batch-hang", { timeoutMs: 5 }),
    (error) => error?.code === "MINERU_TIMEOUT",
  );
});

test("Credential Gateway 只使用 Worker Secret、固定代理官方批量上传与查询", async () => {
  const upstreamCalls = [];
  const upstreamFetch = async (url, init = {}) => {
    upstreamCalls.push({ url: String(url), init });
    if (String(url).endsWith("/file-urls/batch")) {
      return jsonResponse({ code: 0, msg: "ok", trace_id: "trace-secret", data: {
        batch_id: "batch-2", file_urls: ["https://upload.example/2"],
      } });
    }
    return jsonResponse({ code: 0, msg: "ok", data: {
      batch_id: "batch-2", extract_result: [{
        file_name: "paper.pdf", state: "done", full_zip_url: "https://cdn.example/2.zip",
      }],
    } });
  };
  const handler = gateway.createGatewayHandler({ fetchImpl: upstreamFetch });
  const env = { MINERU_TOKEN: "MinerU-secret-never-returned", MINERU_ALLOWED_ORIGINS: "https://app.example" };
  const validHeaders = { Origin: "https://app.example", "Content-Type": "application/json" };

  const rejected = await handler.fetch(new Request("https://gateway.example/api/mineru/upload", {
    method: "POST",
    headers: validHeaders,
    body: JSON.stringify({ files: [{ name: "paper.pdf" }], url: "https://attacker.example/paper.pdf" }),
  }), env);
  assert.equal(rejected.status, 400);
  assert.equal(upstreamCalls.length, 0);

  const uploaded = await handler.fetch(new Request("https://gateway.example/api/mineru/upload", {
    method: "POST",
    headers: validHeaders,
    body: JSON.stringify({ files: [{ name: "paper.pdf", data_id: "data-2" }], model_version: "vlm" }),
  }), env);
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.headers.get("Access-Control-Allow-Origin"), "https://app.example");
  const uploadBody = await uploaded.json();
  assert.equal(uploadBody.data.batch_id, "batch-2");
  assert.doesNotMatch(JSON.stringify(uploadBody), /MinerU-secret-never-returned/u);
  assert.equal(upstreamCalls[0].url, "https://mineru.net/api/v4/file-urls/batch");
  assert.equal(upstreamCalls[0].init.headers.Authorization, "Bearer MinerU-secret-never-returned");
  assert.doesNotMatch(upstreamCalls[0].init.body, /attacker\.example/u);

  const result = await handler.fetch(new Request("https://gateway.example/api/mineru/results/batch-2", {
    method: "GET", headers: { Origin: "https://app.example" },
  }), env);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.extract_result.full_zip_url, "https://cdn.example/2.zip");

  const blocked = await handler.fetch(new Request("https://gateway.example/api/mineru/upload", {
    method: "POST", headers: { ...validHeaders, Origin: "https://evil.example" }, body: "{}",
  }), env);
  assert.equal(blocked.status, 403);
  assert.equal(upstreamCalls.length, 2);
});

test("Credential Gateway 在服务器侧代传 PDF，不把 OSS 签名地址暴露给浏览器", async () => {
  const upstreamCalls = [];
  const upstreamFetch = async (url, init = {}) => {
    upstreamCalls.push({ url: String(url), init });
    if (String(url).endsWith("/file-urls/batch")) {
      return jsonResponse({ code: 0, msg: "ok", data: { batch_id: "batch-proxy", file_urls: ["https://upload.example/proxy"] } });
    }
    if (String(url) === "https://upload.example/proxy") return { ok: true, status: 200, json: async () => ({}) };
    throw new Error(`unexpected upstream URL ${url}`);
  };
  const handler = gateway.createGatewayHandler({ fetchImpl: upstreamFetch });
  const response = await handler.fetch(new Request("https://gateway.example/api/mineru/upload-file?name=paper.pdf", {
    method: "POST",
    headers: { Origin: "https://app.example", "Content-Type": "application/pdf" },
    body: new Uint8Array([1, 2, 3]),
  }), { MINERU_TOKEN: "secret", MINERU_ALLOWED_ORIGINS: "https://app.example" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://app.example");
  const body = await response.json();
  assert.deepEqual(body.data, { batch_id: "batch-proxy" });
  assert.equal(upstreamCalls.length, 2);
  assert.equal(upstreamCalls[1].url, "https://upload.example/proxy");
  assert.ok(upstreamCalls[1].init.body instanceof ArrayBuffer);
  assert.doesNotMatch(JSON.stringify(body), /upload\.example/u);
});

test("Credential Gateway 的 CORS 预检和任意上游 URL 路由均受限", async () => {
  const upstreamFetch = async () => { throw new Error("must not call upstream"); };
  const handler = gateway.createGatewayHandler({ fetchImpl: upstreamFetch });
  const env = { MINERU_TOKEN: "secret", MINERU_ALLOWED_ORIGINS: "https://app.example" };
  const preflight = await handler.fetch(new Request("https://gateway.example/upload", {
    method: "OPTIONS",
    headers: {
      Origin: "https://app.example",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST, GET, OPTIONS");

  const arbitrary = await handler.fetch(new Request("https://gateway.example/proxy?url=https%3A%2F%2Fevil.example", {
    method: "GET", headers: { Origin: "https://app.example" },
  }), env);
  assert.equal(arbitrary.status, 404);
});

test("Cloudflare Module Worker 入口直接导出同一个 allow-listed handler", async () => {
  assert.equal(typeof gatewayWorker?.fetch, "function");
  const response = await gatewayWorker.fetch(
    new Request("https://gateway.example/proxy?url=https%3A%2F%2Fevil.example", {
      method: "GET",
      headers: { Origin: "https://app.example" },
    }),
    { MINERU_TOKEN: "secret", MINERU_ALLOWED_ORIGINS: "https://app.example" },
  );
  assert.equal(response.status, 404);
});
