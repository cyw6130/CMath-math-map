import test from "node:test";
import assert from "node:assert/strict";
import modules from "../src/paper-import/paper-import-modules-v3.26.js";

function entryArtifact() {
  const sourceText = "sample paper text here";
  return { schema: "cmath.paper-entry-artifact/v1", entryModuleVersion: "paper-entry-consolidation-v1.1-model", source: { fileName: "sample.pdf", pageCount: 1, characters: sourceText.length, sourceText }, paperGuide: null, guideLeadSet: null, lanes: { coverageEntries: [], leadGuidedEntries: [] }, aggregation: { records: [], conflicts: [] }, entries: [{ id: "e1", type: "theorem", name: "Theorem", statement: "$x=x$", page: 1 }], aliases: {}, reviewInputs: {}, diagnostics: { durationMs: 0, stages: [], calls: [] } };
}

test("v3.26 modular artifacts are independently stamped", () => {
  const original = entryArtifact();
  const stamped = modules.createEntryModuleArtifact(original, { caseId: "sample" });
  assert.equal(stamped.moduleMetadata.module, "entry");
  assert.equal(stamped.moduleMetadata.backbone, "v3.26");
  assert.equal(original.moduleMetadata, undefined);
  assert.equal(stamped.entries[0].entryClass, "claim");
  assert.equal(stamped.entries[0].claimKind, "theorem");
  assert.equal("type" in stamped.entries[0], false);
  assert.equal("kind" in stamped.entries[0], false);
  const inference = modules.createInferenceModuleArtifact({ entryArtifact: stamped, caseId: "sample", inferenceResult: { workflowVersion: "v3.26", view: { schema: "cmath.project-view-model/v0.1", projectTitle: "Sample", mainTargetEntryId: "e1", entries: [{ id: "e1", entryClass: "claim", claimKind: "theorem", title: "Theorem", shortTitle: "Theorem", statement: "$x=x$", sourcePath: "sample.pdf#page=1" }], inferences: [], derivedResearchState: { mathematicalState: { b0ClaimEntryIds: [] } } } } });
  assert.equal(inference.schema, modules.INFERENCE_ARTIFACT_SCHEMA);
  assert.equal(inference.moduleMetadata.module, "inference");
});

test("format module validates references and reports a 40-point diagnostic scale", () => {
  const report = modules.validateFormatArtifact({ schema: modules.INFERENCE_ARTIFACT_SCHEMA, view: { projectTitle: "Sample", mainTargetEntryId: "c1", entries: [{ id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$", sourcePath: "p.pdf#page=1" }, { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$", sourcePath: "p.pdf#page=1" }], inferences: [{ id: "i1", operationKind: "proof", premises: ["f1"], conclusion: "c1", argument: "Proof", sourcePath: "p.pdf#page=1" }], derivedResearchState: { mathematicalState: { b0ClaimEntryIds: [] } } } });
  assert.equal(report.schema, modules.FORMAT_REPORT_SCHEMA);
  assert.equal(report.passed, true);
  assert.equal(report.formatScore, 40);
  const bad = modules.validateFormatArtifact({ view: { projectTitle: "Bad", mainTargetEntryId: "missing", entries: [], inferences: [] } });
  assert.equal(bad.passed, false);
  assert.ok(bad.checks.some((item) => item.name === "main_target" && !item.passed));
});

test("format module rejects proof-to-Fact and organization-to-Claim edges", () => {
  const view = {
    schema: modules.INFERENCE_ARTIFACT_SCHEMA,
    view: {
      projectTitle: "Invalid relations", mainTargetEntryId: "c1",
      entries: [
        { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$" },
        { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$" },
      ],
      inferences: [
        { id: "proof-bad", operationKind: "proof", premises: ["f1"], conclusion: "f1" },
        { id: "org-bad", operationKind: "organization", premises: ["f1"], conclusion: "c1" },
      ],
    },
  };
  const report = modules.validateFormatArtifact(view);
  assert.equal(report.passed, false);
  assert.equal(report.formatScoreMax, 40);
  assert.equal(report.checks.find((item) => item.name === "proof_conclusion_claim").passed, false);
  assert.equal(report.checks.find((item) => item.name === "organization_fact_link").passed, false);
});

test("format module does not treat an arbitrary object as a Project View", () => {
  const report = modules.validateFormatArtifact({ projectTitle: "not a map" });
  assert.equal(report.passed, false);
  assert.equal(report.checks.find((item) => item.name === "json_object").passed, false);
});

test("format module requires non-empty unique inference IDs", () => {
  const baseView = () => ({
    schema: modules.INFERENCE_ARTIFACT_SCHEMA,
    view: {
      projectTitle: "Inference ID test",
      mainTargetEntryId: "c1",
      entries: [
        { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$" },
        { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$" },
      ],
      inferences: [
        { id: "i1", operationKind: "proof", premises: ["f1"], conclusion: "c1" },
        { id: "i2", operationKind: "proof", premises: ["f1"], conclusion: "c1" },
      ],
    },
  });

  const validReport = modules.validateFormatArtifact(baseView());
  assert.equal(validReport.passed, true);
  assert.equal(validReport.checks.find((item) => item.name === "inference_shape").passed, true);

  const missingIdView = baseView();
  delete missingIdView.view.inferences[0].id;
  const missingIdReport = modules.validateFormatArtifact(missingIdView);
  assert.equal(missingIdReport.passed, false);
  assert.equal(missingIdReport.checks.find((item) => item.name === "inference_shape").passed, false);

  const emptyIdView = baseView();
  emptyIdView.view.inferences[0].id = "   ";
  const emptyIdReport = modules.validateFormatArtifact(emptyIdView);
  assert.equal(emptyIdReport.passed, false);
  assert.equal(emptyIdReport.checks.find((item) => item.name === "inference_shape").passed, false);

  const dupIdView = baseView();
  dupIdView.view.inferences[1].id = "i1";
  const dupIdReport = modules.validateFormatArtifact(dupIdView);
  assert.equal(dupIdReport.passed, false);
  assert.equal(dupIdReport.checks.find((item) => item.name === "inference_shape").passed, false);
});

test("format module rejects inference premises containing conclusion self-loop", () => {
  const loopView = {
    schema: modules.INFERENCE_ARTIFACT_SCHEMA,
    view: {
      projectTitle: "Self-loop test",
      mainTargetEntryId: "c1",
      entries: [
        { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$" },
        { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$" },
      ],
      inferences: [
        { id: "i1", operationKind: "proof", premises: ["f1", "c1"], conclusion: "c1" },
      ],
    },
  };
  const report = modules.validateFormatArtifact(loopView);
  assert.equal(report.passed, false);
  assert.equal(report.formatScoreMax, 40);
  assert.equal(report.checks.find((item) => item.name === "inference_no_self_loop").passed, false);
});

test("run-paper-format-check script exits with code 1 when validation fails and 0 when passed", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "format-check-test-"));
  try {
    const validArtifactPath = path.join(tmpDir, "valid.json");
    const invalidArtifactPath = path.join(tmpDir, "invalid.json");
    const reportValidPath = path.join(tmpDir, "report-valid.json");
    const reportInvalidPath = path.join(tmpDir, "report-invalid.json");
    const scriptPath = fileURLToPath(new URL("../scripts/run-paper-format-check.mjs", import.meta.url));

    const validData = {
      schema: modules.INFERENCE_ARTIFACT_SCHEMA,
      view: {
        projectTitle: "Valid",
        mainTargetEntryId: "c1",
        entries: [
          { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$" },
          { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$" },
        ],
        inferences: [
          { id: "i1", operationKind: "proof", premises: ["f1"], conclusion: "c1" },
        ],
      },
    };
    const invalidData = {
      schema: modules.INFERENCE_ARTIFACT_SCHEMA,
      view: {
        projectTitle: "Invalid",
        mainTargetEntryId: "c1",
        entries: [
          { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact", statement: "$x$" },
          { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=x$" },
        ],
        inferences: [
          { id: "i1", operationKind: "proof", premises: ["c1"], conclusion: "c1" },
        ],
      },
    };

    fs.writeFileSync(validArtifactPath, JSON.stringify(validData));
    fs.writeFileSync(invalidArtifactPath, JSON.stringify(invalidData));

    const validRun = spawnSync(process.execPath, [scriptPath, validArtifactPath, reportValidPath], { encoding: "utf8" });
    assert.equal(validRun.status, 0);
    const validOut = JSON.parse(validRun.stdout);
    assert.equal(validOut.status, "passed");

    const invalidRun = spawnSync(process.execPath, [scriptPath, invalidArtifactPath, reportInvalidPath], { encoding: "utf8" });
    assert.equal(invalidRun.status, 1);
    const invalidOut = JSON.parse(invalidRun.stdout);
    assert.equal(invalidOut.status, "failed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("format module rejects duplicate premises and empty conclusion in inferences", () => {
  const baseView = () => ({
    schema: modules.INFERENCE_ARTIFACT_SCHEMA,
    view: {
      projectTitle: "Premises & Conclusion Test",
      mainTargetEntryId: "c1",
      entries: [
        { id: "f1", entryClass: "fact", factKind: "definition", title: "Fact 1", statement: "$x$" },
        { id: "f2", entryClass: "fact", factKind: "definition", title: "Fact 2", statement: "$y$" },
        { id: "c1", entryClass: "claim", claimKind: "theorem", title: "Claim", statement: "$x=y$" },
      ],
      inferences: [
        { id: "i1", operationKind: "proof", premises: ["f1", "f2"], conclusion: "c1" },
      ],
    },
  });

  const validReport = modules.validateFormatArtifact(baseView());
  assert.equal(validReport.passed, true);
  assert.equal(validReport.formatScore, 40);

  // Duplicate premise in same inference
  const dupPremiseView = baseView();
  dupPremiseView.view.inferences[0].premises = ["f1", "f1"];
  const dupReport = modules.validateFormatArtifact(dupPremiseView);
  assert.equal(dupReport.passed, false);
  assert.equal(dupReport.checks.find((item) => item.name === "inference_shape").passed, false);

  // Empty conclusion string
  const emptyConclusionView = baseView();
  emptyConclusionView.view.inferences[0].conclusion = "   ";
  const emptyConclusionReport = modules.validateFormatArtifact(emptyConclusionView);
  assert.equal(emptyConclusionReport.passed, false);
  assert.equal(emptyConclusionReport.checks.find((item) => item.name === "inference_shape").passed, false);

  // Non-string / whitespace-only premise
  const invalidPremiseView = baseView();
  invalidPremiseView.view.inferences[0].premises = ["f1", "   "];
  const invalidPremiseReport = modules.validateFormatArtifact(invalidPremiseView);
  assert.equal(invalidPremiseReport.passed, false);
  assert.equal(invalidPremiseReport.checks.find((item) => item.name === "inference_shape").passed, false);

  // Trailing whitespace duplicate entry ID
  const dupEntryView = baseView();
  dupEntryView.view.entries.push({ id: "f1 ", entryClass: "fact", factKind: "definition", title: "Duplicate Fact", statement: "$z$" });
  const dupEntryReport = modules.validateFormatArtifact(dupEntryView);
  assert.equal(dupEntryReport.passed, false);
  assert.equal(dupEntryReport.checks.find((item) => item.name === "entry_ids_unique").passed, false);
});

