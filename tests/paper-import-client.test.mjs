import assert from "node:assert/strict";
import test from "node:test";

import paperImportClient from "../paper-import-client.js";
import previewLoader from "../generic-math-map-preview-loader.js";
import contentLoader from "../math-map-content-loader.js";
import projectAdapter from "../math-map-project-adapter.js";
import visualSemantics from "../math-map-visual-semantics.js";

const rawMap = {
  projectTitle: "A Paper",
  mainTargetEntryId: "paper:theorem:y",
  b0ClaimEntryIds: [],
  entries: [
    { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "Definition of X", statement: "$X$ is fixed.", sourceLocator: "paper.pdf#page=1" },
    { id: "paper:theorem:y", entryClass: "claim", claimKind: "theorem", shortTitle: "Y", title: "Theorem Y", statement: "$X$ implies $Y$.", sourceLocator: "paper.pdf#page=2" },
    { id: "paper:proposition:z", entryClass: "claim", claimKind: "proposition", shortTitle: "Z", title: "Proposition Z", statement: "$Z$ remains to be proved.", sourceLocator: "paper.pdf#page=2" },
  ],
  inferences: [
    { id: "paper:proof:y", operationKind: "proof", shortTitle: "Proof of Y", title: "Proof of Theorem Y", statement: "Apply the definition.", premises: ["paper:definition:x"], conclusion: "paper:theorem:y", argument: "The defining property gives $Y$.", sourceLocator: "paper.pdf#page=2" },
  ],
};

// ── Frozen Workflow V4.1 测试基础设施 ──
// 抽取窗口响应体（pool v1.31 dual-output：三个数组必须存在）。
function dualOutputPayload({ foundation = [], result = [], hints = [] } = {}) {
  return { foundationEntries: foundation, resultEntries: result, inferenceHints: hints };
}
function respOf(content) {
  return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) };
}
// 全链路 mock：含 "Foundation Entries" 标记的调用按抽取窗口消费 dual-output，
// 其余调用按顺序消费 later 中脚本化的装配 rawMap 对象（耗尽后重复最后一个）。
function makePipelineFetch({ extractPayload = null, later = [], onCall = null } = {}) {
  const state = { calls: [] };
  let idx = 0;
  const impl = async (url, options) => {
    const body = JSON.parse(options.body);
    const content = body.messages?.[0]?.content ?? "";
    state.calls.push({ url, options, content });
    onCall?.(state.calls.length, body, content);
    if (content.includes("Foundation Entries")) {
      return respOf(JSON.stringify(extractPayload ?? dualOutputPayload({
        result: [{ id: "thm:main", type: "theorem", name: "主定理", statement: "$\\phi$ 是同构。", page: 1 }],
      })));
    }
    const scripted = later.length ? later[Math.min(idx, later.length - 1)] : { unexpected: true };
    idx += 1;
    return respOf(JSON.stringify(scripted));
  };
  return { impl, state };
}
// 直调 Inference 装配用的最小 Entry artifact（确定性整合阶段的产物形态）。
function makeEntryArtifact({ fileName = "paper.pdf", pageCount = 1, sourceText = "paper text", entries }) {
  return {
    schema: "cmath.paper-entry-artifact/v1",
    consolidationModuleVersion: "paper-entry-consolidation-v1",
    source: { fileName, pageCount, characters: sourceText.length, sourceText },
    entries,
    inferenceHints: [],
  };
}

test("normalizes secure OpenAI-compatible endpoints", () => {
  assert.equal(paperImportClient.endpointUrl("https://api.deepseek.com/v1"), "https://api.deepseek.com/v1/chat/completions");
  assert.equal(paperImportClient.endpointUrl("https://api.deepseek.com/v1/chat/completions"), "https://api.deepseek.com/v1/chat/completions");
  assert.equal(paperImportClient.endpointUrl("https://api.moonshot.cn/v1"), "https://api.moonshot.cn/v1/chat/completions");
  assert.throws(() => paperImportClient.endpointUrl("http://api.deepseek.com/v1"), /HTTPS/u);
});
test("extracts page-located text with an injected PDF.js implementation", async () => {
  let destroyed = false;
  const file = { size: 12, arrayBuffer: async () => new ArrayBuffer(12) };
  const pdfjsLib = {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: async (page) => ({ getTextContent: async () => ({ items: [{ str: `Page ${page}`, hasEOL: true }, { str: "text" }] }) }),
        destroy: async () => { destroyed = true; },
      }),
    }),
  };
  const result = await paperImportClient.extractPdfText(file, { pdfjsLib });
  assert.match(result.text, /\[\[PAGE 1\]\]\nPage 1\ntext/u);
  assert.match(result.text, /\[\[PAGE 2\]\]/u);
  assert.equal(result.pageCount, 2);
  assert.equal(destroyed, true);
});

test("builds a Gamma-native paper Project View with formal map objects", () => {
  const view = paperImportClient.paperProjectView(rawMap, { fileName: "paper.pdf" });
  assert.equal(view.schema, "cmath.project-view-model/v0.1");
  assert.equal(view.semanticModel, "cmath.fact-claim-operation/v0.1");
  assert.equal(view.entries.length, 3);
  assert.equal(view.inferences[0].operationKind, "proof");
  assert.equal("candidateEntries" in view, false);
  assert.equal("candidateInferences" in view, false);
  assert.equal(view.derivedResearchState.researchOverlay.loopTargetEntryId, "paper:theorem:y");
  assert.equal(view.mainTargetEntryId, "paper:theorem:y");
});

test("derives open and established Claim visuals through existing capabilities", () => {
  const view = paperImportClient.paperProjectView(rawMap, { fileName: "paper.pdf" });
  const prepared = previewLoader.prepare(view, { loader: contentLoader, adapter: projectAdapter });
  assert.equal(prepared.definition.projectId, view.project.id);
  assert.deepEqual(prepared.model.classificationDiagnostics.issues, []);
  assert.deepEqual(prepared.model.factEntryIds, ["paper:definition:x"]);
  assert.deepEqual(prepared.model.claimEntryIds, ["paper:theorem:y", "paper:proposition:z"]);
  assert.deepEqual(prepared.model.claimStatesThrough(0), {
    "paper:theorem:y": "established",
    "paper:proposition:z": "open",
  });

  const nodes = new Map(prepared.model.layoutThrough(0).nodes.map((node) => [node.id, node]));
  assert.equal(visualSemantics.classifyNode(nodes.get("paper:theorem:y")).claimState, "established");
  assert.equal(visualSemantics.classifyNode(nodes.get("paper:proposition:z")).claimState, "open");
  assert.equal(visualSemantics.LEGEND_ITEMS.find((item) => item.id === "claim-established").treatment, "filled");
  assert.equal(visualSemantics.LEGEND_ITEMS.find((item) => item.id === "claim-open").treatment, "ring");
});

test("auto-generates missing inference identifiers and display labels deterministically", () => {
  const rawWithMissingFields = {
    projectTitle: "Minimal Paper",
    mainTargetEntryId: "e2",
    entries: [
      { id: "e1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Let $x \\in X$.", sourceLocator: "paper.pdf#page=1" },
      { id: "e2", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "$x$ is unique.", sourceLocator: "paper.pdf#page=2" },
    ],
    inferences: [
      {
        operationKind: "proof",
        premises: ["e1"],
        conclusion: "e2",
        argument: "By definition, uniqueness holds directly.",
        sourceLocator: "paper.pdf#page=2",
      },
    ],
  };

  const view = paperImportClient.paperProjectView(rawWithMissingFields, { fileName: "minimal.pdf" });
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
  assert.equal(view.inferences[0].id, "paper:inference:proof:1");
  assert.equal(view.inferences[0].displayLabel, "证明 · 1 · Thm 1");
  assert.equal(view.inferences[0].shortTitle, "证明 · Thm 1");
  assert.equal(view.inferences[0].statement, "By definition, uniqueness holds directly.");
  assert.equal(view.inferences[0].sourcePath, "paper.pdf#page=2");
  assert.equal(view.entries[0].displayLabel, "定义 · 1 · Def 1");
  assert.equal(view.entries[1].displayLabel, "定理 · 1 · Thm 1");
});

test("avoids ID collisions when generating default inference identifiers", () => {
  const rawWithCollision = {
    projectTitle: "Collision Paper",
    mainTargetEntryId: "e2",
    entries: [
      { id: "paper:inference:proof:1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Let $x \\in X$.", sourceLocator: "paper.pdf#page=1" },
      { id: "e2", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "$x$ is unique.", sourceLocator: "paper.pdf#page=2" },
    ],
    inferences: [
      {
        operationKind: "proof",
        premises: ["paper:inference:proof:1"],
        conclusion: "e2",
        argument: "By definition, uniqueness holds directly.",
        sourceLocator: "paper.pdf#page=2",
      },
    ],
  };

  const view = paperImportClient.paperProjectView(rawWithCollision, { fileName: "collision.pdf" });
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
  assert.equal(view.inferences[0].id, "paper:inference:proof:2");
});

test("fails closed when Entry.id, Entry.sourceLocator, or Inference.sourceLocator is missing", () => {
  const missingEntryId = {
    projectTitle: "Bad Entry",
    mainTargetEntryId: "e2",
    entries: [{ entryClass: "fact", factKind: "definition", title: "D", statement: "S", sourceLocator: "p#1" }],
    inferences: [],
  };
  assert.throws(() => paperImportClient.paperProjectView(missingEntryId), /entries\[0\]\.id 必须是非空文本/u);

  const missingEntryLocator = {
    projectTitle: "Bad Entry",
    mainTargetEntryId: "e1",
    entries: [{ id: "e1", entryClass: "fact", factKind: "definition", title: "D", statement: "S" }],
    inferences: [],
  };
  assert.throws(() => paperImportClient.paperProjectView(missingEntryLocator), /e1\.sourceLocator 必须是非空文本/u);

  const missingInferenceLocator = {
    projectTitle: "Bad Inference Locator",
    mainTargetEntryId: "e2",
    entries: [
      { id: "e1", entryClass: "fact", factKind: "definition", title: "D", statement: "S", sourceLocator: "p#1" },
      { id: "e2", entryClass: "claim", claimKind: "theorem", title: "T", statement: "S", sourceLocator: "p#2" },
    ],
    inferences: [
      { operationKind: "proof", premises: ["e1"], conclusion: "e2", argument: "Arg" },
    ],
  };
  assert.throws(() => paperImportClient.paperProjectView(missingInferenceLocator), /sourceLocator 必须是非空文本/u);
});

test("fails closed when organization connects a Claim or proof concludes a Fact", () => {
  const invalidOrg = {
    projectTitle: "Invalid Org Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Fact 1", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "lemma", title: "Lemma 1", statement: "Claim 1", sourceLocator: "p#1" },
    ],
    inferences: [
      { operationKind: "organization", premises: ["f1"], conclusion: "c1", argument: "Organizing", sourceLocator: "p#1" },
    ],
  };
  assert.throws(() => paperImportClient.paperProjectView(invalidOrg), /organization 必须是 Fact 到 Fact/u);

  const invalidProof = {
    projectTitle: "Invalid Proof Paper",
    mainTargetEntryId: "f1",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Fact 1", sourceLocator: "p#1" },
    ],
    inferences: [
      { operationKind: "proof", premises: ["f1"], conclusion: "f1", argument: "Proving a fact", sourceLocator: "p#1" },
    ],
  };
  assert.throws(() => paperImportClient.paperProjectView(invalidProof), /proof 必须以 Claim 为结论/u);
});

test("rejects broken inference references", () => {
  const broken = structuredClone(rawMap);
  broken.inferences[0].premises = ["missing"];
  assert.throws(() => paperImportClient.paperProjectView(broken), /不存在的 premise/u);
});

test("sends the key only in the authorization header and parses the model result", async () => {
  const { impl, state } = makePipelineFetch({ later: [rawMap] });
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test",
    model: "deepseek-chat",
    fileName: "paper.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition\n[[PAGE 2]]\nTheorem",
    fetchImpl: impl,
  });
  // 冻结管线：抽取窗口 + 装配各至少一次；装配 URL 是标准的 endpoint join
  assert.ok(state.calls.length >= 2);
  const assemble = state.calls[1];
  assert.equal(assemble.url, "https://api.deepseek.com/v1/chat/completions");
  for (const call of state.calls) {
    assert.equal(call.options.headers.Authorization, "Bearer test");
    assert.doesNotMatch(call.url, /Bearer test/u);
    assert.doesNotMatch(call.options.body, /Bearer test/u);
  }
  assert.doesNotMatch(JSON.stringify(view), /Bearer test/u);
  assert.equal(view.project.title, "A Paper");
});

test("sends Kimi K3 through the Moonshot preset without leaking the API key", async () => {
  const { impl, state } = makePipelineFetch({ later: [rawMap] });
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.moonshot.cn/v1",
    apiKey: "test",
    model: "kimi-k3",
    providerLabel: "Kimi",
    fileName: "paper.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition\n[[PAGE 2]]\nTheorem",
    fetchImpl: impl,
  });
  const assemble = state.calls[1];
  assert.equal(assemble.url, "https://api.moonshot.cn/v1/chat/completions");
  assert.equal(assemble.options.headers.Authorization, "Bearer test");
  assert.equal(JSON.parse(assemble.options.body).model, "kimi-k3");
  for (const call of state.calls) {
    assert.doesNotMatch(call.url, /Bearer test/u);
    assert.doesNotMatch(call.options.body, /Bearer test/u);
  }
  assert.doesNotMatch(JSON.stringify(view), /Bearer test/u);
});

test("returns structural failures to the model for a targeted repair round", async () => {
  let callCount = 0;
  const observedMessages = [];
  const goodMap = {
    projectTitle: "Draft Paper",
    mainTargetEntryId: "e2",
    b0ClaimEntryIds: [],
    inferences: [{ operationKind: "proof", premises: ["e1"], conclusion: "e2", argument: "Arg", sourceLocator: "p#2" }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    // 第一次装配输出不含任何可用的结构字段
    return respOf(JSON.stringify(callCount === 1 ? { unexpected: true } : goodMap));
  };
  const artifact = makeEntryArtifact({
    fileName: "retry-test.pdf",
    sourceText: "Some paper text",
    entries: [
      { id: "e1", entryClass: "fact", factKind: "definition", name: "Def 1", statement: "Def", page: 1 },
      { id: "e2", entryClass: "claim", claimKind: "theorem", name: "Thm 1", statement: "Thm", page: 2 },
    ],
  });

  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact,
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fetchImpl,
  });

  // 结构坏输出 + 定点修复各一次：装配循环之外没有任何其他模型调用
  assert.equal(callCount, 2);
  // 修复调用把模型上一次输出和问题清单一并返还（3 条消息：原 prompt、坏输出、问题清单）
  assert.equal(observedMessages[1].length, 3);
  assert.equal(observedMessages[1][0].role, "user");
  assert.equal(observedMessages[1][1].role, "assistant");
  assert.equal(observedMessages[1][2].role, "user");
  assert.match(observedMessages[1][2].content, /存在以下问题/u);
  assert.match(observedMessages[1][2].content, /未输出 projectTitle/u);
  assert.equal(view.mainTargetEntryId, "e2");
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
  assert.equal(view.inferences[0].conclusion, "e2");
});

test("does not retry on HTTP errors and fails closed on repeated schema error", async () => {
  const artifact = makeEntryArtifact({
    // 目录只有 Fact：模型始终不输出结构字段时，兜底修复也无法造出合法主目标
    entries: [{ id: "f1", entryClass: "fact", factKind: "definition", name: "Def", statement: "$D$。", page: 1 }],
  });
  const baseArgs = { artifact, endpoint: "https://api.deepseek.com/v1", apiKey: "key", model: "deepseek-chat" };

  let httpCalls = 0;
  const httpErrorFetch = async () => {
    httpCalls += 1;
    return { ok: false, status: 500, text: async () => "boom" };
  };
  await assert.rejects(
    () => paperImportClient.requestPaperInferenceFromEntryArtifact({ ...baseArgs, fetchImpl: httpErrorFetch }),
    /HTTP 500/u,
  );
  assert.equal(httpCalls, 1); // No retry for HTTP error

  let persistentBadCount = 0;
  const persistentBadFetch = async () => {
    persistentBadCount += 1;
    return respOf(JSON.stringify({ unexpected: true }));
  };
  await assert.rejects(
    () => paperImportClient.requestPaperInferenceFromEntryArtifact({ ...baseArgs, fetchImpl: persistentBadFetch }),
    /论文导入失败/u,
  );
  // 装配循环最多 INFERENCE_MAX_ROUNDS（默认 4）轮后显式放弃，不无限重试
  assert.equal(persistentBadCount, Number(process.env.INFERENCE_MAX_ROUNDS || 4));
});

test("prompts include explicit proof-to-Claim and Fact/Claim boundaries", () => {
  const entriesPrompt = paperImportClient.entriesPrompt({
    fileName: "geometry.pdf",
    pageCount: 5,
    text: "Theorem 1.1: Let X be smooth...",
  });
  const assemblyPrompt = paperImportClient.assemblyPrompt({
    fileName: "geometry.pdf",
    pageCount: 5,
    text: "Theorem 1.1: Let X be smooth...",
    catalog: "- paper:thm:1｜theorem｜示例定理",
  });

  // (1) proof concludes only an entryClass=claim Entry
  assert.match(assemblyPrompt, /proof 的结论（conclusion）只能是 entryClass=claim 的 Entry/u);
  // (2) definition/algorithm/calculation are Facts and cannot be proof conclusions
  assert.match(assemblyPrompt, /definition\/algorithm\/calculation 属于 Fact，绝不能作为 proof 的结论/u);
  // (3) if the paper proves a named lemma/proposition/theorem, extract that statement as a Claim and point the proof to it
  assert.match(assemblyPrompt, /若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim/u);
  // (4) if a supposed relation concludes a Fact, omit that relation unless it is an actual Fact-to-Fact organization relation
  assert.match(assemblyPrompt, /若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系/u);
  // (5) do not encode derivation, relatedness, reading order, or section flow as Inference
  assert.match(assemblyPrompt, /严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference/u);
  // (6) entries prompt prefers completeness of explicit/named mathematical objects and external invoked results
  assert.doesNotMatch(entriesPrompt, /最多 20 个 Entry/u);
  assert.match(entriesPrompt, /完整提取本段中所有明确编号或命名的 definition、algorithm、calculation、lemma、proposition、theorem/u);
  // (7) requires mainTargetEntryId
  assert.match(assemblyPrompt, /mainTargetEntryId/u);
  // (8) strengthened B0 instruction: inventory external results without inventing book pages
  assert.match(entriesPrompt, /论证实际调用的外部结果/u);
  assert.match(entriesPrompt, /严禁臆造外部书籍的具体页码/u);
  // (9) compact schema: model outputs type/num/name, system generates the display label
  assert.match(entriesPrompt, /"num"/u);
  assert.match(entriesPrompt, /"name"/u);
  assert.match(assemblyPrompt, /自足证明允许 premises=\[\].*argument 必须记录完整数学论证/u);
  assert.match(assemblyPrompt, /互推 proof 可表达等价或相互蕴含.*没有已建立的外部入口.*不会建立其中任何 Claim/u);
});

test("v3.44 strategy states the canonical proof, cycle, and B0 boundaries", () => {
  const prompt = paperImportClient.assemblyPrompt({
    fileName: "geometry.pdf",
    pageCount: 5,
    text: "Theorem 1.1: Let X be smooth...",
    catalog: "- paper:thm:1｜claim｜示例定理",
    workflowVersion: "v3.44",
  });

  assert.match(prompt, /【V3\.44 Canonical Inference 语义】/u);
  assert.match(prompt, /自足 proof 允许 premises=\[\].*argument.*完整数学论证.*不是 B0/u);
  assert.match(prompt, /Claim 间的循环 proof 必须保留.*Closure.*open/u);
  assert.match(prompt, /B0 仅包含论文直接调用、且未在正文证明的外部 Claim.*Fact 永不进入 B0/u);
});

test("returns proof-to-Fact violations to the model and applies the targeted fix", async () => {
  let callCount = 0;
  const observedMessages = [];
  const observedAuth = [];
  const stageLog = [];

  // 装配阶段输出了一条以 Fact 为结论的 proof（违规），修复轮改正为 organization
  const badAssembly = {
    projectTitle: "Topological Invariants",
    mainTargetEntryId: "paper:claim:euler",
    b0: [],
    inferences: [
      { type: "proof", premises: ["paper:def:manifold"], conclusion: "paper:fact:calc", argument: "由定义直接计算。", page: 2 },
      { type: "proof", premises: ["paper:def:manifold", "paper:fact:calc"], conclusion: "paper:claim:euler", argument: "曲率积分。", page: 2 },
    ],
  };
  const fixedAssembly = {
    projectTitle: "Topological Invariants",
    mainTargetEntryId: "paper:claim:euler",
    b0: [],
    inferences: [
      { type: "organization", premises: ["paper:def:manifold"], conclusion: "paper:fact:calc", argument: "由定义直接计算。", page: 2 },
      { type: "proof", premises: ["paper:def:manifold", "paper:fact:calc"], conclusion: "paper:claim:euler", argument: "曲率积分。", page: 2 },
    ],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    observedAuth.push(options.headers.Authorization);
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    return respOf(JSON.stringify(callCount === 1 ? badAssembly : fixedAssembly));
  };

  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({
      fileName: "geometry.pdf",
      pageCount: 3,
      entries: [
        { id: "paper:def:manifold", entryClass: "fact", factKind: "definition", name: "流形", statement: "设 $M$ 为光滑流形。", page: 1 },
        { id: "paper:fact:calc", entryClass: "fact", factKind: "calculation", name: "Euler 示性数计算", statement: "$\\chi(M) = 0$。", page: 2 },
        { id: "paper:claim:euler", entryClass: "claim", claimKind: "theorem", name: "Euler 示性数定理", statement: "$M$ 的 Euler 示性数为零。", page: 2 },
      ],
    }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "secret-key-123",
    model: "deepseek-chat",
    workflowVersion: "v3.45",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });

  // 违规输出 + 定点修复各一次；问题返还模型，不走本地降级
  assert.equal(callCount, 2);
  assert.ok(stageLog.includes("repair"));
  assert.ok(!stageLog.includes("autofix"));

  // 修复调用会话式：原装配 prompt、模型的违规输出、问题清单
  const repairMessages = observedMessages[1];
  assert.equal(repairMessages.length, 3);
  assert.equal(repairMessages[1].role, "assistant");
  assert.match(repairMessages[2].content, /proof 必须以 Claim 为结论/u);
  assert.match(repairMessages[2].content, /保留论文真实存在的 Claim 互推或等价循环 proof/u);
  assert.match(repairMessages[2].content, /没有已建立的外部入口.*Closure 中保持 open/u);
  assert.doesNotMatch(repairMessages[2].content, /循环证明依赖必须断开/u);

  // 模型修正后的结果进入地图
  assert.equal(view.entries.length, 3);
  assert.equal(view.inferences.length, 2);
  assert.equal(view.inferences[0].operationKind, "organization");
  assert.equal(view.inferences[1].operationKind, "proof");
  assert.equal(view.inferences[1].conclusion, "paper:claim:euler");

  // Auth header contains key, no leakage in returned view
  assert.deepEqual(observedAuth, ["Bearer secret-key-123", "Bearer secret-key-123"]);
  assert.doesNotMatch(JSON.stringify(view), /secret-key-123/u);
});

test("rejects conjecture because the adopted Gamma Entry module has a closed Claim-kind enum", () => {
  const raw = {
    projectTitle: "C Paper",
    mainTargetEntryId: "paper:conjecture:c",
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$ 固定。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:conjecture:c", entryClass: "claim", claimKind: "conjecture", shortTitle: "C", title: "猜想 C", statement: "$C$ 尚未证明。", sourceLocator: "paper.pdf#page=3" },
    ],
    inferences: [],
  };
  assert.throws(() => paperImportClient.paperProjectView(raw, { fileName: "paper.pdf" }), /数学类型无效/u);
});

test("keeps an unproved formal Claim open without requesting a proof-completion pass", async () => {
  const openVersion = {
    projectTitle: "P Paper",
    mainTargetEntryId: "paper:theorem:t",
    b0ClaimEntryIds: [],
    inferences: [
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:lemma:l"], conclusion: "paper:theorem:t", argument: "由引理 L 得证。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  const artifactEntries = [
    { id: "paper:definition:x", entryClass: "fact", factKind: "definition", name: "定义 X", statement: "$X$。", page: 1 },
    { id: "paper:lemma:l", entryClass: "claim", claimKind: "lemma", name: "引理 L", statement: "$L$。", page: 2 },
    { id: "paper:theorem:t", entryClass: "claim", claimKind: "theorem", name: "定理 T", statement: "$T$。", page: 3 },
  ];
  let calls = 0;
  const stageLog = [];
  const fetchImpl = async () => {
    calls += 1;
    return respOf(JSON.stringify(openVersion));
  };
  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({ pageCount: 3, entries: artifactEntries }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });
  // 没有专门的补证明通道：模型坚持保留开放 Claim 时按轮次上限询问后由兜底校验放行
  assert.equal(calls, Number(process.env.INFERENCE_MAX_ROUNDS || 4));
  assert.ok(stageLog.includes("repair"));
  assert.ok(!stageLog.includes("autofix"));
  assert.equal(view.inferences.length, 1);
  const closure = (await import("../math-map-semantics.js")).default.computeClaimClosure(view.entries, view.inferences, {});
  assert.equal(closure.claimStates["paper:lemma:l"], "open");
  assert.equal(closure.claimStates["paper:theorem:t"], "open");
});

test("places directly adopted sourced Claims in B0 and establishes downstream proof closure", async () => {
  const raw = {
    projectTitle: "Q Paper",
    mainTargetEntryId: "paper:theorem:t",
    b0ClaimEntryIds: ["paper:lemma:given"],
    inferences: [
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:definition:x", "paper:lemma:given"], conclusion: "paper:theorem:t", argument: "由定义和已知引理得到。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  const artifactEntries = [
    { id: "paper:definition:x", entryClass: "fact", factKind: "definition", name: "定义 X", statement: "$X$。", page: 1 },
    { id: "paper:lemma:given", entryClass: "claim", claimKind: "lemma", name: "作为已知结果采用的引理", statement: "$L$。", page: 2, sourceReference: "正文明确作为已知结果采用" },
    { id: "paper:theorem:t", entryClass: "claim", claimKind: "theorem", name: "定理 T", statement: "$T$。", page: 3 },
  ];
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    return respOf(JSON.stringify(raw));
  };
  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({ pageCount: 2, entries: artifactEntries }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fetchImpl,
  });
  assert.equal(callCount, 1); // B0 分类与闭包一致，无需修复轮
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, ["paper:lemma:given"]);
  const closure = (await import("../math-map-semantics.js")).default.computeClaimClosure(view.entries, view.inferences, {
    b0ClaimEntryIds: view.derivedResearchState.mathematicalState.b0ClaimEntryIds,
  });
  assert.equal(closure.claimStates["paper:lemma:given"], "established");
  assert.equal(closure.claimStates["paper:theorem:t"], "established");
});

test("rejects B0 without a source reference and proof self-dependency", () => {
  const missingSource = structuredClone(rawMap);
  missingSource.b0ClaimEntryIds = ["paper:theorem:y"];
  assert.throws(() => paperImportClient.paperProjectView(missingSource), /必须包含 sourceReference/u);

  const selfDependent = structuredClone(rawMap);
  selfDependent.inferences[0].premises = ["paper:definition:x", "paper:theorem:y"];
  assert.throws(() => paperImportClient.paperProjectView(selfDependent), /conclusion 不能同时出现在 premises/u);
});

test("aggregates all B0 Claims missing sourceReference into one error", () => {
  const raw = structuredClone(rawMap);
  raw.entries.push(
    { id: "paper:b0:extra-1", entryClass: "claim", claimKind: "theorem", title: "外部定理一", statement: "$T_1$。", sourceLocator: "paper.pdf#page=3" },
    { id: "paper:b0:extra-2", entryClass: "claim", claimKind: "lemma", title: "外部引理二", statement: "$T_2$。", sourceLocator: "paper.pdf#page=4" },
  );
  raw.b0ClaimEntryIds = ["paper:b0:extra-1", "paper:b0:extra-2"];
  assert.throws(
    () => paperImportClient.paperProjectView(raw),
    /B0 Claim paper:b0:extra-1、paper:b0:extra-2 必须包含 sourceReference/u,
  );
});

test("validates and requires mainTargetEntryId to point to an existing Claim", () => {
  const missingTarget = structuredClone(rawMap);
  delete missingTarget.mainTargetEntryId;
  delete missingTarget.derivedResearchState;
  assert.throws(
    () => paperImportClient.paperProjectView(missingTarget),
    /mainTargetEntryId 必须是非空文本/u,
  );

  const nonExistentTarget = structuredClone(rawMap);
  nonExistentTarget.mainTargetEntryId = "non:existent:id";
  assert.throws(
    () => paperImportClient.paperProjectView(nonExistentTarget),
    /mainTargetEntryId 必须指向已存在的 Claim/u,
  );

  const factTarget = structuredClone(rawMap);
  factTarget.mainTargetEntryId = "paper:definition:x";
  assert.throws(
    () => paperImportClient.paperProjectView(factTarget),
    /mainTargetEntryId 必须指向已存在的 Claim/u,
  );

  // Correctly sets loopTargetEntryId without guessing the first claim
  const secondClaimTarget = structuredClone(rawMap);
  secondClaimTarget.mainTargetEntryId = "paper:proposition:z";
  const view = paperImportClient.paperProjectView(secondClaimTarget);
  assert.equal(view.derivedResearchState.researchOverlay.loopTargetEntryId, "paper:proposition:z");
  assert.equal(view.mainTargetEntryId, "paper:proposition:z");
});

test("generates and normalizes canonical display labels adhering to '<type> · <number> · <shortTitle>'", () => {
  const customMap = {
    projectTitle: "Label Test Paper",
    mainTargetEntryId: "c2",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "拓扑空间", shortTitle: "拓扑空间", statement: "X 为集合", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "lemma", displayLabel: "引理 1", title: "分离性", shortTitle: "分离性", statement: "X 具有 T2 性质", sourceLocator: "p#2" },
      { id: "c2", entryClass: "claim", claimKind: "theorem", displayLabel: "定理 · 2 · 紧致性", title: "紧致空间定理", shortTitle: "紧致性", statement: "X 为紧致", sourceLocator: "p#3" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", displayLabel: "证明 1", title: "证明分离性", statement: "直接验证", premises: ["f1"], conclusion: "c1", argument: "直接验证", sourceLocator: "p#2" },
      { id: "inf2", operationKind: "proof", premises: ["c1"], conclusion: "c2", argument: "由引理推出", sourceLocator: "p#3" },
    ],
  };

  const view = paperImportClient.paperProjectView(customMap);
  assert.equal(view.entries[0].displayLabel, "定义 · 1 · 拓扑空间");
  assert.equal(view.entries[1].displayLabel, "引理 · 1 · 分离性");
  assert.equal(view.entries[2].displayLabel, "定理 · 2 · 紧致性");
  assert.equal(view.inferences[0].displayLabel, "证明 · 1 · 分离性");
  assert.equal(view.inferences[1].displayLabel, "证明 · 2 · 紧致性");
});

test("preserves reciprocal and multi-Claim proof cycles", () => {
  const twoHopCycle = {
    projectTitle: "Cycle Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim 1", statement: "Statement 1", sourceLocator: "p#1" },
      { id: "c2", entryClass: "claim", claimKind: "lemma", title: "Claim 2", statement: "Statement 2", sourceLocator: "p#2" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["c1"], conclusion: "c2", argument: "1 implies 2", sourceLocator: "p#1" },
      { id: "inf2", operationKind: "proof", premises: ["c2"], conclusion: "c1", argument: "2 implies 1", sourceLocator: "p#2" },
    ],
  };
  assert.equal(paperImportClient.paperProjectView(twoHopCycle).inferences.length, 2);

  const threeHopCycle = {
    projectTitle: "Cycle Paper 3",
    mainTargetEntryId: "c1",
    entries: [
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim 1", statement: "Statement 1", sourceLocator: "p#1" },
      { id: "c2", entryClass: "claim", claimKind: "lemma", title: "Claim 2", statement: "Statement 2", sourceLocator: "p#2" },
      { id: "c3", entryClass: "claim", claimKind: "proposition", title: "Claim 3", statement: "Statement 3", sourceLocator: "p#3" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["c1"], conclusion: "c2", argument: "1 implies 2", sourceLocator: "p#1" },
      { id: "inf2", operationKind: "proof", premises: ["c2"], conclusion: "c3", argument: "2 implies 3", sourceLocator: "p#2" },
      { id: "inf3", operationKind: "proof", premises: ["c3"], conclusion: "c1", argument: "3 implies 1", sourceLocator: "p#3" },
    ],
  };
  assert.equal(paperImportClient.paperProjectView(threeHopCycle).inferences.length, 3);
});

test("accepts a self-contained proof but still rejects empty organization premises", () => {
  const selfContained = {
    projectTitle: "Direct Proof Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Direct theorem", statement: "Statement", sourceLocator: "p#1" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: [], conclusion: "c1", argument: "Choose a minimal counterexample and derive a contradiction.", sourceLocator: "p#1" },
    ],
  };
  assert.deepEqual(paperImportClient.paperProjectView(selfContained).inferences[0].premises, []);

  const emptyOrganization = structuredClone(selfContained);
  emptyOrganization.entries[0] = { id: "f1", entryClass: "fact", factKind: "definition", title: "Definition", statement: "Statement", sourceLocator: "p#1" };
  emptyOrganization.mainTargetEntryId = null;
  emptyOrganization.inferences[0] = { ...emptyOrganization.inferences[0], operationKind: "organization", conclusion: "f1" };
  assert.throws(() => paperImportClient.paperProjectView(emptyOrganization), /premises 必须是非空数组/u);
});

test("detects and rejects unmatched inline and display dollar math delimiters in mathematical fields", () => {
  // 1. Unmatched inline dollar in Entry statement (as seen in blind extraction)
  const badStatementMap = {
    projectTitle: "Delimiter Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Let $x \\in X$.", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "当流形维数满足  < k$ 时定理成立。", sourceLocator: "p#2" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["f1"], conclusion: "c1", argument: "直接由定义推出。", sourceLocator: "p#2" },
    ],
  };
  assert.throws(
    () => paperImportClient.paperProjectView(badStatementMap),
    /c1\.statement 包含未配对的数学公式定界符/u,
  );

  // 2. Unmatched display dollar in Entry title
  const badTitleMap = {
    projectTitle: "Delimiter Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "定理 $$E = mc^2", statement: "$E = mc^2$ 成立。", sourceLocator: "p#1" },
    ],
    inferences: [],
  };
  assert.throws(
    () => paperImportClient.paperProjectView(badTitleMap),
    /c1\.title 包含未配对的数学公式定界符/u,
  );

  // 3. Unmatched dollar in Inference argument
  const badArgMap = {
    projectTitle: "Delimiter Paper",
    mainTargetEntryId: "c1",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Let $x \\in X$.", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "结论 $Y$ 成立。", sourceLocator: "p#2" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["f1"], conclusion: "c1", argument: "由于 $x > 0 且 y < 0 成立。", sourceLocator: "p#2" },
    ],
  };
  assert.throws(
    () => paperImportClient.paperProjectView(badArgMap),
    /inf1\.argument 包含未配对的数学公式定界符/u,
  );

  // 4. Unmatched dollar in projectTitle
  const badProjectTitleMap = {
    projectTitle: "未闭合公式 $X",
    mainTargetEntryId: "c1",
    entries: [
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "$X$.", sourceLocator: "p#1" },
    ],
    inferences: [],
  };
  assert.throws(
    () => paperImportClient.paperProjectView(badProjectTitleMap),
    /projectTitle 包含未配对的数学公式定界符/u,
  );

  // 5. Valid expressions with $...$, $$...$$, multiple formulas and escaped \$
  const validMathMap = {
    projectTitle: "Valid $M^n$ and $S^k$ Paper with \\$100 budget",
    mainTargetEntryId: "c1",
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "流形 $M$", statement: "设 $M$ 为 $n$ 维流形，满足 $$\\int_M \\omega = 1$$ 且费用 \\$50。", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "theorem", title: "主定理 $f \\simeq g$", statement: "若 $\\deg(f) = \\deg(g)$，则 $f$ 与 $g$ 同伦。", sourceLocator: "p#2" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["f1"], conclusion: "c1", argument: "综合 $M$ 的性质与积分公式 $$\\int_M \\omega = 1$$ 得证。", sourceLocator: "p#2" },
    ],
  };
  const view = paperImportClient.paperProjectView(validMathMap);
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
});

test("returns unmatched math delimiters to the model for a proper fix", async () => {
  let callCount = 0;
  const stageLog = [];
  const observedMessages = [];

  // 目录中 paper:thm:hopf 的 statement 含未配对的 $；修复轮用 fixedEntries 补回修正版本
  const artifactEntries = [
    { id: "paper:def:deg", entryClass: "fact", factKind: "definition", name: "映射度", statement: "设 $f: M \\to S^k$。", page: 1 },
    { id: "paper:thm:hopf", entryClass: "claim", claimKind: "theorem", name: "Hopf 度定理", statement: "当流形维数满足  < k$ 时同伦群平凡。", page: 2 },
  ];
  const badAssembly = {
    projectTitle: "Hopf Paper",
    mainTargetEntryId: "paper:thm:hopf",
    b0: [],
    inferences: [
      { type: "proof", premises: ["paper:def:deg"], conclusion: "paper:thm:hopf", argument: "由度为零推出。", page: 2 },
    ],
  };
  const fixedAssembly = {
    ...badAssembly,
    fixedEntries: [{ id: "paper:thm:hopf", entryClass: "claim", claimKind: "theorem", name: "Hopf 度定理", statement: "当流形维数满足 $m < k$ 时同伦群平凡。", page: 2 }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    return respOf(JSON.stringify(callCount === 1 ? badAssembly : fixedAssembly));
  };

  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({ fileName: "hopf.pdf", pageCount: 2, entries: artifactEntries }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key-abc",
    model: "deepseek-chat",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });

  // 坏输出 + 定点修复各一次；定界符问题由模型真正修好，不是本地转义
  assert.equal(callCount, 2);
  assert.ok(stageLog.includes("repair"));
  assert.ok(!stageLog.includes("autofix"));
  assert.match(observedMessages[1][2].content, /定界符 \$ 未配对/u);
  const hopf = view.entries.find((entry) => entry.id === "paper:thm:hopf");
  assert.equal(hopf.statement, "当流形维数满足 $m < k$ 时同伦群平凡。");
});

test("collectRawProjectViewIssues aggregates every problem in one pass", () => {
  const { raw: normalized } = paperImportClient.normalizeRawProjectView({
    projectTitle: "Diag Paper",
    mainTargetEntryId: "ghost",
    b0: ["c2"],
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "定义", statement: "$X$。", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "lemma", title: "引理", statement: "$L$。", sourceLocator: "p#1" },
      { id: "c2", entryClass: "claim", claimKind: "theorem", title: "外部定理", statement: "$T$。", sourceLocator: "p#2" },
      { id: "c4", entryClass: "claim", claimKind: "lemma", title: "未建立引理", statement: "$U$。", sourceLocator: "p#2" },
      { id: "c5", entryClass: "claim", claimKind: "lemma", title: "断链引理", statement: "$V$。", sourceLocator: "p#2" },
      { id: "c6", entryClass: "claim", claimKind: "theorem", title: "主定理乙", statement: "$W$。", sourceLocator: "p#3" },
    ],
    inferences: [
      { id: "i1", operationKind: "proof", premises: ["ghost"], conclusion: "c1", argument: "悬空前提。", sourceLocator: "p#1" },
      { id: "i2", operationKind: "proof", premises: ["c1"], conclusion: "c1", argument: "自证。", sourceLocator: "p#1" },
      { id: "i3", operationKind: "proof", premises: ["c2"], conclusion: "c3", argument: "依赖 B0。", sourceLocator: "p#3" },
      { id: "i4", operationKind: "proof", premises: ["c4"], conclusion: "c3", argument: "依赖未建立者。", sourceLocator: "p#3" },
      { id: "i5", operationKind: "proof", premises: ["c5"], conclusion: "c6", argument: "断链依赖。", sourceLocator: "p#3" },
    ],
  }, { fileName: "d.pdf" });
  const issues = paperImportClient.collectRawProjectViewIssues(normalized);
  const joined = issues.join("\n");
  assert.match(joined, /不存在的 premise：ghost/u);
  assert.match(joined, /conclusion 同时出现在 premises 中/u);
  assert.match(joined, /B0 Claim c2 缺少 sourceReference/u);
  assert.match(joined, /mainTargetEntryId 指向了不存在或非 Claim 的条目：ghost/u);
  // c4 无 proof 且不在 b0 → 报告；c6 有 proof 但前提 c5 未建立 → 闭包断链报告
  assert.match(joined, /Claim c4（未建立引理）没有 proof 且不在 b0/u);
  assert.match(joined, /Claim c6（主定理乙）闭包推导后仍未建立：其 proof 的前提 c5 未建立/u);
  // c2 在 b0、c3 的证明由已建立前提支撑 → 不误报
  assert.doesNotMatch(joined, /Claim c2（/u);
  assert.doesNotMatch(joined, /Claim c3（/u);
});

test("applies fixedEntries patches from the assembly repair round", async () => {
  let callCount = 0;
  const artifactEntries = [
    { id: "paper:def:deg", entryClass: "fact", factKind: "definition", name: "映射度", statement: "度定义。", page: 1 },
    { id: "paper:b0:sard", entryClass: "claim", claimKind: "theorem", name: "Sard 定理", statement: "临界值集测度为零。", page: 2, external: true },
    { id: "paper:thm:hopf", entryClass: "claim", claimKind: "theorem", name: "Hopf 度定理", statement: "度相同当且仅当同伦。", page: 3 },
  ];
  const badAssembly = {
    projectTitle: "Hopf Paper",
    mainTargetEntryId: "paper:thm:hopf",
    b0: ["paper:b0:sard"],
    inferences: [{ type: "proof", premises: ["paper:def:deg", "paper:b0:sard"], conclusion: "paper:thm:hopf", argument: "取正则值。", page: 3 }],
  };
  // 第一轮 B0 引用缺 source 的外部结果被驳回；第二轮用 fixedEntries 补齐来源
  const fixedAssembly = {
    ...badAssembly,
    fixedEntries: [{ id: "paper:b0:sard", entryClass: "claim", claimKind: "theorem", name: "Sard 定理", statement: "临界值集测度为零。", page: 2, external: true, source: "Sard, 1942" }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    return respOf(JSON.stringify(callCount === 1 ? badAssembly : fixedAssembly));
  };

  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({ fileName: "hopf.pdf", pageCount: 3, entries: artifactEntries }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "k",
    model: "deepseek-chat",
    fetchImpl,
  });

  assert.equal(callCount, 2);
  const sard = view.entries.find((entry) => entry.id === "paper:b0:sard");
  assert.equal(sard.sourceReference, "Sard, 1942");
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, ["paper:b0:sard"]);
});

test("extracts a valid view from compact two-phase model output", async () => {
  // 单窗口冻结抽取：紧凑双通道输出由整合展开为完整目录
  const compactExtract = dualOutputPayload({
    foundation: [
      { id: "paper:def:deg", type: "definition", num: 1, name: "映射度", statement: "设 $f: M \\to S^k$ 为光滑映射。", page: 1 },
      { id: "paper:b0:sard", type: "theorem", name: "Sard 定理", statement: "$f$ 的临界值集测度为零。", page: 2, external: true, source: "Sard, 1942" },
    ],
    result: [
      { id: "paper:thm:hopf", type: "theorem", num: 8, name: "Hopf 度定理", statement: "$\\deg(f) = \\deg(g)$ 当且仅当 $f \\simeq g$。", page: 2 },
    ],
  });
  const assembly = {
    projectTitle: "Hopf 映射",
    mainTargetEntryId: "paper:thm:hopf",
    b0: ["paper:b0:sard"],
    inferences: [
      { type: "proof", premises: ["paper:def:deg", "paper:b0:sard"], conclusion: "paper:thm:hopf", argument: "由 Sard 定理取正则值计算环绕数。", page: 2 },
    ],
  };
  const { impl, state } = makePipelineFetch({ extractPayload: compactExtract, later: [assembly] });

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: "k",
    model: "deepseek-v4-flash",
    fileName: "hopf.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\n定义\n[[PAGE 2]]\n定理",
    fetchImpl: impl,
  });

  assert.equal(state.calls.length, 2); // 抽取窗口 + 装配，无独立整合调用
  assert.match(state.calls[0].content, /Foundation Entries/u);
  assert.doesNotMatch(state.calls[1].content, /Foundation Entries/u);
  // 紧凑输出由系统展开为完整 Entry：显示标签、页码定位全部生成
  const byId = new Map(view.entries.map((entry) => [entry.id, entry]));
  const def = byId.get("paper:def:deg");
  const thm = byId.get("paper:thm:hopf");
  const sard = byId.get("paper:b0:sard");
  assert.equal(def.displayLabel, "定义 · 1 · 映射度");
  assert.equal(def.sourcePath, "hopf.pdf#page=1");
  assert.match(thm.displayLabel, /^定理 · \d+ · Hopf 度定理$/u);
  assert.equal(sard.sourceReference, "Sard, 1942");
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, ["paper:b0:sard"]);
  assert.equal(view.mainTargetEntryId, "paper:thm:hopf");
  assert.equal(view.inferences[0].operationKind, "proof");
  assert.equal(view.inferences[0].sourcePath, "hopf.pdf#page=2");
  assert.deepEqual(view.inferences[0].premises, ["paper:def:deg", "paper:b0:sard"]);
});

test("splits long papers into parallel chunks and merges duplicate entries", async () => {
  const windowRanges = [];
  let extractCalls = 0;
  // 两个窗口对重叠页上的同一对象各自提取（相同 id），第二窗另给出主定理
  const windowPayloads = [
    dualOutputPayload({
      foundation: [{ id: "paper:def:a", type: "definition", name: "映射度", statement: "度定义。", page: 1 }],
    }),
    dualOutputPayload({
      foundation: [{ id: "paper:def:a", type: "definition", name: "映射度", statement: "度定义（重申）。", page: 5 }],
      result: [{ id: "paper:thm:b", type: "theorem", name: "主定理", statement: "主定理陈述。", page: 6 }],
    }),
  ];
  const assembly = {
    projectTitle: "Long Paper",
    mainTargetEntryId: "paper:thm:b",
    b0: [],
    inferences: [{ type: "proof", premises: ["paper:def:a"], conclusion: "paper:thm:b", argument: "应用定义。", page: 6 }],
  };
  const fetchImpl = async (url, options) => {
    const content = JSON.parse(options.body).messages?.[0]?.content ?? "";
    if (content.includes("Foundation Entries")) {
      windowRanges.push((content.match(/本块覆盖第 \d+–\d+ 页/u) ?? [])[0]);
      const payload = windowPayloads[Math.min(extractCalls, windowPayloads.length - 1)];
      extractCalls += 1;
      return respOf(JSON.stringify(payload));
    }
    return respOf(JSON.stringify(assembly));
  };

  // 6 页文本按 5 页窗 / 1 页重叠切成两个并行窗口
  const longText = Array.from({ length: 6 }, (_, i) => `[[PAGE ${i + 1}]]\n第${i + 1}页内容。`).join("\n\n");
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: "k",
    model: "deepseek-v4-flash",
    fileName: "long.pdf",
    pageCount: 6,
    text: longText,
    fetchImpl,
  });

  assert.equal(extractCalls, 2);
  // 每个窗口 prompt 都标注了自己的页码范围；第二窗含 1 页重叠（与第一窗共享第 5 页）
  assert.deepEqual(windowRanges, ["本块覆盖第 1–5 页", "本块覆盖第 5–6 页"]);
  // 重复条目被合并为一条，装配阶段对重复 id 的引用保持可用
  assert.equal(view.entries.length, 2);
  assert.ok(view.entries.some((entry) => entry.id === "paper:def:a"));
  assert.equal(view.inferences[0].premises[0], "paper:def:a");
});

test("merges duplicate entries sharing both id and name without hanging", () => {
  const { raw, notes } = paperImportClient.normalizeRawProjectView({
    entries: [
      { id: "paper:def:a", type: "definition", name: "映射度", statement: "度定义。", page: 1 },
      { id: "paper:def:a", type: "definition", name: "映射度", statement: "度定义（重申）。", page: 9 },
    ],
    inferences: [],
  });
  assert.equal(raw.entries.length, 1);
  assert.equal(raw.entries[0].statement, "度定义。");
  assert.ok(notes.some((note) => note.includes("合并重复条目")));
});

test("applyIntegration merges aliases and renames conservatively", () => {
  const entries = [
    { id: "a", type: "definition", name: "Higman 理想", statement: "Higman 理想定义。", page: 7 },
    { id: "b", type: "definition", name: "Higman 理想的定义", statement: "Higman 理想定义。", page: 8 },
    { id: "c", type: "theorem", name: "Lemma 2.20", statement: "某引理。", page: 11 },
    { id: "d", type: "theorem", name: "另一定理", statement: "另一陈述。", page: 12 },
  ];
  const { entries: merged, aliasCount, renameCount } = paperImportClient.applyIntegration(entries, {
    aliases: {
      b: "a",           // 合法：b 是 a 的重复
      ghost: "a",       // 非法：源不存在
      a: "ghost",       // 非法：目标不存在
      a2: "b2", b2: "a2", // 双方均不存在
    },
    renames: [
      { id: "c", name: "Radford 同构的等变性" },
      { id: "d", name: "Theorem 3.5" },       // 非法：仍是引用编号
      { id: "ghost", name: "幽灵" },          // 非法：id 不存在
    ],
  });
  assert.equal(aliasCount, 1);
  assert.equal(renameCount, 1);
  assert.deepEqual(merged.map((e) => e.id), ["a", "c", "d"]);
  assert.equal(merged[1].name, "Radford 同构的等变性");
  assert.equal(merged[2].name, "另一定理");
});

// removed: integrate stage no longer exists under Frozen Workflow (ADR-0003)

test("assembly repair can supplement a missing entry via fixedEntries", async () => {
  let callCount = 0;
  // 目录只有 X 与外部结果 Y；装配引用了目录里不存在的 paper:thm:z（提取遗漏）
  const artifactEntries = [
    { id: "paper:def:x", entryClass: "fact", factKind: "definition", name: "定义 X", statement: "$X$。", page: 1 },
    { id: "paper:thm:y", entryClass: "claim", claimKind: "theorem", name: "定理 Y", statement: "$Y$。", page: 2, external: true, sourceReference: "某文献" },
  ];
  const badAssembly = {
    projectTitle: "P",
    mainTargetEntryId: "paper:thm:z",
    b0: ["paper:thm:y"],
    inferences: [{ type: "proof", premises: ["paper:thm:y"], conclusion: "paper:thm:z", argument: "由 Y 推出 Z。", page: 3 }],
  };
  // 修复轮用 fixedEntries 补充该条目
  const fixedAssembly = {
    ...badAssembly,
    fixedEntries: [{ id: "paper:thm:z", entryClass: "claim", claimKind: "theorem", name: "定理 Z", statement: "$Z$ 成立。", page: 3 }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    return respOf(JSON.stringify(callCount === 1 ? badAssembly : fixedAssembly));
  };
  const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
    artifact: makeEntryArtifact({ fileName: "p.pdf", pageCount: 3, entries: artifactEntries }),
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "k",
    model: "m",
    fetchImpl,
  });
  assert.equal(callCount, 2);
  assert.equal(view.entries.length, 3);
  assert.equal(view.entries[2].id, "paper:thm:z");
  assert.equal(view.mainTargetEntryId, "paper:thm:z");
  assert.equal(view.inferences[0].conclusion, "paper:thm:z");
});

test("sanitizeRawProjectView repairs mechanical defects locally", () => {
  const raw = {
    projectTitle: "Sanitize Paper",
    mainTargetEntryId: "missing",
    b0ClaimEntryIds: ["c2"],
    entries: [
      { id: "f1", entryClass: "fact", factKind: "definition", title: "定义", statement: "$X$。", sourceLocator: "p#1" },
      { id: "c1", entryClass: "claim", claimKind: "lemma", title: "引理", statement: "$L$。", sourceLocator: "p#1" },
      { id: "c2", entryClass: "claim", claimKind: "theorem", title: "外部定理", statement: "$T$。", sourceLocator: "p#2" },
      { id: "c3", entryClass: "claim", claimKind: "theorem", title: "主定理", statement: "$M$。", sourceLocator: "p#3" },
    ],
    inferences: [
      { id: "i1", premises: ["f1"], conclusion: "c1", argument: "由定义。", sourceLocator: "p#1" },
      { id: "i2", operationKind: "proof", premises: ["ghost", "c1"], conclusion: "c3", argument: "由引理。", sourceLocator: "p#3" },
      { id: "i3", operationKind: "proof", premises: [], conclusion: "c3", argument: "反设结论不成立，取极小反例并导出矛盾。", sourceLocator: "p#3" },
      { id: "i4", operationKind: "proof", premises: ["c3"], conclusion: "c1", argument: "回推。", sourceLocator: "p#3" },
      { id: "i5", operationKind: "proof", premises: ["c1"], conclusion: "c1", argument: "循环论证。", sourceLocator: "p#1" },
      { id: "i6", operationKind: "proof", premises: ["f1"], conclusion: "c1", argument: "", sourceLocator: "p#1" },
    ],
  };

  const { raw: fixed, actions } = paperImportClient.sanitizeRawProjectView(raw, { fileName: "s.pdf" });
  assert.ok(actions.length >= 5);

  const view = paperImportClient.paperProjectView(fixed, { fileName: "s.pdf" });
  const byId = new Map(view.inferences.map((inf) => [inf.id, inf]));
  assert.equal(byId.get("i1").operationKind, "proof");
  assert.deepEqual(byId.get("i2").premises, ["c1"]);
  assert.deepEqual(byId.get("i3").premises, []);
  assert.ok(byId.has("i4"));
  assert.equal(byId.has("i5"), false);
  assert.equal(byId.has("i6"), false);

  assert.equal(view.entries.find((e) => e.id === "c2").sourceReference, "外部定理");
  assert.equal(view.mainTargetEntryId, "c3");
  assert.equal(view.derivedResearchState.researchOverlay.loopTargetEntryId, "c3");
});
