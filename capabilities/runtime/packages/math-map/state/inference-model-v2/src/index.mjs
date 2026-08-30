/**
 * @cmath-provenance
 * @package inference-model-v2
 * @version v2
 * @canonicalSource packages/math-map/state/inference-model-v2/src/index.mjs
 * @contentHash sha256:cbb6a90b20cd5c29e5249c300fed1dc9a75f5b874f707aabf606595b16fa62cb
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import semantics from "../../math-graph-semantics-v3/src/index.js";

export const INFERENCE_SCHEMA = "cmath.inference/v2";
export const INFERENCE_KINDS = semantics.INFERENCE_KINDS;
export const INFERENCE_MODEL_CONTRACT = Object.freeze({
  schema: INFERENCE_SCHEMA,
  stateContract: semantics.STATE_CONTRACT,
  kinds: INFERENCE_KINDS,
});

const inferenceKinds = new Set(INFERENCE_KINDS);
const lifecycleStates = new Set(["active", "superseded", "withdrawn"]);
const fields = new Set([
  "schema", "kind", "inference_kind", "id", "display_label", "premises", "conclusion",
  "applicability", "argument", "acceptance_ref", "accepted_by", "accepted_at",
  "provenance_refs", "revisions", "current_revision", "lifecycle", "source_candidate",
]);

function exactString(value, label) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty string without surrounding whitespace`);
  }
}

function entryRef(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.kind !== "entry") {
    throw new Error(`${label} must be an entry ref`);
  }
  exactString(value.id, `${label}.id`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function validateInferenceRecord(inference) {
  if (!inference || typeof inference !== "object" || Array.isArray(inference)) throw new Error("Inference must be an object");
  for (const field of Object.keys(inference)) if (!fields.has(field)) throw new Error(`Inference contains unsupported field ${field}`);
  if (inference.schema !== INFERENCE_SCHEMA || inference.kind !== "inference") throw new Error(`Inference must use ${INFERENCE_SCHEMA} and kind=inference`);
  exactString(inference.id, "Inference id");
  if (!inferenceKinds.has(inference.inference_kind)) throw new Error(`unsupported mathematical Inference kind: ${inference.inference_kind ?? "missing"}`);
  if (inference.display_label !== undefined) exactString(inference.display_label, "Inference display_label");
  if (!Array.isArray(inference.premises) || !inference.premises.length) throw new Error("Inference premises must be a nonempty array");
  const premiseIds = new Set();
  for (const premise of inference.premises) {
    entryRef(premise, "Inference premise");
    if (premiseIds.has(premise.id)) throw new Error(`Inference contains duplicate premise ${premise.id}`);
    premiseIds.add(premise.id);
  }
  entryRef(inference.conclusion, "Inference conclusion");
  exactString(inference.argument, "Inference argument");
  if (!inference.lifecycle || !lifecycleStates.has(inference.lifecycle.state)) throw new Error("Inference lifecycle.state is invalid");
  if (inference.acceptance_ref?.decision !== "accepted") throw new Error("formal Inference requires an accepted AcceptanceRef");
  if (inference.acceptance_ref?.subject?.kind !== "inference" || inference.acceptance_ref.subject.id !== inference.id) {
    throw new Error("Inference AcceptanceRef subject must identify the Inference");
  }
  if (!inference.accepted_by || typeof inference.accepted_by !== "object" || Array.isArray(inference.accepted_by)) throw new Error("Inference accepted_by is required");
  if (!Number.isFinite(Date.parse(inference.accepted_at))) throw new Error("Inference accepted_at must be an ISO timestamp");
  if (!Array.isArray(inference.provenance_refs) || !Array.isArray(inference.revisions) || !inference.revisions.length) {
    throw new Error("Inference provenance_refs and nonempty revisions must be arrays");
  }
  const revisionIds = new Set();
  for (const revision of inference.revisions) {
    exactString(revision?.id, "Inference revision id");
    if (revisionIds.has(revision.id)) throw new Error(`Inference contains duplicate revision ${revision.id}`);
    revisionIds.add(revision.id);
  }
  exactString(inference.current_revision, "Inference current_revision");
  if (!revisionIds.has(inference.current_revision)) throw new Error("Inference current_revision must resolve inside revisions");
  if (inference.source_candidate !== undefined) {
    if (inference.source_candidate?.kind !== "candidate_inference") throw new Error("Inference source_candidate must be a candidate_inference ref");
    exactString(inference.source_candidate.id, "Inference source_candidate.id");
  }
  return true;
}

export function createInference({
  id,
  inferenceKind,
  displayLabel,
  premises,
  conclusion,
  applicability,
  argument,
  acceptanceRef,
  acceptedBy,
  acceptedAt,
  provenanceRefs = [],
  revisions,
  currentRevision,
  lifecycle = { state: "active" },
  sourceCandidate,
}) {
  const inference = {
    schema: INFERENCE_SCHEMA,
    kind: "inference",
    inference_kind: inferenceKind,
    id,
    ...(displayLabel === undefined ? {} : { display_label: displayLabel }),
    premises: structuredClone(premises),
    conclusion: structuredClone(conclusion),
    ...(applicability === undefined ? {} : { applicability: structuredClone(applicability) }),
    argument,
    acceptance_ref: structuredClone(acceptanceRef),
    accepted_by: structuredClone(acceptedBy),
    accepted_at: acceptedAt,
    provenance_refs: structuredClone(provenanceRefs),
    revisions: structuredClone(revisions),
    current_revision: currentRevision,
    lifecycle: structuredClone(lifecycle),
    ...(sourceCandidate === undefined ? {} : { source_candidate: structuredClone(sourceCandidate) }),
  };
  validateInferenceRecord(inference);
  return deepFreeze(inference);
}
