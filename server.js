/* Local static server for the Gamma Math Map.
   Serves the same frontend used by GitHub Pages, plus a loopback-only
   API Key store (~/.gamma-math-map/keys.json, mode 0600) so the desktop
   app can remember credentials locally. The published GitHub Pages build
   never talks to this server, so its behavior is unchanged. */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createLocalMapStore } = require("./src/map-library/local-map-store");
const { createLocalLibraryStateStore } = require("./src/map-library/local-library-state");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.findIndex((a) => a === `--${name}`);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split("=")[1] : fallback;
}
const port = Number(argValue("port", process.env.PORT || 7100));
const host = argValue("host", "127.0.0.1");
const graphInput = argValue("graph", "");

const KEY_STORE_PATH = path.join(os.homedir(), ".gamma-math-map", "keys.json");
const KEY_STORE_SCHEMA = "cmath-gamma.local-key-store/v0.1";
const MAP_STORE_PATH = path.join(os.homedir(), ".cmath-math-map", "maps");
const LIBRARY_STATE_PATH = path.join(os.homedir(), ".cmath-math-map", "library-state.json");
const localMapStore = createLocalMapStore(MAP_STORE_PATH);
const localLibraryStateStore = createLocalLibraryStateStore(LIBRARY_STATE_PATH);
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
const MAP_BODY_LIMIT = 32 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 1800000;

// Manual upstream forward: Node's global fetch (undici) enforces an
// unconfigurable 300s headers timeout, which reasoning models routinely
// exceed. node:http(s) lets us own the full timeout budget.
function forwardToUpstream(targetUrl, apiKey, body) {
  return new Promise((resolve, reject) => {
    const transport = targetUrl.protocol === "https:" ? require("https") : require("http");
    const payload = JSON.stringify(body);
    const request = transport.request(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: PROXY_TIMEOUT_MS,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode ?? 502,
        contentType: response.headers["content-type"] || "application/json; charset=utf-8",
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("upstream request timed out")));
    request.on("error", reject);
    request.end(payload);
  });
}

const root = __dirname;
const graphInputPath = graphInput ? path.resolve(graphInput) : "";
http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);

    if (urlPath === "/api/pure-graph-input" || urlPath === "/api/pure-graph-input/") {
      if (!localOnly(req, res)) return;
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "method not allowed" }, req.headers.origin || "");
        return;
      }
      if (!graphInputPath) {
        sendJson(res, 404, { error: "no graph JSON was supplied" }, req.headers.origin || "");
        return;
      }
      fs.readFile(graphInputPath, "utf8", (error, raw) => {
        if (error) {
          sendJson(res, 404, { error: `failed to read graph JSON: ${error.message}` }, req.headers.origin || "");
          return;
        }
        try {
          sendJson(res, 200, JSON.parse(raw), req.headers.origin || "");
        } catch (parseError) {
          sendJson(res, 400, { error: `graph JSON is invalid: ${parseError.message}` }, req.headers.origin || "");
        }
      });
      return;
    }

    if (graphInputPath && urlPath.startsWith("/api/")) {
      sendJson(res, 404, { error: "not available in graph reader mode" }, req.headers.origin || "");
      return;
    }

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

    const mapDeleteMatch = urlPath.match(/^\/api\/maps\/([^/]+)$/u);
    if (mapDeleteMatch) {
      if (!localOnly(req, res)) return;
      if (req.method !== "DELETE") {
        sendJson(res, 405, { error: "method not allowed" }, req.headers.origin || "");
        return;
      }
      try {
        const id = decodeURIComponent(mapDeleteMatch[1]);
        const removed = localMapStore.remove(id);
        sendJson(res, 200, { schema: "cmath.local-map-delete/v1", id, removed }, req.headers.origin || "");
      } catch (error) {
        sendJson(res, 400, { error: error.message }, req.headers.origin || "");
      }
      return;
    }

    if (urlPath === "/api/maps" || urlPath === "/api/maps/") {
      if (!localOnly(req, res)) return;
      if (req.method === "GET") {
        try {
          sendJson(res, 200, { schema: "cmath.local-map-library/v1", maps: localMapStore.list() }, req.headers.origin || "");
        } catch (error) {
          sendJson(res, 500, { error: "failed to read local maps: " + error.message }, req.headers.origin || "");
        }
        return;
      }
      if (req.method === "POST") {
        collectBody(req, MAP_BODY_LIMIT, (bodyError, raw) => {
          if (bodyError) {
            sendJson(res, 400, { error: bodyError.message }, req.headers.origin || "");
            return;
          }
          try {
            const saved = localMapStore.put(JSON.parse(raw));
            sendJson(res, 201, saved, req.headers.origin || "");
          } catch (error) {
            sendJson(res, 400, { error: error.message }, req.headers.origin || "");
          }
        });
        return;
      }
      sendJson(res, 405, { error: "method not allowed" }, req.headers.origin || "");
      return;
    }

    if (urlPath === "/api/library-state" || urlPath === "/api/library-state/") {
      if (!localOnly(req, res)) return;
      if (req.method === "GET") {
        try {
          sendJson(res, 200, localLibraryStateStore.read(), req.headers.origin || "");
        } catch (error) {
          sendJson(res, 500, { error: "failed to read local library state: " + error.message }, req.headers.origin || "");
        }
        return;
      }
      if (req.method === "PUT" || req.method === "POST") {
        collectBody(req, 2 * 1024 * 1024, (bodyError, raw) => {
          if (bodyError) {
            sendJson(res, 400, { error: bodyError.message }, req.headers.origin || "");
            return;
          }
          try {
            const saved = localLibraryStateStore.write(JSON.parse(raw));
            sendJson(res, 200, saved, req.headers.origin || "");
          } catch (error) {
            sendJson(res, 400, { error: error.message }, req.headers.origin || "");
          }
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
          const upstream = await forwardToUpstream(target, apiKey, payload.body);
          res.writeHead(upstream.status, { "Content-Type": upstream.contentType });
          res.end(upstream.body);
        } catch (error) {
          const message = ["AbortError", "TimeoutError"].includes(error?.name)
            ? "upstream request timed out"
            : `upstream request failed: ${error?.message ?? "unknown"}`;
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
  .listen(port, host, function () {
    const boundPort = this.address()?.port ?? port;
    if (graphInputPath) console.log(`Pure Graph View → http://${host}:${boundPort}/pages/pure-graph-view.html`);
    console.log(`Gamma Math Map (local) → http://${host}:${boundPort}/`);
    console.log(`API Key store: ${KEY_STORE_PATH}`);
    console.log(`Local map store: ${MAP_STORE_PATH}`);
    console.log(`Local library state store: ${LIBRARY_STATE_PATH}`);
  });
