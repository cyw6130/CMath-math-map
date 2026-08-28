/**
 * @cmath-provenance
 * @package entry-model-v1
 * @version v1
 * @canonicalSource packages/core/cmath-entry-model.mjs
 * @contentHash sha256:25bf02ae086e34a0fc638729ef945adc1bdb31192fc901de39e50e3244a9945d
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
export const ENTRY_SCHEMA = "cmath.entry/v0.2";
export const FACT_ENTRY_KINDS = Object.freeze(["definition", "algorithm"]);
export const CLAIM_ENTRY_KINDS = Object.freeze(["calculation", "lemma", "proposition", "theorem"]);
export const ENTRY_KINDS = Object.freeze([...FACT_ENTRY_KINDS, ...CLAIM_ENTRY_KINDS]);
export const ENTRY_MODEL_CONTRACT = Object.freeze({
  schema: ENTRY_SCHEMA,
  categories: Object.freeze({ Fact: FACT_ENTRY_KINDS, Claim: CLAIM_ENTRY_KINDS }),
});

const factKinds = new Set(FACT_ENTRY_KINDS);
const claimKinds = new Set(CLAIM_ENTRY_KINDS);
const entryKinds = new Set(ENTRY_KINDS);
const lifecycleStates = new Set(["active", "superseded", "withdrawn"]);
const fields = new Set([
  "schema", "kind", "entry_kind", "id", "display_label", "title", "meaning",
  "aliases", "lifecycle", "revisions", "current_revision", "provenance_refs", "source_candidate"
]);

function nonempty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a nonempty string`);
}

function ref(value, kind, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.kind !== kind) {
    throw new Error(`${label} must be a ${kind} ref`);
  }
  nonempty(value.id, `${label}.id`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function entryCategory(entryOrKind) {
  const entryKind = typeof entryOrKind === "string" ? entryOrKind : entryOrKind?.entry_kind;
  if (factKinds.has(entryKind)) return "Fact";
  if (claimKinds.has(entryKind)) return "Claim";
  throw new Error(`unsupported Entry kind: ${entryKind ?? "missing"}`);
}

export function validateEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Entry must be an object");
  for (const field of Object.keys(entry)) if (!fields.has(field)) throw new Error(`Entry contains unsupported field ${field}`);
  if (entry.schema !== ENTRY_SCHEMA || entry.kind !== "entry") throw new Error(`Entry must use ${ENTRY_SCHEMA} and kind=entry`);
  nonempty(entry.id, "Entry id");
  if (!entryKinds.has(entry.entry_kind)) throw new Error(`unsupported Entry kind: ${entry.entry_kind ?? "missing"}`);
  nonempty(entry.title, "Entry title");
  if (!entry.meaning || typeof entry.meaning !== "object" || Array.isArray(entry.meaning)) throw new Error("Entry meaning must be an object");
  nonempty(entry.meaning.text, "Entry meaning.text");
  if (!entry.meaning.identity_claim || typeof entry.meaning.identity_claim !== "object" || Array.isArray(entry.meaning.identity_claim)) {
    throw new Error("Entry meaning.identity_claim must be an object");
  }
  if (!Array.isArray(entry.meaning.context_refs)) throw new Error("Entry meaning.context_refs must be an array");
  if (!Array.isArray(entry.aliases) || !Array.isArray(entry.revisions) || !entry.revisions.length || !Array.isArray(entry.provenance_refs)) {
    throw new Error("Entry aliases, revisions, and provenance_refs must be arrays, with at least one revision");
  }
  if (!entry.lifecycle || !lifecycleStates.has(entry.lifecycle.state)) throw new Error("Entry lifecycle.state is invalid");
  const revisionIds = new Set();
  for (const revision of entry.revisions) {
    nonempty(revision?.id, "Entry revision id");
    if (revisionIds.has(revision.id)) throw new Error(`Entry contains duplicate revision ${revision.id}`);
    revisionIds.add(revision.id);
  }
  nonempty(entry.current_revision, "Entry current_revision");
  if (!revisionIds.has(entry.current_revision)) throw new Error("Entry current_revision must resolve inside revisions");
  if (entry.source_candidate !== undefined) ref(entry.source_candidate, "candidate_entry", "Entry source_candidate");
  return true;
}

export function createEntry({
  id,
  entryKind,
  displayLabel,
  title,
  meaning,
  aliases = [],
  lifecycle = { state: "active" },
  revisions,
  currentRevision,
  provenanceRefs = [],
  sourceCandidate,
}) {
  const entry = {
    schema: ENTRY_SCHEMA,
    kind: "entry",
    entry_kind: entryKind,
    ...(displayLabel === undefined ? {} : { display_label: displayLabel }),
    id,
    title,
    meaning: structuredClone(meaning),
    aliases: structuredClone(aliases),
    lifecycle: structuredClone(lifecycle),
    revisions: structuredClone(revisions),
    current_revision: currentRevision,
    provenance_refs: structuredClone(provenanceRefs),
    ...(sourceCandidate === undefined ? {} : { source_candidate: structuredClone(sourceCandidate) }),
  };
  validateEntry(entry);
  return deepFreeze(entry);
}
