import assert from "node:assert/strict";
import test from "node:test";

import transport from "../src/paper-import/core/model-transport.js";

const MUSE_MODEL = "muse-spark-1.3-contributor";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("routes Muse on an OpenCode Go base URL to Responses with the BYOK header", async () => {
  const calls = [];
  const messages = [{ role: "user", content: "Extract the theorem." }];
  const client = transport.createModelTransport({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: "muse-test-key",
    model: MUSE_MODEL,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init, body: JSON.parse(init.body) });
      return jsonResponse({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: "{\"ok\":true}" }] }],
      });
    },
  });

  const result = await client.complete({
    model: MUSE_MODEL,
    messages,
    maxTokens: 4096,
    reasoningEffort: "high",
    responseFormat: { type: "json_object" },
    stream: false,
    body: {
      model: MUSE_MODEL,
      messages,
      max_tokens: 4096,
      reasoning_effort: "high",
      response_format: { type: "json_object" },
      stream: false,
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://opencode.ai/zen/go/v1/responses");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer muse-test-key");
  assert.deepEqual(calls[0].body, {
    model: MUSE_MODEL,
    input: messages,
    max_output_tokens: 4096,
    reasoning: { effort: "high" },
    text: { format: { type: "json_object" } },
    stream: false,
  });
  assert.equal(result.content, "{\"ok\":true}");
});

test("normalizes the Responses output_text envelope", async () => {
  const client = transport.createModelTransport({
    endpoint: "https://opencode.ai/zen/go/v1/responses",
    apiKey: "muse-test-key",
    model: MUSE_MODEL,
    fetchImpl: async () => jsonResponse({
      status: "completed",
      output_text: "plain Responses output",
      usage: { input_tokens: 2, output_tokens: 3 },
    }),
  });

  const result = await client.complete({ messages: [{ role: "user", content: "Say hi." }] });

  assert.equal(result.content, "plain Responses output");
  assert.equal(result.finishReason, "stop");
  assert.deepEqual(result.usage, { input_tokens: 2, output_tokens: 3 });
});

test("keeps an ordinary DeepSeek model on Chat Completions", async () => {
  const calls = [];
  const client = transport.createModelTransport({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "deepseek-test-key",
    model: "deepseek-chat",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return jsonResponse({ choices: [{ message: { content: "chat result" }, finish_reason: "stop" }] });
    },
  });

  const result = await client.complete({
    messages: [{ role: "user", content: "Say hi." }],
    maxTokens: 512,
    reasoningEffort: "low",
    responseFormat: { type: "json_object" },
    stream: false,
  });

  assert.equal(calls[0].url, "https://api.deepseek.com/v1/chat/completions");
  assert.deepEqual(calls[0].body, {
    model: "deepseek-chat",
    messages: [{ role: "user", content: "Say hi." }],
    max_tokens: 512,
    response_format: { type: "json_object" },
    reasoning_effort: "low",
    stream: false,
  });
  assert.equal(result.content, "chat result");
});
