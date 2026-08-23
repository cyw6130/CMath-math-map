import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");

function writeTempJson(name, obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sol-inline-test-"));
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

const goldObj = {
  schema: "cmath.project-view-model/v0.1",
  project: { id: "cmath:project:paper:test-case", title: "测试论文" },
  channelOptions: { ui: "bloat".repeat(500) },
  entries: [
    { id: "paper:def:main-object", entryClass: "fact", factKind: "definition", title: "核心对象定义", statement: "对象 X 满足性质 P。", sourcePath: "paper.pdf#page=1" },
    { id: "paper:thm:main-theorem", entryClass: "claim", claimKind: "theorem", title: "主定理", statement: "若 X 满足 P，则结论 Q 成立。", sourcePath: "paper.pdf#page=3" }
  ],
  inferences: []
};

const candidateObj = {
  schema: "cmath.paper-raw-entry-pool/v1",
  source: { fileName: "paper.pdf", pageCount: 10, sourceText: "FULL TEXT BLOAT ".repeat(2000) },
  chunks: [{ text: "CHUNK BLOAT ".repeat(1000) }],
  diagnostics: { stages: [{ debug: "x".repeat(5000) }] },
  rawEntries: [
    { id: "paper:def:main-object", type: "definition", name: "核心对象定义", statement: "对象 X 满足性质 P。", page: 1 },
    { id: "paper:thm:main-theorem", type: "theorem", name: "主定理", statement: "若 X 满足 P，则结论 Q 成立。", page: 3 },
    { id: "paper:lemma:extra", type: "lemma", name: "附加引理", statement: "辅助结论 R。", page: 5 },
    { id: "paper:def:aux", type: "definition", name: "辅助定义", statement: "辅助对象 Y。", page: 2 },
    { id: "paper:thm:aux2", type: "theorem", name: "辅助定理", statement: "辅助结论 S。", page: 6 }
  ],
  inferenceHints: []
};

test("dry-run rendered prompt inlines slim gold/candidate/schema and forbids tool use", async () => {
  const goldPath = writeTempJson("gold.json", goldObj);
  const candidatePath = writeTempJson("candidate.json", candidateObj);

  const result = await scorer.scorePaperEntryExtraction({
    goldPath,
    candidatePath,
    dryRun: true,
  });

  assert.ok(result.renderedPrompt, "dry-run must expose renderedPrompt");

  const p = result.renderedPrompt;

  // 1. Gold and candidate data must be INLINED (no file-reading instructions)
  assert.match(p, /paper:def:main-object/u, "gold entry id must be inlined in prompt");
  assert.match(p, /paper:thm:main-theorem/u, "candidate entry id must be inlined in prompt");
  assert.doesNotMatch(p, /Gold Reference Artifact: `\./u, "must not reference gold as an external file");
  assert.doesNotMatch(p, /Candidate Entry Extraction Artifact: `\./u, "must not reference candidate as an external file");

  // 2. Explicit no-tools / single-turn instruction
  assert.match(p, /do not use any tools/iu);
  assert.match(p, /single response/iu);

  // 3. Bloat must be stripped from inlined payloads
  assert.doesNotMatch(p, /FULL TEXT BLOAT/u, "candidate sourceText bloat must be stripped");
  assert.doesNotMatch(p, /CHUNK BLOAT/u, "chunk text bloat must be stripped");
  assert.doesNotMatch(p, /"ui": "bloatbloat/u, "gold channelOptions bloat must be stripped");
});
