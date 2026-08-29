import assert from "node:assert/strict";
import test from "node:test";

import { resolveFrozenCase, SOL_RUNNER } from "../scripts/run-sol-paper-import-source.mjs";

test("semantic runner is hard-bound to Sol medium for every production stage", () => {
  assert.deepEqual(SOL_RUNNER, {
    provider: "luna-gateway",
    model: "gpt-5.6-sol",
    mode: "medium-compact",
    reasoningEffort: "medium",
  });
});

test("semantic runner resolves both regression and generalization cases through frozen identities", () => {
  for (const caseId of ["hopf-degree-theorem", "very-good-gradings-structural-matrix-rings"]) {
    const source = resolveFrozenCase(caseId);
    assert.equal(source.record.caseId, caseId);
    assert.match(source.record.sourceIdentitySha256, /^[a-f0-9]{64}$/u);
    assert.match(source.markedMarkdown, /^\[\[PAGE 1\]\]/u);
  }
});
