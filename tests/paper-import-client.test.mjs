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
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(rawMap) } }] }),
    };
  };
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test",
    model: "deepseek-chat",
    fileName: "paper.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition",
    fetchImpl,
  });
  assert.equal(observed.url, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(observed.options.headers.Authorization, "Bearer test");
  assert.doesNotMatch(observed.url, /Bearer test/u);
  assert.doesNotMatch(observed.options.body, /Bearer test/u);
  assert.doesNotMatch(JSON.stringify(view), /Bearer test/u);
  assert.equal(view.project.title, "A Paper");
});

test("sends Kimi K3 through the Moonshot preset without leaking the API key", async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(rawMap) } }] }),
    };
  };
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.moonshot.cn/v1",
    apiKey: "test",
    model: "kimi-k3",
    providerLabel: "Kimi",
    fileName: "paper.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition",
    fetchImpl,
  });
  const requestBody = JSON.parse(observed.options.body);
  assert.equal(observed.url, "https://api.moonshot.cn/v1/chat/completions");
  assert.equal(observed.options.headers.Authorization, "Bearer test");
  assert.equal(requestBody.model, "kimi-k3");
  assert.doesNotMatch(observed.url, /Bearer test/u);
  assert.doesNotMatch(observed.options.body, /Bearer test/u);
  assert.doesNotMatch(JSON.stringify(view), /Bearer test/u);
});

test("returns structural failures to the model for a targeted repair round", async () => {
  let callCount = 0;
  const observedMessages = [];
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    if (callCount === 1) {
      // 分段提取输出不含任何可用 Entry
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ unexpected: true }) } }] }),
      };
    }
    const goodMap = {
      projectTitle: "Draft Paper",
      mainTargetEntryId: "e2",
      b0ClaimEntryIds: [],
      entries: [
        { id: "e1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Def", sourceLocator: "p#1" },
        { id: "e2", entryClass: "claim", claimKind: "theorem", title: "Thm 1", statement: "Thm", sourceLocator: "p#2" },
      ],
      inferences: [{ operationKind: "proof", premises: ["e1"], conclusion: "e2", argument: "Arg", sourceLocator: "p#2" }],
    };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(goodMap) } }] }),
    };
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fileName: "retry-test.pdf",
    pageCount: 1,
    text: "Some paper text",
    fetchImpl,
  });

  // 分段提取 + 分段修复 + 整合 + 装配各一次
  assert.equal(callCount, 4);
  // 修复调用把模型上一次输出和问题清单一并返还（3 条消息：原 prompt、坏输出、问题清单）
  assert.equal(observedMessages[1].length, 3);
  assert.equal(observedMessages[1][0].role, "user");
  assert.equal(observedMessages[1][1].role, "assistant");
  assert.equal(observedMessages[1][2].role, "user");
  assert.match(observedMessages[1][2].content, /存在以下问题/u);
  assert.match(observedMessages[1][2].content, /未提取到任何 Entry/u);
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
  assert.equal(view.inferences[0].conclusion, "e2");
});

test("does not retry on HTTP errors and fails closed on repeated schema error", async () => {
  let callCount = 0;
  const httpErrorFetch = async () => {
    callCount += 1;
    return { ok: false, status: 401, text: async () => JSON.stringify({ error: { message: "Invalid key" } }) };
  };

  await assert.rejects(
    () => paperImportClient.requestPaperProjectView({
      endpoint: "https://api.deepseek.com/v1",
      apiKey: "bad-key",
      model: "deepseek-chat",
      fileName: "p.pdf",
      pageCount: 1,
      text: "txt",
      fetchImpl: httpErrorFetch,
    }),
    /HTTP 401/u
  );
  assert.equal(callCount, 1); // No retry for HTTP error

  let persistentBadCount = 0;
  const persistentBadFetch = async () => {
    persistentBadCount += 1;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ entries: [], inferences: [] }) } }] }),
    };
  };

  await assert.rejects(
    () => paperImportClient.requestPaperProjectView({
      endpoint: "https://api.deepseek.com/v1",
      apiKey: "key",
      model: "deepseek-chat",
      fileName: "p.pdf",
      pageCount: 1,
      text: "txt",
      fetchImpl: persistentBadFetch,
    }),
    /没有提取出任何数学 Entry/u
  );
  assert.equal(persistentBadCount, 2); // 分段初提 + 分段修复各一次后放弃
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
});

test("returns proof-to-Fact violations to the model and applies the targeted fix", async () => {
  let callCount = 0;
  let assemblyCalls = 0;
  const stageLog = [];
  const observedMessages = [];
  const observedAuth = [];

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
  const chunkEntries = {
    entries: [
      { id: "paper:def:manifold", type: "definition", num: 1, name: "流形", statement: "设 $M$ 为光滑流形。", page: 1 },
      { id: "paper:fact:calc", type: "calculation", num: 2, name: "Euler 示性数计算", statement: "$\\chi(M) = 0$。", page: 2 },
      { id: "paper:claim:euler", type: "theorem", num: 3, name: "Euler 示性数定理", statement: "$M$ 的 Euler 示性数为零。", page: 2 },
    ],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    observedAuth.push(options.headers.Authorization);
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    const prompt = body.messages[0].content;
    const isEntriesPhase = prompt.includes("只提取本段中的数学对象");
    const isIntegration = prompt.includes("整合模块");
    let content;
    if (isEntriesPhase) {
      content = chunkEntries;
    } else if (isIntegration) {
      content = { aliases: {}, renames: [] };
    } else {
      assemblyCalls += 1;
      content = assemblyCalls === 1 ? badAssembly : fixedAssembly;
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "secret-key-123",
    model: "deepseek-chat",
    fileName: "geometry.pdf",
    pageCount: 3,
    text: "[[PAGE 1]]\nDefinition 1\n[[PAGE 2]]\nTheorem 3",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });

  // 分段提取 + 整合 + 装配 + 装配修复各一次；问题返还模型，不走本地降级
  assert.equal(callCount, 4);
  assert.ok(stageLog.includes("repair"));
  assert.ok(!stageLog.includes("autofix"));

  // 修复调用会话式：原装配 prompt、模型的违规输出、问题清单
  const repairMessages = observedMessages[3];
  assert.equal(repairMessages.length, 3);
  assert.equal(repairMessages[1].role, "assistant");
  assert.match(repairMessages[2].content, /proof 必须以 Claim 为结论/u);

  // 模型修正后的结果进入地图
  assert.equal(view.entries.length, 3);
  assert.equal(view.inferences.length, 2);
  assert.equal(view.inferences[0].operationKind, "organization");
  assert.equal(view.inferences[1].operationKind, "proof");
  assert.equal(view.inferences[1].conclusion, "paper:claim:euler");

  // Auth header contains key, no leakage in payload or returned view
  assert.deepEqual(observedAuth, ["Bearer secret-key-123", "Bearer secret-key-123", "Bearer secret-key-123", "Bearer secret-key-123"]);
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
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:lemma:l", entryClass: "claim", claimKind: "lemma", shortTitle: "L", title: "引理 L", statement: "$L$。", sourceLocator: "paper.pdf#page=2" },
      { id: "paper:theorem:t", entryClass: "claim", claimKind: "theorem", shortTitle: "T", title: "定理 T", statement: "$T$。", sourceLocator: "paper.pdf#page=3" },
    ],
    inferences: [
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:lemma:l"], conclusion: "paper:theorem:t", argument: "由引理 L 得证。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(openVersion) } }] }),
    };
  };
  const stages = [];
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fileName: "paper.pdf",
    pageCount: 3,
    text: "paper text",
    fetchImpl,
    onStage: (stage) => stages.push(stage),
  });
  assert.equal(calls.length, 3); // 分段提取 + 整合 + 装配各一次
  assert.ok(stages.includes("closure"));
  assert.equal(view.inferences.length, 1);
  const closure = paperImportClient && view.entries
    ? (await import("../math-map-semantics.js")).default.computeClaimClosure(view.entries, view.inferences, {})
    : null;
  assert.equal(closure.claimStates["paper:lemma:l"], "open");
  assert.equal(closure.claimStates["paper:theorem:t"], "open");
});

test("places directly adopted sourced Claims in B0 and establishes downstream proof closure", async () => {
  const raw = {
    projectTitle: "Q Paper",
    mainTargetEntryId: "paper:theorem:t",
    b0ClaimEntryIds: ["paper:lemma:given"],
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:lemma:given", entryClass: "claim", claimKind: "lemma", shortTitle: "L", title: "作为已知结果采用的引理", statement: "$L$。", sourceLocator: "paper.pdf#page=2", sourceReference: "正文明确作为已知结果采用" },
      { id: "paper:theorem:t", entryClass: "claim", claimKind: "theorem", shortTitle: "T", title: "定理 T", statement: "$T$。", sourceLocator: "paper.pdf#page=3" },
    ],
    inferences: [
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:definition:x", "paper:lemma:given"], conclusion: "paper:theorem:t", argument: "由定义和已知引理得到。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  let callCount = 0;
  const fetchImpl = async (url, init) => {
    callCount += 1;
    return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }) };
  };
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key",
    model: "deepseek-chat",
    fileName: "paper.pdf",
    pageCount: 2,
    text: "paper text",
    fetchImpl,
  });
  assert.equal(callCount, 3); // 分段提取 + 整合 + 装配各一次，无需修复轮
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

test("detects and rejects cyclic proof dependencies (2-hop and 3-hop cycles)", () => {
  // 2-hop cycle: A proves B, B proves A
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
  assert.throws(
    () => paperImportClient.paperProjectView(twoHopCycle),
    /数学地图存在循环证明依赖：.*c1.*c2.*c1/u,
  );

  // 3-hop cycle: A -> B -> C -> A
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
  assert.throws(
    () => paperImportClient.paperProjectView(threeHopCycle),
    /数学地图存在循环证明依赖：.*c1.*c3.*c2.*c1/u,
  );
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

  const badEntries = {
    entries: [
      { id: "paper:def:deg", type: "definition", num: 1, name: "映射度", statement: "设 $f: M \\to S^k$。", page: 1 },
      { id: "paper:thm:hopf", type: "theorem", num: 8, name: "Hopf 度定理", statement: "当流形维数满足  < k$ 时同伦群平凡。", page: 2 },
    ],
  };
  const fixedEntries = {
    entries: [
      { id: "paper:def:deg", type: "definition", num: 1, name: "映射度", statement: "设 $f: M \\to S^k$。", page: 1 },
      { id: "paper:thm:hopf", type: "theorem", num: 8, name: "Hopf 度定理", statement: "当流形维数满足 $m < k$ 时同伦群平凡。", page: 2 },
    ],
  };
  const assembly = {
    projectTitle: "Hopf Paper",
    mainTargetEntryId: "paper:thm:hopf",
    b0: [],
    inferences: [
      { type: "proof", premises: ["paper:def:deg"], conclusion: "paper:thm:hopf", argument: "由度为零推出。", page: 2 },
    ],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    const isEntriesPhase = body.messages[0].content.includes("只提取本段中的数学对象");
    const content = isEntriesPhase ? (callCount === 1 ? badEntries : fixedEntries) : assembly;
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key-abc",
    model: "deepseek-chat",
    fileName: "hopf.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition\n[[PAGE 2]]\nTheorem",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });

  // 分段初提 + 分段修复 + 整合 + 装配；定界符问题由模型真正修好，不是本地转义
  assert.equal(callCount, 4);
  assert.ok(stageLog.includes("entries-repair"));
  assert.ok(!stageLog.includes("autofix"));
  assert.match(observedMessages[1][2].content, /定界符 \$ 未配对/u);
  assert.equal(view.entries[1].statement, "当流形维数满足 $m < k$ 时同伦群平凡。");
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
    ],
    inferences: [
      { id: "i1", operationKind: "proof", premises: ["ghost"], conclusion: "c1", argument: "悬空前提。", sourceLocator: "p#1" },
      { id: "i2", operationKind: "proof", premises: ["c1"], conclusion: "c1", argument: "自证。", sourceLocator: "p#1" },
    ],
  }, { fileName: "d.pdf" });
  const issues = paperImportClient.collectRawProjectViewIssues(normalized);
  const joined = issues.join("\n");
  assert.match(joined, /不存在的 premise：ghost/u);
  assert.match(joined, /conclusion 同时出现在 premises 中/u);
  assert.match(joined, /B0 Claim c2 缺少 sourceReference/u);
  assert.match(joined, /mainTargetEntryId 指向了不存在或非 Claim 的条目：ghost/u);
});

test("applies fixedEntries patches from the assembly repair round", async () => {
  let callCount = 0;
  let assemblyCalls = 0;
  const chunkEntries = {
    entries: [
      { id: "paper:def:deg", type: "definition", num: 1, name: "映射度", statement: "度定义。", page: 1 },
      { id: "paper:b0:sard", type: "theorem", name: "Sard 定理", statement: "临界值集测度为零。", page: 2, external: true },
      { id: "paper:thm:hopf", type: "theorem", num: 8, name: "Hopf 度定理", statement: "度相同当且仅当同伦。", page: 3 },
    ],
  };
  const badAssembly = {
    projectTitle: "Hopf Paper",
    mainTargetEntryId: "paper:thm:hopf",
    b0: ["paper:b0:sard"],
    inferences: [{ type: "proof", premises: ["paper:def:deg", "paper:b0:sard"], conclusion: "paper:thm:hopf", argument: "取正则值。", page: 3 }],
  };
  const fixedAssembly = {
    ...badAssembly,
    fixedEntries: [{ id: "paper:b0:sard", type: "theorem", name: "Sard 定理", statement: "临界值集测度为零。", page: 2, external: true, source: "Sard, 1942" }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    const prompt = body.messages[0].content;
    const isEntriesPhase = prompt.includes("只提取本段中的数学对象");
    const isIntegration = prompt.includes("整合模块");
    let content;
    if (isEntriesPhase) {
      content = chunkEntries;
    } else if (isIntegration) {
      content = { aliases: {}, renames: [] };
    } else {
      assemblyCalls += 1;
      content = assemblyCalls === 1 ? badAssembly : fixedAssembly;
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "k",
    model: "deepseek-chat",
    fileName: "hopf.pdf",
    pageCount: 3,
    text: "[[PAGE 1]]\n定义\n[[PAGE 2]]\n引用\n[[PAGE 3]]\n定理",
    fetchImpl,
  });

  // 分段提取 + 分段修复（mock 不修）+ 整合 + 装配 + 装配修复（fixedEntries 补丁生效）
  assert.equal(callCount, 5);
  const sard = view.entries.find((entry) => entry.id === "paper:b0:sard");
  assert.equal(sard.sourceReference, "Sard, 1942");
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, ["paper:b0:sard"]);
});

test("extracts a valid view from compact two-phase model output", async () => {
  const prompts = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    prompts.push(body.messages[0].content);
    const isEntriesPhase = body.messages[0].content.includes("只提取本段中的数学对象");
    const content = isEntriesPhase
      ? {
        entries: [
          { id: "paper:def:deg", type: "definition", num: 1, name: "映射度", statement: "设 $f: M \\to S^k$ 为光滑映射。", page: 1 },
          { id: "paper:thm:hopf", type: "theorem", num: 8, name: "Hopf 度定理", statement: "$\\deg(f) = \\deg(g)$ 当且仅当 $f \\simeq g$。", page: 2 },
          { id: "paper:b0:sard", type: "theorem", name: "Sard 定理", statement: "$f$ 的临界值集测度为零。", page: 2, external: true, source: "Sard, 1942" },
        ],
      }
      : {
        projectTitle: "Hopf 映射",
        mainTargetEntryId: "paper:thm:hopf",
        b0: ["paper:b0:sard"],
        inferences: [
          { type: "proof", premises: ["paper:def:deg", "paper:b0:sard"], conclusion: "paper:thm:hopf", argument: "由 Sard 定理取正则值计算环绕数。", page: 2 },
        ],
      };
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: "k",
    model: "deepseek-v4-flash",
    fileName: "hopf.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\n定义\n[[PAGE 2]]\n定理",
    fetchImpl,
  });

  assert.equal(prompts.length, 3); // 分段提取 + 整合 + 装配
  // 紧凑输出由系统展开为完整 Entry：编号、显示标签、页码定位全部生成
  const [def, thm, sard] = view.entries;
  assert.equal(def.displayLabel, "定义 · 1 · 映射度");
  assert.equal(def.sourcePath, "hopf.pdf#page=1");
  assert.equal(thm.displayLabel, "定理 · 8 · Hopf 度定理");
  assert.equal(sard.sourceReference, "Sard, 1942");
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, ["paper:b0:sard"]);
  assert.equal(view.mainTargetEntryId, "paper:thm:hopf");
  assert.equal(view.inferences[0].operationKind, "proof");
  assert.equal(view.inferences[0].sourcePath, "hopf.pdf#page=2");
  assert.deepEqual(view.inferences[0].premises, ["paper:def:deg", "paper:b0:sard"]);
});

test("splits long papers into parallel chunks and merges duplicate entries", async () => {
  const entryPrompts = [];
  let entryCall = 0;
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    const prompt = body.messages[0].content;
    if (prompt.includes("只提取本段中的数学对象")) {
      entryCall += 1;
      entryPrompts.push(prompt);
      // 两个分段各自返回一个不同条目 + 同一个重复条目（重复定义在两段都出现）
      const entries = entryCall === 1
        ? [{ id: "paper:def:a", type: "definition", name: "映射度", statement: "度定义。", page: 1 }]
        : [
          { id: "paper:def:a-copy", type: "definition", name: "映射度", statement: "度定义（重申）。", page: 9 },
          { id: "paper:thm:b", type: "theorem", name: "主定理", statement: "主定理陈述。", page: 9 },
        ];
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ entries }) } }] }) };
    }
    const assembly = {
      projectTitle: "Long Paper",
      mainTargetEntryId: "paper:thm:b",
      b0: [],
      inferences: [{ type: "proof", premises: ["paper:def:a-copy"], conclusion: "paper:thm:b", argument: "应用定义。", page: 9 }],
    };
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(assembly) } }] }) };
  };

  // 构造超过 6 万字符、含 2 个页标记的长文本 → 2 段并行 + 1 次装配 = 3 次调用
  const longText = `[[PAGE 1]]\n${"第一段内容。".repeat(5000)}\n\n[[PAGE 2]]\n${"第二段内容。".repeat(5000)}`;
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://opencode.ai/zen/go/v1",
    apiKey: "k",
    model: "deepseek-v4-flash",
    fileName: "long.pdf",
    pageCount: 2,
    text: longText,
    fetchImpl,
  });

  assert.equal(entryPrompts.length, 2);
  // 每段 prompt 都标注了自己的页码范围；第二段含 1 页重叠（与第一段共享第 1 页）
  assert.match(entryPrompts[0], /本段覆盖第 1–1 页/u);
  assert.match(entryPrompts[1], /本段覆盖第 1–2 页/u);
  // 重复条目被合并，装配阶段对重复 id 的引用被重映射到保留条目
  assert.equal(view.entries.length, 2);
  assert.equal(view.entries[0].id, "paper:def:a");
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

test("skips the integration call when its output is unusable", async () => {
  const stageLog = [];
  const chunkEntries = {
    entries: [
      { id: "paper:def:x", type: "definition", name: "定义 X", statement: "$X$。", page: 1 },
      { id: "paper:thm:y", type: "theorem", name: "定理 Y", statement: "$Y$。", page: 2 },
    ],
  };
  const assembly = {
    projectTitle: "P",
    mainTargetEntryId: "paper:thm:y",
    b0: [],
    inferences: [{ type: "proof", premises: ["paper:def:x"], conclusion: "paper:thm:y", argument: "由定义。", page: 2 }],
  };
  const fetchImpl = async (url, options) => {
    const prompt = JSON.parse(options.body).messages[0].content;
    const isEntriesPhase = prompt.includes("只提取本段中的数学对象");
    const isIntegration = prompt.includes("整合模块");
    // 整合调用返回非法 JSON 文本，触发 integrate-skipped 分支
    const content = isEntriesPhase ? JSON.stringify(chunkEntries) : isIntegration ? "{broken" : JSON.stringify(assembly);
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) };
  };
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "k",
    model: "m",
    fileName: "p.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\n定义\n[[PAGE 2]]\n定理",
    fetchImpl,
    onStage: (stage) => stageLog.push(stage),
  });
  assert.ok(stageLog.includes("integrate-skipped"));
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
});

test("assembly repair can supplement a missing entry via fixedEntries", async () => {
  let callCount = 0;
  let assemblyCalls = 0;
  const chunkEntries = {
    entries: [
      { id: "paper:def:x", type: "definition", name: "定义 X", statement: "$X$。", page: 1 },
      { id: "paper:thm:y", type: "theorem", name: "定理 Y", statement: "$Y$。", page: 2 },
    ],
  };
  // 装配引用了目录里不存在的 paper:thm:z（提取遗漏）
  const badAssembly = {
    projectTitle: "P",
    mainTargetEntryId: "paper:thm:z",
    b0: [],
    inferences: [{ type: "proof", premises: ["paper:thm:y"], conclusion: "paper:thm:z", argument: "由 Y 推出 Z。", page: 3 }],
  };
  // 修复轮用 fixedEntries 补充该条目
  const fixedAssembly = {
    ...badAssembly,
    fixedEntries: [{ id: "paper:thm:z", type: "theorem", name: "定理 Z", statement: "$Z$ 成立。", page: 3 }],
  };
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const prompt = JSON.parse(options.body).messages[0].content;
    const isEntriesPhase = prompt.includes("只提取本段中的数学对象");
    const isIntegration = prompt.includes("整合模块");
    let content;
    if (isEntriesPhase) content = chunkEntries;
    else if (isIntegration) content = { aliases: {}, renames: [] };
    else {
      assemblyCalls += 1;
      content = assemblyCalls === 1 ? badAssembly : fixedAssembly;
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };
  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "k",
    model: "m",
    fileName: "p.pdf",
    pageCount: 3,
    text: "[[PAGE 1]]\n定义\n[[PAGE 2]]\n定理\n[[PAGE 3]]\n推论",
    fetchImpl,
  });
  assert.equal(callCount, 4);
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
      // 缺 operationKind → 按结论类型推断为 proof
      { id: "i1", premises: ["f1"], conclusion: "c1", argument: "由定义。", sourceLocator: "p#1" },
      // 悬空 premise → 移除后仍合法
      { id: "i2", operationKind: "proof", premises: ["ghost", "c1"], conclusion: "c3", argument: "由引理。", sourceLocator: "p#3" },
      // 空 premises → 整条丢弃
      { id: "i3", operationKind: "proof", premises: [], conclusion: "c3", argument: "空。", sourceLocator: "p#3" },
      // 循环依赖 c1 → c4? 用 c1/c3 自环：c1 证明依赖 c3，c3 依赖 c1 → 后者成环被丢弃
      { id: "i4", operationKind: "proof", premises: ["c3"], conclusion: "c1", argument: "回推。", sourceLocator: "p#3" },
    ],
  };

  const { raw: fixed, actions } = paperImportClient.sanitizeRawProjectView(raw, { fileName: "s.pdf" });
  assert.ok(actions.length >= 5);

  // i1 推断为 proof；i2 移除悬空 premise；i3 丢弃；i4 与 i2 成环（c3→c1→? 取决于顺序）被破环
  const view = paperImportClient.paperProjectView(fixed, { fileName: "s.pdf" });
  const byId = new Map(view.inferences.map((inf) => [inf.id, inf]));
  assert.equal(byId.get("i1").operationKind, "proof");
  assert.deepEqual(byId.get("i2").premises, ["c1"]);
  assert.ok(!byId.has("i3"));
  // 循环被打破：i2(c1→c3) 与 i4(c3→c1) 只保留先出现的 i2
  assert.ok(!byId.has("i4"));

  // B0 缺 sourceReference → 按条目名补齐；mainTarget 缺失 → 回退到被证明的非 B0 主定理
  assert.equal(view.entries.find((e) => e.id === "c2").sourceReference, "外部定理");
  assert.equal(view.mainTargetEntryId, "c3");
  assert.equal(view.derivedResearchState.researchOverlay.loopTargetEntryId, "c3");
});
