/*
 * MinerU 精准解析结果 → Paper Import marked Markdown。
 *
 * This file intentionally has no browser, Node, PDF.js, or ZIP dependency.  It
 * is the small, deterministic boundary between a downloaded MinerU result and
 * the already-frozen Paper Import workflow.
 */
(function publishMineruMarkedMarkdown(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMineruMarkedMarkdown = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createMineruMarkedMarkdown() {
  "use strict";

  const PAGE_MARKER = /\[\[PAGE\s+\d+\]\]/gu;

  function fail(message) {
    const error = new Error(`MinerU marked Markdown: ${message}`);
    error.code = "MINERU_MARKED_MARKDOWN_INVALID";
    throw error;
  }

  function nonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) fail(`${label} 必须是非空文本`);
    return value;
  }

  function parseJson(value, label) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      fail(`${label} 不是有效 JSON：${error.message}`);
    }
  }

  function unwrapContentList(value) {
    const parsed = parseJson(value, "content_list.json");
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== "object") fail("content_list.json 必须是数组或包含数组的对象");
    const candidates = [parsed.content_list, parsed.contentList, parsed.data, parsed.items, parsed.result];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object") {
        const nested = candidate.content_list ?? candidate.contentList ?? candidate.items ?? candidate.result;
        if (Array.isArray(nested)) return nested;
      }
    }
    fail("content_list.json 没有可用的内容块数组");
  }

  function normalizeNewlines(value) {
    return value.replace(/\r\n?/gu, "\n");
  }

  function stripExistingPageMarkers(value) {
    // A retry may receive a previously marked artifact.  Rebuilding from the
    // content list is deterministic and avoids duplicated anchors.
    return value
      .replace(/^[ \t]*\[\[PAGE\s+\d+\]\][ \t]*(?:\n|$)/gmu, "");
  }

  function normalizeForMatch(value) {
    let normalized = String(value).normalize ? String(value).normalize("NFKC") : String(value);
    normalized = normalizeNewlines(normalized);
    return normalized.replace(/\s+/gu, " ").trim();
  }

  function findExact(source, candidate, from) {
    const needle = candidate.trim();
    if (!needle) return null;
    const start = source.indexOf(needle, from);
    return start < 0 ? null : { start, end: start + needle.length };
  }

  function findWhitespaceInsensitive(source, candidate, from) {
    const needle = normalizeForMatch(candidate);
    if (!needle) return null;

    // Build a normalized source with a mapping back to the original offsets.
    // Keeping the mapping makes the insertion point refer to full.md rather
    // than to a lossy normalized copy.
    let normalized = "";
    const starts = [];
    const ends = [];
    let pendingWhitespace = false;
    let pendingStart = -1;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (/\s/u.test(char)) {
        if (!pendingWhitespace) pendingStart = index;
        pendingWhitespace = true;
        continue;
      }
      if (pendingWhitespace && normalized) {
        normalized += " ";
        starts.push(pendingStart);
        ends.push(index);
      }
      pendingWhitespace = false;
      normalized += char.normalize ? char.normalize("NFKC") : char;
      starts.push(index);
      ends.push(index + 1);
    }
    const normalizedFrom = (() => {
      for (let index = 0; index < starts.length; index += 1) {
        if (starts[index] >= from) return index;
      }
      return starts.length;
    })();
    const found = normalized.indexOf(needle, normalizedFrom);
    if (found < 0) return null;
    const endIndex = found + needle.length - 1;
    if (endIndex >= ends.length) return null;
    return { start: starts[found], end: ends[endIndex] };
  }

  function expandMarkdownBlockStart(source, location) {
    const lineStart = source.lastIndexOf("\n", Math.max(0, location.start - 1)) + 1;
    const prefix = source.slice(lineStart, location.start);
    const trimmed = prefix.trim();
    if (
      /^#{1,6}\s*$/u.test(trimmed)
      || /^[-*+]\s*$/u.test(trimmed)
      || /^\d+[.)]\s*$/u.test(trimmed)
      || /^>\s*$/u.test(trimmed)
      || /^!\[[^\]]*\]\([^)]*$/u.test(trimmed)
    ) return { ...location, start: lineStart };
    const previousLineEnd = lineStart > 0 ? lineStart - 1 : -1;
    const previousLineStart = previousLineEnd >= 0
      ? source.lastIndexOf("\n", Math.max(0, previousLineEnd - 1)) + 1
      : 0;
    const previousLine = previousLineEnd >= 0 ? source.slice(previousLineStart, previousLineEnd).trim() : "";
    if (/^(?:```|~~~)/u.test(previousLine)) return { ...location, start: previousLineStart };
    return location;
  }

  function blockAnchorCandidates(block) {
    if (!block || typeof block !== "object" || Array.isArray(block)) return [];
    const candidates = [];
    const add = (value) => {
      if (typeof value === "string" && value.trim() && !candidates.includes(value)) candidates.push(value);
    };

    const type = String(block.type ?? "").toLowerCase();
    // For visual blocks, full.md normally emits the image before any
    // collapsed caption/content.  Prefer that path so the page marker lands
    // at the beginning of the block rather than after its details.
    if (["image", "chart", "table", "equation"].includes(type)) {
      add(block.img_path);
      add(block.image_path);
      add(block.imagePath);
      add(block.path);
    }

    // Text is the authoritative content-list anchor.  Other fields cover the
    // image/table shapes used by MinerU's precise parser.
    add(block.text);
    add(block.content);
    add(block.markdown);
    add(block.latex);
    add(block.table_body);
    add(block.tableBody);
    add(block.code_body);
    add(block.codeBody);
    add(block.img_path);
    add(block.image_path);
    add(block.imagePath);
    add(block.path);
    for (const value of [block.image_caption, block.image_footnote, block.table_caption, block.table_footnote, block.code_caption, block.list_items]) {
      if (Array.isArray(value)) value.forEach(add);
      else add(value);
    }

    // Image blocks commonly contain only a path while full.md uses a Markdown
    // image label.  The path itself is enough to locate that block safely.
    for (const value of [...candidates]) {
      const slash = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
      if (slash >= 0) add(value.slice(slash + 1));
    }
    return candidates;
  }

  function isNonMarkdownAuxiliary(block) {
    return ["header", "footer", "page_number", "aside_text", "page_footnote"].includes(String(block?.type ?? "").toLowerCase());
  }

  function findBlock(source, block, from) {
    for (const candidate of blockAnchorCandidates(block)) {
      const exact = findExact(source, candidate, from);
      if (exact) return expandMarkdownBlockStart(source, exact);
      const tolerant = findWhitespaceInsensitive(source, candidate, from);
      if (tolerant) return expandMarkdownBlockStart(source, tolerant);
    }
    return null;
  }

  function pageIndexOf(block, index) {
    const value = block?.page_idx ?? block?.pageIndex;
    if (!Number.isInteger(value) || value < 0) {
      fail(`content block ${index} 缺少有效的 0-based page_idx`);
    }
    return value;
  }

  function buildMarkedMarkdown(input, contentListArg, options = {}) {
    let fullMarkdown;
    let contentList;
    let pageCount;
    if (typeof input === "string") {
      fullMarkdown = input;
      contentList = contentListArg;
      pageCount = options?.pageCount;
    } else if (input && typeof input === "object") {
      fullMarkdown = input.fullMarkdown ?? input.fullMd ?? input.full_md ?? input.markdown;
      contentList = input.contentList ?? input.content_list ?? input.contentListJson ?? input.content_list_json;
      pageCount = input.pageCount ?? input.page_count;
    }
    nonEmptyString(fullMarkdown, "full.md");
    const source = stripExistingPageMarkers(normalizeNewlines(fullMarkdown)).trim();
    if (!source) fail("full.md 不能为空");
    const blocks = unwrapContentList(contentList);
    if (!blocks.length) fail("content_list.json 不能为空");

    const normalizedPageCount = pageCount === undefined || pageCount === null ? null : Number(pageCount);
    if (normalizedPageCount !== null && (!Number.isInteger(normalizedPageCount) || normalizedPageCount <= 0)) {
      fail("pageCount 必须是正整数");
    }

    let cursor = 0;
    let previousPage = -1;
    let lastLocatedPage = -1;
    const insertions = [];
    let locatedBlocks = 0;
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const page = pageIndexOf(block, index);
      if (page < previousPage) fail(`content blocks 的 page_idx 必须按顺序递增：第 ${index + 1} 块回退到 ${page}`);
      if (page > previousPage + 1) {
        fail(`无法可靠定位第 ${previousPage + 2} 页：content blocks 跳过了 page_idx ${previousPage + 1}`);
      }
      if (normalizedPageCount !== null && page >= normalizedPageCount) {
        fail(`content block ${index} 的 page_idx ${page} 超出 pageCount ${normalizedPageCount}`);
      }

      const location = findBlock(source, block, cursor);
      if (!location) {
        // MinerU VLM content_list may retain headers/footers/page numbers that
        // are intentionally absent from full.md.  They cannot anchor a page,
        // so ignore only this documented auxiliary set; every substantive
        // block still has to be located or the conversion fails closed.
        if (isNonMarkdownAuxiliary(block)) continue;
        fail(`无法在 full.md 中定位第 ${index + 1} 个内容块（page_idx=${page}）；拒绝猜测页锚`);
      }
      locatedBlocks += 1;
      if (page !== previousPage) {
        if (page !== lastLocatedPage + 1) {
          fail(`第 ${page + 1} 页没有可靠的顺序锚点`);
        }
        insertions.push({ offset: location.start, page: page + 1 });
        lastLocatedPage = page;
      }
      cursor = location.end;
      previousPage = page;
    }
    if (!locatedBlocks || lastLocatedPage < 0) fail("没有可定位的内容块");
    if (normalizedPageCount !== null && lastLocatedPage !== normalizedPageCount - 1) {
      fail(`无法可靠定位全部页面：最后可定位页为 ${lastLocatedPage + 1}，预期 ${normalizedPageCount}`);
    }

    let marked = source;
    for (let index = insertions.length - 1; index >= 0; index -= 1) {
      const insertion = insertions[index];
      marked = `${marked.slice(0, insertion.offset)}[[PAGE ${insertion.page}]]\n${marked.slice(insertion.offset)}`;
    }
    return marked;
  }

  return Object.freeze({
    PAGE_MARKER: "[[PAGE N]]",
    buildMarkedMarkdown,
  });
});
