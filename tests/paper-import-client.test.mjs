import assert from "node:assert/strict";
import test from "node:test";

import paperImportClient from "../paper-import-client.js";
import previewLoader from "../generic-math-map-preview-loader.js";
import contentLoader from "../math-map-content-loader.js";
import projectAdapter from "../math-map-project-adapter.js";
import visualSemantics from "../math-map-visual-semantics.js";

const rawMap = {
  projectTitle: "A Paper",
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
  assert.equal(view.inferences[0].displayLabel, "证明 1");
  assert.equal(view.inferences[0].shortTitle, "证明 · Thm 1");
  assert.equal(view.inferences[0].statement, "By definition, uniqueness holds directly.");
  assert.equal(view.inferences[0].sourcePath, "paper.pdf#page=2");
});

test("avoids ID collisions when generating default inference identifiers", () => {
  const rawWithCollision = {
    projectTitle: "Collision Paper",
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
    entries: [{ entryClass: "fact", factKind: "definition", title: "D", statement: "S", sourceLocator: "p#1" }],
    inferences: [],
  };
  assert.throws(() => paperImportClient.paperProjectView(missingEntryId), /entries\[0\]\.id 必须是非空文本/u);

  const missingEntryLocator = {
    projectTitle: "Bad Entry",
    entries: [{ id: "e1", entryClass: "fact", factKind: "definition", title: "D", statement: "S" }],
    inferences: [],
  };
  assert.throws(() => paperImportClient.paperProjectView(missingEntryLocator), /e1\.sourceLocator 必须是非空文本/u);

  const missingInferenceLocator = {
    projectTitle: "Bad Inference Locator",
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

test("accepts conjecture as a Claim kind and labels it 猜想", () => {
  const raw = {
    projectTitle: "C Paper",
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$ 固定。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:conjecture:c", entryClass: "claim", claimKind: "conjecture", shortTitle: "C", title: "猜想 C", statement: "$C$ 尚未证明。", sourceLocator: "paper.pdf#page=3" },
    ],
    inferences: [],
  };
  const view = paperImportClient.paperProjectView(raw, { fileName: "paper.pdf" });
  const conj = view.entries.find((e) => e.id === "paper:conjecture:c");
  assert.equal(conj.claimKind, "conjecture");
  assert.equal(conj.displayLabel, "猜想 1");
});

test("requests a proof-completion pass when non-conjecture Claims stay open", async () => {
  const openVersion = {
    projectTitle: "P Paper",
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:lemma:l", entryClass: "claim", claimKind: "lemma", shortTitle: "L", title: "引理 L", statement: "$L$。", sourceLocator: "paper.pdf#page=2" },
      { id: "paper:theorem:t", entryClass: "claim", claimKind: "theorem", shortTitle: "T", title: "定理 T", statement: "$T$。", sourceLocator: "paper.pdf#page=3" },
    ],
    inferences: [
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:lemma:l"], conclusion: "paper:theorem:t", argument: "由引理 L 得证。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  const completedVersion = {
    ...openVersion,
    inferences: [
      { id: "paper:proof:l", operationKind: "proof", premises: ["paper:definition:x"], conclusion: "paper:lemma:l", argument: "由定义直接得证。", sourceLocator: "paper.pdf#page=2" },
      { id: "paper:proof:t", operationKind: "proof", premises: ["paper:lemma:l"], conclusion: "paper:theorem:t", argument: "由引理 L 得证。", sourceLocator: "paper.pdf#page=3" },
    ],
  };
  const calls = [];
  const versions = [openVersion, completedVersion];
  const fetchImpl = async (url, init) => {
    calls.push(JSON.parse(init.body));
    const raw = versions[Math.min(calls.length - 1, versions.length - 1)];
    return {
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }),
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
  assert.equal(calls.length, 2);
  assert.ok(stages.includes("closure-repair"));
  assert.match(calls[1].messages[0].content, /证明完整性修复要求/u);
  assert.equal(view.inferences.length, 2);
  const closure = paperImportClient && view.entries
    ? (await import("../math-map-semantics.js")).default.computeClaimClosure(view.entries, view.inferences, {})
    : null;
  assert.equal(closure.claimStates["paper:lemma:l"], "established");
  assert.equal(closure.claimStates["paper:theorem:t"], "established");
});

test("does not run proof-completion when only conjectures remain open", async () => {
  const raw = {
    projectTitle: "Q Paper",
    entries: [
      { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "定义 X", statement: "$X$。", sourceLocator: "paper.pdf#page=1" },
      { id: "paper:conjecture:c", entryClass: "claim", claimKind: "conjecture", shortTitle: "C", title: "猜想 C", statement: "$C$ 未证明。", sourceLocator: "paper.pdf#page=2" },
    ],
    inferences: [],
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
  assert.equal(view.entries.find((e) => e.id === "paper:conjecture:c").claimKind, "conjecture");
});
