/** Map Library lifecycle orchestration and storage adapters. */
(function publishMapLibraryLifecycle(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathMapLibraryLifecycle = api;
})(typeof window !== "undefined" ? window : globalThis, function createMapLibraryLifecycleModule(root) {
  "use strict";

  const core = root?.CMathMapLibraryCore
    ?? (typeof require === "function" ? require("./core.js") : null);
  if (typeof core?.normalizeMapRecord !== "function"
    || typeof core?.normalizeLibraryState !== "function") {
    throw new Error("CMath Map Library 核心没有加载，无法创建生命周期接口");
  }

  const IDB_DATABASE_NAME = "cmath_math_map_db";
  const IDB_DATABASE_VERSION = 1;
  const IDB_STORE_MAPS = "maps";
  const IDB_STORE_STATE = "library_state";
  const IDB_STATE_KEY = "current";

  function cloneJson(value) {
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function mergeMaps(...collections) {
    const byId = new Map();
    for (const record of collections.flat()) {
      if (!record || typeof record.id !== "string" || !record.data) continue;
      try {
        const normalized = core.normalizeMapRecord(record);
        byId.set(normalized.id, normalized);
      } catch {
        // One malformed persisted record must not block the remaining library.
      }
    }
    return [...byId.values()];
  }

  function hasOrganizationData(state) {
    return Array.isArray(state?.customFolders) && state.customFolders.length > 0
      || Boolean(state?.assignments
        && typeof state.assignments === "object"
        && Object.keys(state.assignments).length > 0);
  }

  function assertAdapter(adapter) {
    for (const method of ["loadMaps", "saveMap", "saveMaps", "deleteMap", "loadState", "saveState"]) {
      if (typeof adapter?.[method] !== "function") {
        throw new TypeError(`Map Library adapter 缺少 ${method}()`);
      }
    }
    return adapter;
  }

  function createMapLibrary({ adapter, onError = () => {} } = {}) {
    const storage = assertAdapter(adapter);

    function report(stage, error) {
      try { onError(stage, error); } catch { /* reporting must not replace storage behavior */ }
    }

    async function load({ maps: fallbackMaps = [], state: fallbackState = {} } = {}) {
      let maps = mergeMaps(fallbackMaps);
      try {
        const storedMaps = mergeMaps(await storage.loadMaps());
        if (storedMaps.length > 0) {
          // The primary adapter wins when it has the same map id as the fallback.
          maps = mergeMaps(maps, storedMaps);
        } else if (maps.length > 0) {
          await storage.saveMaps(maps);
        }
      } catch (error) {
        report("load-maps", error);
      }

      const normalizedFallbackState = core.normalizeLibraryState(fallbackState);
      let state = normalizedFallbackState;
      try {
        const storedState = await storage.loadState();
        if (storedState && typeof storedState === "object") {
          const normalizedStoredState = core.normalizeLibraryState(storedState);
          if (!hasOrganizationData(normalizedStoredState)
            && hasOrganizationData(normalizedFallbackState)) {
            await storage.saveState(normalizedFallbackState);
          } else {
            state = normalizedStoredState;
          }
        } else if (hasOrganizationData(normalizedFallbackState)) {
          await storage.saveState(normalizedFallbackState);
        }
      } catch (error) {
        report("load-state", error);
      }

      return { maps, state };
    }

    async function saveMap(record) {
      const normalized = core.normalizeMapRecord(record);
      return core.normalizeMapRecord(await storage.saveMap(normalized) ?? normalized);
    }

    async function saveMaps(records) {
      const normalized = mergeMaps(records);
      const saved = await storage.saveMaps(normalized);
      return Array.isArray(saved) ? mergeMaps(saved) : normalized;
    }

    async function deleteMap(id) {
      const mapId = String(id || "").trim();
      if (!mapId) throw new TypeError("map id is required");
      return storage.deleteMap(mapId);
    }

    async function saveState(state) {
      const normalized = core.normalizeLibraryState(state);
      const saved = await storage.saveState(normalized);
      return core.normalizeLibraryState(saved ?? normalized);
    }

    return Object.freeze({ deleteMap, load, mergeMaps, saveMap, saveMaps, saveState });
  }

  function createMemoryMapLibraryAdapter(initial = {}) {
    const maps = new Map(mergeMaps(initial.maps).map((map) => [map.id, cloneJson(map)]));
    let state = initial.state == null ? null : cloneJson(initial.state);
    return Object.freeze({
      async loadMaps() { return cloneJson([...maps.values()]); },
      async saveMap(record) {
        maps.set(record.id, cloneJson(record));
        return cloneJson(record);
      },
      async saveMaps(records) {
        for (const record of records || []) maps.set(record.id, cloneJson(record));
        return cloneJson(records || []);
      },
      async deleteMap(id) { return maps.delete(id); },
      async loadState() { return cloneJson(state); },
      async saveState(nextState) {
        state = cloneJson(nextState);
        return cloneJson(state);
      },
    });
  }

  function createIndexedDbMapLibraryAdapter({ indexedDB = root?.indexedDB, onError = () => {} } = {}) {
    function report(error) {
      try { onError(error); } catch { /* noop */ }
    }

    function openDatabase() {
      return new Promise((resolve) => {
        if (!indexedDB) {
          resolve(null);
          return;
        }
        try {
          const request = indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);
          request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(IDB_STORE_MAPS)) {
              database.createObjectStore(IDB_STORE_MAPS, { keyPath: "id" });
            }
            if (!database.objectStoreNames.contains(IDB_STORE_STATE)) {
              database.createObjectStore(IDB_STORE_STATE, { keyPath: "key" });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => {
            report(request.error);
            resolve(null);
          };
        } catch (error) {
          report(error);
          resolve(null);
        }
      });
    }

    async function runRequest(storeName, mode, operation, fallback, rejectOnError = false) {
      const database = await openDatabase();
      if (!database) return fallback;
      return new Promise((resolve, reject) => {
        try {
          const transaction = database.transaction([storeName], mode);
          const request = operation(transaction.objectStore(storeName));
          request.onsuccess = () => resolve(request.result ?? fallback);
          request.onerror = () => {
            const error = request.error || new Error("IndexedDB request failed");
            report(error);
            if (rejectOnError) reject(error);
            else resolve(fallback);
          };
        } catch (error) {
          report(error);
          if (rejectOnError) reject(error);
          else resolve(fallback);
        }
      });
    }

    return Object.freeze({
      async loadMaps() {
        return runRequest(IDB_STORE_MAPS, "readonly", (store) => store.getAll(), []);
      },
      async saveMap(record) {
        await runRequest(IDB_STORE_MAPS, "readwrite", (store) => store.put(record), record);
        return record;
      },
      async saveMaps(records) {
        const database = await openDatabase();
        if (!database || !Array.isArray(records) || records.length === 0) return records;
        return new Promise((resolve) => {
          try {
            const transaction = database.transaction([IDB_STORE_MAPS], "readwrite");
            const store = transaction.objectStore(IDB_STORE_MAPS);
            for (const record of records) if (record?.id) store.put(record);
            transaction.oncomplete = () => resolve(records);
            transaction.onerror = () => { report(transaction.error); resolve(records); };
            transaction.onabort = () => { report(transaction.error); resolve(records); };
          } catch (error) {
            report(error);
            resolve(records);
          }
        });
      },
      async deleteMap(id) {
        return runRequest(
          IDB_STORE_MAPS,
          "readwrite",
          (store) => store.delete(id),
          undefined,
          true,
        );
      },
      async loadState() {
        const record = await runRequest(
          IDB_STORE_STATE,
          "readonly",
          (store) => store.get(IDB_STATE_KEY),
          null,
        );
        return record?.state ?? null;
      },
      async saveState(state) {
        const record = { key: IDB_STATE_KEY, state, updatedAt: Date.now() };
        await runRequest(IDB_STORE_STATE, "readwrite", (store) => store.put(record), record);
        return state;
      },
    });
  }

  function createHttpMapLibraryAdapter({ fetchImpl, baseUrl = "" } = {}) {
    const request = fetchImpl ?? ((...args) => root?.fetch(...args));
    if (typeof request !== "function") throw new TypeError("fetch implementation is required");

    async function jsonOrEmpty(response) {
      return response.json().catch(() => ({}));
    }

    async function saveMap(record) {
      const response = await request(`${baseUrl}/api/maps`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(record),
      });
      const payload = await jsonOrEmpty(response);
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    return Object.freeze({
      async loadMaps() {
        const response = await request(`${baseUrl}/api/maps`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.maps) ? payload.maps : [];
      },
      saveMap,
      async saveMaps(records) {
        return Promise.all((records || []).map(saveMap));
      },
      async deleteMap(id) {
        const response = await request(`${baseUrl}/api/maps/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });
        const payload = await jsonOrEmpty(response);
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        return payload;
      },
      async loadState() {
        const response = await request(`${baseUrl}/api/library-state`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return null;
        return response.json();
      },
      async saveState(state) {
        await request(`${baseUrl}/api/library-state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(state),
        });
        return state;
      },
    });
  }

  return Object.freeze({
    IDB_DATABASE_NAME,
    IDB_DATABASE_VERSION,
    IDB_STATE_KEY,
    IDB_STORE_MAPS,
    IDB_STORE_STATE,
    createHttpMapLibraryAdapter,
    createIndexedDbMapLibraryAdapter,
    createMapLibrary,
    createMemoryMapLibraryAdapter,
    mergeMaps,
  });
});
