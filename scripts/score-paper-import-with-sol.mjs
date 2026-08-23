#!/usr/bin/env node
/**
 * Official paper-import scorer. The only official score is solScore, produced
 * by gpt-5.6-sol from the immutable Gold JSON and a candidate Project View using
 * the settled sol-score-prompt-v3 template under strict Gold+candidate isolation
 * with deterministically computed graph descriptors (graph-metrics.json).
 * Deterministic evaluators are intentionally not called here.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PROMPT_VERSION = "sol-score-prompt-v3";
export const SCHEMA_ID = "cmath.paper-import-sol-score/v3";
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
 * Deterministically compute graph descriptors for a Project View.
 *
 * An Entry is incident (non-isolated) if it participates with at least one other
 * distinct valid Entry in an inference premise or conclusion (i.e. participating
 * valid ID set size >= 2). Inferences with < 2 distinct valid participating IDs
 * create no graph relation and do not make a lone Entry non-isolated.
 *
 * Invalid referenced IDs (not present in entries) are ignored during graph construction.
 *
 * Connected components are computed only on non-isolated Entries as an undirected hyperedge/clique per inference.
 * Isolated Entries are NOT counted as connected components.
 *
 * Denominator for largestNontrivialComponentCoverage is total entryCount (all Entries in the Project View).
 * If entryCount === 0, ratios and coverage evaluate safely to 0.
 */
export function computeGraphDescriptors(input) {
  const view = (input && typeof input === "object" && input.view && typeof input.view === "object")
    ? input.view
    : (input && typeof input === "object" ? input : {});

  const rawEntries = Array.isArray(view.entries) ? view.entries : [];
  const rawInferences = Array.isArray(view.inferences) ? view.inferences : [];

  // 1. Gather all valid Entry IDs
  const validEntryIds = [];
  const validEntryIdSet = new Set();
  for (const entry of rawEntries) {
    if (entry && typeof entry.id === "string" && entry.id.length > 0) {
      if (!validEntryIdSet.has(entry.id)) {
        validEntryIdSet.add(entry.id);
        validEntryIds.push(entry.id);
      }
    }
  }

  const entryCount = rawEntries.length;
  const inferenceCount = rawInferences.length;

  // 2. Determine non-isolated entries and hyperedges (requiring >= 2 distinct valid IDs)
  const incidentEntryIdSet = new Set();
  const hyperedges = [];

  for (const inf of rawInferences) {
    if (!inf || typeof inf !== "object") continue;

    const rawPremises = Array.isArray(inf.premises)
      ? inf.premises
      : (Array.isArray(inf.premiseEntryIds) ? inf.premiseEntryIds : []);
    const rawConclusion = typeof inf.conclusion === "string"
      ? inf.conclusion
      : (typeof inf.conclusionEntryId === "string" ? inf.conclusionEntryId : null);

    const participating = new Set();
    for (const p of rawPremises) {
      if (typeof p === "string" && validEntryIdSet.has(p)) {
        participating.add(p);
      }
    }
    if (rawConclusion && validEntryIdSet.has(rawConclusion)) {
      participating.add(rawConclusion);
    }

    const participatingArr = Array.from(participating);
    if (participatingArr.length >= 2) {
      for (const id of participatingArr) {
        incidentEntryIdSet.add(id);
      }
      hyperedges.push(participatingArr);
    }
  }

  // 3. Isolated entries (entries whose IDs do not appear in any valid inference premise/conclusion)
  // Stable deterministic sorting
  const isolatedEntryIds = validEntryIds
    .filter((id) => !incidentEntryIdSet.has(id))
    .sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));

  const isolatedEntryCount = isolatedEntryIds.length;
  const isolatedEntryRatio = entryCount > 0 ? (isolatedEntryCount / entryCount) : 0;

  // 4. Connected components on non-isolated entries (incidentEntryIdSet)
  // Use Union-Find (Disjoint Set Union)
  const incidentIds = Array.from(incidentEntryIdSet);
  const parent = new Map();

  function find(x) {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root);
    }
    let curr = x;
    while (curr !== root) {
      const nxt = parent.get(curr);
      parent.set(curr, root);
      curr = nxt;
    }
    return root;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  }

  for (const id of incidentIds) {
    parent.set(id, id);
  }

  for (const edge of hyperedges) {
    if (edge.length > 1) {
      const first = edge[0];
      for (let i = 1; i < edge.length; i++) {
        union(first, edge[i]);
      }
    }
  }

  const componentSizes = new Map();
  for (const id of incidentIds) {
    const root = find(id);
    componentSizes.set(root, (componentSizes.get(root) || 0) + 1);
  }

  // Nontrivial components have size >= 2
  let nontrivialComponentCount = 0;
  let largestNontrivialComponentSize = 0;

  for (const size of componentSizes.values()) {
    if (size >= 2) {
      nontrivialComponentCount += 1;
      if (size > largestNontrivialComponentSize) {
        largestNontrivialComponentSize = size;
      }
    }
  }

  // Documented denominator: total entryCount (all Entries in the Project View)
  const largestNontrivialComponentCoverage = entryCount > 0
    ? (largestNontrivialComponentSize / entryCount)
    : 0;

  return {
    entryCount,
    inferenceCount,
    isolatedEntryCount,
    isolatedEntryRatio,
    nontrivialComponentCount,
    largestNontrivialComponentSize,
    largestNontrivialComponentCoverage,
    isolatedEntryIds
  };
}

/**
 * Safely render the sol-score prompt template from disk by substituting declared placeholders.
 * Throws if any placeholder remains unresolved.
 */
export function renderSolPrompt({
  templateContent,
  caseId,
  goldRevision,
  goldPath,
  candidatePath,
  candidateArtifact,
  graphMetricsPath = "graph-metrics.json",
  rootDir = process.cwd()
}) {
  if (typeof templateContent !== "string") {
    throw new Error("templateContent must be a string");
  }

  const relCandidate = candidateArtifact
    ? String(candidateArtifact)
    : candidatePath
      ? (path.isAbsolute(candidatePath) ? path.relative(rootDir, candidatePath) : String(candidatePath))
      : "";

  const replacements = {
    "{{CASE_ID}}": String(caseId ?? ""),
    "{{GOLD_REVISION}}": String(goldRevision ?? ""),
    "{{GOLD_PATH}}": String(goldPath ?? ""),
    "{{CANDIDATE_PATH}}": String(candidatePath ?? ""),
    "{{CANDIDATE_ARTIFACT}}": relCandidate,
    "{{GRAPH_METRICS_PATH}}": String(graphMetricsPath ?? "graph-metrics.json")
  };

  let rendered = templateContent;
  for (const [placeholder, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(placeholder, value);
  }

  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved && unresolved.length > 0) {
    throw new Error(`Unresolved prompt placeholders detected: ${[...new Set(unresolved)].join(", ")}`);
  }

  return rendered;
}

/**
 * Validate identity, component bounds, arithmetic, evidence arrays/string, graphComparison, and verdict of a Sol v3 score object.
 * Throws an explicit Error on any mismatch.
 */
export function validateSolScore(score, {
  caseId,
  goldRevision,
  candidatePath,
  expectedGraphComparison,
  goldView,
  candidateView,
  rootDir = process.cwd()
} = {}) {
  if (!score || typeof score !== "object") {
    throw new Error("Sol score output must be a valid JSON object");
  }

  // 1. Identity validation
  if (score.schema !== SCHEMA_ID) {
    throw new Error(`Invalid score schema: expected "${SCHEMA_ID}", got "${score.schema}"`);
  }
  const scorerName = String(score.scorer || "").trim();
  const isAllowedScorer = VALID_SCORER_MODELS.has(scorerName)
    || scorerName.toLowerCase().includes("spark")
    || scorerName.toLowerCase().includes("sol");
  if (!isAllowedScorer) {
    throw new Error(`Invalid scorer: expected one of ${[...VALID_SCORER_MODELS].join(", ")}, got "${score.scorer}"`);
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
      path.resolve(rootDir, score.candidateArtifact || "") === path.resolve(rootDir, candidatePath);
    if (!candidateMatches) {
      throw new Error(`Candidate artifact mismatch: expected "${expectedRelative}", got "${score.candidateArtifact}"`);
    }
  }

  // 2. Graph comparison validation
  if (!score.graphComparison || typeof score.graphComparison !== "object") {
    throw new Error("Score missing required graphComparison object");
  }
  const gc = score.graphComparison;
  if (!gc.gold || typeof gc.gold !== "object" || !gc.candidate || typeof gc.candidate !== "object") {
    throw new Error("graphComparison must contain both gold and candidate descriptor objects");
  }

  function validateDescriptorShape(desc, label) {
    const intFields = [
      ["entryCount", desc.entryCount],
      ["inferenceCount", desc.inferenceCount],
      ["isolatedEntryCount", desc.isolatedEntryCount],
      ["nontrivialComponentCount", desc.nontrivialComponentCount],
      ["largestNontrivialComponentSize", desc.largestNontrivialComponentSize]
    ];
    for (const [key, val] of intFields) {
      if (!Number.isInteger(val) || val < 0) {
        throw new Error(`Invalid graphComparison.${label}.${key}: must be a non-negative integer, got ${val}`);
      }
    }

    const numFields = [
      ["isolatedEntryRatio", desc.isolatedEntryRatio],
      ["largestNontrivialComponentCoverage", desc.largestNontrivialComponentCoverage]
    ];
    for (const [key, val] of numFields) {
      if (typeof val !== "number" || Number.isNaN(val) || val < 0 || val > 1) {
        throw new Error(`Invalid graphComparison.${label}.${key}: must be a number between 0 and 1, got ${val}`);
      }
    }

    if (!Array.isArray(desc.isolatedEntryIds)) {
      throw new Error(`graphComparison.${label}.isolatedEntryIds must be an array`);
    }
    for (const id of desc.isolatedEntryIds) {
      if (typeof id !== "string") {
        throw new Error(`Elements in graphComparison.${label}.isolatedEntryIds must be strings`);
      }
    }
  }

  validateDescriptorShape(gc.gold, "gold");
  validateDescriptorShape(gc.candidate, "candidate");

  // Determine expected metrics if provided or computable from views
  let expectedGc = expectedGraphComparison;
  if (!expectedGc && (goldView || candidateView)) {
    expectedGc = {
      gold: goldView ? computeGraphDescriptors(goldView) : null,
      candidate: candidateView ? computeGraphDescriptors(candidateView) : null
    };
  }

  if (expectedGc) {
    function assertDescriptorEqual(actual, expected, label) {
      if (!expected) return;
      const compareKeys = [
        "entryCount",
        "inferenceCount",
        "isolatedEntryCount",
        "nontrivialComponentCount",
        "largestNontrivialComponentSize"
      ];
      for (const k of compareKeys) {
        if (actual[k] !== expected[k]) {
          throw new Error(`Graph comparison mismatch for ${label}.${k}: expected ${expected[k]}, got ${actual[k]}`);
        }
      }
      const floatKeys = [
        "isolatedEntryRatio",
        "largestNontrivialComponentCoverage"
      ];
      for (const k of floatKeys) {
        if (Math.abs(actual[k] - expected[k]) > 1e-9) {
          throw new Error(`Graph comparison mismatch for ${label}.${k}: expected ${expected[k]}, got ${actual[k]}`);
        }
      }
      if (actual.isolatedEntryIds.length !== expected.isolatedEntryIds.length ||
          actual.isolatedEntryIds.some((id, i) => id !== expected.isolatedEntryIds[i])) {
        throw new Error(`Graph comparison mismatch for ${label}.isolatedEntryIds: expected ${JSON.stringify(expected.isolatedEntryIds)}, got ${JSON.stringify(actual.isolatedEntryIds)}`);
      }
    }

    if (expectedGc.gold) {
      assertDescriptorEqual(gc.gold, expectedGc.gold, "gold");
    }
    if (expectedGc.candidate) {
      assertDescriptorEqual(gc.candidate, expectedGc.candidate, "candidate");
    }
  }

  // 3. Format breakdown & arithmetic (max 10: jsonValidity max 4, referenceIntegrity max 6)
  if (!score.format || typeof score.format !== "object") {
    throw new Error("Score missing format breakdown object");
  }
  const f = score.format;
  const fItems = [
    ["jsonValidity", f.jsonValidity, 4],
    ["referenceIntegrity", f.referenceIntegrity, 6]
  ];
  for (const [key, val, max] of fItems) {
    if (!Number.isInteger(val) || val < 0 || val > max) {
      throw new Error(`Invalid format.${key}: must be integer between 0 and ${max}, got ${val}`);
    }
  }
  const formatSum = f.jsonValidity + f.referenceIntegrity;
  if (f.score !== formatSum) {
    throw new Error(`Format score arithmetic error: format.score is ${f.score}, but sum of components is ${formatSum}`);
  }
  if (f.score > 10) {
    throw new Error(`Invalid format.score: maximum is 10, got ${f.score}`);
  }

  // 4. Entries breakdown & arithmetic (max 45: correctness max 25, completeness max 20)
  if (!score.entries || typeof score.entries !== "object") {
    throw new Error("Score missing entries breakdown object");
  }
  const e = score.entries;
  const eItems = [
    ["correctness", e.correctness, 25],
    ["completeness", e.completeness, 20]
  ];
  for (const [key, val, max] of eItems) {
    if (!Number.isInteger(val) || val < 0 || val > max) {
      throw new Error(`Invalid entries.${key}: must be integer between 0 and ${max}, got ${val}`);
    }
  }
  const entriesSum = e.correctness + e.completeness;
  if (e.score !== entriesSum) {
    throw new Error(`Entries score arithmetic error: entries.score is ${e.score}, but sum of components is ${entriesSum}`);
  }
  if (e.score > 45) {
    throw new Error(`Invalid entries.score: maximum is 45, got ${e.score}`);
  }

  // 5. Inferences breakdown & arithmetic (max 45: correctness max 25, completeness max 20)
  if (!score.inferences || typeof score.inferences !== "object") {
    throw new Error("Score missing inferences breakdown object");
  }
  const inf = score.inferences;
  const infItems = [
    ["correctness", inf.correctness, 25],
    ["completeness", inf.completeness, 20]
  ];
  for (const [key, val, max] of infItems) {
    if (!Number.isInteger(val) || val < 0 || val > max) {
      throw new Error(`Invalid inferences.${key}: must be integer between 0 and ${max}, got ${val}`);
    }
  }
  const inferencesSum = inf.correctness + inf.completeness;
  if (inf.score !== inferencesSum) {
    throw new Error(`Inferences score arithmetic error: inferences.score is ${inf.score}, but sum of components is ${inferencesSum}`);
  }
  if (inf.score > 45) {
    throw new Error(`Invalid inferences.score: maximum is 45, got ${inf.score}`);
  }

  // 6. Overall score arithmetic
  const totalSum = formatSum + entriesSum + inferencesSum;
  if (score.solScore !== totalSum) {
    throw new Error(`Overall solScore arithmetic error: solScore is ${score.solScore}, but format(${formatSum}) + entries(${entriesSum}) + inferences(${inferencesSum}) is ${totalSum}`);
  }
  if (!Number.isInteger(score.solScore) || score.solScore < 0 || score.solScore > 100) {
    throw new Error(`solScore must be integer between 0 and 100, got ${score.solScore}`);
  }

  // 7. Verdict consistency (mature 90+, promising 85-89, needs-revision 50-84, invalid below 50)
  const allowedVerdicts = ["mature", "promising", "needs-revision", "invalid"];
  if (!allowedVerdicts.includes(score.verdict)) {
    throw new Error(`Invalid verdict: must be one of ${allowedVerdicts.join(", ")}, got "${score.verdict}"`);
  }
  const expectedVerdict = score.solScore >= 90 ? "mature" :
    score.solScore >= 85 ? "promising" :
    score.solScore >= 50 ? "needs-revision" : "invalid";
  if (score.verdict !== expectedVerdict) {
    throw new Error(`Verdict mismatch: solScore ${score.solScore} maps to "${expectedVerdict}", but got "${score.verdict}"`);
  }

  // 8. Evidence arrays and summary validation
  const arrayFields = [
    "matchedEntries", "missingEntries", "incorrectEntries",
    "matchedInferences", "missingInferences", "incorrectInferences"
  ];
  for (const field of arrayFields) {
    if (!Array.isArray(score[field])) {
      throw new Error(`${field} must be an array`);
    }
    for (const item of score[field]) {
      if (typeof item !== "string") {
        throw new Error(`Elements in ${field} must be strings`);
      }
    }
  }

  if (typeof score.summary !== "string" || score.summary.trim() === "") {
    throw new Error("summary must be a non-empty string");
  }

  return true;
}

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

function createSparkProxyFetch({ proxyUrl, apiKey, fetchImpl = globalThis.fetch } = {}) {
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

async function scoreViaSparkForPaperImport({ renderedPrompt, goldRaw, candidateRaw, graphRaw, schemaText, caseId, goldRevision, candidateArtifact, scorerModel, reasoningEffort = "xhigh" }) {
  const provider = resolveSparkProviderConfig(scorerModel);
  const proxyFetch = createSparkProxyFetch({ proxyUrl: provider.proxyUrl, apiKey: provider.apiKey });
  const inlinePrompt = `${renderedPrompt}\n\n---\nINLINED ARTIFACTS (spark scoring — file staging not available over network; use these verbatim)\n- CaseId: ${caseId}\n- GoldRevision: ${goldRevision}\n- CandidateArtifact: ${candidateArtifact}\n\nGOLD JSON (gold.json):\n${goldRaw.slice(0, 90000)}\n\nCANDIDATE JSON (candidate.json):\n${candidateRaw.slice(0, 90000)}\n\nGRAPH METRICS (graph-metrics.json):\n${graphRaw.slice(0, 30000)}\n\nSCHEMA JSON (sol-score-schema.json):\n${schemaText}\n\nInstructions for spark: You MUST base the numeric scores strictly on the inlined JSON contents above, not on file-system access. Return ONLY the JSON object (no markdown fences) defined by the schema. Ensure scorer is "${SPARK_SCORER_MODEL}", promptVersion is "${PROMPT_VERSION}", schema is "${SCHEMA_ID}". Include exact graphComparison from graph-metrics.`;
  const body = { model: provider.model, messages: [{ role: "user", content: inlinePrompt }], temperature: 0, reasoning_effort: reasoningEffort, response_format: { type: "json_object" } };
  let lastText = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const resp = await proxyFetch(`${provider.endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    lastText = await resp.text();
    if (resp.status >= 500 && resp.status <= 599 && attempt === 1) {
      process.stderr.write(`[score-spark-paper-import] gateway ${resp.status}; retrying once\n`);
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

export async function runScorerCliAsync() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };

  const caseId = value("--case");
  const candidateArg = value("--candidate");
  const outputArg = value("--output");
  const goldRevision = value("--gold-revision") || "v1";
  const promptTemplateArg = value("--prompt-template");
  const schemaArg = value("--schema");
  const codexBinArg = value("--codex-bin") || process.env.CODEX_BIN || "codex";
  const dryRun = args.includes("--dry-run");
  let scorerModel = SCORER_MODEL;
  let sparkReasoning = "xhigh";
  let useSpark = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--spark") { useSpark = true; scorerModel = SPARK_SCORER_MODEL; continue; }
    if (a.startsWith("--scorer=") || a.startsWith("--model=")) { scorerModel = a.slice(a.indexOf("=") + 1).trim(); if (scorerModel === SPARK_SCORER_MODEL) useSpark = true; continue; }
    if ((a === "--scorer" || a === "--model") && args[i + 1]) { scorerModel = args[i + 1].trim(); if (scorerModel === SPARK_SCORER_MODEL) useSpark = true; i += 1; continue; }
    if (a.startsWith("--reasoning=")) { sparkReasoning = a.slice("--reasoning=".length).trim(); continue; }
    if (a === "--reasoning" && args[i + 1]) { sparkReasoning = args[i + 1].trim(); i += 1; continue; }
  }
  if (scorerModel === SPARK_SCORER_MODEL) useSpark = true;

  if (!caseId || !candidateArg) {
    throw new Error("usage: score-paper-import-with-sol.mjs --case <id> --candidate <json> [--output <json>] [--gold-revision <rev>] [--dry-run]");
  }

  const caseRoot = path.join(root, "benchmarks/paper-import/cases", caseId);
  const candidatePath = resolveRegularFile(path.resolve(root, candidateArg), "candidate");
  const goldPath = resolveRegularFile(path.join(caseRoot, "gold-project-view.json"), "Gold JSON");
  const promptTemplatePath = resolveRegularFile(
    promptTemplateArg ? path.resolve(root, promptTemplateArg) : path.join(root, "benchmarks/paper-import/sol-score-prompt-v3.md"),
    "prompt template"
  );
  const schemaPath = resolveRegularFile(
    schemaArg ? path.resolve(root, schemaArg) : path.join(root, "benchmarks/paper-import/sol-score-schema-v3.json"),
    "output schema"
  );

  // Parse candidate and gold first so malformed inputs fail closed before calling Sol
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const gold = JSON.parse(fs.readFileSync(goldPath, "utf8"));
  const candidateView = candidate.view ?? candidate;
  if (!Array.isArray(candidateView.entries) || !Array.isArray(candidateView.inferences)) {
    throw new Error("candidate does not contain a Project View");
  }
  if (!Array.isArray(gold.entries) || !Array.isArray(gold.inferences)) {
    throw new Error("Gold does not contain a Project View");
  }

  // Deterministically compute graph descriptors for Gold and candidate
  const goldMetrics = computeGraphDescriptors(gold);
  const candidateMetrics = computeGraphDescriptors(candidate);
  const graphComparison = {
    gold: goldMetrics,
    candidate: candidateMetrics
  };

  const candidateArtifact = path.relative(root, candidatePath);
  const promptTemplateContent = fs.readFileSync(promptTemplatePath, "utf8");

  const stagedGoldFilename = "gold.json";
  const stagedCandidateFilename = "candidate.json";
  const stagedGraphMetricsFilename = "graph-metrics.json";
  const stagedSchemaFilename = "sol-score-schema.json";
  const stagedOutputFilename = "score-output.json";

  const defaultOutput = candidatePath.replace(/\.json$/u, "-sol-score-v3.json");
  const outputPath = outputArg ? path.resolve(root, outputArg) : defaultOutput;

  if (dryRun) {
    const dryRunPrompt = renderSolPrompt({
      templateContent: promptTemplateContent,
      caseId,
      goldRevision,
      goldPath: stagedGoldFilename,
      candidatePath: stagedCandidateFilename,
      candidateArtifact,
      graphMetricsPath: stagedGraphMetricsFilename,
      rootDir: root
    });

    process.stdout.write(`${JSON.stringify({
      caseId,
      goldRevision,
      promptVersion: PROMPT_VERSION,
      candidatePath,
      candidateArtifact,
      goldPath,
      outputPath,
      model: SCORER_MODEL,
      graphComparison,
      isolation: {
        stagingMode: "mkdtemp",
        stagedFiles: [
          stagedCandidateFilename,
          stagedGoldFilename,
          stagedGraphMetricsFilename,
          stagedSchemaFilename
        ],
        sandbox: "read-only"
      },
      prompt: dryRunPrompt
    }, null, 2)}\n`);
    return;
  }

  let stagingDir = null;
  try {
    stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-sol-score-"));
    const stagedGoldPath = path.join(stagingDir, stagedGoldFilename);
    const stagedCandidatePath = path.join(stagingDir, stagedCandidateFilename);
    const stagedGraphMetricsPath = path.join(stagingDir, stagedGraphMetricsFilename);
    const stagedSchemaPath = path.join(stagingDir, stagedSchemaFilename);
    const stagedOutputPath = path.join(stagingDir, stagedOutputFilename);

    fs.copyFileSync(goldPath, stagedGoldPath);
    fs.copyFileSync(candidatePath, stagedCandidatePath);
    fs.writeFileSync(stagedGraphMetricsPath, `${JSON.stringify(graphComparison, null, 2)}\n`, "utf8");
    fs.copyFileSync(schemaPath, stagedSchemaPath);

    const renderedPrompt = renderSolPrompt({
      templateContent: promptTemplateContent,
      caseId,
      goldRevision,
      goldPath: stagedGoldFilename,
      candidatePath: stagedCandidateFilename,
      candidateArtifact,
      graphMetricsPath: stagedGraphMetricsFilename,
      rootDir: root
    });

    let rawOutput;
    if (useSpark) {
      const goldRaw = fs.readFileSync(goldPath, "utf8");
      const candidateRaw = fs.readFileSync(candidatePath, "utf8");
      const graphRaw = JSON.stringify(graphComparison, null, 2);
      const schemaText = fs.readFileSync(schemaPath, "utf8");
      rawOutput = await scoreViaSparkForPaperImport({
        renderedPrompt,
        goldRaw,
        candidateRaw,
        graphRaw,
        schemaText,
        caseId,
        goldRevision,
        candidateArtifact,
        scorerModel,
        reasoningEffort: sparkReasoning,
      });
      fs.writeFileSync(stagedOutputPath, rawOutput, "utf8");
    } else {
      const result = spawnSync(codexBinArg, [
        "exec", "--ephemeral", "--skip-git-repo-check",
        "--model", SCORER_MODEL, "--sandbox", "read-only",
        "--output-schema", stagedSchemaFilename, "--output-last-message", stagedOutputFilename, "-"
      ], {
        cwd: stagingDir,
        input: renderedPrompt,
        encoding: "utf8",
        stdio: ["pipe", "inherit", "inherit"]
      });

      if (result.status !== 0 || !fs.existsSync(stagedOutputPath)) {
        throw new Error(`Sol scoring failed with exit status ${result.status}`);
      }

      rawOutput = fs.readFileSync(stagedOutputPath, "utf8");
    }
    let score;
    try {
      score = JSON.parse(rawOutput);
    } catch (parseErr) {
      throw new Error(`Failed to parse Sol score JSON: ${parseErr.message}`);
    }

    // Validate identity, bounds, arithmetic, evidence, graphComparison, and verdict before atomic publish
    validateSolScore(score, {
      caseId,
      goldRevision,
      candidatePath,
      expectedGraphComparison: graphComparison,
      rootDir: root
    });

    // Atomically publish validated score to requested repository output path
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const tempRepoOutput = `${outputPath}.tmp.${Date.now()}.${process.pid}`;
    fs.copyFileSync(stagedOutputPath, tempRepoOutput);
    fs.renameSync(tempRepoOutput, outputPath);

    process.stdout.write(`${JSON.stringify({
      solScore: score.solScore,
      verdict: score.verdict,
      output: path.relative(root, outputPath),
      promptVersion: score.promptVersion
    }, null, 2)}\n`);
  } finally {
    if (stagingDir && fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch {
        /* ignore cleanup error */
      }
    }
  }
}

// Keep sync export for dry-run callers; async variant handles spark scoring.
export function runScorerCli() {
  // Synchronous wrapper that delegates to async when possible; if spark flag present, use async path.
  const hasSpark = process.argv.some((a) => a === "--spark" || a.startsWith("--scorer=muse-spark") || a.startsWith("--model=muse-spark"));
  if (hasSpark) {
    runScorerCliAsync().catch((err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    return;
  }
  // Fallback: invoke async and block via top-level await emulation (spawn sync of same logic not needed — just call sync path for sol)
  // For sol-only, we can run the original sync body inline by calling async and waiting via deasync-style poll is unnecessary; just run async.
  runScorerCliAsync().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}

// Execute CLI when directly invoked
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runScorerCli();
}
