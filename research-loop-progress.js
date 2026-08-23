/**
 * @cmath-provenance
 * @package research-loop-progress-v1
 * @version v1
 * @canonicalSource packages/math-map/presentation/research-loop-progress-v1/src/index.js
 * @contentHash sha256:b625462b4b92a0ada38acf3c5fd66990d1b64a03055df9fc643e37250c5725cd
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
/* Research Loop history and incremental map slices. Deliberately excludes plan and route selection. */
(function publishResearchLoopProgress(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaResearchLoopProgress = api;
})(typeof window !== "undefined" ? window : globalThis, function createResearchLoopProgress() {
  "use strict";

  const CAPABILITY_ID = "cmath-gamma.research-loop-progress/v1";
  const RESULT_STATES = Object.freeze(["completed", "failed", "aborted"]);
  const resultStates = new Set(RESULT_STATES);
  const unique = (items) => [...new Set((items ?? []).filter(Boolean))];

  function normalizeLoop(loop, index = 0) {
    if (!loop || typeof loop !== "object") throw new TypeError(`Loop ${index + 1} must be an object`);
    if (!loop.id) throw new Error(`Loop ${index + 1} must have id`);
    const resultState = loop.resultState ?? (loop.status === "完成" ? "completed" : loop.status);
    if (!resultStates.has(resultState)) throw new Error(`Loop ${loop.id} has unsupported resultState: ${resultState}`);
    if ((loop.operationKind ?? loop.inferenceKind) === "plan") throw new Error(`Loop ${loop.id} must not introduce plan`);
    const completed = resultState === "completed";
    return Object.freeze({
      id: loop.id,
      displayLabel: String(loop.displayLabel ?? loop.label ?? `Loop ${index + 1}`),
      title: String(loop.title ?? loop.action ?? `Loop ${index + 1}`),
      resultState,
      targetEntryId: loop.targetEntryId ?? null,
      focusEntryId: loop.focusEntryId ?? loop.targetEntryId ?? null,
      usedEntryIds: Object.freeze(unique(loop.usedEntryIds)),
      deltaIds: Object.freeze(completed ? unique(loop.deltaIds ?? loop.mathematicalDeltaIds) : []),
      excludedDeltaIds: Object.freeze(completed ? [] : unique(loop.deltaIds ?? loop.mathematicalDeltaIds)),
      resultSummary: String(loop.resultSummary ?? loop.summary ?? loop.result?.effect ?? ""),
      runKind: loop.runKind ?? loop.loopKind ?? "research",
    });
  }

  function normalizeLoops(loops) {
    if (!Array.isArray(loops)) throw new TypeError("loops must be an array");
    const ids = new Set();
    const deltaOwner = new Map();
    return Object.freeze(loops.map((loop, index) => {
      const normalized = normalizeLoop(loop, index);
      if (ids.has(normalized.id)) throw new Error(`duplicate Loop id: ${normalized.id}`);
      ids.add(normalized.id);
      normalized.deltaIds.forEach((id) => {
        if (deltaOwner.has(id)) throw new Error(`mathematical delta ${id} belongs to both ${deltaOwner.get(id)} and ${normalized.id}`);
        deltaOwner.set(id, normalized.id);
      });
      return normalized;
    }));
  }

  function sliceThrough(baseIds, loops, count) {
    const normalized = normalizeLoops(loops);
    const bounded = Math.max(0, Math.min(normalized.length, Number(count) || 0));
    return Object.freeze(unique([...(baseIds ?? []), ...normalized.slice(0, bounded).flatMap((loop) => loop.deltaIds)]));
  }

  return Object.freeze({ CAPABILITY_ID, RESULT_STATES, normalizeLoop, normalizeLoops, sliceThrough });
});
