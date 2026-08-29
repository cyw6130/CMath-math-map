import assert from "node:assert/strict";
import test from "node:test";

import { resolveFrozenCase, SOL_RUNNER } from "../scripts/run-sol-paper-import-source.mjs";
import { createCodexChatGPTChat } from "../scripts/codex-chatgpt-transport.mjs";

test("semantic runner is hard-bound to Sol medium for every production stage", () => {
  assert.deepEqual(SOL_RUNNER, {
    provider: "codex-chatgpt-login",
    model: "gpt-5.6-sol",
    mode: "medium-compact",
    reasoningEffort: "medium",
  });
});

test("Codex ChatGPT transport rejects any model or reasoning substitution before spawning", async () => {
  const chat = createCodexChatGPTChat();
  await assert.rejects(
    () => chat({ stage: "Entry", messages: [], model: "gpt-5.6-luna", reasoningEffort: "medium" }),
    /only permits gpt-5\.6-sol\/medium/u,
  );
  await assert.rejects(
    () => chat({ stage: "Entry", messages: [], model: "gpt-5.6-sol", reasoningEffort: "high" }),
    /only permits gpt-5\.6-sol\/medium/u,
  );
});

test("semantic runner resolves both regression and generalization cases through frozen identities", () => {
  for (const caseId of ["hopf-degree-theorem", "very-good-gradings-structural-matrix-rings"]) {
    const source = resolveFrozenCase(caseId);
    assert.equal(source.record.caseId, caseId);
    assert.match(source.record.sourceIdentitySha256, /^[a-f0-9]{64}$/u);
    assert.match(source.markedMarkdown, /^\[\[PAGE 1\]\]/u);
  }
});
