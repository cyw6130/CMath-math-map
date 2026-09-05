/** Direct presentation adapter for canonical Math Map State Space v3 JSON. */
(function publishCanonicalMathMapAdapter(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaCanonicalMathMapAdapter = api;
})(typeof window !== "undefined" ? window : globalThis, function createCanonicalMathMapAdapter(root) {
  "use strict";

  const loadDependency = (browserGlobal, localPath) => {
    if (root?.[browserGlobal]) return root[browserGlobal];
    if (typeof require !== "function") return null;
    return require(localPath);
  };
  const semantics = root?.GammaMathMapSemanticsV3
    ?? loadDependency("GammaMathMapSemantics", "../../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js");
  const naming = loadDependency("GammaMathMapNaming", "../../capabilities/browser/math-map-naming.js");
  const LEADING_SOURCE_ORDINAL = /^[（(]\s*\d+(?:\s*\.\s*\d+)*\s*[)）](?:\s*\.\s*\d+)*\s*(?:[:：·-]\s*)?/u;

  function mathematicalShortTitle(value) {
    const sourceTitle = String(value ?? "").trim();
    const withoutOrdinal = sourceTitle.replace(LEADING_SOURCE_ORDINAL, "").trim();
    return withoutOrdinal || sourceTitle;
  }

  function create(map, options = {}) {
    if (typeof semantics?.deriveMathState !== "function") throw new Error("标准数学地图 v3 校验能力没有加载");
    if (typeof naming?.applyNumberingTransitions !== "function") throw new Error("数学地图命名 v2 能力没有加载");
    const mathematicalState = semantics.deriveMathState(map);
    const entryById = new Map(map.entries.map((entry) => [entry.id, entry]));
    const targetId = options.mainTargetEntryId
      ?? [...map.inferences].reverse().map((inference) => entryById.get(inference.conclusion)).find((entry) => entry?.entryClass === "claim")?.id
      ?? [...map.entries].reverse().find((entry) => entry.entryClass === "claim")?.id
      ?? map.entries[0]?.id;
    const projectId = options.projectId ?? `canonical:${targetId ?? "map"}`;
    // Objects in canonical state M are already formal. Naming consumes that
    // accepted boundary and owns the durable visible number allocation.
    const namingObjects = [
      ...map.entries.map((entry) => ({ ...entry, mathematicalShortTitle: mathematicalShortTitle(entry.title) })),
      ...map.inferences.map((inference) => ({
        ...inference,
        mathematicalShortTitle: mathematicalShortTitle(entryById.get(inference.conclusion)?.title ?? inference.conclusion),
      })),
    ];
    const namingResult = naming.applyNumberingTransitions({
      projectId,
      objects: namingObjects,
      ledger: options.numberingLedger ?? null,
      transitions: naming.transitionsFromAdmission({
        verdict: "accepted",
        acceptedObjectIds: namingObjects.map((item) => item.id),
      }),
    });
    const b0Ids = new Set(map.b0ClaimEntryIds);
    const nodes = [
      ...map.entries.map((entry) => {
        const isClaim = entry.entryClass === "claim";
        const claimState = isClaim ? mathematicalState.claimStates[entry.id] : undefined;
        return {
          ...entry,
          nodeKind: "entry",
          sourceLayer: "formal",
          displayName: namingResult.namesById[entry.id],
          objectType: isClaim ? "Claim" : "Fact",
          researchRelation: b0Ids.has(entry.id)
            ? "B₀ · 外部基础 Claim"
            : isClaim ? "Claim · 数学命题" : `Fact · ${entry.factKind}`,
          status: isClaim ? claimState : "fact",
          claimState,
          isFact: !isClaim,
          isClaim,
          isFoundation: b0Ids.has(entry.id),
          isBaseClaim: b0Ids.has(entry.id),
          isClaimSeed: b0Ids.has(entry.id),
          evidence: options.evidenceLabel ?? "论文导入 · V5",
          source: entry,
        };
      }),
      ...map.inferences.map((inference) => {
        const prefix = inference.operationKind === "organization" ? "组织" : "证明";
        return {
          ...inference,
          nodeKind: "inference",
          sourceLayer: "formal",
          displayName: namingResult.namesById[inference.id],
          title: `${prefix}：${mathematicalShortTitle(entryById.get(inference.conclusion)?.title ?? inference.conclusion)}`,
          statement: inference.argument,
          objectType: "Inference",
          researchRelation: inference.operationKind === "organization"
            ? "Inference · 组织出定义" : "Inference · 证明 Claim",
          status: "documented",
          evidence: inference.argument,
          source: inference,
        };
      }),
    ];
    const edges = map.inferences.flatMap((inference) => [
      ...inference.premises.map((source) => ({ source, target: inference.id, relation: "premise" })),
      { source: inference.id, target: inference.conclusion, relation: "conclusion" },
    ]);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const layout = Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
    const presentIds = (_layout, ids) => [...new Set(ids)].filter((id) => nodeIds.has(id));
    const neighborhood = (_layout, id) => presentIds(layout, [
      id,
      ...edges.filter((edge) => edge.source === id).map((edge) => edge.target),
      ...edges.filter((edge) => edge.target === id).map((edge) => edge.source),
    ]);
    const relations = (_layout, id) => ({
      previous: edges.filter((edge) => edge.target === id).map((edge) => edge.source),
      next: edges.filter((edge) => edge.source === id).map((edge) => edge.target),
    });
    return Object.freeze({
      schema: "cmath-gamma.math-map-projection/v0.1",
      project: Object.freeze({ id: projectId, title: options.title ?? "标准数学地图" }),
      numberingLedger: namingResult.ledger,
      focus: Object.freeze({ currentEntryId: targetId, currentGoalId: targetId }),
      goalHierarchy: Object.freeze({ finalGoalId: null, milestoneIds: [], currentGoalIds: targetId ? [targetId] : [] }),
      progressBatches: Object.freeze([]),
      sections: Object.freeze([]),
      layoutThrough: () => layout,
      progressLayoutThrough: () => layout,
      claimStatesThrough: () => mathematicalState.claimStates,
      presentIds,
      neighborhood,
      relations,
      focusView: (_layout, focusId = targetId) => ({
        focusEntryId: focusId,
        loopIds: [],
        nodeIds: focusId ? neighborhood(layout, focusId) : [],
        latestDeltaIds: [],
        summary: focusId ? `当前聚焦「${entryById.get(focusId)?.title ?? focusId}」及其直接数学关系。` : "这张地图尚无可聚焦对象。",
      }),
    });
  }

  return Object.freeze({ create });
});
