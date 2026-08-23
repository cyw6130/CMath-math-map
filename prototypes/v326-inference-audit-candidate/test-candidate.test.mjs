import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import modules from "../../paper-import-modules-v3.26.js";
import candidate from "./candidate-inference-module.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixedOutputsDir = path.resolve(__dirname, "../../benchmarks/model-outputs/fixed-1.0");

const benchmarkCases = [
  { id: "4-dim-skein-modules-handles-tangles", short: "4D", file: "4-dim-skein-modules-handles-tangles-v3.26-20260818T100409Z.json", expectedMainTargetEstablished: true },
  { id: "hopf-degree-theorem", short: "Hopf", file: "hopf-degree-theorem-v3.26-20260818T095349Z.json", expectedMainTargetEstablished: true },
  { id: "cornered-skein-lasagna-theory", short: "Cornered", file: "cornered-skein-lasagna-theory-v3.26-20260818T100746Z.json", expectedMainTargetEstablished: true },
  { id: "yasui-2019-geometrically-simply-connected-4-manifolds", short: "Yasui", file: "yasui-2019-geometrically-simply-connected-4-manifolds-v3.26-20260818T101135Z.json", expectedMainTargetEstablished: true },
  { id: "kirby-2018-trisections", short: "Kirby", file: "kirby-2018-trisections-v3.26-20260818T101550Z.json", expectedMainTargetEstablished: false },
  { id: "knot-hopf-rt", short: "Knot-Hopf-RT", file: "knot-hopf-rt-v3.26-20260818T095734Z.json", expectedMainTargetEstablished: false },
];

test("candidate inference graph analysis processes all 6 fixed-1.0 benchmark artifacts", () => {
  for (const c of benchmarkCases) {
    const raw = JSON.parse(fs.readFileSync(path.join(fixedOutputsDir, c.file), "utf8"));
    const view = modules.selectProjectView(raw);
    const analysis = candidate.analyzeInferenceGraph(view);

    assert.ok(analysis.entryCount > 0, `${c.short} entryCount should be positive`);
    assert.equal(typeof analysis.inferenceCount, "number");
    assert.equal(analysis.isMainTargetEstablished, c.expectedMainTargetEstablished, `${c.short} main target establishment mismatch`);
    
    // Check isolated entries count consistency
    const totalEntries = analysis.entryCount;
    const isolatedCount = analysis.isolatedSummary.total;
    assert.ok(isolatedCount <= totalEntries, `${c.short} isolated count cannot exceed total entries`);
    assert.equal(analysis.isolatedSummary.facts + analysis.isolatedSummary.claims, isolatedCount, `${c.short} facts + claims should equal isolated total`);
  }
});

test("format module passes structural validation on all 6 fixed-1.0 outputs", () => {
  for (const c of benchmarkCases) {
    const raw = JSON.parse(fs.readFileSync(path.join(fixedOutputsDir, c.file), "utf8"));
    const report = modules.validateFormatArtifact(raw, { caseId: c.id });
    assert.equal(report.passed, true, `${c.short} format validation must pass`);
    assert.equal(report.formatScore, 40, `${c.short} formatScore should be 40`);
  }
});

test("candidate issue detection flags orphan main target in Knot-Hopf-RT without breaking mature cases", () => {
  // Knot-Hopf-RT
  const rtRaw = JSON.parse(fs.readFileSync(path.join(fixedOutputsDir, "knot-hopf-rt-v3.26-20260818T095734Z.json"), "utf8"));
  const rtView = modules.selectProjectView(rtRaw);
  const rtIssues = candidate.collectCandidateInferenceIssues(rtView);
  assert.ok(rtIssues.length > 0, "Knot-Hopf-RT should trigger main target inference issue");
  assert.match(rtIssues[0], /缺少推导证明/u);

  // 4D (Mature)
  const d4Raw = JSON.parse(fs.readFileSync(path.join(fixedOutputsDir, "4-dim-skein-modules-handles-tangles-v3.26-20260818T100409Z.json"), "utf8"));
  const d4View = modules.selectProjectView(d4Raw);
  const d4Issues = candidate.collectCandidateInferenceIssues(d4View);
  assert.equal(d4Issues.length, 0, "4D should have zero candidate inference issues");
});

test("candidate prompt policy defines strictly zero modifications to Entry and Format modules", () => {
  const policy = candidate.CANDIDATE_ASSEMBLY_PROMPT_POLICY;
  assert.ok(policy.changes.some((c) => c.ruleId === "strictly-zero-modification-to-entry-and-format"));
  assert.ok(policy.changes.some((c) => c.ruleId === "remove-inference-cap-suggestion"));
  assert.ok(policy.changes.some((c) => c.ruleId === "mainline-proof-coverage-mandate"));
});
