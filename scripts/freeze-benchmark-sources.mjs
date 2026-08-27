#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NORMALIZATION_VERSION = "cmath.marked-markdown-normalization/v1";
export const MINERU_VERSION = "legacy-export/unknown";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "benchmarks/paper-import/source-manifest.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const ACTIVE_SOURCES = Object.freeze([
  {
    caseId: "hopf-degree-theorem",
    sourcePdfPath: "/Users/chenyuwen/Desktop/PDF/hopf map.pdf",
    sourcePdfSha256: "f1e48afdbdd029d965e38aaa6b15211d049a33a148c21d34f621c48f8620911b",
    markedMarkdownPath: "benchmarks/paper-import/mineru-extracted/hopf-degree-theorem/hopf-marked.md",
    cleaningActions: ["canonicalize-page-block-spacing"],
  },
  {
    caseId: "knot-hopf-rt",
    sourcePdfPath: "/Users/chenyuwen/Desktop/Knot_hopf_alg&quantum_invs/RT.pdf",
    sourcePdfSha256: "ff72f37c5be8a72f1ad9dc0988ace1c6da44333bf7771c2d58c05eb26ae6c4e4",
    markedMarkdownPath: "benchmarks/paper-import/mineru-extracted/knot-hopf-rt/rt-marked.md",
    cleaningActions: ["canonicalize-page-block-spacing"],
  },
  {
    caseId: "4-dim-skein-modules-handles-tangles",
    sourcePdfPath: "/Users/chenyuwen/Desktop/PDF/4-DIMENSIONAL SKEIN MODULES, HANDLE ATTACHMENTS, AND TANGLES.pdf",
    sourcePdfSha256: "c2a5eb78918c1b55551bbb8bff5ecbe8eb25a930b7277d4d769f736c01b28e1a",
    markedMarkdownPath: "benchmarks/paper-import/mineru-extracted/4-dim-skein-modules-handles-tangles/skein1-marked.md",
    cleaningActions: ["canonicalize-page-block-spacing"],
  },
  {
    caseId: "cornered-skein-lasagna-theory",
    sourcePdfPath: "/Users/chenyuwen/Desktop/PDF/CORNERED SKEIN LASAGNA THEORY.pdf",
    sourcePdfSha256: "a61ff0d04cbd115996a00e571b6666146d13b64b02a1dbb934d8c7b7032d849f",
    markedMarkdownPath: "benchmarks/paper-import/mineru-extracted/cornered-skein-lasagna-theory/skein2-marked.md",
    cleaningActions: ["canonicalize-page-block-spacing"],
  },
  {
    caseId: "yasui-2019-geometrically-simply-connected-4-manifolds",
    sourcePdfPath: "/Users/chenyuwen/Desktop/PDF/文章1.pdf",
    sourcePdfSha256: "311439b9cfa6e78cca7dbba6e8868ee4451511003a3e398dbfb1285db6bc414b",
    markedMarkdownPath: "benchmarks/paper-import/mineru-extracted/yasui-2019/yasui-marked.md",
    cleaningActions: [
      "repair-yasui-control-characters:4",
      "repair-yasui-final-page-boundaries",
      "canonicalize-page-block-spacing",
    ],
  },
]);

function unique(values) {
  return [...new Set(values)];
}

export function normalizeMarkedMarkdown(value) {
  const input = String(value ?? "");
  const cleaningActions = [];
  let clean = input.replace(/^\uFEFF/u, "");
  const normalizedNewlines = clean.replace(/\r\n?/gu, "\n");
  if (normalizedNewlines !== clean) cleaningActions.push("normalize-newlines");
  clean = normalizedNewlines;

  let controlCount = 0;
  clean = clean.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, () => {
    controlCount += 1;
    return "";
  });
  if (controlCount) cleaningActions.push(`remove-control-characters:${controlCount}`);

  const marker = /^\[\[PAGE\s+(\d+)\]\][ \t]*$/gmu;
  const matches = [...clean.matchAll(marker)];
  if (!matches.length) throw new Error("marked Markdown 缺少 [[PAGE N]] 页码标记");
  if (clean.slice(0, matches[0].index).trim()) throw new Error("第一页标记前存在非空内容");

  const blocks = matches.map((match, index) => ({
    page: Number(match[1]),
    body: clean.slice(match.index + match[0].length, matches[index + 1]?.index ?? clean.length).trim(),
  }));
  const pages = blocks.map((block) => block.page);
  if (new Set(pages).size !== pages.length || pages.some((page) => !Number.isInteger(page) || page < 1)) {
    throw new Error("marked Markdown 页码必须是唯一的正整数");
  }
  const expected = Array.from({ length: Math.max(...pages) }, (_, index) => index + 1);
  if (expected.some((page) => !pages.includes(page))) throw new Error("marked Markdown 页码不连续");
  if (pages.some((page, index) => page !== expected[index])) cleaningActions.push("reorder-page-blocks");

  blocks.sort((left, right) => left.page - right.page);
  const markdown = `${blocks.map((block) => (
    block.body ? `[[PAGE ${block.page}]]\n${block.body}` : `[[PAGE ${block.page}]]`
  )).join("\n\n")}\n`;
  if (markdown !== clean) cleaningActions.push("canonicalize-page-block-spacing");
  return { markdown, pages: expected, cleaningActions };
}

export function computeSourceIdentity({
  pdfSha256,
  markdownSha256,
  mineruVersion,
  normalizationVersion,
  pageBoundaries = [],
  cleaningActions = [],
}) {
  return sha256(JSON.stringify({
    pdfSha256,
    markdownSha256,
    mineruVersion,
    normalizationVersion,
    pageBoundaries,
    cleaningActions,
  }));
}

function repairYasuiPageOrder(markdown) {
  const page12 = markdown.indexOf("[[PAGE 12]]");
  const page13 = markdown.indexOf("[[PAGE 13]]");
  const page14 = markdown.indexOf("[[PAGE 14]]");
  if (page12 < 0 || page13 < 0 || page14 < 0) return markdown;

  if (page14 < page13) {
    const beforePage14 = markdown.slice(0, page14);
    const misplacedPage12Tail = markdown.slice(page14 + "[[PAGE 14]]".length, page13).trim();
    const page13Body = markdown.slice(page13 + "[[PAGE 13]]".length).trim();
    if (/^\[26\]\s+D Kotschick/mu.test(misplacedPage12Tail)
      && /^\[35\]\s+H Sasahira/mu.test(page13Body)) {
      return `${beforePage14}${misplacedPage12Tail}\n\n[[PAGE 13]]\n${page13Body}\n\n[[PAGE 14]]\n`;
    }
  }

  if (page13 < page14) {
    const beforePage13 = markdown.slice(0, page13);
    const body13 = markdown.slice(page13 + "[[PAGE 13]]".length, page14).trim();
    const body14 = markdown.slice(page14 + "[[PAGE 14]]".length).trim();
    if (/^\[26\]\s+D Kotschick/mu.test(body13)
      && /^\[35\]\s+H Sasahira/mu.test(body14)) {
      return `${beforePage13}${body13}\n\n[[PAGE 13]]\n${body14}\n\n[[PAGE 14]]\n`;
    }
    if (/^\[35\]\s+H Sasahira/mu.test(body13)
      && /^\[26\]\s+D Kotschick/mu.test(body14)) {
      return `${beforePage13}${body14}\n\n[[PAGE 13]]\n${body13}\n\n[[PAGE 14]]\n`;
    }
  }
  return markdown;
}

function repairYasuiControlCharacters(markdown) {
  return markdown
    .replace(/^\u000f?\s*The submanifold W is/mu, "- The submanifold W is")
    .replace(/^\u000f?\s*Y admits a Riemannian metric/mu, "- Y admits a Riemannian metric")
    .replace(/^\u000f?\s*The inclusion-induced homomorphism/mu, "- The inclusion-induced homomorphism")
    .replace(/\.\u0000?n\/–framed knot/gu, ".-n/–framed knot");
}

export function normalizeBenchmarkSource(caseId, markdown) {
  const isYasui = caseId === "yasui-2019-geometrically-simply-connected-4-manifolds";
  const repairedControls = isYasui ? repairYasuiControlCharacters(markdown) : markdown;
  const sourceActions = repairedControls === markdown ? [] : ["repair-yasui-control-characters"];
  const normalized = normalizeMarkedMarkdown(repairedControls);
  if (!isYasui) return normalized;
  const repairedPages = repairYasuiPageOrder(normalized.markdown);
  if (repairedPages !== normalized.markdown) sourceActions.push("repair-yasui-final-page-boundaries");
  const final = normalizeMarkedMarkdown(repairedPages);
  return {
    ...final,
    cleaningActions: unique([...sourceActions, ...normalized.cleaningActions, ...final.cleaningActions]),
  };
}

export function freezeSources({ write = false } = {}) {
  const activeCases = ACTIVE_SOURCES.map((source) => {
    const assetPath = path.join(root, source.markedMarkdownPath);
    const input = fs.readFileSync(assetPath, "utf8");
    const normalized = normalizeBenchmarkSource(source.caseId, input);
    if (write) fs.writeFileSync(assetPath, normalized.markdown, "utf8");
    const bytes = Buffer.from(normalized.markdown, "utf8");
    const markdownSha256 = sha256(bytes);
    const sourcePdfSha256 = source.sourcePdfSha256;
    return {
      caseId: source.caseId,
      sourcePdf: { path: source.sourcePdfPath, sha256: sourcePdfSha256 },
      markedMarkdown: {
        path: source.markedMarkdownPath,
        sha256: markdownSha256,
        bytes: bytes.length,
      },
      mineru: { version: MINERU_VERSION },
      normalization: {
        version: NORMALIZATION_VERSION,
        cleaningActions: unique(source.cleaningActions),
      },
      pageCount: normalized.pages.length,
      sourceIdentitySha256: computeSourceIdentity({
        pdfSha256: sourcePdfSha256,
        markdownSha256,
        mineruVersion: MINERU_VERSION,
        normalizationVersion: NORMALIZATION_VERSION,
        pageBoundaries: normalized.pages,
        cleaningActions: source.cleaningActions,
      }),
    };
  });
  const manifest = {
    schema: "cmath.paper-source-manifest/v2",
    activeCases,
    retiredCases: [{
      caseId: "kirby-2018-trisections",
      status: "retired",
      sourcePdf: {
        path: "/Users/chenyuwen/Desktop/PDF/kirby-2018-trisections-of-4-manifolds.pdf",
        sha256: "4eb59288f2eb705a053a58dd5c1353d3696dd7d764445c9ca4d1d230976a87f5",
      },
    }],
  };
  if (write) fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  const manifest = freezeSources({ write });
  process.stdout.write(`${JSON.stringify({ write, cases: manifest.activeCases.length }, null, 2)}\n`);
}
