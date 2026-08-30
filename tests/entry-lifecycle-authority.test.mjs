import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import client from "../paper-import-client.js";
import entryModule from "../src/paper-import/entry/index.js";
import canonicalArtifact from "../src/paper-import/entry/artifact.js";
import legacyArtifact from "../paper-entry-artifact-v1.js";

test("Entry Module owns extraction, review patches, and artifact creation", () => {
  for (const name of [
    "entryReviewPrompt",
    "applyEntryReviewPatches",
    "requestPaperEntryArtifact",
  ]) {
    assert.equal(typeof entryModule[name], "function");
    assert.strictEqual(client[name], entryModule[name]);
  }
  for (const name of ["createPaperEntryArtifact", "validatePaperEntryArtifact"]) {
    assert.strictEqual(entryModule[name], canonicalArtifact[name]);
    assert.strictEqual(legacyArtifact[name], canonicalArtifact[name]);
  }
});

test("browser pages load the complete Entry Module before the client", () => {
  const orderedScripts = [
    "src/paper-import/entry/artifact.js",
    "paper-entry-artifact-v1.js",
    "src/paper-import/entry/lifecycle.js",
    "src/paper-import/entry/consolidation.js",
    "src/paper-import/entry/verification.js",
    "src/paper-import/entry/index.js",
    "paper-import-client.js",
  ];
  for (const page of ["index.html", "index-v5.html"]) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    let previous = -1;
    for (const script of orderedScripts) {
      const current = html.indexOf(`<script src="${script}`);
      assert.ok(current > previous, `${script} keeps dependency order in ${page}`);
      previous = current;
    }
  }
});

test("public extraction applies the shared source-grounded review rules", async () => {
  const responses = [
    { sections: [], symbols: [], leads: [{ id: "lead-1", title: "定义", pages: [1] }] },
    {},
    { entries: [{ id: "def:x", type: "definition", name: "对象 X", statement: "定义 $X$。", page: 1 }] },
    { entries: [] },
    { entries: [{ id: "def:x", type: "definition", name: "对象 X", statement: "定义 $X$。", page: 1 }] },
    { patches: [{ action: "add", entry: { id: "thm:no-source", type: "theorem", name: "无来源定理", statement: "结论成立。" } }] },
  ];
  let call = 0;
  const artifact = await client.requestPaperEntryArtifact({
    fileName: "source-grounded.pdf",
    pageCount: 1,
    text: "[[PAGE 1]]\n定义 X。",
    chatImpl: async () => ({ content: JSON.stringify(responses[call++]) }),
  });

  assert.deepEqual(artifact.entries.map((entry) => entry.id), ["def:x"]);
  assert.equal(artifact.diagnostics.reviewDiagnostics.appliedCount, 0);
  assert.equal(artifact.diagnostics.reviewDiagnostics.rejectedCount, 1);
});
