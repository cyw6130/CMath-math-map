/**
 * @cmath-provenance
 * @package dual-lane-extraction-aggregation-v1
 * @version v1
 * @canonicalSource packages/research-process/import/dual-lane-extraction-aggregation-v1/browser-assets/dual-lane-extraction-aggregation.js
 * @contentHash sha256:bb192a28ad56b3eaec22c6b6032883a8bc0bc2784155ff013709cee6b80fcc56
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
(function publishDualLaneAggregation(root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathDualLaneExtractionAggregationV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createDualLaneAggregation() {
  "use strict";
  var SCHEMA = "cmath.dual-lane-extraction-aggregation/v0.1";
  var PROVENANCE_KEYS = { extraction_lanes: true, extractionLanes: true, lane_provenance: true, laneProvenance: true, source_lane: true, sourceLane: true };
  function copy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function object(value, label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be an object"); return value; }
  function nonEmpty(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(label + " must be a non-empty string"); return value; }
  function canonical(value, omitProvenance) {
    if (Array.isArray(value)) return value.map(function (item) { return canonical(item, omitProvenance); });
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).filter(function (key) { return !omitProvenance || !PROVENANCE_KEYS[key]; }).sort().reduce(function (result, key) { result[key] = canonical(value[key], omitProvenance); return result; }, {});
  }
  function stableJson(value) { return JSON.stringify(canonical(value)); }
  function canonicalize(value) { return canonical(value, false); }
  function digest(value) { return stableJson(value); }
  function recordDigest(record) { return JSON.stringify(canonical(record, true)); }
  function normalizeLaneName(name, label) { nonEmpty(name, label); return name === "lead_guided" || name === "leadGuided" ? "lead-guided" : name; }
  function recordsForLane(value, label) { if (Array.isArray(value)) return value; object(value, label); if (!Array.isArray(value.records)) throw new Error(label + ".records must be an array"); return value.records; }
  function normalizeLanes(lanes) {
    var normalized = [];
    if (Array.isArray(lanes)) lanes.forEach(function (entry, index) { object(entry, "lanes[" + index + "]"); var name = entry.lane || entry.name || entry.id; if (entry.records === undefined) throw new Error("lanes[" + index + "].records is required"); normalized.push({ name: normalizeLaneName(name, "lanes[" + index + "].lane"), records: recordsForLane(entry.records, "lanes[" + index + ".records") }); });
    else { object(lanes, "lanes"); Object.keys(lanes).forEach(function (name) { normalized.push({ name: normalizeLaneName(name, "lane name"), records: recordsForLane(lanes[name], "lane " + name) }); }); }
    var names = {}; normalized.forEach(function (lane) { if (names[lane.name]) throw new Error("duplicate lane name"); names[lane.name] = true; }); if (!names.coverage) throw new Error("lanes must include coverage"); if (!names["lead-guided"]) throw new Error("lanes must include lead-guided"); return normalized;
  }
  function validateRecord(record, label) { object(record, label); nonEmpty(record.id, label + ".id"); }
  function validateDualLaneExtractionInput(lanes) { normalizeLanes(lanes).forEach(function (lane) { lane.records.forEach(function (record, index) { validateRecord(record, "lane " + lane.name + " record " + index); }); }); return true; }
  function activeRecord(record, lane) { var result = copy(record); result.extraction_lanes = [lane]; return result; }
  function comparableRecord(record) { var result = copy(record); Object.keys(PROVENANCE_KEYS).forEach(function (key) { delete result[key]; }); return result; }
  function laneCountObject(lanes) { return lanes.reduce(function (result, lane) { result[lane.name === "lead-guided" ? "lead_guided" : lane.name] = lane.records.length; return result; }, {}); }
  function aggregateDualLaneExtractions(input) {
    var normalized = normalizeLanes((input || {}).lanes); normalized.forEach(function (lane) { lane.records.forEach(function (record, index) { validateRecord(record, "lane " + lane.name + " record " + index); }); });
    var records = [], byId = {}, conflicts = [], laneProvenance = normalized.reduce(function (result, lane) { result[lane.name] = []; return result; }, {});
    normalized.forEach(function (lane) { lane.records.forEach(function (incoming) {
      var incomingClone = copy(incoming), incomingDigest = recordDigest(incomingClone), existing = byId[incoming.id];
      if (!existing) { var merged = activeRecord(incomingClone, lane.name); byId[incoming.id] = { record: merged, digest: incomingDigest, lanes: [lane.name] }; records.push(merged); laneProvenance[lane.name].push(incoming.id); return; }
      if (existing.digest === incomingDigest) { if (existing.lanes.indexOf(lane.name) < 0) existing.lanes.push(lane.name); existing.record.extraction_lanes = existing.lanes.slice(); laneProvenance[lane.name].push(incoming.id); return; }
      conflicts.push({ record_id: incoming.id, existing: copy(existing.record), incoming: incomingClone, existing_digest: existing.digest, incoming_digest: incomingDigest, lanes: existing.lanes.concat([lane.name]) }); laneProvenance[lane.name].push(incoming.id);
    }); });
    var counts = laneCountObject(normalized); counts.total = normalized.reduce(function (sum, lane) { return sum + lane.records.length; }, 0); counts.aggregated = records.length; counts.conflicts = conflicts.length;
    return { schema: SCHEMA, kind: "dual_lane_extraction_aggregation", counts: counts, records: records, conflicts: conflicts, lane_provenance: laneProvenance };
  }
  function validateDualLaneExtractionAggregation(result) { object(result, "result"); if (result.schema !== SCHEMA || result.kind !== "dual_lane_extraction_aggregation") throw new Error("dual-lane aggregation schema mismatch"); if (!result.counts || typeof result.counts !== "object") throw new Error("result.counts is required"); if (!Array.isArray(result.records) || !Array.isArray(result.conflicts)) throw new Error("result.records and result.conflicts must be arrays"); if (!result.lane_provenance || typeof result.lane_provenance !== "object" || Array.isArray(result.lane_provenance)) throw new Error("result.lane_provenance is required"); var ids = {}; result.records.forEach(function (record, index) { validateRecord(record, "result record " + index); if (ids[record.id]) throw new Error("duplicate active record: " + record.id); ids[record.id] = true; }); return true; }
  return Object.freeze({ DUAL_LANE_EXTRACTION_AGGREGATION_SCHEMA: SCHEMA, DUAL_LANE_EXTRACTION_AGGREGATION_RESULT_SCHEMA: SCHEMA, canonicalize: canonicalize, digest: digest, recordDigest: recordDigest, validateDualLaneExtractionInput: validateDualLaneExtractionInput, aggregateDualLaneExtractions: aggregateDualLaneExtractions, aggregateDualLaneExtraction: aggregateDualLaneExtractions, aggregateRecords: aggregateDualLaneExtractions, validateDualLaneExtractionAggregation: validateDualLaneExtractionAggregation });
});
