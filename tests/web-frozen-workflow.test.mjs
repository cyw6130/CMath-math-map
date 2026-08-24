import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = (await import("node:module")).createRequire(import.meta.url);
const client = require("../paper-import-client.js");

const FROZEN_ENTRY = "paper-entry-parallel-extraction-v1.31";
const FROZEN_INFERENCE_RUNTIME = "v3.45";

function mkFetch(options = {}) {
  const state = { calls: [], ...options };
  const impl = async (url, init) => {
    const body = JSON.parse(init.body);
    const content = body.messages?.[0]?.content ?? "";
    state.calls.push(content);
    if (state.failExtract && content.includes("[[PAGE 1]]")) {
      return new Response("{ broken json", { status: 200 });
    }
    // Extraction windows: dual-output prompt from pool v1.31.
    if (content.includes("[[PAGE") && content.includes("Foundation Entries")) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          foundationEntries: [
            { id: "def:space", type: "definition", name: "空间", statement: "空间 $X$ 的定义。", page: 1 },
          ],
          resultEntries: [
            { id: "thm:main", type: "theorem", name: "主定理", statement: "$\\phi: X \\to Y$ 是同构。", page: 2 },
          ],
          inferenceHints: [],
        }) } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    // Inference assembly stage.
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        projectTitle: "Frozen Workflow Paper",
        project: { id: "cmath:project:paper:frozen", title: "Frozen Workflow Paper" },
        mainTargetEntryId: "thm:main",
        b0: [],
        inferences: [
          {
            conclusion: "thm:main",
            operationKind: "proof",
            premises: ["def:space"],
            argument: "显然。",
            sourceLocator: "test.pdf#page=2",
            page: 2,
          },
        ],
      }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  impl.state = state;
  return impl;
}

const BASE_ARGS = {
  endpoint: "https://example.invalid/v1/chat/completions",
  apiKey: "k-test",
  model: "gpt-5.6-luna",
  providerLabel: "Test",
  fileName: "test.pdf",
  pageCount: 2,
  text: "[[PAGE 1]]\n定义了空间。\n\n[[PAGE 2]]\n定理：映射是同构。",
};

test("client exports frozen workflow runtime constants (V4.1)", () => {
  assert.equal(client.FROZEN_WORKFLOW.label, "V4.1");
  assert.equal(client.FROZEN_WORKFLOW.entryExtractionVersion, FROZEN_ENTRY);
  assert.equal(client.FROZEN_WORKFLOW.inferenceRuntimeVersion, FROZEN_INFERENCE_RUNTIME);
});

test("web import routes through frozen V4.1 pipeline (no legacy integrate stage)", async () => {
  const fetchImpl = mkFetch();
  const stages = [];
  const view = await client.requestPaperProjectView({
    ...BASE_ARGS,
    fetchImpl,
    onStage: (stage, info) => stages.push({ stage, info }),
  });

  assert.equal(view.mainTargetEntryId, "thm:main");
  const frozenEvent = stages.find((s) => s.stage === "frozen-workflow");
  assert.ok(frozenEvent, "must announce frozen-workflow routing");
  assert.equal(frozenEvent.info.entryExtractionVersion, FROZEN_ENTRY);
  assert.equal(frozenEvent.info.inferenceRuntimeVersion, FROZEN_INFERENCE_RUNTIME);

  // Exactly one extraction window call + one assembly call: the legacy
  // integrateEntries round-trip is gone.
  assert.ok(fetchImpl.state.calls.length >= 2, "at least extract + assemble");
  const integrateCall = fetchImpl.state.calls.find((c) => c.includes("整合"));
  assert.equal(integrateCall, undefined, "legacy integrateEntries stage must be removed");

  // Extraction windows use the pool v1.31 dual-output prompt; assembly
  // prompts also embed [[PAGE]] text, so discriminate on the lane marker.
  const extractCalls = fetchImpl.state.calls.filter((c) => c.includes("Foundation Entries"));
  const assembleCalls = fetchImpl.state.calls.filter((c) => !c.includes("Foundation Entries"));
  assert.ok(extractCalls.length >= 1, "extraction window call must occur");
  assert.ok(assembleCalls.length >= 1, "assembly call must occur");
  for (const c of extractCalls) {
    assert.match(c, /entryClass 只能是 fact\|claim/u);
    assert.match(c, /factKind 只能是 definition\|algorithm\|calculation/u);
    assert.match(c, /claimKind 只能是 lemma\|proposition\|theorem/u);
    assert.doesNotMatch(c, /"type"\s*:/u);
    assert.ok(!c.includes("|corollary"), "frozen entry prompt must not allow corollary claimKind");
  }
});

test("pipeline failure surfaces loudly instead of falling back to legacy path", async () => {
  const fetchImpl = mkFetch({ failExtract: true });
  await assert.rejects(
    client.requestPaperProjectView({ ...BASE_ARGS, fetchImpl }),
    (error) => Boolean(error) && !String(error?.message ?? "").includes("回退"),
  );
});

test("index.html loads UMD modules required by the frozen pipeline", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const idxOf = (name) => html.indexOf(`src="${name}"`);
  const clientIdx = idxOf("paper-import-client.js");
  for (const mod of ["paper-raw-entry-pool-v1.js", "src/paper-import/entry/consolidation.js", "paper-entry-artifact-v1.js"]) {
    const i = idxOf(mod);
    assert.ok(i > 0, `${mod} must be referenced by index.html`);
    assert.ok(i < clientIdx, `${mod} must load before paper-import-client.js`);
  }
});
