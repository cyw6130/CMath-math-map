#!/usr/bin/env node
/**
 * Sol Entry Extraction Scorer for paper-entry-extraction-v1.
 * Evaluates entry extraction artifacts against Gold reference entries under strict
 * Gold + candidate + schema staging isolation (no PDF, no graph-metrics, no spec/conventions).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const PROMPT_VERSION = "sol-entry-score-prompt-v1";
export const SCHEMA_ID = "cmath.paper-entry-sol-score/v1";
export const SCORER_MODEL = "gpt-5.6-sol";
export const SPARK_SCORER_MODEL = "muse-spark-1.2-contributor";
export const VALID_SCORER_MODELS = new Set([SCORER_MODEL, SPARK_SCORER_MODEL, "ox-alpha-free", "opencode-go/ox-alpha-free", "muse-spark-1.2", "kimi-k3", "opencode-go/kimi-k3"]);

/**
 * Validate that an input path exists, is a regular file (not a symlink or directory),
 * and return its resolved absolute path.
 */
export function prepareSlimCandidate(candidateObj) {
  if (!candidateObj || typeof candidateObj !== "object") return candidateObj;
  
  const entries = candidateObj.rawEntries || candidateObj.entries || [];
  const inferenceHints = candidateObj.inferenceHints || [];
  
  const slim = {
    schema: candidateObj.schema || SCHEMA_ID,
    extractionModuleVersion: candidateObj.extractionModuleVersion || candidateObj.entryModuleVersion || "paper-entry-parallel-extraction-v1.20",
    source: {
      fileName: candidateObj.source?.fileName || "paper.pdf",
      pageCount: candidateObj.source?.pageCount || 1,
    },
    rawEntries: entries.map((e) => {
      // Strip chunk-level duplicate verbose text/provenance if needed
      const { _provenance, ...rest } = e;
      return rest;
    }),
    inferenceHints,
  };

  return slim;
}

export function prepareSlimGold(goldObj) {
  if (!goldObj || typeof goldObj !== "object") return goldObj;

  const entries = goldObj.entries || [];
  const inferences = goldObj.inferences || [];
  const b0ClaimEntryIds = goldObj.b0ClaimEntryIds || goldObj.derivedResearchState?.mathematicalState?.b0ClaimEntryIds || [];

  const slim = {
    schema: goldObj.schema || "cmath.project-view-model/v0.1",
    caseId: goldObj.caseId || goldObj.project?.id || "paper-case",
    projectTitle: goldObj.projectTitle || goldObj.project?.title || "",
    mainTargetEntryId: goldObj.mainTargetEntryId || null,
    b0ClaimEntryIds,
    entries: entries.map((e) => ({
      id: e.id,
      entryClass: e.entryClass,
      factKind: e.factKind,
      claimKind: e.claimKind,
      title: e.title,
      statement: e.statement,
      sourcePath: e.sourcePath,
      sourceReference: e.sourceReference,
    })),
    inferences: inferences.map((inf) => ({
      id: inf.id,
      premiseEntryIds: inf.premiseEntryIds || inf.premises || [],
      targetEntryId: inf.targetEntryId || inf.conclusion || null,
    })),
  };

  return slim;
}

export function validateCandidateSanity(candidateObj, { minEntries = 5 } = {}) {
  if (!candidateObj || typeof candidateObj !== "object") {
    throw new Error("Invalid candidate object: parsed payload is null or not an object");
  }
  const entries = candidateObj.rawEntries || candidateObj.entries || [];
  if (!Array.isArray(entries) || entries.length < minEntries) {
    throw new Error(`Candidate artifact contains too few entries (${entries.length} < ${minEntries}); rejected prior to Sol scoring to save API credits`);
  }
  return true;
}

export function buildInlineSingleTurnPrompt({ promptTemplate, goldRaw, candidateRaw, schemaText, caseId, goldRevision, candidateArtifact }) {
  const inlineSection = [
    "## Case Metadata",
    `- Case ID (copy exactly): \`${caseId}\``,
    `- Gold revision (copy exactly): \`${goldRevision}\``,
    `- Candidate artifact identity (copy exactly): \`${candidateArtifact}\``,
    "",
    "## Gold Reference Artifact (inlined below)",
    "```json",
    goldRaw,
    "```",
    "",
    "## Candidate Entry Extraction Artifact (inlined below)",
    "```json",
    candidateRaw,
    "```",
    "",
    "## Sol Entry Score Schema (inlined below)",
    "```json",
    schemaText,
    "```",
    "",
    "## Execution Mode (strict)",
    "- All input data has already been inlined above; do not use any tools, do not read any files, and do not run any commands.",
    "- Complete the entire evaluation in a single response consisting ONLY of the JSON object specified in the Output Format section.",
    "",
  ].join("\n");

  let prompt = promptTemplate.replace(/## Input Files[\s\S]*?(?=## Evaluation Dimensions)/u, `${inlineSection}\n`);
  prompt = prompt.replace(/matching the schema in `[^`]*`/u, "matching the schema inlined above");
  return prompt;
}

export function buildGatewayChatRequest({ renderedPrompt, model, reasoningEffort, serviceTier }) {
  return {
    model,
    messages: [{ role: "user", content: renderedPrompt }],
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    ...(serviceTier ? { service_tier: serviceTier } : {}),
  };
}

async function scoreViaGatewayHttp({ renderedPrompt, model, reasoningEffort, serviceTier, baseUrl }) {
  const root = (baseUrl || process.env.SOL_GATEWAY_URL || "http://127.0.0.1:10100").replace(/\/+$/u, "");
  const res = await fetch(`${root}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGatewayChatRequest({ renderedPrompt, model, reasoningEffort, serviceTier })),
  });
  if (!res.ok) {
    throw new Error(`Sol gateway HTTP ${res.status}: ${(await res.text()).slice(0, 300)} — check that the local gateway (default http://127.0.0.1:10100, override via SOL_GATEWAY_URL) is running`);
  }
  const data = await res.json();
  const usage = data.usage || {};
  process.stderr.write(`[sol-score] gateway usage: prompt=${usage.prompt_tokens ?? "?"} completion=${usage.completion_tokens ?? "?"} cached=${usage.prompt_tokens_details?.cached_tokens ?? 0} reasoning=${usage.completion_tokens_details?.reasoning_tokens ?? 0}\n`);
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

export function aggregateMedianScore(scoreObjs) {
  if (!Array.isArray(scoreObjs) || scoreObjs.length === 0) {
    throw new Error("aggregateMedianScore requires at least one score object");
  }
  const sorted = [...scoreObjs].sort((a, b) => (a.solEntryScore ?? 0) - (b.solEntryScore ?? 0));
  const mid = Math.floor((sorted.length - 1) / 2);
  const medianRun = sorted[mid];
  const aggregated = {
    ...medianRun,
    scoreRuns: sorted.map((r) => ({
      correctness: r.correctness,
      completeness: r.completeness,
      solEntryScore: r.solEntryScore,
    })),
    aggregation: `median-of-${scoreObjs.length}`,
  };
  return aggregated;
}

export function computeScoreCacheKey({
  goldText,
  candText,
  promptText,
  model,
  reasoning = "medium",
  runs = 1,
  sourceIdentity = "",
}) {
  const hash = crypto.createHash("sha256");
  hash.update(goldText || "");
  hash.update("||");
  hash.update(candText || "");
  hash.update("||");
  hash.update(promptText || "");
  hash.update("||");
  hash.update(model || "");
  hash.update("||");
  hash.update(reasoning || "medium");
  hash.update("||");
  hash.update(`runs=${runs}`);
  hash.update("||");
  hash.update(`source=${sourceIdentity}`);
  return hash.digest("hex");
}

export function resolveFrozenSourceIdentity({ rootDir, caseId, fallbackCaseId }) {
  const manifestPath = path.join(rootDir, "benchmarks/paper-import/source-manifest.json");
  if (!caseId || !fs.existsSync(manifestPath)) return "";
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const candidateIds = new Set([caseId, fallbackCaseId].filter(Boolean));
    const source = (manifest.activeCases ?? []).find((item) => candidateIds.has(item.caseId));
    return typeof source?.sourceIdentitySha256 === "string" ? source.sourceIdentitySha256 : "";
  } catch {
    return "";
  }
}

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
  const isOxAlphaLabel = normalized.includes("oxalpha") || normalized.includes("oxalphafree") || normalized.includes("kimik3") || normalized.includes("k3");
  const valid = VALID_SCORER_MODELS.has(modelName)
    || (isSparkLabel && VALID_SCORER_MODELS.has(SPARK_SCORER_MODEL))
    || (isSolLabel && VALID_SCORER_MODELS.has(SCORER_MODEL))
    || (isOxAlphaLabel && (VALID_SCORER_MODELS.has("ox-alpha-free") || VALID_SCORER_MODELS.has("kimi-k3")));
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
export function isSparkScorer(model) {
  if (model === SPARK_SCORER_MODEL || model === "muse-spark-1.2" || model === "kimi-k3") return true;
  // opencode-go served models (e.g. ox-alpha-free, muse-spark variants)
  if (model === "ox-alpha-free" || model === "kimi-k3" || model.startsWith("opencode-go/")) return true;
  return false;
}

export function resolveSparkProviderConfig(explicitModel = SPARK_SCORER_MODEL) {
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

function createProxyFetch({ proxyUrl, apiKey, endpoint, fetchImpl = globalThis.fetch } = {}) {
  const directFetch = async function directFetch(targetUrl, init = {}) {
    return fetchImpl(targetUrl, init);
  };
  return async function proxyFetch(targetUrl, init = {}) {
    if (process.env.OPENCODE_GO_DIRECT === "1") return directFetch(targetUrl, init);
    let requestBody = null;
    if (init.body) {
      try { requestBody = JSON.parse(String(init.body)); } catch { requestBody = init.body; }
    }
    const authHeader = typeof init.headers?.get === "function" ? (init.headers.get("Authorization") || init.headers.get("authorization")) : (init.headers?.Authorization || init.headers?.authorization || "");
    const authKey = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/iu, "").trim() : "";
    const resolvedKey = authKey || apiKey;
    const payload = { targetUrl: String(targetUrl), apiKey: resolvedKey, body: requestBody };
    let text = "";
    try {
      const proxyResponse = await fetchImpl(proxyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: init?.signal });
      text = await proxyResponse.text();
      if (proxyResponse.ok && text.trim()) {
        return new Response(text, { status: proxyResponse.status, headers: proxyResponse.headers });
      }
      process.stderr.write(`[opencode-go] local proxy responded ${proxyResponse.status}; falling back to direct call\n`);
    } catch (err) {
      process.stderr.write(`[opencode-go] local proxy unavailable (${err.message}); falling back to direct call\n`);
    }
    // 直连兜底：代理不可用或返回空时直接访问 opencode-go 端点
    if (endpoint && String(targetUrl).startsWith(endpoint)) {
      const headers = new Headers(init?.headers || {});
      if (resolvedKey && !headers.get("Authorization")) headers.set("Authorization", `Bearer ${resolvedKey}`);
      return directFetch(targetUrl, { ...init, headers });
    }
    const err = new Error(`Local model proxy failed and direct fallback is not applicable for ${targetUrl}`);
    throw err;
  };
}

async function scoreViaSpark({ renderedPrompt, goldRaw, candidateRaw, schemaText, caseId, goldRevision, candidateArtifact, scorerModel, reasoningEffort = "xhigh" }) {
  const provider = resolveSparkProviderConfig(scorerModel);
  const proxyFetch = createProxyFetch({ proxyUrl: provider.proxyUrl, apiKey: provider.apiKey, endpoint: provider.endpoint });
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
  runs = 1,
  serviceTier,
  rootDir = process.cwd(),
} = {}) {
  const resolvedGold = resolveRegularFile(goldPath, "gold");
  const resolvedCandidate = resolveRegularFile(candidatePath, "candidate");

  const goldRawFull = fs.readFileSync(resolvedGold, "utf8");
  const candidateRawFull = fs.readFileSync(resolvedCandidate, "utf8");
  const goldObj = JSON.parse(goldRawFull);
  const candidateObj = JSON.parse(candidateRawFull);

  // Fast pre-filter sanity check (0 Token rejection for defective artifacts).
  // dry-run plans must stay auditable for staging validation, so the entry-count
  // gate is skipped there (no API credits are spent in dry-run anyway).
  if (!dryRun) validateCandidateSanity(candidateObj, { minEntries: 5 });

  // Slim both Gold and Candidate artifacts to eliminate bloated config/source text/diagnostics
  const slimGoldObj = prepareSlimGold(goldObj);
  const slimCandidateObj = prepareSlimCandidate(candidateObj);

  const goldRaw = JSON.stringify(slimGoldObj, null, 2);
  const candidateRaw = JSON.stringify(slimCandidateObj, null, 2);

  const caseId = goldObj.caseId
    || goldObj.project?.id?.replace(/^cmath:project:paper:/u, "")
    || path.basename(path.dirname(resolvedGold));
  const goldRevision = goldObj.goldRevision
    || goldObj.revision
    || goldObj.standardAnswerProfile?.revision
    || "v1";
  const candidateArtifact = path.relative(rootDir, resolvedCandidate);
  const sourceIdentity = resolveFrozenSourceIdentity({
    rootDir,
    caseId,
    fallbackCaseId: path.basename(path.dirname(resolvedGold)),
  });

  const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../benchmarks/paper-import/entry-module");
  const promptTemplatePath = path.join(moduleDir, "sol-entry-score-prompt-v1.md");
  const schemaPath = path.join(moduleDir, "sol-entry-score-schema-v1.json");

  const promptTemplate = fs.readFileSync(promptTemplatePath, "utf8");
  const schemaText = fs.readFileSync(schemaPath, "utf8");

  const effectiveReasoning = reasoningEffort || "medium";

  // Check persistent/local score cache
  const cacheDir = path.join(rootDir, "benchmarks/paper-import/.score-cache");
  const runCount = Math.max(1, Number(runs) || 1);
  const cacheKey = computeScoreCacheKey({
    goldText: goldRaw,
    candText: candidateRaw,
    promptText: promptTemplate,
    model: scorerModel,
    reasoning: effectiveReasoning,
    runs: runCount,
    sourceIdentity,
  });
  const cacheFilePath = path.join(cacheDir, `${cacheKey}.json`);

  if (!dryRun && fs.existsSync(cacheFilePath)) {
    try {
      const cachedScore = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
      if (outputPath) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, `${JSON.stringify(cachedScore, null, 2)}\n`);
      }
      return cachedScore;
    } catch {}
  }

  if (dryRun) {
    const renderedPrompt = buildInlineSingleTurnPrompt({
      promptTemplate,
      goldRaw,
      candidateRaw,
      schemaText,
      caseId,
      goldRevision,
      candidateArtifact,
    });

    return {
      dryRun: true,
      caseId,
      goldRevision,
      scorerModel,
      sourceIdentitySha256: sourceIdentity || null,
      promptVersion: PROMPT_VERSION,
      schemaId: SCHEMA_ID,
      stagingPlan: { files: [], excludes: ["pdf", "spec", "conventions", "graph-metrics"], mode: "inline-single-turn" },
      renderedPrompt,
    };
  }

  const renderedPrompt = buildInlineSingleTurnPrompt({
    promptTemplate,
    goldRaw,
    candidateRaw,
    schemaText,
    caseId,
    goldRevision,
    candidateArtifact,
  });

  const sparkScoring = isSparkScorer(scorerModel);
  const runResults = [];
  for (let runIndex = 1; runIndex <= runCount; runIndex += 1) {
    if (runCount > 1) process.stderr.write(`[sol-score] run ${runIndex}/${runCount}\n`);
    let rawOutput;
    if (sparkScoring) {
      rawOutput = (await scoreViaSpark({ renderedPrompt, goldRaw, candidateRaw, schemaText, caseId, goldRevision, candidateArtifact, scorerModel: SPARK_SCORER_MODEL, reasoningEffort: effectiveReasoning })).trim();
    } else {
      // Direct single-turn HTTP call to the local gateway. No CLI, no agent scaffolding.
      rawOutput = await scoreViaGatewayHttp({ renderedPrompt, model: scorerModel, reasoningEffort: effectiveReasoning, serviceTier });
    }
    let scoreObj;
    try {
      const match = rawOutput.match(/\{[\s\S]*\}/u);
      scoreObj = JSON.parse(match ? match[0] : rawOutput);
    } catch (err) {
      throw new Error(`Failed to parse Sol score JSON from run ${runIndex}: ${err.message}\nOutput: ${rawOutput.slice(0, 500)}`);
    }

    validateSolEntryScore(scoreObj, {
      caseId,
      goldRevision,
      candidatePath,
      rootDir,
    });
    runResults.push(scoreObj);
  }

  const scoreObj = aggregateMedianScore(runResults);

  // Write to cache
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFilePath, `${JSON.stringify(scoreObj, null, 2)}\n`);
  } catch {}

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(scoreObj, null, 2)}\n`);
  }

  return scoreObj;
}

// CLI handler if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  let scorerModel = SCORER_MODEL;
  let reasoningEffort;
  let runs = 1;
  let serviceTier;
  const filteredArgs = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--dry-run") continue;
    if (a.startsWith("--scorer=") || a.startsWith("--model=")) { scorerModel = a.slice(a.indexOf("=") + 1).trim(); continue; }
    if ((a === "--scorer" || a === "--model") && args[i + 1]) { scorerModel = args[i + 1].trim(); i += 1; continue; }
    if (a.startsWith("--reasoning=")) { reasoningEffort = a.slice("--reasoning=".length).trim(); continue; }
    if (a === "--reasoning" && args[i + 1]) { reasoningEffort = args[i + 1].trim(); i += 1; continue; }
    if (a.startsWith("--runs=")) { runs = Math.max(1, Number(a.slice("--runs=".length)) || 1); continue; }
    if (a.startsWith("--tier=")) { serviceTier = a.slice("--tier=".length).trim(); continue; }
    if (a === "--spark") { scorerModel = SPARK_SCORER_MODEL; reasoningEffort = reasoningEffort || "xhigh"; continue; }
    filteredArgs.push(a);
  }
  if (scorerModel === SPARK_SCORER_MODEL || scorerModel === "muse-spark-1.2") reasoningEffort = reasoningEffort || "xhigh";

  const [goldPath, candidatePath, outputPath] = filteredArgs;
  if (!goldPath || !candidatePath) {
    console.error("Usage: node scripts/score-paper-entry-extraction-with-sol.mjs <goldPath> <candidatePath> [outputPath] [--dry-run] [--scorer=<model>] [--reasoning=<effort>] [--runs=N] [--spark]");
    console.error(`  scorers: ${SCORER_MODEL} (default, via gateway HTTP), ox-alpha-free, muse-spark-1.2 (via opencode-go+proxy), ${SPARK_SCORER_MODEL} (via opencode-go+proxy, xhigh), gpt-5.6-luna (cheap iteration)`);
    process.exit(1);
  }

  scorePaperEntryExtraction({
    goldPath,
    candidatePath,
    outputPath,
    dryRun,
    scorerModel,
    reasoningEffort,
    runs,
    serviceTier,
  }).then((res) => {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  }).catch((err) => {
    console.error(`Scoring failed: ${err.message}`);
    process.exit(2);
  });
}
