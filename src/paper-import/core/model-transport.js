/**
 * Paper Import model transport.
 *
 * This is the single boundary for the two model adapters used by the web
 * import workflow: an injected chat implementation (for tests, gateways, and
 * host-routed models) or an OpenAI-compatible HTTP implementation.  Callers
 * own scenario-specific URL/body policy; this module owns adapter selection,
 * HTTP dispatch, response-envelope normalization, and transport failures.
 *
 * UMD/CommonJS is intentional: the static site loads this file as a plain
 * script, while Node consumers load it through CommonJS.
 */
(function publishCMathPaperModelTransport(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperModelTransport = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createCMathPaperModelTransport(root) {
  "use strict";

  const MODEL_TRANSPORT_MODULE_ID = "cmath.paper-import.model-transport/v1";
  const ERROR_CODES = Object.freeze({
    CONFIGURATION: "CONFIGURATION_ERROR",
    HTTP: "HTTP_ERROR",
    INVALID_ENVELOPE: "INVALID_ENVELOPE",
    SERVICE: "SERVICE_ERROR",
  });

  class ModelTransportError extends Error {
    constructor(code, message, details = {}) {
      super(message);
      this.name = "CMathModelTransportError";
      this.code = code;
      this.kind = String(code || "MODEL_TRANSPORT_ERROR").toLowerCase();
      this.category = this.kind.replace(/_error$/u, "");
      if (Number.isInteger(details.status)) this.status = details.status;
      if (typeof details.stage === "string" && details.stage) this.stage = details.stage;
      if (typeof details.url === "string" && details.url) this.url = details.url;
      if (typeof details.body === "string") this.body = details.body;
      if (details.reason) this.reason = details.reason;
      if (details.cause) this.cause = details.cause;
      this.details = Object.freeze({ ...details });
    }
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function messageText(message) {
    if (typeof message === "string") return message;
    if (!isObject(message)) return "";
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === "string") return part;
        if (isObject(part)) {
          if (part.type === "text" || part.type === "output_text") {
            if (typeof part.text === "string") return part.text;
            if (isObject(part.text) && typeof part.text.value === "string") return part.text.value;
          }
          if (typeof part.text === "string") return part.text;
        }
        return "";
      }).join("");
    }
    return "";
  }

  function serviceErrorMessage(value) {
    if (typeof value === "string") return value;
    if (isObject(value)) {
      return String(value.message ?? value);
    }
    return value == null ? "" : String(value);
  }

  function responseIsOk(response, status) {
    if (typeof response?.ok === "boolean") return response.ok;
    return status >= 200 && status < 300;
  }

  async function responseText(response, { stage, url } = {}) {
    if (response && typeof response.text === "function") {
      try {
        return await response.text();
      } catch (cause) {
        throw new ModelTransportError(
          ERROR_CODES.INVALID_ENVELOPE,
          "模型服务响应无法读取",
          { stage, url, reason: "read_failure", cause },
        );
      }
    }
    if (response && typeof response.json === "function") {
      try {
        return JSON.stringify(await response.json());
      } catch (cause) {
        throw new ModelTransportError(
          ERROR_CODES.INVALID_ENVELOPE,
          "模型服务响应不是有效 JSON",
          { stage, url, reason: "invalid_json", cause },
        );
      }
    }
    throw new ModelTransportError(
      ERROR_CODES.INVALID_ENVELOPE,
      "模型服务响应缺少 text/json 读取接口",
      { stage, url, reason: "missing_body_reader" },
    );
  }

  function parseEnvelope(text, { status = 200, stage, url, serviceName = "模型服务" } = {}) {
    let envelope;
    try {
      envelope = JSON.parse(typeof text === "string" ? text : String(text ?? ""));
    } catch (cause) {
      throw new ModelTransportError(
        ERROR_CODES.INVALID_ENVELOPE,
        `${serviceName} 响应不是有效 JSON`,
        { status, stage, url, reason: "invalid_json", cause },
      );
    }

    if (envelope.error) {
      const detail = serviceErrorMessage(envelope.error).slice(0, 300);
      throw new ModelTransportError(
        ERROR_CODES.SERVICE,
        `${serviceName} 服务端错误：${detail}`,
        { status, stage, url, reason: "service_error", error: envelope.error },
      );
    }

    return normalizeChoiceEnvelope(envelope, { status, stage, url, serviceName });
  }

  function normalizeChoiceEnvelope(envelope, { status = 200, stage, url, serviceName = "模型服务" } = {}) {
    const choice = Array.isArray(envelope?.choices) ? envelope.choices[0] : null;
    const message = choice?.message;
    if (!isObject(choice) || !isObject(message)) {
      throw new ModelTransportError(
        ERROR_CODES.INVALID_ENVELOPE,
        `${serviceName} 响应缺少 choices[0].message`,
        { status, stage, url, reason: "missing_message" },
      );
    }

    return {
      content: messageText(message),
      status,
      finishReason: choice.finish_reason ?? choice.finishReason ?? null,
      usage: envelope?.usage ?? null,
    };
  }

  function normalizeChatResult(result, { stage, serviceName = "模型服务" } = {}) {
    if (typeof result === "string") {
      return { content: result, status: 200, finishReason: null, usage: null };
    }
    if (!isObject(result)) {
      return { content: "", status: 200, finishReason: null, usage: null };
    }
    if (Array.isArray(result.choices)) {
      return normalizeChoiceEnvelope(result, {
        status: Number.isInteger(result.status) ? result.status : 200,
        stage,
        serviceName,
      });
    }
    return {
      content: messageText(result),
      status: Number.isInteger(result.status) ? result.status : 200,
      finishReason: result.finishReason ?? result.finish_reason ?? null,
      usage: result.usage ?? null,
    };
  }

  function normalizeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const url = value.trim().replace(/\/+$/u, "");
    return /\/chat\/completions$/u.test(url) ? url : `${url}/chat/completions`;
  }

  function buildDefaultBody(request, config) {
    const body = {
      model: request.model ?? config.model,
      messages: request.messages,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.responseFormat !== undefined) body.response_format = request.responseFormat;
    if (request.response_format !== undefined) body.response_format = request.response_format;
    if (request.reasoningEffort) body.reasoning_effort = request.reasoningEffort;
    if (request.reasoning_effort) body.reasoning_effort = request.reasoning_effort;
    if (request.stream !== undefined) body.stream = request.stream;
    return body;
  }

  function requestHeaders(apiKey, headers = {}) {
    const result = { "Content-Type": "application/json", ...headers };
    if (typeof apiKey === "string" && apiKey) result.Authorization = `Bearer ${apiKey}`;
    return result;
  }

  function formatHttpDetail(text) {
    if (typeof text !== "string" || !text) return "没有错误详情";
    try {
      const parsed = JSON.parse(text);
      const detail = serviceErrorMessage(parsed?.error ?? parsed?.message);
      if (detail) return detail.slice(0, 500);
    } catch { /* 保留原始响应片段 */ }
    return text.slice(0, 500);
  }

  function createModelTransport({
    chatImpl,
    fetchImpl = root?.fetch ?? (typeof globalThis !== "undefined" ? globalThis.fetch : undefined),
    endpoint,
    apiKey,
    model,
    providerLabel = "模型服务",
    signal,
    disableHttp = false,
    chatDefaults = {},
    requireApiKey = false,
  } = {}) {
    const chatFn = typeof chatImpl === "function" ? chatImpl : null;
    const fetchFn = typeof fetchImpl === "function" ? fetchImpl : null;
    const serviceName = typeof providerLabel === "string" && providerLabel.trim()
      ? providerLabel.trim()
      : "模型服务";

    async function complete(request = {}) {
      const stage = typeof request.stage === "string" ? request.stage : "model";
      if (chatFn) {
        const {
          body: _body,
          endpoint: _endpoint,
          url: _url,
          headers: _headers,
          ...chatRequest
        } = request;
        const result = await chatFn({ ...chatDefaults, ...chatRequest });
        return normalizeChatResult(result, { stage, serviceName });
      }
      if (disableHttp || !fetchFn) {
        throw new ModelTransportError(
          ERROR_CODES.CONFIGURATION,
          disableHttp && fetchFn
            ? "模型 transport 的 HTTP adapter 已禁用"
            : "模型 transport 没有可用的 chatImpl 或 fetchImpl",
          { stage, reason: disableHttp && fetchFn ? "http_disabled" : "adapter_unavailable" },
        );
      }
      if (requireApiKey && (typeof apiKey !== "string" || !apiKey)) {
        throw new ModelTransportError(
          ERROR_CODES.CONFIGURATION,
          "模型 transport 缺少 API key",
          { stage, reason: "missing_api_key" },
        );
      }

      const url = normalizeUrl(request.url ?? request.endpoint ?? endpoint);
      if (!url) {
        throw new ModelTransportError(
          ERROR_CODES.CONFIGURATION,
          `${serviceName} 未配置 endpoint`,
          { stage, reason: "missing_endpoint" },
        );
      }
      const body = request.body !== undefined ? request.body : buildDefaultBody(request, { model });
      let response;
      try {
        response = await fetchFn(url, {
          method: "POST",
          headers: requestHeaders(apiKey, request.headers),
          body: JSON.stringify(body),
          signal: request.signal ?? signal,
        });
      } catch (cause) {
        throw cause;
      }
      const status = Number.isInteger(response?.status) ? response.status : 200;
      const text = await responseText(response, { stage, url });
      if (!responseIsOk(response, status)) {
        throw new ModelTransportError(
          ERROR_CODES.HTTP,
          `${serviceName} 请求失败（HTTP ${status}）：${formatHttpDetail(text)}`,
          { status, stage, url, body: text, reason: "http_error" },
        );
      }
      return parseEnvelope(text, { status, stage, url, serviceName });
    }

    return Object.freeze({ complete });
  }

  return Object.freeze({
    MODEL_TRANSPORT_MODULE_ID,
    ERROR_CODES,
    ModelTransportError,
    isModelTransportError: (error) => error instanceof ModelTransportError || error?.name === "CMathModelTransportError",
    createModelTransport,
  });
});
