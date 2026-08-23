import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { consolidateRawEntryPool } = require("../src/paper-import/entry/consolidation.js");

test("consolidation never emits duplicate final entry IDs even when canonical keys diverge", () => {
  const rawPool = {
    schema: "cmath.paper-raw-entry-pool/v1",
    source: { fileName: "paper.pdf", pageCount: 25, sourceText: "" },
    rawEntries: [
      // A: name carries the number -> canonical key "definition:7.2"
      { id: "paper:def:modular-hopf-algebra", type: "definition", name: "定义 7.2", statement: "模 Hopf 代数的完整定义陈述，含全部公理条件与可逆性要求，内容较长更完整。", page: 20 },
      // B: same id, no number anywhere -> falls through to raw-id key
      { id: "paper:def:modular-hopf-algebra", type: "definition", name: "modular Hopf algebra", statement: "较短的重复版本。", page: 21 },
      // C: distinct id, distinct number
      { id: "paper:thm:main", type: "theorem", name: "定理 6.3", statement: "主定理。", page: 15 }
    ]
  };

  const artifact = consolidateRawEntryPool(rawPool);
  const ids = artifact.entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `final entries must have unique IDs, got: ${JSON.stringify(ids)}`);
  // The longer/more complete duplicate should win
  const winner = artifact.entries.find((e) => e.id === "paper:def:modular-hopf-algebra");
  assert.ok(winner.statement.includes("完整定义"), "the more complete duplicate variant should be kept");
});
