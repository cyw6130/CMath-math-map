import assert from "node:assert/strict";
import test from "node:test";

import gateway from "../workers/model-gateway/index.js";

function upstreamResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const env = {
  OPENCODE_GO_API_KEY: "upstream-secret-never-returned",
  MODEL_ALLOWED_ORIGINS: "https://app.example",
  MODEL_GATEWAY_ENABLED: "true",
};

test("model gateway health reports configuration without exposing the credential", async () => {
  const handler = gateway.createGatewayHandler({ fetchImpl: async () => { throw new Error("unused"); } });
  const unavailable = await handler.fetch(new Request("https://gateway.example/api/model"), {});
  assert.deepEqual(await unavailable.json(), { available: false, model: "muse-spark-1.2-contributor" });

  const ready = await handler.fetch(new Request("https://gateway.example/api/model", {
    headers: { Origin: "https://app.example" },
  }), env);
  const body = await ready.text();
  assert.match(body, /"available":true/u);
  assert.doesNotMatch(body, /upstream-secret/u);
  assert.equal(ready.headers.get("access-control-allow-origin"), "https://app.example");
});

test("model gateway fixes the model and Responses endpoint, then normalizes output", async () => {
  const calls = [];
  const handler = gateway.createGatewayHandler({
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init, body: JSON.parse(init.body) });
      return upstreamResponse({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: "{\"entries\":[]}" }] }],
        usage: { input_tokens: 10, output_tokens: 4 },
      });
    },
  });
  const response = await handler.fetch(new Request("https://gateway.example/api/model/complete", {
    method: "POST",
    headers: { Origin: "https://app.example", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.4" },
    body: JSON.stringify({
      stage: "extract",
      messages: [{ role: "user", content: "paper prompt" }],
      maxTokens: 16000,
      responseFormat: { type: "json_object" },
      reasoningEffort: "none",
    }),
  }), env);

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://opencode.ai/zen/go/v1/responses");
  assert.equal(calls[0].body.model, "muse-spark-1.2-contributor");
  assert.equal(calls[0].body.input[0].content, "paper prompt");
  assert.equal(calls[0].body.max_output_tokens, 16000);
  assert.equal(Object.hasOwn(calls[0].body, "reasoning"), false);
  assert.equal(calls[0].init.headers.Authorization, "Bearer upstream-secret-never-returned");
  const payload = await response.json();
  assert.equal(payload.content, "{\"entries\":[]}");
  assert.equal(payload.model, "muse-spark-1.2-contributor");
  assert.doesNotMatch(JSON.stringify(payload), /upstream-secret/u);
});

test("model gateway rejects foreign origins and generic proxy fields", async () => {
  let upstreamCalls = 0;
  const handler = gateway.createGatewayHandler({ fetchImpl: async () => { upstreamCalls += 1; return upstreamResponse({}); } });
  const foreign = await handler.fetch(new Request("https://gateway.example/api/model/complete", {
    method: "POST",
    headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    body: JSON.stringify({ stage: "extract", messages: [{ role: "user", content: "x" }] }),
  }), env);
  assert.equal(foreign.status, 403);

  const generic = await handler.fetch(new Request("https://gateway.example/api/model/complete", {
    method: "POST",
    headers: { Origin: "https://app.example", "Content-Type": "application/json" },
    body: JSON.stringify({
      stage: "extract",
      messages: [{ role: "user", content: "x" }],
      model: "expensive-other-model",
      endpoint: "https://attacker.example",
    }),
  }), env);
  assert.equal(generic.status, 400);
  assert.match(await generic.text(), /unsupported field/u);
  assert.equal(upstreamCalls, 0);
});

test("model gateway returns sanitized upstream failures", async () => {
  const handler = gateway.createGatewayHandler({
    fetchImpl: async () => upstreamResponse({ error: { message: "model unavailable" } }, 503),
  });
  const response = await handler.fetch(new Request("https://gateway.example/api/model/complete", {
    method: "POST",
    headers: { Origin: "https://app.example", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.5" },
    body: JSON.stringify({ stage: "assemble", messages: [{ role: "user", content: "x" }] }),
  }), env);
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.match(text, /model unavailable/u);
  assert.doesNotMatch(text, /upstream-secret/u);
});
