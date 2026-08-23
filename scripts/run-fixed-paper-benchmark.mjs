#!/usr/bin/env node
/**
 * Fixed paper-import benchmark workflow.
 *
 * This protocol is versioned independently from the paper-import workflow
 * under test. It runs the selected subject once, preserves the raw artifact, then invokes the
 * fixed gpt-5.6-sol scorer. A run without solScore is not benchmark-complete.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const protocolPath = path.join(root, "benchmarks/paper-import/fixed-test-workflow.json");
const protocol = JSON.parse(fs.readFileSync(protocolPath, "utf8"));
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const caseId = value("--case") || "cornered-skein-lasagna-theory";
const underTest = value("--workflow") || "v3.9.3";
const subjectAliases = { luna: "luna", "luna-gateway": "luna", deepseek: "deepseek-flash", flash: "deepseek-flash", "deepseek-flash": "deepseek-flash" };
const requestedSubject = value("--subject") || protocol.defaultSubject;
const subjectId = subjectAliases[requestedSubject] || requestedSubject;
const subject = protocol.subjects?.[subjectId];
if (!subject) throw new Error(`unknown benchmark subject: ${requestedSubject}; choose one of ${Object.keys(protocol.subjects || {}).join(", ")}`);
const selected = protocol.cases.find((item) => item.caseId === caseId);
if (!selected) {
  const retired = protocol.retiredCases?.find((item) => item.caseId === caseId);
  if (retired) {
    throw new Error(`${caseId} is retired and is excluded from future fixed scoring: ${retired.reason}`);
  }
  throw new Error(`unknown fixed benchmark case: ${caseId}`);
}
if (selected.status === "held-out" && !args.includes("--include-held-out")) throw new Error(`${caseId} is held-out; pass --include-held-out explicitly`);
if (!fs.existsSync(selected.sourcePdf)) throw new Error(`source PDF is unreadable: ${selected.sourcePdf}`);
const preflight = (command, commandArgs) => spawnSync(command, commandArgs, { encoding: "utf8", stdio: "pipe" });
const pdfInfo = preflight("pdfinfo", [selected.sourcePdf]);
const pdfText = preflight("pdftotext", ["-f", "1", "-l", "1", selected.sourcePdf, "-"]);
if (pdfInfo.status !== 0 || pdfText.status !== 0) {
  const stamp = new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
  const outputDir = path.join(root, "benchmarks/model-outputs", `fixed-${protocol.workflowVersion}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, `${caseId}-${subjectId}-${underTest}-${stamp}.manifest.json`);
  const manifest = { schema: "cmath.paper-import-fixed-test-run/v3", workflowId: protocol.workflowId, protocolVersion: protocol.workflowVersion, subject: subjectId, caseId, workflowUnderTest: underTest, provider: subject.provider, model: subject.model, reasoningEffort: subject.reasoningEffort, mode: subject.mode, goldRevision: protocol.goldRevision, promptVersion: protocol.scoring?.promptVersion || "sol-score-prompt-v3", status: "input-invalid", artifact: null, solScore: null, solScoreStatus: "not-applicable", preflight: { pdfinfoStatus: pdfInfo.status, pdftotextStatus: pdfText.status } };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
const outputDir = path.join(root, "benchmarks/model-outputs", `fixed-${protocol.workflowVersion}`);
const outputPath = path.join(outputDir, `${caseId}-${subjectId}-${underTest}-${stamp}.json`);
const manifestPath = path.join(outputDir, `${caseId}-${subjectId}-${underTest}-${stamp}.manifest.json`);
fs.mkdirSync(outputDir, { recursive: true });
const runner = path.join(root, "scripts/run-paper-import-model.mjs");
const startedAt = Date.now();
const child = spawnSync(process.execPath, [runner, selected.sourcePdf, outputPath, subject.model, subject.mode, underTest, subject.provider], { cwd: root, env: process.env, encoding: "utf8", stdio: "inherit" });
const completed = child.status === 0 && fs.existsSync(outputPath);
const failurePath = `${outputPath.replace(/\.json$/u, "")}.failed.json`;
const generationDurationMs = Date.now() - startedAt;
const solScorePath = outputPath.replace(/\.json$/u, "-sol-score-v2.json");
let solScore = null;
let solScoreStatus = completed ? "pending" : "not-applicable";
let scoringDurationMs = 0;
if (completed && !args.includes("--skip-sol-score")) {
  const scoringStartedAt = Date.now();
  const scorer = path.join(root, "scripts/score-paper-import-with-sol.mjs");
  const scoring = spawnSync(process.execPath, [scorer, "--case", caseId, "--candidate", outputPath, "--output", solScorePath, "--gold-revision", protocol.goldRevision], { cwd: root, env: process.env, encoding: "utf8", stdio: "inherit" });
  scoringDurationMs = Date.now() - scoringStartedAt;
  if (scoring.status === 0 && fs.existsSync(solScorePath)) {
    solScore = JSON.parse(fs.readFileSync(solScorePath, "utf8")).solScore;
    solScoreStatus = "completed";
  } else {
    solScoreStatus = "failed";
  }
} else if (completed) {
  solScoreStatus = "skipped-explicitly";
}
const manifest = {
  schema: "cmath.paper-import-fixed-test-run/v3",
  workflowId: protocol.workflowId,
  protocolVersion: protocol.workflowVersion,
  subject: subjectId,
  caseId,
  workflowUnderTest: underTest,
  provider: subject.provider, model: subject.model, reasoningEffort: subject.reasoningEffort, mode: subject.mode,
  goldRevision: protocol.goldRevision,
  promptVersion: protocol.scoring?.promptVersion || "sol-score-prompt-v2",
  startedAt: new Date(startedAt).toISOString(), generationDurationMs, scoringDurationMs,
  status: !completed ? "generation-failed" : solScoreStatus === "completed" ? "completed" : "scoring-incomplete",
  artifact: completed ? path.relative(root, outputPath) : (fs.existsSync(failurePath) ? path.relative(root, failurePath) : null),
  solScore,
  solScoreArtifact: fs.existsSync(solScorePath) ? path.relative(root, solScorePath) : null,
  solScoreStatus,
  scoringNote: "solScore from gpt-5.6-sol is the only official score; deterministic machine scores are not part of this workflow"
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
process.exitCode = completed && solScoreStatus === "completed" ? 0 : (child.status ?? 1);
