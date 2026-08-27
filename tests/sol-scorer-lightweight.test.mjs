import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("prepareSlimCandidate removes bloated source text, chunks text, and diagnostics", () => {
  assert.equal(typeof scorer.prepareSlimCandidate, "function", "prepareSlimCandidate should be exported");
  
  const bloatedCandidate = {
    schema: "cmath.paper-raw-entry-pool/v1",
    extractionModuleVersion: "paper-entry-parallel-extraction-v1.20",
    source: {
      fileName: "paper.pdf",
      pageCount: 15,
      characters: 50000,
      sourceText: "VERY LONG SOURCE TEXT THAT TAKES 30000 TOKENS...".repeat(100),
    },
    chunks: [
      { chunkIndex: 0, text: "BLOCK TEXT...".repeat(50), rawEntries: [] }
    ],
    diagnostics: {
      durationMs: 12000,
      stages: [{ stage: "call-1", debug: "..." }],
      calls: [{ req: "...", res: "..." }]
    },
    rawEntries: [
      { id: "paper:def:1", type: "definition", name: "流形", statement: "定义...", page: 1 }
    ],
    inferenceHints: [
      { premiseRefs: ["paper:def:1"], conclusionRef: "paper:thm:1", relationText: "由定义可知" }
    ]
  };

  const slim = scorer.prepareSlimCandidate(bloatedCandidate);
  
  // Must keep essential math content
  assert.equal(slim.rawEntries.length, 1);
  assert.equal(slim.rawEntries[0].id, "paper:def:1");
  assert.equal(slim.inferenceHints.length, 1);
  assert.equal(slim.schema, "cmath.paper-raw-entry-pool/v1");

  // Must remove bloat
  assert.equal(slim.source?.sourceText, undefined, "sourceText must be stripped");
  assert.equal(slim.chunks, undefined, "chunks text must be stripped");
  assert.equal(slim.diagnostics, undefined, "diagnostics must be stripped");

  const originalSize = JSON.stringify(bloatedCandidate).length;
  const slimSize = JSON.stringify(slim).length;
  assert.ok(slimSize < originalSize * 0.1, `Slim size (${slimSize}) should be < 10% of original (${originalSize})`);
});

test("fixed benchmark cache keys resolve the frozen source identity", () => {
  const identity = scorer.resolveFrozenSourceIdentity({
    rootDir: root,
    caseId: "hopf-map",
    fallbackCaseId: "hopf-degree-theorem",
  });
  assert.match(identity, /^[a-f0-9]{64}$/u);
  assert.equal(scorer.resolveFrozenSourceIdentity({
    rootDir: root,
    caseId: "kirby-2018-trisections",
  }), "", "retired cases are outside the fixed source cache identity set");
});

test("computeScoreCacheKey generates deterministic SHA-256 fingerprint", () => {
  assert.equal(typeof scorer.computeScoreCacheKey, "function", "computeScoreCacheKey should be exported");
  
  const goldText = JSON.stringify({ caseId: "yasui-2019", entries: [] });
  const candText = JSON.stringify({ entries: [{ id: "1" }] });
  const promptText = "PROMPT TEMPLATE";
  const model = "gpt-5.6-sol";
  const reasoning = "medium";
  const sourceIdentity = "e".repeat(64);

  const key1 = scorer.computeScoreCacheKey({ goldText, candText, promptText, model, reasoning, sourceIdentity });
  const key2 = scorer.computeScoreCacheKey({ goldText, candText, promptText, model, reasoning, sourceIdentity });
  const keyDifferentCand = scorer.computeScoreCacheKey({ goldText, candText: '{"entries":[]}', promptText, model, reasoning, sourceIdentity });
  const keyDifferentSource = scorer.computeScoreCacheKey({
    goldText,
    candText,
    promptText,
    model,
    reasoning,
    sourceIdentity: "f".repeat(64),
  });

  assert.equal(typeof key1, "string");
  assert.equal(key1.length, 64, "SHA-256 hash length is 64 hex characters");
  assert.equal(key1, key2, "Same inputs must produce exact same cache key");
  assert.notEqual(key1, keyDifferentCand, "Different candidate must produce different cache key");
  assert.notEqual(key1, keyDifferentSource, "Different frozen source identity must invalidate the score cache");
});
