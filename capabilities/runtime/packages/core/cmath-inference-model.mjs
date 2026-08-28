/**
 * @cmath-provenance
 * @package inference-model-v1
 * @version v1
 * @canonicalSource packages/core/cmath-inference-model.mjs
 * @contentHash sha256:9fd87bd414ef894101ee7270a3b27e6775011f7773d52df2824be07ca6bf3b09
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import { entryCategory } from "./cmath-entry-model.mjs";

export const INFERENCE_SCHEMA = "cmath.inference/v0.2";
export const INFERENCE_KINDS = Object.freeze(["organization", "calculation", "proof"]);
export const INFERENCE_MODEL_CONTRACT = Object.freeze({
  schema: INFERENCE_SCHEMA,
  kinds: INFERENCE_KINDS,
  directions: Object.freeze({ organization: "Fact -> Fact", calculation: "Fact/Claim -> calculation Claim", proof: "Fact/Claim -> lemma/proposition/theorem Claim" }),
});

const inferenceKinds = new Set(INFERENCE_KINDS);
const lifecycleStates = new Set(["active", "superseded", "withdrawn"]);
const fields = new Set([
  "schema", "kind", "inference_kind", "id", "display_label", "premises", "conclusion",
  "applicability", "argument", "acceptance_ref", "accepted_by", "accepted_at",
  "provenance_refs", "revisions", "current_revision", "lifecycle", "source_candidate"
]);

function nonempty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a nonempty string`);
}

function entryRef(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.kind !== "entry") throw new Error(`${label} must be an entry ref`);
  nonempty(value.id, `${label}.id`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function entryRegistry(entries) {
  if (entries instanceof Map) return entries;
  return new Map((entries ?? []).map((entry) => [entry.id, entry]));
}

export function validateInferenceSemantics(inference, entries) {
  const registry = entryRegistry(entries);
  const resolve = (reference) => {
    const entry = registry.get(reference.id);
    if (!entry) throw new Error(`Inference semantic validation cannot resolve Entry ${reference.id}`);
    return entry;
  };
  const premiseCategories = inference.premises.map((reference) => entryCategory(resolve(reference)));
  const conclusion = resolve(inference.conclusion);
  const conclusionCategory = entryCategory(conclusion);
  if (inference.inference_kind === "organization" && (premiseCategories.some((category) => category !== "Fact") || conclusionCategory !== "Fact")) {
    throw new Error("organization Inference must have direction Fact -> Fact");
  }
  if (inference.inference_kind === "calculation" && (conclusionCategory !== "Claim" || conclusion.entry_kind !== "calculation")) {
    throw new Error("calculation Inference must conclude a calculation Claim");
  }
  if (inference.inference_kind === "proof" && (conclusionCategory !== "Claim" || conclusion.entry_kind === "calculation")) {
    throw new Error("proof Inference must conclude a lemma, proposition, or theorem Claim");
  }
  return true;
}

export function validateInferenceRecord(inference, { entries = null } = {}) {
  if (!inference || typeof inference !== "object" || Array.isArray(inference)) throw new Error("Inference must be an object");
  for (const field of Object.keys(inference)) if (!fields.has(field)) throw new Error(`Inference contains unsupported field ${field}`);
  if (inference.schema !== INFERENCE_SCHEMA || inference.kind !== "inference") throw new Error(`Inference must use ${INFERENCE_SCHEMA} and kind=inference`);
  nonempty(inference.id, "Inference id");
  if (!inferenceKinds.has(inference.inference_kind)) throw new Error(`unsupported mathematical Inference kind: ${inference.inference_kind ?? "missing"}`);
  if (!Array.isArray(inference.premises) || !inference.premises.length) throw new Error("Inference premises must be a nonempty array");
  const premiseIds = new Set();
  for (const premise of inference.premises) {
    entryRef(premise, "Inference premise");
    if (premiseIds.has(premise.id)) throw new Error(`Inference contains duplicate premise ${premise.id}`);
    premiseIds.add(premise.id);
  }
  entryRef(inference.conclusion, "Inference conclusion");
  if (!inference.lifecycle || !lifecycleStates.has(inference.lifecycle.state)) throw new Error("Inference lifecycle.state is invalid");
  if (inference.acceptance_ref?.decision !== "accepted") throw new Error("formal Inference requires an accepted AcceptanceRef");
  if (inference.acceptance_ref?.subject?.kind !== "inference" || inference.acceptance_ref.subject.id !== inference.id) {
    throw new Error("Inference AcceptanceRef subject must identify the Inference");
  }
  if (!inference.accepted_by || typeof inference.accepted_by !== "object" || Array.isArray(inference.accepted_by)) throw new Error("Inference accepted_by is required");
  if (!Number.isFinite(Date.parse(inference.accepted_at))) throw new Error("Inference accepted_at must be an ISO timestamp");
  if (!inference.argument || typeof inference.argument !== "object" || Array.isArray(inference.argument) || !inference.argument.kind) {
    throw new Error("Inference argument must be a structured object");
  }
  if (!Array.isArray(inference.provenance_refs) || !Array.isArray(inference.revisions) || !inference.revisions.length) {
    throw new Error("Inference provenance_refs and nonempty revisions must be arrays");
  }
  nonempty(inference.current_revision, "Inference current_revision");
  if (!inference.revisions.some(({ id }) => id === inference.current_revision)) throw new Error("Inference current_revision must resolve inside revisions");
  if (inference.source_candidate !== undefined) {
    if (inference.source_candidate?.kind !== "candidate_inference") throw new Error("Inference source_candidate must be a candidate_inference ref");
    nonempty(inference.source_candidate.id, "Inference source_candidate.id");
  }
  if (entries !== null) validateInferenceSemantics(inference, entries);
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
  entries = null,
}) {
  const inference = {
    schema: INFERENCE_SCHEMA,
    kind: "inference",
    inference_kind: inferenceKind,
    id,
    ...(displayLabel === undefined ? {} : { display_label: displayLabel }),
    premises: structuredClone(premises),
    conclusion: structuredClone(conclusion),
    applicability: structuredClone(applicability),
    argument: structuredClone(argument),
    acceptance_ref: structuredClone(acceptanceRef),
    accepted_by: structuredClone(acceptedBy),
    accepted_at: acceptedAt,
    provenance_refs: structuredClone(provenanceRefs),
    revisions: structuredClone(revisions),
    current_revision: currentRevision,
    lifecycle: structuredClone(lifecycle),
    ...(sourceCandidate === undefined ? {} : { source_candidate: structuredClone(sourceCandidate) }),
  };
  validateInferenceRecord(inference, { entries });
  return deepFreeze(inference);
}
