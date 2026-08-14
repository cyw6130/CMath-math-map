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

test("recovers from initial schema error via 1-shot retry with a single clean repair prompt", async () => {
  let callCount = 0;
  const observedMessages = [];
  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);
    if (callCount === 1) {
      const badMap = {
        projectTitle: "Draft Paper",
        mainTargetEntryId: "e1",
        b0ClaimEntryIds: [],
        entries: [{ id: "e1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Def", sourceLocator: "p#1" }],
        inferences: [{ operationKind: "proof", premises: ["e1"], conclusion: "missing_thm", argument: "Arg", sourceLocator: "p#1" }],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(badMap) } }] }),
      };
    } else {
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
    }
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

  assert.equal(callCount, 2);
  assert.equal(observedMessages.length, 2);
  // Second call must be a single user message without assistant '{}'
  assert.equal(observedMessages[1].length, 1);
  assert.equal(observedMessages[1][0].role, "user");
  assert.match(observedMessages[1][0].content, /【重要修复要求】/u);
  assert.match(observedMessages[1][0].content, /引用了不存在的 conclusion/u);
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
    /已重试 1 次/u
  );
  assert.equal(persistentBadCount, 2); // Exactly 1 retry before failing closed
});

test("extraction prompt includes explicit proof-to-Claim and Fact/Claim boundaries", () => {
  const prompt = paperImportClient.extractionPrompt({
    fileName: "geometry.pdf",
    pageCount: 5,
    text: "Theorem 1.1: Let X be smooth...",
  });

  // (1) proof concludes only an entryClass=claim Entry
  assert.match(prompt, /proof 的结论（conclusion）只能是 entryClass=claim 的 Entry/u);
  // (2) definition/algorithm/calculation are Facts and cannot be proof conclusions
  assert.match(prompt, /definition\/algorithm\/calculation 属于 Fact，绝不能作为 proof 的结论/u);
  // (3) if the paper proves a named lemma/proposition/theorem, extract that statement as a Claim and point the proof to it
  assert.match(prompt, /若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim/u);
  // (4) if a supposed relation concludes a Fact, omit that relation unless it is an actual Fact-to-Fact organization relation
  assert.match(prompt, /若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系/u);
  // (5) do not encode derivation, relatedness, reading order, or section flow as Inference
  assert.match(prompt, /严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference/u);
  // (6) does NOT artificially cap at 20 entries, prefers completeness of explicit/named mathematical objects and external invoked results
  assert.doesNotMatch(prompt, /最多 20 个 Entry/u);
  assert.match(prompt, /优先保证明确\/命名数学对象与外部调用结果的完整性/u);
  // (7) requires mainTargetEntryId
  assert.match(prompt, /mainTargetEntryId/u);
  // (8) strengthened B0 instruction: inventory external results without inventing book pages
  assert.match(prompt, /清点论文在论证中实际调用的每一个外部定理\/引理\/命题/u);
  assert.match(prompt, /严禁臆造外部书籍的具体页码/u);
  // (9) display label format requirement
  assert.match(prompt, /displayLabel 必须符合 '<类型> · <正整数> · <数学短名>'/u);
});

test("recovers from proof-to-Fact error on 1-shot retry with actionable proof-to-Claim repair prompt", async () => {
  let callCount = 0;
  const observedMessages = [];
  const observedAuth = [];

  const fetchImpl = async (url, options) => {
    callCount += 1;
    observedAuth.push(options.headers.Authorization);
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);

    if (callCount === 1) {
      // Model incorrectly emits a proof whose conclusion is a definition (Fact)
      const invalidProofToFact = {
        projectTitle: "Topological Invariants",
        mainTargetEntryId: "paper:def:manifold",
        b0ClaimEntryIds: [],
        entries: [
          { id: "paper:def:manifold", entryClass: "fact", factKind: "definition", title: "Definition 1", statement: "Let $M$ be a manifold.", sourceLocator: "geometry.pdf#page=1" },
          { id: "paper:fact:calc", entryClass: "fact", factKind: "calculation", title: "Calculation 2", statement: "Euler characteristic is zero.", sourceLocator: "geometry.pdf#page=2" },
        ],
        inferences: [
          {
            operationKind: "proof",
            premises: ["paper:def:manifold"],
            conclusion: "paper:fact:calc",
            argument: "Direct computation follows from definition.",
            sourceLocator: "geometry.pdf#page=2",
          },
        ],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(invalidProofToFact) } }] }),
      };
    } else {
      // Model corrects the error: extracts the proved statement as a Claim and points proof to it
      const correctedProofToClaim = {
        projectTitle: "Topological Invariants",
        mainTargetEntryId: "paper:claim:euler",
        b0ClaimEntryIds: [],
        entries: [
          { id: "paper:def:manifold", entryClass: "fact", factKind: "definition", title: "Definition 1", statement: "Let $M$ be a manifold.", sourceLocator: "geometry.pdf#page=1" },
          { id: "paper:claim:euler", entryClass: "claim", claimKind: "theorem", title: "Theorem 2", statement: "Euler characteristic of $M$ is zero.", sourceLocator: "geometry.pdf#page=2" },
        ],
        inferences: [
          {
            operationKind: "proof",
            premises: ["paper:def:manifold"],
            conclusion: "paper:claim:euler",
            argument: "By integration of curvature over $M$, Euler characteristic vanishes.",
            sourceLocator: "geometry.pdf#page=2",
          },
        ],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(correctedProofToClaim) } }] }),
      };
    }
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "secret-key-123",
    model: "deepseek-chat",
    fileName: "geometry.pdf",
    pageCount: 3,
    text: "[[PAGE 1]]\nDefinition 1\n[[PAGE 2]]\nTheorem 2",
    fetchImpl,
  });

  assert.equal(callCount, 2);
  assert.equal(observedMessages.length, 2);

  // First prompt is the initial extraction prompt
  assert.equal(observedMessages[0].length, 1);
  assert.equal(observedMessages[0][0].role, "user");

  // Second prompt contains the repair diagnostic and actionable proof-to-Claim guidance
  assert.equal(observedMessages[1].length, 1);
  assert.equal(observedMessages[1][0].role, "user");
  const secondPrompt = observedMessages[1][0].content;
  assert.match(secondPrompt, /【重要修复要求】/u);
  assert.match(secondPrompt, /proof 必须以 Claim 为结论/u);
  assert.match(secondPrompt, /【修复指引】/u);
  assert.match(secondPrompt, /proof 的结论（conclusion）只能是 entryClass=claim/u);
  assert.match(secondPrompt, /definition\/algorithm\/calculation 属于 Fact/u);

  // Resulting view is valid and proof concludes a Claim
  assert.equal(view.entries.length, 2);
  assert.equal(view.inferences.length, 1);
  assert.equal(view.inferences[0].operationKind, "proof");
  assert.equal(view.inferences[0].conclusion, "paper:claim:euler");

  // Auth header contains key, no leakage in payload or returned view
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
  assert.equal(calls.length, 1);
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
  assert.equal(callCount, 1);
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

test("recovers from unmatched math delimiter error on 1-shot retry with actionable repair prompt", async () => {
  let callCount = 0;
  const observedMessages = [];

  const fetchImpl = async (url, options) => {
    callCount += 1;
    const body = JSON.parse(options.body);
    observedMessages.push(body.messages);

    if (callCount === 1) {
      // First attempt outputs an unmatched dollar delimiter
      const badMap = {
        projectTitle: "Hopf Paper",
        mainTargetEntryId: "paper:thm:hopf",
        b0ClaimEntryIds: [],
        entries: [
          { id: "paper:def:deg", entryClass: "fact", factKind: "definition", title: "映射度", statement: "设 $f: M \\to S^k$。", sourceLocator: "p#1" },
          { id: "paper:thm:hopf", entryClass: "claim", claimKind: "theorem", title: "Hopf 度定理", statement: "当流形维数满足  < k$ 时同伦群平凡。", sourceLocator: "p#2" },
        ],
        inferences: [
          { operationKind: "proof", premises: ["paper:def:deg"], conclusion: "paper:thm:hopf", argument: "由度为零推出。", sourceLocator: "p#2" },
        ],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(badMap) } }] }),
      };
    } else {
      // Second attempt repairs the unmatched delimiter
      const goodMap = {
        projectTitle: "Hopf Paper",
        mainTargetEntryId: "paper:thm:hopf",
        b0ClaimEntryIds: [],
        entries: [
          { id: "paper:def:deg", entryClass: "fact", factKind: "definition", title: "映射度", statement: "设 $f: M \\to S^k$。", sourceLocator: "p#1" },
          { id: "paper:thm:hopf", entryClass: "claim", claimKind: "theorem", title: "Hopf 度定理", statement: "当流形维数满足 $m < k$ 时同伦群平凡。", sourceLocator: "p#2" },
        ],
        inferences: [
          { operationKind: "proof", premises: ["paper:def:deg"], conclusion: "paper:thm:hopf", argument: "由度为零推出。", sourceLocator: "p#2" },
        ],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(goodMap) } }] }),
      };
    }
  };

  const view = await paperImportClient.requestPaperProjectView({
    endpoint: "https://api.deepseek.com/v1",
    apiKey: "test-key-abc",
    model: "deepseek-chat",
    fileName: "hopf.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition\n[[PAGE 2]]\nTheorem",
    fetchImpl,
  });

  assert.equal(callCount, 2);
  assert.equal(observedMessages.length, 2);
  const secondPrompt = observedMessages[1][0].content;
  assert.match(secondPrompt, /【重要修复要求】/u);
  assert.match(secondPrompt, /包含未配对的数学公式定界符/u);
  assert.match(secondPrompt, /【修复指引】/u);
  assert.match(secondPrompt, /必须成对闭合/u);
  assert.equal(view.entries[1].statement, "当流形维数满足 $m < k$ 时同伦群平凡。");
});
