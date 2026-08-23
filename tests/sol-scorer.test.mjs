/**
 * tests/sol-scorer.test.mjs
 * Offline unit and integration tests for scripts/score-paper-import-with-sol.mjs (v3).
 * Proves:
 * 1. Deterministic graph descriptor computation for Gold and candidate Project Views.
 * 2. Template loading and safe placeholder substitution (CASE_ID, GOLD_REVISION, GOLD_PATH, CANDIDATE_PATH, CANDIDATE_ARTIFACT, GRAPH_METRICS_PATH).
 * 3. Prompt asserts guidance on graph metrics and explicitly asserts absence of mechanical threshold/penalty rules.
 * 4. Exact model ("gpt-5.6-sol") and read-only schema execution.
 * 5. No deterministic evaluator called or imported.
 * 6. Strict Gold+candidate staging isolation: cwd is fresh temp dir with only Gold, candidate, graph-metrics.json, and schema.
 * 7. Mock Codex proves no PDF, spec, conventions, audit, or source-evidence paths/content sent.
 * 8. Staging directory cleanup on success, validation failure, malformed JSON, and process exit failure.
 * 9. Rejection of candidate symlinks.
 * 10. Dry-run makes isolation plan and graphComparison auditable without creating staging directory or exposing spec/conventions/PDF paths.
 * 11. Valid v3 score acceptance and atomic publish.
 * 12. Rejection of bad identity, arithmetic, out-of-bounds components, tampered graphComparison, and invalid evidence arrays.
 * 13. Official workflow config contains zero legacy score field names and uses promptVersion sol-score-prompt-v3.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  computeGraphDescriptors,
  renderSolPrompt,
  validateSolScore,
  PROMPT_VERSION,
  SCHEMA_ID,
  SCORER_MODEL
} from "../scripts/score-paper-import-with-sol.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scorerScript = path.join(root, "scripts/score-paper-import-with-sol.mjs");
const promptTemplatePath = path.join(root, "benchmarks/paper-import/sol-score-prompt-v3.md");
const schemaPath = path.join(root, "benchmarks/paper-import/sol-score-schema-v3.json");
const workflowConfigPath = path.join(root, "benchmarks/paper-import/fixed-test-workflow.json");

// Helper to create a valid reference v3 score object
function createValidScore({
  schema = SCHEMA_ID,
  scorer = SCORER_MODEL,
  promptVersion = PROMPT_VERSION,
  caseId = "hopf-degree-theorem",
  goldRevision = "v1",
  candidateArtifact = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json",
  graphComparison = {
    gold: {
      entryCount: 2,
      inferenceCount: 1,
      isolatedEntryCount: 0,
      isolatedEntryRatio: 0,
      nontrivialComponentCount: 1,
      largestNontrivialComponentSize: 2,
      largestNontrivialComponentCoverage: 1,
      isolatedEntryIds: []
    },
    candidate: {
      entryCount: 2,
      inferenceCount: 1,
      isolatedEntryCount: 0,
      isolatedEntryRatio: 0,
      nontrivialComponentCount: 1,
      largestNontrivialComponentSize: 2,
      largestNontrivialComponentCoverage: 1,
      isolatedEntryIds: []
    }
  },
  format = {
    score: 10,
    jsonValidity: 4,
    referenceIntegrity: 6
  },
  entries = {
    score: 45,
    correctness: 25,
    completeness: 20
  },
  inferences = {
    score: 45,
    correctness: 25,
    completeness: 20
  },
  solScore = 100,
  verdict = "mature",
  matchedEntries = ["Gold-E1", "Gold-E2"],
  missingEntries = [],
  incorrectEntries = [],
  matchedInferences = ["Gold-I1", "Gold-I2"],
  missingInferences = [],
  incorrectInferences = [],
  summary = "Accurate and complete mathematical extraction matching Gold."
} = {}) {
  return {
    schema,
    scorer,
    promptVersion,
    caseId,
    goldRevision,
    candidateArtifact,
    graphComparison: {
      gold: { ...graphComparison.gold, isolatedEntryIds: [...graphComparison.gold.isolatedEntryIds] },
      candidate: { ...graphComparison.candidate, isolatedEntryIds: [...graphComparison.candidate.isolatedEntryIds] }
    },
    solScore,
    format: { ...format },
    entries: { ...entries },
    inferences: { ...inferences },
    matchedEntries: Array.isArray(matchedEntries) ? [...matchedEntries] : matchedEntries,
    missingEntries: Array.isArray(missingEntries) ? [...missingEntries] : missingEntries,
    incorrectEntries: Array.isArray(incorrectEntries) ? [...incorrectEntries] : incorrectEntries,
    matchedInferences: Array.isArray(matchedInferences) ? [...matchedInferences] : matchedInferences,
    missingInferences: Array.isArray(missingInferences) ? [...missingInferences] : missingInferences,
    incorrectInferences: Array.isArray(incorrectInferences) ? [...incorrectInferences] : incorrectInferences,
    summary,
    verdict
  };
}

describe("Graph Descriptors - Deterministic Metric Computation", () => {
  it("(a) computes multiple nontrivial components plus isolated nodes, proving isolated nodes do NOT count as components", () => {
    // 7 total entries: A, B, C, D, E, F, G
    // inf1 connects A, B -> component {A, B}, size 2
    // inf2 connects C, D, E -> component {C, D, E}, size 3
    // F, G are isolated
    const view = {
      entries: [
        { id: "A" },
        { id: "B" },
        { id: "C" },
        { id: "D" },
        { id: "E" },
        { id: "F" },
        { id: "G" }
      ],
      inferences: [
        { id: "inf1", premises: ["A"], conclusion: "B" },
        { id: "inf2", premises: ["C", "D"], conclusion: "E" }
      ]
    };

    const metrics = computeGraphDescriptors(view);

    assert.equal(metrics.entryCount, 7, "entryCount should be 7");
    assert.equal(metrics.inferenceCount, 2, "inferenceCount should be 2");
    assert.equal(metrics.isolatedEntryCount, 2, "isolatedEntryCount should be 2 (F, G)");
    assert.deepEqual(metrics.isolatedEntryIds, ["F", "G"], "isolatedEntryIds should be ['F', 'G']");
    assert.equal(metrics.isolatedEntryRatio, 2 / 7, "isolatedEntryRatio should be 2/7");
    assert.equal(metrics.nontrivialComponentCount, 2, "nontrivialComponentCount should be 2 ({A,B} and {C,D,E}); isolated nodes must NOT count as components");
    assert.equal(metrics.largestNontrivialComponentSize, 3, "largestNontrivialComponentSize should be 3 ({C,D,E})");
    assert.equal(metrics.largestNontrivialComponentCoverage, 3 / 7, "largestNontrivialComponentCoverage denominator must be total entryCount (7)");
  });

  it("(b) safely evaluates empty graph to zero for counts and ratios", () => {
    const empty1 = computeGraphDescriptors({ entries: [], inferences: [] });
    assert.deepEqual(empty1, {
      entryCount: 0,
      inferenceCount: 0,
      isolatedEntryCount: 0,
      isolatedEntryRatio: 0,
      nontrivialComponentCount: 0,
      largestNontrivialComponentSize: 0,
      largestNontrivialComponentCoverage: 0,
      isolatedEntryIds: []
    });

    const empty2 = computeGraphDescriptors({});
    assert.deepEqual(empty2, {
      entryCount: 0,
      inferenceCount: 0,
      isolatedEntryCount: 0,
      isolatedEntryRatio: 0,
      nontrivialComponentCount: 0,
      largestNontrivialComponentSize: 0,
      largestNontrivialComponentCoverage: 0,
      isolatedEntryIds: []
    });

    const empty3 = computeGraphDescriptors(null);
    assert.deepEqual(empty3, {
      entryCount: 0,
      inferenceCount: 0,
      isolatedEntryCount: 0,
      isolatedEntryRatio: 0,
      nontrivialComponentCount: 0,
      largestNontrivialComponentSize: 0,
      largestNontrivialComponentCoverage: 0,
      isolatedEntryIds: []
    });
  });

  it("(c) handles hyperedge connectivity, deduplication, invalid referenced IDs, and deterministic sorting", () => {
    const view = {
      entries: [
        { id: "E5" },
        { id: "E3" },
        { id: "E1" },
        { id: "E2" },
        { id: "E4" }
      ],
      inferences: [
        // inf1 connects E2, E3, and E1 (with duplicates and non-existent IDs ignored)
        { premises: ["E2", "GHOST_ID_1", "E2", "E3"], conclusion: "E1" },
        // inf2 references only non-existent entries
        { premises: ["GHOST_ID_2"], conclusion: "GHOST_ID_3" },
        // inf3 references only E1
        { premises: [], conclusion: "E1" }
      ]
    };

    const metrics = computeGraphDescriptors(view);

    assert.equal(metrics.entryCount, 5);
    assert.equal(metrics.inferenceCount, 3);
    assert.equal(metrics.isolatedEntryCount, 2);
    // Deterministic sorting: E4, E5
    assert.deepEqual(metrics.isolatedEntryIds, ["E4", "E5"]);
    assert.equal(metrics.isolatedEntryRatio, 2 / 5);
    assert.equal(metrics.nontrivialComponentCount, 1);
    assert.equal(metrics.largestNontrivialComponentSize, 3);
    assert.equal(metrics.largestNontrivialComponentCoverage, 3 / 5);
  });

  it("(d) treats lone entry with inference of participating size < 2 as isolated (zero components/coverage)", () => {
    const view = {
      entries: [
        { id: "A" },
        { id: "B" }
      ],
      inferences: [
        { premises: [], conclusion: "A" }
      ]
    };

    const metrics = computeGraphDescriptors(view);
    assert.equal(metrics.entryCount, 2);
    assert.equal(metrics.inferenceCount, 1);
    assert.equal(metrics.isolatedEntryCount, 2, "Both A and B are isolated since no relation connects them to any other entry");
    assert.deepEqual(metrics.isolatedEntryIds, ["A", "B"]);
    assert.equal(metrics.isolatedEntryRatio, 1);
    assert.equal(metrics.nontrivialComponentCount, 0);
    assert.equal(metrics.largestNontrivialComponentSize, 0);
    assert.equal(metrics.largestNontrivialComponentCoverage, 0);
  });

  it("(e) proves duplicate self-references and invalid references do not create a relation or make entries non-isolated", () => {
    const view = {
      entries: [
        { id: "A" },
        { id: "B" }
      ],
      inferences: [
        { premises: ["A", "A", "GHOST_1"], conclusion: "A" },
        { premises: ["GHOST_2"], conclusion: "GHOST_3" }
      ]
    };

    const metrics = computeGraphDescriptors(view);
    assert.equal(metrics.entryCount, 2);
    assert.equal(metrics.inferenceCount, 2);
    assert.equal(metrics.isolatedEntryCount, 2, "Self-references and ghost references create no graph relation");
    assert.deepEqual(metrics.isolatedEntryIds, ["A", "B"]);
    assert.equal(metrics.isolatedEntryRatio, 1);
    assert.equal(metrics.nontrivialComponentCount, 0);
    assert.equal(metrics.largestNontrivialComponentSize, 0);
    assert.equal(metrics.largestNontrivialComponentCoverage, 0);
  });
});

describe("Sol Scorer v3 - Prompt Template & Placeholder Substitution", () => {
  const templateContent = fs.readFileSync(promptTemplatePath, "utf8");

  it("asserts prompt template contains no spec or conventions placeholders or references", () => {
    assert.equal(templateContent.includes("{{SPEC_PATH}}"), false, "Template must not contain {{SPEC_PATH}}");
    assert.equal(templateContent.includes("{{CONVENTIONS_PATH}}"), false, "Template must not contain {{CONVENTIONS_PATH}}");
    assert.equal(templateContent.includes("benchmark specification"), false, "Template must not reference benchmark specification input");
    assert.equal(templateContent.includes("objective conventions"), false, "Template must not reference objective conventions input");
    assert.ok(templateContent.includes("严禁读取或参考原始论文 PDF、来源证据（source evidence）、审计记录（audit records）、benchmark spec、conventions"));
    assert.ok(templateContent.includes("冻结的 Gold JSON 是论文数学内容的完整权威压缩表示"));
    assert.ok(templateContent.includes("本次数学评判只能且必须仅使用 Gold JSON 与候选 JSON"));
    assert.ok(templateContent.includes("{{GRAPH_METRICS_PATH}}"));
  });

  it("asserts prompt template provides guidance on graph metrics without mechanical penalties/thresholds", () => {
    assert.ok(templateContent.includes("图结构指标参考指南"));
    assert.ok(templateContent.includes("不构成任何机械扣分公式、硬性阈值或自动作废规则"));
    assert.ok(templateContent.includes("多个有意义的非平凡连通分支在数学结构上是完全允许且正常的"));
    assert.ok(templateContent.includes("不能按数量比例机械评分"));
    assert.ok(templateContent.includes("不能仅仅因为数量一致就自动给予 inference 满分"));
    assert.ok(templateContent.includes("Gold 始终是权威的内容输入；Sol 不得凭空臆造 Gold 中不存在的逻辑关系"));

    // Explicitly assert absence of forbidden mechanical scoring / threshold patterns
    assert.equal(templateContent.includes("扣分公式"), true, "Must explicitly state absence of 扣分公式");
    assert.equal(templateContent.includes("硬性阈值"), true, "Must explicitly state absence of 硬性阈值");
    assert.equal(templateContent.includes("如果孤立节点比例超过"), false, "Must NOT contain hard threshold penalty");
    assert.equal(templateContent.includes("扣除"), false, "Must NOT specify arbitrary deduction rules");
  });

  it("substitutes all declared placeholders including GRAPH_METRICS_PATH using staged local paths", () => {
    const caseId = "hopf-degree-theorem";
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";

    const prompt = renderSolPrompt({
      templateContent,
      caseId,
      goldRevision: "v1",
      goldPath: "gold.json",
      candidatePath: "candidate.json",
      candidateArtifact: candidatePath,
      graphMetricsPath: "graph-metrics.json",
      rootDir: root
    });

    assert.ok(prompt.includes(`caseId：\`${caseId}\``));
    assert.ok(prompt.includes("Gold revision：`v1`"));
    assert.ok(prompt.includes("Gold JSON：`gold.json`"));
    assert.ok(prompt.includes("candidate JSON：`candidate.json`"));
    assert.ok(prompt.includes(`candidate artifact：\`${candidatePath}\``));
    assert.ok(prompt.includes("图结构指标：`graph-metrics.json`"));

    // Ensure no spec or conventions paths appear
    assert.equal(prompt.includes("benchmark-spec.json"), false);
    assert.equal(prompt.includes("objective-conventions.md"), false);

    // Ensure no unresolved placeholders remain
    const unresolved = prompt.match(/\{\{.*?\}\}/gu);
    assert.equal(unresolved, null, "no unresolved placeholders should remain");
  });

  it("fails closed when template contains an undeclared placeholder", () => {
    const brokenTemplate = templateContent + "\nExtra placeholder: {{UNKNOWN_TOKEN}}";
    assert.throws(
      () => {
        renderSolPrompt({
          templateContent: brokenTemplate,
          caseId: "hopf-degree-theorem",
          goldRevision: "v1",
          goldPath: "gold.json",
          candidatePath: "candidate.json",
          rootDir: root
        });
      },
      /Unresolved prompt placeholders detected: {{UNKNOWN_TOKEN}}/
    );
  });
});

describe("Sol Scorer v3 - Identity, Arithmetic, and Graph Comparison Validation", () => {
  it("accepts a perfectly formed v3 score object matching expected graph comparison", () => {
    const valid = createValidScore();
    assert.equal(
      validateSolScore(valid, {
        caseId: "hopf-degree-theorem",
        goldRevision: "v1",
        candidatePath: path.join(root, "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json"),
        expectedGraphComparison: valid.graphComparison,
        rootDir: root
      }),
      true
    );
  });

  it("rejects wrong schema ID", () => {
    const bad = createValidScore({ schema: "cmath.paper-import-sol-score/v2" });
    assert.throws(() => validateSolScore(bad), /Invalid score schema/);
  });

  it("rejects wrong scorer model", () => {
    const bad = createValidScore({ scorer: "gpt-4o" });
    assert.throws(() => validateSolScore(bad), /Invalid scorer/);
  });

  it("rejects missing or outdated promptVersion", () => {
    const bad = createValidScore({ promptVersion: "sol-score-prompt-v2" });
    assert.throws(() => validateSolScore(bad), /Invalid promptVersion/);

    const missing = createValidScore();
    delete missing.promptVersion;
    assert.throws(() => validateSolScore(missing), /Invalid promptVersion/);
  });

  it("rejects missing graphComparison", () => {
    const bad = createValidScore();
    delete bad.graphComparison;
    assert.throws(() => validateSolScore(bad), /Score missing required graphComparison/);
  });

  it("rejects malformed graphComparison shape or types", () => {
    const badShape = createValidScore({
      graphComparison: {
        gold: {
          entryCount: -1, // invalid negative count
          inferenceCount: 1,
          isolatedEntryCount: 0,
          isolatedEntryRatio: 0,
          nontrivialComponentCount: 1,
          largestNontrivialComponentSize: 2,
          largestNontrivialComponentCoverage: 1,
          isolatedEntryIds: []
        },
        candidate: {
          entryCount: 2,
          inferenceCount: 1,
          isolatedEntryCount: 0,
          isolatedEntryRatio: 0,
          nontrivialComponentCount: 1,
          largestNontrivialComponentSize: 2,
          largestNontrivialComponentCoverage: 1,
          isolatedEntryIds: []
        }
      }
    });
    assert.throws(() => validateSolScore(badShape), /Invalid graphComparison\.gold\.entryCount/);

    const badRatio = createValidScore({
      graphComparison: {
        gold: {
          entryCount: 2,
          inferenceCount: 1,
          isolatedEntryCount: 0,
          isolatedEntryRatio: 1.5, // invalid > 1
          nontrivialComponentCount: 1,
          largestNontrivialComponentSize: 2,
          largestNontrivialComponentCoverage: 1,
          isolatedEntryIds: []
        },
        candidate: {
          entryCount: 2,
          inferenceCount: 1,
          isolatedEntryCount: 0,
          isolatedEntryRatio: 0,
          nontrivialComponentCount: 1,
          largestNontrivialComponentSize: 2,
          largestNontrivialComponentCoverage: 1,
          isolatedEntryIds: []
        }
      }
    });
    assert.throws(() => validateSolScore(badRatio), /Invalid graphComparison\.gold\.isolatedEntryRatio/);
  });

  it("rejects tampered graphComparison when compared against expected metrics", () => {
    const valid = createValidScore();
    const expected = JSON.parse(JSON.stringify(valid.graphComparison));

    // Tamper with candidate largestNontrivialComponentSize
    const tampered = createValidScore();
    tampered.graphComparison.candidate.largestNontrivialComponentSize = 999;

    assert.throws(
      () => validateSolScore(tampered, { expectedGraphComparison: expected }),
      /Graph comparison mismatch for candidate\.largestNontrivialComponentSize: expected 2, got 999/
    );

    // Tamper with gold isolatedEntryIds
    const tamperedIds = createValidScore();
    tamperedIds.graphComparison.gold.isolatedEntryIds = ["TAMPERED_ENTRY_ID"];
    assert.throws(
      () => validateSolScore(tamperedIds, { expectedGraphComparison: expected }),
      /Graph comparison mismatch for gold\.isolatedEntryIds/
    );
  });

  it("rejects caseId mismatch", () => {
    const bad = createValidScore({ caseId: "knot-hopf-rt" });
    assert.throws(
      () => validateSolScore(bad, { caseId: "hopf-degree-theorem" }),
      /Case ID mismatch/
    );
  });

  it("rejects goldRevision mismatch", () => {
    const bad = createValidScore({ goldRevision: "v2" });
    assert.throws(
      () => validateSolScore(bad, { goldRevision: "v1" }),
      /Gold revision mismatch/
    );
  });

  it("rejects candidateArtifact mismatch", () => {
    const bad = createValidScore({ candidateArtifact: "benchmarks/model-outputs/other.json" });
    assert.throws(
      () => validateSolScore(bad, { candidatePath: path.join(root, "benchmarks/model-outputs/target.json"), rootDir: root }),
      /Candidate artifact mismatch/
    );
  });

  it("rejects format score arithmetic mismatch", () => {
    const bad = createValidScore({
      format: {
        score: 8, // wrong: sum is 10
        jsonValidity: 4,
        referenceIntegrity: 6
      }
    });
    assert.throws(() => validateSolScore(bad), /Format score arithmetic error/);
  });

  it("rejects entries score arithmetic mismatch", () => {
    const bad = createValidScore({
      entries: {
        score: 40, // wrong: sum is 45
        correctness: 25,
        completeness: 20
      }
    });
    assert.throws(() => validateSolScore(bad), /Entries score arithmetic error/);
  });

  it("rejects inferences score arithmetic mismatch", () => {
    const bad = createValidScore({
      inferences: {
        score: 40, // wrong: sum is 45
        correctness: 25,
        completeness: 20
      }
    });
    assert.throws(() => validateSolScore(bad), /Inferences score arithmetic error/);
  });

  it("rejects total solScore arithmetic mismatch", () => {
    const bad = createValidScore({
      solScore: 95 // wrong: format(10) + entries(45) + inferences(45) = 100
    });
    assert.throws(() => validateSolScore(bad), /Overall solScore arithmetic error/);
  });

  it("enforces exact verdict score brackets", () => {
    // 1. mature (90+)
    const score90 = createValidScore({
      format: { score: 10, jsonValidity: 4, referenceIntegrity: 6 },
      entries: { score: 40, correctness: 22, completeness: 18 },
      inferences: { score: 40, correctness: 22, completeness: 18 },
      solScore: 90,
      verdict: "mature"
    });
    assert.equal(validateSolScore(score90), true);

    const score90WrongVerdict = createValidScore({
      format: { score: 10, jsonValidity: 4, referenceIntegrity: 6 },
      entries: { score: 40, correctness: 22, completeness: 18 },
      inferences: { score: 40, correctness: 22, completeness: 18 },
      solScore: 90,
      verdict: "promising" // should be mature
    });
    assert.throws(() => validateSolScore(score90WrongVerdict), /Verdict mismatch/);

    // 2. promising (85-89)
    const score88 = createValidScore({
      format: { score: 8, jsonValidity: 3, referenceIntegrity: 5 },
      entries: { score: 40, correctness: 22, completeness: 18 },
      inferences: { score: 40, correctness: 22, completeness: 18 },
      solScore: 88,
      verdict: "promising"
    });
    assert.equal(validateSolScore(score88), true);

    const score88WrongVerdict = createValidScore({
      format: { score: 8, jsonValidity: 3, referenceIntegrity: 5 },
      entries: { score: 40, correctness: 22, completeness: 18 },
      inferences: { score: 40, correctness: 22, completeness: 18 },
      solScore: 88,
      verdict: "mature" // should be promising
    });
    assert.throws(() => validateSolScore(score88WrongVerdict), /Verdict mismatch/);

    // 3. needs-revision (50-84)
    const score50 = createValidScore({
      format: { score: 6, jsonValidity: 2, referenceIntegrity: 4 },
      entries: { score: 22, correctness: 12, completeness: 10 },
      inferences: { score: 22, correctness: 12, completeness: 10 },
      solScore: 50,
      verdict: "needs-revision"
    });
    assert.equal(validateSolScore(score50), true);

    // 4. invalid (<50)
    const score49 = createValidScore({
      format: { score: 5, jsonValidity: 2, referenceIntegrity: 3 },
      entries: { score: 22, correctness: 12, completeness: 10 },
      inferences: { score: 22, correctness: 12, completeness: 10 },
      solScore: 49,
      verdict: "invalid"
    });
    assert.equal(validateSolScore(score49), true);
  });

  it("validates evidence array fields and summary", () => {
    const badMatchedEntries = createValidScore({ matchedEntries: "not an array" });
    assert.throws(() => validateSolScore(badMatchedEntries), /matchedEntries must be an array/);

    const badMissingEntriesElem = createValidScore({ missingEntries: [123] });
    assert.throws(() => validateSolScore(badMissingEntriesElem), /Elements in missingEntries must be strings/);

    const badSummary = createValidScore({ summary: "   " });
    assert.throws(() => validateSolScore(badSummary), /summary must be a non-empty string/);
  });
});

describe("Official Benchmark Config - No Legacy Score Fields & v3 Registration", () => {
  it("asserts fixed-test-workflow.json registers sol-score-prompt-v3 and contains none of legacy score fields", () => {
    const rawContent = fs.readFileSync(workflowConfigPath, "utf8");
    const parsedConfig = JSON.parse(rawContent);

    const forbiddenFields = [
      "auditScore",
      "machineScore",
      "overallScore",
      "formatScore",
      "semanticScore",
      "mainlineAssessment",
      "matchedCore",
      "missingCore",
      "deductions"
    ];

    // Check raw text
    for (const field of forbiddenFields) {
      assert.equal(
        rawContent.includes(`"${field}"`),
        false,
        `fixed-test-workflow.json raw content must not contain "${field}"`
      );
    }

    // Check parsed JSON object recursively
    function checkKeys(obj, pathPrefix = "") {
      if (!obj || typeof obj !== "object") return;
      for (const [key, value] of Object.entries(obj)) {
        const fullKeyPath = pathPrefix ? `${pathPrefix}.${key}` : key;
        for (const field of forbiddenFields) {
          assert.notEqual(key, field, `fixed-test-workflow.json must not have property "${fullKeyPath}"`);
          if (typeof value === "string") {
            assert.equal(
              value.includes(field),
              false,
              `fixed-test-workflow.json property "${fullKeyPath}" must not contain substring "${field}"`
            );
          }
        }
        if (typeof value === "object") {
          checkKeys(value, fullKeyPath);
        }
      }
    }

    checkKeys(parsedConfig);

    // Verify official promptVersion is sol-score-prompt-v3
    assert.equal(parsedConfig.scoring.promptVersion, "sol-score-prompt-v3");
  });

  it("asserts score script and fixed runner do not import or call deterministic evaluator", () => {
    const scorerCode = fs.readFileSync(scorerScript, "utf8");
    const runnerCode = fs.readFileSync(path.join(root, "scripts/run-fixed-paper-benchmark.mjs"), "utf8");

    assert.equal(scorerCode.includes("evaluate-benchmark"), false, "Scorer script must not reference evaluate-benchmark");
    assert.equal(scorerCode.includes("evaluateBenchmark"), false, "Scorer script must not call evaluateBenchmark");
    assert.equal(runnerCode.includes("evaluate-benchmark"), false, "Runner script must not reference evaluate-benchmark");
    assert.equal(runnerCode.includes("evaluateBenchmark"), false, "Runner script must not call evaluateBenchmark");
  });

  it("registers Luna and DeepSeek Flash as distinct fixed benchmark subjects", () => {
    const config = JSON.parse(fs.readFileSync(workflowConfigPath, "utf8"));
    assert.equal(config.defaultSubject, "luna");
    assert.deepEqual(config.subjects.luna, {
      provider: "luna-gateway",
      model: "gpt-5.6-luna",
      reasoningEffort: "none",
      mode: "off-compact"
    });
    assert.deepEqual(config.subjects["deepseek-flash"], {
      provider: "opencode-go",
      model: "deepseek-v4-flash",
      reasoningEffort: "none",
      mode: "off-compact"
    });
  });
});

describe("Sol Scorer v3 - Strict Staging Isolation & Mock Codex Execution", () => {
  let tmpDir;
  let mockCodexScript;
  let mockLogFile;
  let mockPayloadFile;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-sol-test-"));
    mockLogFile = path.join(tmpDir, "codex-call.json");
    mockPayloadFile = path.join(tmpDir, "codex-response.json");
    mockCodexScript = path.join(tmpDir, "mock-codex.mjs");

    // Create mock codex executable that records CLI arguments, cwd, dir listing, and stdin
    const mockCodexContent = `#!/usr/bin/env node
import fs from "node:fs";

const args = process.argv.slice(2);
const logFile = ${JSON.stringify(mockLogFile)};
const payloadFile = ${JSON.stringify(mockPayloadFile)};

let stdinData = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { stdinData += chunk; });
process.stdin.on("end", () => {
  const currentCwd = process.cwd();
  const dirListingBefore = fs.readdirSync(currentCwd);

  const outSchemaIndex = args.indexOf("--output-schema");
  const outSchema = outSchemaIndex >= 0 ? args[outSchemaIndex + 1] : null;
  const outLastIndex = args.indexOf("--output-last-message");
  const outLast = outLastIndex >= 0 ? args[outLastIndex + 1] : null;
  const modelIndex = args.indexOf("--model");
  const model = modelIndex >= 0 ? args[modelIndex + 1] : null;

  if (fs.existsSync(payloadFile) && outLast) {
    const payload = fs.readFileSync(payloadFile, "utf8");
    fs.writeFileSync(outLast, payload);
  }

  const dirListingAfter = fs.readdirSync(currentCwd);

  fs.writeFileSync(logFile, JSON.stringify({
    argv: args,
    cwd: currentCwd,
    dirListingBefore,
    dirListingAfter,
    model,
    outSchema,
    outLast,
    stdin: stdinData
  }, null, 2));

  if (fs.existsSync(payloadFile) && outLast) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
`;
    fs.writeFileSync(mockCodexScript, mockCodexContent, { mode: 0o755 });
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("enforces strict staging isolation: cwd contains ONLY Gold, candidate, graph-metrics.json, and schema", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-score-out.json");

    const goldView = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/cases/hopf-degree-theorem/gold-project-view.json"), "utf8"));
    const candView = JSON.parse(fs.readFileSync(path.join(root, candidatePath), "utf8"));
    const expectedGc = {
      gold: computeGraphDescriptors(goldView),
      candidate: computeGraphDescriptors(candView)
    };

    const validScore = createValidScore({
      caseId: "hopf-degree-theorem",
      goldRevision: "v1",
      candidateArtifact: candidatePath,
      graphComparison: expectedGc,
      solScore: 100,
      verdict: "mature",
      matchedEntries: ["E1", "E2"],
      matchedInferences: ["I1"]
    });
    fs.writeFileSync(mockPayloadFile, JSON.stringify(validScore, null, 2));

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.equal(res.status, 0, `Scorer should succeed. Stderr: ${res.stderr}`);

    // Verify mock codex invocation record
    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(callLog.model, "gpt-5.6-sol", "Must call model gpt-5.6-sol");
    assert.equal(callLog.outSchema, "sol-score-schema.json", "Must specify sol-score-schema.json");
    assert.equal(callLog.outLast, "score-output.json", "Must output to staged score-output.json");
    assert.ok(callLog.argv.includes("--ephemeral"), "Must include --ephemeral");
    assert.ok(callLog.argv.includes("--skip-git-repo-check"), "Isolated non-Git staging must explicitly skip the repository check");
    assert.ok(callLog.argv.includes("--sandbox"), "Must include --sandbox");
    assert.ok(callLog.argv.includes("read-only"), "Must be read-only sandbox");

    // Verify staging directory boundary
    assert.notEqual(callLog.cwd, root, "Scoring cwd must NOT be repository root");
    const canonicalTmp = fs.realpathSync(os.tmpdir());
    assert.ok(
      callLog.cwd.startsWith(os.tmpdir()) || callLog.cwd.startsWith(canonicalTmp),
      `Scoring cwd (${callLog.cwd}) must be a fresh temp directory under os.tmpdir() (${os.tmpdir()})`
    );

    // Verify directory contents in staging directory before mock writes output
    const beforeSorted = [...callLog.dirListingBefore].sort();
    assert.deepEqual(
      beforeSorted,
      ["candidate.json", "gold.json", "graph-metrics.json", "sol-score-schema.json"],
      "Staging directory must contain ONLY Gold JSON, candidate JSON, graph-metrics.json, and output schema"
    );

    // Verify directory contents in staging directory after mock writes output
    const afterSorted = [...callLog.dirListingAfter].sort();
    assert.deepEqual(
      afterSorted,
      ["candidate.json", "gold.json", "graph-metrics.json", "score-output.json", "sol-score-schema.json"],
      "Staging directory must contain ONLY Gold, candidate, graph-metrics, schema, and temporary output"
    );

    // Verify prompt rendered to stdin contains only staged local paths and zero spec/conventions/PDF/audit paths
    assert.ok(callLog.stdin.includes("caseId：`hopf-degree-theorem`"));
    assert.ok(callLog.stdin.includes("Gold revision：`v1`"));
    assert.ok(callLog.stdin.includes("Gold JSON：`gold.json`"));
    assert.ok(callLog.stdin.includes("candidate JSON：`candidate.json`"));
    assert.ok(callLog.stdin.includes(`candidate artifact：\`${candidatePath}\``));
    assert.ok(callLog.stdin.includes("图结构指标：`graph-metrics.json`"));
    assert.equal(callLog.stdin.includes("benchmark-spec.json"), false, "Prompt must not contain benchmark-spec path");
    assert.equal(callLog.stdin.includes("objective-conventions.md"), false, "Prompt must not contain objective-conventions path");
    assert.equal(callLog.stdin.includes(".pdf"), false, "Prompt must not contain PDF path");
    assert.equal(callLog.stdin.includes("benchmarks/paper-import/cases"), false, "Prompt must not contain repo case directory path");
    assert.equal(callLog.stdin.includes("audit.json"), false, "Prompt must not contain audit file path");
    assert.equal(callLog.stdin.includes("source-evidence"), false, "Prompt must not contain source-evidence path");
    assert.equal(callLog.stdin.match(/\{\{.*?\}\}/gu), null, "Stdin prompt must have zero unresolved placeholders");

    // Verify final output file was atomically published and validated
    assert.ok(fs.existsSync(outputPath), "Final score JSON output file must exist");
    const outputScore = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(outputScore.solScore, 100);
    assert.equal(outputScore.schema, "cmath.paper-import-sol-score/v3");
    assert.equal(outputScore.promptVersion, "sol-score-prompt-v3");
    assert.equal(outputScore.verdict, "mature");
    assert.equal(outputScore.format.score, 10);
    assert.equal(outputScore.entries.score, 45);
    assert.equal(outputScore.inferences.score, 45);
    assert.deepEqual(outputScore.graphComparison, expectedGc);

    // Verify staging directory cleanup on success
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be deleted after successful run");
  });

  it("fails closed, cleans up staging, and does not write final output when codex returns tampered graph metrics", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-bad-metrics-out.json");

    const goldView = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/cases/hopf-degree-theorem/gold-project-view.json"), "utf8"));
    const candView = JSON.parse(fs.readFileSync(path.join(root, candidatePath), "utf8"));
    const expectedGc = {
      gold: computeGraphDescriptors(goldView),
      candidate: computeGraphDescriptors(candView)
    };

    const badScore = createValidScore({
      caseId: "hopf-degree-theorem",
      candidateArtifact: candidatePath,
      graphComparison: {
        ...expectedGc,
        candidate: {
          ...expectedGc.candidate,
          entryCount: 99999 // tampered
        }
      }
    });
    fs.writeFileSync(mockPayloadFile, JSON.stringify(badScore, null, 2));

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when graph metrics are tampered");
    assert.ok(res.stderr.includes("Graph comparison mismatch for candidate.entryCount"), `Stderr should report graph comparison mismatch: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on validation failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on validation failure");
  });

  it("fails closed, cleans up staging, and does not write final output when codex returns bad arithmetic", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-bad-arithmetic-out.json");

    const goldView = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/cases/hopf-degree-theorem/gold-project-view.json"), "utf8"));
    const candView = JSON.parse(fs.readFileSync(path.join(root, candidatePath), "utf8"));
    const expectedGc = {
      gold: computeGraphDescriptors(goldView),
      candidate: computeGraphDescriptors(candView)
    };

    const badScore = createValidScore({
      caseId: "hopf-degree-theorem",
      candidateArtifact: candidatePath,
      graphComparison: expectedGc,
      format: {
        score: 8, // broken: sum of 4 + 6 is 10
        jsonValidity: 4,
        referenceIntegrity: 6
      },
      solScore: 98
    });
    fs.writeFileSync(mockPayloadFile, JSON.stringify(badScore, null, 2));

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when arithmetic is invalid");
    assert.ok(res.stderr.includes("Format score arithmetic error"), `Stderr should report arithmetic error: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on validation failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on validation failure");
  });

  it("fails closed, cleans up staging, and does not write final output when codex returns bad promptVersion", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-bad-promptver-out.json");

    const badScore = createValidScore({
      caseId: "hopf-degree-theorem",
      candidateArtifact: candidatePath,
      promptVersion: "sol-score-prompt-v2"
    });
    fs.writeFileSync(mockPayloadFile, JSON.stringify(badScore, null, 2));

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when promptVersion is invalid");
    assert.ok(res.stderr.includes("Invalid promptVersion"), `Stderr should report promptVersion error: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on validation failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on validation failure");
  });

  it("fails closed, cleans up staging, and does not write final output when codex returns bad verdict", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-bad-verdict-out.json");

    const goldView = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/paper-import/cases/hopf-degree-theorem/gold-project-view.json"), "utf8"));
    const candView = JSON.parse(fs.readFileSync(path.join(root, candidatePath), "utf8"));
    const expectedGc = {
      gold: computeGraphDescriptors(goldView),
      candidate: computeGraphDescriptors(candView)
    };

    const badScore = createValidScore({
      caseId: "hopf-degree-theorem",
      candidateArtifact: candidatePath,
      graphComparison: expectedGc,
      format: { score: 5, jsonValidity: 2, referenceIntegrity: 3 },
      entries: { score: 15, correctness: 8, completeness: 7 },
      inferences: { score: 15, correctness: 8, completeness: 7 },
      solScore: 35,
      verdict: "mature" // Invalid: should be "invalid" (<50)
    });
    fs.writeFileSync(mockPayloadFile, JSON.stringify(badScore, null, 2));

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when verdict is invalid");
    assert.ok(res.stderr.includes("Verdict mismatch"), `Stderr should report verdict error: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on validation failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on validation failure");
  });

  it("fails closed, cleans up staging, and does not write final output when codex returns malformed non-JSON output", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-malformed-json-out.json");

    fs.writeFileSync(mockPayloadFile, "not a valid json { broken ... ");

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when JSON output is malformed");
    assert.ok(res.stderr.includes("Failed to parse Sol score JSON"), `Stderr should report JSON parse error: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on JSON parse failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on JSON parse failure");
  });

  it("fails closed, cleans up staging, and does not write final output when codex exits with non-zero status", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";
    const outputPath = path.join(tmpDir, "hopf-codex-exit-fail.json");

    // Remove payload file to force mock-codex exit 1
    if (fs.existsSync(mockPayloadFile)) fs.unlinkSync(mockPayloadFile);

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--output", outputPath,
      "--gold-revision", "v1",
      "--codex-bin", mockCodexScript
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when codex exits with non-zero status");
    assert.ok(res.stderr.includes("Sol scoring failed with exit status"), `Stderr should report exit status failure: ${res.stderr}`);
    assert.equal(fs.existsSync(outputPath), false, "Output file must not be created on codex exit failure");

    const callLog = JSON.parse(fs.readFileSync(mockLogFile, "utf8"));
    assert.equal(fs.existsSync(callLog.cwd), false, "Staging directory must be cleaned up on codex exit failure");
  });

  it("rejects candidate path when it is a symlink", () => {
    const realCandidate = path.join(root, "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json");
    const symlinkCandidate = path.join(tmpDir, "candidate-symlink.json");
    if (fs.existsSync(symlinkCandidate)) fs.unlinkSync(symlinkCandidate);
    fs.symlinkSync(realCandidate, symlinkCandidate);

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", symlinkCandidate,
      "--gold-revision", "v1"
    ], { cwd: root, encoding: "utf8" });

    assert.notEqual(res.status, 0, "Scorer must fail when candidate is a symlink");
    assert.ok(res.stderr.includes("cannot be a symlink"), `Stderr should report symlink rejection: ${res.stderr}`);
  });

  it("dry-run produces auditable isolation plan with graph-metrics.json without creating staging or exposing spec/conventions/PDF paths", () => {
    const candidatePath = "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json";

    const res = spawnSync(process.execPath, [
      scorerScript,
      "--case", "hopf-degree-theorem",
      "--candidate", candidatePath,
      "--gold-revision", "v1",
      "--dry-run"
    ], { cwd: root, encoding: "utf8" });

    assert.equal(res.status, 0, `Dry-run should succeed. Stderr: ${res.stderr}`);
    const dryRun = JSON.parse(res.stdout);

    assert.equal(dryRun.caseId, "hopf-degree-theorem");
    assert.equal(dryRun.goldRevision, "v1");
    assert.equal(dryRun.promptVersion, "sol-score-prompt-v3");
    assert.equal(dryRun.model, "gpt-5.6-sol");

    // Verify graphComparison is present in dry-run
    assert.ok(dryRun.graphComparison, "Dry-run output must contain graphComparison");
    assert.ok(dryRun.graphComparison.gold, "Dry-run graphComparison must have gold");
    assert.ok(dryRun.graphComparison.candidate, "Dry-run graphComparison must have candidate");
    assert.equal(typeof dryRun.graphComparison.gold.entryCount, "number");
    assert.equal(typeof dryRun.graphComparison.candidate.entryCount, "number");

    // Verify isolation plan is present and auditable
    assert.ok(dryRun.isolation, "Dry-run output must contain isolation plan");
    assert.equal(dryRun.isolation.stagingMode, "mkdtemp");
    assert.deepEqual(
      [...dryRun.isolation.stagedFiles].sort(),
      ["candidate.json", "gold.json", "graph-metrics.json", "sol-score-schema.json"]
    );
    assert.equal(dryRun.isolation.sandbox, "read-only");

    // Verify no spec, conventions, or PDF fields/paths exposed in dry-run output
    assert.equal(dryRun.specPath, undefined, "Dry-run must not contain specPath");
    assert.equal(dryRun.conventionsPath, undefined, "Dry-run must not contain conventionsPath");
    assert.equal(res.stdout.includes("benchmark-spec.json"), false, "Dry-run must not expose benchmark-spec.json");
    assert.equal(res.stdout.includes("objective-conventions.md"), false, "Dry-run must not expose objective-conventions.md");
    assert.equal(res.stdout.includes(".pdf"), false, "Dry-run must not expose .pdf paths");

    // Verify prompt in dry-run uses staged local paths and has no unresolved placeholders
    assert.ok(dryRun.prompt.includes("Gold JSON：`gold.json`"));
    assert.ok(dryRun.prompt.includes("candidate JSON：`candidate.json`"));
    assert.ok(dryRun.prompt.includes("图结构指标：`graph-metrics.json`"));
    assert.equal(dryRun.prompt.match(/\{\{.*?\}\}/gu), null, "Dry-run prompt must have zero unresolved placeholders");
  });
});
