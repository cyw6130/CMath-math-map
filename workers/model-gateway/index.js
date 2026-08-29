/*
 * CMath-provided model gateway.
 *
 * This is intentionally not a generic proxy. It exposes one fixed model,
 * validates the Paper Import request contract, keeps the upstream credential
 * in a Worker Secret, and normalizes the Responses API envelope for the web
 * workflow's injected chat transport.
 */
(function publishModelGateway(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathModelGateway = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createModelGatewayModule(root) {
  "use strict";

  const UPSTREAM_URL = "https://opencode.ai/zen/go/v1/responses";
  const MODEL_ID = "muse-spark-1.2-contributor";
  const COMPLETE_PATHS = new Set(["/complete", "/api/model/complete"]);
  const HEALTH_PATHS = new Set(["/", "/health", "/api/model", "/api/model/health"]);
  const ALLOWED_STAGES = new Set([
    "model", "guide", "target", "extract", "aggregate", "consolidate",
    "assemble", "repair", "w7-verify", "w8-b0", "closure",
  ]);
  const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);
  const MAX_BODY_BYTES = 2 * 1024 * 1024;
  const MAX_MESSAGE_CHARS = 1_500_000;
  const DEFAULT_MAX_OUTPUT_TOKENS = 100_000;
  const requestWindows = new Map();
  const activeByClient = new Map();
  let activeGlobal = 0;

  function configuredOrigins(env) {
    const raw = String(env?.MODEL_ALLOWED_ORIGINS ?? env?.CORS_ORIGINS ?? "").trim();
    return new Set(raw.split(/[\s,]+/u).map((item) => item.trim()).filter(Boolean));
  }

  function corsOrigin(request, env) {
    const origin = request.headers.get("Origin")?.trim() || "";
    if (!origin) return "";
    return configuredOrigins(env).has(origin) ? origin : null;
  }

  function responseHeaders(origin) {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return headers;
  }

  function json(payload, status, origin, extraHeaders = {}) {
    const headers = responseHeaders(origin);
    for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, String(value));
    return new Response(JSON.stringify(payload), { status, headers });
  }

  function safeUpstreamMessage(value) {
    const text = typeof value === "string" ? value : value?.message;
    return typeof text === "string" ? text.slice(0, 300) : "upstream request failed";
  }

  function clientId(request) {
    return request.headers.get("CF-Connecting-IP")
      || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
      || "unknown";
  }

  function rateLimit(client, env, now = Date.now()) {
    const windowMs = 60_000;
    const max = Math.max(12, Math.min(300, Number(env?.MODEL_BURST_PER_MINUTE) || 60));
    const current = requestWindows.get(client);
    if (!current || now - current.startedAt >= windowMs) {
      requestWindows.set(client, { startedAt: now, count: 1 });
      return null;
    }
    current.count += 1;
    if (current.count <= max) return null;
    return Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
  }

  function beginConcurrency(client, env) {
    const perClient = Math.max(1, Math.min(8, Number(env?.MODEL_MAX_CLIENT_CONCURRENCY) || 2));
    const globalMax = Math.max(perClient, Math.min(64, Number(env?.MODEL_MAX_ISOLATE_CONCURRENCY) || 8));
    const current = activeByClient.get(client) || 0;
    if (current >= perClient || activeGlobal >= globalMax) return false;
    activeByClient.set(client, current + 1);
    activeGlobal += 1;
    return true;
  }

  function endConcurrency(client) {
    const next = Math.max(0, (activeByClient.get(client) || 1) - 1);
    if (next) activeByClient.set(client, next);
    else activeByClient.delete(client);
    activeGlobal = Math.max(0, activeGlobal - 1);
  }

  function parseRequestBody(body, env) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("request body must be an object");
    const allowed = new Set(["stage", "messages", "maxTokens", "responseFormat", "reasoningEffort"]);
    for (const key of Object.keys(body)) if (!allowed.has(key)) throw new Error(`unsupported field: ${key}`);
    const stage = typeof body.stage === "string" ? body.stage : "model";
    if (!ALLOWED_STAGES.has(stage)) throw new Error("unsupported Paper Import stage");
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) {
      throw new Error("messages must contain between 1 and 8 items");
    }
    let totalChars = 0;
    const messages = body.messages.map((message) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("invalid message");
      if (!ALLOWED_ROLES.has(message.role) || typeof message.content !== "string") throw new Error("invalid message role or content");
      totalChars += message.content.length;
      return { role: message.role, content: message.content };
    });
    if (totalChars > MAX_MESSAGE_CHARS) throw new Error("Paper Import prompt exceeds gateway limit");
    const configuredMax = Math.max(1, Math.min(100_000, Number(env?.MODEL_MAX_OUTPUT_TOKENS) || DEFAULT_MAX_OUTPUT_TOKENS));
    const requestedMax = body.maxTokens === undefined ? configuredMax : Number(body.maxTokens);
    if (!Number.isInteger(requestedMax) || requestedMax < 1) throw new Error("maxTokens must be a positive integer");
    const reasoningEffort = ["none", "low", "medium", "high"].includes(body.reasoningEffort)
      ? body.reasoningEffort
      : "none";
    return {
      stage,
      messages,
      maxOutputTokens: Math.min(requestedMax, configuredMax),
      reasoningEffort,
      wantsJson: body.responseFormat?.type === "json_object",
    };
  }

  function responseText(envelope) {
    if (typeof envelope?.output_text === "string" && envelope.output_text) return envelope.output_text;
    if (!Array.isArray(envelope?.output)) return "";
    return envelope.output.flatMap((item) => Array.isArray(item?.content) ? item.content : [])
      .map((part) => typeof part?.text === "string" ? part.text : "")
      .join("");
  }

  function createGatewayHandler({ fetchImpl } = {}) {
    const upstreamFetch = fetchImpl ?? root?.fetch?.bind(root);
    if (typeof upstreamFetch !== "function") throw new Error("Model Gateway requires fetch");

    async function fetchHandler(request, env = {}) {
      const origin = corsOrigin(request, env);
      if (origin === null) return json({ error: "Origin not allowed" }, 403, "");
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        if (!COMPLETE_PATHS.has(url.pathname) && !HEALTH_PATHS.has(url.pathname)) return json({ error: "Not found" }, 404, origin);
        return new Response(null, {
          status: 204,
          headers: {
            ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "600",
          },
        });
      }

      const apiKey = typeof env?.OPENCODE_GO_API_KEY === "string" ? env.OPENCODE_GO_API_KEY.trim() : "";
      const enabled = String(env?.MODEL_GATEWAY_ENABLED ?? "true").toLowerCase() !== "false";
      if (HEALTH_PATHS.has(url.pathname) && request.method === "GET") {
        return json({ available: enabled && Boolean(apiKey), model: MODEL_ID }, 200, origin);
      }
      if (!COMPLETE_PATHS.has(url.pathname)) return json({ error: "Not found" }, 404, origin);
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
      if (!enabled || !apiKey) return json({ error: "CMath model service is unavailable" }, 503, origin);

      const declaredLength = Number(request.headers.get("Content-Length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "request exceeds gateway limit" }, 413, origin);
      const client = clientId(request);
      const retryAfter = rateLimit(client, env);
      if (retryAfter) return json({ error: "request rate is temporarily limited" }, 429, origin, { "Retry-After": retryAfter });
      if (!beginConcurrency(client, env)) return json({ error: "model service is busy" }, 429, origin, { "Retry-After": 10 });

      try {
        let raw;
        try { raw = await request.text(); } catch { return json({ error: "request body cannot be read" }, 400, origin); }
        if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "request exceeds gateway limit" }, 413, origin);
        let body;
        try { body = JSON.parse(raw); } catch { return json({ error: "valid JSON is required" }, 400, origin); }
        let parsed;
        try { parsed = parseRequestBody(body, env); } catch (error) { return json({ error: error.message }, 400, origin); }

        const upstreamBody = {
          model: MODEL_ID,
          input: parsed.messages,
          max_output_tokens: parsed.maxOutputTokens,
          reasoning: { effort: parsed.reasoningEffort },
          stream: false,
          ...(parsed.wantsJson ? { text: { format: { type: "json_object" } } } : {}),
        };
        const timeoutMs = Math.max(10_000, Math.min(300_000, Number(env?.MODEL_UPSTREAM_TIMEOUT_MS) || 180_000));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let upstream;
        try {
          upstream = await upstreamFetch(UPSTREAM_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(upstreamBody),
            signal: controller.signal,
          });
        } catch (error) {
          return json({ error: error?.name === "AbortError" ? "upstream request timed out" : "upstream service unavailable" }, 502, origin);
        } finally {
          clearTimeout(timer);
        }
        const upstreamText = await upstream.text();
        let envelope;
        try { envelope = JSON.parse(upstreamText); } catch { return json({ error: "upstream returned invalid JSON" }, 502, origin); }
        if (!upstream.ok || envelope?.error) {
          const status = upstream.status === 429 ? 429 : (upstream.status === 403 ? 403 : 502);
          return json({ error: safeUpstreamMessage(envelope?.error ?? envelope?.message) }, status, origin);
        }
        const content = responseText(envelope);
        if (!content) return json({ error: "upstream returned no model output" }, 502, origin);
        return json({
          content,
          finishReason: envelope.status === "incomplete" ? "length" : "stop",
          usage: envelope.usage ?? null,
          model: MODEL_ID,
        }, 200, origin);
      } finally {
        endConcurrency(client);
      }
    }

    return Object.freeze({ fetch: fetchHandler });
  }

  return Object.freeze({ MODEL_ID, UPSTREAM_URL, createGatewayHandler, parseRequestBody, responseText });
});
