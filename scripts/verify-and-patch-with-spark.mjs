#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildVerificationPrompt({ consolidatedText, sourceText, caseId }) {
  return `你是数学论文产物校验专家。输入为初版 Entry 产物（JSON）与源文本（MinerU 提取的 Markdown，含 [[PAGE N]] 标记）。请忠实比对，不补造论文没有的内容。

【任务】
1. 前提条件清单与实质性数学性质独立提取：源文本中以清单或条件形式列出、并作为后续论证长期前提的技术条件（如对输入理论/结构的公理或最小条件约束），若初版产物中缺失，必须补一条 definition；源文本中以独立句子陈述的实质性数学性质/命题（包括某构造的不变性、等价性、函子性、有限性、非退化性等关键属性，无论是否带有显式 cue），若初版产物中缺失且该性质在后续论证中被实际使用，必须补一条 lemma/proposition。
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

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: node scripts/verify-and-patch-with-spark.mjs <consolidated> <marked.md> <out> [--model=<model>]");
    process.exit(1);
  }
  const [consolidatedPath, sourcePath, outPath] = args;
  const modelArg = args.find((a) => a.startsWith("--model="))?.slice("--model=".length) || "muse-spark-1.2-contributor";

  const consolidatedText = fs.readFileSync(consolidatedPath, "utf8");
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const consolidated = JSON.parse(consolidatedText);
  const caseId = consolidated.caseId || path.basename(path.dirname(consolidatedPath));

  const prompt = buildVerificationPrompt({ consolidatedText, sourceText, caseId });

  // Call Spark via opencode-go
  const provider = resolveSparkProviderConfig();
  const targetModel = modelArg.includes("spark") ? modelArg : provider.model;
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

  const patched = applyPatch(consolidated, patch);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(patched, null, 2));
  console.log(`Patched: ${consolidated.entries.length} -> ${patched.entries.length} entries (added ${patch.addEntries?.length || 0}, corrected ${patch.corrections?.length || 0}, removed ${patch.removeIds?.length || 0})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
