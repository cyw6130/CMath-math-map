/*
 * Browser-independent MinerU Precision Extract client.
 *
 * The client knows only the public Gateway contract.  It never receives a
 * MinerU token: the Gateway asks MinerU for upload capability and the browser
 * then uploads the PDF directly to the returned signed URL.
 */
(function publishMineruClient(root, factory) {
  "use strict";
  const marked = root?.CMathMineruMarkedMarkdown
    ?? (typeof require === "function" ? require("./marked-markdown.js") : null);
  const api = factory(marked, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMineruClient = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createMineruClientModule(marked, root) {
  "use strict";

  const MAX_PDF_BYTES = 200 * 1024 * 1024;
  const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
  const DEFAULT_POLL_INTERVAL_MS = 2000;
  const TERMINAL_STATES = new Set(["done", "failed"]);
  const KNOWN_STATES = new Set(["waiting-file", "pending", "running", "converting", "done", "failed"]);

  function clientError(message, code = "MINERU_CLIENT_ERROR") {
    const error = new Error(`MinerU client: ${message}`);
    error.code = code;
    return error;
  }

  function requireText(value, label) {
    if (typeof value !== "string" || !value.trim()) throw clientError(`${label} 必须是非空文本`);
    return value.trim();
  }

  function defaultFetch(rootObject) {
    if (typeof rootObject?.fetch === "function") return rootObject.fetch.bind(rootObject);
    if (typeof globalThis !== "undefined" && typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
    return null;
  }

  function normalizeGatewayUrl(value) {
    const text = requireText(value, "Gateway 地址").replace(/\/+$/u, "");
    let url;
    try { url = new URL(text); } catch { throw clientError("Gateway 地址不是有效 URL"); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      throw clientError("Gateway 地址必须使用 HTTPS");
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/u, "");
  }

  function encodeBatchId(value) {
    const id = requireText(value, "batch_id");
    if (id.length > 256 || !/^[A-Za-z0-9._:-]+$/u.test(id)) throw clientError("batch_id 格式无效");
    return encodeURIComponent(id);
  }

  async function responseJson(response, operation) {
    if (!response || typeof response !== "object") throw clientError(`${operation} 没有返回响应`);
    if (!response.ok) {
      let detail = "";
      try {
        if (typeof response.json === "function") {
          const body = await response.json();
          detail = typeof body?.msg === "string" ? body.msg : typeof body?.message === "string" ? body.message : typeof body?.error === "string" ? body.error : "";
        } else if (typeof response.text === "function") detail = (await response.text()).slice(0, 240);
      } catch { detail = ""; }
      throw clientError(`${operation} HTTP ${response.status ?? "错误"}${detail ? `：${detail}` : ""}`, "MINERU_HTTP_ERROR");
    }
    if (typeof response.json !== "function") throw clientError(`${operation} 响应不是 JSON`);
    let body;
    try { body = await response.json(); } catch (error) { throw clientError(`${operation} 响应不是有效 JSON：${error.message}`); }
    if (body && Number.isInteger(body.code) && body.code !== 0) {
      throw clientError(`${operation} 失败${typeof body.msg === "string" ? `：${body.msg}` : ""}`, "MINERU_API_ERROR");
    }
    return body;
  }

  function uploadData(file) {
    if (!file || typeof file !== "object") throw clientError("请选择一份 PDF 论文");
    const name = requireText(file.name, "PDF 文件名");
    if (!/\.pdf$/iu.test(name)) throw clientError("MinerU 精准解析当前只接受 PDF 文件");
    if (typeof file.arrayBuffer !== "function" && typeof file.stream !== "function" && typeof file.byteLength !== "number") {
      throw clientError("PDF 文件必须支持浏览器上传");
    }
    if (Number.isFinite(file.size) && (file.size <= 0 || file.size > MAX_PDF_BYTES)) {
      throw clientError("PDF 文件大小必须在 1 到 200 MB 之间");
    }
    return { name, file };
  }

  function readUploadCapability(body) {
    const data = body?.data && typeof body.data === "object" ? body.data : body;
    const batchId = data?.batch_id ?? data?.batchId ?? data?.task_id ?? data?.taskId;
    const fileUrls = data?.file_urls ?? data?.fileUrls ?? data?.upload_urls ?? data?.uploadUrls;
    if (typeof batchId !== "string" || !batchId.trim()) throw clientError("Gateway 没有返回 batch_id");
    if (!Array.isArray(fileUrls) || typeof fileUrls[0] !== "string" || !fileUrls[0].trim()) {
      throw clientError("Gateway 没有返回上传地址");
    }
    return { batchId: batchId.trim(), uploadUrl: fileUrls[0].trim() };
  }

  function resultData(body) {
    const data = body?.data && typeof body.data === "object" ? body.data : body;
    const nested = data?.extract_result ?? data?.extractResult ?? data?.result ?? data;
    return nested && typeof nested === "object" ? nested : {};
  }

  function normalizeTask(body, fallbackBatchId) {
    const data = body?.data && typeof body.data === "object" ? body.data : body;
    const extraction = resultData(body);
    const batchId = data?.batch_id ?? data?.batchId ?? fallbackBatchId;
    const state = String(extraction.state ?? data?.state ?? "").trim().toLowerCase();
    if (!state || !KNOWN_STATES.has(state)) throw clientError("MinerU 返回了未知任务状态");
    const fullZipUrl = extraction.full_zip_url ?? extraction.fullZipUrl ?? data?.full_zip_url ?? data?.fullZipUrl;
    return {
      batchId: typeof batchId === "string" ? batchId : fallbackBatchId,
      state,
      fileName: typeof extraction.file_name === "string" ? extraction.file_name : undefined,
      fullZipUrl: typeof fullZipUrl === "string" ? fullZipUrl : undefined,
      errorMessage: typeof extraction.err_msg === "string" ? extraction.err_msg : undefined,
    };
  }

  function abortIfNeeded(signal) {
    if (signal?.aborted) throw clientError("操作已取消", "MINERU_ABORTED");
  }

  function wait(ms, signal) {
    abortIfNeeded(signal);
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener?.("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
        reject(clientError("操作已取消", "MINERU_ABORTED"));
      };
      signal?.addEventListener?.("abort", onAbort, { once: true });
    });
  }

  function requestUntil(request, url, init, remainingMs, signal) {
    abortIfNeeded(signal);
    if (remainingMs <= 0) throw clientError("MinerU 任务轮询超时", "MINERU_TIMEOUT");
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener?.("abort", onAbort);
        reject(clientError("MinerU 任务轮询超时", "MINERU_TIMEOUT"));
      }, remainingMs);
      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
        reject(clientError("操作已取消", "MINERU_ABORTED"));
      };
      signal?.addEventListener?.("abort", onAbort, { once: true });
      Promise.resolve()
        .then(() => request(url, init))
        .then((response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener?.("abort", onAbort);
          resolve(response);
        }, (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener?.("abort", onAbort);
          reject(error);
        });
    });
  }

  function unzipFunction(unzip) {
    if (typeof unzip === "function") return unzip;
    if (unzip && typeof unzip.extract === "function") return unzip.extract.bind(unzip);
    if (unzip && typeof unzip.unzip === "function") return unzip.unzip.bind(unzip);
    throw clientError("必须注入 ZIP 解包适配器（function、extract 或 unzip）");
  }

  function baseName(value) {
    return String(value).split(/[\\/]/u).pop().toLowerCase();
  }

  async function readEntry(entry) {
    if (typeof entry === "string") return entry;
    if (entry instanceof Uint8Array || entry instanceof ArrayBuffer) {
      const bytes = entry instanceof Uint8Array ? entry : new Uint8Array(entry);
      if (typeof TextDecoder === "function") return new TextDecoder().decode(bytes);
      let output = "";
      for (const byte of bytes) output += String.fromCharCode(byte);
      return output;
    }
    if (entry && typeof entry.text === "function") return entry.text();
    if (entry && typeof entry.arrayBuffer === "function") return readEntry(await entry.arrayBuffer());
    if (entry && typeof entry.text === "string") return entry.text;
    if (entry && typeof entry.data === "string") return entry.data;
    if (entry && (entry.data instanceof Uint8Array || entry.data instanceof ArrayBuffer)) return readEntry(entry.data);
    throw clientError("ZIP 条目不是可读文本");
  }

  async function readZipFiles(unzip, bytes) {
    const result = await unzipFunction(unzip)(bytes);
    const entries = [];
    if (result && typeof result === "object" && !Array.isArray(result)) {
      if (typeof result.readFile === "function") {
        return {
          fullMarkdown: await result.readFile("full.md"),
          contentList: await result.readFile("content_list.json"),
        };
      }
      if (typeof Map === "function" && result instanceof Map) {
        for (const [name, value] of result.entries()) entries.push({ name, value });
      } else if (result.files && typeof result.files === "object") {
        for (const [name, value] of Object.entries(result.files)) entries.push({ name, value });
      } else {
        for (const [name, value] of Object.entries(result)) entries.push({ name, value });
      }
    } else if (Array.isArray(result)) {
      for (const entry of result) {
        if (entry && typeof entry === "object") entries.push({ name: entry.name ?? entry.path, value: entry });
      }
    }
    const find = (name, suffix) => entries.find((entry) => {
      const base = baseName(entry.name);
      return base === name || (suffix && base.endsWith(suffix));
    });
    // API ZIPs may retain the original PDF stem (`paper_full.md` and
    // `paper_content_list.json`) while local fixtures often use the shorter
    // names.  Both identify the same two required artifacts.
    const markdown = find("full.md", "_full.md");
    const content = find("content_list.json", "_content_list.json");
    if (!markdown || !content) throw clientError("ZIP 结果缺少 full.md 或 content_list.json", "MINERU_RESULT_INCOMPLETE");
    return { fullMarkdown: await readEntry(markdown.value), contentList: await readEntry(content.value) };
  }

  function safeDownloadUrl(value) {
    const text = requireText(value, "full_zip_url");
    let url;
    try { url = new URL(text); } catch { throw clientError("full_zip_url 不是有效 URL"); }
    if (url.protocol !== "https:") throw clientError("full_zip_url 必须使用 HTTPS");
    return url.toString();
  }

  function createClient({ gatewayUrl, fetchImpl, unzip, unzipAdapter, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
    const base = normalizeGatewayUrl(gatewayUrl);
    const request = fetchImpl ?? defaultFetch(root);
    if (typeof request !== "function") throw clientError("当前环境不支持网络请求");
    const zipReader = unzip ?? unzipAdapter;

    function shouldProxyPdfUpload(options = {}) {
      if (typeof options.proxyUpload === "boolean") return options.proxyUpload;
      if (!root?.location?.origin) return false;
      try { return new URL(base).origin !== root.location.origin; } catch { return false; }
    }

    async function requestUploadCapability(file, options = {}) {
      const input = uploadData(file);
      const body = {
        files: [{ name: input.name }],
        model_version: options.modelVersion ?? "vlm",
      };
      if (typeof options.dataId === "string" && options.dataId.trim()) body.files[0].data_id = options.dataId.trim();
      if (typeof options.enableFormula === "boolean") body.enable_formula = options.enableFormula;
      if (typeof options.enableTable === "boolean") body.enable_table = options.enableTable;
      if (typeof options.language === "string" && options.language.trim()) body.language = options.language.trim();
      abortIfNeeded(options.signal);
      const response = await request(`${base}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: options.signal,
      });
      const capability = readUploadCapability(await responseJson(response, "申请 MinerU 上传地址"));
      // Keep the signed URL only for the immediate upload step.  It is not
      // part of the public result and the client keeps no PDF/task cache.
      return Object.freeze(capability);
    }

    async function uploadPdf(file, capabilityOrOptions, maybeOptions = {}) {
      const input = uploadData(file);
      const capability = capabilityOrOptions && typeof capabilityOrOptions === "object"
        ? capabilityOrOptions
        : { uploadUrl: capabilityOrOptions };
      const uploadUrl = safeDownloadUrl(capability.uploadUrl);
      const options = capabilityOrOptions && typeof capabilityOrOptions === "object" ? maybeOptions : maybeOptions;
      abortIfNeeded(options.signal);
      const body = typeof input.file.arrayBuffer === "function"
        ? await input.file.arrayBuffer()
        : (typeof input.file.stream === "function" ? input.file.stream() : input.file);
      const response = await request(uploadUrl, { method: "PUT", body, signal: options.signal });
      if (!response?.ok) throw clientError(`直传 PDF 失败 HTTP ${response?.status ?? "错误"}`, "MINERU_UPLOAD_ERROR");
      return Object.freeze({ batchId: capability.batchId ?? capability.batch_id ?? "" });
    }

    async function uploadPdfThroughGateway(file, options = {}) {
      const input = uploadData(file);
      abortIfNeeded(options.signal);
      const body = typeof input.file.arrayBuffer === "function"
        ? await input.file.arrayBuffer()
        : (typeof input.file.stream === "function" ? input.file.stream() : input.file);
      const modelVersion = typeof options.modelVersion === "string" && options.modelVersion.trim()
        ? options.modelVersion.trim()
        : "vlm";
      const url = `${base}/upload-file?name=${encodeURIComponent(input.name)}&model_version=${encodeURIComponent(modelVersion)}`;
      const response = await request(url, {
        method: "POST",
        headers: { "Content-Type": "application/pdf", Accept: "application/json" },
        body,
        signal: options.signal,
      });
      const payload = await responseJson(response, "通过 Gateway 上传 PDF");
      const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
      const batchId = data?.batch_id ?? data?.batchId;
      if (typeof batchId !== "string" || !batchId.trim()) throw clientError("Gateway 没有返回 batch_id");
      return Object.freeze({ batchId: batchId.trim() });
    }

    async function pollTask(batchId, options = {}) {
      const encodedBatchId = encodeBatchId(batchId);
      const timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : Number(options.timeoutMs);
      const interval = options.intervalMs === undefined ? pollIntervalMs : Number(options.intervalMs);
      if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw clientError("timeoutMs 必须是非负数");
      if (!Number.isFinite(interval) || interval < 0) throw clientError("intervalMs 必须是非负数");
      const started = Date.now();
      let first = true;
      for (;;) {
        abortIfNeeded(options.signal);
        if (!first) {
          if (Date.now() - started >= timeoutMs) throw clientError("MinerU 任务轮询超时", "MINERU_TIMEOUT");
          await wait(interval, options.signal);
          if (Date.now() - started >= timeoutMs) throw clientError("MinerU 任务轮询超时", "MINERU_TIMEOUT");
        }
        first = false;
        const remainingMs = timeoutMs - (Date.now() - started);
        if (remainingMs <= 0) throw clientError("MinerU 任务轮询超时", "MINERU_TIMEOUT");
        const response = await requestUntil(request, `${base}/results/${encodedBatchId}`, { method: "GET", headers: { Accept: "application/json" }, signal: options.signal }, remainingMs, options.signal);
        const task = normalizeTask(await responseJson(response, "查询 MinerU 任务"), batchId);
        try { options.onProgress?.(Object.freeze({ ...task })); } catch { /* progress observers are non-authoritative */ }
        if (task.state === "failed") throw clientError(task.errorMessage || "MinerU 解析失败", "MINERU_TASK_FAILED");
        if (TERMINAL_STATES.has(task.state)) {
          if (!task.fullZipUrl) throw clientError("MinerU 已完成但没有返回结果 ZIP 地址", "MINERU_RESULT_INCOMPLETE");
          return Object.freeze(task);
        }
      }
    }

    async function downloadResultZip(fullZipUrl, options = {}) {
      const url = safeDownloadUrl(typeof fullZipUrl === "string" ? fullZipUrl : fullZipUrl?.fullZipUrl ?? fullZipUrl?.full_zip_url);
      abortIfNeeded(options.signal);
      const response = await request(url, { method: "GET", signal: options.signal });
      if (!response?.ok || typeof response.arrayBuffer !== "function") throw clientError(`下载结果 ZIP 失败 HTTP ${response?.status ?? "错误"}`, "MINERU_DOWNLOAD_ERROR");
      return response.arrayBuffer();
    }

    async function importPdf(file, options = {}) {
      if (!zipReader) throw clientError("importPdf 需要注入 ZIP 解包适配器");
      let resolvedBatchId;
      if (shouldProxyPdfUpload(options)) {
        resolvedBatchId = (await uploadPdfThroughGateway(file, options)).batchId;
      } else {
        const capability = await requestUploadCapability(file, options);
        await uploadPdf(file, capability, options);
        resolvedBatchId = capability.batchId;
      }
      const task = await pollTask(resolvedBatchId, options);
      const zipBytes = await downloadResultZip(task.fullZipUrl, options);
      const files = await readZipFiles(zipReader, zipBytes);
      const markedMarkdown = marked?.buildMarkedMarkdown?.({
        fullMarkdown: files.fullMarkdown,
        contentList: files.contentList,
        pageCount: options.pageCount,
      });
      if (typeof markedMarkdown !== "string" || !markedMarkdown.trim()) throw clientError("无法从 MinerU 结果生成 marked Markdown", "MINERU_RESULT_INVALID");
      return Object.freeze({
        batchId: resolvedBatchId,
        task,
        fullMarkdown: files.fullMarkdown,
        contentList: files.contentList,
        markedMarkdown,
      });
    }

    return Object.freeze({
      requestUploadCapability,
      uploadPdf,
      pollTask,
      downloadResultZip,
      importPdf,
    });
  }

  return Object.freeze({
    MAX_PDF_BYTES,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_POLL_INTERVAL_MS,
    createMineruClient: createClient,
  });
});
