import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const client = require("../paper-import-client.js");

function modelResponse(payload) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  };
}

test("production semantic pipeline runs Entry → consolidate → W7.1 → W8 → Inference → Closure", async () => {
  const calls = [];
  const stages = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    const prompt = body.messages?.[0]?.content ?? "";
    calls.push({ url, init, body, prompt });

    if (prompt.includes("Foundation Entries")) {
      return modelResponse({
        foundationEntries: [
          { id: "def:space", type: "definition", name: "空间", statement: "$X$。", page: 1 },
        ],
        resultEntries: [
          { id: "thm:main", type: "theorem", name: "主定理", statement: "$T$。", page: 2 },
          { id: "paper:bad", type: "theorem", name: "幻觉条目", statement: "$H$。", page: 2 },
        ],
        inferenceHints: [],
      });
    }
    if (prompt.includes("当前任务：B0 外部定理定向补漏")) {
      assert.match(prompt, /paper:def:condition/u, "W8 must consume the W7.1-patched artifact");
      assert.match(prompt, /按原文订正/u, "W8 must see W7.1 corrections");
      assert.doesNotMatch(prompt, /mainTarget|Review/u, "W8 must not gain rules absent from the laboratory prompt");
      return modelResponse({
        addEntries: [{
          id: "paper:ext:cited",
          entryClass: "claim",
          claimKind: "theorem",
          name: "被引定理",
          statement: "$E$。",
          page: 2,
          external: true,
          sourceReference: "[12]",
        }],
        corrections: [],
        removeIds: [],
      });
    }
    if (prompt.includes("实质性数学性质/对应关系")) {
      return modelResponse({
        addEntries: [{
          id: "paper:def:condition",
          entryClass: "fact",
          factKind: "definition",
          name: "条件",
          statement: "$X$ 满足条件。",
          page: 1,
        }],
        corrections: [{ id: "thm:main", statement: "$T$（按原文订正）。" }],
        removeIds: ["paper:bad"],
      });
    }
    return modelResponse({
      projectTitle: "生产语义链测试论文",
      mainTargetEntryId: "thm:main",
      b0: ["paper:ext:cited"],
      inferences: [{
        operationKind: "proof",
        premises: ["def:space"],
        conclusion: "thm:main",
        argument: "由定义得到。",
        page: 2,
      }],
    });
  };

  const view = await client.requestPaperProductionSemanticPipeline({
    endpoint: "https://example.invalid/v1",
    apiKey: "secret-key",
    model: "same-model",
    providerLabel: "same-provider",
    reasoningEffort: "high",
    fileName: "production.md",
    pageCount: 2,
    markedMarkdown: "[[PAGE 1]]\n定义 X。\n[[PAGE 2]]\n主定理与引用 [12]。",
    fetchImpl,
    onStage: (stage) => stages.push(stage),
  });

  const expected = ["entry", "consolidate", "w7-verify", "w8-b0", "inference", "closure"];
  const firstIndex = (stage) => stages.indexOf(stage);
  for (let index = 0; index < expected.length; index += 1) {
    assert.notEqual(firstIndex(expected[index]), -1, `${expected[index]} stage is required`);
    if (index > 0) assert.ok(firstIndex(expected[index - 1]) < firstIndex(expected[index]), `${expected[index - 1]} must precede ${expected[index]}`);
  }

  assert.equal(view.mainTargetEntryId, "thm:main");
  assert.ok(view.entries.some((entry) => entry.id === "paper:def:condition"));
  assert.ok(view.entries.some((entry) => entry.id === "paper:ext:cited"));
  assert.equal(view.entries.some((entry) => entry.id === "paper:bad"), false);
  assert.equal(view.derivedResearchState.mathematicalState.b0ClaimEntryIds[0], "paper:ext:cited");
  assert.equal(view.entries.find((entry) => entry.id === "paper:ext:cited").entryClass, "claim");
  assert.equal(view.entries.find((entry) => entry.id === "paper:ext:cited").claimKind, "theorem");

  const expectedUrl = "https://example.invalid/v1/chat/completions";
  assert.ok(calls.length >= 4);
  for (const call of calls) {
    assert.equal(call.url, expectedUrl);
    assert.equal(call.body.model, "same-model");
    assert.equal(call.body.reasoning_effort, "high");
    assert.equal(call.init.headers.Authorization, "Bearer secret-key");
  }
  const w7Call = calls.find((call) => call.prompt.includes("实质性数学性质/对应关系"));
  const w8Call = calls.find((call) => call.prompt.includes("当前任务：B0 外部定理定向补漏"));
  assert.ok(w7Call && w8Call);
  assert.match(w7Call.prompt, /entryClass.*fact\|claim/u);
  assert.match(w7Call.prompt, /factKind.*definition\|algorithm\|calculation/u);
  assert.match(w7Call.prompt, /claimKind.*lemma\|proposition\|theorem/u);
  assert.match(w7Call.prompt, /严禁输出 type/u);
  assert.match(w8Call.prompt, /sourceReference/u);
});

test("production semantic pipeline is browser-safe at its public boundary", () => {
  assert.equal(typeof client.requestPaperProductionSemanticPipeline, "function");
});
