import assert from "node:assert/strict";
import test from "node:test";

import paperImportClient from "../paper-import-client.js";
import previewLoader from "../generic-math-map-preview-loader.js";
import contentLoader from "../math-map-content-loader.js";
import projectAdapter from "../math-map-project-adapter.js";

const rawMap = {
  projectTitle: "A Paper",
  entries: [
    { id: "paper:definition:x", entryClass: "fact", factKind: "definition", shortTitle: "X", title: "Definition of X", statement: "$X$ is fixed.", sourceLocator: "paper.pdf#page=1" },
    { id: "paper:theorem:y", entryClass: "claim", claimKind: "theorem", shortTitle: "Y", title: "Theorem Y", statement: "$X$ implies $Y$.", sourceLocator: "paper.pdf#page=2" },
  ],
  inferences: [
    { id: "paper:proof:y", operationKind: "proof", shortTitle: "Proof of Y", title: "Proof of Theorem Y", statement: "Apply the definition.", premises: ["paper:definition:x"], conclusion: "paper:theorem:y", argument: "The defining property gives $Y$.", sourceLocator: "paper.pdf#page=2" },
  ],
};

test("normalizes secure OpenAI-compatible endpoints", () => {
  assert.equal(paperImportClient.endpointUrl("https://api.deepseek.com/v1"), "https://api.deepseek.com/v1/chat/completions");
  assert.equal(paperImportClient.endpointUrl("https://api.deepseek.com/v1/chat/completions"), "https://api.deepseek.com/v1/chat/completions");
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

test("builds a Gamma-native candidate Project View", () => {
  const view = paperImportClient.candidateProjectView(rawMap, { fileName: "paper.pdf" });
  assert.equal(view.schema, "cmath.project-view-model/v0.1");
  assert.equal(view.semanticModel, "cmath.fact-claim-operation/v0.1");
  assert.equal(view.entries.length, 0);
  assert.equal(view.candidateEntries.length, 2);
  assert.equal(view.candidateInferences[0].operationKind, "proof");
  assert.equal(view.candidateEntries[0].governanceState, "external_import");
  assert.equal(view.derivedResearchState.researchOverlay.loopTargetEntryId, "paper:theorem:y");
});

test("loads the exported candidate view through the existing map integration", () => {
  const view = paperImportClient.candidateProjectView(rawMap, { fileName: "paper.pdf" });
  const prepared = previewLoader.prepare(view, { loader: contentLoader, adapter: projectAdapter });
  assert.equal(prepared.definition.projectId, view.project.id);
  assert.deepEqual(prepared.model.classificationDiagnostics.issues, []);
  assert.deepEqual(prepared.model.factEntryIds, ["paper:definition:x"]);
  assert.deepEqual(prepared.model.claimEntryIds, ["paper:theorem:y"]);
});

test("rejects broken inference references", () => {
  const broken = structuredClone(rawMap);
  broken.inferences[0].premises = ["missing"];
  assert.throws(() => paperImportClient.candidateProjectView(broken), /不存在的 premise/u);
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
  const view = await paperImportClient.requestCandidateProjectView({
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
