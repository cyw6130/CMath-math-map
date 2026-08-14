/* Pure mathematical-map object semantics. No naming, rendering, Loop, route, or workspace policy. */
(function publishMathMapSemantics(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathMapSemantics = api;
})(typeof window !== "undefined" ? window : globalThis, function createMathMapSemantics() {
  "use strict";

  const CAPABILITY_ID = "cmath-gamma.math-map-semantics/v2";
  const SEMANTIC_MODEL_ID = "cmath.fact-claim-operation/v0.1";
  const ENTRY_CLASSES = Object.freeze(["fact", "claim"]);
  const FACT_KINDS = Object.freeze(["definition", "algorithm", "calculation"]);
  const CLAIM_KINDS = Object.freeze(["lemma", "proposition", "theorem", "conjecture"]);
  const CLAIM_STATES = Object.freeze(["open", "established"]);
  const OPERATION_KINDS = Object.freeze(["organization", "proof"]);
  const entryClasses = new Set(ENTRY_CLASSES);
  const factKinds = new Set(FACT_KINDS);
  const claimKinds = new Set(CLAIM_KINDS);
  const operationKinds = new Set(OPERATION_KINDS);

  function required(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
    return value.trim();
  }

  function entryClass(entry) {
    return entry?.entryClass ?? entry?.semantic?.entryClass ?? entry?.semanticModel?.entryClass ?? null;
  }

  function operationKind(inference) {
    return inference?.operationKind ?? inference?.inferenceKind ?? inference?.semantic?.operationKind
      ?? inference?.semanticModel?.operationKind ?? null;
  }

  function validateEntry(entry) {
    const id = required(entry?.id, "Entry.id");
    const role = entryClass(entry);
    if (!entryClasses.has(role)) throw new Error(`Entry ${id} has unsupported entryClass: ${role}`);
    required(entry.title, `Entry ${id}.title`);
    required(entry.statement, `Entry ${id}.statement`);
    if (role === "fact") {
      if (!factKinds.has(entry.factKind)) throw new Error(`Entry ${id} has unsupported factKind: ${entry.factKind}`);
      if (entry.claimKind !== undefined) throw new Error(`Fact ${id} must not carry claimKind`);
    } else {
      if (!claimKinds.has(entry.claimKind)) throw new Error(`Entry ${id} has unsupported claimKind: ${entry.claimKind}`);
      if (entry.factKind !== undefined) throw new Error(`Claim ${id} must not carry factKind`);
    }
    return entry;
  }

  function validateInference(inference, entriesById) {
    const id = required(inference?.id, "Inference.id");
    const kind = operationKind(inference);
    if (!operationKinds.has(kind)) throw new Error(`Inference ${id} has unsupported operationKind: ${kind}`);
    required(inference.title, `Inference ${id}.title`);
    const premises = inference.premises;
    if (!Array.isArray(premises) || premises.length === 0) throw new Error(`Inference ${id} must have non-empty premises`);
    const conclusion = required(inference.conclusion, `Inference ${id}.conclusion`);
    const resolve = (entryId) => entriesById instanceof Map ? entriesById.get(entryId) : entriesById?.[entryId];
    const premiseEntries = premises.map((entryId) => {
      const entry = resolve(entryId);
      if (!entry) throw new Error(`Inference ${id} has unknown premise: ${entryId}`);
      return entry;
    });
    const conclusionEntry = resolve(conclusion);
    if (!conclusionEntry) throw new Error(`Inference ${id} has unknown conclusion: ${conclusion}`);
    if (kind === "organization" && (entryClass(conclusionEntry) !== "fact" || premiseEntries.some((entry) => entryClass(entry) !== "fact"))) {
      throw new Error(`organization ${id} must connect Facts to a Fact`);
    }
    if (kind === "proof" && entryClass(conclusionEntry) !== "claim") throw new Error(`proof ${id} must conclude a Claim`);
    return inference;
  }

  function computeClaimClosure(entries, inferences, options = {}) {
    const entryList = Array.isArray(entries) ? entries : [];
    const inferenceList = Array.isArray(inferences) ? inferences : [];
    const byId = new Map(entryList.map((entry) => [validateEntry(entry).id, entry]));
    inferenceList.forEach((inference) => validateInference(inference, byId));
    const availableFacts = new Set(entryList.filter((entry) => entryClass(entry) === "fact").map((entry) => entry.id));
    const b0ClaimEntryIds = [...new Set(options.b0ClaimEntryIds ?? options.claimSeedEntryIds ?? [])];
    const establishedClaims = new Set(b0ClaimEntryIds);
    establishedClaims.forEach((id) => {
      if (entryClass(byId.get(id)) !== "claim") throw new Error(`B₀ must reference a Claim: ${id}`);
    });
    let changed = true;
    while (changed) {
      changed = false;
      inferenceList.filter((item) => operationKind(item) === "proof").forEach((proof) => {
        if (establishedClaims.has(proof.conclusion)) return;
        if (proof.premises.every((id) => availableFacts.has(id) || establishedClaims.has(id))) {
          establishedClaims.add(proof.conclusion);
          changed = true;
        }
      });
    }
    const claimStates = Object.freeze(Object.fromEntries(entryList
      .filter((entry) => entryClass(entry) === "claim")
      .map((entry) => [entry.id, establishedClaims.has(entry.id) ? "established" : "open"])));
    const c0EntryIds = Object.freeze([...availableFacts, ...b0ClaimEntryIds]);
    return Object.freeze({
      availableFactIds: Object.freeze([...availableFacts]),
      b0ClaimEntryIds: Object.freeze(b0ClaimEntryIds),
      c0EntryIds,
      establishedClaimIds: Object.freeze([...establishedClaims]),
      claimStates,
    });
  }

  return Object.freeze({
    CAPABILITY_ID, SEMANTIC_MODEL_ID, ENTRY_CLASSES, FACT_KINDS, CLAIM_KINDS, CLAIM_STATES, OPERATION_KINDS,
    entryClass, operationKind, validateEntry, validateInference, computeClaimClosure,
  });
});
