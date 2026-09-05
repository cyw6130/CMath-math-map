#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import modules from "../src/paper-import/paper-import-modules-v3.26.js";

const [inputPath, outputPath, caseId = null] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("usage: node scripts/run-paper-format-check.mjs <projectViewOrRun.json> <format-report.json> [caseId]");
const resolvedInput = path.resolve(inputPath);
const report = modules.validateFormatArtifact(JSON.parse(fs.readFileSync(resolvedInput, "utf8")), { caseId, sourcePath: resolvedInput });
const resolvedOutput = path.resolve(outputPath);
fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
fs.writeFileSync(resolvedOutput, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify({ status: report.passed ? "passed" : "failed", outputPath: resolvedOutput, formatScore: report.formatScore, formatScoreMax: report.formatScoreMax }));
if (!report.passed) {
  process.exitCode = 1;
}

