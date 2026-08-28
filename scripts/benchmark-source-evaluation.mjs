import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  evaluateSemanticState,
  evaluateSourceFidelity,
} from "./evaluate-benchmark-vnext.mjs";

export const BENCHMARK_SOURCE_EVALUATION_SCHEMA = "cmath.benchmark-source-tier-evaluation/v0.1";
export const BENCHMARK_SOURCE_SUITE_EVALUATION_SCHEMA = "cmath.benchmark-source-suite-evaluation/v0.1";
export const BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA = "cmath.benchmark-source-evaluation-cache/v0.1";
export const DEFAULT_BENCHMARK_SOURCE_SCORING_CONTRACT = "cmath.benchmark-source-assessment/v0.1";

export const BENCHMARK_SOURCE_EVALUATION_ERROR_CODES = Object.freeze({
  INPUT_INVALID: "BENCHMARK_SOURCE_EVALUATION_INPUT_INVALID",
  CACHE_INVALID: "BENCHMARK_SOURCE_EVALUATION_CACHE_INVALID",
  SCORER_INVALID: "BENCHMARK_SOURCE_EVALUATION_SCORER_INVALID",
  SOURCE_DISPUTE_UNRESOLVED: "BENCHMARK_SOURCE_EVALUATION_DISPUTE_UNRESOLVED",
});

export class BenchmarkSourceEvaluationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BenchmarkSourceEvaluationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new BenchmarkSourceEvaluationError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function requireCacheIdentity(identity) {
  if (!isRecord(identity)) {
    fail(BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID, "cache identity must be an object");
  }
  for (const field of [
    "sourceIdentity",
    "benchmarkVersion",
    "workflowVersion",
    "scoringContract",
    "scorerIdentity",
    "tier",
    "selectionIdentity",
  ]) {
    if (!nonemptyString(identity[field])) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
        `cache identity requires ${field}`,
        { field },
      );
    }
  }
  for (const [artifactField, digestField] of [
    ["candidate", "candidateDigest"],
    ["reference", "referenceDigest"],
  ]) {
    if (!isRecord(identity[artifactField]) && !/^[a-f0-9]{64}$/u.test(identity[digestField] ?? "")) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
        `cache identity requires ${artifactField} or ${digestField}`,
        { field: artifactField },
      );
    }
  }
  return {
    sourceIdentity: identity.sourceIdentity,
    benchmarkVersion: identity.benchmarkVersion,
    workflowVersion: identity.workflowVersion,
    scoringContract: identity.scoringContract,
    scorerIdentity: identity.scorerIdentity,
    tier: identity.tier,
    selectionIdentity: identity.selectionIdentity,
    equivalenceGroupsDigest: identity.equivalenceGroupsDigest ?? digestJson(identity.equivalenceGroups ?? []),
    semanticRuntimeIdentity: nonemptyString(identity.semanticRuntimeIdentity)
      ? identity.semanticRuntimeIdentity
      : "workflow-bound-default-runtime",
    candidateDigest: identity.candidateDigest ?? digestJson(identity.candidate),
    referenceDigest: identity.referenceDigest ?? digestJson(identity.reference),
  };
}

export function computeBenchmarkSourceEvaluationCacheKey(identity) {
  const validated = requireCacheIdentity(identity);
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(validated)))
    .digest("hex");
}

const SENSITIVE_CACHE_KEY = /^(?:api[-_]?key|authorization|credential|headers?|.*prompt.*|raw.*source.*|source(?:text|markdown|content)|excerpt|request|response|secret|signed.*url|.*token.*|transport)$/iu;

function sanitizeCacheString(value) {
  if (/(?:bearer\s+[a-z0-9._~-]+|(?:api[-_]?key|access[-_]?token|secret|signature)=)/iu.test(value)) {
    return "[redacted]";
  }
  return value;
}

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_CACHE_KEY.test(key))
        .map(([key, child]) => [key, cloneJson(child)]),
    );
  }
  return typeof value === "string" ? sanitizeCacheString(value) : value;
}

function sanitizeSourceRefs(sourceRefs) {
  return (Array.isArray(sourceRefs) ? sourceRefs : [])
    .filter((sourceRef) => typeof sourceRef === "string")
    .map((sourceRef) => {
      if (!/^https?:\/\//iu.test(sourceRef)) return sanitizeCacheString(sourceRef);
      try {
        const locator = new URL(sourceRef);
        const safePage = /^#page=\d+$/u.test(locator.hash) ? locator.hash : "";
        return `${locator.origin}${locator.pathname}${safePage}`;
      } catch {
        return "[redacted]";
      }
    })
    .filter((sourceRef) => sourceRef !== "[redacted]");
}

function sanitizeFinding(finding) {
  return {
    id: finding?.id,
    objectKind: finding?.objectKind,
    verdict: finding?.verdict,
    candidateObjectIds: cloneJson(finding?.candidateObjectIds ?? []),
    goldObjectIds: cloneJson(finding?.goldObjectIds ?? []),
    sourceRefs: sanitizeSourceRefs(finding?.sourceRefs),
  };
}

function sanitizeSourceAssessment(sourceAssessment) {
  return {
    schema: sourceAssessment?.schema,
    mode: sourceAssessment?.mode,
    sourceIdentity: sourceAssessment?.sourceIdentity,
    findings: Array.isArray(sourceAssessment?.findings)
      ? sourceAssessment.findings.map(sanitizeFinding)
      : [],
  };
}

function sanitizeSourceEvaluation(sourceEvaluation) {
  const findings = (field) => Array.isArray(sourceEvaluation?.[field])
    ? sourceEvaluation[field].map(sanitizeFinding)
    : [];
  return {
    schema: sourceEvaluation?.schema,
    sourceClean: sourceEvaluation?.sourceClean === true,
    eligibleForComparison: sourceEvaluation?.eligibleForComparison === true,
    coverage: {
      candidateObjectCount: sourceEvaluation?.coverage?.candidateObjectCount,
      goldObjectCount: sourceEvaluation?.coverage?.goldObjectCount,
      findingCount: sourceEvaluation?.coverage?.findingCount,
      supportedFindingCount: sourceEvaluation?.coverage?.supportedFindingCount,
      supportedRepresentedFindingCount: sourceEvaluation?.coverage?.supportedRepresentedFindingCount,
      representedSupportedFindingCount: sourceEvaluation?.coverage?.representedSupportedFindingCount,
    },
    coverageRatio: sourceEvaluation?.coverageRatio,
    omissions: findings("omissions"),
    goldGaps: findings("goldGaps"),
    distortions: findings("distortions"),
    fabrications: findings("fabrications"),
    goldDefects: findings("goldDefects"),
    unresolvedCandidateObjects: (sourceEvaluation?.unresolvedCandidateObjects ?? [])
      .filter(nonemptyString),
    unresolvedCandidateObjectDetails: (sourceEvaluation?.unresolvedCandidateObjectDetails ?? [])
      .filter(isRecord)
      .map((detail) => ({ objectKind: detail.objectKind, objectId: detail.objectId })),
  };
}

function sanitizeCacheRecord(cacheKey, record) {
  if (!isRecord(record) || record.schema !== BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA || record.cacheKey !== cacheKey) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
      "cache record schema or identity is invalid",
      { cacheKey },
    );
  }
  const identity = record.identity ?? {};
  let embeddedCacheKey;
  try {
    embeddedCacheKey = computeBenchmarkSourceEvaluationCacheKey(identity);
  } catch (error) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
      "cache record has an incomplete embedded identity",
      { cacheKey, cause: error?.message },
    );
  }
  if (embeddedCacheKey !== cacheKey) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
      "cache record embedded identity does not match its key",
      { cacheKey },
    );
  }
  return {
    schema: BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
    cacheKey,
    identity: {
      sourceIdentity: identity.sourceIdentity,
      benchmarkVersion: identity.benchmarkVersion,
      workflowVersion: identity.workflowVersion,
      scoringContract: identity.scoringContract,
      scorerIdentity: identity.scorerIdentity,
      tier: identity.tier,
      selectionIdentity: identity.selectionIdentity,
      equivalenceGroupsDigest: identity.equivalenceGroupsDigest,
      semanticRuntimeIdentity: identity.semanticRuntimeIdentity,
      candidateDigest: identity.candidateDigest,
      referenceDigest: identity.referenceDigest,
    },
    sourceAssessment: sanitizeSourceAssessment(record.sourceAssessment),
    sourceEvaluation: sanitizeSourceEvaluation(record.sourceEvaluation),
    semanticSummary: {
      equivalent: record.semanticSummary?.equivalent === true,
      discrepancyCounts: cloneJson(record.semanticSummary?.discrepancyCounts ?? {}),
    },
    selection: {
      mode: record.selection?.mode,
      pages: (record.selection?.pages ?? []).filter((page) => Number.isInteger(page) && page > 0),
      sectionIds: (record.selection?.sectionIds ?? []).filter(nonemptyString),
      locators: (record.selection?.locators ?? [])
        .filter(isRecord)
        .map((locator) => ({
          page: Number.isInteger(locator.page) && locator.page > 0 ? locator.page : undefined,
          heading: nonemptyString(locator.heading) ? sanitizeCacheString(locator.heading) : undefined,
        })),
    },
  };
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

export function createBenchmarkSourceEvaluationFileCache({ directory } = {}) {
  if (!nonemptyString(directory)) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "file cache requires a directory",
      { field: "directory" },
    );
  }
  const resolvedDirectory = path.resolve(directory);
  const assertSafeDirectory = ({ allowMissing = false } = {}) => {
    if (!fs.existsSync(resolvedDirectory)) {
      if (allowMissing) return false;
      fs.mkdirSync(resolvedDirectory, { recursive: true });
    }
    const directoryStat = fs.lstatSync(resolvedDirectory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
        "cache directory must be a regular non-symlink directory",
        { directory: resolvedDirectory },
      );
    }
    return true;
  };
  return Object.freeze({
    async get(cacheKey) {
      if (!/^[a-f0-9]{64}$/u.test(cacheKey ?? "")) return null;
      if (!assertSafeDirectory({ allowMissing: true })) return null;
      const filePath = path.join(resolvedDirectory, `${cacheKey}.json`);
      if (!fs.existsSync(filePath)) return null;
      let descriptor;
      try {
        descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      } catch (error) {
        fail(
          BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
          "cache entry must be an openable non-symlink file",
          { cacheKey, cause: error?.message },
        );
      }
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.nlink !== 1) {
        fs.closeSync(descriptor);
        fail(
          BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
          "cache entry must be a regular single-link file",
          { cacheKey },
        );
      }
      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(descriptor, "utf8"));
      } catch (error) {
        fail(
          BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
          "cache entry is not valid JSON",
          { cacheKey, cause: error?.message },
        );
      } finally {
        fs.closeSync(descriptor);
      }
      return freezeDeep(sanitizeCacheRecord(cacheKey, parsed));
    },
    async set(cacheKey, record) {
      if (!/^[a-f0-9]{64}$/u.test(cacheKey ?? "")) {
        fail(
          BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.CACHE_INVALID,
          "cache key must be a SHA-256 digest",
          { cacheKey },
        );
      }
      const sanitized = sanitizeCacheRecord(cacheKey, record);
      assertSafeDirectory();
      const filePath = path.join(resolvedDirectory, `${cacheKey}.json`);
      const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
      let descriptor;
      try {
        descriptor = fs.openSync(
          temporaryPath,
          fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0),
          0o600,
        );
        fs.writeFileSync(descriptor, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
        fs.fsyncSync(descriptor);
      } catch (error) {
        if (descriptor !== undefined) {
          fs.closeSync(descriptor);
          descriptor = undefined;
        }
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        throw error;
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
      }
      fs.renameSync(temporaryPath, filePath);
      return freezeDeep(sanitized);
    },
  });
}

function digestJson(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function stateObjects(state) {
  return [...(state?.entries ?? []), ...(state?.inferences ?? [])]
    .filter((object) => isRecord(object) && nonemptyString(object.id));
}

function collectStrings(value, target = new Set()) {
  if (typeof value === "string") target.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, target));
  else if (isRecord(value)) Object.values(value).forEach((item) => collectStrings(item, target));
  return target;
}

function collectPageHints(value, key = "", target = new Set()) {
  if (Number.isInteger(value) && value > 0 && /page/iu.test(key)) target.add(value);
  if (typeof value === "string" && /page|source|locator|ref/iu.test(key)) {
    for (const match of value.matchAll(/(?:\[\[PAGE\s+|page(?:=|\s+)|p\.\s*)(\d+)/giu)) {
      const page = Number(match[1]);
      if (Number.isInteger(page) && page > 0) target.add(page);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectPageHints(item, key, target));
  } else if (isRecord(value)) {
    Object.entries(value).forEach(([childKey, item]) => collectPageHints(item, childKey, target));
  }
  return target;
}

function sourceQueries(candidate, reference, semantic) {
  const allObjects = [...stateObjects(candidate), ...stateObjects(reference)];
  const byId = new Map();
  for (const object of allObjects) {
    const objects = byId.get(object.id) ?? [];
    objects.push(object);
    byId.set(object.id, objects);
  }
  const discrepancyStrings = collectStrings(semantic?.discrepancies ?? {});
  let affected = [...discrepancyStrings]
    .filter((value) => byId.has(value))
    .flatMap((value) => byId.get(value));
  if (affected.length === 0) affected = allObjects;
  const queries = [...new Set(affected.flatMap((object) => [
    object.title,
    object.statement,
    object.argument,
  ]).filter(nonemptyString))];
  const pageHints = [...collectPageHints(affected)].sort((left, right) => left - right);
  return { queries, pageHints };
}

function discrepancyCounts(semantic) {
  return Object.fromEntries(
    Object.entries(semantic?.discrepancies ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]),
  );
}

function selectionIdentity(sourceIdentity, tier, selection) {
  return digestJson({
    sourceIdentity,
    tier,
    mode: selection?.mode,
    pages: selection?.pages ?? [],
    sectionIds: selection?.sectionIds ?? [],
    markdownDigest: createHash("sha256").update(selection?.markdown ?? "").digest("hex"),
  });
}

function selectionSummary(selection) {
  return {
    mode: selection?.mode,
    pages: cloneJson(selection?.pages ?? []),
    sectionIds: cloneJson(selection?.sectionIds ?? []),
    locators: cloneJson(selection?.locators ?? []),
  };
}

function semanticRuntimeIdentity(runtime, workflowVersion) {
  if (runtime === undefined) return `workflow:${workflowVersion}:default-runtime`;
  const identity = runtime?.syncIdentity ?? runtime?.manifest?.syncIdentity ?? runtime?.identity;
  if (!nonemptyString(identity)) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "an injected semantic runtime requires a stable identity",
      { field: "runtime" },
    );
  }
  return identity;
}

function scorerDisputesSource(result) {
  return result?.status === "source_dispute" || result?.sourceDispute === true;
}

function scorerAssessment(result) {
  if (isRecord(result?.sourceAssessment)) return result.sourceAssessment;
  if (isRecord(result) && Array.isArray(result.findings)) return result;
  fail(
    BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.SCORER_INVALID,
    "automatic source scorer must return sourceAssessment",
  );
}

function validateTierOptions(options) {
  if (!isRecord(options)) {
    fail(BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID, "source tier options must be an object");
  }
  for (const field of [
    "tier",
    "sourceIdentity",
    "markedMarkdown",
    "benchmarkVersion",
    "workflowVersion",
    "scoringContract",
    "scorerIdentity",
  ]) {
    if (!nonemptyString(options[field])) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
        `source tier evaluation requires ${field}`,
        { field },
      );
    }
  }
  if (!isRecord(options.candidate) || !isRecord(options.reference)) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source tier evaluation requires candidate and reference maps",
    );
  }
  if (typeof options.scoreSource !== "function") {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source tier evaluation requires scoreSource",
      { field: "scoreSource" },
    );
  }
  if (options.cache !== undefined
    && (typeof options.cache?.get !== "function" || typeof options.cache?.set !== "function")) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "cache must expose async get and set functions",
      { field: "cache" },
    );
  }
  return options;
}

export async function evaluateBenchmarkSourceTier(rawOptions = {}) {
  const options = validateTierOptions(rawOptions);
  const {
    tier,
    candidate,
    reference,
    equivalenceGroups = [],
    runtime,
    sourceIdentity,
    markedMarkdown,
    benchmarkVersion,
    workflowVersion,
    scoringContract,
    scorerIdentity,
    scoreSource,
    cache,
  } = options;
  const semantic = await evaluateSemanticState({
    candidate,
    reference,
    equivalenceGroups,
    runtime,
  });
  const { buildBenchmarkSourceIndex, selectBenchmarkSource } = await import("./benchmark-source-index.mjs");
  const index = buildBenchmarkSourceIndex({ sourceIdentity, markdown: markedMarkdown });
  const hints = sourceQueries(candidate, reference, semantic);
  const plannedSelection = selectBenchmarkSource({
    tier,
    index,
    queries: hints.queries,
    pageHints: hints.pageHints,
  });
  const plannedSelectionIdentity = selectionIdentity(sourceIdentity, tier, plannedSelection);
  const cacheIdentity = {
    sourceIdentity,
    benchmarkVersion,
    workflowVersion,
    scoringContract,
    scorerIdentity,
    tier,
    selectionIdentity: plannedSelectionIdentity,
    equivalenceGroups,
    semanticRuntimeIdentity: semanticRuntimeIdentity(runtime, workflowVersion),
    candidate,
    reference,
  };
  const cacheKey = computeBenchmarkSourceEvaluationCacheKey(cacheIdentity);
  const cached = cache ? await cache.get(cacheKey) : null;
  if (cached) {
    const validatedCached = sanitizeCacheRecord(cacheKey, cached);
    return freezeDeep({
      schema: BENCHMARK_SOURCE_EVALUATION_SCHEMA,
      tier,
      cacheKey,
      cacheHit: true,
      semantic,
      source: validatedCached.sourceEvaluation,
      sourceAssessment: validatedCached.sourceAssessment,
      selection: validatedCached.selection,
    });
  }

  const makeRequest = (selection) => freezeDeep({
    schema: "cmath.benchmark-source-scoring-request/v0.1",
    tier,
    sourceIdentity,
    benchmarkVersion,
    workflowVersion,
    scoringContract,
    scorerIdentity,
    candidate,
    reference,
    semantic,
    selection,
  });
  let selection = plannedSelection;
  let scored = await scoreSource(makeRequest(selection));
  if (scorerDisputesSource(scored)) {
    selection = selectBenchmarkSource({ tier, index, disputed: true });
    scored = await scoreSource(makeRequest(selection));
    if (scorerDisputesSource(scored)) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.SOURCE_DISPUTE_UNRESOLVED,
        "automatic source scorer disputed the canonical full source",
        { sourceIdentity, tier },
      );
    }
  }
  const sourceAssessment = scorerAssessment(scored);
  const source = await evaluateSourceFidelity({
    candidate,
    gold: reference,
    sourceAssessment,
    expectedSourceIdentity: sourceIdentity,
  });
  const summary = selectionSummary(selection);
  const record = {
    schema: BENCHMARK_SOURCE_CACHE_RECORD_SCHEMA,
    cacheKey,
    identity: {
      sourceIdentity,
      benchmarkVersion,
      workflowVersion,
      scoringContract,
      scorerIdentity,
      tier,
      selectionIdentity: plannedSelectionIdentity,
      equivalenceGroupsDigest: digestJson(equivalenceGroups),
      semanticRuntimeIdentity: semanticRuntimeIdentity(runtime, workflowVersion),
      candidateDigest: digestJson(candidate),
      referenceDigest: digestJson(reference),
    },
    sourceAssessment: source.sourceAssessment,
    sourceEvaluation: source,
    semanticSummary: {
      equivalent: semantic.equivalent,
      discrepancyCounts: discrepancyCounts(semantic),
    },
    selection: summary,
  };
  if (cache) await cache.set(cacheKey, record);
  return freezeDeep({
    schema: BENCHMARK_SOURCE_EVALUATION_SCHEMA,
    tier,
    cacheKey,
    cacheHit: false,
    semantic,
    source,
    sourceAssessment: source.sourceAssessment,
    selection: summary,
  });
}

export async function evaluateBenchmarkSourceSuite(options = {}) {
  if (!isRecord(options)
    || !isRecord(options.sourceManifest)
    || options.sourceManifest.schema !== "cmath.paper-source-manifest/v2"
    || !Array.isArray(options.sourceManifest.activeCases)
    || !Array.isArray(options.cases)) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source suite requires a v2 source manifest and cases",
    );
  }
  if (typeof options.scoreSource !== "function") {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source suite requires scoreSource",
      { field: "scoreSource" },
    );
  }
  const activeRecords = options.sourceManifest.activeCases;
  const activeIds = activeRecords.map((record) => record?.caseId);
  if (activeIds.some((caseId) => !nonemptyString(caseId)) || new Set(activeIds).size !== activeIds.length) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source manifest active case ids must be unique non-empty strings",
    );
  }
  const byCaseId = new Map();
  for (const item of options.cases) {
    if (!isRecord(item) || !nonemptyString(item.caseId) || byCaseId.has(item.caseId)) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
        "source suite cases must have unique caseId values",
      );
    }
    byCaseId.set(item.caseId, item);
  }
  const unknownCaseIds = [...byCaseId.keys()].filter((caseId) => !activeIds.includes(caseId));
  if (unknownCaseIds.length > 0) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "source suite cases must belong to the frozen active source set",
      { unknownCaseIds },
    );
  }
  if (options.tier === "final"
    && (byCaseId.size !== activeIds.length || activeIds.some((caseId) => !byCaseId.has(caseId)))) {
    fail(
      BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
      "final source suite must include every fixed active source",
      { expectedCaseIds: activeIds, actualCaseIds: [...byCaseId.keys()] },
    );
  }
  const selectedRecords = activeRecords.filter((record) => byCaseId.has(record.caseId));
  const results = [];
  for (const sourceRecord of selectedRecords) {
    const item = byCaseId.get(sourceRecord.caseId);
    if (item.sourceIdentity !== sourceRecord.sourceIdentitySha256) {
      fail(
        BENCHMARK_SOURCE_EVALUATION_ERROR_CODES.INPUT_INVALID,
        "source suite case identity differs from the frozen source manifest",
        { caseId: sourceRecord.caseId },
      );
    }
    const result = await evaluateBenchmarkSourceTier({
      ...item,
      tier: options.tier,
      benchmarkVersion: options.benchmarkVersion,
      workflowVersion: options.workflowVersion,
      scoringContract: options.scoringContract,
      scorerIdentity: options.scorerIdentity,
      runtime: options.runtime,
      cache: options.cache,
      scoreSource: (request) => options.scoreSource(freezeDeep({
        ...request,
        caseId: sourceRecord.caseId,
      })),
    });
    results.push({ caseId: sourceRecord.caseId, result });
  }
  return freezeDeep({
    schema: BENCHMARK_SOURCE_SUITE_EVALUATION_SCHEMA,
    tier: options.tier,
    caseIds: results.map(({ caseId }) => caseId),
    results,
  });
}
