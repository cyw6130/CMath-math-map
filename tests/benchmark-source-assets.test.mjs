import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NORMALIZATION_VERSION,
  computeSourceIdentity,
  freezeSources,
  normalizeBenchmarkSource,
  normalizeMarkedMarkdown,
} from "../scripts/freeze-benchmark-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "benchmarks/paper-import/source-manifest.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const ACTIVE_CASES = [
  "hopf-degree-theorem",
  "knot-hopf-rt",
  "4-dim-skein-modules-handles-tangles",
  "cornered-skein-lasagna-theory",
  "yasui-2019-geometrically-simply-connected-4-manifolds",
];

test("marked Markdown normalization is deterministic, idempotent, and preserves math plus headings", () => {
  const input = "\u0000[[PAGE 2]]\r\n## Result\r\n$y=x^2$\r\n\r\n[[PAGE 1]]\r\n# Title\r\n$$x$$\u0001";
  const first = normalizeMarkedMarkdown(input);
  const second = normalizeMarkedMarkdown(first.markdown);
  assert.equal(first.markdown, second.markdown);
  assert.deepEqual(first.pages, [1, 2]);
  assert.deepEqual(first.cleaningActions, [
    "normalize-newlines",
    "remove-control-characters:2",
    "reorder-page-blocks",
    "canonicalize-page-block-spacing",
  ]);
  assert.match(first.markdown, /^\[\[PAGE 1\]\]\n# Title/mu);
  assert.match(first.markdown, /\$\$x\$\$/u);
  assert.match(first.markdown, /\[\[PAGE 2\]\]\n## Result/mu);
  assert.match(first.markdown, /\$y=x\^2\$/u);
  assert.doesNotMatch(first.markdown, /[\u0000\u0001]/u);
});

test("source identity changes with PDF, Markdown, MinerU, or normalization identity", () => {
  const base = {
    pdfSha256: "a".repeat(64),
    markdownSha256: "b".repeat(64),
    mineruVersion: "legacy-export/unknown",
    normalizationVersion: NORMALIZATION_VERSION,
    pageBoundaries: [1, 2],
    cleaningActions: ["canonicalize-page-block-spacing"],
  };
  const identity = computeSourceIdentity(base);
  assert.equal(identity.length, 64);
  for (const [field, value] of [
    ["pdfSha256", "c".repeat(64)],
    ["markdownSha256", "d".repeat(64)],
    ["mineruVersion", "mineru-v2"],
    ["normalizationVersion", "normalization-v2"],
    ["pageBoundaries", [1, 2, 3]],
    ["cleaningActions", ["different-cleaning-action"]],
  ]) {
    assert.notEqual(computeSourceIdentity({ ...base, [field]: value }), identity);
  }
});

test("Yasui legacy controls and swapped page blocks normalize correctly in one pass", () => {
  const legacy = [
    "[[PAGE 1]]",
    "# Title",
    "\u000f The submanifold W is a test.",
    "An .\u0000n/–framed knot.",
    ...Array.from({ length: 11 }, (_, index) => `[[PAGE ${index + 2}]]\nPage ${index + 2}`),
    "[[PAGE 14]]",
    "[26] D Kotschick",
    "[[PAGE 13]]",
    "[35] H Sasahira",
  ].join("\n");
  const normalized = normalizeBenchmarkSource(
    "yasui-2019-geometrically-simply-connected-4-manifolds",
    legacy,
  );
  assert.match(normalized.markdown, /^\[\[PAGE 1\]\][\s\S]*^- The submanifold W is/mu);
  assert.match(normalized.markdown, /\.-n\/–framed knot/u);
  assert.match(normalized.markdown, /\[\[PAGE 12\]\][\s\S]*\[26\] D Kotschick[\s\S]*\[\[PAGE 13\]\]\n\[35\] H Sasahira[\s\S]*\[\[PAGE 14\]\]\n$/u);
  assert.ok(normalized.cleaningActions.includes("repair-yasui-control-characters"));
  assert.ok(normalized.cleaningActions.includes("repair-yasui-final-page-boundaries"));
  assert.equal(normalizeBenchmarkSource(
    "yasui-2019-geometrically-simply-connected-4-manifolds",
    normalized.markdown,
  ).markdown, normalized.markdown);
});

test("source manifest freezes exactly five active in-repo marked Markdown assets", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(freezeSources(), manifest, "tracked assets must reproduce the frozen manifest exactly");
  assert.equal(manifest.schema, "cmath.paper-source-manifest/v2");
  assert.deepEqual(manifest.activeCases.map((item) => item.caseId), ACTIVE_CASES);
  assert.deepEqual(manifest.retiredCases.map((item) => item.caseId), ["kirby-2018-trisections"]);

  for (const record of manifest.activeCases) {
    assert.equal(record.normalization.version, NORMALIZATION_VERSION);
    assert.equal(record.mineru.version, "legacy-export/unknown");
    assert.match(record.sourcePdf.sha256, /^[a-f0-9]{64}$/u);
    assert.match(record.markedMarkdown.sha256, /^[a-f0-9]{64}$/u);
    assert.match(record.sourceIdentitySha256, /^[a-f0-9]{64}$/u);
    assert.ok(!path.isAbsolute(record.markedMarkdown.path));
    assert.doesNotMatch(record.markedMarkdown.path, /(?:^|\/)tmp(?:\/|$)/u);

    const assetPath = path.join(root, record.markedMarkdown.path);
    const bytes = fs.readFileSync(assetPath);
    const markdown = bytes.toString("utf8");
    const normalized = normalizeMarkedMarkdown(markdown);
    assert.equal(normalized.markdown, markdown, `${record.caseId} must already be normalized`);
    assert.equal(bytes.length, record.markedMarkdown.bytes);
    assert.equal(sha256(bytes), record.markedMarkdown.sha256);
    assert.equal(normalized.pages.length, record.pageCount);
    assert.deepEqual(normalized.pages, Array.from({ length: record.pageCount }, (_, index) => index + 1));
    assert.ok((markdown.match(/^#{1,6}\s+/gmu) ?? []).length > 0, `${record.caseId} keeps headings`);
    assert.ok((markdown.match(/\$\$?|\\\[|\\\(/gu) ?? []).length > 0, `${record.caseId} keeps formulas`);
    assert.doesNotMatch(markdown, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u);
    if (record.caseId === "yasui-2019-geometrically-simply-connected-4-manifolds") {
      assert.match(markdown, /^- The submanifold W is/mu);
      assert.match(markdown, /^- Y admits a Riemannian metric/mu);
      assert.match(markdown, /^- The inclusion-induced homomorphism/mu);
      assert.match(markdown, /\.-n\/–framed knot/u);
      assert.match(markdown, /\[\[PAGE 12\]\][\s\S]*\[34\] J Rasmussen[\s\S]*\[\[PAGE 13\]\]\n\[35\] H Sasahira/u);
      assert.match(markdown, /Revised: 15 February 2019\n\n\[\[PAGE 14\]\]\n$/u);
    }
    assert.equal(computeSourceIdentity({
      pdfSha256: record.sourcePdf.sha256,
      markdownSha256: record.markedMarkdown.sha256,
      mineruVersion: record.mineru.version,
      normalizationVersion: record.normalization.version,
      pageBoundaries: normalized.pages,
      cleaningActions: record.normalization.cleaningActions,
    }), record.sourceIdentitySha256);
  }
});
