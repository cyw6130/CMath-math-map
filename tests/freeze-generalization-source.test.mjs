import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  addCaseToManifest,
  auditGeneralizationAssets,
  buildFrozenGeneralizationCase,
  releaseGeneralizationManifest,
} from "../scripts/freeze-generalization-source.mjs";

const manifest = {
  schema: "cmath.benchmark-generalization-suite/v1",
  status: "assembling",
  plannedDomains: [{ domain: "algebra", minimumActiveCases: 1 }],
  activeCases: [],
};

function frozenCase() {
  return buildFrozenGeneralizationCase({
    caseId: "sample-algebra-paper",
    domain: "algebra",
    title: "Sample Algebra Paper",
    sourceUrl: "https://arxiv.org/pdf/0000.00000",
    pdfBytes: new Uint8Array([37, 80, 68, 70]),
    fullMarkdown: "# Sample\n\nA theorem.\n\nIts proof.",
    contentList: [
      { type: "text", text: "Sample", page_idx: 0 },
      { type: "text", text: "A theorem.", page_idx: 0 },
      { type: "text", text: "Its proof.", page_idx: 1 },
    ],
  });
}

test("MinerU files produce a deterministic, source-addressed generalization record", () => {
  const first = frozenCase();
  assert.deepEqual(first, frozenCase());
  assert.match(first.record.sourceIdentitySha256, /^[a-f0-9]{64}$/u);
  assert.match(first.markedMarkdown, /^\[\[PAGE 1\]\]/u);
  assert.match(first.markedMarkdown, /\[\[PAGE 2\]\]/u);
  assert.equal(first.record.pageCount, 2);
});

test("assembling manifests accept planned domains and reject duplicates", () => {
  const record = frozenCase().record;
  const updated = addCaseToManifest(manifest, record);
  assert.equal(updated.activeCases.length, 1);
  assert.throws(() => addCaseToManifest(updated, record), /already exists/u);
  assert.throws(() => addCaseToManifest(manifest, { ...record, domain: "analysis" }), /not planned/u);
});

test("released suite versions are immutable", () => {
  assert.throws(() => addCaseToManifest({ ...manifest, status: "active" }, frozenCase().record), /immutable/u);
});

test("release audits assets and refuses incomplete domain coverage", (context) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-generalization-test-"));
  context.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const frozen = frozenCase();
  const updated = addCaseToManifest(manifest, frozen.record);
  const assetPath = path.join(temporaryDirectory, frozen.record.markedMarkdown.path);
  fs.mkdirSync(path.dirname(assetPath), { recursive: true });
  fs.writeFileSync(assetPath, frozen.markedMarkdown, "utf8");
  assert.equal(auditGeneralizationAssets(updated, { rootDirectory: temporaryDirectory }).passed, true);
  assert.equal(releaseGeneralizationManifest(updated, { rootDirectory: temporaryDirectory }).status, "active");
  fs.appendFileSync(assetPath, "tampered", "utf8");
  assert.throws(() => auditGeneralizationAssets(updated, { rootDirectory: temporaryDirectory }), /not canonical|digest does not match/u);
});
