import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const v5 = require("../src/paper-import/canonical/v5.js");
const semantics = require("../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js");
globalThis.GammaMathMapSemanticsV3 = semantics;
const adapter = require("../canonical-math-map-adapter.js");

function validMap() {
  return {
    entries: [
      { id: "claim:premise", entryClass: "claim", claimKind: "lemma", title: "Premise", statement: "P" },
      { id: "fact:def", entryClass: "fact", factKind: "definition", title: "Definition", statement: "D" },
    ],
    inferences: [{
      id: "inference:organize",
      operationKind: "organization",
      premises: ["claim:premise"],
      conclusion: "fact:def",
      argument: "The source uses P to organize D.",
    }],
    negationPairs: [],
    b0ClaimEntryIds: ["claim:premise"],
  };
}

test("frozen V5.1 Chinese-default prompt and capability contract stay byte-stable", () => {
  assert.equal(v5.PROMPT_VERSION, "canonical-map-v5.1-zh-default-fidelity-with-complete-dependencies");
  assert.equal(
    createHash("sha256").update(v5.CONTRACT_MARKDOWN).digest("hex"),
    "839193d6d622c78716aa5fc748697bfa02a7042cca41c27f61257259d381472d",
  );
  assert.equal(
    createHash("sha256").update(v5.renderGeneratePrompt("SOURCE")).digest("hex"),
    "180218ed61f2b9618b57f6abe2dd2de3c9d0ecb5386c2db3dda301b8f2796d77",
  );
  assert.doesNotMatch(v5.renderGeneratePrompt("SOURCE"), /反证法必须拆出/u);
});

test("website workflow defaults mathematical map content to Simplified Chinese", () => {
  const generatePrompt = v5.renderGeneratePrompt("SOURCE");
  const repairPrompt = v5.renderRepairPrompt("SOURCE", validMap(), "INVALID");
  for (const prompt of [generatePrompt, repairPrompt]) {
    assert.match(prompt, /Entry\.title、Entry\.statement 与 Inference\.argument 默认使用准确、自然的简体中文/u);
    assert.match(prompt, /数学公式、符号、变量、标准专名与必要英文缩写按来源保留/u);
    assert.match(prompt, /不得改变命题条件、量词、逻辑方向或数学术语含义/u);
  }
});

test("V5 makes one generation call when the canonical map is valid", async () => {
  const calls = [];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      calls.push(request.stage);
      return { content: JSON.stringify(validMap()) };
    },
  });
  assert.deepEqual(calls, ["assemble"]);
  assert.equal(result.report.generationAttempts, 1);
  assert.equal(result.report.repairAttempts, 0);
  assert.deepEqual(result.map, validMap());
});

test("V5 repairs an invalid canonical shape at most twice", async () => {
  const calls = [];
  const outputs = [
    { ...validMap(), extra: true },
    { ...validMap(), extra: true },
    validMap(),
  ];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      calls.push(request.stage);
      return { content: JSON.stringify(outputs.shift()) };
    },
  });
  assert.deepEqual(calls, ["assemble", "repair", "repair"]);
  assert.equal(result.report.repairAttempts, 2);
});

test("V5 preserves malformed generation text for targeted JSON repair", async () => {
  const malformed = '{"entries":[{"id":"claim:premise" BROKEN]';
  let repairPrompt = "";
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      if (request.stage === "assemble") return { content: malformed };
      repairPrompt = request.messages[0].content;
      return { content: JSON.stringify(validMap()) };
    },
  });
  assert.match(repairPrompt, /claim:premise/u);
  assert.match(repairPrompt, /BROKEN/u);
  assert.equal(result.report.repairAttempts, 1);
});

test("canonical adapter accepts v3 organization with a Claim premise", () => {
  const model = adapter.create(validMap(), { title: "Canonical" });
  const layout = model.layoutThrough(0);
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.length, 2);
  assert.equal(model.project.title, "Canonical");
});

test("canonical adapter uses the math-map-naming-v2 board-name contract", () => {
  const model = adapter.create(validMap(), { title: "Canonical", projectId: "canonical:test" });
  const namesById = Object.fromEntries(model.layoutThrough(0).nodes.map((node) => [node.id, node.displayName]));
  assert.equal(namesById["fact:def"], "定义 · 1 · Definition");
  assert.equal(namesById["claim:premise"], "引理 · 1 · Premise");
  assert.equal(namesById["inference:organize"], "组织 · 1 · Definition");
});

test("canonical adapter removes leading source ordinals from mathematical short titles", () => {
  const map = validMap();
  map.entries[0].title = "(3.1) Vertex versus hole in clean graph";
  map.entries[1].title = "(7).1 Attachment sets";
  const model = adapter.create(map, { title: "Canonical", projectId: "canonical:numbered-source" });
  const namesById = Object.fromEntries(model.layoutThrough(0).nodes.map((node) => [node.id, node.displayName]));
  assert.equal(namesById["claim:premise"], "引理 · 1 · Vertex versus hole in clean graph");
  assert.equal(namesById["fact:def"], "定义 · 1 · Attachment sets");
  assert.equal(namesById["inference:organize"], "组织 · 1 · Attachment sets");
  assert.equal(map.entries[0].title, "(3.1) Vertex versus hole in clean graph");
  assert.equal(map.entries[1].title, "(7).1 Attachment sets");
});
