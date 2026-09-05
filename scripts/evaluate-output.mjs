// 质量评估：读取 test-paper-import.mjs 保存的 output-*.json，检查地图质量指标
import fs from "node:fs";

import semantics from "../capabilities/browser/math-map-semantics.js";
import previewLoader from "../capabilities/browser/generic-math-map-preview-loader.js";
import contentLoader from "../capabilities/browser/math-map-content-loader.js";
import projectAdapter from "../capabilities/browser/math-map-project-adapter.js";

const [outPath] = process.argv.slice(2);
if (!outPath) throw new Error("usage: node evaluate-output.mjs <output.json>");

const { seconds, stages, view } = JSON.parse(fs.readFileSync(outPath, "utf8"));
const entries = view.entries ?? [];
const inferences = view.inferences ?? [];
const b0 = view.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [];

console.log(`== 速度 ==`);
console.log(`总耗时: ${seconds}s`);
const stageCounts = {};
for (const s of stages ?? []) stageCounts[s.stage] = (stageCounts[s.stage] ?? 0) + 1;
console.log(`阶段统计: ${JSON.stringify(stageCounts)}`);

console.log(`\n== 规模 ==`);
const claims = entries.filter((e) => e.entryClass === "claim");
const facts = entries.filter((e) => e.entryClass === "fact");
console.log(`entries: ${entries.length} (fact ${facts.length} / claim ${claims.length}) | inferences: ${inferences.length} | b0: ${b0.length}`);
console.log(`proof: ${inferences.filter((i) => i.operationKind === "proof").length} | organization: ${inferences.filter((i) => i.operationKind === "organization").length}`);

console.log(`\n== 闭包 ==`);
const closure = semantics.computeClaimClosure(entries, inferences, { b0ClaimEntryIds: b0 });
const established = claims.filter((e) => closure.claimStates[e.id] === "established");
const open = claims.filter((e) => closure.claimStates[e.id] !== "established");
console.log(`established: ${established.length} | open: ${open.length}`);
if (open.length) console.log(`open: ${open.map((e) => e.displayLabel).join("；")}`);

console.log(`\n== 完整性体检 ==`);
const problems = [];
const placeholderArgs = inferences.filter((i) => /从略/.test(i.argument ?? ""));
if (placeholderArgs.length) problems.push(`${placeholderArgs.length} 条 argument 是占位文本（本地兜底痕迹）`);
const escapedDollars = entries.filter((e) => /\\\$/.test(`${e.title} ${e.statement}`));
if (escapedDollars.length) problems.push(`${escapedDollars.length} 个 Entry 含转义 \\$（本地兜底痕迹）: ${escapedDollars.map((e) => e.id).join("、")}`);
const overlongStatements = entries.filter((e) => (e.statement ?? "").length > 320);
if (overlongStatements.length) problems.push(`${overlongStatements.length} 个 statement 超过 320 字符`);
const overlongArgs = inferences.filter((i) => (i.argument ?? "").length > 420);
if (overlongArgs.length) problems.push(`${overlongArgs.length} 条 argument 超过 420 字符`);
const badLocators = [...entries, ...inferences].filter((x) => !/#page=\d+/u.test(x.sourcePath ?? ""));
if (badLocators.length) problems.push(`${badLocators.length} 个对象 sourcePath 缺页码: ${badLocators.map((x) => x.id).join("、")}`);
const b0MissingSource = entries.filter((e) => b0.includes(e.id) && !e.sourceReference);
if (b0MissingSource.length) problems.push(`${b0MissingSource.length} 个 B0 缺 sourceReference`);
const isolatedClaims = claims.filter((e) => !b0.includes(e.id) && closure.claimStates[e.id] !== "established" && !inferences.some((i) => i.conclusion === e.id));
console.log(problems.length ? problems.map((p) => `⚠ ${p}`).join("\n") : "无明显体检问题");
console.log(`未被证明且不在 B0 的开放 Claim: ${isolatedClaims.length} 个（正常：论文未证或不依赖外部）`);

console.log(`\n== 适配器诊断 ==`);
const prepared = previewLoader.prepare(view, { loader: contentLoader, adapter: projectAdapter });
console.log(`classificationDiagnostics.issues: ${JSON.stringify(prepared.model.classificationDiagnostics.issues)}`);
console.log(`mainTarget: ${view.mainTargetEntryId} → ${entries.find((e) => e.id === view.mainTargetEntryId)?.displayLabel ?? "?"}`);

console.log(`\n== 条目清单 ==`);
for (const e of entries) console.log(`${e.displayLabel}${b0.includes(e.id) ? " [B0]" : ""}｜${e.sourcePath}`);
