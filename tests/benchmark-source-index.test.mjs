import assert from "node:assert/strict";
import test from "node:test";

import {
  BENCHMARK_SOURCE_INDEX_ERROR_CODES,
  buildBenchmarkSourceIndex,
  BenchmarkSourceIndexError,
  selectBenchmarkSource,
} from "../scripts/benchmark-source-index.mjs";

const MARKDOWN = [
  "[[PAGE 1]]",
  "# Introduction",
  "The opening formula is $x^2 + y^2$.",
  "",
  "[[PAGE 2]]",
  "## Main theorem",
  "The theorem uses $$a^2+b^2=c^2$$.",
  "",
  "[[PAGE 3]]",
  "## Appendix",
  "A final heading is preserved.",
  "",
].join("\n");

test("builds a deterministic page and heading index without rewriting marked Markdown", () => {
  const index = buildBenchmarkSourceIndex({
    sourceIdentity: "source:test:001",
    markdown: MARKDOWN,
  });

  assert.equal(index.sourceIdentity, "source:test:001");
  assert.equal(index.markdown, MARKDOWN);
  assert.deepEqual(index.pages.map(({ page }) => page), [1, 2, 3]);
  assert.deepEqual(index.sections.map(({ title }) => title), [
    "Introduction",
    "Main theorem",
    "Appendix",
  ]);
  assert.equal(index.sections[1].page, 2);
  assert.equal(MARKDOWN.slice(index.pages[1].start, index.pages[1].end), "[[PAGE 2]]\n## Main theorem\nThe theorem uses $$a^2+b^2=c^2$$.\n\n");
  assert.equal(Object.isFrozen(index), true);
  assert.equal(Object.isFrozen(index.pages), true);
  assert.equal(Object.isFrozen(index.sections), true);
});

test("quick selection returns only lexical-hit pages with one adjacent page of context", () => {
  const markdown = [
    "[[PAGE 1]]\nUnrelated first page.\n",
    "\n[[PAGE 2]]\nAdjacent before.\n",
    "\n[[PAGE 3]]\nNeedle appears with $x^2$.\n",
    "\n[[PAGE 4]]\nAdjacent after.\n",
    "\n[[PAGE 5]]\nUnrelated last page.\n",
  ].join("");
  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:quick", markdown });
  const selection = selectBenchmarkSource({
    tier: "quick",
    index,
    queries: ["NEEDLE"],
  });

  assert.equal(selection.mode, "affected-windows");
  assert.equal(selection.tier, "quick");
  assert.deepEqual(selection.pages, [2, 3, 4]);
  assert.equal(selection.markdown, [2, 3, 4].map((page) => {
    const record = index.pages.find((candidate) => candidate.page === page);
    return markdown.slice(record.start, record.end);
  }).join(""));
  assert.match(selection.markdown, /Needle appears with \$x\^2\$\./u);
  assert.doesNotMatch(selection.markdown, /Unrelated first page|Unrelated last page/u);
});

test("quick selection retrieves wording variants and never sends an empty local source", () => {
  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:wording", markdown: MARKDOWN });
  const wordingVariant = selectBenchmarkSource({
    tier: "quick",
    index,
    queries: ["A theorem derives the Pythagorean conclusion"],
  });
  const noLexicalMatch = selectBenchmarkSource({
    tier: "quick",
    index,
    queries: ["zyxwv completely absent vocabulary"],
  });

  assert.ok(wordingVariant.pages.includes(2));
  assert.match(wordingVariant.markdown, /Main theorem/u);
  assert.ok(noLexicalMatch.pages.length > 0);
  assert.ok(noLexicalMatch.markdown.length > 0);
});

test("candidate selection expands a lexical difference to its heading section only", () => {
  const markdown = [
    "[[PAGE 1]]\n# Introduction\nBackground.\n",
    "\n[[PAGE 2]]\n## Target section\nNeedle appears here.\n",
    "\n[[PAGE 3]]\nTarget section continues with $$x+y$$.\n",
    "\n[[PAGE 4]]\n## Other section\nUnrelated material.\n",
    "\n[[PAGE 5]]\n# Appendix\nMore unrelated material.\n",
  ].join("");
  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:candidate", markdown });
  const selection = selectBenchmarkSource({
    tier: "candidate",
    index,
    queries: ["needle"],
  });

  const target = index.sections.find(({ title }) => title === "Target section");
  assert.equal(selection.mode, "relevant-sections");
  assert.deepEqual(selection.sections.map(({ id }) => id), [target.id]);
  assert.deepEqual(selection.sectionIds, [target.id]);
  assert.deepEqual(selection.locators, [{ page: 2, heading: "Target section" }]);
  assert.deepEqual(selection.pages, [2, 3]);
  assert.equal(selection.markdown, markdown.slice(target.start, target.end));
  assert.doesNotMatch(selection.markdown, /Background|Unrelated material|More unrelated material/u);
});

test("final and disputed selections return the exact entire original source", () => {
  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:final", markdown: MARKDOWN });
  const finalSelection = selectBenchmarkSource({ tier: "final", index });
  const disputedSelection = selectBenchmarkSource({ tier: "candidate", index, disputed: true });

  assert.equal(finalSelection.mode, "full-source");
  assert.equal(finalSelection.markdown, MARKDOWN);
  assert.deepEqual(finalSelection.pages, [1, 2, 3]);
  assert.equal(disputedSelection.mode, "source-dispute-fallback");
  assert.equal(disputedSelection.markdown, MARKDOWN);
  assert.deepEqual(disputedSelection.pages, [1, 2, 3]);
});

test("selection envelopes are stable and deeply frozen for equivalent hints and queries", () => {
  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:stable", markdown: MARKDOWN });
  const first = selectBenchmarkSource({
    tier: "quick",
    index,
    queries: ["THEOREM", "introduction", "theorem"],
    pageHints: [2, 1, 2],
  });
  const second = selectBenchmarkSource({
    tier: "quick",
    index,
    queries: ["introduction", "THEOREM"],
    pageHints: [1, 2],
  });

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.windows), true);
  assert.equal(Object.isFrozen(first.windows[0]), true);
  assert.equal(Object.isFrozen(first.queryHits), true);
  assert.equal(Object.isFrozen(first.queryHits[0]), true);
});

test("source indexing and selection expose stable explicit input error codes", () => {
  assert.throws(
    () => buildBenchmarkSourceIndex({ sourceIdentity: "  ", markdown: MARKDOWN }),
    (error) => error instanceof BenchmarkSourceIndexError
      && error.code === BENCHMARK_SOURCE_INDEX_ERROR_CODES.SOURCE_IDENTITY_INVALID,
  );
  assert.throws(
    () => buildBenchmarkSourceIndex({ sourceIdentity: "source:test:error", markdown: "plain text" }),
    (error) => error.code === BENCHMARK_SOURCE_INDEX_ERROR_CODES.MARKDOWN_INVALID,
  );
  assert.throws(
    () => buildBenchmarkSourceIndex({
      sourceIdentity: "source:test:error",
      markdown: "[[PAGE 2]]\nB\n\n[[PAGE 1]]\nA\n",
    }),
    (error) => error.code === BENCHMARK_SOURCE_INDEX_ERROR_CODES.MARKDOWN_NON_CANONICAL,
  );

  const index = buildBenchmarkSourceIndex({ sourceIdentity: "source:test:error", markdown: MARKDOWN });
  assert.throws(
    () => selectBenchmarkSource({ tier: "unknown", index }),
    (error) => error.code === BENCHMARK_SOURCE_INDEX_ERROR_CODES.TIER_INVALID,
  );
  assert.throws(
    () => selectBenchmarkSource({ tier: "quick", index, pageHints: [99] }),
    (error) => error.code === BENCHMARK_SOURCE_INDEX_ERROR_CODES.PAGE_HINT_OUT_OF_RANGE,
  );
});
