/**
 * @cmath-provenance
 * @package research-loop-progress-v1
 * @version v1
 * @canonicalSource packages/math-map/presentation/research-loop-progress-v1/src/index.js
 * @contentHash sha256:4a853d445f563571452d702f5a282a20d5518f56d70fc2fd40b0cb3911f4a2f0
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
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
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

  function normalizeLoop(loop, index = 0) {
    if (!loop || typeof loop !== "object") throw new TypeError(`Loop ${index + 1} must be an object`);
    if (!loop.id) throw new Error(`Loop ${index + 1} must have id`);
    const resultState = loop.resultState ?? (loop.status === "完成" ? "completed" : loop.status);
    if (!resultStates.has(resultState)) throw new Error(`Loop ${loop.id} has unsupported resultState: ${resultState}`);
    if ((loop.operationKind ?? loop.inferenceKind) === "plan") throw new Error(`Loop ${loop.id} must not introduce plan`);
    const completed = resultState === "completed";
    const deltaEntryIds = unique(loop.deltaEntryIds);
    const deltaInferenceIds = unique(loop.deltaInferenceIds);
    const legacyDeltaIds = unique(loop.deltaIds ?? loop.mathematicalDeltaIds);
    const previouslyExcludedDeltaEntryIds = unique(loop.excludedDeltaEntryIds);
    const previouslyExcludedDeltaInferenceIds = unique(loop.excludedDeltaInferenceIds);
    const previouslyExcludedDeltaIds = unique(loop.excludedDeltaIds);
    // deltaFormat keeps normalization idempotent while allowing explicitly
    // empty typed arrays to override a legacy mixed field.
    const hasTypedDeltaInput = loop.deltaFormat === "typed"
      || (loop.deltaFormat !== "legacy" && (hasOwn(loop, "deltaEntryIds") || hasOwn(loop, "deltaInferenceIds")));
    return Object.freeze({
      id: loop.id,
      displayLabel: String(loop.displayLabel ?? loop.label ?? `Loop ${index + 1}`),
      title: String(loop.title ?? loop.action ?? `Loop ${index + 1}`),
      resultState,
      targetEntryId: loop.targetEntryId ?? null,
      focusEntryId: loop.focusEntryId ?? loop.targetEntryId ?? null,
      usedEntryIds: Object.freeze(unique(loop.usedEntryIds)),
      deltaFormat: hasTypedDeltaInput ? "typed" : "legacy",
      deltaEntryIds: Object.freeze(completed ? deltaEntryIds : []),
      deltaInferenceIds: Object.freeze(completed ? deltaInferenceIds : []),
      deltaIds: Object.freeze(completed ? unique(hasTypedDeltaInput ? [...deltaEntryIds, ...deltaInferenceIds] : legacyDeltaIds) : []),
      excludedDeltaEntryIds: Object.freeze(completed ? [] : unique([...deltaEntryIds, ...previouslyExcludedDeltaEntryIds])),
      excludedDeltaInferenceIds: Object.freeze(completed ? [] : unique([...deltaInferenceIds, ...previouslyExcludedDeltaInferenceIds])),
      excludedDeltaIds: Object.freeze(completed ? [] : unique([...legacyDeltaIds, ...previouslyExcludedDeltaIds])),
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
