import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");

test("buildGatewayChatRequest wraps the inline prompt as a single user message with reasoning effort", () => {
  assert.equal(typeof scorer.buildGatewayChatRequest, "function", "buildGatewayChatRequest must be exported");
  const req = scorer.buildGatewayChatRequest({
    renderedPrompt: "Evaluate this artifact... {gold}",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
  });

  assert.equal(req.model, "gpt-5.6-sol");
  assert.equal(req.messages.length, 1);
  assert.equal(req.messages[0].role, "user");
  assert.equal(req.messages[0].content, "Evaluate this artifact... {gold}");
  assert.equal(req.reasoning_effort, "medium");
});

test("buildGatewayChatRequest omits reasoning_effort when not provided", () => {
  const req = scorer.buildGatewayChatRequest({ renderedPrompt: "p", model: "m" });
  assert.equal("reasoning_effort" in req, false);
});
