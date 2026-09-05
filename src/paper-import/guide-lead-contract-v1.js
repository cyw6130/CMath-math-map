/**
 * @cmath-provenance
 * @package guide-lead-contract-v1
 * @version v1
 * @canonicalSource packages/research-process/import/guide-lead-contract-v1/browser-assets/guide-lead-contract.js
 * @contentHash sha256:d300838fcbbc006f484f42eed7df4ef8a36d4d89e3552dcad1c9b336a5799e1d
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
(function publishGuideLeadContract(root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathGuideLeadContractV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createGuideLeadContract() {
  "use strict";
  var GUIDE_LEAD_SCHEMA = "cmath.guide-lead/v0.1";
  var GUIDE_LEAD_SET_SCHEMA = "cmath.guide-lead-set/v0.1";
  var GUIDE_LEAD_KIND = "guide_lead";
  var GUIDE_LEAD_SET_KIND = "guide_lead_set";
  var ROLES = { main_target: true, key_result: true, supporting_result: true };
  var FIELDS = { schema: true, kind: true, id: true, title: true, narrative_role: true, related_lead_ids: true, expansion_needs: true, source_refs: true, statement: true, hinted_type: true, hinted_status: true, terms_or_aliases: true, package_type: true, metadata: true };
  function obj(value, label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(label + " must be an object"); return value; }
  function text(value, label) { if (typeof value !== "string" || !value.trim()) throw new TypeError(label + " must be a non-empty string"); return value.trim(); }
  function strings(value, label) { if (!Array.isArray(value) || value.some(function (item) { return typeof item !== "string" || !item.trim(); })) throw new TypeError(label + " must be an array of non-empty strings"); return value.map(function (item) { return item.trim(); }); }
  function copy(value) { if (value === undefined) return undefined; return JSON.parse(JSON.stringify(value)); }
  function sourceRef(ref, label) {
    obj(ref, label); text(ref.kind, label + ".kind");
    if (!(typeof ref.locator === "string" && ref.locator.trim()) && !(ref.locator && typeof ref.locator === "object" && !Array.isArray(ref.locator))) throw new TypeError(label + ".locator must be a non-empty string or object");
    if (ref.metadata !== undefined) obj(ref.metadata, label + ".metadata");
    Object.keys(ref).forEach(function (key) { if (!["kind", "locator", "metadata"].includes(key)) throw new Error(label + " has unsupported field: " + key); });
  }
  function validateLeadShape(lead) {
    obj(lead, "lead");
    if (lead.schema !== GUIDE_LEAD_SCHEMA) throw new Error("lead schema must be " + GUIDE_LEAD_SCHEMA);
    if (lead.kind !== GUIDE_LEAD_KIND) throw new Error("lead kind must be " + GUIDE_LEAD_KIND);
    text(lead.id, "lead.id"); text(lead.title, "lead.title");
    if (!ROLES[lead.narrative_role]) throw new Error("invalid narrative role for " + lead.id + ": " + lead.narrative_role);
    strings(lead.related_lead_ids, "lead " + lead.id + ".related_lead_ids");
    if (lead.related_lead_ids.includes(lead.id)) throw new Error("lead cannot relate to itself: " + lead.id);
    strings(lead.expansion_needs, "lead " + lead.id + ".expansion_needs");
    if (!Array.isArray(lead.source_refs) || !lead.source_refs.length) throw new Error("lead " + lead.id + ".source_refs must be a non-empty array");
    lead.source_refs.forEach(function (ref, index) { sourceRef(ref, "lead " + lead.id + ".source_refs[" + index + "]"); });
    ["statement", "hinted_type", "hinted_status", "package_type"].forEach(function (key) { if (lead[key] !== undefined) text(lead[key], "lead " + lead.id + "." + key); });
    if (lead.terms_or_aliases !== undefined) strings(lead.terms_or_aliases, "lead " + lead.id + ".terms_or_aliases");
    if (lead.metadata !== undefined) obj(lead.metadata, "lead " + lead.id + ".metadata");
    Object.keys(lead).forEach(function (key) { if (!FIELDS[key]) throw new Error("lead " + lead.id + " has unsupported field: " + key); });
  }
  function validateLead(lead) { validateLeadShape(lead); return true; }
  function createLead(input) {
    var source = obj(input, "lead");
    var lead = { schema: GUIDE_LEAD_SCHEMA, kind: GUIDE_LEAD_KIND, id: source.id, title: source.title, narrative_role: source.narrative_role, related_lead_ids: copy(source.related_lead_ids || []), expansion_needs: copy(source.expansion_needs || []), source_refs: copy(source.source_refs || []) };
    ["statement", "hinted_type", "hinted_status", "terms_or_aliases", "package_type", "metadata"].forEach(function (key) { if (source[key] !== undefined) lead[key] = copy(source[key]); });
    validateLeadShape(lead); return Object.freeze(lead);
  }
  function validateLeadSet(value) {
    obj(value, "lead set");
    if (value.schema !== GUIDE_LEAD_SET_SCHEMA) throw new Error("lead set schema must be " + GUIDE_LEAD_SET_SCHEMA);
    if (value.kind !== GUIDE_LEAD_SET_KIND) throw new Error("lead set kind must be " + GUIDE_LEAD_SET_KIND);
    if (!Array.isArray(value.leads)) throw new Error("lead set.leads must be an array");
    var ids = {};
    value.leads.forEach(function (lead) { validateLeadShape(lead); if (ids[lead.id]) throw new Error("duplicate lead id: " + lead.id); ids[lead.id] = true; });
    value.leads.forEach(function (lead) { lead.related_lead_ids.forEach(function (related) { if (!ids[related]) throw new Error("unknown related lead: " + lead.id + " -> " + related); }); });
    if (value.metadata !== undefined) obj(value.metadata, "lead set.metadata");
    Object.keys(value).forEach(function (key) { if (!["schema", "kind", "leads", "metadata", "id", "title"].includes(key)) throw new Error("lead set has unsupported field: " + key); });
    if (value.id !== undefined) text(value.id, "lead set.id"); if (value.title !== undefined) text(value.title, "lead set.title"); return true;
  }
  function createLeadSet(input) {
    var source = obj(input, "lead set"); var set = { schema: GUIDE_LEAD_SET_SCHEMA, kind: GUIDE_LEAD_SET_KIND, leads: copy(source.leads || []) };
    ["id", "title", "metadata"].forEach(function (key) { if (source[key] !== undefined) set[key] = copy(source[key]); });
    validateLeadSet(set); return Object.freeze(set);
  }
  function anchor(kind, locator, metadata) { return { kind: kind, locator: text(String(locator), "source locator"), metadata: copy(metadata || {}) }; }
  function paperRefs(lead, guide) {
    if (!Array.isArray(lead.source_block_ids) || !lead.source_block_ids.length) throw new Error("paper guide lead " + lead.id + " has no source_block_ids");
    return lead.source_block_ids.map(function (id, index) { return anchor("pdf-block", id, { block_id: id, index: index, pages: Array.isArray(lead.pages) ? copy(lead.pages) : undefined, path: guide.source_path || guide.pdf_path, pdf_sha256: guide.source_pdf_sha256 }); });
  }
  function adaptPaperGuide(paperGuide) {
    var guide = obj(paperGuide, "paperGuide");
    if (guide.schema !== "cmath.paper-guide/v0.1" || guide.kind !== "paper_guide") throw new Error("paper guide schema mismatch");
    if (!Array.isArray(guide.leads)) throw new Error("paperGuide.leads must be an array");
    return createLeadSet({ id: guide.id, title: guide.paper && guide.paper.title || guide.title, leads: guide.leads.map(function (item) { return createLead({ id: item.id, title: item.title, statement: item.statement, narrative_role: item.narrative_role, related_lead_ids: item.related_lead_ids || [], expansion_needs: item.expansion_needs || [], source_refs: paperRefs(item, guide), metadata: { source_schema: guide.schema, source_kind: guide.kind, original: copy(item), source_guide: copy(guide) } }); }), metadata: { source_schema: guide.schema, source_kind: guide.kind, original: copy(guide) } });
  }
  function corpusRefs(lead) {
    var refs = [];
    (Array.isArray(lead.suggested_files) ? lead.suggested_files : []).forEach(function (path) { refs.push(anchor("corpus-anchor", path, { path: path })); });
    (Array.isArray(lead.guide_anchors) ? lead.guide_anchors : []).forEach(function (item) { refs.push(anchor("corpus-anchor", item, { anchor: item })); });
    if (!refs.length) refs.push(anchor("corpus-anchor", lead.id, { unresolved: true })); return refs;
  }
  function adaptCorpusGuide(corpusGuide, options) {
    var guide = obj(corpusGuide, "corpusGuide"); options = options || {};
    if (guide.schema !== "cmath.research-corpus-guide/v0.1" || guide.kind !== "research_corpus_guide") throw new Error("corpus guide schema mismatch");
    if (!Array.isArray(guide.leads)) throw new Error("corpusGuide.leads must be an array");
    var resolver = typeof options.roleResolver === "function" ? options.roleResolver : function () { return "supporting_result"; };
    return createLeadSet({ id: guide.id, title: guide.title, leads: guide.leads.map(function (item, index) { return createLead({ id: item.id, title: item.title, narrative_role: resolver(item, index, guide), related_lead_ids: item.related_lead_ids || [], expansion_needs: item.expansion_needs || [], source_refs: item.source_refs || corpusRefs(item), statement: item.statement, hinted_type: item.hinted_type, hinted_status: item.hinted_status, terms_or_aliases: item.terms_or_aliases, package_type: item.package_type, metadata: { source_schema: guide.schema, source_kind: guide.kind, original: copy(item), source_guide: copy(guide) } }); }), metadata: { source_schema: guide.schema, source_kind: guide.kind, original: copy(guide) } });
  }
  return Object.freeze({ GUIDE_LEAD_SCHEMA: GUIDE_LEAD_SCHEMA, GUIDE_LEAD_SET_SCHEMA: GUIDE_LEAD_SET_SCHEMA, GUIDE_LEAD_KIND: GUIDE_LEAD_KIND, GUIDE_LEAD_SET_KIND: GUIDE_LEAD_SET_KIND, validateLead: validateLead, validateGuideLead: validateLead, createLead: createLead, createGuideLead: createLead, validateLeadSet: validateLeadSet, validateGuideLeadSet: validateLeadSet, createLeadSet: createLeadSet, createGuideLeadSet: createLeadSet, adaptPaperGuide: adaptPaperGuide, adaptCorpusGuide: adaptCorpusGuide, adaptResearchCorpusGuide: adaptCorpusGuide });
});
