import { loadBenchmarkCapabilityRuntime } from "./benchmark-capability-runtime.mjs";

const EVALUATION_SCHEMA = "cmath.benchmark-semantic-evaluation/v0.1";
const SOURCE_ASSESSMENT_SCHEMA = "cmath.benchmark-source-assessment/v0.1";
const SOURCE_EVALUATION_SCHEMA = "cmath.benchmark-source-fidelity-evaluation/v0.1";
const COMBINED_EVALUATION_SCHEMA = "cmath.benchmark-vnext-evaluation/v0.1";
const CLAIM_STATE_ORDER = Object.freeze(["established", "open", "refuted"]);
const CLAIM_STATE_RANK = new Map(CLAIM_STATE_ORDER.map((state, index) => [state, index]));

export const BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES = Object.freeze({
  INPUT_INVALID: "BENCHMARK_EVALUATOR_INPUT_INVALID",
  RUNTIME_INVALID: "BENCHMARK_EVALUATOR_RUNTIME_INVALID",
  EQUIVALENCE_GROUP_INVALID: "BENCHMARK_EVALUATOR_EQUIVALENCE_GROUP_INVALID",
  EQUIVALENCE_GROUP_UNKNOWN_ID: "BENCHMARK_EVALUATOR_EQUIVALENCE_GROUP_UNKNOWN_ID",
  EQUIVALENCE_GROUP_OVERLAP: "BENCHMARK_EVALUATOR_EQUIVALENCE_GROUP_OVERLAP",
  EQUIVALENCE_GROUP_ALREADY_MATCHED: "BENCHMARK_EVALUATOR_EQUIVALENCE_GROUP_ALREADY_MATCHED",
});

export const BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES = Object.freeze({
  INPUT_INVALID: "BENCHMARK_SOURCE_EVALUATOR_INPUT_INVALID",
  ASSESSMENT_INVALID: "BENCHMARK_SOURCE_EVALUATOR_ASSESSMENT_INVALID",
  SOURCE_IDENTITY_INVALID: "BENCHMARK_SOURCE_EVALUATOR_SOURCE_IDENTITY_INVALID",
  SOURCE_IDENTITY_MISMATCH: "BENCHMARK_SOURCE_EVALUATOR_SOURCE_IDENTITY_MISMATCH",
  FINDING_INVALID: "BENCHMARK_SOURCE_EVALUATOR_FINDING_INVALID",
  FINDING_UNKNOWN_OBJECT: "BENCHMARK_SOURCE_EVALUATOR_FINDING_UNKNOWN_OBJECT",
  FINDING_OVERLAP: "BENCHMARK_SOURCE_EVALUATOR_FINDING_OVERLAP",
});

export class BenchmarkSemanticEvaluatorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BenchmarkSemanticEvaluatorError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new BenchmarkSemanticEvaluatorError(code, message, details);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortedUnique(values) {
  return [...new Set(values)].sort(compareStrings);
}

function stableEqual(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/**
 * Normalize compatibility variants and whitespace only. Mathematical symbols
 * and punctuation remain significant; an automatic semantic judge supplies
 * an equivalence group when wording differs without changing meaning.
 */
function normalizeSemanticText(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
}

function entryKind(entry) {
  return entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
}

function entryFingerprint(entry) {
  return [
    entry.entryClass,
    entryKind(entry),
    normalizeSemanticText(entry.title),
    normalizeSemanticText(entry.statement),
  ].join("\u0000");
}

function entryIndex(entries, side) {
  if (!Array.isArray(entries)) {
    fail(
      BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.INPUT_INVALID,
      `${side} Math State entries must be an array`,
      { side, field: "entries" },
    );
  }
  const byId = new Map();
  for (const entry of entries) {
    if (!isObject(entry) || typeof entry.id !== "string" || !entry.id.trim()) {
      fail(
        BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.INPUT_INVALID,
        `${side} Math State contains an entry without a usable id`,
        { side },
      );
    }
    if (byId.has(entry.id)) {
      fail(
        BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.INPUT_INVALID,
        `${side} Math State contains duplicate entry id: ${entry.id}`,
        { side, entryId: entry.id },
      );
    }
    byId.set(entry.id, entry);
  }
  return byId;
}

function sortEntryIds(ids, byId) {
  return [...ids].sort((left, right) => {
    const fingerprintOrder = compareStrings(entryFingerprint(byId.get(left)), entryFingerprint(byId.get(right)));
    return fingerprintOrder || compareStrings(left, right);
  });
}

function groupByFingerprint(entries, excludedIds) {
  const byFingerprint = new Map();
  for (const entry of entries) {
    if (excludedIds.has(entry.id)) continue;
    const fingerprint = entryFingerprint(entry);
    const ids = byFingerprint.get(fingerprint) ?? [];
    ids.push(entry.id);
    byFingerprint.set(fingerprint, ids);
  }
  return byFingerprint;
}

function validateEquivalenceGroups(equivalenceGroups, referenceById, candidateById) {
  if (!Array.isArray(equivalenceGroups)) {
    fail(
      BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_INVALID,
      "equivalenceGroups must be an array",
      { field: "equivalenceGroups" },
    );
  }

  const referenceReserved = new Set();
  const candidateReserved = new Set();
  const groups = [];

  equivalenceGroups.forEach((group, groupIndex) => {
    if (!isObject(group) || !Array.isArray(group.referenceEntryIds) || !Array.isArray(group.candidateEntryIds)) {
      fail(
        BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_INVALID,
        `equivalenceGroups[${groupIndex}] must contain referenceEntryIds and candidateEntryIds arrays`,
        { groupIndex },
      );
    }
    if (!group.referenceEntryIds.length || !group.candidateEntryIds.length) {
      fail(
        BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_INVALID,
        `equivalenceGroups[${groupIndex}] must map at least one entry on each side`,
        { groupIndex },
      );
    }

    const referenceEntryIds = [...group.referenceEntryIds];
    const candidateEntryIds = [...group.candidateEntryIds];
    for (const [side, ids, byId, reserved] of [
      ["reference", referenceEntryIds, referenceById, referenceReserved],
      ["candidate", candidateEntryIds, candidateById, candidateReserved],
    ]) {
      for (const entryId of ids) {
        if (typeof entryId !== "string" || !entryId.trim() || !byId.has(entryId)) {
          fail(
            BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_UNKNOWN_ID,
            `equivalenceGroups[${groupIndex}] references an unknown ${side} entry id: ${entryId}`,
            { groupIndex, side, entryId },
          );
        }
        if (reserved.has(entryId)) {
          fail(
            BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_OVERLAP,
            `equivalenceGroups reuse a ${side} entry id: ${entryId}`,
            { groupIndex, side, entryId },
          );
        }
        reserved.add(entryId);
      }
    }

    const classes = [
      ...referenceEntryIds.map((entryId) => referenceById.get(entryId).entryClass),
      ...candidateEntryIds.map((entryId) => candidateById.get(entryId).entryClass),
    ];
    if (new Set(classes).size !== 1) {
      fail(
        BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.EQUIVALENCE_GROUP_INVALID,
        `equivalenceGroups[${groupIndex}] cannot mix Fact and Claim entries`,
        { groupIndex, entryClasses: sortedUnique(classes) },
      );
    }

    groups.push({
      matchType: "equivalenceGroup",
      referenceEntryIds,
      candidateEntryIds,
    });
  });

  return { groups, referenceReserved, candidateReserved };
}

function buildAutoGroups(referenceEntries, candidateEntries, referenceReserved, candidateReserved) {
  const referenceByFingerprint = groupByFingerprint(referenceEntries, referenceReserved);
  const candidateByFingerprint = groupByFingerprint(candidateEntries, candidateReserved);
  const fingerprints = [...referenceByFingerprint.keys()]
    .filter((fingerprint) => candidateByFingerprint.has(fingerprint))
    .sort(compareStrings);
  const groups = [];

  for (const fingerprint of fingerprints) {
    const referenceEntryIds = referenceByFingerprint.get(fingerprint);
    const candidateEntryIds = candidateByFingerprint.get(fingerprint);
    if (referenceEntryIds.length !== 1 || candidateEntryIds.length !== 1) continue;
    groups.push({
      matchType: "auto",
      fingerprint,
      referenceEntryIds: [...referenceEntryIds],
      candidateEntryIds: [...candidateEntryIds],
    });
  }
  return groups;
}

function groupSortKey(group, referenceById, candidateById) {
  const referenceDescriptors = sortEntryIds(group.referenceEntryIds, referenceById)
    .map((entryId) => entryFingerprint(referenceById.get(entryId)));
  const candidateDescriptors = sortEntryIds(group.candidateEntryIds, candidateById)
    .map((entryId) => entryFingerprint(candidateById.get(entryId)));
  return JSON.stringify([referenceDescriptors, candidateDescriptors]);
}

function assignGroupTokens(groups, referenceById, candidateById) {
  const sortedGroups = [...groups].sort((left, right) => {
    const keyOrder = compareStrings(
      groupSortKey(left, referenceById, candidateById),
      groupSortKey(right, referenceById, candidateById),
    );
    if (keyOrder) return keyOrder;
    const leftTie = `${left.referenceEntryIds.join("\u0000")}\u0001${left.candidateEntryIds.join("\u0000")}`;
    const rightTie = `${right.referenceEntryIds.join("\u0000")}\u0001${right.candidateEntryIds.join("\u0000")}`;
    return compareStrings(leftTie, rightTie);
  });
  return sortedGroups.map((group, index) => ({
    ...group,
    token: `group:${index}`,
    referenceEntryIds: sortEntryIds(group.referenceEntryIds, referenceById),
    candidateEntryIds: sortEntryIds(group.candidateEntryIds, candidateById),
  }));
}

function makeEntryGroupMaps(groups) {
  const referenceToGroup = new Map();
  const candidateToGroup = new Map();
  for (const group of groups) {
    for (const entryId of group.referenceEntryIds) referenceToGroup.set(entryId, group.token);
    for (const entryId of group.candidateEntryIds) candidateToGroup.set(entryId, group.token);
  }
  return { referenceToGroup, candidateToGroup };
}

function groupEntries(entries, byId) {
  const entryClasses = sortedUnique(entries.map((entryId) => byId.get(entryId).entryClass));
  const kinds = sortedUnique(entries.map((entryId) => entryKind(byId.get(entryId))));
  return { entryClasses, kinds };
}

function buildEntryMatches(groups) {
  return groups.map((group) => ({
    token: group.token,
    matchType: group.matchType,
    referenceEntryIds: [...group.referenceEntryIds],
    candidateEntryIds: [...group.candidateEntryIds],
  }));
}

function buildUnmatchedEntries(entries, entryToGroup, side) {
  return entries
    .filter((entry) => !entryToGroup.has(entry.id))
    .sort((left, right) => {
      const fingerprintOrder = compareStrings(entryFingerprint(left), entryFingerprint(right));
      return fingerprintOrder || compareStrings(left.id, right.id);
    })
    .map((entry) => ({
      side,
      entryId: entry.id,
      entryClass: entry.entryClass,
      kind: entryKind(entry),
      title: entry.title,
      statement: entry.statement,
    }));
}

function compareEntryKinds(groups, referenceById, candidateById) {
  const discrepancies = [];
  for (const group of groups) {
    const reference = groupEntries(group.referenceEntryIds, referenceById);
    const candidate = groupEntries(group.candidateEntryIds, candidateById);
    if (!stableEqual(reference.entryClasses, candidate.entryClasses) || !stableEqual(reference.kinds, candidate.kinds)) {
      discrepancies.push({
        token: group.token,
        referenceEntryIds: [...group.referenceEntryIds],
        candidateEntryIds: [...group.candidateEntryIds],
        referenceEntryClasses: reference.entryClasses,
        candidateEntryClasses: candidate.entryClasses,
        referenceKinds: reference.kinds,
        candidateKinds: candidate.kinds,
      });
    }
  }
  return discrepancies;
}

function derivedB0Ids(state) {
  return Array.isArray(state?.b0ClaimEntryIds) ? state.b0ClaimEntryIds : [];
}

function compareB0(groups, candidateState, referenceState, referenceToGroup, candidateToGroup) {
  const referenceTokens = sortedUnique(derivedB0Ids(referenceState).map(
    (entryId) => referenceToGroup.get(entryId) ?? `reference:unmatched:${entryId}`,
  ));
  const candidateTokens = sortedUnique(derivedB0Ids(candidateState).map(
    (entryId) => candidateToGroup.get(entryId) ?? `candidate:unmatched:${entryId}`,
  ));
  if (stableEqual(referenceTokens, candidateTokens)) return [];

  return [{
    referenceGroupTokens: referenceTokens,
    candidateGroupTokens: candidateTokens,
    matchedGroupTokens: groups.map((group) => group.token),
    referenceB0ClaimEntryIds: [...derivedB0Ids(referenceState)],
    candidateB0ClaimEntryIds: [...derivedB0Ids(candidateState)],
  }];
}

function claimStatesForGroup(group, state, byId) {
  const claimStateMap = isObject(state?.claimStates) ? state.claimStates : {};
  const states = [];
  for (const entryId of group) {
    if (byId.get(entryId)?.entryClass !== "claim") continue;
    if (typeof claimStateMap[entryId] === "string") states.push(claimStateMap[entryId]);
  }
  return [...new Set(states)].sort((left, right) => {
    const leftRank = CLAIM_STATE_RANK.get(left) ?? CLAIM_STATE_ORDER.length;
    const rightRank = CLAIM_STATE_RANK.get(right) ?? CLAIM_STATE_ORDER.length;
    return leftRank - rightRank || compareStrings(left, right);
  });
}

function compareClaimStates(groups, candidateState, referenceState, candidateById, referenceById) {
  const discrepancies = [];
  for (const group of groups) {
    const referenceEntries = groupEntries(group.referenceEntryIds, referenceById);
    const candidateEntries = groupEntries(group.candidateEntryIds, candidateById);
    if (!referenceEntries.entryClasses.includes("claim") || !candidateEntries.entryClasses.includes("claim")) continue;
    const referenceStates = claimStatesForGroup(group.referenceEntryIds, referenceState, referenceById);
    const candidateStates = claimStatesForGroup(group.candidateEntryIds, candidateState, candidateById);
    if (!stableEqual(referenceStates, candidateStates)) {
      discrepancies.push({
        token: group.token,
        referenceEntryIds: [...group.referenceEntryIds],
        candidateEntryIds: [...group.candidateEntryIds],
        referenceStates,
        candidateStates,
        referenceState: referenceStates.length === 1 ? referenceStates[0] : referenceStates,
        candidateState: candidateStates.length === 1 ? candidateStates[0] : candidateStates,
      });
    }
  }
  return discrepancies;
}

function relationToken(entryId, side, entryToGroup) {
  return entryToGroup.get(entryId) ?? `${side}:unmatched:${entryId}`;
}

function negationRelationSet(state, side, entryToGroup) {
  const pairs = Array.isArray(state?.negationPairs) ? state.negationPairs : [];
  const relationByKey = new Map();
  for (const pair of pairs) {
    const endpoints = [...pair.claimEntryIds]
      .map((entryId) => relationToken(entryId, side, entryToGroup))
      .sort(compareStrings);
    const key = JSON.stringify(endpoints);
    relationByKey.set(key, endpoints);
  }
  return relationByKey;
}

function inferenceRelationSet(state, side, entryToGroup) {
  const inferences = Array.isArray(state?.inferences) ? state.inferences : [];
  const relationByKey = new Map();
  for (const inference of inferences) {
    const premises = sortedUnique((inference.premises ?? []).map(
      (entryId) => relationToken(entryId, side, entryToGroup),
    ));
    const relation = {
      operationKind: inference.operationKind,
      premises,
      conclusion: relationToken(inference.conclusion, side, entryToGroup),
    };
    relationByKey.set(JSON.stringify(relation), relation);
  }
  return relationByKey;
}

function compareRelationSets(referenceRelations, candidateRelations) {
  const referenceKeys = [...referenceRelations.keys()].sort(compareStrings);
  const candidateKeys = [...candidateRelations.keys()].sort(compareStrings);
  const missingKeys = referenceKeys.filter((key) => !candidateRelations.has(key));
  const extraKeys = candidateKeys.filter((key) => !referenceRelations.has(key));
  if (!missingKeys.length && !extraKeys.length) return [];
  return [{
    reference: referenceKeys.map((key) => referenceRelations.get(key)),
    candidate: candidateKeys.map((key) => candidateRelations.get(key)),
    missing: missingKeys.map((key) => referenceRelations.get(key)),
    extra: extraKeys.map((key) => candidateRelations.get(key)),
  }];
}

function freezeEvaluatorData(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) freezeEvaluatorData(item, seen);
  } else {
    for (const item of Object.values(value)) freezeEvaluatorData(item, seen);
  }
  return Object.freeze(value);
}

function freezeResult(result) {
  // The canonical state objects are included verbatim, while evaluator-owned
  // envelopes and discrepancy data are recursively frozen for safe consumers.
  for (const [key, value] of Object.entries(result)) {
    if (key === "candidateState" || key === "referenceState") continue;
    freezeEvaluatorData(value);
  }
  return Object.freeze(result);
}

function validateRuntime(runtime) {
  if (!isObject(runtime) || !isObject(runtime.semantics) || typeof runtime.semantics.deriveMathState !== "function") {
    fail(
      BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.RUNTIME_INVALID,
      "runtime.semantics.deriveMathState must be a function",
      { field: "runtime.semantics.deriveMathState" },
    );
  }
  return runtime;
}

/**
 * Compare two strict canonical v3 Math States without making identity, JSON
 * order, or proof/inference identifiers part of semantic equality.
 */
export async function evaluateSemanticState(options = {}) {
  const {
    candidate,
    reference,
    equivalenceGroups = [],
    runtime,
  } = isObject(options) ? options : {};

  const resolvedRuntime = runtime === undefined
    ? await loadBenchmarkCapabilityRuntime()
    : validateRuntime(runtime);
  const deriveMathState = resolvedRuntime.semantics.deriveMathState;

  // Do not catch or translate these calls: capability error codes are part of
  // the public contract and must escape unchanged.
  const candidateState = await deriveMathState(candidate);
  const referenceState = await deriveMathState(reference);

  const referenceEntries = candidateReferenceEntries(reference, "reference");
  const candidateEntries = candidateReferenceEntries(candidate, "candidate");
  const referenceById = entryIndex(referenceEntries, "reference");
  const candidateById = entryIndex(candidateEntries, "candidate");
  const {
    groups: explicitGroups,
    referenceReserved,
    candidateReserved,
  } = validateEquivalenceGroups(equivalenceGroups, referenceById, candidateById);
  const autoGroups = buildAutoGroups(
    referenceEntries,
    candidateEntries,
    referenceReserved,
    candidateReserved,
  );
  const groups = assignGroupTokens(
    [...autoGroups, ...explicitGroups],
    referenceById,
    candidateById,
  );
  const { referenceToGroup, candidateToGroup } = makeEntryGroupMaps(groups);

  const entryMatches = buildEntryMatches(groups);
  const unmatchedEntries = [
    ...buildUnmatchedEntries(referenceEntries, referenceToGroup, "reference"),
    ...buildUnmatchedEntries(candidateEntries, candidateToGroup, "candidate"),
  ].sort((left, right) => (
    compareStrings(left.side, right.side)
      || compareStrings(
        [left.entryClass, left.kind, normalizeSemanticText(left.title), normalizeSemanticText(left.statement)].join("\u0000"),
        [right.entryClass, right.kind, normalizeSemanticText(right.title), normalizeSemanticText(right.statement)].join("\u0000"),
      )
      || compareStrings(left.entryId, right.entryId)
  ));
  const entryKindClass = compareEntryKinds(groups, referenceById, candidateById);
  const b0 = compareB0(
    groups,
    candidateState,
    referenceState,
    referenceToGroup,
    candidateToGroup,
  );
  const claimStates = compareClaimStates(
    groups,
    candidateState,
    referenceState,
    candidateById,
    referenceById,
  );
  const negationPairs = compareRelationSets(
    negationRelationSet(reference, "reference", referenceToGroup),
    negationRelationSet(candidate, "candidate", candidateToGroup),
  );
  const inferences = compareRelationSets(
    inferenceRelationSet(reference, "reference", referenceToGroup),
    inferenceRelationSet(candidate, "candidate", candidateToGroup),
  );

  const discrepancies = {
    unmatchedEntries,
    entryKindClass,
    b0,
    claimStates,
    negationPairs,
    inferences,
  };
  const equivalent = Object.values(discrepancies).every((items) => items.length === 0);
  return freezeResult({
    schema: EVALUATION_SCHEMA,
    equivalent,
    candidateState,
    referenceState,
    entryMatches,
    ...discrepancies,
    discrepancies,
  });
}

function candidateReferenceEntries(state, side) {
  if (!isObject(state) || !Array.isArray(state.entries)) {
    fail(
      BENCHMARK_SEMANTIC_EVALUATOR_ERROR_CODES.INPUT_INVALID,
      `${side} Math State must contain an entries array`,
      { side, field: "entries" },
    );
  }
  return state.entries;
}

function sourceFail(code, message, details = {}) {
  fail(code, message, details);
}

function nonemptySourceString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sourceObjectIndex(state, side) {
  if (!isObject(state)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.INPUT_INVALID,
      `${side} source state must be an object`,
      { side },
    );
  }
  if (!Array.isArray(state.entries) || !Array.isArray(state.inferences)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.INPUT_INVALID,
      `${side} source state must contain entries and inferences arrays`,
      { side },
    );
  }

  const byKind = { entry: new Map(), inference: new Map() };
  const allIds = new Set();
  for (const [objectKind, objects] of [["entry", state.entries], ["inference", state.inferences]]) {
    for (const object of objects) {
      if (!isObject(object) || !nonemptySourceString(object.id)) {
        sourceFail(
          BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.INPUT_INVALID,
          `${side} ${objectKind} inventory contains an object without a usable id`,
          { side, objectKind },
        );
      }
      if (allIds.has(object.id)) {
        sourceFail(
          BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.INPUT_INVALID,
          `${side} source inventory contains duplicate object id: ${object.id}`,
          { side, objectId: object.id },
        );
      }
      allIds.add(object.id);
      byKind[objectKind].set(object.id, object);
    }
  }
  return { byKind, objectCount: allIds.size };
}

function validateSourceAssessment(sourceAssessment, expectedSourceIdentity) {
  if (!isObject(sourceAssessment)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.ASSESSMENT_INVALID,
      "sourceAssessment must be an object",
      { field: "sourceAssessment" },
    );
  }
  if (!nonemptySourceString(expectedSourceIdentity)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.SOURCE_IDENTITY_INVALID,
      "expectedSourceIdentity must be a non-empty string",
      { field: "expectedSourceIdentity" },
    );
  }
  if (sourceAssessment.schema !== SOURCE_ASSESSMENT_SCHEMA || sourceAssessment.mode !== "automatic") {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.ASSESSMENT_INVALID,
      `sourceAssessment must use schema ${SOURCE_ASSESSMENT_SCHEMA} and mode automatic`,
      { schema: sourceAssessment.schema, mode: sourceAssessment.mode },
    );
  }
  if (!nonemptySourceString(sourceAssessment.sourceIdentity)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.SOURCE_IDENTITY_INVALID,
      "sourceAssessment.sourceIdentity must be a non-empty string",
      { field: "sourceAssessment.sourceIdentity" },
    );
  }
  if (sourceAssessment.sourceIdentity !== expectedSourceIdentity) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.SOURCE_IDENTITY_MISMATCH,
      "sourceAssessment.sourceIdentity does not match expectedSourceIdentity",
      {
        expectedSourceIdentity,
        actualSourceIdentity: sourceAssessment.sourceIdentity,
      },
    );
  }
  if (!Array.isArray(sourceAssessment.findings)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.ASSESSMENT_INVALID,
      "sourceAssessment.findings must be an array",
      { field: "sourceAssessment.findings" },
    );
  }
}

function sourceFindingObjectIds(finding, field, objectKind, inventory, findingIndex) {
  const ids = finding[field];
  if (!Array.isArray(ids)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
      `sourceAssessment.findings[${findingIndex}].${field} must be an array`,
      { findingIndex, field },
    );
  }
  const seen = new Set();
  for (const objectId of ids) {
    if (!nonemptySourceString(objectId)) {
      sourceFail(
        BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
        `sourceAssessment.findings[${findingIndex}].${field} contains an invalid object id`,
        { findingIndex, field, objectId },
      );
    }
    if (seen.has(objectId)) {
      sourceFail(
        BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
        `sourceAssessment.findings[${findingIndex}].${field} contains a duplicate object id: ${objectId}`,
        { findingIndex, field, objectId },
      );
    }
    seen.add(objectId);
    if (!inventory.byKind[objectKind].has(objectId)) {
      sourceFail(
        BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_UNKNOWN_OBJECT,
        `sourceAssessment.findings[${findingIndex}] links unknown ${field === "candidateObjectIds" ? "candidate" : "gold"} ${objectKind}: ${objectId}`,
        { findingIndex, field, objectKind, objectId },
      );
    }
  }
  return [...ids];
}

function normalizeSourceFinding(finding, findingIndex, candidateInventory, goldInventory) {
  if (!isObject(finding)
    || !nonemptySourceString(finding.id)
    || !["entry", "inference"].includes(finding.objectKind)
    || !["supported", "distorted", "fabricated"].includes(finding.verdict)) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
      `sourceAssessment.findings[${findingIndex}] has an invalid id, objectKind, or verdict`,
      { findingIndex },
    );
  }
  if (!Array.isArray(finding.sourceRefs) || finding.sourceRefs.length === 0
    || finding.sourceRefs.some((sourceRef) => !nonemptySourceString(sourceRef))) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
      `sourceAssessment.findings[${findingIndex}].sourceRefs must contain non-empty strings`,
      { findingIndex },
    );
  }
  const candidateObjectIds = sourceFindingObjectIds(
    finding,
    "candidateObjectIds",
    finding.objectKind,
    candidateInventory,
    findingIndex,
  );
  const goldObjectIds = sourceFindingObjectIds(
    finding,
    "goldObjectIds",
    finding.objectKind,
    goldInventory,
    findingIndex,
  );
  if ((finding.verdict === "distorted" || finding.verdict === "fabricated") && candidateObjectIds.length === 0) {
    sourceFail(
      BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
      `${finding.verdict} source findings must link at least one candidate object`,
      { findingIndex, verdict: finding.verdict },
    );
  }
  return {
    id: finding.id,
    objectKind: finding.objectKind,
    verdict: finding.verdict,
    candidateObjectIds,
    goldObjectIds,
    sourceRefs: [...finding.sourceRefs],
  };
}

function sourceFindingSort(left, right) {
  return compareStrings(left.id, right.id);
}

function freezeSourceAssessment(sourceAssessment, findings) {
  return {
    schema: sourceAssessment.schema,
    mode: sourceAssessment.mode,
    sourceIdentity: sourceAssessment.sourceIdentity,
    findings,
  };
}

export async function evaluateSourceFidelity(options = {}) {
  const {
    candidate,
    gold,
    sourceAssessment,
    expectedSourceIdentity,
  } = isObject(options) ? options : {};

  validateSourceAssessment(sourceAssessment, expectedSourceIdentity);
  const candidateInventory = sourceObjectIndex(candidate, "candidate");
  const goldInventory = sourceObjectIndex(gold, "gold");

  const findingIds = new Set();
  const coveredCandidateObjects = new Set();
  const findings = sourceAssessment.findings
    .map((finding, findingIndex) => normalizeSourceFinding(
      finding,
      findingIndex,
      candidateInventory,
      goldInventory,
    ))
    .sort(sourceFindingSort);

  for (const finding of findings) {
    if (findingIds.has(finding.id)) {
      sourceFail(
        BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_INVALID,
        `sourceAssessment findings reuse id: ${finding.id}`,
        { findingId: finding.id },
      );
    }
    findingIds.add(finding.id);
    for (const objectId of finding.candidateObjectIds) {
      const key = `${finding.objectKind}\u0000${objectId}`;
      if (coveredCandidateObjects.has(key)) {
        sourceFail(
          BENCHMARK_SOURCE_EVALUATOR_ERROR_CODES.FINDING_OVERLAP,
          `candidate object is covered by more than one source finding: ${objectId}`,
          { objectKind: finding.objectKind, objectId },
        );
      }
      coveredCandidateObjects.add(key);
    }
  }

  const omissions = findings.filter((finding) => finding.verdict === "supported" && finding.candidateObjectIds.length === 0);
  const goldGaps = findings.filter((finding) => finding.verdict === "supported" && finding.goldObjectIds.length === 0);
  const distortions = findings.filter((finding) => finding.verdict === "distorted");
  const fabrications = findings.filter((finding) => finding.verdict === "fabricated");
  const goldDefects = findings.filter((finding) => (
    (finding.verdict === "distorted" || finding.verdict === "fabricated")
      && finding.goldObjectIds.length > 0
  ));
  const unresolvedCandidateObjectDetails = [
    ...[...candidateInventory.byKind.entry.keys()].map((objectId) => ({ objectKind: "entry", objectId })),
    ...[...candidateInventory.byKind.inference.keys()].map((objectId) => ({ objectKind: "inference", objectId })),
  ].filter(({ objectKind, objectId }) => !coveredCandidateObjects.has(`${objectKind}\u0000${objectId}`))
    .sort((left, right) => compareStrings(left.objectKind, right.objectKind) || compareStrings(left.objectId, right.objectId));
  const unresolvedCandidateObjects = unresolvedCandidateObjectDetails.map(({ objectId }) => objectId);

  const supportedFindings = findings.filter((finding) => finding.verdict === "supported");
  const supportedRepresentedFindingCount = supportedFindings.filter((finding) => finding.candidateObjectIds.length > 0).length;
  const coverageRatio = supportedFindings.length === 0
    ? 0
    : supportedRepresentedFindingCount / supportedFindings.length;
  const sourceClean = distortions.length === 0 && fabrications.length === 0 && unresolvedCandidateObjects.length === 0;
  const coverage = {
    candidateObjectCount: candidateInventory.objectCount,
    goldObjectCount: goldInventory.objectCount,
    findingCount: findings.length,
    supportedFindingCount: supportedFindings.length,
    supportedRepresentedFindingCount,
    representedSupportedFindingCount: supportedRepresentedFindingCount,
  };
  return freezeResult({
    schema: SOURCE_EVALUATION_SCHEMA,
    sourceClean,
    eligibleForComparison: sourceClean,
    sourceAssessment: freezeSourceAssessment(sourceAssessment, findings),
    coverage,
    coverageRatio,
    omissions,
    goldGaps,
    distortions,
    fabrications,
    goldDefects,
    unresolvedCandidateObjects,
    unresolvedCandidateObjectDetails,
  });
}

export async function evaluateBenchmarkVNext(options = {}) {
  const {
    candidate,
    reference,
    equivalenceGroups = [],
    runtime,
    sourceAssessment,
    expectedSourceIdentity,
  } = isObject(options) ? options : {};
  const semantic = await evaluateSemanticState({
    candidate,
    reference,
    equivalenceGroups,
    runtime,
  });
  const source = await evaluateSourceFidelity({
    candidate,
    gold: reference,
    sourceAssessment,
    expectedSourceIdentity,
  });
  return Object.freeze({
    schema: COMBINED_EVALUATION_SCHEMA,
    equivalent: semantic.equivalent,
    eligibleForComparison: source.sourceClean,
    sourceClean: source.sourceClean,
    semantic,
    source,
    semanticEvaluation: semantic,
    sourceEvaluation: source,
  });
}
