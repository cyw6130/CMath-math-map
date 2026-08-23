import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { consolidateRawEntryPool } = require("../src/paper-import/entry/consolidation.js");

test("consolidated entries use fact/claim entryClass matching the Gold project-view convention", () => {
  const rawPool = {
    schema: "cmath.paper-raw-entry-pool/v1",
    source: { fileName: "paper.pdf", pageCount: 10, sourceText: "" },
    rawEntries: [
      { id: "paper:def:object", type: "definition", name: "对象定义", statement: "定义对象 X。", page: 1 },
      { id: "paper:algo:build", type: "algorithm", name: "构造算法", statement: "步骤一、步骤二。", page: 2 },
      { id: "paper:calc:value", type: "calculation", name: "计算结果", statement: "算得 $\\chi=2$。", page: 3 },
      { id: "paper:lem:helper", type: "lemma", name: "辅助引理", statement: "辅助断言成立。", page: 4 },
      { id: "paper:prop:mid", type: "proposition", name: "中间命题", statement: "中间断言成立。", page: 5 },
      { id: "paper:thm:main", type: "theorem", name: "主定理", statement: "主断言成立。", page: 6 }
    ]
  };

  const artifact = consolidateRawEntryPool(rawPool);
  const byId = Object.fromEntries(artifact.entries.map((e) => [e.id, e]));

  // fact family: definition / algorithm / calculation
  assert.equal(byId["paper:def:object"].entryClass, "fact", "definition must map to entryClass fact");
  assert.equal(byId["paper:def:object"].factKind, "definition");
  assert.equal(byId["paper:algo:build"].entryClass, "fact", "algorithm must map to entryClass fact");
  assert.equal(byId["paper:calc:value"].entryClass, "fact", "calculation must map to entryClass fact");

  // claim family: lemma / proposition / theorem
  assert.equal(byId["paper:lem:helper"].entryClass, "claim", "lemma must map to entryClass claim");
  assert.equal(byId["paper:lem:helper"].claimKind, "lemma");
  assert.equal(byId["paper:prop:mid"].entryClass, "claim", "proposition must map to entryClass claim");
  assert.equal(byId["paper:thm:main"].entryClass, "claim", "theorem must map to entryClass claim");
  assert.equal(byId["paper:thm:main"].claimKind, "theorem");
});
