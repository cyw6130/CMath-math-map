/**
 * @cmath-provenance
 * @package entry-model-v2
 * @version v2
 * @canonicalSource packages/math-map/state/entry-model-v2/src/index.mjs
 * @contentHash sha256:00f38bcfb3b31fb6770ec9592f157149c34cabb9490f185d420290dbdbd255a0
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import semantics from "../../math-graph-semantics-v3/src/index.js";

export const ENTRY_SCHEMA = "cmath.entry/v2";
export const FACT_ENTRY_KINDS = semantics.FACT_KINDS;
export const CLAIM_ENTRY_KINDS = semantics.CLAIM_KINDS;
export const ENTRY_KINDS = Object.freeze([...FACT_ENTRY_KINDS, ...CLAIM_ENTRY_KINDS]);
export const ENTRY_MODEL_CONTRACT = Object.freeze({
  schema: ENTRY_SCHEMA,
  stateContract: semantics.STATE_CONTRACT,
  categories: Object.freeze({ Fact: FACT_ENTRY_KINDS, Claim: CLAIM_ENTRY_KINDS }),
});

const factKinds = new Set(FACT_ENTRY_KINDS);
const claimKinds = new Set(CLAIM_ENTRY_KINDS);
const entryKinds = new Set(ENTRY_KINDS);
const lifecycleStates = new Set(["active", "superseded", "withdrawn"]);
const fields = new Set([
  "schema", "kind", "entry_kind", "id", "display_label", "title", "meaning",
  "aliases", "lifecycle", "revisions", "current_revision", "provenance_refs", "source_candidate",
]);

function exactString(value, label) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty string without surrounding whitespace`);
  }
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
  exactString(entry.id, "Entry id");
  if (!entryKinds.has(entry.entry_kind)) throw new Error(`unsupported Entry kind: ${entry.entry_kind ?? "missing"}`);
  exactString(entry.title, "Entry title");
  if (entry.display_label !== undefined) exactString(entry.display_label, "Entry display_label");
  if (!entry.meaning || typeof entry.meaning !== "object" || Array.isArray(entry.meaning)) throw new Error("Entry meaning must be an object");
  exactString(entry.meaning.text, "Entry meaning.text");
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
    exactString(revision?.id, "Entry revision id");
    if (revisionIds.has(revision.id)) throw new Error(`Entry contains duplicate revision ${revision.id}`);
    revisionIds.add(revision.id);
  }
  exactString(entry.current_revision, "Entry current_revision");
  if (!revisionIds.has(entry.current_revision)) throw new Error("Entry current_revision must resolve inside revisions");
  if (entry.source_candidate !== undefined) {
    if (entry.source_candidate?.kind !== "candidate_entry") throw new Error("Entry source_candidate must be a candidate_entry ref");
    exactString(entry.source_candidate.id, "Entry source_candidate.id");
  }
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
