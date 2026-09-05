/**
 * @cmath-provenance
 * @package lead-guided-extraction-v1
 * @version v1
 * @canonicalSource packages/research-process/import/lead-guided-extraction-v1/browser-assets/lead-guided-extraction.js
 * @contentHash sha256:5ae33e211dca861881adc741c2026705127ac1c6d4dc5bb23706a1063c9390c4
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
(function publishLeadGuidedExtraction(root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathLeadGuidedExtractionV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createLeadGuidedExtraction() {
  "use strict";
  var GUIDE_LEAD_SCHEMA = "cmath.guide-lead/v0.1";
  var REQUEST_SCHEMA = "cmath.lead-guided-extraction-request/v0.1";
  var PROPOSAL_SCHEMA = "cmath.lead-guided-extraction-proposal/v0.1";
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function copy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function object(value, label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be an object"); return value; }
  function string(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(label + " must be a non-empty string"); return value; }
  function list(value, label, allowEmpty) { if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) throw new Error(label + " must be an array"); return value; }
  function refs(value, label) {
    if (typeof value === "string") return string(value, label);
    if (Array.isArray(value)) { if (value.length === 0 || value.some(function (item) { return typeof item === "string" ? !item.trim() : !item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).length === 0; })) throw new Error(label + " must contain non-empty strings or objects"); return value; }
    object(value, label); if (Object.keys(value).length === 0) throw new Error(label + " must not be empty"); return value;
  }
  function sourceIdentity(sourcePackage) {
    object(sourcePackage, "sourcePackage");
    if (own(sourcePackage, "source_refs")) return refs(sourcePackage.source_refs, "sourcePackage.source_refs");
    for (var i = 0; i < ["source_identity", "sourceIdentity", "source", "source_id", "sourceId", "identity"].length; i += 1) {
      var key = ["source_identity", "sourceIdentity", "source", "source_id", "sourceId", "identity"][i];
      if (own(sourcePackage, key) && sourcePackage[key] !== undefined && sourcePackage[key] !== null) return typeof sourcePackage[key] === "string" ? string(sourcePackage[key], "sourcePackage." + key) : object(sourcePackage[key], "sourcePackage." + key);
    }
    throw new Error("sourcePackage must contain source_refs or a source identity");
  }
  function leadList(guide) { if (Array.isArray(guide)) return guide; object(guide, "guide"); if (Array.isArray(guide.leads)) return guide.leads; if (Array.isArray(guide.lead_set)) return guide.lead_set; if (Array.isArray(guide.leadSet)) return guide.leadSet; throw new Error("guide must contain a lead set"); }
  function validateLead(lead, label) {
    object(lead, label); string(lead.id, label + ".id");
    ["expansion_needs", "expansionNeeds", "related_lead_ids", "relatedLeadIds"].forEach(function (key) { if (own(lead, key)) list(lead[key], label + "." + key, true); });
    ["source_refs", "sourceRefs"].forEach(function (key) { if (own(lead, key)) refs(lead[key], label + "." + key); });
  }
  function selectLeads(guide, leadIds) {
    var byId = {};
    leadList(guide).forEach(function (lead, index) { validateLead(lead, "guide lead " + index); if (own(byId, lead.id)) throw new Error("duplicate guide lead: " + lead.id); byId[lead.id] = lead; });
    var ids = typeof leadIds === "string" ? [leadIds] : list(leadIds, "leadIds"); var seen = {};
    return ids.map(function (id) { string(id, "leadIds item"); if (seen[id]) throw new Error("duplicate selected lead: " + id); seen[id] = true; if (!own(byId, id)) throw new Error("unknown guide lead: " + id); return byId[id]; });
  }
  function validateRequest(request) {
    object(request, "request"); if (request.schema !== REQUEST_SCHEMA || request.kind !== "lead_guided_extraction_request") throw new Error("lead-guided extraction request schema mismatch");
    var selected = selectLeads(request.guide, request.lead_ids); if (!Array.isArray(request.leads) || request.leads.length !== selected.length) throw new Error("request.leads must match lead_ids");
    request.leads.forEach(function (lead, index) { validateLead(lead, "request lead " + index); if (lead.id !== selected[index].id) throw new Error("request lead order mismatch"); });
    if (request.target === undefined || request.target === null) throw new Error("target is required"); sourceIdentity(request.source_package); if (request.output_contract === undefined || request.output_contract === null) throw new Error("outputContract is required"); return true;
  }
  function buildLeadGuidedExtractionRequest(input) {
    input = input || {}; var leads = selectLeads(input.guide, input.leadIds); sourceIdentity(input.sourcePackage); if (input.target === undefined || input.target === null) throw new Error("target is required");
    var request = { schema: REQUEST_SCHEMA, kind: "lead_guided_extraction_request", guide: copy(input.guide), lead_ids: leads.map(function (lead) { return lead.id; }), leads: copy(leads), target: copy(input.target), source_package: copy(input.sourcePackage), output_contract: copy(input.outputContract === undefined ? { schema: PROPOSAL_SCHEMA } : input.outputContract), constraints: { preserve_expansion_needs: true, related_leads_are_narrative_only: true, proposal_only: true } };
    if (own(input.sourcePackage, "source_refs")) request.source_refs = copy(input.sourcePackage.source_refs); return Object.freeze(request);
  }
  function validateRecord(record, index) {
    object(record, "proposal record " + index); string(record.id, "proposal record " + index + ".id"); if (!own(record, "payload")) throw new Error("proposal record " + record.id + ".payload is required"); if (!own(record, "source_refs")) throw new Error("proposal record " + record.id + ".source_refs is required"); refs(record.source_refs, "proposal record " + record.id + ".source_refs");
  }
  function validateLeadGuidedExtractionProposal(proposal) {
    object(proposal, "proposal"); if (proposal.schema !== PROPOSAL_SCHEMA || proposal.kind !== "lead_guided_extraction_proposal") throw new Error("lead-guided extraction proposal schema mismatch");
    ["accepted", "admission", "mutation", "store", "accepted_entries"].forEach(function (key) { if (own(proposal, key)) throw new Error("proposal cannot contain " + key); }); validateRequest(proposal.request); list(proposal.records, "proposal.records", true); var ids = {};
    proposal.records.forEach(function (record, index) { validateRecord(record, index); if (ids[record.id]) throw new Error("duplicate proposal record: " + record.id); ids[record.id] = true; }); return true;
  }
  return Object.freeze({ GUIDE_LEAD_SCHEMA: GUIDE_LEAD_SCHEMA, REQUEST_SCHEMA: REQUEST_SCHEMA, PROPOSAL_SCHEMA: PROPOSAL_SCHEMA, buildLeadGuidedExtractionRequest: buildLeadGuidedExtractionRequest, validateLeadGuidedExtractionProposal: validateLeadGuidedExtractionProposal });
});
