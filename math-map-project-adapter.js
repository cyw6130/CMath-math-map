/* Alpha Project View Model -> Gamma mathematical-map projection.
 * This layer is read-only: it never edits Alpha authority or graph rendering state.
 * Current semantics: contracts/MATHEMATICAL_MAP_SEMANTICS_V0.1.md.
 *
 * New Project View objects are self-describing. The old Alpha candidate arrays
 * are accepted only as a compatibility input to Loop deltas; their workflow
 * vocabulary never crosses this projection boundary.
 */
(function publishMathMapProjectAdapter(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathMapProjectAdapter = api;
})(typeof window !== "undefined" ? window : globalThis, function createAdapterApi(root) {
  "use strict";

  const RECENT_LOOP_LIMIT = 3;
  const semantics = root?.GammaMathMapSemantics
    ?? (typeof require === "function" ? require("./math-map-semantics.js") : null);
  const naming = root?.GammaMathMapNaming
    ?? (typeof require === "function" ? require("./math-map-naming.js") : null);
  const loopProgress = root?.GammaResearchLoopProgress
    ?? (typeof require === "function" ? require("./research-loop-progress.js") : null);
  const CAPABILITY_ID = "cmath-gamma.alpha-project-adapter/v0.2";
  const SEMANTIC_CONTRACT = Object.freeze({
    id: semantics?.SEMANTIC_MODEL_ID ?? "cmath.fact-claim-operation/v0.1",
    entryClasses: semantics?.ENTRY_CLASSES ?? Object.freeze(["fact", "claim"]),
    factKinds: semantics?.FACT_KINDS ?? Object.freeze(["definition", "algorithm", "calculation"]),
    claimKinds: semantics?.CLAIM_KINDS ?? Object.freeze(["lemma", "proposition", "theorem"]),
    claimStates: semantics?.CLAIM_STATES ?? Object.freeze(["open", "established"]),
    inferenceKinds: semantics?.OPERATION_KINDS ?? Object.freeze(["organization", "proof"]),
    loopKinds: Object.freeze(["calculation", "proof", "route_judgment"]),
  });
  const ENTRY_CLASSES = new Set(SEMANTIC_CONTRACT.entryClasses);
  const FACT_KINDS = new Set(SEMANTIC_CONTRACT.factKinds);
  const CLAIM_KINDS = new Set(SEMANTIC_CONTRACT.claimKinds);
  const CLAIM_STATES = new Set(SEMANTIC_CONTRACT.claimStates);
  const INFERENCE_KINDS = new Set(SEMANTIC_CONTRACT.inferenceKinds);
  const NON_GRAPH_ENTRY_KINDS = new Set(["remark"]);
  const unique = (items) => [...new Set((items ?? []).filter(Boolean))];
  const endpointId = (value) => typeof value === "object" && value !== null ? value.id : value;
  const uniqueById = (items) => (items ?? []).filter((item, index) => item?.id && items.findIndex((candidate) => candidate?.id === item.id) === index);
  const numberedNamePrefixes = Object.freeze({
    definition: "定义",
    algorithm: "算法",
    construction: "算法",
    calculation: "计算",
    lemma: "引理",
    proposition: "命题",
    theorem: "定理",
    organization: "组织",
    proof: "证明",
  });
  const canonicalBoardDisplayNamePattern = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(\d+)\s*·\s*(.+)$/u;
  const legacyGammaBoardDisplayNamePattern = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(.+?)\s*·\s*(\d+)$/u;
  const sourceBoardDisplayNamePattern = /^(.+?)\s+(\d+)\s+·\s+(.+)$/u;
  const displayKindAliases = Object.freeze({
    "定义": "定义", "约定": "定义", "构造": "算法", "算法": "算法",
    "计算": "计算", "计算结果": "计算", "例子": "计算",
    "引理": "引理", "命题": "命题", "开放问题": "命题", "反例": "命题", "定理": "定理",
    "组织": "组织", "推导": "证明", "证明": "证明",
  });
  const forbiddenBoardNameTerms = /候选|candidate|record|checker|gate|pipeline|task/i;
  const workflowWordPattern = /候选|candidate/giu;

  const directEntryClass = (item) => semantics?.entryClass(item) ?? item?.entryClass
    ?? (typeof item?.semanticModel === "object" ? item.semanticModel.entryClass : undefined)
    ?? item?.semantic?.entryClass;
  const directOperationKind = (item) => semantics?.operationKind(item) ?? item?.operationKind
    ?? item?.inferenceKind
    ?? (typeof item?.semanticModel === "object" ? item.semanticModel.operationKind : undefined)
    ?? item?.semantic?.operationKind;
  const mathematicalShortTitle = (item) => naming?.mathematicalShortTitle(item) ?? item?.mathematicalShortTitle
    ?? item?.shortTitle
    ?? item?.shortName
    ?? item?.semantic?.mathematicalShortTitle
    ?? item?.semantic?.shortTitle;
  const hasNativeName = (item) => typeof item?.boardDisplayName === "string"
    || (typeof (item?.displayLabel ?? item?.label) === "string" && Boolean(mathematicalShortTitle(item)));
  const isCandidateSource = (item, kind) => kind === "entry"
    ? item?.candidateKind === "candidate_entry" || item?.kind === "candidate_entry" || String(item?.id ?? "").includes(":candidate-entry:")
    : item?.candidateKind === "candidate_inference" || item?.kind === "candidate_inference" || String(item?.id ?? "").includes(":candidate-inference:");
  const removeWorkflowWords = (value) => String(value ?? "")
    .replace(workflowWordPattern, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  function normalizeBoardName(value) {
    if (naming) return naming.normalizeBoardName(value);
    if (typeof value !== "string") return null;
    const canonical = value.trim().match(canonicalBoardDisplayNamePattern);
    if (canonical) return `${canonical[1]} · ${canonical[2]} · ${canonical[3].trim()}`;
    const legacyGamma = value.trim().match(legacyGammaBoardDisplayNamePattern);
    if (legacyGamma) return `${legacyGamma[1]} · ${legacyGamma[3]} · ${legacyGamma[2].trim()}`;
    const source = value.trim().match(sourceBoardDisplayNamePattern);
    if (!source) return null;
    const kind = displayKindAliases[source[1].trim()];
    return kind ? `${kind} · ${source[2]} · ${source[3].trim()}` : null;
  }

  function composeBoardName(label, shortTitle) {
    if (naming) return naming.composeBoardName(label, shortTitle);
    const match = String(label ?? "").trim().match(/^(.+?)\s+(\d+)$/u);
    const kind = displayKindAliases[match?.[1]?.trim()];
    return kind && shortTitle ? `${kind} · ${match[2]} · ${String(shortTitle).trim()}` : null;
  }

  function createNumberedDisplayNames(entries, inferences) {
    const names = new Map();
    const usedNumbers = new Map();
    const records = [
      ...entries.map((item) => ({ item, kind: item.entryKind ?? item.factKind ?? item.claimKind })),
      ...inferences.map((item) => ({ item, kind: directOperationKind(item) })),
    ];
    records.forEach(({ item, kind }) => {
      const prefix = numberedNamePrefixes[kind];
      if (!prefix || !item?.id) return;
      const match = String(item.displayName ?? item.displayLabel ?? "").trim().match(new RegExp(`^${prefix}\\s+(\\d+)$`));
      const number = Number(match?.[1]);
      if (!Number.isInteger(number) || number < 1 || usedNumbers.get(kind)?.has(number)) return;
      if (!usedNumbers.has(kind)) usedNumbers.set(kind, new Set());
      usedNumbers.get(kind).add(number);
      names.set(item.id, `${prefix} ${number}`);
    });
    records.forEach(({ item, kind }) => {
      const prefix = numberedNamePrefixes[kind];
      if (!prefix || !item?.id || names.has(item.id)) return;
      if (!usedNumbers.has(kind)) usedNumbers.set(kind, new Set());
      const used = usedNumbers.get(kind);
      let number = 1;
      while (used.has(number)) number += 1;
      used.add(number);
      names.set(item.id, `${prefix} ${number}`);
    });
    return names;
  }

  function loopSortValue(loop) {
    const id = String(loop?.id ?? "");
    const compact = id.match(/(20\d{6})(\d{6})?/);
    if (compact) return Number(`${compact[1]}${compact[2] ?? "000000"}`);
    const dashed = id.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if (dashed) return Number(`${dashed[1]}${dashed[2]}${dashed[3]}000000`);
    return null;
  }

  function create(data, options = {}) {
    if (data?.schema !== "cmath.project-view-model/v0.1" || !data.project || !Array.isArray(data.entries) || !Array.isArray(data.inferences)) {
      throw new TypeError("expected cmath.project-view-model/v0.1 with entries and inferences");
    }

    const overlay = data.derivedResearchState?.researchOverlay ?? data.project.researchOverlay ?? {};
    const mathematicalState = data.derivedResearchState?.mathematicalState ?? {};
    const temporalUnitLabel = String(options.temporalUnitLabel ?? "Loop").trim() || "Loop";
    const usesFactClaimModel = data.semanticModel === SEMANTIC_CONTRACT.id
      || data.semanticModel?.id === SEMANTIC_CONTRACT.id;
    const rawFormalEntries = uniqueById(data.entries);
    const rawFormalInferences = uniqueById(data.inferences);
    const rawDeltaEntries = uniqueById([...(data.candidateEntries ?? []), ...(data.historicalCandidateEntries ?? [])]);
    const rawDeltaInferences = uniqueById([...(data.candidateInferences ?? []), ...(data.historicalCandidateInferences ?? [])]);
    const numberingLedgerSource = options.numberingLedger ?? data.numberingLedger ?? null;
    const numberingLedger = numberingLedgerSource && naming?.validateLedger
      ? naming.validateLedger(numberingLedgerSource, data.project.id) : null;
    // Migration is deliberately resolved per object. A Project View can carry
    // reviewed Alpha records and backend-native records at the same time.
    const hasNativeObjects = Boolean(rawFormalEntries.some((item) => ENTRY_CLASSES.has(directEntryClass(item)))
      || rawFormalInferences.some((item) => INFERENCE_KINDS.has(directOperationKind(item)))
      || rawDeltaEntries.some((item) => ENTRY_CLASSES.has(directEntryClass(item)))
      || rawDeltaInferences.some((item) => INFERENCE_KINDS.has(directOperationKind(item))));
    const strictBoardNaming = options.nodeNaming === "board-display-name" || options.strictBoardNames === true;
    const requireMathematicalNames = strictBoardNaming;
    const compatibilityNames = options.boardDisplayNamesById && typeof options.boardDisplayNamesById === "object"
      ? options.boardDisplayNamesById : null;
    const contractDiagnostics = {
      rejectedEntryIds: [],
      rejectedInferenceIds: [],
      issues: [],
      compatibilityEntryIds: [],
      compatibilityInferenceIds: [],
    };

    const formalEntryById = new Map(rawFormalEntries.map((item) => [item.id, item]));
    const formalInferenceById = new Map(rawFormalInferences.map((item) => [item.id, item]));
    const projectedIdForSource = (item, kind) => {
      if (!isCandidateSource(item, kind)) return item?.id;
      const promotedId = endpointId(item?.promotedAs);
      return kind === "entry"
        ? formalEntryById.has(promotedId) ? promotedId : item?.id
        : formalInferenceById.has(promotedId) ? promotedId : item?.id;
    };

    const compatibilityEntryClasses = options.entryClassById && typeof options.entryClassById === "object"
      ? options.entryClassById : null;
    const compatibilityOperationKinds = options.inferenceOperationKindById
      && typeof options.inferenceOperationKindById === "object" ? options.inferenceOperationKindById : null;
    const compatibilityGovernance = options.governanceById
      && typeof options.governanceById === "object" ? options.governanceById : null;

    function governanceFor(item, projectedId, isFormal) {
      const mapped = compatibilityGovernance?.[item.id] ?? compatibilityGovernance?.[projectedId];
      if (mapped && typeof mapped === "object") {
        return {
          state: mapped.state ?? "unreviewed",
          closureEligible: mapped.closureEligible === true,
          sourceLayer: mapped.sourceLayer ?? "compatibility-candidate",
        };
      }
      if (isFormal) return { state: "formal", closureEligible: true, sourceLayer: "formal" };
      if (item.sourceImport?.bundleId && !item.sourceLoopId) {
        return { state: "external_import", closureEligible: false, sourceLayer: "external-import" };
      }
      const state = item.governanceState === "review_rejected"
        ? "rejected"
        : item.governanceState ?? "unreviewed";
      return {
        state,
        closureEligible: ["formal", "accepted"].includes(state),
        sourceLayer: "compatibility-candidate",
      };
    }

    function validNativeDisplayName(item, kind) {
      if (numberingLedger) {
        if (naming?.boardNameFromLedger(item, numberingLedger)) return true;
        return Boolean(isCandidateSource(item, kind) && naming?.pendingBoardName(item));
      }
      const boardName = item?.boardDisplayName;
      if (validBoardName(boardName)) return true;
      const displayLabel = item?.displayLabel ?? item?.label;
      const shortTitle = mathematicalShortTitle(item);
      if (validBoardName(displayLabel)) return true;
      return Boolean(composeBoardName(displayLabel, shortTitle));
    }

    function nativeContractFor(item, kind) {
      const displayLabel = item?.displayLabel ?? item?.label;
      const hasName = validNativeDisplayName(item, kind)
        || Boolean(composeBoardName(displayLabel, mathematicalShortTitle(item)));
      const hasTitle = typeof item?.title === "string" && item.title.trim().length > 0;
      if (kind === "entry") {
        const entryClass = directEntryClass(item);
        const subtypeValid = entryClass === "fact" ? FACT_KINDS.has(item?.factKind)
          : entryClass === "claim" ? CLAIM_KINDS.has(item?.claimKind) : false;
        return {
        valid: ENTRY_CLASSES.has(entryClass) && subtypeValid && hasName && hasTitle,
        hasSemanticField: Object.hasOwn(item ?? {}, "entryClass")
          || Object.hasOwn(item ?? {}, "semantic")
          || (typeof item?.semanticModel === "object" && Object.hasOwn(item.semanticModel, "entryClass")),
        };
      }
      const premises = item?.premises ?? item?.premiseEntryIds;
      const conclusion = endpointId(item?.conclusion ?? item?.conclusionEntryId);
      return {
        valid: INFERENCE_KINDS.has(directOperationKind(item)) && Array.isArray(premises)
          && Boolean(conclusion) && hasName && hasTitle,
        hasSemanticField: Object.hasOwn(item ?? {}, "operationKind")
          || Object.hasOwn(item ?? {}, "inferenceKind")
          || Object.hasOwn(item ?? {}, "semantic")
          || (typeof item?.semanticModel === "object" && Object.hasOwn(item.semanticModel, "operationKind")),
      };
    }

    function compatibilityHasId(item, projectedId) {
      return Boolean(compatibilityNames && [item?.id, projectedId].some((id) => id
        && Object.hasOwn(compatibilityNames, id)));
    }

    function sourceModeFor(item, kind, projectedId) {
      const promotedItem = kind === "entry"
        ? formalEntryById.get(projectedId)
        : formalInferenceById.get(projectedId);
      const basis = promotedItem ?? item;
      const nativeContract = nativeContractFor(basis, kind);
      // Native semantics always win. In particular, a new ID that happens to
      // collide with a stale compatibility table entry must still be read from
      // its own contract and must not depend on the table.
      if (nativeContract.valid) return { mode: "native", basis, nativeContract };
      if (compatibilityHasId(item, projectedId) || compatibilityHasId(basis, projectedId)) {
        return { mode: "legacy", basis, nativeContract };
      }
      const nativeHint = Boolean(options.requireNativeContract || usesFactClaimModel
        || nativeContract.hasSemanticField);
      return { mode: nativeHint ? "rejected-native" : "rejected-unknown", basis, nativeContract };
    }

    const classificationFor = (item, kind, sourceMode) => {
      const basis = sourceMode?.basis ?? item;
      if (sourceMode?.mode === "native") {
        const direct = directEntryClass(basis);
        return ENTRY_CLASSES.has(direct) ? direct : null;
      }
      const ids = unique([item?.id, sourceMode?.projectedId, basis?.id]);
      const mapped = ids.map((id) => compatibilityEntryClasses?.[id]).find((value) => value != null);
      if (ENTRY_CLASSES.has(mapped) || mapped === "unclassified") {
        contractDiagnostics.compatibilityEntryIds.push(item.id);
        return mapped;
      }
      const direct = directEntryClass(basis);
      return ENTRY_CLASSES.has(direct) ? direct : null;
    };

    const operationKindFor = (item, kind, sourceMode) => {
      const basis = sourceMode?.basis ?? item;
      if (sourceMode?.mode === "native") {
        const direct = directOperationKind(basis);
        return INFERENCE_KINDS.has(direct) ? direct : null;
      }
      const ids = unique([item?.id, sourceMode?.projectedId, basis?.id]);
      const mapped = ids.map((id) => compatibilityOperationKinds?.[id]).find((value) => value != null);
      if (INFERENCE_KINDS.has(mapped)) {
        contractDiagnostics.compatibilityInferenceIds.push(item.id);
        return mapped;
      }
      // The old Alpha torus view predates operationKind. The reviewed board
      // map is the compatibility proof signal for those inference records.
      if (compatibilityHasId(item, sourceMode?.projectedId) || compatibilityHasId(basis, sourceMode?.projectedId)) {
        contractDiagnostics.compatibilityInferenceIds.push(item.id);
        return "proof";
      }
      const direct = directOperationKind(basis);
      return INFERENCE_KINDS.has(direct) ? direct : null;
    };

    const numberedDisplayNames = options.nodeNaming === "numbered-kind"
      ? createNumberedDisplayNames([...rawFormalEntries, ...rawDeltaEntries], [...rawFormalInferences, ...rawDeltaInferences]) : new Map();
    const numberedTopicDisplayNames = (options.nodeNaming === "numbered-topic" || hasNativeObjects)
      ? createNumberedDisplayNames([...rawFormalEntries, ...rawDeltaEntries], [...rawFormalInferences, ...rawDeltaInferences]) : new Map();

    function validBoardName(value) {
      return Boolean(normalizeBoardName(value)) && !forbiddenBoardNameTerms.test(value);
    }

    function displayNameFor(item, kind, projectedId, sourceMode) {
      const nameSource = sourceMode?.basis ?? item;
      if (sourceMode?.mode === "rejected-native" || sourceMode?.mode === "rejected-unknown") return null;
      if (numberingLedger) {
        const durableName = [nameSource?.id, projectedId, item?.id].filter(Boolean).map((id) => (
          naming.boardNameFromLedger({ ...nameSource, id }, numberingLedger)
        )).find(Boolean);
        if (durableName) return durableName;
        if (isCandidateSource(item, kind)) return naming.pendingBoardName(nameSource);
        return null;
      }
      if (sourceMode?.mode === "legacy" && compatibilityNames) {
        const mapped = compatibilityNames[item.id] ?? compatibilityNames[projectedId] ?? compatibilityNames[nameSource.id];
        return validBoardName(mapped) ? normalizeBoardName(mapped) : null;
      }
      const nativeBoardName = nameSource.boardDisplayName;
      if (validBoardName(nativeBoardName)) return normalizeBoardName(nativeBoardName);
      const displayLabel = nameSource.displayLabel ?? nameSource.label;
      const shortTitle = mathematicalShortTitle(nameSource);
      if (typeof displayLabel === "string" && shortTitle) {
        const composed = composeBoardName(displayLabel, shortTitle);
        if (validBoardName(composed)) return composed;
      }
      // A source may already carry the complete board name.
      if (validBoardName(displayLabel)) return normalizeBoardName(displayLabel);
      const numbered = numberedDisplayNames.get(item.id)
        ?? numberedDisplayNames.get(projectedId)
        ?? numberedTopicDisplayNames.get(item.id)
        ?? numberedTopicDisplayNames.get(projectedId);
      if (numbered && shortTitle) return composeBoardName(numbered, shortTitle);
      if (requireMathematicalNames) return null;
      if (options.nodeNaming === "source-display-label" && displayLabel) return displayLabel;
      if (options.nodeNaming === "source-numbered-topic") {
        const kindNumber = displayLabel ?? item.label;
        const topic = options.shortTitlesById?.[item.id]
          ?? options.shortTitlesById?.[endpointId(item.conclusion ?? item.conclusionEntryId)]
          ?? shortTitle;
        if (!topic && options.requireShortTitles) throw new Error(`source-numbered-topic requires a mathematical short title: ${item.id}`);
        if (!topic) return kindNumber && item.title ? `${kindNumber} · ${item.title}` : kindNumber ?? item.title ?? item.id;
        return kindNumber && kindNumber !== topic ? `${kindNumber} · ${topic}` : topic;
      }
      if (options.nodeNaming === "numbered-topic" && numbered && shortTitle) return composeBoardName(numbered, shortTitle);
      return numbered ?? item.title ?? displayLabel ?? item.id;
    }

    const entryRecords = rawFormalEntries.concat(rawDeltaEntries).map((item) => {
      const projectedId = projectedIdForSource(item, "entry");
      const sourceMode = sourceModeFor(item, "entry", projectedId);
      sourceMode.projectedId = projectedId;
      const isLegacy = sourceMode.mode === "legacy";
      const classification = classificationFor(item, "entry", sourceMode);
      const displayName = displayNameFor(item, "entry", projectedId, sourceMode);
      const rawClaimState = item.claimState ?? item.claimStatus ?? item.mathematicalState ?? item.status;
      const isFormal = formalEntryById.get(item.id) === item;
      const governance = governanceFor(item, projectedId, isFormal);
      if (sourceMode.mode === "rejected-native" || (sourceMode.mode === "native" && !ENTRY_CLASSES.has(classification))) {
        contractDiagnostics.issues.push(`Entry ${item.id} 缺少 entryClass=fact|claim`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native")
        && classification === "fact" && !FACT_KINDS.has(item.factKind)) {
        contractDiagnostics.issues.push(`Fact ${item.id} 的 factKind 必须是 definition|algorithm|calculation`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native")
        && classification === "claim" && !CLAIM_KINDS.has(item.claimKind)) {
        contractDiagnostics.issues.push(`Claim ${item.id} 的 claimKind 必须是 lemma|proposition|theorem`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native")
        && classification === "claim" && rawClaimState != null && !CLAIM_STATES.has(rawClaimState)) {
        contractDiagnostics.issues.push(`Claim ${item.id} 的状态必须是 open|established`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native") && !displayName) {
        contractDiagnostics.issues.push(`Entry ${item.id} 缺少 boardDisplayName 或数学短名`);
      }
      if (sourceMode.mode === "legacy" && !displayName) {
        contractDiagnostics.issues.push(`Entry ${item.id} 的兼容 board-display-name 无效`);
      }
      if (classification === "unclassified" || !ENTRY_CLASSES.has(classification)) contractDiagnostics.rejectedEntryIds.push(item.id);
      return {
        item,
        id: item.id,
        projectedId,
        isFormal,
        isLegacy,
        mode: sourceMode.mode,
        governanceState: governance.state,
        closureEligible: governance.closureEligible,
        sourceLayer: governance.sourceLayer,
        classification,
        displayName,
        rawClaimState,
        projectable: ENTRY_CLASSES.has(classification) && Boolean(displayName),
      };
    });
    const entryRecordBySourceId = new Map(entryRecords.map((record) => [record.id, record]));
    const formalEntryRecords = entryRecords.filter((record) => record.isFormal && record.projectable);
    const formalProjectedEntryIds = new Set(formalEntryRecords.map((record) => record.id));
    const dynamicEntryRecords = entryRecords.filter((record) => !record.isFormal && record.projectable
      && (!formalProjectedEntryIds.has(record.projectedId) || record.projectedId === record.id));

    const inferenceRecords = rawFormalInferences.concat(rawDeltaInferences).map((item) => {
      const projectedId = projectedIdForSource(item, "inference");
      const sourceMode = sourceModeFor(item, "inference", projectedId);
      sourceMode.projectedId = projectedId;
      const isLegacy = sourceMode.mode === "legacy";
      const premises = item.premises ?? item.premiseEntryIds;
      const conclusion = endpointId(item.conclusion ?? item.conclusionEntryId);
      const conclusionClass = entryRecordBySourceId.get(conclusion)?.classification;
      const operationKind = sourceMode.mode === "legacy" && compatibilityHasId(item, projectedId)
        ? conclusionClass === "fact" ? "organization" : conclusionClass === "claim" ? "proof" : null
        : operationKindFor(item, "inference", sourceMode);
      const premiseClasses = Array.isArray(premises)
        ? premises.map((id) => entryRecordBySourceId.get(endpointId(id))?.classification) : [];
      const rawDisplayName = displayNameFor(item, "inference", projectedId, sourceMode);
      const displayName = operationKind === "organization"
        ? rawDisplayName?.replace(/^(?:证明|组织) · /u, "组织 · ")
        : operationKind === "proof"
          ? rawDisplayName?.replace(/^(?:证明|组织) · /u, "证明 · ")
          : rawDisplayName;
      const hasPremises = Array.isArray(premises);
      const isFormal = formalInferenceById.get(item.id) === item;
      const governance = governanceFor(item, projectedId, isFormal);
      if (sourceMode.mode === "rejected-native" || (sourceMode.mode === "native" && !INFERENCE_KINDS.has(operationKind))) {
        contractDiagnostics.issues.push(`Inference ${item.id} 缺少 operationKind=organization|proof`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native") && (!hasPremises || !conclusion)) {
        contractDiagnostics.issues.push(`Inference ${item.id} 必须提供 premises 与 conclusion`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native") && operationKind === "organization"
        && (conclusionClass !== "fact" || premiseClasses.some((value) => value !== "fact"))) {
        contractDiagnostics.issues.push(`Organization ${item.id} 只能从 Fact 组织出 Fact`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native") && operationKind === "proof"
        && conclusionClass !== "claim") {
        contractDiagnostics.issues.push(`Proof ${item.id} 的 conclusion 必须是 Claim`);
      }
      if ((sourceMode.mode === "native" || sourceMode.mode === "rejected-native") && !displayName) {
        contractDiagnostics.issues.push(`Inference ${item.id} 缺少 boardDisplayName 或数学短名`);
      }
      if (sourceMode.mode === "legacy" && !displayName) {
        contractDiagnostics.issues.push(`Inference ${item.id} 的兼容 board-display-name 无效`);
      }
      return {
        item,
        id: item.id,
        projectedId,
        isFormal,
        isLegacy,
        mode: sourceMode.mode,
        governanceState: governance.state,
        closureEligible: governance.closureEligible,
        sourceLayer: governance.sourceLayer,
        operationKind,
        premises: hasPremises ? premises : [],
        conclusion,
        displayName,
        projectable: INFERENCE_KINDS.has(operationKind) && hasPremises && Boolean(conclusion) && Boolean(displayName),
      };
    });
    const formalInferenceRecords = inferenceRecords.filter((record) => record.isFormal && record.projectable);
    const formalProjectedInferenceIds = new Set(formalInferenceRecords.map((record) => record.id));
    const dynamicInferenceRecords = inferenceRecords.filter((record) => !record.isFormal && record.projectable
      && (!formalProjectedInferenceIds.has(record.projectedId) || record.projectedId === record.id));

    const allRecords = [...entryRecords, ...inferenceRecords];
    const missingCompatibility = allRecords.filter((record) => record.mode === "rejected-unknown"
      && !(record.item?.entryKind && NON_GRAPH_ENTRY_KINDS.has(record.item.entryKind)));
    if (strictBoardNaming && missingCompatibility.length) {
      throw new Error(`board-display-name mapping is incomplete: ${missingCompatibility.map((record) => record.id).join(", ")}`);
    }
    const compatibilityNamesInUse = allRecords
      .filter((record) => record.mode === "legacy" && (record.isFormal || record.projectedId === record.id))
      .map((record) => record.displayName).filter(Boolean);
    const duplicateCompatibilityNames = [...new Set(compatibilityNamesInUse.filter((name, index, names) => names.indexOf(name) !== index))];
    if (strictBoardNaming && duplicateCompatibilityNames.length) {
      throw new Error(`board-display-name contains duplicate names: ${duplicateCompatibilityNames.join(", ")}`);
    }
    if (contractDiagnostics.issues.length) {
      throw new Error(`Gamma project-view contract rejected: ${unique(contractDiagnostics.issues).join("；")}`);
    }

    const sourceEntryById = new Map(entryRecords.map((record) => [record.id, record]));
    const sourceInferenceById = new Map(inferenceRecords.map((record) => [record.id, record]));
    const projectedIdBySourceId = new Map([
      ...entryRecords.map((record) => [record.id, record.projectedId]),
      ...inferenceRecords.map((record) => [record.id, record.projectedId]),
    ]);
    const visibleEntryRecords = [...formalEntryRecords, ...dynamicEntryRecords];
    const visibleInferenceRecords = [...formalInferenceRecords, ...dynamicInferenceRecords];
    const entryRecordByProjectedId = new Map(visibleEntryRecords.map((record) => [record.projectedId, record]));
    const inferenceRecordByProjectedId = new Map(visibleInferenceRecords.map((record) => [record.projectedId, record]));
    const entryById = new Map(visibleEntryRecords.map((record) => [record.projectedId, record.item]));
    const visibleEntryIds = new Set(entryById.keys());
    const visibleInferenceIds = new Set(inferenceRecordByProjectedId.keys());
    const projectEndpoint = (value) => projectedIdBySourceId.get(endpointId(value)) ?? endpointId(value);

    const factEntryIds = Object.freeze(unique(visibleEntryRecords
      .filter((record) => record.classification === "fact")
      .map((record) => record.projectedId)));
    const claimEntryIds = Object.freeze(unique(visibleEntryRecords
      .filter((record) => record.classification === "claim")
      .map((record) => record.projectedId)));
    const claimIdSet = new Set(claimEntryIds);
    const factIdSet = new Set(factEntryIds);
    const stateIds = (name) => unique([
      ...(mathematicalState[name] ?? []),
      ...(data[name] ?? []),
    ]).map((id) => projectEndpoint(id));
    const foundationEntryIds = Object.freeze(unique([
      ...stateIds("foundationEntryIds"),
      ...stateIds("baseFacts"),
      ...stateIds("baseFactEntryIds"),
      ...visibleEntryRecords.filter((record) => record.item.isFoundation || record.item.foundation === true).map((record) => record.projectedId),
    ]).filter((id) => visibleEntryIds.has(id)));
    const b0ClaimEntryIds = Object.freeze(unique([
      ...stateIds("b0ClaimEntryIds"),
      // Legacy compatibility: claim seeds and Claim-valued foundation entries
      // are interpreted as B₀ Claims. C₀ is never read as a node identity.
      ...stateIds("claimSeedEntryIds"),
      ...(data.claimSeeds ?? []).map(projectEndpoint),
      ...foundationEntryIds,
      ...visibleEntryRecords.filter((record) => record.item.isClaimSeed || record.item.trustedSeed).map((record) => record.projectedId),
    ]).filter((id) => claimIdSet.has(id)));
    const b0ClaimIdSet = new Set(b0ClaimEntryIds);
    // Deprecated transport alias retained for older consumers.
    const claimSeedEntryIds = b0ClaimEntryIds;
    const currentGoalSourceId = endpointId(overlay.loopTargetEntryId);
    if (!sourceEntryById.has(currentGoalSourceId)) throw new Error("Focus target_entry is missing from the formal Entry registry");
    const currentGoalId = projectedIdBySourceId.get(currentGoalSourceId) ?? currentGoalSourceId;

    const requestedFinalGoalId = options.goalHierarchy?.finalGoalId ?? null;
    const requestedMilestoneIds = options.goalHierarchy?.milestoneIds ?? [];
    const finalGoalId = visibleEntryIds.has(requestedFinalGoalId) ? requestedFinalGoalId : null;
    const milestoneIds = unique(requestedMilestoneIds).map((id) => projectEndpoint(id)).filter((id) => visibleEntryIds.has(id));
    const goalHierarchy = Object.freeze({
      finalGoalId,
      milestoneIds: Object.freeze(milestoneIds),
      currentGoalIds: Object.freeze([currentGoalId]),
      currentGoalSource: "Focus.target_entry",
      hierarchySource: finalGoalId || milestoneIds.length ? "explicit-compatibility-map" : "not-declared-by-focus-v0.1",
    });
    const goalLevel = (id) => id === currentGoalId ? "current" : id === finalGoalId ? "final" : milestoneIds.includes(id) ? "milestone" : null;
    const visibleTitle = (record) => record.isLegacy ? removeWorkflowWords(record.item.title ?? record.displayName) : record.item.title ?? record.displayName;
    const visibleStatement = (record, value) => record.isLegacy ? removeWorkflowWords(value) : value;
    const visibleEvidence = (record, value) => record.isLegacy ? removeWorkflowWords(value) : value;

    const formalNodes = [
      ...formalEntryRecords.map((record) => {
        const isFact = record.classification === "fact";
        const isClaim = record.classification === "claim";
        return {
          id: record.projectedId,
          nodeKind: "entry",
          layer: record.sourceLayer,
          governanceState: record.governanceState,
          closureEligible: record.closureEligible,
          sourceLayer: record.sourceLayer,
          entryClass: record.classification,
          factKind: record.item.factKind,
          claimKind: record.item.claimKind,
          entryKind: record.item.entryKind ?? record.item.factKind ?? record.item.claimKind,
          displayName: record.displayName,
          title: visibleTitle(record),
          statement: visibleStatement(record, record.item.statement ?? record.item.meaningText ?? ""),
          objectType: isFact ? "Fact" : "Claim",
          researchRelation: record.projectedId === currentGoalId
            ? "Focus 当前目标"
            : b0ClaimIdSet.has(record.projectedId) ? "B₀ · 当前语境直接采用的基础 Claim"
              : isFact ? `Fact · ${record.item.factKind === "calculation" ? "明确计算结果"
                : record.item.factKind === "algorithm" ? "明确数学算法" : "严格数学定义"}`
                : "Claim · 精确数学命题",
          status: isFact ? "fact" : "open",
          claimState: isClaim ? "open" : undefined,
          classificationStatus: record.classification,
          classificationDiagnostic: null,
          goalLevel: goalLevel(record.projectedId),
          isFoundation: isClaim && b0ClaimIdSet.has(record.projectedId),
          isBaseClaim: isClaim && b0ClaimIdSet.has(record.projectedId),
          isFact,
          isClaim,
          isClaimSeed: isClaim && b0ClaimIdSet.has(record.projectedId),
          evidence: visibleEvidence(record, record.item.sourcePath ?? record.item.contentRef?.locator ?? ""),
          source: record.item,
        };
      }),
      ...formalInferenceRecords.map((record) => ({
        id: record.projectedId,
        nodeKind: "inference",
        layer: record.sourceLayer,
        governanceState: record.governanceState,
        closureEligible: record.closureEligible,
        sourceLayer: record.sourceLayer,
        operationKind: record.operationKind,
        displayName: record.displayName,
        title: visibleTitle(record),
        statement: visibleStatement(record, record.item.statement ?? record.item.applicability?.text ?? record.item.applicability ?? record.item.argument ?? ""),
        objectType: "Inference",
        researchRelation: record.operationKind === "organization"
          ? "Inference · 组织 Fact，不建立 Claim"
          : "Inference · 证明 Claim",
        status: record.item.evidence?.status ?? "documented",
        evidence: visibleEvidence(record, record.item.argument ?? record.item.contentRef?.locator ?? ""),
        source: record.item,
      })),
    ];
    const formalNodeById = new Map(formalNodes.map((node) => [node.id, node]));

    const dynamicNodes = [
      ...dynamicEntryRecords.map((record) => {
        const isFact = record.classification === "fact";
        const isExternalImport = Boolean(record.item.sourceImport?.bundleId);
        const isClaim = !isFact;
        return {
          id: record.projectedId,
          nodeKind: "entry",
          layer: isExternalImport ? "external-import-staging" : "loop-delta",
          governanceState: record.governanceState,
          closureEligible: record.closureEligible,
          sourceLayer: record.sourceLayer,
          entryClass: record.classification,
          factKind: record.item.factKind,
          claimKind: record.item.claimKind,
          entryKind: record.item.entryKind ?? record.item.factKind ?? record.item.claimKind,
          displayName: record.displayName,
          title: visibleTitle(record),
          statement: visibleStatement(record, record.item.statement ?? record.item.meaningText ?? ""),
          objectType: isFact ? "Fact" : "Claim",
          researchRelation: b0ClaimIdSet.has(record.projectedId)
            ? "B₀ · 当前语境直接采用的基础 Claim"
            : isExternalImport
            ? "外部导入 · 待独立复核"
            : isFact ? `本${temporalUnitLabel}增量 · Fact` : `本${temporalUnitLabel}增量 · Claim · 精确数学命题`,
          status: isFact ? "fact" : "open",
          claimState: isFact ? undefined : "open",
          classificationStatus: record.classification,
          classificationDiagnostic: null,
          goalLevel: goalLevel(record.projectedId),
          isFoundation: isClaim && b0ClaimIdSet.has(record.projectedId),
          isBaseClaim: isClaim && b0ClaimIdSet.has(record.projectedId),
          isFact,
          isClaim: !isFact,
          isClaimSeed: isClaim && b0ClaimIdSet.has(record.projectedId),
          evidence: visibleEvidence(record, record.item.sourceImport?.locator ?? record.item.sourcePath ?? record.item.contentRef?.locator ?? ""),
          source: record.item,
        };
      }),
      ...dynamicInferenceRecords.map((record) => ({
        id: record.projectedId,
        nodeKind: "inference",
        layer: record.item.sourceImport?.bundleId ? "external-import-staging" : "loop-delta",
        governanceState: record.governanceState,
        closureEligible: record.closureEligible,
        sourceLayer: record.sourceLayer,
        operationKind: record.operationKind,
        displayName: record.displayName,
        title: visibleTitle(record),
        statement: visibleStatement(record, record.item.statement ?? record.item.applicability?.text ?? record.item.applicability ?? record.item.argument ?? ""),
        objectType: "Inference",
        researchRelation: record.item.sourceImport?.bundleId
          ? "外部导入 · 待独立复核"
          : record.operationKind === "organization"
            ? `本${temporalUnitLabel}增量 · Inference · 组织 Fact`
            : `本${temporalUnitLabel}增量 · Inference · 证明 Claim`,
        status: record.item.evidence?.status ?? "documented",
        evidence: visibleEvidence(record, record.item.sourceImport?.locator ?? record.item.argument ?? record.item.contentRef?.locator ?? ""),
        source: record.item,
      })),
    ];
    const nodeById = new Map([...formalNodes, ...dynamicNodes].map((node) => [node.id, node]));

    const inferenceEdges = (record) => [
      ...record.premises.map((source) => ({ source: projectEndpoint(source), target: record.projectedId, relation: "premise" })),
      { source: record.projectedId, target: projectEndpoint(record.conclusion), relation: "conclusion" },
    ];
    const formalEdges = formalInferenceRecords.flatMap(inferenceEdges);

    const loopDeltaIds = (loop) => {
      const delta = loop.deltaIds;
      const objectDelta = delta && typeof delta === "object" && !Array.isArray(delta) ? delta : {};
      return unique([
        ...(Array.isArray(delta) ? delta : Array.isArray(objectDelta.ids) ? objectDelta.ids : []),
        ...(objectDelta.entryIds ?? []),
        ...(objectDelta.inferenceIds ?? []),
        ...(loop.newEntryIds ?? []),
        ...(loop.newInferenceIds ?? []),
        // Compatibility input only: this is intentionally not copied into the
        // Gamma batch API, whose public name is deltaIds.
        ...(Array.isArray(loop.candidateIds) ? loop.candidateIds : []),
      ].map(endpointId));
    };
    const loops = Object.freeze((data.loops ?? []).map((loop, index) => ({ loop, index }))
      .sort((left, right) => {
        const leftValue = loopSortValue(left.loop);
        const rightValue = loopSortValue(right.loop);
        return leftValue != null && rightValue != null ? leftValue - rightValue : left.index - right.index;
      })
      .map(({ loop }) => loop));

    function resolveVisibleEntry(value, fallback) {
      const id = projectEndpoint(value);
      return visibleEntryIds.has(id) ? id : fallback;
    }

    function loopIdentity(loop, index) {
      const sourceLabel = String(loop.displayLabel ?? loop.label ?? "").trim();
      const match = sourceLabel.match(/^(计算|证明|路线判断)\s+(\d+)$/u);
      if (match) return { displayLabel: `${match[1]} ${match[2]}`, loopKind: match[1] === "计算" ? "calculation" : match[1] === "证明" ? "proof" : "route_judgment", isMathematicalLoop: true };
      if (loop.runKind === "pedagogical_reconstruction") return { displayLabel: `演示步骤 ${index + 1}`, loopKind: "pedagogical_reconstruction", isMathematicalLoop: false };
      if (["source_projection", "stock_reconstruction"].includes(loop.runKind)) return { displayLabel: `维护事件 ${index + 1}`, loopKind: loop.runKind, isMathematicalLoop: false };
      return { displayLabel: `历史事件 ${index + 1}`, loopKind: loop.loopKind ?? loop.runKind ?? "historical_event", isMathematicalLoop: false };
    }

    function projectLoop(loop, index) {
      const sourceDeltaIds = loopDeltaIds(loop);
      const completed = loop.resultState === "completed" || loop.status === "完成";
      const identity = loopIdentity(loop, index);
      const deltaRecords = (completed ? sourceDeltaIds : []).map((id) => entryRecordBySourceId.get(id) ?? sourceInferenceById.get(id))
        .filter((record) => record?.projectable && record.governanceState !== "rejected");
      const projectedSourceIds = new Set(deltaRecords.map((record) => record.id));
      const excludedDeltaIds = sourceDeltaIds.filter((id) => !projectedSourceIds.has(id));
      const deltaNodes = uniqueById(deltaRecords.map((record) => nodeById.get(record.projectedId)).filter(Boolean));
      const deltaNodeIds = new Set(deltaNodes.map((node) => node.id));
      const deltaEntryIds = deltaNodes.filter((node) => node.nodeKind === "entry").map((node) => node.id);
      const deltaInferenceIds = deltaNodes.filter((node) => node.nodeKind === "inference").map((node) => node.id);
      const edges = deltaRecords.filter((record) => record.operationKind).flatMap(inferenceEdges);
      const targetEntryId = resolveVisibleEntry(loop.targetEntryId, currentGoalId);
      const focusEntryId = resolveVisibleEntry(loop.focusEntryId, targetEntryId);
      const usedEntryIds = unique((loop.usedEntryIds ?? []).map(projectEndpoint)).filter((id) => visibleEntryIds.has(id));
      const contextIds = unique([targetEntryId, focusEntryId, ...usedEntryIds, ...edges.flatMap((edge) => [edge.source, edge.target])])
        .filter((id) => nodeById.has(id));
      return {
        id: loop.id,
        displayLabel: identity.displayLabel,
        loopKind: identity.loopKind,
        isMathematicalLoop: identity.isMathematicalLoop,
        title: removeWorkflowWords(loop.title ?? loop.action ?? identity.displayLabel),
        action: removeWorkflowWords(loop.action ?? loop.title ?? identity.displayLabel),
        targetEntryId,
        focusEntryId,
        usedEntryIds,
        deltaIds: Object.freeze(unique(deltaNodes.map((node) => node.id))),
        deltaEntryIds: Object.freeze(deltaEntryIds),
        deltaInferenceIds: Object.freeze(deltaInferenceIds),
        excludedDeltaIds: Object.freeze(excludedDeltaIds),
        nodes: Object.freeze(deltaNodes),
        edges: Object.freeze(edges),
        anchorIds: Object.freeze(unique([focusEntryId, targetEntryId, ...usedEntryIds]).filter((id) => nodeById.has(id))),
        focusIds: Object.freeze(unique([...contextIds, ...deltaEntryIds, ...deltaInferenceIds])),
        effect: removeWorkflowWords(loop.result?.effect ?? loop.resultEffect ?? loop.resultSummary ?? loop.summary ?? (typeof loop.delta === "string" ? loop.delta : ""))
          || (!completed ? `本${temporalUnitLabel} ${loop.status ?? loop.resultState ?? "未完成"}，没有改变数学图。`
            : excludedDeltaIds.length ? `本${temporalUnitLabel}没有产生可进入数学图的 Entry 或 Inference。` : `本${temporalUnitLabel}已完成，数学图没有结构变化。`),
        remainingGap: removeWorkflowWords(loop.remainingGap ?? loop.result?.remainingGap ?? "") || "未记录独立的剩余缺口。",
        resultState: loop.resultState,
        status: loop.status,
        statusLabel: completed ? "完成" : loop.status ?? loop.resultState ?? "未完成",
        mathematicalDeltaApplied: completed && deltaNodes.length > 0,
        source: loop,
      };
    }

    const loopRecords = Object.freeze(loops.map(projectLoop).map((loop) => Object.freeze({ ...loop, summary: loop.effect })));
    // Progress is a faithful replay of every Alpha Loop. Completed Loops may
    // change the mathematical graph; aborted or failed Loops remain visible as
    // research-history steps but never establish mathematical content.
    const progressBatches = loopRecords;
    const dynamicIds = new Set(progressBatches.flatMap((loop) => loop.nodes.map((node) => node.id)));
    const externalImportRecords = [...dynamicEntryRecords, ...dynamicInferenceRecords]
      .filter((record) => record.sourceLayer === "external-import");
    const externalImportIds = new Set(externalImportRecords.map((record) => record.projectedId));
    const externalImportNodes = externalImportRecords.map((record) => nodeById.get(record.projectedId)).filter(Boolean);
    const externalImportEdges = externalImportRecords.filter((record) => record.operationKind).flatMap(inferenceEdges);
    const explicitLoopReferences = new Set(loopRecords.flatMap((loop) => [
      loop.targetEntryId,
      loop.focusEntryId,
      ...loop.usedEntryIds,
      ...loop.deltaIds,
    ]));
    const eligibleProjectInferenceReferences = new Set(visibleInferenceRecords
      .filter((record) => record.sourceLayer !== "external-import" && record.closureEligible)
      .flatMap((record) => [...record.premises.map(projectEndpoint), projectEndpoint(record.conclusion)]));
    const bundleConnectedExternalIds = new Set(externalImportEdges
      .flatMap((edge) => [edge.source, edge.target])
      .filter((id) => externalImportIds.has(id)));
    const externalImportUsageById = Object.freeze(Object.fromEntries([...externalImportIds].map((id) => {
      const usage = explicitLoopReferences.has(id) || eligibleProjectInferenceReferences.has(id)
        ? "project-consumed"
        : bundleConnectedExternalIds.has(id) ? "bundle-internal-only" : "isolated-inventory";
      const node = nodeById.get(id);
      if (node) node.externalImportUsage = usage;
      return [id, usage];
    })));
    const externalImportStats = Object.freeze({
      total: externalImportIds.size,
      projectConsumed: Object.values(externalImportUsageById).filter((value) => value === "project-consumed").length,
      bundleInternalOnly: Object.values(externalImportUsageById).filter((value) => value === "bundle-internal-only").length,
      isolatedInventory: Object.values(externalImportUsageById).filter((value) => value === "isolated-inventory").length,
    });
    const baseNodes = uniqueById([
      ...formalNodes.filter((node) => !dynamicIds.has(node.id) || node.isFoundation || node.goalLevel),
      ...externalImportNodes,
    ]);
    const allProjectedNodes = uniqueById([...formalNodes, ...externalImportNodes, ...progressBatches.flatMap((loop) => loop.nodes)]);
    const edgeKey = (edge) => `${edge.source}\u0000${edge.target}\u0000${edge.relation}`;
    const allProjectedEdges = [...formalEdges, ...externalImportEdges, ...progressBatches.flatMap((loop) => loop.edges)]
      .filter((edge, index, edges) => edge.source && edge.target && edges.findIndex((candidate) => edgeKey(candidate) === edgeKey(edge)) === index);

    function claimStatesThrough(count) {
      const bounded = Math.max(0, Math.min(progressBatches.length, Number(count) || 0));
      const nodes = uniqueById([...baseNodes, ...progressBatches.slice(0, bounded).flatMap((batch) => batch.nodes)]);
      const available = new Set(nodes.map((node) => node.id));
      const availableFacts = new Set(factEntryIds.filter((id) => available.has(id)
        && entryRecordByProjectedId.get(id)?.closureEligible));
      const establishedClaims = new Set([
        ...b0ClaimEntryIds,
      ].filter((id) => available.has(id) && claimIdSet.has(id)
        && entryRecordByProjectedId.get(id)?.closureEligible));
      const availableProofs = visibleInferenceRecords.filter((record) => available.has(record.projectedId)
        && record.operationKind === "proof" && record.closureEligible);
      let changed = true;
      while (changed) {
        changed = false;
        availableProofs.forEach((record) => {
          const conclusionId = projectEndpoint(record.conclusion);
          if (!available.has(conclusionId) || !claimIdSet.has(conclusionId) || establishedClaims.has(conclusionId)
            || !entryRecordByProjectedId.get(conclusionId)?.closureEligible) return;
          const ready = record.premises.map(projectEndpoint).every((id) => availableFacts.has(id) || establishedClaims.has(id));
          if (ready) {
            establishedClaims.add(conclusionId);
            changed = true;
          }
        });
      }
      return Object.freeze(Object.fromEntries(claimEntryIds.map((id) => [id, establishedClaims.has(id) ? "established" : "open"])));
    }

    function c0EntryIdsThrough(count) {
      const bounded = Math.max(0, Math.min(progressBatches.length, Number(count) || 0));
      const nodes = uniqueById([...baseNodes, ...progressBatches.slice(0, bounded).flatMap((batch) => batch.nodes)]);
      const available = new Set(nodes.map((node) => node.id));
      return Object.freeze(unique([
        ...factEntryIds.filter((id) => available.has(id) && entryRecordByProjectedId.get(id)?.closureEligible),
        ...b0ClaimEntryIds.filter((id) => available.has(id) && entryRecordByProjectedId.get(id)?.closureEligible),
      ]));
    }

    function layoutThrough(count) {
      const bounded = Math.max(0, Math.min(progressBatches.length, Number(count) || 0));
      const rawNodes = uniqueById([...baseNodes, ...progressBatches.slice(0, bounded).flatMap((batch) => batch.nodes)]);
      const claimStates = claimStatesThrough(bounded);
      const nodes = rawNodes.map((node) => node.isClaim
        ? { ...node, claimState: claimStates[node.id] ?? "open", status: claimStates[node.id] ?? "open" }
        : node);
      const available = new Set(nodes.map((node) => node.id));
      return { nodes, edges: allProjectedEdges.filter((edge) => available.has(edge.source) && available.has(edge.target)) };
    }

    function progressLayoutThrough(count) {
      const bounded = Math.max(0, Math.min(progressBatches.length, Number(count) || 0));
      const current = layoutThrough(bounded);
      const available = new Set(current.nodes.map((node) => node.id));
      const edges = progressBatches.slice(0, bounded).flatMap((batch) => batch.edges).filter((edge, index, items) => {
        if (!available.has(edge.source) || !available.has(edge.target)) return false;
        return items.findIndex((candidate) => edgeKey(candidate) === edgeKey(edge)) === index;
      });
      return { nodes: current.nodes, edges };
    }

    const targetGroups = new Map();
    loopRecords.forEach((loop) => {
      targetGroups.set(loop.targetEntryId, [...(targetGroups.get(loop.targetEntryId) ?? []), loop]);
    });
    if (!targetGroups.has(currentGoalId)) targetGroups.set(currentGoalId, []);
    const orderedTargets = [...targetGroups.keys()].sort((left, right) => {
      if (left === currentGoalId) return -1;
      if (right === currentGoalId) return 1;
      const leftIndex = loopRecords.findIndex((loop) => loop.id === targetGroups.get(left).at(-1)?.id);
      const rightIndex = loopRecords.findIndex((loop) => loop.id === targetGroups.get(right).at(-1)?.id);
      return rightIndex - leftIndex;
    });
    const routes = Object.freeze(orderedTargets.map((targetId, index) => Object.freeze({
      id: `route-${index + 1}`,
      label: options.routeLabelsByTargetId?.[targetId] ?? (targetId === currentGoalId ? "当前路线" : `路线 ${String.fromCharCode(65 + index)}`),
      finalGoalId,
      milestoneId: milestoneIds[0] ?? null,
      currentGoalId: targetId,
      status: targetId === currentGoalId ? "active" : "recent",
    })));

    const sections = Object.freeze((data.chapters ?? []).map((chapter) => {
      const ids = unique([
        ...(chapter.supportEntryIds ?? chapter.entryIds ?? []),
        ...(chapter.formalInferenceIds ?? chapter.inferenceIds ?? []),
        ...(chapter.supportCandidateEntryIds ?? []),
        ...(chapter.candidateInferenceIds ?? []),
      ].map(projectEndpoint));
      return Object.freeze({
        id: chapter.id,
        label: `${chapter.displayLabel ?? "Section"} · ${chapter.title}`,
        nodeIds: Object.freeze(ids.filter((id) => nodeById.has(id))),
        active: (overlay.activeSectionIds ?? []).includes(chapter.id),
      });
    }));

    function presentIds(layout, ids) {
      const available = new Set(layout.nodes.map((node) => node.id));
      return unique(ids).filter((id) => available.has(id));
    }

    function routeView(routeId, layout, limit = RECENT_LOOP_LIMIT) {
      const route = routes.find((item) => item.id === routeId);
      if (!route) throw new Error(`unknown route: ${routeId}`);
      const available = new Set(layout.nodes.map((node) => node.id));
      const recentLoops = loopRecords.filter((loop) => loop.targetEntryId === route.currentGoalId
        && loop.nodes.every((node) => available.has(node.id))).slice(-Math.max(1, Number(limit) || RECENT_LOOP_LIMIT));
      const nodeIds = unique([
        route.finalGoalId,
        route.milestoneId,
        route.currentGoalId,
        ...recentLoops.flatMap((loop) => [...loop.usedEntryIds, ...loop.deltaEntryIds, ...loop.deltaInferenceIds]),
      ]).filter((id) => available.has(id));
      const latest = recentLoops.at(-1);
      return {
        ...route,
        loopIds: recentLoops.map((loop) => loop.id),
        nodeIds,
        latestDeltaIds: latest ? presentIds(layout, latest.deltaIds) : [],
        summary: `当前目标「${entryById.get(route.currentGoalId)?.title ?? route.currentGoalId}」；最近 ${recentLoops.length} 次有效${temporalUnitLabel}构成路线。`,
      };
    }

    function neighborhood(layout, id) {
      const ids = new Set([id]);
      layout.edges.forEach((edge) => {
        if (edge.source === id) ids.add(edge.target);
        if (edge.target === id) ids.add(edge.source);
      });
      return presentIds(layout, [...ids]);
    }

    function relations(layout, id) {
      return {
        previous: unique(layout.edges.filter((edge) => edge.target === id).map((edge) => edge.source)),
        next: unique(layout.edges.filter((edge) => edge.source === id).map((edge) => edge.target)),
      };
    }

    const hasLegacyObjects = allRecords.some((record) => record.mode === "legacy");
    const classificationDiagnostics = Object.freeze({
      mode: hasNativeObjects && hasLegacyObjects ? "mixed-per-object"
        : hasNativeObjects ? "backend-native"
          : compatibilityNames ? "legacy-alpha-compatibility-map" : "source-contract",
      unclassifiedEntryIds: Object.freeze(contractDiagnostics.rejectedEntryIds.filter((id) => entryRecordBySourceId.get(id)?.classification === "unclassified")),
      missingEntryIds: Object.freeze(contractDiagnostics.rejectedEntryIds.filter((id) => !entryRecordBySourceId.get(id)?.classification)),
      rejectedEntryIds: Object.freeze(unique(contractDiagnostics.rejectedEntryIds)),
      rejectedInferenceIds: Object.freeze(unique(inferenceRecords.filter((record) => !record.projectable).map((record) => record.id))),
      issues: Object.freeze(unique(contractDiagnostics.issues)),
      message: contractDiagnostics.issues.length
        ? "部分对象缺少 Gamma 数学图所需的原生语义或数学短名，已拒绝进入图。"
        : contractDiagnostics.rejectedEntryIds.length
          ? "部分旧对象无法在 Fact/Claim 二分中无歧义归类，已留在后端工作记录。"
          : "所有进入图的对象均具备显式数学语义。",
    });

    return Object.freeze({
      schema: "cmath-gamma.math-map-projection/v0.1",
      project: data.project,
      focus: Object.freeze({
        currentGoalId,
        activeSectionIds: Object.freeze([...(overlay.activeSectionIds ?? [])]),
        routeDescription: overlay.routeDescription ?? overlay.route?.description ?? "",
        nextActionDescription: overlay.nextActionDescription ?? "",
      }),
      recentLoopLimit: RECENT_LOOP_LIMIT,
      temporalUnitLabel,
      nodeNaming: options.nodeNaming ?? (hasNativeObjects ? "board-display-name" : "mathematical-title"),
      numberingLedger,
      semanticModel: data.semanticModel ?? null,
      factEntryIds,
      claimEntryIds,
      b0ClaimEntryIds,
      claimSeedEntryIds,
      foundationEntryIds,
      entryClassificationById: Object.freeze(Object.fromEntries(visibleEntryRecords.map((record) => [record.projectedId, record.classification]))),
      classificationDiagnostics,
      externalImportUsageById,
      externalImportStats,
      goalHierarchy,
      routes,
      loops: loopRecords,
      sections,
      progressBatches,
      c0EntryIdsThrough,
      claimStatesThrough,
      layoutThrough,
      progressLayoutThrough,
      routeView,
      presentIds,
      neighborhood,
      relations,
    });
  }

  return Object.freeze({
    CAPABILITY_ID,
    SEMANTIC_CONTRACT,
    RECENT_LOOP_LIMIT,
    capabilityDependencies: Object.freeze({
      semantics: semantics?.CAPABILITY_ID ?? null,
      naming: naming?.CAPABILITY_ID ?? null,
      loopProgress: loopProgress?.CAPABILITY_ID ?? null,
    }),
    create,
    directEntryClass,
    directOperationKind,
    hasNativeName,
  });
});
