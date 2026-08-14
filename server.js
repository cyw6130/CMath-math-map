/* Local static server for the Gamma Math Map.
   Serves the same frontend used by GitHub Pages, plus a loopback-only
   API Key store (~/.gamma-math-map/keys.json, mode 0600) so the desktop
   app can remember credentials locally. The published GitHub Pages build
   never talks to this server, so its behavior is unchanged. */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.findIndex((a) => a === `--${name}`);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split("=")[1] : fallback;
}
const port = Number(argValue("port", process.env.PORT || 7100));
const host = argValue("host", "127.0.0.1");

const KEY_STORE_PATH = path.join(os.homedir(), ".gamma-math-map", "keys.json");
const KEY_STORE_SCHEMA = "cmath-gamma.local-key-store/v0.1";
const LOCAL_ONLY_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const LOCAL_ORIGIN_RE = /^https?:\/\/(127\.0\.0\.1|::1|localhost)(:\d+)?$/u;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mjs": "text/javascript; charset=utf-8",
};

function readKeyStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(KEY_STORE_PATH, "utf8"));
    if (parsed && parsed.schema === KEY_STORE_SCHEMA && parsed.providers && typeof parsed.providers === "object") {
      return parsed;
    }
  } catch { /* missing or malformed store behaves as empty */ }
  return { schema: KEY_STORE_SCHEMA, providers: {} };
}

function writeKeyStore(store) {
  fs.mkdirSync(path.dirname(KEY_STORE_PATH), { recursive: true });
  fs.writeFileSync(KEY_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(KEY_STORE_PATH, 0o600);
}

function localOnly(request, response) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwarded) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden: local-key endpoints are loopback-only");
    return false;
  }
  if (!LOCAL_ONLY_HOSTS.has(request.socket.remoteAddress)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden: local-key endpoints are loopback-only");
    return false;
  }
  const origin = request.headers.origin || "";
  if (origin && !LOCAL_ORIGIN_RE.test(origin)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden: local-key endpoints reject foreign origins");
    return false;
  }
  return true;
}

function sendJson(response, status, payload, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (origin && LOCAL_ORIGIN_RE.test(origin)) headers["Access-Control-Allow-Origin"] = origin;
  response.writeHead(status, headers);
  response.end(`${JSON.stringify(payload)}\n`);
}

function collectBody(request, limitBytes = 16 * 1024, callback) {
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > limitBytes) {
      request.destroy();
      callback(new Error("body too large"));
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => callback(null, Buffer.concat(chunks).toString("utf8")));
  request.on("error", (error) => callback(error));
}

function isLocalHttpTarget(target) {
  if (target.protocol === "https:") return true;
  if (target.protocol !== "http:") return false;
  return ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
}

const PROXY_BODY_LIMIT = 16 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 600000;

const root = __dirname;
http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);

    if (urlPath === "/api/local-key" || urlPath === "/api/local-key/") {
      if (req.method === "GET") {
        if (!localOnly(req, res)) return;
        sendJson(res, 200, readKeyStore(), req.headers.origin || "");
        return;
      }
      if (req.method === "PUT") {
        if (!localOnly(req, res)) return;
        collectBody(req, 16 * 1024, (bodyError, raw) => {
          if (bodyError) {
            sendJson(res, 400, { error: bodyError.message }, req.headers.origin || "");
            return;
          }
          let body;
          try { body = JSON.parse(raw); } catch { sendJson(res, 400, { error: "request body is not valid JSON" }, req.headers.origin || ""); return; }
          const provider = typeof body.provider === "string" && body.provider.trim() ? body.provider.trim().toLowerCase() : null;
          if (!provider || /[^a-z0-9-]/.test(provider)) {
            sendJson(res, 400, { error: "provider must be a kebab-case identifier" }, req.headers.origin || "");
            return;
          }
          const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : undefined;
          const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : undefined;
          const model = typeof body.model === "string" ? body.model.trim() : undefined;
          if (apiKey !== undefined && apiKey !== "" && (apiKey.length < 8 || apiKey.length > 512)) {
            sendJson(res, 400, { error: "apiKey must be between 8 and 512 characters" }, req.headers.origin || "");
            return;
          }
          if (endpoint !== undefined && endpoint !== "" && (endpoint.length < 4 || endpoint.length > 512)) {
            sendJson(res, 400, { error: "endpoint must be between 4 and 512 characters" }, req.headers.origin || "");
            return;
          }
          if (model !== undefined && model !== "" && (model.length < 1 || model.length > 128)) {
            sendJson(res, 400, { error: "model must be between 1 and 128 characters" }, req.headers.origin || "");
            return;
          }
          const store = readKeyStore();
          const entry = store.providers[provider];
          const saved = entry && typeof entry === "object" ? entry : {};
          if (apiKey !== undefined) {
            if (apiKey) saved.apiKey = apiKey;
            else delete saved.apiKey;
          }
          if (endpoint !== undefined) {
            if (endpoint) saved.endpoint = endpoint;
            else delete saved.endpoint;
          }
          if (model !== undefined) {
            if (model) saved.model = model;
            else delete saved.model;
          }
          if (Object.keys(saved).length) {
            store.providers[provider] = saved;
          } else {
            delete store.providers[provider];
          }
          writeKeyStore(store);
          sendJson(res, 200, { schema: KEY_STORE_SCHEMA, provider, stored: Boolean(saved.apiKey), providers: Object.keys(store.providers) }, req.headers.origin || "");
        });
        return;
      }
      sendJson(res, 405, { error: "method not allowed" }, req.headers.origin || "");
      return;
    }

    // Same-origin model proxy: the browser posts {targetUrl, apiKey, body} to
    // the loopback server, which forwards the OpenAI-compatible request and
    // streams the upstream response back. This is the only path that lets the
    // desktop app talk to endpoints that reject browser CORS preflights
    // (e.g. a local Sub2API instance). Target hosts are restricted to HTTPS
    // or loopback HTTP, and the endpoints themselves remain loopback-only.
    if (urlPath === "/api/model-proxy" || urlPath === "/api/model-proxy/") {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "method not allowed" }, req.headers.origin || "");
        return;
      }
      if (!localOnly(req, res)) return;
      collectBody(req, PROXY_BODY_LIMIT, async (bodyError, raw) => {
        if (bodyError) {
          sendJson(res, 400, { error: bodyError.message }, req.headers.origin || "");
          return;
        }
        let payload;
        try { payload = JSON.parse(raw); } catch { sendJson(res, 400, { error: "request body is not valid JSON" }, req.headers.origin || ""); return; }
        const targetUrl = typeof payload.targetUrl === "string" ? payload.targetUrl : "";
        const apiKey = typeof payload.apiKey === "string" ? payload.apiKey : "";
        let target;
        try { target = new URL(targetUrl); } catch { sendJson(res, 400, { error: "targetUrl is not a valid URL" }, req.headers.origin || ""); return; }
        if (!isLocalHttpTarget(target)) {
          sendJson(res, 400, { error: "targetUrl must be HTTPS or loopback HTTP" }, req.headers.origin || "");
          return;
        }
        if (!apiKey || apiKey.length > 512) {
          sendJson(res, 400, { error: "apiKey is required" }, req.headers.origin || "");
          return;
        }
        if (!payload.body || typeof payload.body !== "object") {
          sendJson(res, 400, { error: "body must be an object" }, req.headers.origin || "");
          return;
        }
        try {
          const upstream = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload.body),
            signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
          });
          const upstreamText = await upstream.text();
          res.writeHead(upstream.status, {
            "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          });
          res.end(upstreamText);
        } catch (error) {
          const message = error?.name === "AbortError" ? "upstream request timed out" : `upstream request failed: ${error?.message ?? "unknown"}`;
          sendJson(res, 502, { error: message }, req.headers.origin || "");
        }
      });
      return;
    }

    let filePath = path.join(root, urlPath === "/" ? "index.html" : urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(port, host, () => {
    console.log(`Gamma Math Map (local) → http://${host}:${port}/`);
    console.log(`API Key store: ${KEY_STORE_PATH}`);
  });
