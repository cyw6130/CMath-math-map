/**
 * @cmath-provenance
 * @package mathematical-content-admission-v1
 * @version v1
 * @canonicalSource packages/math-map/admission/mathematical-content-admission-v1/src/index.js
 * @contentHash sha256:5b85acb0e9aa19225cb695bdb8eba65a2d7fd356e93643818d4fcd72950cfe93
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
/* Canonical admission gate for reviewed mathematical content. */
(function publishMathContentAdmission(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathContentAdmission = api;
})(typeof window !== "undefined" ? window : globalThis, function createMathContentAdmission() {
  "use strict";

  const CAPABILITY_ID = "cmath-gamma.mathematical-content-admission/v1";
  const LEGACY_CAPABILITY_ID = "cmath-gamma.mathematical-entry-inference-authoring/v1";
  const REVIEW_SCHEMA = "cmath-gamma.mathematical-content-review/v1";
  const STRICT_PROFILE = "mature-mathematics-lightweight-v1";
  const LEGACY_PROFILE = "legacy-unreviewed-v0";
  const REVIEW_SCOPE = "mathematical-role-standard-statement-and-explicit-dependency-review";
  const ENTRY_CLASSES = new Set(["fact", "claim"]);
  const FACT_KINDS = new Set(["definition", "algorithm", "calculation"]);
  const CLAIM_KINDS = new Set(["lemma", "proposition", "theorem"]);
  const OPERATION_KINDS = new Set(["organization", "proof"]);

  function nonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
    return value.trim();
  }

  function uniqueIdMap(items, label) {
    if (!Array.isArray(items)) throw new TypeError(`${label} must be an array`);
    const result = new Map();
    items.forEach((item, index) => {
      if (!item || typeof item !== "object") throw new TypeError(`${label}[${index}] must be an object`);
      const id = nonEmptyString(item.id, `${label}[${index}].id`);
      if (result.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
      result.set(id, item);
    });
    return result;
  }

  function fnv1a32(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function contentFingerprint(data) {
    return fnv1a32(JSON.stringify({
      projectId: data?.project?.id ?? null,
      semanticModel: data?.semanticModel ?? null,
      entries: data?.entries ?? null,
      inferences: data?.inferences ?? null,
    }));
  }

  function entryRole(entry, label = `Entry ${entry?.id ?? "<unknown>"}`) {
    if (!ENTRY_CLASSES.has(entry.entryClass)) throw new Error(`${label} has unsupported entryClass: ${entry.entryClass}`);
    nonEmptyString(entry.title, `${label}.title`);
    nonEmptyString(entry.statement, `${label}.statement`);
    if (entry.entryClass === "fact") {
      if (!FACT_KINDS.has(entry.factKind)) throw new Error(`${label} has unsupported factKind: ${entry.factKind}`);
      if (entry.claimKind !== undefined) throw new Error(`${label} Fact must not carry claimKind`);
      return `fact:${entry.factKind}`;
    }
    if (!CLAIM_KINDS.has(entry.claimKind)) throw new Error(`${label} has unsupported claimKind: ${entry.claimKind}`);
    if (entry.factKind !== undefined) throw new Error(`${label} Claim must not carry factKind`);
    return `claim:${entry.claimKind}`;
  }

  function validateObjectGraph(data) {
    const entries = uniqueIdMap(data?.entries, "entries");
    const inferences = uniqueIdMap(data?.inferences, "inferences");
    entries.forEach((entry) => entryRole(entry));

    const proofConclusions = new Set();
    inferences.forEach((inference, id) => {
      if (!OPERATION_KINDS.has(inference.operationKind)) {
        throw new Error(`Inference ${id} has unsupported operationKind: ${inference.operationKind}`);
      }
      nonEmptyString(inference.title, `Inference ${id}.title`);
      nonEmptyString(inference.statement, `Inference ${id}.statement`);
      nonEmptyString(inference.argument, `Inference ${id}.argument`);
      if (!Array.isArray(inference.premises) || inference.premises.length === 0) {
        throw new Error(`Inference ${id} must have finite non-empty premises`);
      }
      const premiseEntries = inference.premises.map((premiseId) => {
        if (!entries.has(premiseId)) throw new Error(`Inference ${id} has unknown premise: ${premiseId}`);
        return entries.get(premiseId);
      });
      if (!entries.has(inference.conclusion)) throw new Error(`Inference ${id} has unknown conclusion: ${inference.conclusion}`);
      const conclusion = entries.get(inference.conclusion);
      if (inference.operationKind === "organization") {
        if (conclusion.entryClass !== "fact" || premiseEntries.some((entry) => entry.entryClass !== "fact")) {
          throw new Error(`organization ${id} must connect Facts to a Fact`);
        }
      } else {
        if (conclusion.entryClass !== "claim") throw new Error(`proof ${id} must conclude a Claim`);
        proofConclusions.add(conclusion.id);
      }
    });

    const mathematicalState = data?.derivedResearchState?.mathematicalState ?? {};
    const derivedB0Ids = mathematicalState.b0ClaimEntryIds ?? mathematicalState.claimSeedEntryIds;
    const topLevelB0Ids = data?.b0ClaimEntryIds ?? data?.claimSeedEntryIds;
    if (derivedB0Ids !== undefined && topLevelB0Ids !== undefined) {
      if (!Array.isArray(derivedB0Ids) || !Array.isArray(topLevelB0Ids)
        || JSON.stringify(derivedB0Ids) !== JSON.stringify(topLevelB0Ids)) {
        throw new Error("derived and top-level b0ClaimEntryIds must be identical");
      }
    }
    const b0ClaimEntryIds = derivedB0Ids ?? topLevelB0Ids ?? [];
    if (!Array.isArray(b0ClaimEntryIds)) throw new TypeError("b0ClaimEntryIds must be an array");
    const b0ClaimSet = new Set(b0ClaimEntryIds);
    if (b0ClaimSet.size !== b0ClaimEntryIds.length) throw new Error("b0ClaimEntryIds must not contain duplicates");
    b0ClaimSet.forEach((id) => {
      const entry = entries.get(id);
      if (!entry || entry.entryClass !== "claim") throw new Error(`B₀ must reference a Claim: ${id}`);
      nonEmptyString(entry.sourceReference, `B₀ Claim ${id}.sourceReference`);
    });
    entries.forEach((entry, id) => {
      if (entry.entryClass === "claim" && !b0ClaimSet.has(id) && !proofConclusions.has(id)) {
        throw new Error(`Claim outside B₀ must be the conclusion of a proof: ${id}`);
      }
    });
    return Object.freeze({
      entries,
      inferences,
      b0ClaimEntryIds: Object.freeze([...b0ClaimEntryIds]),
      seedIds: Object.freeze([...b0ClaimEntryIds]),
    });
  }

  function exactReviewMap(items, expected, label, expectedRole) {
    const reviews = uniqueIdMap(items, label);
    expected.forEach((item, id) => {
      const review = reviews.get(id);
      if (!review) throw new Error(`${label} is missing ${id}`);
      if (review.verdict !== "accepted") throw new Error(`${label} ${id} must be accepted`);
      const role = nonEmptyString(review.acceptedAs, `${label} ${id}.acceptedAs`);
      if (role !== expectedRole(item)) throw new Error(`${label} ${id} role mismatch: expected ${expectedRole(item)}, received ${role}`);
    });
    reviews.forEach((_review, id) => {
      if (!expected.has(id)) throw new Error(`${label} contains unknown object: ${id}`);
    });
  }

  function validateReview(data, definition, review) {
    const graph = validateObjectGraph(data);
    if (!review || typeof review !== "object" || review.schema !== REVIEW_SCHEMA) {
      throw new TypeError(`expected ${REVIEW_SCHEMA}`);
    }
    if (![CAPABILITY_ID, LEGACY_CAPABILITY_ID].includes(review.capability)) {
      throw new Error(`review must use capability ${CAPABILITY_ID}`);
    }
    if (review.profile !== STRICT_PROFILE) throw new Error(`review must use profile ${STRICT_PROFILE}`);
    if (review.verdict !== "accepted") throw new Error("mathematical content review must be accepted");
    nonEmptyString(review.reviewer, "review.reviewer");
    if (review.reviewScope !== REVIEW_SCOPE) throw new Error(`review must use scope ${REVIEW_SCOPE}`);
    if (review.mapId !== definition.id) throw new Error("review mapId does not match manifest definition");
    if (review.projectId !== data.project.id || review.projectId !== definition.projectId) {
      throw new Error("review projectId does not match Project View identity");
    }
    const fingerprint = contentFingerprint(data);
    if (review.contentFingerprint !== fingerprint) {
      throw new Error(`mathematical content review is stale: expected ${fingerprint}, received ${review.contentFingerprint ?? "none"}`);
    }
    if (!Array.isArray(review.openIssues) || review.openIssues.length !== 0) {
      throw new Error("accepted mathematical content review must have no openIssues");
    }
    exactReviewMap(review.entryReviews, graph.entries, "entryReviews", entryRole);
    exactReviewMap(review.inferenceReviews, graph.inferences, "inferenceReviews", (item) => item.operationKind);
    return Object.freeze({
      fingerprint,
      profile: STRICT_PROFILE,
      verdict: "accepted",
      acceptedEntryIds: Object.freeze([...graph.entries.keys()]),
      acceptedInferenceIds: Object.freeze([...graph.inferences.keys()]),
      acceptedObjectIds: Object.freeze([...graph.entries.keys(), ...graph.inferences.keys()]),
    });
  }

  return Object.freeze({
    CAPABILITY_ID,
    LEGACY_CAPABILITY_ID,
    REVIEW_SCHEMA,
    STRICT_PROFILE,
    LEGACY_PROFILE,
    REVIEW_SCOPE,
    contentFingerprint,
    entryRole,
    validateObjectGraph,
    validateReview,
  });
});

