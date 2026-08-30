/**
 * @cmath-provenance
 * @package archive-math-state-adapter-v1
 * @version v1
 * @canonicalSource packages/math-map/synchronization/archive-math-state-adapter-v1/src/index.mjs
 * @contentHash sha256:6f62d7fd56764a3e2cc3d49e130d06a9c977b3608341ec96791ea83cb0974ebb
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import semantics from "../../../state/math-graph-semantics-v3/src/index.js";
import { entryCategory, validateEntry } from "../../../state/entry-model-v2/src/index.mjs";
import { validateInferenceRecord } from "../../../state/inference-model-v2/src/index.mjs";

const archiveFields = new Set(["entries", "inferences", "negationPairs", "b0ClaimEntryIds"]);

function fail(code, message, details = {}, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function validateArchive(archive) {
  if (!archive || typeof archive !== "object" || Array.isArray(archive)) {
    fail("INVALID_ARCHIVE", "Archive must be an object");
  }
  for (const field of Object.keys(archive)) {
    if (!archiveFields.has(field)) fail("INVALID_ARCHIVE", `Archive contains unsupported field: ${field}`, { field });
  }
  for (const field of archiveFields) {
    if (!Array.isArray(archive[field])) fail("INVALID_ARCHIVE", `Archive.${field} must be an array`, { field });
  }
  const ids = new Set();
  for (const entry of archive.entries) {
    try {
      validateEntry(entry);
    } catch (cause) {
      fail("INVALID_ARCHIVE_ENTRY", `Archive Entry is invalid: ${cause.message}`, { recordId: entry?.id }, cause);
    }
    if (ids.has(entry.id)) fail("DUPLICATE_ARCHIVE_ID", `Duplicate archive ID: ${entry.id}`, { recordId: entry.id });
    ids.add(entry.id);
  }
  for (const inference of archive.inferences) {
    try {
      validateInferenceRecord(inference);
    } catch (cause) {
      fail("INVALID_ARCHIVE_INFERENCE", `Archive Inference is invalid: ${cause.message}`, { recordId: inference?.id }, cause);
    }
    if (ids.has(inference.id)) fail("DUPLICATE_ARCHIVE_ID", `Duplicate archive ID: ${inference.id}`, { recordId: inference.id });
    ids.add(inference.id);
  }
}

function projectEntry(entry) {
  const category = entryCategory(entry);
  return category === "Fact"
    ? { id: entry.id, entryClass: "fact", factKind: entry.entry_kind, title: entry.title, statement: entry.meaning.text }
    : { id: entry.id, entryClass: "claim", claimKind: entry.entry_kind, title: entry.title, statement: entry.meaning.text };
}

function projectInference(inference) {
  return {
    id: inference.id,
    operationKind: inference.inference_kind,
    premises: inference.premises.map(({ id }) => id),
    conclusion: inference.conclusion.id,
    argument: inference.argument,
  };
}

export function projectArchiveToMathState(archive) {
  validateArchive(archive);
  const issues = [];
  const active = (record, recordType) => {
    if (record.lifecycle.state === "active") return true;
    issues.push({
      code: "INACTIVE_RECORD_EXCLUDED",
      recordType,
      recordId: record.id,
      lifecycle: record.lifecycle.state,
    });
    return false;
  };
  const mathState = {
    entries: archive.entries.filter((entry) => active(entry, "entry")).map(projectEntry),
    inferences: archive.inferences.filter((inference) => active(inference, "inference")).map(projectInference),
    negationPairs: structuredClone(archive.negationPairs),
    b0ClaimEntryIds: [...archive.b0ClaimEntryIds],
  };

  semantics.deriveMathState(mathState);
  return { mathState, issues };
}

export const ARCHIVE_MATH_STATE_ADAPTER_CONTRACT = Object.freeze({
  stateContract: semantics.STATE_CONTRACT,
  projectArchiveToMathState,
});
