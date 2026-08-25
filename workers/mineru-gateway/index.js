/*
 * Cloudflare Worker-style MinerU Credential Gateway.
 *
 * Deliberately small allow-list proxy:
 *   POST /upload                 → POST MinerU /api/v4/file-urls/batch
 *   POST /upload-file            → server-side PDF upload through the signed URL
 *   GET  /results/:batch_id      → GET  MinerU /api/v4/extract-results/batch/:id
 *   GET  /download/:batch_id     → server-side result ZIP download
 *
 * The aliases under /api/mineru/ make it convenient to mount the Worker below
 * a path.  There is no generic URL proxy, request-body storage, or logging.
 */
(function publishMineruGateway(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMineruGateway = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMineruGatewayModule(root) {
  "use strict";

  const MINERU_API_ORIGIN = "https://mineru.net";
  const MINERU_UPLOAD_PATH = "/api/v4/file-urls/batch";
  const MINERU_RESULT_PREFIX = "/api/v4/extract-results/batch/";
  const UPLOAD_PATHS = new Set(["/upload", "/api/mineru/upload"]);
  const UPLOAD_FILE_PATHS = new Set(["/upload-file", "/api/mineru/upload-file"]);
  const MAX_PROXY_PDF_BYTES = 25 * 1024 * 1024;
  const RESULT_PREFIXES = ["/results/", "/api/mineru/results/"];
  const DOWNLOAD_PREFIXES = ["/download/", "/api/mineru/download/"];
  const TASK_STATES = new Set(["waiting-file", "pending", "running", "converting", "done", "failed"]);
  const ALLOWED_MODELS = new Set(["pipeline", "vlm"]);

  function jsonResponse(payload, status, origin) {
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return new Response(JSON.stringify(payload), { status, headers });
  }

  function emptyResponse(status, origin, extra = {}) {
    const headers = new Headers({ "Cache-Control": "no-store", ...extra });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return new Response(null, { status, headers });
  }

  function configuredOrigins(env) {
    const value = env?.MINERU_ALLOWED_ORIGINS
      ?? env?.CORS_ORIGINS
      ?? env?.ALLOWED_ORIGINS
      ?? env?.MINERU_ALLOWED_ORIGIN
      ?? "";
    if (Array.isArray(value)) return new Set(value.map((item) => String(item).trim()).filter(Boolean));
    const text = String(value).trim();
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return new Set(parsed.map((item) => String(item).trim()).filter(Boolean));
      } catch { /* fall through to the simple delimiter form */ }
    }
    return new Set(text.split(/[\s,]+/u).map((item) => item.trim()).filter(Boolean));
  }

  function requestOrigin(request) {
    return request?.headers?.get?.("Origin")?.trim() || "";
  }

  function corsOrigin(request, env) {
    const origin = requestOrigin(request);
    // A request without Origin is not a cross-origin browser request.  It is
    // allowed for health checks and same-origin deployments but gets no CORS
    // grant.  Every supplied Origin must be explicitly configured.
    if (!origin) return "";
    return configuredOrigins(env).has(origin) ? origin : null;
  }

  function safeMessage(value, token) {
    if (typeof value !== "string") return "";
    let output = value.slice(0, 500);
    if (token) output = output.split(token).join("[redacted]");
    return output.replace(/Bearer\s+\[redacted\]/giu, "[redacted]");
  }

  function safeBatchId(value) {
    const text = typeof value === "string" ? value.trim() : "";
    return /^[A-Za-z0-9._:-]{1,256}$/u.test(text) ? text : "";
  }

  function safePdfName(value) {
    const text = typeof value === "string" ? value.trim() : "";
    return /^[^/\\\u0000-\u001f]{1,255}\.pdf$/iu.test(text) ? text : "";
  }

  function safeDataId(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const text = typeof value === "string" ? value.trim() : "";
    return /^[A-Za-z0-9._:-]{1,128}$/u.test(text) ? text : "";
  }

  function safeHttpsUrl(value, token = "") {
    if (typeof value !== "string" || !value.trim()) return "";
    if (token && value.includes(token)) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function parseUploadBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("body must be object");
    const allowedKeys = new Set(["files", "model_version", "enable_formula", "enable_table", "language"]);
    for (const key of Object.keys(body)) if (!allowedKeys.has(key)) throw new Error(`unsupported field: ${key}`);
    if (!Array.isArray(body.files) || body.files.length !== 1) throw new Error("files must contain exactly one PDF");
    const files = body.files.map((file) => {
      if (!file || typeof file !== "object" || Array.isArray(file)) throw new Error("invalid file metadata");
      const keys = new Set(Object.keys(file));
      for (const key of keys) if (!["name", "data_id"].includes(key)) throw new Error(`unsupported file field: ${key}`);
      const name = safePdfName(file.name);
      if (!name) throw new Error("only PDF file names are accepted");
      const dataId = safeDataId(file.data_id);
      if (file.data_id !== undefined && !dataId) throw new Error("invalid data_id");
      return dataId ? { name, data_id: dataId } : { name };
    });
    const model = body.model_version === undefined ? "vlm" : body.model_version;
    if (typeof model !== "string" || !ALLOWED_MODELS.has(model)) throw new Error("unsupported model_version");
    for (const key of ["enable_formula", "enable_table"]) {
      if (body[key] !== undefined && typeof body[key] !== "boolean") throw new Error(`${key} must be boolean`);
    }
    if (body.language !== undefined && (typeof body.language !== "string" || !/^[A-Za-z-]{1,16}$/u.test(body.language))) {
      throw new Error("invalid language");
    }
    return {
      files,
      model_version: model,
      ...(body.enable_formula === undefined ? {} : { enable_formula: body.enable_formula }),
      ...(body.enable_table === undefined ? {} : { enable_table: body.enable_table }),
      ...(body.language === undefined ? {} : { language: body.language }),
    };
  }

  async function readJsonRequest(request) {
    const contentType = request.headers.get("Content-Type") || "";
    if (!/application\/json(?:\s*;|$)/iu.test(contentType)) throw new Error("JSON request required");
    try { return await request.json(); } catch { throw new Error("invalid JSON"); }
  }

  function sanitizedUploadResult(body, token) {
    const data = body?.data && typeof body.data === "object" ? body.data : {};
    const batchId = safeBatchId(data.batch_id ?? data.batchId);
    const urls = Array.isArray(data.file_urls ?? data.fileUrls)
      ? (data.file_urls ?? data.fileUrls).map((value) => safeHttpsUrl(value, token)).filter(Boolean).slice(0, 200)
      : [];
    return {
      code: Number.isInteger(body?.code) ? body.code : 0,
      msg: safeMessage(body?.msg, token) || "ok",
      data: { batch_id: batchId, file_urls: urls },
    };
  }

  function sanitizedResult(body, requestedBatchId, token) {
    const data = body?.data && typeof body.data === "object" ? body.data : {};
    const rawExtraction = data.extract_result ?? data.extractResult ?? {};
    const extraction = Array.isArray(rawExtraction) ? (rawExtraction[0] ?? {}) : rawExtraction;
    const state = typeof extraction.state === "string" && TASK_STATES.has(extraction.state) ? extraction.state : "";
    const fullZipUrl = safeHttpsUrl(extraction.full_zip_url ?? extraction.fullZipUrl, token);
    return {
      code: Number.isInteger(body?.code) ? body.code : 0,
      msg: safeMessage(body?.msg, token) || "ok",
      data: {
        batch_id: safeBatchId(data.batch_id ?? data.batchId) || requestedBatchId,
        extract_result: {
          file_name: typeof extraction.file_name === "string" ? safeMessage(extraction.file_name, token).slice(0, 255) : undefined,
          state,
          ...(fullZipUrl ? { full_zip_url: fullZipUrl } : {}),
          ...(typeof extraction.err_msg === "string" ? { err_msg: safeMessage(extraction.err_msg, token) } : {}),
        },
      },
    };
  }

  function route(pathname) {
    const path = pathname.replace(/\/+$/u, "") || "/";
    if (UPLOAD_PATHS.has(path)) return { kind: "upload" };
    if (UPLOAD_FILE_PATHS.has(path)) return { kind: "upload-file" };
    for (const prefix of RESULT_PREFIXES) {
      if (path.startsWith(prefix)) {
        const batchId = path.slice(prefix.length);
        if (safeBatchId(batchId) && !batchId.includes("/")) return { kind: "result", batchId };
        return { kind: "invalid-result" };
      }
    }
    for (const prefix of DOWNLOAD_PREFIXES) {
      if (path.startsWith(prefix)) {
        const batchId = path.slice(prefix.length);
        if (safeBatchId(batchId) && !batchId.includes("/")) return { kind: "download", batchId };
        return { kind: "invalid-download" };
      }
    }
    return { kind: "not-found" };
  }

  function createGatewayHandler({ fetchImpl } = {}) {
    const upstreamFetch = fetchImpl ?? (typeof root?.fetch === "function" ? root.fetch.bind(root) : null);
    if (typeof upstreamFetch !== "function") throw new Error("MinerU Gateway requires fetch");

    async function forward(url, init) {
      let upstreamResponse;
      try { upstreamResponse = await upstreamFetch(url, init); } catch {
        return { response: jsonResponse({ error: "MinerU upstream unavailable" }, 502), body: null };
      }
      if (!upstreamResponse?.ok || typeof upstreamResponse.json !== "function") {
        return { response: jsonResponse({ error: "MinerU upstream request failed" }, 502), body: null };
      }
      let body;
      try { body = await upstreamResponse.json(); } catch {
        return { response: jsonResponse({ error: "MinerU upstream returned invalid JSON" }, 502), body: null };
      }
      return { response: null, body };
    }

    async function fetchHandler(request, env) {
      const origin = corsOrigin(request, env);
      if (origin === null) return jsonResponse({ error: "Origin not allowed" }, 403);
      const url = new URL(request.url);
      const selected = route(url.pathname);
      if (request.method === "OPTIONS") {
        if (["not-found", "invalid-result", "invalid-download"].includes(selected.kind)) return emptyResponse(404, origin);
        return emptyResponse(204, origin, {
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        });
      }
      if (["not-found", "invalid-result", "invalid-download"].includes(selected.kind)) return jsonResponse({ error: "Not found" }, 404, origin);
      if ((["upload", "upload-file"].includes(selected.kind) && request.method !== "POST") || (["result", "download"].includes(selected.kind) && request.method !== "GET")) {
        return jsonResponse({ error: "Method not allowed" }, 405, origin);
      }
      const configuredToken = env?.MINERU_TOKEN ?? env?.MINERU_API_TOKEN ?? env?.MINERU_API_KEY;
      const token = typeof configuredToken === "string" ? configuredToken.trim() : "";
      if (!token) return jsonResponse({ error: "Gateway is not configured" }, 500, origin);

      if (selected.kind === "upload") {
        let payload;
        try { payload = parseUploadBody(await readJsonRequest(request)); }
        catch (error) { return jsonResponse({ error: error.message }, 400, origin); }
        const forwarded = await forward(`${MINERU_API_ORIGIN}${MINERU_UPLOAD_PATH}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (forwarded.response) return jsonResponse(JSON.parse(await forwarded.response.text()), 502, origin);
        const result = sanitizedUploadResult(forwarded.body, token);
        if (!result.data.batch_id || result.data.file_urls.length !== payload.files.length) {
          return jsonResponse({ error: "MinerU did not return upload capability" }, 502, origin);
        }
        return jsonResponse(result, 200, origin);
      }

      if (selected.kind === "upload-file") {
        const fileName = safePdfName(url.searchParams.get("name"));
        if (!fileName) return jsonResponse({ error: "query parameter name must be a PDF file name" }, 400, origin);
        const modelVersion = url.searchParams.get("model_version") || "vlm";
        if (!ALLOWED_MODELS.has(modelVersion)) return jsonResponse({ error: "unsupported model_version" }, 400, origin);
        const contentType = request.headers.get("Content-Type") || "";
        if (!/^application\/pdf(?:\s*;|$)/iu.test(contentType)) {
          return jsonResponse({ error: "PDF request required" }, 400, origin);
        }
        const declaredLength = Number(request.headers.get("Content-Length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_PDF_BYTES) {
          return jsonResponse({ error: "PDF exceeds gateway limit" }, 413, origin);
        }
        let bytes;
        try { bytes = await request.arrayBuffer(); } catch { return jsonResponse({ error: "invalid PDF body" }, 400, origin); }
        if (!(bytes instanceof ArrayBuffer) || bytes.byteLength <= 0) return jsonResponse({ error: "PDF body is empty" }, 400, origin);
        if (bytes.byteLength > MAX_PROXY_PDF_BYTES) return jsonResponse({ error: "PDF exceeds gateway limit" }, 413, origin);

        const capability = await forward(`${MINERU_API_ORIGIN}${MINERU_UPLOAD_PATH}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ files: [{ name: fileName }], model_version: modelVersion }),
        });
        if (capability.response) {
          return jsonResponse({ error: "MinerU upload capability request failed" }, 502, origin);
        }
        const uploadResult = sanitizedUploadResult(capability.body, token);
        const uploadUrl = uploadResult.data.file_urls[0];
        if (!uploadResult.data.batch_id || !uploadUrl) {
          return jsonResponse({ error: "MinerU did not return upload capability" }, 502, origin);
        }
        let uploadResponse;
        try {
          uploadResponse = await upstreamFetch(uploadUrl, { method: "PUT", body: bytes });
        } catch {
          return jsonResponse({ error: "MinerU PDF upload failed" }, 502, origin);
        }
        if (!uploadResponse?.ok) return jsonResponse({ error: "MinerU PDF upload failed" }, 502, origin);
        // Never return the signed OSS URL to the browser.  The Worker owns the
        // upload; the browser only needs the batch id for status polling.
        return jsonResponse({ code: 0, msg: "ok", data: { batch_id: uploadResult.data.batch_id } }, 200, origin);
      }

      if (selected.kind === "download") {
        const forwarded = await forward(`${MINERU_API_ORIGIN}${MINERU_RESULT_PREFIX}${encodeURIComponent(selected.batchId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (forwarded.response) return jsonResponse({ error: "MinerU result request failed" }, 502, origin);
        const result = sanitizedResult(forwarded.body, selected.batchId, token);
        const fullZipUrl = result.data.extract_result.full_zip_url;
        if (!fullZipUrl) return jsonResponse({ error: "MinerU result ZIP is unavailable" }, 502, origin);
        let zipResponse;
        try { zipResponse = await upstreamFetch(fullZipUrl, { method: "GET" }); } catch {
          return jsonResponse({ error: "MinerU result ZIP download failed" }, 502, origin);
        }
        if (!zipResponse?.ok) return jsonResponse({ error: "MinerU result ZIP download failed" }, 502, origin);
        const headers = new Headers({
          "Content-Type": zipResponse.headers?.get?.("Content-Type") || "application/zip",
          "Cache-Control": "no-store",
        });
        if (origin) {
          headers.set("Access-Control-Allow-Origin", origin);
          headers.set("Vary", "Origin");
        }
        return new Response(zipResponse.body, { status: 200, headers });
      }

      const forwarded = await forward(`${MINERU_API_ORIGIN}${MINERU_RESULT_PREFIX}${encodeURIComponent(selected.batchId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (forwarded.response) return jsonResponse(JSON.parse(await forwarded.response.text()), 502, origin);
      const result = sanitizedResult(forwarded.body, selected.batchId, token);
      if (!result.data.extract_result.state) return jsonResponse({ error: "MinerU returned an invalid task state" }, 502, origin);
      if (result.data.extract_result.full_zip_url) {
        result.data.extract_result.full_zip_url = `${url.origin}/api/mineru/download/${encodeURIComponent(selected.batchId)}`;
      }
      return jsonResponse(result, 200, origin);
    }

    return Object.freeze({ fetch: fetchHandler });
  }

  const defaultHandler = createGatewayHandler({ fetchImpl: typeof root?.fetch === "function" ? root.fetch.bind(root) : null });
  return Object.freeze({
    MINERU_API_ORIGIN,
    MINERU_UPLOAD_PATH,
    MINERU_RESULT_PREFIX,
    createGatewayHandler,
    fetch: defaultHandler.fetch,
  });
});
