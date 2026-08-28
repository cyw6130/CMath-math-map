import { createHash } from "node:crypto";

import { normalizeMarkedMarkdown } from "./freeze-benchmark-sources.mjs";

export const BENCHMARK_SOURCE_INDEX_SCHEMA = "cmath.benchmark-source-index/v0.1";
export const BENCHMARK_SOURCE_SELECTION_SCHEMA = "cmath.benchmark-source-selection/v0.1";

export const BENCHMARK_SOURCE_TIERS = Object.freeze({
  QUICK: "quick",
  CANDIDATE: "candidate",
  FINAL: "final",
});

export const BENCHMARK_SOURCE_SELECTION_MODES = Object.freeze({
  QUICK: "affected-windows",
  CANDIDATE: "relevant-sections",
  FINAL: "full-source",
  DISPUTED: "source-dispute-fallback",
});

export const BENCHMARK_SOURCE_INDEX_ERROR_CODES = Object.freeze({
  INPUT_INVALID: "BENCHMARK_SOURCE_INDEX_INPUT_INVALID",
  SOURCE_IDENTITY_INVALID: "BENCHMARK_SOURCE_INDEX_SOURCE_IDENTITY_INVALID",
  MARKDOWN_INVALID: "BENCHMARK_SOURCE_INDEX_MARKDOWN_INVALID",
  MARKDOWN_NON_CANONICAL: "BENCHMARK_SOURCE_INDEX_MARKDOWN_NON_CANONICAL",
  INDEX_INVALID: "BENCHMARK_SOURCE_INDEX_INVALID",
  TIER_INVALID: "BENCHMARK_SOURCE_INDEX_TIER_INVALID",
  QUERY_INVALID: "BENCHMARK_SOURCE_INDEX_QUERY_INVALID",
  PAGE_HINT_INVALID: "BENCHMARK_SOURCE_INDEX_PAGE_HINT_INVALID",
  PAGE_HINT_OUT_OF_RANGE: "BENCHMARK_SOURCE_INDEX_PAGE_HINT_OUT_OF_RANGE",
});

export class BenchmarkSourceIndexError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BenchmarkSourceIndexError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new BenchmarkSourceIndexError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function compareNumbers(left, right) {
  return left - right;
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalSelectionIdentity(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function lineRecords(markdown) {
  const records = [];
  let start = 0;
  for (const line of markdown.split("\n")) {
    const end = start + line.length;
    records.push({ start, end, line });
    start = end + 1;
  }
  return records;
}

function pageRecords(markdown) {
  const marker = /^\[\[PAGE\s+(\d+)\]\]$/gmu;
  const matches = [...markdown.matchAll(marker)];
  return matches.map((match, index) => {
    const start = match.index;
    const markerEnd = start + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    const bodyStart = markdown[markerEnd] === "\n" ? markerEnd + 1 : markerEnd;
    const bodyEnd = end;
    return {
      page: Number(match[1]),
      start,
      end,
      markerStart: start,
      markerEnd,
      bodyStart,
      bodyEnd,
    };
  });
}

function headingRecords(markdown, pages) {
  const records = lineRecords(markdown);
  const headings = [];
  let fenced = false;
  let fenceCharacter = "";
  let fenceLength = 0;

  for (const record of records) {
    const fence = /^\s*(`{3,}|~{3,})/u.exec(record.line);
    if (fence) {
      const character = fence[1][0];
      if (!fenced) {
        fenced = true;
        fenceCharacter = character;
        fenceLength = fence[1].length;
      } else if (character === fenceCharacter && fence[1].length >= fenceLength) {
        fenced = false;
      }
      continue;
    }
    if (fenced) continue;

    const heading = /^(#{1,6})[ \t]+(.+?)\s*$/u.exec(record.line);
    if (!heading) continue;
    const page = pages.find((candidate) => record.start >= candidate.start && record.start < candidate.end);
    headings.push({
      level: heading[1].length,
      title: heading[2].trim(),
      start: record.start,
      headingEnd: record.end,
      page: page?.page ?? null,
    });
  }

  return headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const nextPage = next && pages.find(({ page }) => page === next.page);
    const end = next
      ? (next.page !== heading.page && nextPage ? nextPage.start : next.start)
      : markdown.length;
    const page = pages.find((candidate) => heading.start >= candidate.start && heading.start < candidate.end);
    const endPage = pages.find((candidate) => Math.max(heading.start, end - 1) >= candidate.start
      && Math.max(heading.start, end - 1) < candidate.end);
    return {
      id: `section-${index + 1}`,
      level: heading.level,
      title: heading.title,
      page: page?.page ?? heading.page,
      endPage: endPage?.page ?? page?.page ?? heading.page,
      start: heading.start,
      end,
      headingStart: heading.start,
      headingEnd: heading.headingEnd,
    };
  });
}

function validateBuildInput(options) {
  if (!isRecord(options)) {
    fail(BENCHMARK_SOURCE_INDEX_ERROR_CODES.INPUT_INVALID, "source index options must be an object");
  }
  if (!nonemptyString(options.sourceIdentity)) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.SOURCE_IDENTITY_INVALID,
      "sourceIdentity must be a non-empty string",
      { field: "sourceIdentity" },
    );
  }
  if (typeof options.markdown !== "string" || options.markdown.length === 0) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.MARKDOWN_INVALID,
      "markdown must be a non-empty string",
      { field: "markdown" },
    );
  }
}

export function buildBenchmarkSourceIndex(options) {
  validateBuildInput(options);

  let normalized;
  try {
    normalized = normalizeMarkedMarkdown(options.markdown);
  } catch (error) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.MARKDOWN_INVALID,
      "markdown must contain continuous canonical [[PAGE N]] markers",
      { field: "markdown", cause: error?.message },
    );
  }
  if (normalized.markdown !== options.markdown) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.MARKDOWN_NON_CANONICAL,
      "markdown must already be canonical normalized marked Markdown",
      { field: "markdown" },
    );
  }

  const pages = pageRecords(options.markdown);
  const sections = headingRecords(options.markdown, pages);
  return deepFreeze({
    schema: BENCHMARK_SOURCE_INDEX_SCHEMA,
    sourceIdentity: options.sourceIdentity,
    markdown: options.markdown,
    pages,
    sections,
  });
}

const VALID_TIERS = new Set(Object.values(BENCHMARK_SOURCE_TIERS));

function validateSelectionInput(options) {
  if (!isRecord(options)) {
    fail(BENCHMARK_SOURCE_INDEX_ERROR_CODES.INPUT_INVALID, "source selection options must be an object");
  }
  if (!VALID_TIERS.has(options.tier)) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.TIER_INVALID,
      "tier must be quick, candidate, or final",
      { field: "tier", tier: options.tier },
    );
  }
  if (!isRecord(options.index)
    || options.index.schema !== BENCHMARK_SOURCE_INDEX_SCHEMA
    || !nonemptyString(options.index.sourceIdentity)
    || typeof options.index.markdown !== "string"
    || !Array.isArray(options.index.pages)
    || !Array.isArray(options.index.sections)) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INDEX_INVALID,
      "index must be a Benchmark Source Index returned by buildBenchmarkSourceIndex",
      { field: "index" },
    );
  }
  validateIndex(options.index);
  if (options.queries !== undefined && !Array.isArray(options.queries)) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.QUERY_INVALID,
      "queries must be an array",
      { field: "queries" },
    );
  }
  if (options.pageHints !== undefined && !Array.isArray(options.pageHints)) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.PAGE_HINT_INVALID,
      "pageHints must be an array",
      { field: "pageHints" },
    );
  }
  if (options.disputed !== undefined && typeof options.disputed !== "boolean") {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INPUT_INVALID,
      "disputed must be a boolean",
      { field: "disputed" },
    );
  }
}

function normalizeQueries(queries) {
  const values = queries ?? [];
  const normalized = [];
  for (const query of values) {
    if (typeof query !== "string") {
      fail(
        BENCHMARK_SOURCE_INDEX_ERROR_CODES.QUERY_INVALID,
        "queries must contain only strings",
        { field: "queries", query },
      );
    }
    const clean = query.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
    if (clean) normalized.push(clean);
  }
  return [...new Set(normalized)].sort(compareStrings);
}

function normalizePageHints(pageHints, pages) {
  const values = pageHints ?? [];
  const maxPage = pages.at(-1)?.page ?? 0;
  const normalized = [];
  for (const hint of values) {
    const page = typeof hint === "number" && Number.isInteger(hint)
      ? hint
      : (typeof hint === "string" && /^\d+$/u.test(hint.trim()) ? Number(hint.trim()) : NaN);
    if (!Number.isInteger(page) || page < 1) {
      fail(
        BENCHMARK_SOURCE_INDEX_ERROR_CODES.PAGE_HINT_INVALID,
        "pageHints must contain positive integer page numbers",
        { field: "pageHints", pageHint: hint },
      );
    }
    if (page > maxPage || !pages.some((record) => record.page === page)) {
      fail(
        BENCHMARK_SOURCE_INDEX_ERROR_CODES.PAGE_HINT_OUT_OF_RANGE,
        `page hint is outside the indexed source: ${page}`,
        { field: "pageHints", page },
      );
    }
    normalized.push(page);
  }
  return [...new Set(normalized)].sort(compareNumbers);
}

function sameLocatorArrays(actual, expected, fields) {
  return actual.length === expected.length && actual.every((record, index) => (
    fields.every((field) => record?.[field] === expected[index]?.[field])
  ));
}

function validateIndex(index) {
  let normalized;
  try {
    normalized = normalizeMarkedMarkdown(index.markdown);
  } catch {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INDEX_INVALID,
      "index markdown is not valid marked Markdown",
      { field: "index.markdown" },
    );
  }
  if (normalized.markdown !== index.markdown) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INDEX_INVALID,
      "index markdown is not canonical normalized marked Markdown",
      { field: "index.markdown" },
    );
  }
  const expectedPages = pageRecords(index.markdown);
  if (!sameLocatorArrays(index.pages, expectedPages, [
    "page", "start", "end", "markerStart", "markerEnd", "bodyStart", "bodyEnd",
  ])) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INDEX_INVALID,
      "index page locators do not match its markdown",
      { field: "index.pages" },
    );
  }
  const expectedSections = headingRecords(index.markdown, expectedPages);
  if (!sameLocatorArrays(index.sections, expectedSections, [
    "id", "level", "title", "page", "endPage", "start", "end", "headingStart", "headingEnd",
  ])) {
    fail(
      BENCHMARK_SOURCE_INDEX_ERROR_CODES.INDEX_INVALID,
      "index heading locators do not match its markdown",
      { field: "index.sections" },
    );
  }
}

function queryHits(index, queries) {
  const source = index.markdown.toLowerCase();
  const hits = [];
  for (const query of queries) {
    const needle = query.toLowerCase();
    const queryHits = [];
    let from = 0;
    while (from < source.length) {
      const offset = source.indexOf(needle, from);
      if (offset < 0) break;
      const page = index.pages.find((record) => offset >= record.start && offset < record.end);
      if (page) queryHits.push({ query, matchedText: needle, page: page.page, offset });
      from = offset + Math.max(needle.length, 1);
    }
    if (queryHits.length === 0) {
      const terms = [...new Set(needle.match(/[\p{L}\p{N}][\p{L}\p{N}_'-]{2,}/gu) ?? [])]
        .filter((term) => !new Set([
          "and", "are", "for", "from", "into", "that", "the", "then", "this", "with",
        ]).has(term))
        .sort((left, right) => right.length - left.length || compareStrings(left, right))
        .slice(0, 8);
      for (const term of terms) {
        let termFrom = 0;
        while (termFrom < source.length) {
          const offset = source.indexOf(term, termFrom);
          if (offset < 0) break;
          const page = index.pages.find((record) => offset >= record.start && offset < record.end);
          if (page) queryHits.push({ query, matchedText: term, page: page.page, offset });
          termFrom = offset + term.length;
        }
      }
    }
    hits.push(...queryHits);
  }
  return hits.sort((left, right) => (
    left.offset - right.offset
    || compareStrings(left.query, right.query)
    || compareStrings(left.matchedText, right.matchedText)
  ));
}

function expandPages(pages, pageRecordsList) {
  const available = new Set(pageRecordsList.map(({ page }) => page));
  const expanded = new Set();
  for (const page of pages) {
    for (const candidate of [page - 1, page, page + 1]) {
      if (available.has(candidate)) expanded.add(candidate);
    }
  }
  return [...expanded].sort(compareNumbers);
}

function coalesceIntervals(intervals) {
  const ordered = [...intervals].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged = [];
  for (const interval of ordered) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
      continue;
    }
    merged.push({ ...interval });
  }
  return merged;
}

function pagesCoveredByIntervals(index, intervals) {
  return index.pages
    .filter((page) => intervals.some((interval) => interval.start < page.end && interval.end > page.start))
    .map(({ page }) => page);
}

function sectionForOffset(index, offset) {
  return index.sections
    .filter((section) => offset >= section.start && offset < section.end)
    .sort((left, right) => (
      left.end - left.start - (right.end - right.start)
      || right.level - left.level
      || left.start - right.start
    ))[0];
}

function sectionsForPage(index, pageNumber) {
  const page = index.pages.find(({ page: value }) => value === pageNumber);
  if (!page) return [];
  const matching = index.sections.filter((section) => section.start < page.end && section.end > page.start);
  if (!matching.length) return [];
  const deepestLevel = Math.max(...matching.map(({ level }) => level));
  return matching.filter(({ level }) => level === deepestLevel);
}

function candidateSectionSelection(index, hits, pageHints) {
  const byId = new Map();
  for (const hit of hits) {
    const section = sectionForOffset(index, hit.offset);
    if (section) byId.set(section.id, section);
  }
  for (const page of pageHints) {
    for (const section of sectionsForPage(index, page)) byId.set(section.id, section);
  }
  return [...byId.values()].sort((left, right) => left.start - right.start || compareStrings(left.id, right.id));
}

function selectionEnvelope({
  index,
  tier,
  mode,
  pages,
  sections = [],
  intervals,
  queryHits: hits,
  pageHints,
  queries,
}) {
  const pageIntervals = (pages ?? []).map((page) => {
    const record = index.pages.find((candidate) => candidate.page === page);
    return { kind: "page", page, start: record.start, end: record.end };
  });
  const rawIntervals = intervals ?? pageIntervals;
  const windows = coalesceIntervals(rawIntervals).map((interval) => ({
    ...interval,
    markdown: index.markdown.slice(interval.start, interval.end),
  }));
  const selectedPages = pages ?? pagesCoveredByIntervals(index, windows);
  const markdown = windows.map((window) => window.markdown).join("");
  const sectionIds = sections.map(({ id }) => id);
  const locators = sections.length
    ? sections.map((section) => ({ page: section.page, heading: section.title }))
    : windows.map((window) => ({ page: window.page }));
  const selectionIdentity = canonicalSelectionIdentity({
    sourceIdentity: index.sourceIdentity,
    tier,
    mode,
    pages: selectedPages,
    sections,
    queryHits: hits,
    pageHints,
    queries,
  });
  return deepFreeze({
    schema: BENCHMARK_SOURCE_SELECTION_SCHEMA,
    sourceIdentity: index.sourceIdentity,
    tier,
    mode,
    markdown,
    pages: selectedPages,
    sections,
    sectionIds,
    locators,
    windows,
    queryHits: hits,
    pageHints,
    queries,
    selectionIdentity,
  });
}

export function selectBenchmarkSource(options) {
  validateSelectionInput(options);
  const { index, tier } = options;
  const queries = normalizeQueries(options.queries);
  const pageHints = normalizePageHints(options.pageHints, index.pages);
  const hits = queryHits(index, queries);
  if (options.disputed === true || tier === BENCHMARK_SOURCE_TIERS.FINAL) {
    const pages = index.pages.map(({ page }) => page);
    return selectionEnvelope({
      index,
      tier,
      mode: options.disputed === true
        ? BENCHMARK_SOURCE_SELECTION_MODES.DISPUTED
        : BENCHMARK_SOURCE_SELECTION_MODES.FINAL,
      pages,
      queryHits: hits,
      pageHints,
      queries,
    });
  }
  let affectedPages = [
    ...pageHints,
    ...hits.map(({ page }) => page),
  ];
  if (affectedPages.length === 0 && index.pages.length > 0) {
    affectedPages = [index.pages[0].page];
  }
  if (tier === BENCHMARK_SOURCE_TIERS.CANDIDATE) {
    const sections = candidateSectionSelection(index, hits, pageHints);
    if (sections.length) {
      return selectionEnvelope({
        index,
        tier,
        mode: BENCHMARK_SOURCE_SELECTION_MODES.CANDIDATE,
        sections,
        intervals: sections.map((section) => ({
          kind: "section",
          sectionId: section.id,
          level: section.level,
          title: section.title,
          start: section.start,
          end: section.end,
        })),
        queryHits: hits,
        pageHints,
        queries,
      });
    }
  }
  const pages = expandPages(affectedPages, index.pages);
  return selectionEnvelope({
    index,
    tier,
    mode: BENCHMARK_SOURCE_SELECTION_MODES.QUICK,
    pages,
    queryHits: hits,
    pageHints,
    queries,
  });
}
