import assert from "node:assert/strict";
import test from "node:test";

test("buildB0BackfillPrompt exists, is zero-leakage, and demands cited-external standalone entries", async () => {
  const { buildB0BackfillPrompt } = await import("../scripts/verify-and-patch-with-spark.mjs");
  const prompt = buildB0BackfillPrompt({
    consolidatedText: JSON.stringify({ entries: [{ id: "paper:def:x", type: "definition", name: "x", statement: "x", page: 1 }] }),
    sourceText: "[[PAGE 1]] By a result of Someone [12], the invariant does not vanish...",
    caseId: "c",
  });
  // Cited-external detection instruction present
  assert.match(prompt, /引用标记/u);
  assert.match(prompt, /external:\s*true/u);
  assert.match(prompt, /sourceReference/u);
  // Zero leakage
  for (const term of ["Hopf", "Kirby", "Yasui", "Gold", "MWW", "Skein", "Bauer", "Taubes", "Froyshov"]) {
    assert.equal(prompt.includes(term), false, `leaked ${term}`);
  }
});

test("applyPatch is idempotent: re-applying same patch yields identical artifact", async () => {
  const { applyPatch } = await import("../scripts/verify-and-patch-with-spark.mjs");
  const base = {
    schema: "cmath.paper-entry-artifact/v1",
    entries: [{ id: "paper:def:a", type: "definition", name: "a", statement: "A", page: 1, entryClass: "fact", factKind: "definition" }],
  };
  const patch = {
    addEntries: [
      { id: "paper:ext:cited-theorem", type: "theorem", name: "被引定理", statement: "外部结论。", page: 2, entryClass: "claim", claimKind: "theorem", external: true, sourceReference: "[12]" },
    ],
    corrections: [],
    removeIds: [],
  };
  const once = applyPatch(base, patch);
  const twice = applyPatch(once, patch);
  assert.deepEqual(twice, once, "applyPatch must be idempotent");
});
