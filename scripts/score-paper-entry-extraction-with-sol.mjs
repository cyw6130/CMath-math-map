#!/usr/bin/env node
/**
 * Sol Entry Extraction Scorer for paper-entry-extraction-v1.
 * Evaluates entry extraction artifacts against Gold reference entries under strict
 * Gold + candidate + schema staging isolation (no PDF, no graph-metrics, no spec/conventions).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PROMPT_VERSION = "sol-entry-score-prompt-v1";
export const SCHEMA_ID = "cmath.paper-entry-sol-score/v1";
export const SCORER_MODEL = "gpt-5.6-sol";
export const SPARK_SCORER_MODEL = "muse-spark-1.2-contributor";
export const VALID_SCORER_MODELS = new Set([SCORER_MODEL, SPARK_SCORER_MODEL]);

/**
 * Validate that an input path exists, is a regular file (not a symlink or directory),
 * and return its resolved absolute path.
 */
function resolveRegularFile(filePath, label) {
  if (typeof filePath !== "string" || !filePath) {
    throw new Error(`required scoring input path is invalid: ${filePath}`);
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`required scoring input is missing: ${resolved}`);
  }
  const lstat = fs.lstatSync(resolved);
  if (lstat.isSymbolicLink()) {
    throw new Error(`scoring input ${label} cannot be a symlink: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`scoring input ${label} is not a regular file: ${resolved}`);
  }
  return resolved;
}

/**
 * Validate a Sol entry score object for strict schema compliance, arithmetic, and identity.
 */
export function validateSolEntryScore(score, {
  caseId,
  goldRevision,
  candidatePath,
  rootDir = process.cwd(),
} = {}) {
  if (!score || typeof score !== "object") {
    throw new Error("Sol entry score output must be a valid JSON object");
  }

  // 1. Identity validation
  if (score.schema !== SCHEMA_ID) {
    throw new Error(`Invalid score schema: expected "${SCHEMA_ID}", got "${score.schema}"`);
  }
  const modelName = String(score.scorerModel || score.scorer || "");
  const normalized = modelName.toLowerCase().replace(/[^a-z0-9]/gu, "");
  // Allow canonical names and free-form model-reporting that contains spark/sol token (e.g. "Muse Spark - Sol Auditor")
  const isSparkLabel = normalized.includes("spark") || normalized.includes("musespark");
  const isSolLabel = normalized.includes("sol") || normalized.includes("gpt56sol") || normalized.includes("gpt5");
  const valid = VALID_SCORER_MODELS.has(modelName)
    || (isSparkLabel && VALID_SCORER_MODELS.has(SPARK_SCORER_MODEL))
    || (isSolLabel && VALID_SCORER_MODELS.has(SCORER_MODEL));
  if (!valid) {
    throw new Error(`Invalid scorer model: expected one of ${[...VALID_SCORER_MODELS].join(", ")}, got "${modelName}"`);
  }
  if (score.promptVersion !== PROMPT_VERSION) {
    throw new Error(`Invalid promptVersion: expected "${PROMPT_VERSION}", got "${score.promptVersion}"`);
  }
  if (caseId && score.caseId !== caseId) {
    throw new Error(`Case ID mismatch: expected "${caseId}", got "${score.caseId}"`);
  }
  if (goldRevision && score.goldRevision !== goldRevision) {
    throw new Error(`Gold revision mismatch: expected "${goldRevision}", got "${score.goldRevision}"`);
  }
  if (candidatePath) {
    const expectedRelative = path.relative(rootDir, candidatePath);
    const candidateMatches = score.candidateArtifact === expectedRelative ||
      score.candidateArtifact === candidatePath ||
      score.candidateArtifact === path.basename(candidatePath) ||
      path.resolve(rootDir, score.candidateArtifact || "") === path.resolve(rootDir, candidatePath);
    if (!candidateMatches) {
      throw new Error(`Candidate artifact mismatch: expected "${expectedRelative}", got "${score.candidateArtifact}"`);
    }
  }

  // 2. Score breakdown & arithmetic (max 45: correctness max 25, completeness max 20)
  if (!Number.isInteger(score.correctness) || score.correctness < 0 || score.correctness > 25) {
    throw new Error(`Invalid correctness: must be an integer between 0 and 25, got ${score.correctness}`);
  }
  if (!Number.isInteger(score.completeness) || score.completeness < 0 || score.completeness > 20) {
    throw new Error(`Invalid completeness: must be an integer between 0 and 20, got ${score.completeness}`);
  }
  const totalSum = score.correctness + score.completeness;
  if (score.solEntryScore !== totalSum) {
    throw new Error(`solEntryScore arithmetic error: solEntryScore is ${score.solEntryScore}, but correctness(${score.correctness}) + completeness(${score.completeness}) is ${totalSum}`);
  }
  if (score.solEntryScore > 45) {
    throw new Error(`Invalid solEntryScore: maximum is 45, got ${score.solEntryScore}`);
  }

  // 3. Verdict validation
  let expectedVerdict = "unusable";
  if (score.solEntryScore >= 40) {
    expectedVerdict = "flawless";
  } else if (score.solEntryScore >= 27) {
    expectedVerdict = "usable";
  }
  if (score.verdict !== expectedVerdict) {
    throw new Error(`Verdict mismatch: score of ${score.solEntryScore}/45 requires verdict "${expectedVerdict}", got "${score.verdict}"`);
  }

  // 4. Content fields validation
  if (typeof score.summary !== "string" || !score.summary.trim()) {
    throw new Error("Summary must be a non-empty string");
  }
  if (!Array.isArray(score.strengths)) {
    throw new Error("strengths must be an array");
  }
  if (!Array.isArray(score.issues)) {
    throw new Error("issues must be an array");
  }
  for (const s of score.strengths) {
    if (typeof s !== "string") throw new Error("Elements of strengths must be strings");
  }
  for (const iss of score.issues) {
    if (typeof iss !== "string") throw new Error("Elements of issues must be strings");
  }

  return true;
}

/**
 * Render prompt template by substituting declared placeholders.
 * Fails closed if any undeclared placeholders exist in template.
 */
export function renderPromptTemplate(template, replacements = {}) {
  const allowedPlaceholders = new Set([
    "GOLD_PATH",
    "CANDIDATE_PATH",
    "SOL_ENTRY_SCORE_SCHEMA_PATH",
    "CASE_ID",
    "GOLD_REVISION",
    "CANDIDATE_ARTIFACT",
  ]);

  const undeclared = [];
  const rendered = template.replace(/__([A-Z0-9_]+)__/gu, (match, key) => {
    if (!allowedPlaceholders.has(key)) {
      undeclared.push(key);
      return match;
    }
    if (!(key in replacements)) {
      throw new Error(`Missing replacement for placeholder: __${key}__`);
    }
    return String(replacements[key]);
  });

  if (undeclared.length > 0) {
    throw new Error(`Undeclared placeholders found in prompt template: ${[...new Set(undeclared)].join(", ")}`);
  }

  return rendered;
}

/**
 * Main execution function
 */
function isSparkScorer(model) {
  return model === SPARK_SCORER_MODEL || model === "muse-spark-1.2";
}

function resolveSparkProviderConfig(explicitModel = SPARK_SCORER_MODEL) {
  const keysPath = process.env.OPENCODE_KEYS_FILE?.trim() || path.join(process.env.HOME || "/Users/chenyuwen", ".gamma-math-map/keys.json");
  let apiKey = process.env.OPENCODE_GO_API_KEY?.trim() || "";
  if (!apiKey && fs.existsSync(keysPath)) {
    try { apiKey = JSON.parse(fs.readFileSync(keysPath, "utf8"))?.providers?.opencode?.apiKey?.trim() || ""; } catch {}
  }
  if (!apiKey) throw new Error("OpenCode Go API key is required for spark scorer (set OPENCODE_GO_API_KEY or provide providers.opencode.apiKey in ~/.gamma-math-map/keys.json)");
  return {
    endpoint: process.env.OPENCODE_GO_ENDPOINT?.trim() || "https://opencode.ai/zen/go/v1",
    model: explicitModel,
    apiKey,
    proxyUrl: process.env.LOCAL_MODEL_PROXY_URL?.trim() || "http://127.0.0.1:7100/api/model-proxy",
  };
}

function createProxyFetch({ proxyUrl, apiKey, fetchImpl = globalThis.fetch } = {}) {
  return async function proxyFetch(targetUrl, init = {}) {
    let requestBody = null;
    if (init.body) {
      try { requestBody = JSON.parse(String(init.body)); } catch { requestBody = init.body; }
    }
    const authHeader = typeof init.headers?.get === "function" ? (init.headers.get("Authorization") || init.headers.get("authorization")) : (init.headers?.Authorization || init.headers?.authorization || "");
    const authKey = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/iu, "").trim() : "";
    const resolvedKey = authKey || apiKey;
    const payload = { targetUrl: String(targetUrl), apiKey: resolvedKey, body: requestBody };
    let proxyResponse;
    try {
      proxyResponse = await fetchImpl(proxyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: init?.signal });
    } catch (err) {
      const isConnRefused = err?.cause?.code === "ECONNREFUSED" || /ECONNREFUSED|connect refused/iu.test(err?.message || "");
      if (isConnRefused) { const e = new Error(`Local model proxy unavailable at ${proxyUrl}`); e.cause = err; throw e; }
      throw err;
    }
    const text = await proxyResponse.text();
    return new Response(text, { status: proxyResponse.status, headers: proxyResponse.headers });
  };
}

async function scoreViaSpark({ renderedPrompt, goldRaw, candidateRaw, schemaText, caseId, goldRevision, candidateArtifact, scorerModel, reasoningEffort = "xhigh" }) {
  const provider = resolveSparkProviderConfig(scorerModel);
  const proxyFetch = createProxyFetch({ proxyUrl: provider.proxyUrl, apiKey: provider.apiKey });
  const inlinePrompt = `${renderedPrompt}\n\n---\nINLINED ARTIFACTS (spark scoring — file staging not available over network; use these verbatim)\n- CaseId: ${caseId}\n- GoldRevision: ${goldRevision}\n- CandidateArtifact: ${candidateArtifact}\n\nGOLD JSON (gold.json):\n\`\`\`json\n${goldRaw.slice(0, 90000)}\n\`\`\`\n\nCANDIDATE JSON (candidate.json):\n\`\`\`json\n${candidateRaw.slice(0, 90000)}\n\`\`\`\n\nSCHEMA JSON (sol-entry-score-schema.json):\n\`\`\`json\n${schemaText}\n\`\`\`\n\nInstructions for spark: You MUST base the numeric scores strictly on the inlined JSON contents above, not on file-system access. Return ONLY the JSON object defined by the schema. Ensure scorerModel is "${SPARK_SCORER_MODEL}", promptVersion is "${PROMPT_VERSION}".`;
  const body = { model: provider.model, messages: [{ role: "user", content: inlinePrompt }], temperature: 0, reasoning_effort: reasoningEffort, response_format: { type: "json_object" } };
  // retry once on 5xx like extraction runner
  let lastText = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const resp = await proxyFetch(`${provider.endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    lastText = await resp.text();
    if (resp.status >= 500 && resp.status <= 599 && attempt === 1) {
      process.stderr.write(`[score-spark] gateway ${resp.status}; retrying once\n`);
      continue;
    }
    if (!resp.ok) throw new Error(`Spark scorer upstream ${resp.status}: ${lastText.slice(0, 800)}`);
    let parsed;
    try { parsed = JSON.parse(lastText); } catch (e) { throw new Error(`Spark scorer non-JSON response: ${e.message} :: ${lastText.slice(0, 800)}`); }
    const content = parsed?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : (Array.isArray(content) ? content.map((c) => c?.text ?? "").join("") : "");
    if (!text?.trim()) throw new Error(`Spark scorer empty content: ${lastText.slice(0, 800)}`);
    return text.trim();
  }
  throw new Error(`Spark scorer failed after retry: ${lastText.slice(0, 800)}`);
}

export async function scorePaperEntryExtraction({
  goldPath,
  candidatePath,
  outputPath,
  dryRun = false,
  scorerModel = SCORER_MODEL,
  reasoningEffort,
  rootDir = process.cwd(),
} = {}) {
  const resolvedGold = resolveRegularFile(goldPath, "gold");
  const resolvedCandidate = resolveRegularFile(candidatePath, "candidate");

  const goldRaw = fs.readFileSync(resolvedGold, "utf8");
  const candidateRaw = fs.readFileSync(resolvedCandidate, "utf8");
  const goldObj = JSON.parse(goldRaw);
  const candidateObj = JSON.parse(candidateRaw);

  const caseId = goldObj.caseId
    || goldObj.project?.id?.replace(/^cmath:project:paper:/u, "")
    || path.basename(path.dirname(resolvedGold));
  const goldRevision = goldObj.goldRevision
    || goldObj.revision
    || goldObj.standardAnswerProfile?.revision
    || "v1";
  const candidateArtifact = path.relative(rootDir, resolvedCandidate);

  const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../benchmarks/paper-import/entry-module");
  const promptTemplatePath = path.join(moduleDir, "sol-entry-score-prompt-v1.md");
  const schemaPath = path.join(moduleDir, "sol-entry-score-schema-v1.json");

  const promptTemplate = fs.readFileSync(promptTemplatePath, "utf8");
  const schemaText = fs.readFileSync(schemaPath, "utf8");

  if (dryRun) {
    const renderedPrompt = renderPromptTemplate(promptTemplate, {
      GOLD_PATH: "./gold.json",
      CANDIDATE_PATH: "./candidate.json",
      SOL_ENTRY_SCORE_SCHEMA_PATH: "./sol-entry-score-schema.json",
      CASE_ID: caseId,
      GOLD_REVISION: goldRevision,
      CANDIDATE_ARTIFACT: candidateArtifact,
    });

    return {
      dryRun: true,
      caseId,
      goldRevision,
      scorerModel,
      promptVersion: PROMPT_VERSION,
      schemaId: SCHEMA_ID,
      stagingPlan: {
        files: ["gold.json", "candidate.json", "sol-entry-score-schema.json"],
        excludes: ["pdf", "spec", "conventions", "graph-metrics"],
      },
      renderedPrompt,
    };
  }

  // Create isolated temp staging directory
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "sol-entry-score-"));

  try {
    const stagedGoldPath = path.join(stagingDir, "gold.json");
    const stagedCandidatePath = path.join(stagingDir, "candidate.json");
    const stagedSchemaPath = path.join(stagingDir, "sol-entry-score-schema.json");

    fs.writeFileSync(stagedGoldPath, goldRaw);
    fs.writeFileSync(stagedCandidatePath, candidateRaw);
    fs.writeFileSync(stagedSchemaPath, schemaText);

    const renderedPrompt = renderPromptTemplate(promptTemplate, {
      GOLD_PATH: "./gold.json",
      CANDIDATE_PATH: "./candidate.json",
      SOL_ENTRY_SCORE_SCHEMA_PATH: "./sol-entry-score-schema.json",
      CASE_ID: caseId,
      GOLD_REVISION: goldRevision,
      CANDIDATE_ARTIFACT: candidateArtifact,
    });

    const sparkScoring = isSparkScorer(scorerModel);
    let rawOutput;
    if (sparkScoring) {
      const sparkEffort = reasoningEffort || "xhigh";
      rawOutput = (await scoreViaSpark({ renderedPrompt, goldRaw, candidateRaw, schemaText, caseId, goldRevision, candidateArtifact, scorerModel: SPARK_SCORER_MODEL, reasoningEffort: sparkEffort })).trim();
    } else {
      const codexBin = process.env.CODEX_BIN || "codex";
      const result = spawnSync(codexBin, [
        "exec", "--ephemeral", "--skip-git-repo-check",
        "--model", scorerModel, "--sandbox", "read-only", "-",
      ], {
        input: renderedPrompt,
        cwd: stagingDir,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });

      if (result.status !== 0) {
        throw new Error(`Codex execution failed (exit code ${result.status}): ${result.stderr || result.stdout}`);
      }

      rawOutput = (result.stdout || "").trim();
    }
    let scoreObj;
    try {
      const match = rawOutput.match(/\{[\s\S]*\}/u);
      scoreObj = JSON.parse(match ? match[0] : rawOutput);
    } catch (err) {
      throw new Error(`Failed to parse Sol score JSON from codex output: ${err.message}\nOutput: ${rawOutput.slice(0, 500)}`);
    }

    validateSolEntryScore(scoreObj, {
      caseId,
      goldRevision,
      candidatePath,
      rootDir,
    });

    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(scoreObj, null, 2)}\n`);
    }

    return scoreObj;
  } finally {
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}
  }
}

// CLI handler if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  let scorerModel = SCORER_MODEL;
  let reasoningEffort;
  const filteredArgs = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--dry-run") continue;
    if (a.startsWith("--scorer=") || a.startsWith("--model=")) { scorerModel = a.slice(a.indexOf("=") + 1).trim(); continue; }
    if ((a === "--scorer" || a === "--model") && args[i + 1]) { scorerModel = args[i + 1].trim(); i += 1; continue; }
    if (a.startsWith("--reasoning=")) { reasoningEffort = a.slice("--reasoning=".length).trim(); continue; }
    if (a === "--reasoning" && args[i + 1]) { reasoningEffort = args[i + 1].trim(); i += 1; continue; }
    if (a === "--spark") { scorerModel = SPARK_SCORER_MODEL; reasoningEffort = reasoningEffort || "xhigh"; continue; }
    filteredArgs.push(a);
  }
  if (scorerModel === SPARK_SCORER_MODEL || scorerModel === "muse-spark-1.2") reasoningEffort = reasoningEffort || "xhigh";

  const [goldPath, candidatePath, outputPath] = filteredArgs;
  if (!goldPath || !candidatePath) {
    console.error("Usage: node scripts/score-paper-entry-extraction-with-sol.mjs <goldPath> <candidatePath> [outputPath] [--dry-run] [--scorer=<model>] [--reasoning=<effort>] [--spark]");
    console.error(`  scorers: ${SCORER_MODEL} (default, via codex), ${SPARK_SCORER_MODEL} (via opencode-go+proxy, xhigh)`);
    process.exit(1);
  }

  scorePaperEntryExtraction({
    goldPath,
    candidatePath,
    outputPath,
    dryRun,
    scorerModel,
    reasoningEffort,
  }).then((res) => {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  }).catch((err) => {
    console.error(`Scoring failed: ${err.message}`);
    process.exit(2);
  });
}
