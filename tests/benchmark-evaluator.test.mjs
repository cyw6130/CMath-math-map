/**
 * benchmark-evaluator.test.mjs
 * Tests for the unified benchmark evaluator (scripts/evaluate-benchmark.mjs).
 * Verifies scoring logic, hard gates, format/semantic component calculation,
 * and diagnostic report structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import semantics from "../math-map-semantics.js";
import paperImportClient from "../paper-import-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function runEvaluator(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [path.join(root, "scripts/evaluate-benchmark.mjs"), ...args], { cwd: root });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => {
      try { resolve({ code, output: JSON.parse(stdout), stderr }); }
      catch { resolve({ code, output: null, raw: stdout, stderr }); }
    });
    proc.on("error", reject);
  });
}

const casesRoot = path.join(root, "benchmarks/paper-import/cases");

// ─── self-compare tests ────────────────────────────────────────────────────

describe("Self-comparison (gold vs. gold)", () => {
  it("hopf-degree-theorem self-compare scores 100/100/100", async () => {
    const { code, output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.formatScore, 100, "formatScore should be 100");
    assert.equal(output.semanticScore, 100, "semanticScore should be 100");
    assert.equal(output.overallScore, 100, "overallScore should be 100");
    assert.equal(output.eligibleForComparison, true);
    assert.equal(output.b0Errors.length, 0, "no B0 errors");
    assert.equal(output.proofEdgeErrors.length, 0, "no proof edge errors");
    assert.equal(output.missingEntries.length, 0, "no missing entries");
  });

  it("knot-hopf-rt self-compare scores 100/100/100", async () => {
    const { code, output } = await runEvaluator(["--case", "knot-hopf-rt", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.formatScore, 100);
    assert.equal(output.semanticScore, 100);
    assert.equal(output.overallScore, 100);
  });

  it("4-dim-skein self-compare scores 100/100/100", async () => {
    const { code, output } = await runEvaluator(["--case", "4-dim-skein-modules-handles-tangles", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.formatScore, 100);
    assert.equal(output.semanticScore, 100);
  });

  it("cornered-skein self-compare scores 100/100/100", async () => {
    const { code, output } = await runEvaluator(["--case", "cornered-skein-lasagna-theory", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.formatScore, 100);
    assert.equal(output.semanticScore, 100);
  });

  it("yasui self-compare scores 100/100/100", async () => {
    const { code, output } = await runEvaluator(["--case", "yasui-2019-geometrically-simply-connected-4-manifolds", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.formatScore, 100);
    assert.equal(output.semanticScore, 100);
  });
});

// ─── overall score formula ─────────────────────────────────────────────────

describe("Overall score formula: overallScore = 0.4 * format + 0.6 * semantic", () => {
  it("verifies formula holds for hopf self-compare", async () => {
    const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    const expected = Math.round(10 * (0.4 * output.formatScore + 0.6 * output.semanticScore)) / 10;
    assert.equal(output.overallScore, expected, `formula: 0.4 × ${output.formatScore} + 0.6 × ${output.semanticScore} = ${expected}`);
  });
});

// ─── hard gate tests ───────────────────────────────────────────────────────

describe("Hard gate: eligibleForComparison=false when normalization fails", () => {
  it("repairs projectTitle from project.title, deducts format points, and continues semantic scoring", async () => {
    const gold = JSON.parse(fs.readFileSync(path.join(casesRoot, "hopf-degree-theorem/gold-project-view.json"), "utf8"));
    delete gold.projectTitle;
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-repair-title.json");
    fs.writeFileSync(tmpFile, JSON.stringify(gold));
    try {
      const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(output.eligibleForComparison, true);
      assert.equal(output.formatScore, 95);
      assert.equal(output.semanticScore, 100);
      assert.ok(output.notes.some((note) => note.includes("projectTitle-from-project.title")));
    } finally { fs.unlinkSync(tmpFile); }
  });

  it("still hard-gates when both title locations are absent", async () => {
    const gold = JSON.parse(fs.readFileSync(path.join(casesRoot, "hopf-degree-theorem/gold-project-view.json"), "utf8"));
    delete gold.projectTitle;
    delete gold.project.title;
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-no-title.json");
    fs.writeFileSync(tmpFile, JSON.stringify(gold));
    try {
      const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(output.eligibleForComparison, false);
      assert.ok(output.overallScore <= 49);
    } finally { fs.unlinkSync(tmpFile); }
  });
  it("empty object yields hard gate and overallScore ≤ 49", async () => {
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-empty.json");
    fs.writeFileSync(tmpFile, JSON.stringify({}));
    try {
      const { code, output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(code, 0, "evaluator should not crash on empty input");
      assert.equal(output.eligibleForComparison, false, "should fail hard gate on empty input");
      assert.ok(output.overallScore <= 49, `overallScore ${output.overallScore} should be ≤ 49`);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("valid view passes hard gate and has overallScore > 0", async () => {
    const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    assert.equal(output.eligibleForComparison, true);
    assert.ok(output.overallScore > 0);
  });

  it("does not treat different but internally valid entry IDs as a format defect", async () => {
    const raw = JSON.parse(fs.readFileSync(path.join(root, "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json"), "utf8"));
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-alt-ids.json");
    fs.writeFileSync(tmpFile, JSON.stringify(raw));
    try {
      const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(output.eligibleForComparison, true);
      assert.equal(output.formatScore, 95, "only the repairable projectTitle defect should reduce format score");
      assert.equal(output.proofEdgeErrors.length, 0);
    } finally { fs.unlinkSync(tmpFile); }
  });
});

// ─── Kirby accepted-gold standard answer ──────────────────────────────────

describe("Kirby accepted-gold standard answer", () => {
  it("kirby self-compare is a full self-match", async () => {
    const { code, output } = await runEvaluator(["--case", "kirby-2018-trisections", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.referenceStatus, "accepted-gold");
    assert.equal(output.formatScore, 100);
    assert.equal(output.semanticScore, 100);
  });
});

// ─── format component structure ────────────────────────────────────────────

describe("Format score components", () => {
  it("format components sum to formatScore", async () => {
    const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    const componentSum = Object.values(output.formatComponents).reduce((a, b) => a + b, 0);
    assert.equal(componentSum, output.formatScore);
  });

  it("format components include all 5 keys", async () => {
    const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    const keys = Object.keys(output.formatComponents);
    for (const key of ["normalization", "entryValidity", "inferenceValidity", "b0Boundary", "closureDAG"]) {
      assert.ok(keys.includes(key), `missing formatComponent key: ${key}`);
    }
  });
});

// ─── semantic component structure ─────────────────────────────────────────

describe("Semantic score components", () => {
  it("semantic components include all 6 keys", async () => {
    const { output } = await runEvaluator(["--case", "hopf-degree-theorem", "--self-compare"]);
    const keys = Object.keys(output.semanticComponents);
    for (const key of ["objectCoverage", "b0Similarity", "mainGoal", "proofEdges", "closureStates", "sourceAttribution"]) {
      assert.ok(keys.includes(key), `missing semanticComponent key: ${key}`);
    }
  });
});

// ─── B0 source-attribution diagnostics ────────────────────────────────────

describe("B0 and source-attribution diagnostics", () => {
  it("well-formed gold has no B0 errors or source-attribution errors", async () => {
    const { output } = await runEvaluator(["--case", "cornered-skein-lasagna-theory", "--self-compare"]);
    assert.equal(output.b0Errors.length, 0, "no B0 errors for cornered gold");
    assert.equal(output.sourceAttributionErrors.length, 0, "no source-attribution errors for cornered gold");
  });
});

// ─── report command ───────────────────────────────────────────────────────

describe("--report command", () => {
  it("produces a report with caseStatuses, selfCompareScores, modelOutputScores", async () => {
    const { code, output } = await runEvaluator(["--report"]);
    assert.equal(code, 0);
    assert.ok(output.caseStatuses, "report has caseStatuses");
    assert.ok(Array.isArray(output.selfCompareScores), "report has selfCompareScores array");
    assert.ok(Array.isArray(output.modelOutputScores), "report has modelOutputScores array");
    assert.ok(output.generatedAt, "report has generatedAt timestamp");
    assert.equal(output.selfCompareScores.length, 6, "6 eligible cases for self-compare");
  });

  it("all self-compare scores in report are 100", async () => {
    const { output } = await runEvaluator(["--report"]);
    for (const sc of output.selfCompareScores) {
      assert.equal(sc.formatScore, 100, `${sc.caseId} formatScore should be 100`);
      assert.equal(sc.semanticScore, 100, `${sc.caseId} semanticScore should be 100`);
    }
  });

  it("official report includes only DeepSeek V4 Flash model outputs", async () => {
    const { output } = await runEvaluator(["--report"]);
    assert.ok(output.modelOutputScores.length > 0);
    assert.ok(output.modelOutputScores.every((row) => row.file.includes("deepseek-v4-flash")));
    assert.equal(output.modelOutputScores.some((row) => row.file.includes("deepseek-v4-pro")), false);
  });
});

// ─── audit integration ─────────────────────────────────────────────────────

describe("Audit script: all 6 cases found and scoring-eligible", () => {
  it("audit:benchmarks exits 0 and reports 6 scoring-eligible cases", async () => {
    const result = await new Promise((resolve) => {
      const proc = spawn("node", ["scripts/audit-paper-benchmarks.mjs"], { cwd: root });
      let stdout = "";
      proc.stdout.on("data", (d) => { stdout += d; });
      proc.on("close", (code) => {
        try { resolve({ code, output: JSON.parse(stdout) }); }
        catch { resolve({ code, output: null, raw: stdout }); }
      });
    });
    assert.equal(result.code, 0, "audit script should exit 0");
    assert.equal(result.output.cases, 6, "should audit all 6 cases");
    assert.equal(result.output.scoringEligible, 6, "should have 6 scoring-eligible cases");
    assert.equal(result.output.structuralErrors, 0, "should have 0 structural errors");
  });
});

// ─── regression tests ──────────────────────────────────────────────────────

describe("Regression: Proof closure, cycles, boundary invariants, and single authority", () => {
  it("an ungrounded proof conclusion stays open in claim closure", () => {
    const entries = [
      { id: "e:def:1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Definition 1" },
      { id: "e:claim:b0", entryClass: "claim", claimKind: "lemma", title: "B0 Lemma", statement: "B0 statement" },
      { id: "e:claim:ungrounded", entryClass: "claim", claimKind: "lemma", title: "Ungrounded Claim", statement: "Not proved, not in B0" },
      { id: "e:claim:conclusion", entryClass: "claim", claimKind: "theorem", title: "Derived Theorem", statement: "Proved from ungrounded" },
    ];
    const inferences = [
      {
        id: "inf:1",
        operationKind: "proof",
        title: "Proof of Conclusion",
        premises: ["e:def:1", "e:claim:ungrounded"],
        conclusion: "e:claim:conclusion",
      },
    ];
    const closure = semantics.computeClaimClosure(entries, inferences, {
      b0ClaimEntryIds: ["e:claim:b0"],
    });
    assert.equal(closure.claimStates["e:claim:b0"], "established");
    assert.equal(closure.claimStates["e:claim:ungrounded"], "open");
    assert.equal(closure.claimStates["e:claim:conclusion"], "open", "Ungrounded conclusion must remain open");
  });

  it("a Claim cycle needs an established external entry point", () => {
    const entries = [
      { id: "c:claim:A", entryClass: "claim", claimKind: "theorem", title: "Claim A", statement: "Statement A" },
      { id: "c:claim:B", entryClass: "claim", claimKind: "theorem", title: "Claim B", statement: "Statement B" },
    ];
    const reciprocalProofs = [
      { id: "inf:A_to_B", operationKind: "proof", title: "A implies B", premises: ["c:claim:A"], conclusion: "c:claim:B" },
      { id: "inf:B_to_A", operationKind: "proof", title: "B implies A", premises: ["c:claim:B"], conclusion: "c:claim:A" },
    ];

    const ungrounded = semantics.computeClaimClosure(entries, reciprocalProofs, { b0ClaimEntryIds: [] });
    assert.equal(ungrounded.claimStates["c:claim:A"], "open");
    assert.equal(ungrounded.claimStates["c:claim:B"], "open");

    const grounded = semantics.computeClaimClosure(entries, [
      ...reciprocalProofs,
      { id: "inf:direct_A", operationKind: "proof", title: "Direct proof of A", premises: [], conclusion: "c:claim:A" },
    ], { b0ClaimEntryIds: [] });
    assert.equal(grounded.claimStates["c:claim:A"], "established");
    assert.equal(grounded.claimStates["c:claim:B"], "established");
  });

  it("Kirby external entries are B0 and have no proof conclusions", () => {
    const kirbyGold = JSON.parse(fs.readFileSync(path.join(casesRoot, "kirby-2018-trisections", "gold-project-view.json"), "utf8"));
    const kirbySpec = JSON.parse(fs.readFileSync(path.join(casesRoot, "kirby-2018-trisections", "benchmark-spec.json"), "utf8"));

    const externalIds = [
      "paper:thm:relative-trisection",
      "paper:thm:existence-stable-uniqueness",
      "paper:prop:open-book-gluing",
      "paper:thm:group-trisection-existence",
    ];

    const goldB0 = new Set(kirbyGold.b0ClaimEntryIds);
    const specB0 = new Set(kirbySpec.boundaryB0Invariants.exactB0ClaimIds);
    const goldProofConclusions = new Set(kirbyGold.inferences.filter((i) => i.operationKind === "proof").map((i) => i.conclusion));
    const specProofConclusions = new Set(kirbySpec.requiredObjects.proofInferences.map((i) => i.conclusion));

    for (const id of externalIds) {
      assert.ok(goldB0.has(id), `${id} must be in gold b0ClaimEntryIds`);
      assert.ok(specB0.has(id), `${id} must be in spec exactB0ClaimIds`);
      assert.equal(goldProofConclusions.has(id), false, `${id} must not have a gold proof inference`);
      assert.equal(specProofConclusions.has(id), false, `${id} must not have a spec proof inference`);

      const entry = kirbyGold.entries.find((e) => e.id === id);
      assert.ok(entry, `entry ${id} exists in gold`);
      assert.equal(entry.entryClass, "claim", `${id} entryClass must remain claim`);
      assert.ok(entry.sourceReference && entry.sourceReference.length > 0, `${id} must have explicit sourceReference`);
    }
  });

  it("accepted-gold reference is eligible for scoring authority", async () => {
    const { code, output } = await runEvaluator(["--case", "kirby-2018-trisections", "--self-compare"]);
    assert.equal(code, 0);
    assert.equal(output.eligibleForComparison, true, "accepted-gold reference must be eligibleForComparison=true");
    assert.equal(output.semanticScore, 100, "accepted-gold self-compare must have semanticScore=100");
    assert.equal(output.overallScore, 100, "accepted-gold self-compare must have overallScore=100");
  });

  it("invalid raw candidate is gated and capped at overallScore <= 49", async () => {
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-invalid-raw.json");
    const invalidView = {
      projectTitle: "Invalid Candidate",
      entries: [
        { id: "e:bad", entryClass: "fact", factKind: "unknownKind", title: "Bad $Unmatched", statement: "Bad" }
      ],
      inferences: []
    };
    fs.writeFileSync(tmpFile, JSON.stringify({ view: invalidView }));
    try {
      const { code, output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(code, 0);
      assert.equal(output.eligibleForComparison, false, "Invalid raw candidate must fail comparison gate");
      assert.ok(output.overallScore <= 49, `overallScore ${output.overallScore} must be <= 49`);
      assert.ok(output.notes.some((n) => n.includes("Hard gate")), "notes must record Hard gate");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("source attribution violation is gated and capped with explicit errors", async () => {
    const tmpFile = path.join(root, "benchmarks/model-outputs/.tmp-test-source-attr.json");
    const hopfGold = JSON.parse(fs.readFileSync(path.join(casesRoot, "hopf-degree-theorem", "gold-project-view.json"), "utf8"));
    const badCandidate = structuredClone(hopfGold);
    // Add a proof inference that concludes a B0 claim
    badCandidate.inferences.push({
      id: "paper:proof:fake-isotopy",
      operationKind: "proof",
      displayLabel: "证明 · 99 · 伪造等痕证明",
      shortTitle: "伪造证明",
      title: "伪造等痕引理证明",
      statement: "伪造证明",
      premises: ["paper:def:degree"],
      conclusion: "paper:b0:isotopy",
      argument: "伪造论证",
      sourcePath: "hopf map.pdf#page=2",
    });
    fs.writeFileSync(tmpFile, JSON.stringify({ view: badCandidate }));
    try {
      const { code, output } = await runEvaluator(["--case", "hopf-degree-theorem", "--candidate", tmpFile]);
      assert.equal(code, 0);
      assert.equal(output.eligibleForComparison, false, "Source attribution violation must make eligibleForComparison=false");
      assert.ok(output.overallScore <= 49, `overallScore ${output.overallScore} must be <= 49`);
      assert.ok(output.sourceAttributionErrors.length > 0, "Must have explicit sourceAttributionErrors");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("legacy tests read canonical files and no fixtures remain as authority", () => {
    const hopfTestContent = fs.readFileSync(path.join(root, "tests/paper-import-benchmark.test.mjs"), "utf8");
    const rtTestContent = fs.readFileSync(path.join(root, "tests/knot-hopf-rt-benchmark.test.mjs"), "utf8");

    assert.ok(hopfTestContent.includes("benchmarks/paper-import/cases"), "Hopf test must point to canonical cases");
    assert.ok(!hopfTestContent.includes("fixtures/hopf-paper"), "Hopf test must not point to fixtures");

    assert.ok(rtTestContent.includes("benchmarks/paper-import/cases"), "RT test must point to canonical cases");
    assert.ok(!rtTestContent.includes("fixtures/knot-hopf-rt"), "RT test must not point to fixtures");

    assert.equal(fs.existsSync(path.join(root, "tests/fixtures")), false, "tests/fixtures directory must be removed");
  });
});
