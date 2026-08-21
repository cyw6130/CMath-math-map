import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Test the pure prompt builder and patch logic without network
test("buildVerificationPrompt contains zero paper-specific leakage", async () => {
  const { buildVerificationPrompt } = await import("../scripts/verify-and-patch-with-spark.mjs");
  const prompt = buildVerificationPrompt({
    consolidatedText: JSON.stringify({ entries: [{ id: "paper:def:test", type: "definition", name: "测试", statement: "定义...", page: 1 }] }),
    sourceText: "[[PAGE 1]] We always work with theories that satisfy these minimal conditions: ...",
    caseId: "test-case",
  });
  assert.match(prompt, /前提条件清单与命名关键性质/u);
  for (const term of ["Hopf", "Kirby", "Yasui", "Gold", "MWW", "Sard", "Bauer", "Taubes", "Skein"]) {
    assert.equal(prompt.includes(term), false, `prompt leaked ${term}`);
  }
});

test("buildVerificationPrompt instructs verbatim transcription and forbids hallucination", async () => {
  const { buildVerificationPrompt } = await import("../scripts/verify-and-patch-with-spark.mjs");
  const prompt = buildVerificationPrompt({
    consolidatedText: "{}",
    sourceText: "source",
    caseId: "c",
  });
  assert.match(prompt, /逐字转录/u);
  assert.match(prompt, /严禁增补原文没有的条件/u);
});

test("applyPatch merges补漏 entries and corrects weakened notations", async () => {
  const { applyPatch } = await import("../scripts/verify-and-patch-with-spark.mjs");
  const consolidated = {
    schema: "cmath.paper-entry-artifact/v1",
    entries: [
      { id: "paper:def:existing", type: "definition", name: "已有定义", statement: "已有", page: 1, entryClass: "fact", factKind: "definition" },
    ],
  };
  const patch = {
    addEntries: [
      { id: "paper:def:functorial-conditions", type: "definition", name: "函子条件清单", statement: "条件(1)(2)", page: 2, entryClass: "fact", factKind: "definition" },
    ],
    corrections: [
      { id: "paper:def:existing", statement: "已有（订正后更精确）" },
    ],
    removeIds: [],
  };
  const result = applyPatch(consolidated, patch);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries.find((e) => e.id === "paper:def:existing").statement, "已有（订正后更精确）");
  assert.ok(result.entries.find((e) => e.id === "paper:def:functorial-conditions"));
});
