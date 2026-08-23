#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildVerificationPrompt({ consolidatedText, sourceText, caseId }) {
  return `你是数学论文产物校验专家。输入为初版 Entry 产物（JSON）与源文本（MinerU 提取的 Markdown，含 [[PAGE N]] 标记）。请忠实比对，不补造论文没有的内容。

【任务】
1. 前提条件清单与实质性数学性质/对应关系独立提取：源文本中以清单或条件形式列出、并作为后续论证长期前提的技术条件（如对输入理论/结构的公理或最小条件约束），若初版产物中缺失，必须补一条 definition；源文本中以独立句子或表格形式陈述的实质性数学性质/命题/对应关系（包括代数结构与范畴结构的对应如余积→张量积、对极→对偶、R-矩阵→辫结构、扭元→扭结构，以及某构造的不变性、等价性、函子性、有限性、非退化性等关键属性），若初版产物中缺失且该内容在后续论证中被实际使用，必须补一条 lemma/proposition/definition。
2. 平衡张量积与作用代数记号逐字保真：涉及双模张量积、Hochschild 同调作用、代数关联缠结等公式时，平衡代数与作用代数的名称与下标必须按源文本逐字转录（如 $\\otimes_{S}$ 的下标），弱化的记号必须订正。
3. 严禁增补原文没有的条件：不得为定义或定理增补"平凡代数交""额外边界匹配"等源文本没有的条件；此类幻觉条目必须标记删除。

输出 JSON（只输出 JSON）：
{"addEntries":[{"id":"paper:def:...","type":"definition","name":"...","statement":"...","page":2}],"corrections":[{"id":"paper:thm:...","statement":"..."}],"removeIds":["paper:def:hallucinated"]}

规则：type 只能是 definition|algorithm|calculation|lemma|proposition|theorem；id 用英文小写 slug；statement 最多 300 字符并保留假设、量词和公式；page 取源文本中的整数页码；数学公式用成对的 $...$ 或 $$...$$。严禁输出 B0、mainTarget、Review。

初版产物（待校验）：
\`\`\`json
${consolidatedText.slice(0, 80000)}
\`\`\`

源文本（以此为准）：
${sourceText.slice(0, 120000)}

案例：${caseId}
`;
}

export function applyPatch(consolidated, patch) {
  const result = JSON.parse(JSON.stringify(consolidated));
  const byId = new Map(result.entries.map((e) => [e.id, e]));

  for (const corr of patch.corrections || []) {
    const entry = byId.get(corr.id);
    if (entry) {
      for (const [k, v] of Object.entries(corr)) {
        if (k !== "id") entry[k] = v;
      }
    }
  }

  for (const id of patch.removeIds || []) {
    byId.delete(id);
  }

  for (const ne of patch.addEntries || []) {
    if (!byId.has(ne.id)) {
      byId.set(ne.id, ne);
    }
  }

  result.entries = [...byId.values()];
  return result;
}

export function buildB0BackfillPrompt({ consolidatedText, sourceText, caseId }) {
  return `你是数学论文产物校验专家。当前任务：B0 外部定理定向补漏。

【任务】
1. 扫描源文本中带引用标记的外部数学结果（引用标记如 [12]、作者年份、due to / by 等表述，且非本文证明）；
2. 与初版产物比对：凡源文本中作为独立陈述出现、但初版产物中没有对应条目的外部结果，必须补一条独立 Entry；
3. 补录条目规范：type 取 lemma|proposition|theorem；external: true；sourceReference 填写可见的引用标记或作者名；statement 完整转录其数学断言与全部前提；
4. 已存在于初版产物中的外部结果不要重复添加。

输出 JSON（只输出 JSON）：
{"addEntries":[{"id":"paper:ext:...","type":"theorem","name":"...","statement":"...","page":3,"external":true,"sourceReference":"[12]"}],"corrections":[],"removeIds":[]}

规则：id 使用英文小写 slug（建议 paper:ext: 前缀）；statement 最多 300 字符并保留假设、量词和公式；page 取 [[PAGE N]] 整数页码。严禁增补源文本没有的结果。

初版产物（待比对）：
\`\`\`json
${consolidatedText.slice(0, 80000)}
\`\`\`

源文本（以此为准）：
${sourceText.slice(0, 120000)}

案例：${caseId}
`;
}

function resolveSparkProviderConfig() {
  const keysPath = process.env.OPENCODE_KEYS_FILE?.trim() || path.join(process.env.HOME || "/Users/chenyuwen", ".gamma-math-map/keys.json");
  let apiKey = process.env.OPENCODE_GO_API_KEY?.trim() || "";
  if (!apiKey && fs.existsSync(keysPath)) {
    try { apiKey = JSON.parse(fs.readFileSync(keysPath, "utf8"))?.providers?.opencode?.apiKey?.trim() || ""; } catch {}
  }
  if (!apiKey) throw new Error("OpenCode Go API key required (set OPENCODE_GO_API_KEY or providers.opencode.apiKey in ~/.gamma-math-map/keys.json)");
  return {
    endpoint: process.env.OPENCODE_GO_ENDPOINT?.trim() || "https://opencode.ai/zen/go/v1",
    model: "muse-spark-1.2-contributor",
    apiKey,
  };
}

async function callSparkOnce(prompt, provider, targetModel) {
  const body = {
    model: targetModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    response_format: { type: "json_object" },
  };
  const endpoint = provider.endpoint.replace(/\/+$/u, "") + "/chat/completions";
  let lastText = "";
  let rawOutput = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    lastText = await resp.text();
    if (resp.status >= 500 && attempt === 1) continue;
    if (!resp.ok) throw new Error(`Spark upstream ${resp.status}: ${lastText.slice(0, 800)}`);
    let parsed;
    try { parsed = JSON.parse(lastText); } catch (e) { throw new Error(`Spark non-JSON: ${e.message} :: ${lastText.slice(0, 800)}`); }
    const content = parsed?.choices?.[0]?.message?.content;
    rawOutput = typeof content === "string" ? content : (Array.isArray(content) ? content.map((c) => c?.text ?? "").join("") : "");
    if (rawOutput.trim()) break;
  }
  if (!rawOutput.trim()) throw new Error(`Spark empty content: ${lastText.slice(0, 800)}`);
  let patch;
  try {
    const match = rawOutput.match(/\{[\s\S]*\}/u);
    patch = JSON.parse(match ? match[0] : rawOutput);
  } catch (err) {
    throw new Error(`Failed to parse patch JSON: ${err.message}\nOutput: ${rawOutput.slice(0, 500)}`);
  }
  return patch;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: node scripts/verify-and-patch-with-spark.mjs <consolidated> <marked.md> <out> [--model=<model>] [--b0]");
    process.exit(1);
  }
  const [consolidatedPath, sourcePath, outPath] = args.filter((a) => !a.startsWith("--"));
  const modelArg = args.find((a) => a.startsWith("--model="))?.slice("--model=".length) || "muse-spark-1.2-contributor";
  const withB0 = args.includes("--b0") || args.includes("--two-pass");

  const consolidatedText = fs.readFileSync(consolidatedPath, "utf8");
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const consolidated = JSON.parse(consolidatedText);
  const caseId = consolidated.caseId || path.basename(path.dirname(consolidatedPath));

  const provider = resolveSparkProviderConfig();
  const targetModel = modelArg.includes("spark") ? modelArg : provider.model;

  // Pass 1: substantive-property + notation verify
  const prompt = buildVerificationPrompt({ consolidatedText, sourceText, caseId });

  // Pass 1
  let patch = await callSparkOnce(prompt, provider, targetModel);
  let patched = applyPatch(consolidated, patch);
  console.log(`Pass 1 (verify): ${consolidated.entries.length} -> ${patched.entries.length} entries (added ${patch.addEntries?.length || 0}, corrected ${patch.corrections?.length || 0}, removed ${patch.removeIds?.length || 0})`);

  // Optional Pass 2: B0 cited-external backfill (W8)
  if (withB0) {
    const patchedText = JSON.stringify(patched, null, 2);
    const b0Prompt = buildB0BackfillPrompt({ consolidatedText: patchedText, sourceText, caseId });
    const b0Patch = await callSparkOnce(b0Prompt, provider, targetModel);
    const before = patched.entries.length;
    patched = applyPatch(patched, b0Patch);
    console.log(`Pass 2 (B0): ${before} -> ${patched.entries.length} entries (added ${b0Patch.addEntries?.length || 0})`);
    patch = { ...patch, addEntries: [...(patch.addEntries || []), ...(b0Patch.addEntries || [])] };
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(patched, null, 2));
  console.log(`Patched total: ${consolidated.entries.length} -> ${patched.entries.length} entries`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
