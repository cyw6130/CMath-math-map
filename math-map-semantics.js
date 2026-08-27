/**
 * @cmath-provenance
 * @package math-graph-semantics-v2
 * @version v2
 * @canonicalSource packages/math-map/state/math-graph-semantics-v2/src/index.js
 * @contentHash sha256:1110d85785303473ab0803b1c1d5ed232bd7798904d7a25af57f181a799db023
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
/* Canonical implementation of cmath-gamma.math-map-semantics/v2. */
(function publish(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathMapSemantics = api;
})(typeof window !== "undefined" ? window : globalThis, function create() {
  "use strict";
  const CAPABILITY_ID = "cmath-gamma.math-map-semantics/v2";
  const SEMANTIC_MODEL_ID = "cmath.fact-claim-operation/v0.1";
  const ENTRY_CLASSES = Object.freeze(["fact", "claim"]);
  const FACT_KINDS = Object.freeze(["definition", "algorithm", "calculation"]);
  const CLAIM_KINDS = Object.freeze(["lemma", "proposition", "theorem"]);
  const CLAIM_STATES = Object.freeze(["open", "established"]);
  const OPERATION_KINDS = Object.freeze(["organization", "proof"]);
  const required = (v, l) => { if (typeof v !== "string" || !v.trim()) throw new TypeError(`${l} must be a non-empty string`); return v.trim(); };
  const entryClass = e => e?.entryClass ?? e?.semantic?.entryClass ?? e?.semanticModel?.entryClass ?? null;
  const operationKind = i => i?.operationKind ?? i?.inferenceKind ?? i?.semantic?.operationKind ?? i?.semanticModel?.operationKind ?? null;
  function validateEntry(e) { const id=required(e?.id,"Entry.id"), role=entryClass(e); if(!ENTRY_CLASSES.includes(role)) throw new Error(`Entry ${id} has unsupported entryClass: ${role}`); required(e.title,`Entry ${id}.title`); required(e.statement,`Entry ${id}.statement`); if(role==="fact") { if(!FACT_KINDS.includes(e.factKind)) throw new Error(`Entry ${id} has unsupported factKind: ${e.factKind}`); if(e.claimKind!==undefined) throw new Error(`Fact ${id} must not carry claimKind`); } else { if(!CLAIM_KINDS.includes(e.claimKind)) throw new Error(`Entry ${id} has unsupported claimKind: ${e.claimKind}`); if(e.factKind!==undefined) throw new Error(`Claim ${id} must not carry factKind`); } return e; }
  function validateInference(i, byId) { const id=required(i?.id,"Inference.id"), kind=operationKind(i); if(!OPERATION_KINDS.includes(kind)) throw new Error(`Inference ${id} has unsupported operationKind: ${kind}`); required(i.title,`Inference ${id}.title`); if(!Array.isArray(i.premises)) throw new Error(`Inference ${id} must have premises array`); if(kind==="organization"&&!i.premises.length) throw new Error(`Inference ${id} must have non-empty premises`); if(kind==="proof"&&!i.premises.length){ if(typeof i.argument!=="string"||!i.argument.trim()) throw new Error(`Inference ${id} with empty premises must have non-empty argument`);} const resolve=x=>byId instanceof Map?byId.get(x):byId?.[x]; const ps=i.premises.map(x=>{const e=resolve(x); if(!e) throw new Error(`Inference ${id} has unknown premise: ${x}`); return e;}); const c=resolve(required(i.conclusion,`Inference ${id}.conclusion`)); if(!c) throw new Error(`Inference ${id} has unknown conclusion: ${i.conclusion}`); if(kind==="organization"&&(entryClass(c)!=="fact"||ps.some(e=>entryClass(e)!=="fact"))) throw new Error(`organization ${id} must connect Facts to a Fact`); if(kind==="proof"&&entryClass(c)!=="claim") throw new Error(`proof ${id} must conclude a Claim`); return i; }
  function computeClaimClosure(entries=[], inferences=[], options={}) { const byId=new Map(entries.map(e=>[validateEntry(e).id,e])); inferences.forEach(i=>validateInference(i,byId)); const facts=new Set(entries.filter(e=>entryClass(e)==="fact").map(e=>e.id)); const b0=[...new Set(options.b0ClaimEntryIds??options.claimSeedEntryIds??[])]; const established=new Set(b0); b0.forEach(id=>{if(entryClass(byId.get(id))!=="claim") throw new Error(`B₀ must reference a Claim: ${id}`);}); let changed=true; while(changed){changed=false; inferences.filter(i=>operationKind(i)==="proof").forEach(p=>{if(!established.has(p.conclusion)&&p.premises.every(id=>facts.has(id)||established.has(id))){established.add(p.conclusion);changed=true;}});} const claimStates=Object.fromEntries(entries.filter(e=>entryClass(e)==="claim").map(e=>[e.id,established.has(e.id)?"established":"open"])); return Object.freeze({availableFactIds:Object.freeze([...facts]),b0ClaimEntryIds:Object.freeze(b0),c0EntryIds:Object.freeze([...facts,...b0]),establishedClaimIds:Object.freeze([...established]),claimStates:Object.freeze(claimStates)}); }
  return Object.freeze({CAPABILITY_ID,SEMANTIC_MODEL_ID,ENTRY_CLASSES,FACT_KINDS,CLAIM_KINDS,CLAIM_STATES,OPERATION_KINDS,entryClass,operationKind,validateEntry,validateInference,computeClaimClosure});
});
