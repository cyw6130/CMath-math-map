import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const v5 = require("../src/paper-import/canonical/v5.js");
const gateway = require("../workers/model-gateway/index.js");
const semantics = require("../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js");
globalThis.GammaMathMapSemanticsV3 = semantics;
const adapter = require("../src/math-map/canonical-math-map-adapter.js");

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

function auditBundle(map, { findings = [], operations = [] } = {}) {
  return {
    schema: "cmath.audited-patch-repair/v0.3",
    reviewedObjects: [
      ...map.entries.map(({ id }) => ({
        objectKind: "entry",
        targetId: id,
        disposition: findings.some((finding) => finding.targetIds.includes(id)) ? "finding" : "clean",
        findingId: findings.find((finding) => finding.targetIds.includes(id))?.id ?? null,
      })),
      ...map.inferences.map(({ id }) => ({
        objectKind: "inference",
        targetId: id,
        disposition: findings.some((finding) => finding.targetIds.includes(id)) ? "finding" : "clean",
        findingId: findings.find((finding) => finding.targetIds.includes(id))?.id ?? null,
      })),
    ],
    findings,
    operations,
  };
}

function providedGatewayChat(outputs, stages) {
  const handler = gateway.createGatewayHandler({
    fetchImpl: async () => new Response(JSON.stringify({
      status: "completed",
      output: [{ content: [{ type: "output_text", text: outputs.shift() }] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  return async (request) => {
    stages.push(request.stage);
    const response = await handler.fetch(new Request("https://gateway.example/api/model/complete", {
      method: "POST",
      headers: { Origin: "https://app.example", "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }), {
      OPENCODE_GO_API_KEY: "test-secret",
      MODEL_ALLOWED_ORIGINS: "https://app.example",
      MODEL_GATEWAY_ENABLED: "true",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    return body;
  };
}

test("frozen V5.2 default-atomic prompt and capability contract stay byte-stable", () => {
  assert.equal(v5.PROMPT_VERSION, "canonical-map-v5.2-zh-default-atomic-repair-v28-disposition-receipt");
  assert.equal(
    createHash("sha256").update(v5.CONTRACT_MARKDOWN).digest("hex"),
    "839193d6d622c78716aa5fc748697bfa02a7042cca41c27f61257259d381472d",
  );
  assert.equal(
    createHash("sha256").update(v5.renderGeneratePrompt("SOURCE")).digest("hex"),
    "79f9efcebfacbfaeccd7d09360cdbc3b7aa57bac699dbaa6d38d5b645ae64c98",
  );
  const emptyMap = { entries: [], inferences: [], negationPairs: [], b0ClaimEntryIds: [] };
  assert.equal(
    createHash("sha256").update(v5.renderRepairPrompt("SOURCE", emptyMap, { valid: true, error: null, formatIssues: [] })).digest("hex"),
    "a2ee339ca37e22bde9cd7008c0dcfdb75ff95d6ba000d35c9a0f486f6867c3f8",
  );
  assert.equal(
    createHash("sha256").update(v5.renderRecoveryPrompt("SOURCE", "BROKEN", "parse failed")).digest("hex"),
    "6c9c4cab98bbc5c24550b8bd8b74051c34385585d20f448ccbaebd82509cae32",
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

test("V5 audits a valid canonical map in exactly two calls", async () => {
  const calls = [];
  const map = validMap();
  const outputs = [map, auditBundle(map)];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      calls.push(request.stage);
      return { content: JSON.stringify(outputs.shift()) };
    },
  });
  assert.deepEqual(calls, ["assemble", "repair"]);
  assert.equal(result.report.generationAttempts, 1);
  assert.equal(result.report.repairAttempts, 1);
  assert.equal(result.report.repair.reason, "audit-clean");
  assert.deepEqual(result.map, validMap());
});

test("V5 accepts a 50-page marked Markdown document above the former 100k-token ceiling", async () => {
  const markedMarkdown = Array.from(
    { length: 50 },
    (_, index) => `[[PAGE ${index + 1}]]\n${"Definition theorem proof. ".repeat(220)}`,
  ).join("\n");
  const map = validMap();
  const outputs = [map, auditBundle(map)];

  const result = await v5.run({
    markedMarkdown,
    chatImpl: async () => ({ content: JSON.stringify(outputs.shift()) }),
  });

  assert.ok(result.report.inputTokens > 100_000);
  assert.equal(result.report.calls.length, 2);
});

test("new frozen workflow always uses the second call for one atomic semantic repair", async () => {
  const generated = validMap();
  const finding = {
    id: "F1",
    category: "distortion",
    objectKind: "entry",
    targetIds: ["claim:premise"],
    sourceRefs: ["PAGE 1"],
    sourceSpan: { startLine: 1, endLine: 1 },
    diagnosis: "The statement dropped a source condition.",
    repairRequirement: "Restore the source condition only.",
  };
  const repairedStatement = "P under the source condition";
  const outputs = [
    generated,
    auditBundle(generated, {
      findings: [finding],
      operations: [{
        findingId: "F1",
        op: "replaceFields",
        objectKind: "entry",
        targetId: "claim:premise",
        changes: [{ field: "statement", before: "P", after: repairedStatement }],
      }],
    }),
  ];
  const calls = [];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source condition",
    chatImpl: async (request) => {
      calls.push(request.stage);
      return { content: JSON.stringify(outputs.shift()) };
    },
  });

  assert.deepEqual(calls, ["assemble", "repair"]);
  assert.equal(result.map.entries[0].statement, repairedStatement);
  assert.equal(result.report.repairAttempts, 1);
  assert.equal(result.report.repair.selection, "patched");
});

test("V5 repairs an addressable contract error atomically in the second call", async () => {
  const calls = [];
  const generated = validMap();
  generated.inferences[0].conclusion = "missing:entry";
  const finding = {
    id: "F1",
    category: "contract",
    objectKind: "inference",
    targetIds: ["inference:organize"],
    sourceRefs: [],
    diagnosis: "The conclusion references a missing Entry.",
    repairRequirement: "Remove the unsupported inference.",
  };
  const outputs = [generated, auditBundle(generated, {
    findings: [finding],
    operations: [{ findingId: "F1", op: "remove", objectKind: "inference", targetId: "inference:organize" }],
  })];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      calls.push(request.stage);
      return { content: JSON.stringify(outputs.shift()) };
    },
  });
  assert.deepEqual(calls, ["assemble", "repair"]);
  assert.equal(result.report.repairAttempts, 1);
  assert.equal(result.map.inferences.length, 0);
});

test("V5 recovers malformed generation and applies its atomic bundle in the second call", async () => {
  const malformed = '{"entries":[{"id":"claim:premise" BROKEN]';
  let repairPrompt = "";
  const recovered = validMap();
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: async (request) => {
      if (request.stage === "assemble") return { content: malformed };
      repairPrompt = request.messages[0].content;
      return { content: JSON.stringify({ recoveredMap: recovered, ...auditBundle(recovered) }) };
    },
  });
  assert.match(repairPrompt, /claim:premise/u);
  assert.match(repairPrompt, /BROKEN/u);
  assert.match(repairPrompt, /第二次也是最后一次调用/u);
  assert.equal(result.report.repairAttempts, 1);
  assert.equal(result.report.repair.selection, "recovered-original");
});

test("CMath-provided gateway accepts both V5.2 calls on the normal audit path", async () => {
  const map = validMap();
  const stages = [];
  const progress = [];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: providedGatewayChat([JSON.stringify(map), JSON.stringify(auditBundle(map))], stages),
    onStage: (stage, info) => progress.push([stage, info.operation ?? info.phase]),
  });

  assert.deepEqual(stages, ["assemble", "repair"]);
  assert.deepEqual(progress, [
    ["generate", "generate"],
    ["repair", "audited-patch-repair"],
    ["validate", "complete"],
  ]);
  assert.deepEqual(result.report.calls.map(({ operation, publicStage, transportStage }) => (
    [operation, publicStage, transportStage]
  )), [
    ["generate", "generate", "assemble"],
    ["audited-patch-repair", "repair", "repair"],
  ]);
});

test("CMath-provided gateway accepts the V5.2 recovery and audit call as repair", async () => {
  const map = validMap();
  const stages = [];
  const progress = [];
  const result = await v5.run({
    markedMarkdown: "[[PAGE 1]] source",
    chatImpl: providedGatewayChat([
      '{"entries":[BROKEN',
      JSON.stringify({ recoveredMap: map, ...auditBundle(map) }),
    ], stages),
    onStage: (stage, info) => progress.push([stage, info.operation ?? info.phase]),
  });

  assert.deepEqual(stages, ["assemble", "repair"]);
  assert.deepEqual(progress, [
    ["generate", "generate"],
    ["repair", "recovery-and-audited-patch"],
    ["validate", "complete"],
  ]);
  assert.equal(result.report.repair.selection, "recovered-original");
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
