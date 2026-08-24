#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import entryVerification from "../src/paper-import/entry/verification.js";

// Keep the CLI's public helpers as direct aliases of the shared Entry Module
// implementation.  This prevents the laboratory script and production client
// from silently acquiring different W7/W8 semantics.
export const buildVerificationPrompt = entryVerification.buildVerificationPrompt;
export const buildB0BackfillPrompt = entryVerification.buildB0BackfillPrompt;
export const applyPatch = entryVerification.applyPatch;
export const runVerificationPipeline = entryVerification.runVerificationPipeline;

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

  let beforeEntries = consolidated.entries.length;
  const patched = await runVerificationPipeline({
    artifact: consolidated,
    sourceText,
    caseId,
    includeB0: withB0,
    requestPatch: ({ prompt }) => callSparkOnce(prompt, provider, targetModel),
    onStage: (stage, info = {}) => {
      if (info.phase !== "complete") {
        if (info.phase === "start") beforeEntries = info.entries ?? beforeEntries;
        return;
      }
      if (stage === "w7-verify") {
        console.log(`Pass 1 (verify): ${beforeEntries} -> ${info.entries} entries (added ${info.added || 0}, corrected ${info.corrected || 0}, removed ${info.removed || 0})`);
      } else if (stage === "w8-b0") {
        console.log(`Pass 2 (B0): ${beforeEntries} -> ${info.entries} entries (added ${info.added || 0})`);
      }
      beforeEntries = info.entries ?? beforeEntries;
    },
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(patched, null, 2));
  console.log(`Patched total: ${consolidated.entries.length} -> ${patched.entries.length} entries`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
