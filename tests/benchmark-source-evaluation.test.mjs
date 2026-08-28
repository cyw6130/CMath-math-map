import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
  computeBenchmarkSourceEvaluationCacheKey,
  createBenchmarkSourceEvaluationFileCache,
  evaluateBenchmarkSourceSuite,
  evaluateBenchmarkSourceTier,
} from "../scripts/benchmark-source-evaluation.mjs";

const baseIdentity = {
  sourceIdentity: "a".repeat(64),
  benchmarkVersion: "cmath.benchmark/v3",
  workflowVersion: "VNext-paper-to-map/v1",
  scoringContract: "cmath.benchmark-source-assessment/v0.1",
  scorerIdentity: "openai:gpt-5.6-sol:2026-08",
  tier: "quick",
  candidate: { entries: [{ id: "candidate:claim", statement: "A claim." }], inferences: [] },
  reference: { entries: [{ id: "gold:claim", statement: "A claim." }], inferences: [] },
  selectionIdentity: "selection:page-2",
};

test("source evaluation cache identity binds every scoring authority and artifact", () => {
  const first = computeBenchmarkSourceEvaluationCacheKey(baseIdentity);
  const second = computeBenchmarkSourceEvaluationCacheKey(structuredClone(baseIdentity));

  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first, second);
  for (const [field, value] of [
    ["sourceIdentity", "b".repeat(64)],
    ["benchmarkVersion", "cmath.benchmark/v4"],
    ["workflowVersion", "VNext-paper-to-map/v2"],
    ["scoringContract", "cmath.benchmark-source-assessment/v0.2"],
    ["scorerIdentity", "openai:gpt-5.6-sol:2026-09"],
    ["tier", "candidate"],
    ["selectionIdentity", "selection:section-2"],
    ["equivalenceGroups", [{ candidateIds: ["candidate:claim"], referenceIds: ["gold:claim"] }]],
    ["semanticRuntimeIdentity", "sha256:changed-runtime"],
    ["candidate", { entries: [{ id: "candidate:claim", statement: "A changed claim." }], inferences: [] }],
    ["reference", { entries: [{ id: "gold:claim", statement: "A changed Gold." }], inferences: [] }],
  ]) {
    assert.notEqual(
      computeBenchmarkSourceEvaluationCacheKey({ ...baseIdentity, [field]: value }),
      first,
      `${field} must invalidate the cache`,
    );
  }
});

test("persistent cache keeps only evaluation results and lightweight source locators", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-source-evaluation-cache-"));
  const cache = createBenchmarkSourceEvaluationFileCache({ directory });
  const persistedIdentity = {
    sourceIdentity: baseIdentity.sourceIdentity,
    benchmarkVersion: baseIdentity.benchmarkVersion,
    workflowVersion: baseIdentity.workflowVersion,
    scoringContract: baseIdentity.scoringContract,
    scorerIdentity: baseIdentity.scorerIdentity,
    tier: baseIdentity.tier,
    selectionIdentity: baseIdentity.selectionIdentity,
    candidateDigest: "c".repeat(64),
    referenceDigest: "d".repeat(64),
  };
  const cacheKey = computeBenchmarkSourceEvaluationCacheKey(persistedIdentity);

  await cache.set(cacheKey, {
    schema: BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
    cacheKey,
    identity: persistedIdentity,
    sourceAssessment: {
      schema: baseIdentity.scoringContract,
      mode: "automatic",
      sourceIdentity: baseIdentity.sourceIdentity,
      findings: [{
        id: "finding:1",
        objectKind: "entry",
        verdict: "supported",
        candidateObjectIds: ["candidate:claim"],
        goldObjectIds: ["gold:claim"],
        sourceRefs: [
          "paper#page=2",
          "https://storage.example/paper.md?X-Amz-Signature=must-not-persist#page=2",
        ],
        authorization: "Bearer must-not-persist",
      }],
      apiKey: "must-not-persist",
    },
    sourceEvaluation: {
      schema: "cmath.benchmark-source-fidelity-evaluation/v0.1",
      sourceClean: true,
      eligibleForComparison: true,
      coverage: { candidateObjectCount: 1, goldObjectCount: 1, findingCount: 1 },
      coverageRatio: 1,
      omissions: [],
      goldGaps: [],
      distortions: [],
      fabrications: [],
      goldDefects: [],
      unresolvedCandidateObjects: [],
      unresolvedCandidateObjectDetails: [],
      omissions: [{ id: "unsafe", rawSource: "must-not-persist" }],
      rawPrompt: "must-not-persist",
    },
    semanticSummary: { equivalent: true, discrepancyCounts: { unmatchedEntries: 0 } },
    selection: {
      mode: "affected-windows",
      pages: [2],
      sectionIds: ["section:result"],
      locators: [{
        page: 2,
        heading: "Result",
        headers: { authorization: "Bearer must-not-persist" },
        rawPrompt: "must-not-persist",
      }],
      markdown: "full source must-not-persist",
    },
    transport: { authorization: "Bearer must-not-persist" },
  });

  const loaded = await cache.get(cacheKey);
  const raw = fs.readFileSync(path.join(directory, `${cacheKey}.json`), "utf8");
  assert.equal(loaded.cacheKey, cacheKey);
  assert.deepEqual(loaded.selection.pages, [2]);
  assert.deepEqual(loaded.sourceAssessment.findings[0].sourceRefs, [
    "paper#page=2",
    "https://storage.example/paper.md#page=2",
  ]);
  assert.doesNotMatch(raw, /must-not-persist|authorization|apiKey|rawPrompt|full source/iu);
});

test("persistent cache refuses symlink directories", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-source-evaluation-cache-link-"));
  const realDirectory = path.join(parent, "real");
  const linkedDirectory = path.join(parent, "linked");
  fs.mkdirSync(realDirectory);
  fs.symlinkSync(realDirectory, linkedDirectory, "dir");
  const cache = createBenchmarkSourceEvaluationFileCache({ directory: linkedDirectory });

  await assert.rejects(
    cache.get("a".repeat(64)),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_CACHE_INVALID",
  );
});

test("persistent cache rejects a record whose embedded identity does not match its key", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-source-evaluation-cache-"));
  const cache = createBenchmarkSourceEvaluationFileCache({ directory });
  const cacheKey = computeBenchmarkSourceEvaluationCacheKey(baseIdentity);
  const filePath = path.join(directory, `${cacheKey}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    schema: BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
    cacheKey,
    identity: {
      sourceIdentity: "b".repeat(64),
      benchmarkVersion: baseIdentity.benchmarkVersion,
      workflowVersion: baseIdentity.workflowVersion,
      scoringContract: baseIdentity.scoringContract,
      scorerIdentity: baseIdentity.scorerIdentity,
      tier: baseIdentity.tier,
      selectionIdentity: baseIdentity.selectionIdentity,
      candidateDigest: "c".repeat(64),
      referenceDigest: "d".repeat(64),
    },
    sourceAssessment: {},
    sourceEvaluation: {},
    semanticSummary: {},
    selection: {},
  }));

  await assert.rejects(
    cache.get(cacheKey),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_CACHE_INVALID",
  );
});

function strictState(goalStatement) {
  return {
    entries: [
      {
        id: "fact:base",
        entryClass: "fact",
        factKind: "definition",
        title: "Base object",
        statement: "A base object is fixed.",
      },
      {
        id: "claim:boundary",
        entryClass: "claim",
        claimKind: "lemma",
        title: "Boundary lemma",
        statement: "The boundary condition holds.",
      },
      {
        id: "claim:goal",
        entryClass: "claim",
        claimKind: "theorem",
        title: "Main theorem",
        statement: goalStatement,
      },
    ],
    inferences: [{
      id: "proof:goal",
      operationKind: "proof",
      premises: ["fact:base", "claim:boundary"],
      conclusion: "claim:goal",
      argument: "Apply the base construction and boundary lemma.",
    }],
    negationPairs: [],
    b0ClaimEntryIds: ["claim:boundary"],
  };
}

const markedMarkdown = `${[
  "[[PAGE 1]]\n# Paper\nBackground introduction.",
  "[[PAGE 2]]\n## Setup\nA base object is fixed.",
  "[[PAGE 3]]\nThe setup continues with notation $x$.",
  "[[PAGE 4]]\n## Main theorem\nThe strengthened main conclusion follows.",
  "[[PAGE 5]]\nThe proof applies the base construction and boundary lemma.",
  "[[PAGE 6]]\n## Applications\nAn unrelated application.",
  "[[PAGE 7]]\nReferences.",
].join("\n\n")}\n`;

function completeAssessment(sourceIdentity) {
  return {
    schema: "cmath.benchmark-source-assessment/v0.1",
    mode: "automatic",
    sourceIdentity,
    findings: [
      {
        id: "finding:fact",
        objectKind: "entry",
        verdict: "supported",
        candidateObjectIds: ["fact:base"],
        goldObjectIds: ["fact:base"],
        sourceRefs: ["paper#page=2"],
      },
      {
        id: "finding:boundary",
        objectKind: "entry",
        verdict: "supported",
        candidateObjectIds: ["claim:boundary"],
        goldObjectIds: ["claim:boundary"],
        sourceRefs: ["paper#page=5"],
      },
      {
        id: "finding:goal",
        objectKind: "entry",
        verdict: "supported",
        candidateObjectIds: ["claim:goal"],
        goldObjectIds: ["claim:goal"],
        sourceRefs: ["paper#page=4"],
      },
      {
        id: "finding:proof",
        objectKind: "inference",
        verdict: "supported",
        candidateObjectIds: ["proof:goal"],
        goldObjectIds: ["proof:goal"],
        sourceRefs: ["paper#page=5"],
      },
    ],
  };
}

test("quick tier scores affected source windows once and reuses the identity cache", async () => {
  const sourceIdentity = "e".repeat(64);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-source-tier-cache-"));
  const cache = createBenchmarkSourceEvaluationFileCache({ directory });
  const candidate = strictState("The strengthened main conclusion follows.");
  const reference = strictState("The main conclusion follows.");
  const requests = [];
  const scoreSource = async (request) => {
    requests.push(request);
    return {
      sourceAssessment: completeAssessment(sourceIdentity),
      authorization: "Bearer must-not-persist",
    };
  };
  const options = {
    tier: "quick",
    candidate,
    reference,
    sourceIdentity,
    markedMarkdown,
    benchmarkVersion: "cmath.benchmark/v3",
    workflowVersion: "VNext-paper-to-map/v1",
    scoringContract: "cmath.benchmark-source-assessment/v0.1",
    scorerIdentity: "openai:gpt-5.6-sol:2026-08",
    scoreSource,
    cache,
  };

  const first = await evaluateBenchmarkSourceTier(options);
  const second = await evaluateBenchmarkSourceTier(options);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(requests.length, 1, "cache hit must not call the scoring model again");
  assert.equal(first.source.sourceClean, true);
  assert.ok(requests[0].selection.pages.includes(4));
  assert.ok(requests[0].selection.pages.length < 7);
  assert.doesNotMatch(requests[0].selection.markdown, /\[\[PAGE 1\]\]|\[\[PAGE 7\]\]/u);
});

test("tier evaluation rejects a poisoned injected cache before returning a hit", async () => {
  const sourceIdentity = "e".repeat(64);
  await assert.rejects(
    evaluateBenchmarkSourceTier({
      ...tierOptions("quick", async () => completeAssessment(sourceIdentity)),
      sourceIdentity,
      cache: {
        get: async (cacheKey) => ({
          schema: BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
          cacheKey,
          identity: {
            sourceIdentity: "0".repeat(64),
            benchmarkVersion: "cmath.benchmark/v3",
            workflowVersion: "VNext-paper-to-map/v1",
            scoringContract: "cmath.benchmark-source-assessment/v0.1",
            scorerIdentity: "openai:gpt-5.6-sol:2026-08",
            tier: "quick",
            selectionIdentity: "poisoned",
            candidateDigest: "c".repeat(64),
            referenceDigest: "d".repeat(64),
          },
        }),
        set: async () => {},
      },
    }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_CACHE_INVALID",
  );
});

function tierOptions(tier, scoreSource) {
  return {
    tier,
    candidate: strictState("The strengthened main conclusion follows."),
    reference: strictState("The main conclusion follows."),
    sourceIdentity: "f".repeat(64),
    markedMarkdown,
    benchmarkVersion: "cmath.benchmark/v3",
    workflowVersion: "VNext-paper-to-map/v1",
    scoringContract: "cmath.benchmark-source-assessment/v0.1",
    scorerIdentity: "openai:gpt-5.6-sol:2026-08",
    scoreSource,
  };
}

test("candidate tier expands Gold differences to relevant source sections without unconditional full text", async () => {
  let request;
  const sourceIdentity = "f".repeat(64);
  const result = await evaluateBenchmarkSourceTier(tierOptions("candidate", async (value) => {
    request = value;
    return completeAssessment(sourceIdentity);
  }));

  assert.equal(result.source.sourceClean, true);
  assert.ok(request.selection.pages.includes(4));
  assert.ok(request.selection.pages.length < 7);
  assert.match(request.selection.markdown, /## Main theorem/u);
  assert.notEqual(request.selection.markdown, markedMarkdown);
});

test("final tier evaluates the exact complete canonical source", async () => {
  let request;
  const sourceIdentity = "f".repeat(64);
  await evaluateBenchmarkSourceTier(tierOptions("final", async (value) => {
    request = value;
    return completeAssessment(sourceIdentity);
  }));

  assert.deepEqual(request.selection.pages, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(request.selection.markdown, markedMarkdown);
});

test("source dispute automatically falls back to the exact canonical source without human review", async () => {
  const requests = [];
  const sourceIdentity = "f".repeat(64);
  const result = await evaluateBenchmarkSourceTier(tierOptions("quick", async (request) => {
    requests.push(request);
    if (requests.length === 1) return { status: "source_dispute" };
    return completeAssessment(sourceIdentity);
  }));

  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].selection.markdown, markedMarkdown);
  assert.equal(requests[1].selection.markdown, markedMarkdown);
  assert.notEqual(requests[1].selection.mode, requests[0].selection.mode);
  assert.equal(result.source.sourceClean, true);
});

test("final suite requires and fully evaluates every fixed active source", async () => {
  const activeCases = [
    { caseId: "paper:a", sourceIdentitySha256: "1".repeat(64) },
    { caseId: "paper:b", sourceIdentitySha256: "2".repeat(64) },
  ];
  const cases = activeCases.map((source) => ({
    caseId: source.caseId,
    sourceIdentity: source.sourceIdentitySha256,
    markedMarkdown,
    candidate: strictState("The strengthened main conclusion follows."),
    reference: strictState("The main conclusion follows."),
  }));
  const requests = [];
  const options = {
    tier: "final",
    sourceManifest: { schema: "cmath.paper-source-manifest/v2", activeCases },
    cases,
    benchmarkVersion: "cmath.benchmark/v3",
    workflowVersion: "VNext-paper-to-map/v1",
    scoringContract: "cmath.benchmark-source-assessment/v0.1",
    scorerIdentity: "openai:gpt-5.6-sol:2026-08",
    scoreSource: async (request) => {
      requests.push(request);
      return completeAssessment(request.sourceIdentity);
    },
  };

  const result = await evaluateBenchmarkSourceSuite(options);

  assert.deepEqual(result.caseIds, ["paper:a", "paper:b"]);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.selection.markdown === markedMarkdown));
  await assert.rejects(
    evaluateBenchmarkSourceSuite({ ...options, cases: cases.slice(0, 1) }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_INPUT_INVALID",
  );
  await assert.rejects(
    evaluateBenchmarkSourceSuite({
      ...options,
      tier: "quick",
      cases: [...cases, { ...cases[0], caseId: "paper:unknown" }],
    }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_INPUT_INVALID",
  );
  await assert.rejects(
    evaluateBenchmarkSourceSuite({ ...options, scoreSource: undefined }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATION_INPUT_INVALID",
  );
});
