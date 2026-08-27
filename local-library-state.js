const fs = require("fs");
const path = require("path");
const { normalizeMapRecord } = require("./local-map-store.js");

const LIBRARY_STATE_SCHEMA = "cmath.local-library-state/v1";

function normalizeCustomFolders(folders) {
  if (!Array.isArray(folders)) return [];
  const seen = new Set();
  const result = [];
  for (const f of folders) {
    if (!f || typeof f !== "object") continue;
    const id = String(f.id || "").trim();
    const name = String(f.name || "").trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      name,
      createdAt: Number.isFinite(f.createdAt) ? f.createdAt : Date.now(),
    });
  }
  return result;
}

function normalizeAssignments(assignments, validFolderIds) {
  if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) return {};
  const result = {};
  for (const [mapId, folderId] of Object.entries(assignments)) {
    const key = String(mapId || "").trim();
    const val = String(folderId || "").trim();
    if (key && val && (!validFolderIds || validFolderIds.has(val) || val === "myMaps" || val === "builtin" || val === "curated")) {
      result[key] = val;
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
  for (const [key, val] of Object.entries(collapsed)) {
    const k = String(key || "").trim();
    if (k && !["curated", "myMaps", "builtin"].includes(k)) {
      result[k] = Boolean(val);
    }
  }
  return result;
}

function normalizeLibraryState(raw) {
  const customFolders = normalizeCustomFolders(raw?.customFolders);
  const folderIds = new Set(["curated", "myMaps", "builtin", ...customFolders.map((f) => f.id)]);
  const assignments = normalizeAssignments(raw?.assignments, folderIds);
  const orders = normalizeOrders(raw?.orders);
  const collapsed = normalizeCollapsed(raw?.collapsed);
  return {
    schema: LIBRARY_STATE_SCHEMA,
    customFolders,
    assignments,
    orders,
    collapsed,
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : Date.now(),
  };
}

function createLocalLibraryStateStore(filePath) {
  function ensureDirectory() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  }

  function read() {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return normalizeLibraryState(parsed);
      }
    } catch {
      // Malformed or unreadable file returns default clean state
    }
    return normalizeLibraryState({});
  }

  function write(state) {
    ensureDirectory();
    const normalized = normalizeLibraryState(state);
    const temporary = filePath + "." + process.pid + "." + Date.now() + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(normalized, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(temporary, filePath);
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Ignore chmod error if platform restricts
    }
    return normalized;
  }

  return { filePath, read, write };
}

const BACKUP_SCHEMA = "cmath.math-map.library-backup/v1";

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
  for (const m of payload.maps) {
    if (!m || typeof m !== "object") continue;
    const id = String(m.id || "").trim();
    if (!id) continue;
    try {
      validMaps.push(normalizeMapRecord({ ...m, id }));
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
  (currentMaps || []).forEach((m) => {
    if (m && typeof m.id === "string") existingMapById.set(m.id, m);
  });

  const allUsedIds = new Set([
    ...Array.from(existingMapById.keys()),
    ...(Array.isArray(reservedIds) ? reservedIds : []),
  ]);

  const idRenameMap = new Map();
  const mergedMaps = [...Array.from(existingMapById.values())];
  const newAddedMaps = [];

  for (const incMap of validatedBackup.maps) {
    if (existingMapById.has(incMap.id)) {
      const existing = existingMapById.get(incMap.id);
      const isIdentical =
        existing.title === incMap.title &&
        JSON.stringify(existing.data) === JSON.stringify(incMap.data);

      if (isIdentical) {
        idRenameMap.set(incMap.id, incMap.id);
      } else {
        let candidate = `${incMap.id}-restored`;
        let counter = 2;
        while (allUsedIds.has(candidate)) {
          candidate = `${incMap.id}-restored-${counter}`;
          counter++;
        }
        allUsedIds.add(candidate);
        idRenameMap.set(incMap.id, candidate);
        const renamedMap = {
          ...incMap,
          id: candidate,
          title: incMap.title ? `${incMap.title} (备份导入)` : candidate,
        };
        mergedMaps.push(renamedMap);
        newAddedMaps.push(renamedMap);
      }
    } else {
      if (allUsedIds.has(incMap.id)) {
        let candidate = `${incMap.id}-restored`;
        let counter = 2;
        while (allUsedIds.has(candidate)) {
          candidate = `${incMap.id}-restored-${counter}`;
          counter++;
        }
        allUsedIds.add(candidate);
        idRenameMap.set(incMap.id, candidate);
        const renamedMap = {
          ...incMap,
          id: candidate,
          title: incMap.title ? `${incMap.title} (备份导入)` : candidate,
        };
        mergedMaps.push(renamedMap);
        newAddedMaps.push(renamedMap);
      } else {
        allUsedIds.add(incMap.id);
        idRenameMap.set(incMap.id, incMap.id);
        mergedMaps.push(incMap);
        newAddedMaps.push(incMap);
      }
    }
  }

  // Custom Folders Merge
  const mergedFolders = normalizeCustomFolders(currentLibraryState.customFolders);
  const existingFolderIds = new Set(mergedFolders.map((f) => f.id));
  const existingFolderNames = new Map(mergedFolders.map((f) => [f.name.toLowerCase().trim(), f]));
  const folderIdMap = new Map([
    ["myMaps", "myMaps"],
    ["builtin", "builtin"],
    ["curated", "curated"],
  ]);

  const incomingFolders = normalizeCustomFolders(validatedBackup.library.customFolders);
  for (const incFolder of incomingFolders) {
    const nameKey = incFolder.name.toLowerCase().trim();
    if (existingFolderNames.has(nameKey)) {
      folderIdMap.set(incFolder.id, existingFolderNames.get(nameKey).id);
    } else if (existingFolderIds.has(incFolder.id)) {
      const newFolderId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      folderIdMap.set(incFolder.id, newFolderId);
      const newFolder = { id: newFolderId, name: incFolder.name, createdAt: incFolder.createdAt };
      mergedFolders.push(newFolder);
      existingFolderIds.add(newFolderId);
      existingFolderNames.set(nameKey, newFolder);
    } else {
      folderIdMap.set(incFolder.id, incFolder.id);
      mergedFolders.push(incFolder);
      existingFolderIds.add(incFolder.id);
      existingFolderNames.set(nameKey, incFolder);
    }
  }

  // Assignments Merge
  const mergedAssignments = { ...normalizeAssignments(currentLibraryState.assignments) };
  const incomingAssignments = validatedBackup.library.assignments;
  if (incomingAssignments && typeof incomingAssignments === "object" && !Array.isArray(incomingAssignments)) {
    for (const [incMapId, incFolderId] of Object.entries(incomingAssignments)) {
      const finalMapId = idRenameMap.get(incMapId) || incMapId;
      const finalFolderId = folderIdMap.get(incFolderId) || incFolderId;
      if (!mergedAssignments[finalMapId]) {
        mergedAssignments[finalMapId] = finalFolderId;
      }
    }
  }

  // Orders Merge
  const mergedOrders = { ...normalizeOrders(currentLibraryState.orders) };
  if (!Array.isArray(mergedOrders.myMaps)) mergedOrders.myMaps = [];
  if (!Array.isArray(mergedOrders.builtin)) mergedOrders.builtin = [];

  const incomingOrders = validatedBackup.library.orders;
  if (incomingOrders && typeof incomingOrders === "object" && !Array.isArray(incomingOrders)) {
    for (const [incFolderId, incOrderList] of Object.entries(incomingOrders)) {
      if (!Array.isArray(incOrderList)) continue;
      const finalFolderId = folderIdMap.get(incFolderId) || incFolderId;
      if (!Array.isArray(mergedOrders[finalFolderId])) mergedOrders[finalFolderId] = [];
      for (const oldMapId of incOrderList) {
        const finalMapId = idRenameMap.get(oldMapId) || oldMapId;
        if (!mergedOrders[finalFolderId].includes(finalMapId)) {
          mergedOrders[finalFolderId].push(finalMapId);
        }
      }
    }
  }

  // Ensure all merged maps are indexed in their assigned folder order
  for (const m of mergedMaps) {
    const assignedFolder = mergedAssignments[m.id] || "myMaps";
    if (!Array.isArray(mergedOrders[assignedFolder])) mergedOrders[assignedFolder] = [];
    if (!mergedOrders[assignedFolder].includes(m.id)) {
      mergedOrders[assignedFolder].push(m.id);
    }
  }

  // Collapsed state merge
  const mergedCollapsed = { ...normalizeCollapsed(currentLibraryState.collapsed) };
  const incomingCollapsed = validatedBackup.library.collapsed;
  if (incomingCollapsed && typeof incomingCollapsed === "object" && !Array.isArray(incomingCollapsed)) {
    for (const [incFolderId, isCollapsed] of Object.entries(incomingCollapsed)) {
      const finalFolderId = folderIdMap.get(incFolderId) || incFolderId;
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

module.exports = {
  BACKUP_SCHEMA,
  LIBRARY_STATE_SCHEMA,
  createLocalLibraryStateStore,
  mergeLibraryBackup,
  normalizeAssignments,
  normalizeCollapsed,
  normalizeCustomFolders,
  normalizeLibraryState,
  normalizeOrders,
  validateBackupPayload,
};
