/** Shared Map Library record rules for browser and Node consumers. */
(function publishMapLibraryCore(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMapLibraryCore = api;
})(typeof window !== "undefined" ? window : globalThis, function createMapLibraryCore(root) {
  "use strict";

  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const MAP_RECORD_SCHEMA = "cmath.local-map-record/v1";
  const GENERATED_MAP_SCHEMA = "cmath.paper-to-map-result/v1";
  const LIBRARY_STATE_SCHEMA = "cmath.local-library-state/v1";
  const BACKUP_SCHEMA = "cmath.math-map.library-backup/v1";
  let nodeCanonicalSemantics = null;

  function loadDependency(globalName, localPath) {
    if (root?.[globalName]) return root[globalName];
    if (typeof require !== "function") return null;
    return require(localPath);
  }

  function canonicalSemantics() {
    if (root?.GammaMathMapSemanticsV3) return root.GammaMathMapSemanticsV3;
    if (typeof require !== "function") return root?.GammaMathMapSemantics ?? null;
    if (nodeCanonicalSemantics) return nodeCanonicalSemantics;
    const previousGlobalSemantics = globalThis.GammaMathMapSemantics;
    try {
      nodeCanonicalSemantics = require(
        "../../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js",
      );
      return nodeCanonicalSemantics;
    } finally {
      if (previousGlobalSemantics === undefined) delete globalThis.GammaMathMapSemantics;
      else globalThis.GammaMathMapSemantics = previousGlobalSemantics;
    }
  }

  function canonicalAdapter() {
    return loadDependency("GammaCanonicalMathMapAdapter", "../math-map/canonical-math-map-adapter.js");
  }

  function checkpointStore() {
    return loadDependency(
      "CMathPaperImportCheckpointStore",
      "../paper-import/workflow/checkpoint-store.js",
    );
  }

  function cloneJson(value) {
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function validateProjectView(data) {
    if (data?.schema !== PROJECT_VIEW_SCHEMA
      || !data.project
      || !Array.isArray(data.entries)
      || !Array.isArray(data.inferences)) {
      throw new TypeError(`expected ${PROJECT_VIEW_SCHEMA} with project, entries and inferences`);
    }
    return data;
  }

  function validateCanonicalMathMap(data) {
    const semantics = canonicalSemantics();
    if (typeof semantics?.deriveMathState !== "function") {
      throw new Error("标准数学地图 v3 校验能力没有加载");
    }
    semantics.deriveMathState(data);
    return data;
  }

  function isCanonicalMathMap(data) {
    try {
      validateCanonicalMathMap(data);
      return Object.keys(data).sort().join(",") === "b0ClaimEntryIds,entries,inferences,negationPairs";
    } catch {
      return false;
    }
  }

  function validateSupportedMap(data) {
    return isCanonicalMathMap(data) ? validateCanonicalMathMap(data) : validateProjectView(data);
  }

  function generatedMapView(value) {
    return value?.schema === GENERATED_MAP_SCHEMA ? value.map : value;
  }

  function sanitizeGeneratedResult(value) {
    if (value?.schema !== GENERATED_MAP_SCHEMA) return null;
    if (isCanonicalMathMap(value.map)) return cloneJson(value);
    const clean = checkpointStore()?.sanitizeStageArtifact?.("closure", value);
    if (clean?.schema !== GENERATED_MAP_SCHEMA || clean.map?.schema !== PROJECT_VIEW_SCHEMA) {
      throw new TypeError("论文解析结果不符合 Generated Map 合同");
    }
    return clean;
  }

  function normalizeMapRecord(record) {
    const generatedResult = record?.generatedResult === undefined
      ? null
      : sanitizeGeneratedResult(record.generatedResult);
    if (record?.generatedResult !== undefined && generatedResult?.schema !== GENERATED_MAP_SCHEMA) {
      throw new TypeError(`expected ${GENERATED_MAP_SCHEMA} generatedResult`);
    }
    const data = validateSupportedMap(generatedResult?.map ?? record?.data);
    const id = String(record?.id || `imported:${data.project?.id || "map"}`).trim();
    const title = String(record?.title || data.project?.title || id).trim();
    const numberingLedger = isCanonicalMathMap(data)
      ? canonicalAdapter()?.create(data, { projectId: id, numberingLedger: record?.numberingLedger })?.numberingLedger
      : null;
    if (isCanonicalMathMap(data) && !numberingLedger) {
      throw new Error("标准数学地图未能生成命名编号账本");
    }
    return {
      schema: MAP_RECORD_SCHEMA,
      id,
      title,
      boundaryLabel: String(record?.boundaryLabel || data.channelOptions?.boundaryLabel || "本地导入 · 数学地图").trim(),
      importedAt: Number.isFinite(record?.importedAt) ? record.importedAt : Date.now(),
      isImported: true,
      data,
      ...(numberingLedger ? { numberingLedger } : {}),
      ...(generatedResult ? { generatedResult } : {}),
    };
  }

  function normalizeCustomFolders(folders) {
    if (!Array.isArray(folders)) return [];
    const seen = new Set();
    const result = [];
    for (const folder of folders) {
      if (!folder || typeof folder !== "object") continue;
      const id = String(folder.id || "").trim();
      const name = String(folder.name || "").trim();
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        name,
        createdAt: Number.isFinite(folder.createdAt) ? folder.createdAt : Date.now(),
      });
    }
    return result;
  }

  function normalizeAssignments(assignments, validFolderIds) {
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) return {};
    const result = {};
    for (const [mapId, folderId] of Object.entries(assignments)) {
      const key = String(mapId || "").trim();
      const value = String(folderId || "").trim();
      if (key && value && (!validFolderIds
        || validFolderIds.has(value)
        || value === "myMaps"
        || value === "builtin"
        || value === "curated")) {
        result[key] = value;
      }
    }
    return result;
  }

  function normalizeOrders(orders) {
    if (!orders || typeof orders !== "object" || Array.isArray(orders)) return {};
    const result = {};
    for (const [folderId, list] of Object.entries(orders)) {
      const folderKey = String(folderId || "").trim();
      if (!folderKey || !Array.isArray(list)) continue;
      const seen = new Set();
      const cleanList = [];
      for (const item of list) {
        const id = String(item || "").trim();
        if (id && !seen.has(id)) {
          seen.add(id);
          cleanList.push(id);
        }
      }
      result[folderKey] = cleanList;
    }
    return result;
  }

  function normalizeCollapsed(collapsed) {
    if (!collapsed || typeof collapsed !== "object" || Array.isArray(collapsed)) {
      return { curated: false, myMaps: false, builtin: false };
    }
    const result = {
      curated: Boolean(collapsed.curated),
      myMaps: Boolean(collapsed.myMaps),
      builtin: Boolean(collapsed.builtin),
    };
    for (const [key, value] of Object.entries(collapsed)) {
      const cleanKey = String(key || "").trim();
      if (cleanKey && !["curated", "myMaps", "builtin"].includes(cleanKey)) {
        result[cleanKey] = Boolean(value);
      }
    }
    return result;
  }

  function normalizeLibraryState(raw) {
    const customFolders = normalizeCustomFolders(raw?.customFolders);
    const folderIds = new Set(["curated", "myMaps", "builtin", ...customFolders.map((folder) => folder.id)]);
    return {
      schema: LIBRARY_STATE_SCHEMA,
      customFolders,
      assignments: normalizeAssignments(raw?.assignments, folderIds),
      orders: normalizeOrders(raw?.orders),
      collapsed: normalizeCollapsed(raw?.collapsed),
      updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : Date.now(),
    };
  }

  function validateBackupPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new TypeError("备份文件格式无效：内容必须是 JSON 对象");
    }
    if (payload.schema !== BACKUP_SCHEMA && payload.schema !== "cmath.local-library-backup/v1") {
      throw new TypeError(`未知或不受支持的备份版本：${payload.schema || "未知"}`);
    }
    if (!Array.isArray(payload.maps)) {
      throw new TypeError("备份文件缺少地图数据列表 (maps)");
    }

    const validMaps = [];
    for (const map of payload.maps) {
      if (!map || typeof map !== "object") continue;
      const id = String(map.id || "").trim();
      if (!id) continue;
      try {
        validMaps.push(normalizeMapRecord({ ...map, id }));
      } catch {
        // Invalid maps and malformed VNext envelopes are ignored during restore.
      }
    }

    return {
      schema: BACKUP_SCHEMA,
      version: 1,
      exportedAt: Number.isFinite(payload.exportedAt) ? payload.exportedAt : Date.now(),
      maps: validMaps,
      library: payload.library && typeof payload.library === "object" ? payload.library : {},
    };
  }

  function mergeLibraryBackup(currentMaps = [], currentLibraryState = {}, backupPayload = {}, reservedIds = []) {
    const validatedBackup = validateBackupPayload(backupPayload);
    const existingMapById = new Map();
    for (const map of currentMaps || []) {
      if (map && typeof map.id === "string") existingMapById.set(map.id, map);
    }

    const allUsedIds = new Set([
      ...existingMapById.keys(),
      ...(Array.isArray(reservedIds) ? reservedIds : []),
    ]);
    const idRenameMap = new Map();
    const mergedMaps = [...existingMapById.values()];
    const newAddedMaps = [];

    function addRenamedMap(incomingMap) {
      let candidate = `${incomingMap.id}-restored`;
      let counter = 2;
      while (allUsedIds.has(candidate)) {
        candidate = `${incomingMap.id}-restored-${counter}`;
        counter += 1;
      }
      allUsedIds.add(candidate);
      idRenameMap.set(incomingMap.id, candidate);
      const renamedMap = {
        ...incomingMap,
        id: candidate,
        title: incomingMap.title ? `${incomingMap.title} (备份导入)` : candidate,
      };
      mergedMaps.push(renamedMap);
      newAddedMaps.push(renamedMap);
    }

    for (const incomingMap of validatedBackup.maps) {
      if (existingMapById.has(incomingMap.id)) {
        const existing = existingMapById.get(incomingMap.id);
        const isIdentical = existing.title === incomingMap.title
          && JSON.stringify(existing.data) === JSON.stringify(incomingMap.data);
        if (isIdentical) {
          idRenameMap.set(incomingMap.id, incomingMap.id);
        } else {
          addRenamedMap(incomingMap);
        }
      } else if (allUsedIds.has(incomingMap.id)) {
        addRenamedMap(incomingMap);
      } else {
        allUsedIds.add(incomingMap.id);
        idRenameMap.set(incomingMap.id, incomingMap.id);
        mergedMaps.push(incomingMap);
        newAddedMaps.push(incomingMap);
      }
    }

    const mergedFolders = normalizeCustomFolders(currentLibraryState.customFolders);
    const existingFolderIds = new Set(mergedFolders.map((folder) => folder.id));
    const existingFolderNames = new Map(
      mergedFolders.map((folder) => [folder.name.toLowerCase().trim(), folder]),
    );
    const folderIdMap = new Map([
      ["myMaps", "myMaps"],
      ["builtin", "builtin"],
      ["curated", "curated"],
    ]);

    const incomingFolders = normalizeCustomFolders(validatedBackup.library.customFolders);
    for (const incomingFolder of incomingFolders) {
      const nameKey = incomingFolder.name.toLowerCase().trim();
      if (existingFolderNames.has(nameKey)) {
        folderIdMap.set(incomingFolder.id, existingFolderNames.get(nameKey).id);
      } else if (existingFolderIds.has(incomingFolder.id)) {
        const newFolderId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        folderIdMap.set(incomingFolder.id, newFolderId);
        const newFolder = { id: newFolderId, name: incomingFolder.name, createdAt: incomingFolder.createdAt };
        mergedFolders.push(newFolder);
        existingFolderIds.add(newFolderId);
        existingFolderNames.set(nameKey, newFolder);
      } else {
        folderIdMap.set(incomingFolder.id, incomingFolder.id);
        mergedFolders.push(incomingFolder);
        existingFolderIds.add(incomingFolder.id);
        existingFolderNames.set(nameKey, incomingFolder);
      }
    }

    const mergedAssignments = { ...normalizeAssignments(currentLibraryState.assignments) };
    const incomingAssignments = validatedBackup.library.assignments;
    if (incomingAssignments && typeof incomingAssignments === "object" && !Array.isArray(incomingAssignments)) {
      for (const [incomingMapId, incomingFolderId] of Object.entries(incomingAssignments)) {
        const finalMapId = idRenameMap.get(incomingMapId) || incomingMapId;
        const finalFolderId = folderIdMap.get(incomingFolderId) || incomingFolderId;
        if (!mergedAssignments[finalMapId]) mergedAssignments[finalMapId] = finalFolderId;
      }
    }

    const mergedOrders = { ...normalizeOrders(currentLibraryState.orders) };
    if (!Array.isArray(mergedOrders.myMaps)) mergedOrders.myMaps = [];
    if (!Array.isArray(mergedOrders.builtin)) mergedOrders.builtin = [];
    const incomingOrders = validatedBackup.library.orders;
    if (incomingOrders && typeof incomingOrders === "object" && !Array.isArray(incomingOrders)) {
      for (const [incomingFolderId, incomingOrder] of Object.entries(incomingOrders)) {
        if (!Array.isArray(incomingOrder)) continue;
        const finalFolderId = folderIdMap.get(incomingFolderId) || incomingFolderId;
        if (!Array.isArray(mergedOrders[finalFolderId])) mergedOrders[finalFolderId] = [];
        for (const oldMapId of incomingOrder) {
          const finalMapId = idRenameMap.get(oldMapId) || oldMapId;
          if (!mergedOrders[finalFolderId].includes(finalMapId)) {
            mergedOrders[finalFolderId].push(finalMapId);
          }
        }
      }
    }

    for (const map of mergedMaps) {
      const assignedFolder = mergedAssignments[map.id] || "myMaps";
      if (!Array.isArray(mergedOrders[assignedFolder])) mergedOrders[assignedFolder] = [];
      if (!mergedOrders[assignedFolder].includes(map.id)) mergedOrders[assignedFolder].push(map.id);
    }

    const mergedCollapsed = { ...normalizeCollapsed(currentLibraryState.collapsed) };
    const incomingCollapsed = validatedBackup.library.collapsed;
    if (incomingCollapsed && typeof incomingCollapsed === "object" && !Array.isArray(incomingCollapsed)) {
      for (const [incomingFolderId, isCollapsed] of Object.entries(incomingCollapsed)) {
        const finalFolderId = folderIdMap.get(incomingFolderId) || incomingFolderId;
        if (mergedCollapsed[finalFolderId] === undefined) {
          mergedCollapsed[finalFolderId] = Boolean(isCollapsed);
        }
      }
    }

    return {
      mergedMaps,
      newAddedMaps,
      libraryState: {
        schema: LIBRARY_STATE_SCHEMA,
        customFolders: mergedFolders,
        assignments: mergedAssignments,
        orders: mergedOrders,
        collapsed: mergedCollapsed,
        updatedAt: Date.now(),
      },
      stats: {
        totalMaps: mergedMaps.length,
        addedMaps: newAddedMaps.length,
        totalFolders: mergedFolders.length,
      },
    };
  }

  return Object.freeze({
    BACKUP_SCHEMA,
    GENERATED_MAP_SCHEMA,
    LIBRARY_STATE_SCHEMA,
    MAP_RECORD_SCHEMA,
    PROJECT_VIEW_SCHEMA,
    generatedMapView,
    isCanonicalMathMap,
    mergeLibraryBackup,
    normalizeAssignments,
    normalizeCollapsed,
    normalizeCustomFolders,
    normalizeLibraryState,
    normalizeMapRecord,
    normalizeOrders,
    sanitizeGeneratedResult,
    validateCanonicalMathMap,
    validateBackupPayload,
    validateProjectView,
    validateSupportedMap,
  });
});
