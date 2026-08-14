/* Stable boundary between graph capabilities and mathematical projections. */
(function publishGraphContract(root, factory) {
  "use strict";

  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.GammaGraphContract = contract;
})(typeof window !== "undefined" ? window : globalThis, function createGraphContract() {
  "use strict";

  const SCHEMA = "cmath.graph-channel/v1";
  const CONTRACT_VERSION = 1;
  const CAPABILITIES = Object.freeze([
    "set-layout",
    "overview",
    "focus-node",
    "focus-subgraph",
    "insert-subgraph",
    "restore-overview",
    "selection",
    "dimming",
    "palette",
  ]);

  function nonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
    return value;
  }

  function endpointId(value) {
    return typeof value === "object" && value !== null ? value.id : value;
  }

  function assertLayout(layout) {
    if (!layout || typeof layout !== "object") throw new TypeError("layout must be an object");
    if (!Array.isArray(layout.nodes)) throw new TypeError("layout.nodes must be an array");
    if (!Array.isArray(layout.edges)) throw new TypeError("layout.edges must be an array");

    const nodeIds = new Set();
    layout.nodes.forEach((node, index) => {
      if (!node || typeof node !== "object") throw new TypeError(`node ${index} must be an object`);
      const id = nonEmptyString(node.id, `node ${index} id`);
      nonEmptyString(node.nodeKind, `node ${id} nodeKind`);
      nonEmptyString(node.title, `node ${id} title`);
      if (nodeIds.has(id)) throw new Error(`duplicate node id: ${id}`);
      nodeIds.add(id);
    });

    const edgeKeys = new Set();
    layout.edges.forEach((edge, index) => {
      if (!edge || typeof edge !== "object") throw new TypeError(`edge ${index} must be an object`);
      const source = nonEmptyString(endpointId(edge.source), `edge ${index} source`);
      const target = nonEmptyString(endpointId(edge.target), `edge ${index} target`);
      const relation = nonEmptyString(edge.relation, `edge ${index} relation`);
      if (!nodeIds.has(source)) throw new Error(`unknown source: ${source}`);
      if (!nodeIds.has(target)) throw new Error(`unknown target: ${target}`);
      const key = `${source}>${target}:${relation}`;
      if (edgeKeys.has(key)) throw new Error(`duplicate edge: ${key}`);
      edgeKeys.add(key);
    });

    return layout;
  }

  function describe() {
    return { schema: SCHEMA, contractVersion: CONTRACT_VERSION, capabilities: [...CAPABILITIES] };
  }

  return Object.freeze({ SCHEMA, CONTRACT_VERSION, CAPABILITIES, describe, assertLayout });
});
