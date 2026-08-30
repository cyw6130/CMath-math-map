/* ============================================================================
   CMath Math Map V5 — Application Logic
   真实生产接线版：论文 PDF 经 MinerU + Frozen Workflow 生成 Project View、
   DeepSeek / Kimi / OpenAI / Gemini / 自定义端点、本地 JSON 载入、
   精选 Demo、地图运行时挂载，以及 V5 工作台氛围特效（视差 + 粒子）。
   v4 / v5 两个设计版本共用此文件（设计差异全部在 CSS 层）。
   ============================================================================ */

(() => {
  "use strict";

  const body = document.body;
  const mapLibraryCore = window.CMathMapLibraryCore;
  if (typeof mapLibraryCore?.normalizeMapRecord !== "function") {
    throw new Error("CMath Map Library 核心没有加载，无法启动地图库");
  }
  const {
    BACKUP_SCHEMA,
    generatedMapView,
    isCanonicalMathMap,
    mergeLibraryBackup,
    normalizeLibraryState,
    normalizeMapRecord,
    sanitizeGeneratedResult,
  } = mapLibraryCore;
  const paperDrawerBackdrop = document.querySelector("#paper-drawer-backdrop");
  const paperDrawer = document.querySelector("#paper-drawer");
  const settingsDrawerBackdrop = document.querySelector("#settings-drawer-backdrop");
  const settingsDrawer = document.querySelector("#settings-drawer");
  const importDrawerBackdrop = document.querySelector("#import-drawer-backdrop");
  const importDrawer = document.querySelector("#import-drawer");
  const libraryDrawerBackdrop = document.querySelector("#library-drawer-backdrop");
  const libraryDrawer = document.querySelector("#library-drawer");
  let lastActiveTrigger = null;
  let currentActiveMapId = null;
  let currentActiveMapData = null;
  let currentActiveMapTitle = "";
  let inspectorEnhancementObserver = null;

  function displayBoundaryLabel(value) {
    return String(value || "数学地图")
      .replace(/\s*·\s*数学地图与 Loop 进展/gu, "")
      .replace(/\s*·\s*Loop 进展/gu, "")
      .trim();
  }

  // DOM Elements for Map Topbar
  const mapActiveTitle = document.querySelector("#map-active-title");
  const mapBoundaryTag = document.querySelector("#map-boundary-tag");
  const btnReturnWorkbench = document.querySelector("#btn-return-workbench");

  // Settings Elements
  const providerBtns = document.querySelectorAll(".provider-btn");
  const apiEndpointInput = document.querySelector("#api-endpoint-input");
  const apiKeyInput = document.querySelector("#api-key-input");
  const rememberKeyRow = document.querySelector("#remember-key-row");
  const rememberKeyInput = document.querySelector("#remember-key-input");
  const modelSelect = document.querySelector("#model-select");
  const customModelGroup = document.querySelector("#custom-model-group");
  const customModelInput = document.querySelector("#custom-model-input");
  const settingsModeInputs = document.querySelectorAll('input[name="model-access-mode"]');
  const settingsProvidedPanel = document.querySelector("#settings-provided-panel");
  const settingsOwnPanel = document.querySelector("#settings-own-panel");
  const settingsCurrentConfig = document.querySelector("#settings-current-config");
  const settingsCurrentState = document.querySelector("#settings-current-state");
  const settingsSaveState = document.querySelector("#settings-save-state");
  const btnSaveSettings = document.querySelector("#btn-save-settings");
  const btnTestConnection = document.querySelector("#btn-test-connection");
  const testConnectionResult = document.querySelector("#test-connection-result");
  const btnToggleApiKey = document.querySelector("#btn-toggle-api-key");
  const btnClearApiKey = document.querySelector("#btn-clear-api-key");
  const settingsDiscardConfirm = document.querySelector("#settings-discard-confirm");
  const providedServiceStatus = document.querySelector("#provided-service-status");
  const onlineKeyHint = document.querySelector("#online-key-hint");
  const modelConsentCard = document.querySelector("#model-consent-card");
  const btnAcceptModelConsent = document.querySelector("#btn-accept-model-consent");
  const btnUseOwnModel = document.querySelector("#btn-use-own-model");
  const SESSION_MAP_KEY = "cmath.math-map.session-map";
  const SESSION_IMPORTED_MAPS_KEY = "cmath.math-map.session-imported-maps-v1";
  const MODEL_ACCESS_PREF_KEY = "cmath.math-map.model-access-mode-v1";
  const SAVED_MODEL_CONFIG_KEY = "cmath.math-map.saved-model-config-v1";
  const MODEL_CONSENT_KEY = "cmath.math-map.muse-consent-v1";
  const MODEL_CONSENT_VERSION = "muse-spark-contributor-training-v1";
  const CMATH_PROVIDED_MODEL = "muse-spark-1.2-contributor";
  const MINERU_GATEWAY_URL = String(
    window.CMATH_MINERU_GATEWAY_URL ?? document.documentElement.dataset.mineruGatewayUrl ?? "",
  ).trim();
  const MODEL_GATEWAY_URL = String(
    window.CMATH_MODEL_GATEWAY_URL ?? document.documentElement.dataset.modelGatewayUrl ?? "",
  ).trim().replace(/\/+$/u, "");

  const IDB_DATABASE_NAME = "cmath_math_map_db";
  const IDB_DATABASE_VERSION = 1;
  const IDB_STORE_MAPS = "maps";
  const IDB_STORE_STATE = "library_state";

  function openIndexedDb() {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const request = window.indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE_MAPS)) {
            db.createObjectStore(IDB_STORE_MAPS, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(IDB_STORE_STATE)) {
            db.createObjectStore(IDB_STORE_STATE, { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn("无法打开 IndexedDB:", request.error);
          resolve(null);
        };
      } catch (err) {
        console.warn("IndexedDB 初始化异常:", err);
        resolve(null);
      }
    });
  }

  async function idbGetAllMaps() {
    const db = await openIndexedDb();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE_MAPS], "readonly");
        const store = tx.objectStore(IDB_STORE_MAPS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async function idbPutMap(mapRecord) {
    const db = await openIndexedDb();
    if (!db || !mapRecord?.id) return mapRecord;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE_MAPS], "readwrite");
        const store = tx.objectStore(IDB_STORE_MAPS);
        const request = store.put(mapRecord);
        request.onsuccess = () => resolve(mapRecord);
        request.onerror = () => resolve(mapRecord);
      } catch {
        resolve(mapRecord);
      }
    });
  }

  async function idbPutMaps(mapRecords) {
    const db = await openIndexedDb();
    if (!db || !Array.isArray(mapRecords) || !mapRecords.length) return mapRecords;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE_MAPS], "readwrite");
        const store = tx.objectStore(IDB_STORE_MAPS);
        for (const m of mapRecords) {
          if (m?.id) store.put(m);
        }
        tx.oncomplete = () => resolve(mapRecords);
        tx.onerror = () => resolve(mapRecords);
        tx.onabort = () => resolve(mapRecords);
      } catch {
        resolve(mapRecords);
      }
    });
  }

  async function idbDeleteMap(mapId) {
    const db = await openIndexedDb();
    if (!db || !mapId) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([IDB_STORE_MAPS], "readwrite");
        const request = tx.objectStore(IDB_STORE_MAPS).delete(mapId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("删除地图失败"));
      } catch (error) {
        reject(error);
      }
    });
  }

  async function idbGetLibraryState() {
    const db = await openIndexedDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE_STATE], "readonly");
        const store = tx.objectStore(IDB_STORE_STATE);
        const request = store.get("current");
        request.onsuccess = () => resolve(request.result?.state || null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function idbSaveLibraryState(state) {
    const db = await openIndexedDb();
    if (!db || !state) return state;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE_STATE], "readwrite");
        const store = tx.objectStore(IDB_STORE_STATE);
        const request = store.put({ key: "current", state, updatedAt: Date.now() });
        request.onsuccess = () => resolve(state);
        request.onerror = () => resolve(state);
      } catch {
        resolve(state);
      }
    });
  }

  function readSessionImportedMaps() {
    try {
      const raw = sessionStorage.getItem(SESSION_IMPORTED_MAPS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveSessionImportedMaps(maps) {
    try {
      sessionStorage.setItem(SESSION_IMPORTED_MAPS_KEY, JSON.stringify(maps));
    } catch (e) {
      console.warn("无法保存导入地图至 sessionStorage (可能超出配额):", e);
    }
  }

  let sessionImportedMaps = readSessionImportedMaps();
  let mapRuntimeMounted = false;
  let activeProviderKey = "opencode";
  let activeAccessMode = "cmath";
  let savedAccessMode = "cmath";
  let settingsBaseline = "";
  let settingsProviderDrafts = new Map();
  let modelConsentResolver = null;
  // Becomes true only after the initial provider bootstrap, so the first
  // updateProviderSettings() never persists the raw HTML defaults (which used
  // to be DeepSeek's) as if they were the user's OpenCode Go configuration.
  let providerUiBootstrapped = false;

  // Local desktop mode: the loopback server can persist API Keys to disk.
  // GitHub Pages (https://cyw6130.github.io) never sees this endpoint.
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocalDesktop = LOCAL_HOSTS.has(window.location.hostname);

  function mergeImportedMaps(...collections) {
    const byId = new Map();
    collections.flat().forEach((map) => {
      if (!map || typeof map.id !== "string" || !map.data) return;
      try {
        const normalized = normalizeMapRecord(map);
        byId.set(normalized.id, normalized);
      } catch {
        // 损坏的持久化记录不应阻断其余地图库恢复。
      }
    });
    return [...byId.values()];
  }

  async function loadPersistedMapsAndState() {
    if (isLocalDesktop) {
      try {
        const response = await fetch("/api/maps", { headers: { Accept: "application/json" } });
        if (response.ok) {
          const payload = await response.json();
          // The disk-backed library is authoritative when a stale tab session has
          // an older copy of the same imported map.
          sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, payload.maps || []);
          saveSessionImportedMaps(sessionImportedMaps);
        }
      } catch (error) {
        console.warn("无法读取后端数学地图库，继续使用当前会话地图:", error);
      }

      try {
        const stateRes = await fetch("/api/library-state", { headers: { Accept: "application/json" } });
        if (stateRes.ok) {
          const diskState = await stateRes.json();
          if (diskState && typeof diskState === "object" && Array.isArray(diskState.customFolders)) {
            const localFolders = getCustomFolders();
            const hasLocalData = localFolders.length > 0;
            const hasDiskData = diskState.customFolders.length > 0 || Object.keys(diskState.assignments || {}).length > 0;
            if (!hasDiskData && hasLocalData) {
              await persistLibraryOrganization();
            } else {
              applyLibraryState(diskState);
            }
          }
        }
      } catch (error) {
        console.warn("无法读取本地地图库组织状态:", error);
      }

      renderLibraryDrawer();
    } else {
      try {
        const idbMaps = await idbGetAllMaps();
        if (idbMaps && idbMaps.length > 0) {
          sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, idbMaps);
          saveSessionImportedMaps(sessionImportedMaps);
        } else if (sessionImportedMaps.length > 0) {
          await idbPutMaps(sessionImportedMaps);
        }

        const idbState = await idbGetLibraryState();
        if (idbState && typeof idbState === "object") {
          applyLibraryState(idbState);
        } else {
          const currentLocalState = getFullLibraryState();
          if (currentLocalState.customFolders.length > 0 || Object.keys(currentLocalState.assignments || {}).length > 0) {
            await idbSaveLibraryState(currentLocalState);
          }
        }
      } catch (error) {
        console.warn("IndexedDB 数据恢复失败，回退到本地缓存:", error);
      }

      renderLibraryDrawer();
    }
  }

  async function persistImportedMap(map) {
    const normalizedMap = normalizeMapRecord(map);
    if (isLocalDesktop) {
      const response = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(normalizedMap),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "HTTP " + response.status);
      return payload;
    } else {
      await idbPutMap(normalizedMap);
      return normalizedMap;
    }
  }

  async function deletePersistedMap(mapId) {
    if (isLocalDesktop) {
      const response = await fetch(`/api/maps/${encodeURIComponent(mapId)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "HTTP " + response.status);
      return;
    }
    await idbDeleteMap(mapId);
  }

  // Per-provider preferences.
  // - API Keys: persisted to ~/.gamma-math-map/keys.json on the desktop app;
  //   online builds keep keys in sessionStorage only (cleared on tab close).
  // - Endpoint + model choice: localStorage (non-secret), shared by both builds.
  const PROVIDER_PREFS_KEY = "cmath.math-map.provider-prefs";
  const LEGACY_MODEL_PREFS_KEY = "cmath.math-map.provider-model-prefs";
  const SESSION_KEYS_KEY = "cmath.math-map.session-keys";

  // Desktop builds route model traffic through the loopback server
  // (/api/model-proxy) so endpoints that reject browser CORS preflights
  // (e.g. a local Sub2API instance) still work. Online builds fetch directly.
  async function modelFetch(targetUrl, init) {
    if (!isLocalDesktop) return fetch(targetUrl, init);
    let apiKey = "";
    const auth = init?.headers?.Authorization;
    if (typeof auth === "string") apiKey = auth.replace(/^Bearer\s+/i, "").trim();
    let body = null;
    if (typeof init?.body === "string") {
      try { body = JSON.parse(init.body); } catch { /* forward raw below */ }
    }
    const response = await fetch("/api/model-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: String(targetUrl), apiKey, body: body ?? init?.body ?? null }),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8" },
    });
  }

  function readProviderPrefs() {
    try { return JSON.parse(localStorage.getItem(PROVIDER_PREFS_KEY) || "{}"); }
    catch { return {}; }
  }
  function migrateLegacyPrefs() {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_MODEL_PREFS_KEY) || "{}");
      const entries = Object.entries(legacy).filter(([, model]) => typeof model === "string" && model);
      if (!entries.length) return;
      const prefs = readProviderPrefs();
      for (const [provider, model] of entries) {
        if (!prefs[provider]) prefs[provider] = {};
        if (typeof prefs[provider] === "object") prefs[provider].model = model;
      }
      localStorage.setItem(PROVIDER_PREFS_KEY, JSON.stringify(prefs));
      localStorage.removeItem(LEGACY_MODEL_PREFS_KEY);
    } catch { /* legacy migration must never block */ }
  }
  function rememberProviderConfig(provider, { endpoint, model }) {
    try {
      const prefs = readProviderPrefs();
      const entry = prefs[provider] && typeof prefs[provider] === "object" ? prefs[provider] : {};
      if (endpoint) entry.endpoint = endpoint;
      else delete entry.endpoint;
      if (model) entry.model = model;
      else delete entry.model;
      prefs[provider] = entry;
      localStorage.setItem(PROVIDER_PREFS_KEY, JSON.stringify(prefs));
    } catch { /* preference persistence never blocks import */ }
  }
  function providerPref(provider) {
    const entry = readProviderPrefs()[provider];
    return entry && typeof entry === "object" ? entry : {};
  }
  // One-time self-heal: the v5 init used to remember the endpoint/model shown
  // by the HTML defaults before applying the OpenCode Go config, so a polluted
  // entry could exist where one provider (e.g. opencode) has another provider's
  // exact default endpoint + default model saved. Drop such entries so the
  // built-in default wins again.
  function sanitizePollutedPrefs() {
    try {
      const prefs = readProviderPrefs();
      let changed = false;
      const defaultsByProvider = {};
      for (const [key, cfg] of Object.entries(PROVIDER_CONFIGS)) {
        if (!cfg.endpoint || !Array.isArray(cfg.models) || !cfg.models.length) continue;
        const def = cfg.models.find((m) => m.default) || cfg.models[0];
        defaultsByProvider[key] = { endpoint: cfg.endpoint, model: def.value };
      }
      for (const [provider, saved] of Object.entries(prefs)) {
        if (!saved || typeof saved !== "object") continue;
        for (const [other, def] of Object.entries(defaultsByProvider)) {
          if (other === provider) continue;
          if (saved.endpoint === def.endpoint && saved.model === def.model) {
            delete saved.endpoint;
            delete saved.model;
            changed = true;
            break;
          }
        }
        if (!Object.keys(saved).length) delete prefs[provider];
      }
      if (changed) localStorage.setItem(PROVIDER_PREFS_KEY, JSON.stringify(prefs));
    } catch { /* preference sanitization never blocks import */ }
  }
  function rememberSessionKey(provider, apiKey) {
    try {
      const keys = JSON.parse(sessionStorage.getItem(SESSION_KEYS_KEY) || "{}");
      if (apiKey) keys[provider] = apiKey;
      else delete keys[provider];
      sessionStorage.setItem(SESSION_KEYS_KEY, JSON.stringify(keys));
    } catch { /* session key memory never blocks import */ }
  }
  function sessionKeyFor(provider) {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEYS_KEY) || "{}")[provider] || ""; }
    catch { return ""; }
  }
  function currentProviderModel() {
    return modelSelect.value === "custom" ? customModelInput?.value.trim() : modelSelect.value;
  }

  // 当前选中模型的思维链档位（如 OpenCode Go 的 deepseek-v4-flash 默认带思维链，
  // 在论文提取这种大输出任务上会烧光 max_tokens 导致空输出，默认关掉）。
  function currentModelReasoningEffort() {
    const value = modelSelect?.value === "custom" ? customModelInput?.value.trim() : modelSelect?.value;
    return PROVIDER_CONFIGS[activeProviderKey]?.models.find((m) => m.value === value)?.reasoningEffort;
  }

  async function loadLocalConfigFor(provider) {
    if (!isLocalDesktop) return;
    try {
      const response = await fetch("/api/local-key", { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const store = await response.json();
      const saved = store?.providers?.[provider];
      if (typeof saved === "string") {
        if (saved.trim() && !apiKeyInput.value.trim()) apiKeyInput.value = saved.trim();
        return;
      }
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.endpoint === "string" && saved.endpoint.trim()) {
        apiEndpointInput.value = saved.endpoint.trim();
      }
      if (typeof saved.model === "string" && saved.model.trim()) {
        const option = [...(modelSelect?.options ?? [])].find((opt) => opt.value === saved.model);
        if (option) {
          modelSelect.value = saved.model;
        } else if (saved.model === "custom" || customModelInput) {
          modelSelect.value = "custom";
          customModelInput.value = saved.model === "custom" ? (customModelInput.value || "") : saved.model;
        }
      }
      if (typeof saved.apiKey === "string" && saved.apiKey.trim() && !apiKeyInput.value.trim()) {
        apiKeyInput.value = saved.apiKey.trim();
      }
    } catch { /* loopback store unavailable: keep current inputs */ }
  }

  async function persistLocalConfig(provider, { apiKey, endpoint, model }) {
    if (!isLocalDesktop) return;
    try {
      const response = await fetch("/api/local-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, endpoint, model }),
      });
      if (response.ok && !apiKey && !endpoint && !model) {
        // fully cleared on the server side
      }
    } catch { /* key persistence must never break the import flow */ }
  }

  // Provider edits remain drafts until the user explicitly saves settings.
  function rememberCurrentProviderSettings() {
    if (!activeProviderKey) return;
    settingsProviderDrafts.set(activeProviderKey, {
      endpoint: apiEndpointInput?.value.trim() ?? "",
      model: currentProviderModel(),
      apiKey: apiKeyInput?.value.trim() ?? "",
      rememberKey: rememberKeyInput?.checked !== false,
    });
  }

  function restoreProviderConfig(provider) {
    const config = PROVIDER_CONFIGS[provider];
    const pref = providerPref(provider);
    const defaultModel = config?.models?.find((item) => item.default)?.value ?? config?.models?.[0]?.value ?? "custom";
    const draft = settingsProviderDrafts.get(provider) ?? {
      endpoint: pref.endpoint || config?.endpoint || "",
      model: pref.model || defaultModel,
      apiKey: sessionKeyFor(provider),
      rememberKey: true,
    };
    settingsProviderDrafts.set(provider, { ...draft });
    apiEndpointInput.value = draft.endpoint || config?.endpoint || "";
    apiKeyInput.value = draft.apiKey || "";
    if (rememberKeyInput) rememberKeyInput.checked = draft.rememberKey !== false;
    const saved = draft.model;
    if (!saved) return;
    const option = [...(modelSelect?.options ?? [])].find((opt) => opt.value === saved);
    if (option) {
      modelSelect.value = saved;
    } else {
      modelSelect.value = "custom";
      if (customModelInput) customModelInput.value = saved === "custom" ? "" : saved;
    }
    handleModelChange();
  }

  if (rememberKeyRow) rememberKeyRow.hidden = !isLocalDesktop;

  const PROVIDER_CONFIGS = {
    deepseek: {
      label: "DeepSeek",
      endpoint: "https://api.deepseek.com/v1",
      models: [
        { value: "deepseek-chat", label: "deepseek-chat (推荐 · 快速高效)", default: true },
        { value: "deepseek-reasoner", label: "deepseek-reasoner (深度推理)" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    kimi: {
      label: "Kimi",
      endpoint: "https://api.moonshot.cn/v1",
      models: [
        { value: "kimi-k3", label: "kimi-k3", default: true },
        { value: "kimi-k2.7-code", label: "kimi-k2.7-code" },
        { value: "kimi-k2.6", label: "kimi-k2.6" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    opencode: {
      label: "OpenCode Go",
      endpoint: "https://opencode.ai/zen/go/v1",
      models: [
        { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash (推荐 · 快速)", default: true, reasoningEffort: "none" },
        { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
        { value: "kimi-k3", label: "Kimi K3" },
        { value: "kimi-k2.7-code", label: "Kimi K2.7 Code" },
        { value: "kimi-k2.6", label: "Kimi K2.6" },
        { value: "glm-5.3", label: "GLM-5.3" },
        { value: "glm-5.2", label: "GLM-5.2" },
        { value: "glm-5.1", label: "GLM-5.1" },
        { value: "minimax-m3", label: "MiniMax M3" },
        { value: "minimax-m2.7", label: "MiniMax M2.7" },
        { value: "qwen3.8-max", label: "Qwen3.8 Max" },
        { value: "qwen3.7-max", label: "Qwen3.7 Max" },
        { value: "qwen3.7-plus", label: "Qwen3.7 Plus" },
        { value: "qwen3.6-plus", label: "Qwen3.6 Plus" },
        { value: "mimo-v2.5", label: "MiMo-V2.5" },
        { value: "mimo-v2.5-pro", label: "MiMo-V2.5-Pro" },
        { value: "hy3", label: "Hy3" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    custom: {
      label: "自定义模型服务",
      endpoint: "",
      models: [
        { value: "custom", label: "自定义模型名称...", default: true }
      ]
    }
  };

  const activeProviderLabel = document.querySelector("#active-provider-label");

  function updateActiveProviderLabel() {
    if (!activeProviderLabel) return;
    const config = PROVIDER_CONFIGS[activeProviderKey];
    const endpoint = apiEndpointInput?.value.trim() || config.endpoint || "未配置";
    const model = currentProviderModel() || "未选择";
    activeProviderLabel.textContent = `当前供应商：${config.label} ｜ 端点 ${endpoint} ｜ 模型 ${model}`;
  }

  function updateProviderSettings(providerKey, { captureCurrent = true, alignBaselineAfterLoad = false } = {}) {
    if (providerUiBootstrapped && captureCurrent) rememberCurrentProviderSettings();
    activeProviderKey = PROVIDER_CONFIGS[providerKey] ? providerKey : "deepseek";
    providerBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.provider === providerKey));
    const config = PROVIDER_CONFIGS[activeProviderKey];

    modelSelect.innerHTML = "";
    config.models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.textContent = m.label;
      if (m.default) opt.selected = true;
      modelSelect.appendChild(opt);
    });

    restoreProviderConfig(activeProviderKey);
    handleModelChange();
    updateActiveProviderLabel();
    loadLocalConfigFor(activeProviderKey).then(() => {
      rememberCurrentProviderSettings();
      updateActiveProviderLabel();
      if (alignBaselineAfterLoad || settingsDrawerBackdrop?.hidden) {
        settingsBaseline = settingsSnapshot();
        updateSettingsDirtyState();
      }
      else updateSettingsDirtyState();
    });
    updateSettingsDirtyState();
  }

  function handleModelChange() {
    const isCustom = modelSelect.value === "custom";
    if (customModelGroup) {
      customModelGroup.hidden = !isCustom;
    }
  }

  providerBtns.forEach(btn => {
    btn.addEventListener("click", () => updateProviderSettings(btn.dataset.provider));
  });

  modelSelect?.addEventListener("change", () => {
    handleModelChange();
    rememberCurrentProviderSettings();
    updateActiveProviderLabel();
    invalidateConnectionTest();
    updateSettingsDirtyState();
  });
  customModelInput?.addEventListener("input", () => {
    rememberCurrentProviderSettings();
    updateActiveProviderLabel();
    invalidateConnectionTest();
    updateSettingsDirtyState();
  });

  function readSavedAccessMode() {
    try {
      return localStorage.getItem(MODEL_ACCESS_PREF_KEY) === "own" ? "own" : "cmath";
    } catch {
      return "cmath";
    }
  }

  function readSavedModelConfig() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVED_MODEL_CONFIG_KEY) || "null");
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }

  function selectedAccessMode() {
    return [...settingsModeInputs].find((input) => input.checked)?.value === "own" ? "own" : "cmath";
  }

  function settingsSnapshot() {
    rememberCurrentProviderSettings();
    const draft = settingsProviderDrafts.get(activeProviderKey) || {};
    return JSON.stringify({
      mode: selectedAccessMode(),
      provider: activeProviderKey,
      endpoint: draft.endpoint || "",
      model: draft.model || "",
      apiKey: draft.apiKey || "",
      rememberKey: draft.rememberKey !== false,
    });
  }

  function settingsAreDirty() {
    return Boolean(settingsBaseline) && settingsSnapshot() !== settingsBaseline;
  }

  function invalidateConnectionTest() {
    if (!testConnectionResult) return;
    testConnectionResult.hidden = true;
    testConnectionResult.textContent = "";
    testConnectionResult.classList.remove("is-error", "is-success");
  }

  function updateSettingsDirtyState() {
    if (!settingsSaveState || !btnSaveSettings) return;
    const dirty = settingsAreDirty();
    settingsSaveState.textContent = dirty ? "有未保存修改" : "已保存";
    settingsSaveState.classList.toggle("is-dirty", dirty);
    settingsSaveState.classList.toggle("is-saved", !dirty);
    btnSaveSettings.disabled = !dirty;
    btnSaveSettings.textContent = dirty
      ? (selectedAccessMode() === "own" ? "保存配置" : "使用此配置")
      : (selectedAccessMode() === "own" ? "配置已保存" : "当前使用中");
  }

  function updateSavedConfigSummary() {
    if (!settingsCurrentConfig || !settingsCurrentState) return;
    const config = readSavedModelConfig();
    if (savedAccessMode === "own" && config) {
      const label = PROVIDER_CONFIGS[config.provider]?.label || "自己的 API";
      settingsCurrentConfig.textContent = `${label} · ${config.model || "未选择模型"}`;
      settingsCurrentState.textContent = (Boolean(sessionKeyFor(config.provider)) || isLocalDesktop) ? "已配置" : "需要 API Key";
      return;
    }
    settingsCurrentConfig.textContent = "CMath 提供 · Muse Spark";
    settingsCurrentState.textContent = "无需 API Key";
  }

  async function checkProvidedModelService() {
    if (!providedServiceStatus) return false;
    providedServiceStatus.classList.remove("is-ready", "is-error");
    providedServiceStatus.innerHTML = "<i></i>正在检查服务";
    if (!MODEL_GATEWAY_URL) {
      providedServiceStatus.classList.add("is-error");
      providedServiceStatus.innerHTML = "<i></i>服务尚未配置";
      return false;
    }
    try {
      const response = await fetch(MODEL_GATEWAY_URL, { headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.available !== true) throw new Error("unavailable");
      providedServiceStatus.classList.add("is-ready");
      providedServiceStatus.innerHTML = "<i></i>服务可用";
      return true;
    } catch {
      providedServiceStatus.classList.add("is-error");
      providedServiceStatus.innerHTML = "<i></i>服务暂不可用";
      return false;
    }
  }

  function applyAccessMode(mode, { updateDirty = true } = {}) {
    activeAccessMode = mode === "own" ? "own" : "cmath";
    settingsModeInputs.forEach((input) => { input.checked = input.value === activeAccessMode; });
    if (settingsProvidedPanel) settingsProvidedPanel.hidden = activeAccessMode !== "cmath";
    if (settingsOwnPanel) settingsOwnPanel.hidden = activeAccessMode !== "own";
    if (btnTestConnection) btnTestConnection.hidden = activeAccessMode !== "own";
    if (btnSaveSettings) btnSaveSettings.textContent = activeAccessMode === "own" ? "保存配置" : "使用此配置";
    invalidateConnectionTest();
    if (activeAccessMode === "cmath" && settingsDrawerBackdrop && !settingsDrawerBackdrop.hidden) {
      void checkProvidedModelService();
    }
    if (updateDirty) updateSettingsDirtyState();
  }

  async function saveSettings() {
    const mode = selectedAccessMode();
    if (mode === "own") {
      rememberCurrentProviderSettings();
      const draft = settingsProviderDrafts.get(activeProviderKey) || {};
      if (!draft.endpoint) {
        showTestResult("请先填写 API 服务地址。", true);
        apiEndpointInput?.focus();
        return;
      }
      try { window.GammaPaperImportClient.endpointUrl(draft.endpoint); }
      catch (error) {
        showTestResult(error.message, true);
        apiEndpointInput?.focus();
        return;
      }
      if (!draft.model) {
        showTestResult("请先选择或填写模型名称。", true);
        modelSelect?.focus();
        return;
      }
      if (!draft.apiKey) {
        showTestResult(`请先填写 ${PROVIDER_CONFIGS[activeProviderKey].label} 的 API Key。`, true);
        apiKeyInput?.focus();
        return;
      }
      rememberProviderConfig(activeProviderKey, { endpoint: draft.endpoint, model: draft.model });
      rememberSessionKey(activeProviderKey, draft.apiKey);
      if (isLocalDesktop) {
        await persistLocalConfig(activeProviderKey, {
          apiKey: draft.rememberKey ? draft.apiKey : "",
          endpoint: draft.endpoint,
          model: draft.model,
        });
      }
      try {
        localStorage.setItem(SAVED_MODEL_CONFIG_KEY, JSON.stringify({
          provider: activeProviderKey,
          endpoint: draft.endpoint,
          model: draft.model,
          rememberKey: draft.rememberKey,
        }));
      } catch { /* settings remain usable without persistence */ }
    }
    savedAccessMode = mode;
    activeAccessMode = mode;
    try { localStorage.setItem(MODEL_ACCESS_PREF_KEY, mode); } catch { /* ignore */ }
    settingsBaseline = settingsSnapshot();
    updateSavedConfigSummary();
    updateSettingsDirtyState();
    if (settingsSaveState) settingsSaveState.textContent = "配置已保存";
  }

  function resetSettingsDraft() {
    const saved = readSavedModelConfig();
    settingsProviderDrafts = new Map();
    if (saved?.provider) {
      settingsProviderDrafts.set(saved.provider, {
        endpoint: saved.endpoint || "",
        model: saved.model || "custom",
        apiKey: sessionKeyFor(saved.provider),
        rememberKey: saved.rememberKey !== false,
      });
    }
    updateProviderSettings(saved?.provider || "opencode", { captureCurrent: false, alignBaselineAfterLoad: true });
    applyAccessMode(savedAccessMode, { updateDirty: false });
    settingsBaseline = settingsSnapshot();
    updateSettingsDirtyState();
  }

  settingsModeInputs.forEach((input) => {
    input.addEventListener("change", () => applyAccessMode(input.value));
  });
  [apiEndpointInput, apiKeyInput].forEach((input) => {
    input?.addEventListener("input", () => {
      rememberCurrentProviderSettings();
      updateActiveProviderLabel();
      invalidateConnectionTest();
      updateSettingsDirtyState();
    });
  });
  rememberKeyInput?.addEventListener("change", () => {
    rememberCurrentProviderSettings();
    updateSettingsDirtyState();
  });
  btnToggleApiKey?.addEventListener("click", () => {
    const reveal = apiKeyInput?.type === "password";
    if (apiKeyInput) apiKeyInput.type = reveal ? "text" : "password";
    btnToggleApiKey.textContent = reveal ? "隐藏" : "显示";
    btnToggleApiKey.setAttribute("aria-label", reveal ? "隐藏 API Key" : "显示 API Key");
    btnToggleApiKey.setAttribute("aria-pressed", String(reveal));
  });
  btnClearApiKey?.addEventListener("click", () => {
    if (apiKeyInput) apiKeyInput.value = "";
    rememberCurrentProviderSettings();
    invalidateConnectionTest();
    updateSettingsDirtyState();
    apiKeyInput?.focus();
  });
  btnSaveSettings?.addEventListener("click", () => { void saveSettings(); });
  settingsOwnPanel?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings();
  });
  if (onlineKeyHint) onlineKeyHint.hidden = isLocalDesktop;

  // Initialize the last explicitly saved access mode and BYOK configuration.
  migrateLegacyPrefs();
  sanitizePollutedPrefs();
  const initialSavedModelConfig = readSavedModelConfig();
  savedAccessMode = readSavedAccessMode();
  activeAccessMode = savedAccessMode;
  if (initialSavedModelConfig?.provider) {
    settingsProviderDrafts.set(initialSavedModelConfig.provider, {
      endpoint: initialSavedModelConfig.endpoint || "",
      model: initialSavedModelConfig.model || "custom",
      apiKey: sessionKeyFor(initialSavedModelConfig.provider),
      rememberKey: initialSavedModelConfig.rememberKey !== false,
    });
  }
  updateProviderSettings(initialSavedModelConfig?.provider || "opencode");
  providerUiBootstrapped = true;
  applyAccessMode(activeAccessMode, { updateDirty: false });
  updateSavedConfigSummary();
  settingsBaseline = settingsSnapshot();

  // Drawer / Backdrop Management & Coordination
  let activeModalDrawer = null;
  function showSettingsDiscardConfirm() {
    if (!settingsDiscardConfirm) return;
    settingsDiscardConfirm.hidden = false;
    document.querySelector("#btn-keep-editing")?.focus();
  }

  function closeAllPanels(options = {}) {
    const force = options?.force === true;
    const settingsOpen = settingsDrawerBackdrop && !settingsDrawerBackdrop.hidden;
    if (!force && settingsOpen && settingsAreDirty()) {
      showSettingsDiscardConfirm();
      return false;
    }
    if (paperDrawerBackdrop && !paperDrawerBackdrop.hidden && modelConsentResolver) {
      finishModelConsent(false);
    }
    [paperDrawerBackdrop, settingsDrawerBackdrop, importDrawerBackdrop, libraryDrawerBackdrop].forEach((backdrop) => {
      if (backdrop) {
        backdrop.hidden = true;
        backdrop.classList.remove("is-open");
      }
    });
    [paperDrawer, settingsDrawer, importDrawer, libraryDrawer].forEach((drawer) => {
      if (drawer) {
        drawer.classList.remove("is-open");
      }
    });
    const workbenchView = document.querySelector("#workbench-view");
    if (workbenchView) workbenchView.inert = false;
    activeModalDrawer = null;
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === "function" && document.body.contains(lastActiveTrigger)) {
      try { lastActiveTrigger.focus(); } catch { /* ignore focus restore error */ }
    }
    if (settingsDiscardConfirm) settingsDiscardConfirm.hidden = true;
    return true;
  }

  function openDrawer(drawerId, triggerEl = null) {
    if (closeAllPanels() === false) return;
    if (triggerEl) lastActiveTrigger = triggerEl;
    else if (document.activeElement && document.activeElement !== document.body) lastActiveTrigger = document.activeElement;

    let backdrop = null;
    let drawer = null;

    if (drawerId === "paper-drawer") {
      backdrop = paperDrawerBackdrop;
      drawer = paperDrawer;
      if (typeof resetExtractStatus === "function") resetExtractStatus();
    } else if (drawerId === "settings-drawer") {
      backdrop = settingsDrawerBackdrop;
      drawer = settingsDrawer;
      resetSettingsDraft();
    } else if (drawerId === "import-drawer") {
      backdrop = importDrawerBackdrop;
      drawer = importDrawer;
      if (typeof resetImportDrawer === "function") resetImportDrawer();
    } else if (drawerId === "library-drawer") {
      backdrop = libraryDrawerBackdrop;
      drawer = libraryDrawer;
      if (typeof renderLibraryDrawer === "function") renderLibraryDrawer();
    }

    if (backdrop && drawer) {
      backdrop.hidden = false;
      void backdrop.offsetWidth;
      backdrop.classList.add("is-open");
      drawer.classList.add("is-open");
      const workbenchView = document.querySelector("#workbench-view");
      if (workbenchView) workbenchView.inert = true;
      activeModalDrawer = drawer;

      if (drawerId === "settings-drawer" && activeAccessMode === "cmath") {
        void checkProvidedModelService();
      }

      const closeBtn = drawer.querySelector(".close-btn");
      if (closeBtn) closeBtn.focus();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !activeModalDrawer) return;
    const focusable = Array.from(activeModalDrawer.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'))
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });

  [paperDrawerBackdrop, settingsDrawerBackdrop, importDrawerBackdrop, libraryDrawerBackdrop].forEach((backdrop) => {
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllPanels();
      }
    });
  });

  document.querySelector("#btn-keep-editing")?.addEventListener("click", () => {
    if (settingsDiscardConfirm) settingsDiscardConfirm.hidden = true;
    document.querySelector("#btn-close-settings")?.focus();
  });
  document.querySelector("#btn-discard-settings")?.addEventListener("click", () => {
    resetSettingsDraft();
    closeAllPanels({ force: true });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const anyOpen = [paperDrawerBackdrop, settingsDrawerBackdrop, importDrawerBackdrop, libraryDrawerBackdrop].some((b) => b && !b.hidden);
      if (anyOpen) {
        e.preventDefault();
        closeAllPanels();
      }
    }
  });

  // --- Workbench Entrance 1: Upload Paper PDF ---
  const cardUploadPaper = document.querySelector("#card-upload-paper");
  cardUploadPaper?.addEventListener("click", (e) => {
    openDrawer("paper-drawer", e.currentTarget);
  });
  cardUploadPaper?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDrawer("paper-drawer", cardUploadPaper);
    }
  });
  document.querySelector("#btn-close-paper-drawer")?.addEventListener("click", closeAllPanels);
  const pdfDropZone = paperDrawer?.querySelector(".pdf-drop-zone");
  const dropMain = pdfDropZone?.querySelector(".drop-main");
  const dropSub = pdfDropZone?.querySelector(".drop-sub");
  const DROP_MAIN_DEFAULT = dropMain?.textContent ?? "";
  const DROP_SUB_DEFAULT = dropSub?.textContent ?? "";
  const startExtractButton = document.querySelector("#btn-start-extract");
  const paperPdfInput = document.createElement("input");
  paperPdfInput.type = "file";
  paperPdfInput.accept = ".pdf,application/pdf";
  paperPdfInput.hidden = true;
  paperDrawer?.appendChild(paperPdfInput);
  let selectedPaperPdf = null;

  // --- Extraction status block: step list (busy) / success / error ---
  const extractStatus = document.createElement("div");
  extractStatus.className = "extract-status";
  extractStatus.hidden = true;
  if (startExtractButton?.parentElement) {
    startExtractButton.parentElement.before(extractStatus);
  }

  const EXTRACT_STEPS = [
    { id: "mineru", label: "MinerU 精准解析" },
    { id: "generate", label: "V5.1 生成中文标准数学地图" },
    { id: "validate", label: "能力合同校验" },
    { id: "repair", label: "按需修复（最多 2 次）" },
    { id: "save", label: "保存标准 JSON" },
  ];
  let stepEls = new Map();
  let activeImportStage = "mineru";

  function resetExtractStatus() {
    extractStatus.hidden = true;
    extractStatus.innerHTML = "";
    extractStatus.classList.remove("is-error", "is-success");
  }

  function showExtractSteps() {
    extractStatus.hidden = false;
    extractStatus.classList.remove("is-error", "is-success");
    extractStatus.innerHTML = `<ol class="extract-steps">${
      EXTRACT_STEPS.map((s) => `<li data-step="${s.id}"><span class="step-dot"></span><span class="step-label">${s.label}</span><span class="step-detail"></span></li>`).join("")
    }</ol>`;
    stepEls = new Map([...extractStatus.querySelectorAll("li")].map((li) => [li.dataset.step, li]));
    activeImportStage = "mineru";
  }

  function setStep(id, state, detail) {
    const li = stepEls.get(id);
    if (!li) return;
    li.classList.remove("is-active", "is-done");
    if (state) li.classList.add(state === "active" ? "is-active" : "is-done");
    if (detail !== undefined) li.querySelector(".step-detail").textContent = detail;
  }

  function completePriorSteps(id) {
    const activeIndex = EXTRACT_STEPS.findIndex((step) => step.id === id);
    if (activeIndex <= 0) return;
    EXTRACT_STEPS.slice(0, activeIndex).forEach((step) => {
      const li = stepEls.get(step.id);
      if (!li || li.classList.contains("is-done")) return;
      setStep(step.id, "done", li.querySelector(".step-detail")?.textContent || "完成");
    });
  }

  function handleImportStage(stage, info = {}) {
    if (!stepEls.has(stage)) return;
    if (info.phase === "resume") {
      completePriorSteps(stage);
      setStep(stage, "done", "已从本地 checkpoint 恢复");
      return;
    }
    if (info.phase === "start") {
      completePriorSteps(stage);
      activeImportStage = stage;
      setStep(stage, "active", stage === "mineru" ? "正在提交并解析 PDF" : "运行中…");
      return;
    }
    if (info.phase === "progress") {
      activeImportStage = stage;
      const mineruStates = {
        "waiting-file": "等待 PDF 上传",
        pending: "等待 MinerU 调度",
        running: "MinerU 正在解析",
        converting: "正在生成 Markdown",
        done: "解析完成",
      };
      setStep(stage, "active", mineruStates[info.state] ?? "处理中…");
      return;
    }
    if (info.phase === "complete") {
      completePriorSteps(stage);
      const detail = stage === "mineru"
        ? `${info.pageCount ?? "?"} 页 marked Markdown`
        : (Number.isInteger(info.entries) ? `${info.entries} 个对象` : "完成");
      setStep(stage, "done", detail);
      return;
    }
    if (info.phase === "degraded") {
      completePriorSteps(stage);
      setStep(stage, "done", "部分完成，可稍后重试");
      return;
    }
    if (info.phase === "fail") {
      completePriorSteps(stage);
      activeImportStage = stage;
      setStep(stage, "done", `失败：${info.message ?? "请重试"}`);
    }
  }

  function finishExtractSteps(result) {
    const view = generatedMapView(result);
    if (isCanonicalMathMap(view)) {
      setStep("generate", "done", `${view.entries.length} 个对象 · ${view.inferences.length} 条推理`);
      setStep("validate", "done", "标准 JSON 合法");
      const repairs = Number(result?.diagnostics?.runReport?.repairAttempts ?? 0);
      setStep("repair", "done", repairs ? `已修复 ${repairs} 次` : "无需修复");
      return;
    }
    const missingStages = new Set(result?.diagnostics?.missingStages ?? []);
    const entries = view?.entries?.length ?? 0;
    const inferences = view?.inferences?.length ?? 0;
    setStep(
      "inference",
      "done",
      `${entries} 个对象 · ${inferences} 条推理${missingStages.has("inference") ? " · 部分完成" : ""}`,
    );
    let closureDetail = "全部已建立";
    try {
      const sem = window.GammaMathMapSemantics;
      if (sem?.computeClaimClosure) {
        const states = sem.computeClaimClosure(view.entries, view.inferences, {
          b0ClaimEntryIds: view.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [],
        }).claimStates;
        const openCount = view.entries.filter(
          (e) => e.entryClass === "claim" && states[e.id] !== "established",
        ).length;
        closureDetail = openCount === 0 ? "全部已建立" : `${openCount} 条 Claim 保持开放`;
      }
    } catch { /* 展示信息失败不影响结果 */ }
    setStep("closure", "done", `${closureDetail}${result?.status === "degraded" ? " · 部分结果" : ""}`);
  }

  function workflowMapRecord(result, fileName) {
    const cleanResult = sanitizeGeneratedResult(result);
    const projectView = cleanResult?.map ?? result;
    const title = (projectView?.project?.title || cleanResult?.sourceAnnotations?.source?.fileName?.replace(/\.pdf$/iu, "") || fileName.replace(/\.pdf$/iu, "") || "论文解析结果").trim();
    const boundaryLabel = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
    const rawId = projectView?.project?.id || cleanResult?.identity?.contentFingerprint || title || fileName;
    const workflowIdentity = cleanResult
      ? `${cleanResult.identity?.contentFingerprint ?? "content"}-${cleanResult.identity?.frozenWorkflow?.promptVersion ?? cleanResult.identity?.frozenWorkflow?.capabilitySyncIdentity ?? "capability"}-${cleanResult.identity?.frozenWorkflow?.productionContractVersion ?? "contract"}`
      : "";
    const slug = String(workflowIdentity ? `${rawId}-${workflowIdentity}` : rawId)
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .toLowerCase() || "paper-map";
    return {
      id: `imported:${slug}`,
      title,
      boundaryLabel,
      data: projectView,
      importedAt: Date.now(),
      isImported: true,
      ...(cleanResult ? { generatedResult: cleanResult } : {}),
    };
  }

  async function saveWorkflowMapToLibrary(projectView, fileName) {
    const map = workflowMapRecord(projectView, fileName);
    const saved = await persistImportedMap(map);
    sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, [saved || map]);
    saveSessionImportedMaps(sessionImportedMaps);
    const currentOrder = getFolderMapOrder("myMaps").filter((id) => id !== map.id);
    currentOrder.unshift(map.id);
    saveFolderMapOrder("myMaps", currentOrder);
    renderLibraryDrawer();
    showLibraryToast(`已保存到「未分类」：${map.title}`);
    return map;
  }

  function showExtractError(message) {
    extractStatus.hidden = false;
    extractStatus.classList.add("is-error");
    extractStatus.classList.remove("is-success");
    // 保留步骤列表，把错误附在下方，便于看到卡在哪一步
    const stepsHtml = extractStatus.querySelector(".extract-steps")?.outerHTML ?? "";
    extractStatus.innerHTML = `${stepsHtml}<p class="extract-error-text"></p>`;
    extractStatus.querySelector(".extract-error-text").textContent = message;
  }

  function showExtractSuccess(result, fileName) {
    const projectView = generatedMapView(result);
    const missingCount = result?.diagnostics?.missingStages?.length ?? 0;
    const unresolvedCount = result?.unresolvedItems?.length ?? 0;
    extractStatus.hidden = false;
    extractStatus.classList.add("is-success");
    extractStatus.classList.remove("is-error");
    const stepsHtml = extractStatus.querySelector(".extract-steps")?.outerHTML ?? "";
    extractStatus.innerHTML = `${stepsHtml}
      <p class="extract-success-title">✓ 解析完成</p>
      <p class="extract-success-sub">已自动保存到「我的 JSON 地图」${missingCount || unresolvedCount ? ` · ${missingCount} 个阶段待完善 · ${unresolvedCount} 个未解决项` : ""}</p>
      <div class="extract-success-actions">
        <button type="button" class="extract-open-map">立即在地图中打开</button>
        <button type="button" class="extract-open-library">打开地图库</button>
        <button type="button" class="extract-dismiss">关闭</button>
      </div>`;
    extractStatus.querySelector(".extract-open-map").addEventListener("click", () => {
      const boundary = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
      const title = projectView?.project?.title || result?.sourceAnnotations?.source?.fileName?.replace(/\.pdf$/i, "") || fileName.replace(/\.pdf$/i, "");
      openMapWithData(projectView, boundary, title);
    });
    extractStatus.querySelector(".extract-open-library").addEventListener("click", () => {
      closeAllPanels();
      openDrawer("library-drawer");
    });
    extractStatus.querySelector(".extract-dismiss").addEventListener("click", closeAllPanels);
  }

  function clearSelectedPaperPdf() {
    selectedPaperPdf = null;
    paperPdfInput.value = "";
    pdfDropZone?.classList.remove("has-file");
    if (dropMain) dropMain.textContent = DROP_MAIN_DEFAULT;
    if (dropSub) dropSub.textContent = DROP_SUB_DEFAULT;
  }

  function selectPaperPdf(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size <= 0 || file.size > 200 * 1024 * 1024) {
      clearSelectedPaperPdf();
      showExtractError("请选择一份不超过 200 MB 的 PDF 论文。");
      return;
    }
    selectedPaperPdf = file;
    resetExtractStatus();
    pdfDropZone.classList.add("has-file");
    pdfDropZone.setAttribute("aria-label", `已选择 ${file.name}`);
    if (dropMain) dropMain.textContent = file.name;
    if (dropSub) {
      const mb = file.size / 1048576;
      dropSub.textContent = `${mb >= 0.1 ? mb.toFixed(1) : "<0.1"} MB · 点击或拖拽可重新选择`;
    }
  }

  pdfDropZone?.addEventListener("click", () => paperPdfInput.click());
  paperPdfInput?.addEventListener("change", (event) => selectPaperPdf(event.target.files?.[0]));
  pdfDropZone?.addEventListener("dragover", (event) => event.preventDefault());
  pdfDropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    selectPaperPdf(event.dataTransfer?.files?.[0]);
  });

  function hasProvidedModelConsent() {
    try { return localStorage.getItem(MODEL_CONSENT_KEY) === MODEL_CONSENT_VERSION; }
    catch { return false; }
  }

  function finishModelConsent(accepted) {
    if (modelConsentCard) modelConsentCard.hidden = true;
    if (startExtractButton) startExtractButton.disabled = false;
    const resolve = modelConsentResolver;
    modelConsentResolver = null;
    resolve?.(accepted);
  }

  function requestProvidedModelConsent() {
    if (hasProvidedModelConsent()) return Promise.resolve(true);
    if (!modelConsentCard) return Promise.resolve(false);
    modelConsentCard.hidden = false;
    if (startExtractButton) startExtractButton.disabled = true;
    btnAcceptModelConsent?.focus();
    return new Promise((resolve) => { modelConsentResolver = resolve; });
  }

  btnAcceptModelConsent?.addEventListener("click", () => {
    try { localStorage.setItem(MODEL_CONSENT_KEY, MODEL_CONSENT_VERSION); } catch { /* consent applies to this run */ }
    finishModelConsent(true);
  });
  btnUseOwnModel?.addEventListener("click", () => {
    finishModelConsent(false);
    openDrawer("settings-drawer", btnUseOwnModel);
    applyAccessMode("own");
  });

  function createCmathMuseChatImpl() {
    return async ({ stage = "model", messages = [], maxTokens, responseFormat, reasoningEffort, signal } = {}) => {
      if (!MODEL_GATEWAY_URL) {
        const error = new Error("CMath 提供的模型服务尚未配置。");
        error.code = "CMATH_MODEL_UNAVAILABLE";
        throw error;
      }
      let response;
      try {
        response = await fetch(`${MODEL_GATEWAY_URL}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ stage, messages, maxTokens, responseFormat, reasoningEffort }),
          signal,
        });
      } catch (cause) {
        const error = new Error("暂时无法连接 CMath 提供的模型服务。");
        error.code = "CMATH_MODEL_UNAVAILABLE";
        error.cause = cause;
        throw error;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.content !== "string") {
        const messagesByStatus = {
          403: "当前地区或来源暂时无法使用 CMath 提供的模型。",
          429: "当前请求较多，CMath 提供的模型暂时繁忙。",
          503: "CMath 提供的模型正在维护或已临时停用。",
        };
        const error = new Error(messagesByStatus[response.status] || payload.error || "CMath 提供的模型暂时不可用。");
        error.code = "CMATH_MODEL_UNAVAILABLE";
        error.status = response.status;
        throw error;
      }
      return payload;
    };
  }

  function showProvidedModelFailure(message) {
    showExtractError(message);
    const actions = document.createElement("div");
    actions.className = "extract-error-actions";
    actions.innerHTML = '<button type="button" class="extract-retry-provided">稍后重试</button><button type="button" class="extract-use-own">使用自己的 API</button>';
    extractStatus.appendChild(actions);
    actions.querySelector(".extract-retry-provided")?.addEventListener("click", () => startExtractButton?.click());
    actions.querySelector(".extract-use-own")?.addEventListener("click", () => {
      openDrawer("settings-drawer");
      applyAccessMode("own");
    });
  }

  startExtractButton?.addEventListener("click", async () => {
    if (!selectedPaperPdf) {
      paperPdfInput.click();
      return;
    }
    const useProvidedModel = savedAccessMode === "cmath";
    if (useProvidedModel && !(await requestProvidedModelConsent())) return;
    if (useProvidedModel && !MODEL_GATEWAY_URL) {
      showProvidedModelFailure("CMath 提供的模型服务尚未完成部署，请稍后重试或使用自己的 API。");
      return;
    }
    const savedOwnConfig = readSavedModelConfig();
    const importProvider = useProvidedModel ? "cmath" : (savedOwnConfig?.provider || activeProviderKey);
    const apiKey = useProvidedModel
      ? "server-managed-credential"
      : (sessionKeyFor(importProvider) || apiKeyInput?.value.trim() || "");
    if (!useProvidedModel && !apiKey) {
      showExtractError(`请先在“设置 → 使用自己的 API”中填写 ${PROVIDER_CONFIGS[importProvider]?.label || "模型服务"} API Key。`);
      openDrawer("settings-drawer");
      applyAccessMode("own");
      return;
    }
    const model = useProvidedModel ? CMATH_PROVIDED_MODEL : (savedOwnConfig?.model || currentProviderModel());
    const endpoint = useProvidedModel ? MODEL_GATEWAY_URL : (savedOwnConfig?.endpoint || apiEndpointInput.value);
    const providerLabel = useProvidedModel ? "CMath 提供 · Muse Spark" : (PROVIDER_CONFIGS[importProvider]?.label || "模型服务");
    const chatImpl = useProvidedModel ? createCmathMuseChatImpl() : undefined;
    if (!MINERU_GATEWAY_URL) {
      showExtractError("MinerU 精准解析服务尚未配置，请稍后重试。");
      return;
    }
    if (!window.fflate?.unzipSync) {
      showExtractError("MinerU ZIP 解包组件没有加载，请刷新后重试。");
      return;
    }
    const originalLabel = startExtractButton.textContent;
    startExtractButton.disabled = true;
    startExtractButton.textContent = "解析中…";
    showExtractSteps();
    setStep("mineru", "active", "正在计算 PDF 指纹");
    try {
      if (!window.GammaPaperImportClient) throw new Error("论文导入组件没有加载，请刷新后重试");
      const generatedResult = await window.GammaPaperImportClient.requestPaperProductionImport({
        pdf: selectedPaperPdf,
        gatewayUrl: MINERU_GATEWAY_URL,
        unzip: (bytes) => window.fflate.unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
        mineruFetchImpl: window.fetch.bind(window),
        endpoint,
        apiKey,
        model,
        providerLabel,
        fetchImpl: modelFetch,
        chatImpl,
        onStage: handleImportStage,
        reasoningEffort: useProvidedModel ? undefined : currentModelReasoningEffort(),
      });
      await saveWorkflowMapToLibrary(generatedResult, selectedPaperPdf.name);
      setStep("save", "done", "已保存到我的 JSON 地图");
      finishExtractSteps(generatedResult);
      showExtractSuccess(generatedResult, selectedPaperPdf.name);
    } catch (error) {
      const message = error instanceof TypeError
        ? (activeImportStage === "mineru"
          ? "浏览器无法连接 MinerU 精准解析服务，请检查网络后重试。"
          : `浏览器无法直接连接 ${providerLabel}。请检查网络、API 服务地址以及服务端的跨域请求设置。`)
        : error.message;
      if (useProvidedModel && (error?.code === "CMATH_MODEL_UNAVAILABLE" || activeImportStage !== "mineru")) {
        showProvidedModelFailure(message);
      } else {
        showExtractError(message);
      }
    } finally {
      if (!useProvidedModel && apiKeyInput) {
        if (isLocalDesktop) {
          if (rememberKeyInput?.checked && apiKey.trim()) {
            persistLocalConfig(activeProviderKey, {
              apiKey,
              endpoint: apiEndpointInput?.value.trim() ?? "",
              model: currentProviderModel() ?? "",
            });
          } else if (!rememberKeyInput?.checked) {
            apiKeyInput.value = "";
          }
        } else {
          if (apiKey.trim()) rememberSessionKey(activeProviderKey, apiKey);
          apiKeyInput.value = "";
        }
      }
      startExtractButton.disabled = false;
      startExtractButton.textContent = originalLabel;
    }
  });

  // --- Connection Tester ---
  function showTestResult(message, isError) {
    if (!testConnectionResult) return;
    testConnectionResult.hidden = false;
    testConnectionResult.textContent = message;
    testConnectionResult.classList.toggle("is-error", Boolean(isError));
    testConnectionResult.classList.toggle("is-success", !isError);
  }

  async function testModelConnection() {
    const endpoint = apiEndpointInput?.value.trim() ?? "";
    const apiKey = apiKeyInput?.value.trim() ?? "";
    const model = modelSelect?.value === "custom" ? (customModelInput?.value.trim() ?? "") : (modelSelect?.value ?? "");
    if (!endpoint) { showTestResult("请先填写 API 服务地址。", true); return; }
    if (!apiKey) { showTestResult(`请先填写 ${PROVIDER_CONFIGS[activeProviderKey].label} 的 API Key。`, true); return; }
    if (!model) { showTestResult("请填写模型名称。", true); return; }

    if (btnTestConnection) {
      btnTestConnection.disabled = true;
      btnTestConnection.textContent = "测试中…";
    }
    try {
      const targetUrl = window.GammaPaperImportClient.endpointUrl(endpoint);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      let response;
      try {
        response = await modelFetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "请只回复 OK 两个字。" }],
            max_tokens: 512,
            stream: false,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const responseText = await response.text();
      if (!response.ok) {
        let detail = "";
        try { detail = JSON.parse(responseText).error?.message || ""; } catch { detail = responseText.slice(-200); }
        const statusHints = {
          401: "Key 无效或未授权（HTTP 401）。",
          403: "Key 无权限访问（HTTP 403）。",
          404: "端点路径不存在（HTTP 404）。检查地址是否以 /v1 或对应 base 结尾。",
          429: "请求被限流（HTTP 429）。",
        };
        showTestResult(`${statusHints[response.status] ?? `端点返回 HTTP ${response.status}。`}${detail ? ` 服务端信息：${detail}` : ""}`, true);
        return;
      }
      let envelope;
      try { envelope = JSON.parse(responseText); }
      catch { showTestResult("端点返回了非 JSON 响应，可能不是 OpenAI 兼容服务。", true); return; }
      if (envelope?.error) {
        showTestResult(`服务端错误：${String(envelope.error?.message ?? envelope.error).slice(0, 200)}`, true);
        return;
      }
      const rawContent = envelope?.choices?.[0]?.message?.content ?? "";
      const content = typeof rawContent === "string"
        ? rawContent
        : (Array.isArray(rawContent) ? rawContent.map((part) => (typeof part === "string" ? part : part?.text ?? "")).join("") : "");
      const finishReason = envelope?.choices?.[0]?.finish_reason;
      if (!content && finishReason === "length") {
        showTestResult("连接成功，但模型把全部输出额度用于推理仍未完成（推理模型 + 配额不足）。导入时会使用更大额度。", false);
        return;
      }
      const reply = String(content).slice(0, 80).replace(/\s+/gu, " ").trim();
      showTestResult(`连接成功（${model}）。${reply ? `模型回应：${reply}` : "模型已响应。"}`, false);
    } catch (error) {
      if (error?.name === "AbortError") {
        showTestResult("连接超时（60 秒未响应）。请检查地址与网络。", true);
      } else if (error instanceof TypeError) {
        showTestResult("无法连接端点。常见原因：地址不可达、证书问题，或端点未开放浏览器跨域（CORS）。", true);
      } else if (error instanceof Error && /API 服务地址/u.test(error.message)) {
        showTestResult(error.message, true);
      } else {
        showTestResult(error?.message ?? "未知错误。", true);
      }
    } finally {
      if (btnTestConnection) {
        btnTestConnection.disabled = false;
        btnTestConnection.textContent = "测试连接";
      }
    }
  }

  btnTestConnection?.addEventListener("click", testModelConnection);

  // --- Inline SVG Icons & Utility ---
  const ICONS = {
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    warning: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    error: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  };

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Workbench Entrance 2: Batch & Single JSON Import Drawer ---
  let stagedBatchItems = [];

  const batchValidationSection = document.querySelector("#batch-validation-section");
  const batchTotalCount = document.querySelector("#batch-total-count");
  const batchStatusSummary = document.querySelector("#batch-status-summary");
  const batchFilesList = document.querySelector("#batch-files-list");
  const footerValidHint = document.querySelector("#footer-valid-hint");
  const btnResetImport = document.querySelector("#btn-reset-import");
  const btnStartBatchImport = document.querySelector("#btn-start-batch-import");
  const btnChooseJsonFiles = document.querySelector("#btn-choose-json-files");
  const importDropZone = document.querySelector("#import-drop-zone");

  const batchJsonFileInput = document.createElement("input");
  batchJsonFileInput.type = "file";
  batchJsonFileInput.accept = ".json,application/json";
  batchJsonFileInput.multiple = true;
  batchJsonFileInput.hidden = true;
  document.body.appendChild(batchJsonFileInput);

  const cardOpenJson = document.querySelector("#card-open-json");
  cardOpenJson?.addEventListener("click", (e) => {
    openDrawer("import-drawer", e.currentTarget);
  });
  cardOpenJson?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDrawer("import-drawer", cardOpenJson);
    }
  });

  document.querySelector("#btn-map-open-json")?.addEventListener("click", (e) => {
    openDrawer("import-drawer", e.currentTarget);
  });

  function exportCurrentMapJson() {
    if (!currentActiveMapData) {
      showLibraryToast("当前没有可导出的地图");
      return;
    }
    const rawName = currentActiveMapTitle || currentActiveMapData?.project?.title || "math-map";
    const base = String(rawName)
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "math-map";
    const blob = new Blob(
      [`${JSON.stringify(currentActiveMapData, null, 2)}\n`],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showLibraryToast(`已导出 JSON：${link.download}`);
  }

  document.querySelector("#btn-map-export-json")?.addEventListener("click", exportCurrentMapJson);
  document.querySelector("#btn-close-import-drawer")?.addEventListener("click", closeAllPanels);

  btnChooseJsonFiles?.addEventListener("click", (e) => {
    e.stopPropagation();
    batchJsonFileInput.click();
  });
  importDropZone?.addEventListener("click", () => {
    batchJsonFileInput.click();
  });
  importDropZone?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      batchJsonFileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((name) => {
    importDropZone?.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      importDropZone.classList.add("is-dragover");
    });
  });
  ["dragleave", "dragend"].forEach((name) => {
    importDropZone?.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      importDropZone.classList.remove("is-dragover");
    });
  });
  importDropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    importDropZone.classList.remove("is-dragover");
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) handleSelectedImportFiles(files);
  });
  batchJsonFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleSelectedImportFiles(files);
  });

  async function handleSelectedImportFiles(files) {
    if (!files.length) return;

    if (!window.GammaGenericMathMapPreviewLoader || !window.GammaMathMapContentLoader || !window.GammaMathMapProjectAdapter || !window.GammaCanonicalMathMapAdapter) {
      alert("数学地图核心能力模块尚未完全就绪，请刷新页面重试。");
      return;
    }

    const existingIds = new Set([
      ...CURATED_DEMO_IDS,
      ...(window.CMATH_GENERIC_MAP_REGISTRY?.maps || []).map((m) => m.id),
      ...sessionImportedMaps.map((m) => m.id),
      ...stagedBatchItems.map((item) => item.finalId).filter(Boolean),
    ]);

    for (const file of files) {
      try {
        let result;
        const parsed = JSON.parse(await file.text());
        if (isCanonicalMathMap(parsed)) {
          result = { data: parsed, definition: { title: file.name.replace(/\.json$/iu, "") } };
        } else {
          result = await window.GammaGenericMathMapPreviewLoader.loadFile(file, {
            loader: window.GammaMathMapContentLoader,
            adapter: window.GammaMathMapProjectAdapter,
          });
        }

        const rawTitle = (result.definition?.title || result.data?.project?.title || file.name.replace(/\.json$/iu, "") || "未命名地图").trim();
        const rawBoundary = (result.definition?.boundaryLabel || result.data?.channelOptions?.boundaryLabel || "本地导入 · 数学地图").trim();

        let baseSlug = (result.data?.project?.id || rawTitle || file.name.replace(/\.json$/iu, ""))
          .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/gu, "-")
          .toLowerCase();
        if (!baseSlug) baseSlug = "map";

        let candidateId = `imported:${baseSlug}`;
        let hasConflict = existingIds.has(candidateId);
        let finalId = candidateId;

        if (hasConflict) {
          let suffix = 2;
          while (existingIds.has(`imported:${baseSlug}-${suffix}`)) {
            suffix++;
          }
          finalId = `imported:${baseSlug}-${suffix}`;
        }
        existingIds.add(finalId);

        const nodeCount = result.data?.entries?.length ?? result.data?.project?.nodes?.length ?? result.data?.nodes?.length ?? 0;
        const inferenceCount = result.data?.project?.inferences?.length ?? result.data?.inferences?.length ?? 0;

        if (hasConflict) {
          stagedBatchItems.push({
            file,
            name: file.name,
            status: "warning",
            badgeText: "名称冲突，将自动重命名",
            statusText: `ID 冲突，导入时将自动重命名为「${finalId}」· 包含 ${nodeCount} 节点 / ${inferenceCount} 推理`,
            title: rawTitle,
            boundaryLabel: rawBoundary,
            data: result.data,
            finalId,
          });
        } else {
          stagedBatchItems.push({
            file,
            name: file.name,
            status: "valid",
            badgeText: "可导入",
            statusText: `数据结构校验通过 · 包含 ${nodeCount} 节点 / ${inferenceCount} 推理`,
            title: rawTitle,
            boundaryLabel: rawBoundary,
            data: result.data,
            finalId,
          });
        }
      } catch (err) {
        stagedBatchItems.push({
          file,
          name: file.name,
          status: "error",
          badgeText: "格式无效",
          statusText: `校验未通过：${err.message || "文件内容不符合标准数学地图或 Project View 格式"}`,
          title: file.name,
          boundaryLabel: "格式异常",
          data: null,
          finalId: null,
        });
      }
    }

    renderBatchValidationUI();
  }

  function renderBatchValidationUI() {
    if (!batchValidationSection || !batchFilesList) return;

    if (stagedBatchItems.length === 0) {
      batchValidationSection.hidden = true;
      batchFilesList.innerHTML = "";
      if (footerValidHint) footerValidHint.textContent = "请选择或拖入 JSON 文件";
      if (btnStartBatchImport) {
        btnStartBatchImport.disabled = true;
        btnStartBatchImport.textContent = "导入 0 张有效地图";
      }
      return;
    }

    batchValidationSection.hidden = false;
    if (batchTotalCount) batchTotalCount.textContent = String(stagedBatchItems.length);

    const validCount = stagedBatchItems.filter((i) => i.status === "valid").length;
    const warnCount = stagedBatchItems.filter((i) => i.status === "warning").length;
    const errCount = stagedBatchItems.filter((i) => i.status === "error").length;
    const totalValid = validCount + warnCount;

    if (batchStatusSummary) {
      const parts = [];
      if (validCount) parts.push(`${validCount} 可导入`);
      if (warnCount) parts.push(`${warnCount} 冲突重命名`);
      if (errCount) parts.push(`${errCount} 无效`);
      batchStatusSummary.textContent = parts.join(" · ") || "无有效项";
    }

    batchFilesList.innerHTML = "";
    stagedBatchItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = `batch-file-row status-${item.status}`;
      row.setAttribute("role", "listitem");

      const iconHtml = item.status === "valid" ? ICONS.check : (item.status === "warning" ? ICONS.warning : ICONS.error);

      row.innerHTML = `
        <div class="row-main-col">
          <div class="row-file-name">${escapeHtml(item.name)}</div>
          ${item.title && item.status !== "error" ? `<div class="row-map-title">${escapeHtml(item.title)}</div>` : ""}
          <div class="row-status-text">${escapeHtml(item.statusText)}</div>
        </div>
        <div class="row-badge-col">
          <span class="status-badge badge-${item.status}">
            ${iconHtml}
            <span>${escapeHtml(item.badgeText)}</span>
          </span>
        </div>
      `;

      batchFilesList.appendChild(row);
    });

    if (footerValidHint) {
      if (totalValid > 0) {
        footerValidHint.textContent = `已准备好 ${totalValid} 张有效地图${errCount ? `（${errCount} 个无效文件将被跳过）` : ""}`;
      } else {
        footerValidHint.textContent = `所选文件均无效，请检查后再试`;
      }
    }

    if (btnStartBatchImport) {
      if (totalValid > 0) {
        btnStartBatchImport.disabled = false;
        btnStartBatchImport.textContent = `导入 ${totalValid} 张有效地图`;
      } else {
        btnStartBatchImport.disabled = true;
        btnStartBatchImport.textContent = "导入 0 张有效地图";
      }
    }
  }

  function resetImportDrawer() {
    stagedBatchItems = [];
    batchJsonFileInput.value = "";
    renderBatchValidationUI();
  }

  btnResetImport?.addEventListener("click", () => {
    resetImportDrawer();
  });

  btnStartBatchImport?.addEventListener("click", async () => {
    const validItems = stagedBatchItems.filter((i) => i.status === "valid" || i.status === "warning");
    if (!validItems.length) return;

    const newMaps = validItems.map((item) => ({
      id: item.finalId,
      title: item.title,
      boundaryLabel: item.boundaryLabel,
      data: item.data,
      importedAt: Date.now(),
      isImported: true,
    }));

    let importedMaps = newMaps;
    if (isLocalDesktop) {
      btnStartBatchImport.disabled = true;
      btnStartBatchImport.textContent = "正在保存到本地地图库…";
      try {
        importedMaps = await Promise.all(newMaps.map(persistImportedMap));
      } catch (error) {
        alert("保存到本地数学地图库失败：\n" + error.message);
        renderBatchValidationUI();
        return;
      }
    }

    sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, importedMaps);
    saveSessionImportedMaps(sessionImportedMaps);

    const importedIds = importedMaps.map((m) => m.id);
    const currentOrder = getFolderMapOrder("myMaps").filter((id) => !importedIds.includes(id));
    currentOrder.unshift(...importedIds);
    saveFolderMapOrder("myMaps", currentOrder);

    closeAllPanels();
    highlightedLibraryMapIds = new Set(importedIds);
    openDrawer("library-drawer", btnStartBatchImport);
    showLibraryToast(`已导入 ${importedMaps.length} 张地图`);
  });

  // --- Workbench Entrance 3: Unified Math Map Library Drawer ---
  const CURATED_DEMO_IDS = [
    "spectral-theorem",
    "intermediate-value-theorem",
    "fundamental-theorem-calculus",
  ];
  const MY_MAPS_ORDER_KEY = "cmath.math-map.my-maps-order-v1";
  const BUILTIN_MAPS_ORDER_KEY = "cmath.math-map.builtin-maps-order-v1";
  const LIBRARY_COLLAPSED_KEY = "cmath.math-map.library-collapsed-v2";
  const LIBRARY_COLLAPSED_INITIALIZED_KEY = "cmath.math-map.library-collapsed-v2-initialized";
  const CUSTOM_FOLDERS_KEY = "cmath.math-map.custom-folders-v1";
  const MAP_FOLDER_ASSIGNMENTS_KEY = "cmath.math-map.map-folder-assignments-v1";
  const FOLDER_MAP_ORDER_KEY = "cmath.math-map.folder-map-order-v1";
  let isActivatingMap = false;

  let currentDragMap = null;
  let currentDragFolderId = null;
  let autoExpandTimer = null;
  let autoExpandFolderId = null;
  let pendingDeleteFolder = null;
  let toastTimeout = null;
  let undoTimeout = null;
  let pendingUndo = null;
  let highlightedLibraryMapIds = new Set();

  function getCustomFolders() {
    try {
      const raw = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((f) => f && typeof f.id === "string" && f.id.trim() && typeof f.name === "string" && f.name.trim());
    } catch {
      return [];
    }
  }

  function saveCustomFolders(folders, skipPersist = false) {
    try {
      localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(folders));
    } catch { /* noop */ }
    if (!skipPersist) schedulePersistLibraryOrganization();
  }

  function getMapFolderAssignments() {
    try {
      const raw = localStorage.getItem(MAP_FOLDER_ASSIGNMENTS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      return {};
    } catch {
      return {};
    }
  }

  function saveMapFolderAssignments(assignments, skipPersist = false) {
    try {
      localStorage.setItem(MAP_FOLDER_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch { /* noop */ }
    if (!skipPersist) schedulePersistLibraryOrganization();
  }

  function getFolderMapOrder(folderId) {
    try {
      const raw = localStorage.getItem(FOLDER_MAP_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed[folderId])) {
          return parsed[folderId].filter((id) => typeof id === "string");
        }
      }
    } catch { /* noop */ }

    // Fallbacks for system folders from legacy keys
    if (folderId === "myMaps") {
      try {
        const raw = localStorage.getItem(MY_MAPS_ORDER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.filter((id) => typeof id === "string");
        }
      } catch { /* noop */ }
    } else if (folderId === "builtin") {
      try {
        const raw = localStorage.getItem(BUILTIN_MAPS_ORDER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.filter((id) => typeof id === "string");
        }
      } catch { /* noop */ }
    }
    return [];
  }

  function getAllFolderMapOrders() {
    let orders = {};
    try {
      const raw = localStorage.getItem(FOLDER_MAP_ORDER_KEY);
      if (raw) orders = JSON.parse(raw) || {};
    } catch { orders = {}; }
    if (!Array.isArray(orders.myMaps)) orders.myMaps = getFolderMapOrder("myMaps");
    if (!Array.isArray(orders.builtin)) orders.builtin = getFolderMapOrder("builtin");
    return orders;
  }

  function saveFolderMapOrder(folderId, ids, skipPersist = false) {
    try {
      let orders = {};
      try {
        const raw = localStorage.getItem(FOLDER_MAP_ORDER_KEY);
        if (raw) orders = JSON.parse(raw) || {};
      } catch { orders = {}; }
      orders[folderId] = ids;
      localStorage.setItem(FOLDER_MAP_ORDER_KEY, JSON.stringify(orders));

      // Also sync legacy keys for backwards compatibility if system folder
      if (folderId === "myMaps") {
        localStorage.setItem(MY_MAPS_ORDER_KEY, JSON.stringify(ids));
      } else if (folderId === "builtin") {
        localStorage.setItem(BUILTIN_MAPS_ORDER_KEY, JSON.stringify(ids));
      }
    } catch { /* noop */ }
    if (!skipPersist) schedulePersistLibraryOrganization();
  }

  function getFullLibraryState() {
    return normalizeLibraryState({
      customFolders: getCustomFolders(),
      assignments: getMapFolderAssignments(),
      orders: getAllFolderMapOrders(),
      collapsed: getCollapsedState(),
      updatedAt: Date.now(),
    });
  }

  function applyLibraryState(state) {
    if (!state || typeof state !== "object") return;
    const normalized = normalizeLibraryState(state);
    if (Array.isArray(state.customFolders)) {
      saveCustomFolders(normalized.customFolders, true);
    }
    if (state.assignments && typeof state.assignments === "object") {
      saveMapFolderAssignments(normalized.assignments, true);
    }
    if (state.orders && typeof state.orders === "object") {
      try {
        localStorage.setItem(FOLDER_MAP_ORDER_KEY, JSON.stringify(normalized.orders));
        if (Array.isArray(normalized.orders.myMaps)) {
          localStorage.setItem(MY_MAPS_ORDER_KEY, JSON.stringify(normalized.orders.myMaps));
        }
        if (Array.isArray(normalized.orders.builtin)) {
          localStorage.setItem(BUILTIN_MAPS_ORDER_KEY, JSON.stringify(normalized.orders.builtin));
        }
      } catch { /* noop */ }
    }
    if (localStorage.getItem(LIBRARY_COLLAPSED_INITIALIZED_KEY) === "true" && state.collapsed && typeof state.collapsed === "object") {
      saveCollapsedState(normalized.collapsed, true);
    }
  }

  let persistOrgTimer = null;
  function schedulePersistLibraryOrganization() {
    if (persistOrgTimer) clearTimeout(persistOrgTimer);
    persistOrgTimer = setTimeout(() => {
      persistOrgTimer = null;
      persistLibraryOrganization();
    }, 60);
  }

  async function persistLibraryOrganization() {
    const state = getFullLibraryState();
    if (isLocalDesktop) {
      try {
        await fetch("/api/library-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(state),
        });
      } catch (err) {
        console.warn("无法保存地图库组织结构到本地后端:", err);
      }
    } else {
      try {
        await idbSaveLibraryState(state);
      } catch (err) {
        console.warn("无法保存地图库组织结构到 IndexedDB:", err);
      }
    }
  }

  function getAllMovableMaps() {
    return (sessionImportedMaps || []).map((m) => ({ ...m, origin: "myMaps", isImported: true }));
  }

  function getMapAssignedFolder(mapDef, customFolders) {
    const customFolderIds = new Set(customFolders.map((f) => f.id));
    const assignments = getMapFolderAssignments();
    const assigned = assignments[mapDef.id];
    if (assigned && customFolderIds.has(assigned)) {
      return assigned;
    }
    if (assigned === "myMaps" && mapDef.isImported) {
      return "myMaps";
    }
    if (assigned === "builtin" && !mapDef.isImported) {
      return "builtin";
    }
    return mapDef.isImported ? "myMaps" : "builtin";
  }

  function getOrderedMapsForFolder(folderId, customFolders) {
    const allMovable = getAllMovableMaps();
    const mapsInFolder = allMovable.filter((m) => getMapAssignedFolder(m, customFolders) === folderId);
    const mapsById = new Map(mapsInFolder.map((m) => [m.id, m]));

    const savedOrder = getFolderMapOrder(folderId);
    const ordered = [];
    const seen = new Set();
    for (const id of savedOrder) {
      if (mapsById.has(id) && !seen.has(id)) {
        ordered.push(mapsById.get(id));
        seen.add(id);
      }
    }
    for (const m of mapsInFolder) {
      if (!seen.has(m.id)) {
        ordered.push(m);
        seen.add(m.id);
      }
    }
    return ordered;
  }

  function getFolderName(folderId, customFolders) {
    if (folderId === "curated") return "系统示例";
    if (folderId === "myMaps") return "未分类";
    if (folderId === "builtin") return "系统示例";
    const custom = (customFolders || getCustomFolders()).find((f) => f.id === folderId);
    return custom ? custom.name : "文件夹";
  }

  function isFolderEligibleForMap(folderId, mapDef) {
    if (!folderId || !mapDef || !mapDef.isImported || folderId === "curated" || folderId === "builtin") return false;
    return folderId === "myMaps" || getCustomFolders().some((folder) => folder.id === folderId);
  }

  function focusCard(mapId) {
    const selector = typeof CSS !== "undefined" && CSS.escape
      ? `.map-item-card[data-map-id="${CSS.escape(mapId)}"]`
      : `.map-item-card[data-map-id="${mapId.replace(/"/g, '\\"')}"]`;
    const card = document.querySelector(selector);
    if (card) card.focus();
  }

  function showLibraryToast(message, undoAction = null) {
    const toast = document.querySelector("#library-feedback-toast");
    const liveRegion = document.querySelector("#library-live-region");
    if (liveRegion) liveRegion.textContent = message;
    if (toast) {
      toast.replaceChildren();
      const label = document.createElement("span");
      label.textContent = message;
      toast.appendChild(label);
      if (undoAction) {
        pendingUndo = undoAction;
        const undoButton = document.createElement("button");
        undoButton.type = "button";
        undoButton.className = "library-toast-undo";
        undoButton.textContent = "撤销";
        undoButton.addEventListener("click", async () => {
          const action = pendingUndo;
          pendingUndo = null;
          if (undoTimeout) clearTimeout(undoTimeout);
          if (action) await action();
        }, { once: true });
        toast.appendChild(undoButton);
      } else {
        pendingUndo = null;
      }
      toast.hidden = false;
      void toast.offsetWidth;
      toast.classList.add("is-visible");
      if (toastTimeout) clearTimeout(toastTimeout);
      const duration = undoAction ? 6000 : 2200;
      undoTimeout = setTimeout(() => { pendingUndo = null; }, duration);
      toastTimeout = setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => {
          if (!toast.classList.contains("is-visible")) toast.hidden = true;
        }, 200);
      }, duration);
    }
  }

  function moveMapToFolder(mapId, targetFolderId, options = {}) {
    const customFolders = getCustomFolders();
    const assignments = getMapFolderAssignments();
    const allMovable = getAllMovableMaps();
    const mapDef = allMovable.find((m) => m.id === mapId);
    if (!mapDef || !isFolderEligibleForMap(targetFolderId, mapDef)) return;

    const prevFolderId = getMapAssignedFolder(mapDef, customFolders);
    if (prevFolderId === targetFolderId) return;

    if (targetFolderId === "myMaps" || targetFolderId === "builtin") {
      delete assignments[mapId];
    } else {
      assignments[mapId] = targetFolderId;
    }
    saveMapFolderAssignments(assignments);

    // Remove from previous folder's order
    const prevOrder = getFolderMapOrder(prevFolderId).filter((id) => id !== mapId);
    saveFolderMapOrder(prevFolderId, prevOrder);

    // Append to target folder's order
    const targetOrder = getFolderMapOrder(targetFolderId).filter((id) => id !== mapId);
    targetOrder.push(mapId);
    saveFolderMapOrder(targetFolderId, targetOrder);

    // If target folder is collapsed, auto-expand it
    const collapsedState = getCollapsedState();
    if (collapsedState[targetFolderId]) {
      collapsedState[targetFolderId] = false;
      saveCollapsedState(collapsedState);
    }

    renderLibraryDrawer();

    const targetFolderName = getFolderName(targetFolderId, customFolders);
    if (options.suppressUndo) {
      showLibraryToast(`已恢复「${mapDef.title || mapId}」的位置`);
    } else {
      showLibraryToast(`已将「${mapDef.title || mapId}」移动到「${targetFolderName}」`, async () => {
        moveMapToFolder(mapId, prevFolderId, { suppressUndo: true });
      });
    }

    setTimeout(() => {
      focusCard(mapId);
    }, 50);
  }

  function insertMapAtPosition(mapId, sourceFolderId, targetFolderId, targetMapId, isBefore) {
    const customFolders = getCustomFolders();
    const assignments = getMapFolderAssignments();
    const allMovable = getAllMovableMaps();
    const mapDef = allMovable.find((m) => m.id === mapId);
    if (!mapDef || !isFolderEligibleForMap(targetFolderId, mapDef)) return;

    if (sourceFolderId !== targetFolderId) {
      if (targetFolderId === "myMaps" || targetFolderId === "builtin") {
        delete assignments[mapId];
      } else {
        assignments[mapId] = targetFolderId;
      }
      saveMapFolderAssignments(assignments);

      const sourceOrder = getFolderMapOrder(sourceFolderId).filter((id) => id !== mapId);
      saveFolderMapOrder(sourceFolderId, sourceOrder);
    }

    const currentOrdered = getOrderedMapsForFolder(targetFolderId, customFolders);
    let targetOrder = currentOrdered.map((m) => m.id).filter((id) => id !== mapId);

    const targetIdx = targetOrder.indexOf(targetMapId);
    if (targetIdx !== -1) {
      const insertIdx = isBefore ? targetIdx : targetIdx + 1;
      targetOrder.splice(insertIdx, 0, mapId);
    } else {
      targetOrder.push(mapId);
    }

    saveFolderMapOrder(targetFolderId, targetOrder);

    // Uncollapse target folder if collapsed
    const collapsedState = getCollapsedState();
    if (collapsedState[targetFolderId]) {
      collapsedState[targetFolderId] = false;
      saveCollapsedState(collapsedState);
    }

    renderLibraryDrawer();

    const targetFolderName = getFolderName(targetFolderId, customFolders);
    if (sourceFolderId !== targetFolderId) {
      showLibraryToast(`已将「${mapDef.title || mapId}」移动到「${targetFolderName}」`);
    } else {
      showLibraryToast(`已调整「${mapDef.title || mapId}」的显示顺序`);
    }

    setTimeout(() => {
      focusCard(mapId);
    }, 50);
  }

  function moveMapInFolder(folderId, mapId, delta) {
    const customFolders = getCustomFolders();
    const list = getOrderedMapsForFolder(folderId, customFolders);
    const ids = list.map((m) => m.id);
    const idx = ids.indexOf(mapId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= ids.length) return;
    const [moved] = ids.splice(idx, 1);
    ids.splice(nextIdx, 0, moved);
    saveFolderMapOrder(folderId, ids);
    renderLibraryDrawer();
    focusCard(mapId);
  }

  async function deleteUserMap(mapDef, folderId) {
    if (!mapDef?.isImported) return;
    const assignmentsBefore = getMapFolderAssignments();
    const ordersBefore = getAllFolderMapOrders();
    try {
      await deletePersistedMap(mapDef.id);
      sessionImportedMaps = sessionImportedMaps.filter((map) => map.id !== mapDef.id);
      saveSessionImportedMaps(sessionImportedMaps);
      const assignments = getMapFolderAssignments();
      delete assignments[mapDef.id];
      saveMapFolderAssignments(assignments);
      Object.entries(getAllFolderMapOrders()).forEach(([id, order]) => {
        if (Array.isArray(order)) saveFolderMapOrder(id, order.filter((mapId) => mapId !== mapDef.id));
      });
      renderLibraryDrawer();
      showLibraryToast(`已删除「${mapDef.title || mapDef.id}」`, async () => {
        await persistImportedMap(mapDef);
        sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, [mapDef]);
        saveSessionImportedMaps(sessionImportedMaps);
        saveMapFolderAssignments(assignmentsBefore);
        Object.entries(ordersBefore).forEach(([id, order]) => saveFolderMapOrder(id, order));
        renderLibraryDrawer();
        showLibraryToast(`已恢复「${mapDef.title || mapDef.id}」`);
      });
      if (currentActiveMapId === mapDef.id) {
        const next = new URL(window.location.href);
        next.search = "";
        window.location.assign(next);
      }
    } catch (error) {
      showLibraryToast(`删除失败：${error.message}`);
    }
  }

  function getCollapsedState() {
    try {
      const raw = localStorage.getItem(LIBRARY_COLLAPSED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch { /* noop */ }
    return { curated: true, myMaps: false, builtin: true };
  }

  function saveCollapsedState(state, skipPersist = false) {
    try {
      localStorage.setItem(LIBRARY_COLLAPSED_KEY, JSON.stringify(state));
      if (!skipPersist) localStorage.setItem(LIBRARY_COLLAPSED_INITIALIZED_KEY, "true");
    } catch { /* noop */ }
    if (!skipPersist) schedulePersistLibraryOrganization();
  }

  function toggleFolder(folderKey) {
    const state = getCollapsedState();
    state[folderKey] = !state[folderKey];
    saveCollapsedState(state);
    applyCollapsedState();
  }

  function applyCollapsedState() {
    const state = getCollapsedState();
    ["curated", "myMaps", "builtin"].forEach((key) => {
      const sectionId = key === "curated" ? "section-curated-demos" : (key === "myMaps" ? "section-my-maps" : "section-builtin-maps");
      const section = document.querySelector(`.map-library-section#${sectionId}`);
      const header = section?.querySelector(`.folder-accordion-header`);
      const isCollapsed = Boolean(state[key]);
      if (section) {
        section.classList.toggle("is-collapsed", isCollapsed);
      }
      if (header) {
        header.classList.toggle("is-collapsed", isCollapsed);
        header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      }
    });

    const customFolders = getCustomFolders();
    customFolders.forEach((folder) => {
      const section = document.querySelector(`.map-library-section#section-${folder.id}`);
      const header = section?.querySelector(`.folder-accordion-header`);
      const isCollapsed = Boolean(state[folder.id]);
      if (section) {
        section.classList.toggle("is-collapsed", isCollapsed);
      }
      if (header) {
        header.classList.toggle("is-collapsed", isCollapsed);
        header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      }
    });
  }

  // --- Inline Folder Creation Controls ---
  const btnCreateFolder = document.querySelector("#btn-create-folder");
  const newFolderFormPanel = document.querySelector("#new-folder-form-panel");
  const newFolderInput = document.querySelector("#new-folder-input");
  const btnConfirmFolder = document.querySelector("#btn-confirm-folder");
  const btnCancelFolder = document.querySelector("#btn-cancel-folder");
  const newFolderErrorMsg = document.querySelector("#new-folder-error-msg");

  document.querySelector("#btn-library-import-json")?.addEventListener("click", (event) => {
    openDrawer("import-drawer", event.currentTarget);
  });

  function openNewFolderForm() {
    if (!newFolderFormPanel) return;
    newFolderFormPanel.hidden = false;
    if (btnCreateFolder) {
      btnCreateFolder.hidden = true;
      btnCreateFolder.setAttribute("aria-expanded", "true");
    }
    if (newFolderInput) {
      newFolderInput.value = "";
      newFolderInput.focus();
    }
    hideNewFolderError();
  }

  function closeNewFolderForm() {
    if (!newFolderFormPanel) return;
    newFolderFormPanel.hidden = true;
    if (btnCreateFolder) {
      btnCreateFolder.hidden = false;
      btnCreateFolder.setAttribute("aria-expanded", "false");
      btnCreateFolder.focus();
    }
    if (newFolderInput) newFolderInput.value = "";
    hideNewFolderError();
  }

  function showNewFolderError(msg) {
    if (!newFolderErrorMsg) return;
    newFolderErrorMsg.textContent = msg;
    newFolderErrorMsg.hidden = false;
  }

  function hideNewFolderError() {
    if (!newFolderErrorMsg) return;
    newFolderErrorMsg.textContent = "";
    newFolderErrorMsg.hidden = true;
  }

  function submitNewFolder() {
    const rawName = newFolderInput?.value || "";
    const name = rawName.trim();
    if (!name) {
      showNewFolderError("文件夹名称不能为空");
      newFolderInput?.focus();
      return;
    }

    const systemFolderNames = ["系统示例", "我的地图", "未分类", "精选 Demo", "我的 JSON 地图", "内置地图库"];
    const existingFolders = getCustomFolders();
    const isDuplicate = systemFolderNames.some((sn) => sn.toLowerCase() === name.toLowerCase()) ||
      existingFolders.some((f) => f.name.toLowerCase() === name.toLowerCase());

    if (isDuplicate) {
      showNewFolderError("已存在同名文件夹，请输入其他名称");
      newFolderInput?.focus();
      return;
    }

    const folderId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newFolder = {
      id: folderId,
      name,
      createdAt: Date.now(),
    };

    existingFolders.push(newFolder);
    saveCustomFolders(existingFolders);

    closeNewFolderForm();
    renderLibraryDrawer();
    showLibraryToast(`已创建文件夹「${name}」`);

    setTimeout(() => {
      const header = document.querySelector(`.folder-accordion-header[data-folder="${folderId}"]`);
      if (header) header.focus();
    }, 50);
  }

  btnCreateFolder?.addEventListener("click", () => {
    openNewFolderForm();
  });

  btnCancelFolder?.addEventListener("click", () => {
    closeNewFolderForm();
  });

  btnConfirmFolder?.addEventListener("click", () => {
    submitNewFolder();
  });

  newFolderInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitNewFolder();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeNewFolderForm();
    }
  });

  newFolderInput?.addEventListener("input", () => {
    hideNewFolderError();
  });

  document.querySelectorAll(".folder-accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const folderKey = header.dataset.folder;
      if (folderKey) toggleFolder(folderKey);
    });
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const folderKey = header.dataset.folder;
        if (folderKey) toggleFolder(folderKey);
      }
    });
  });

  // --- In-Drawer Custom Folder Deletion Surface ---
  function promptDeleteCustomFolder(folder) {
    pendingDeleteFolder = folder;
    const overlay = document.querySelector("#folder-delete-overlay");
    const titleEl = document.querySelector("#folder-delete-dialog-title");
    const descEl = document.querySelector("#folder-delete-dialog-desc");
    const cancelBtn = document.querySelector("#btn-cancel-delete-folder");

    if (!overlay) return;

    if (titleEl) {
      titleEl.textContent = `删除文件夹「${folder.name}」`;
    }

    const customFolders = getCustomFolders();
    const mapsInFolder = getOrderedMapsForFolder(folder.id, customFolders);
    const count = mapsInFolder.length;

    if (descEl) {
      if (count === 0) {
        descEl.textContent = `确定删除空文件夹「${folder.name}」吗？此操作将移除该文件夹，不影响其他地图。`;
      } else {
        descEl.textContent = `确定删除文件夹「${folder.name}」吗？其中的 ${count} 张地图会保留，并移到「未分类」。`;
      }
    }

    overlay.hidden = false;
    cancelBtn?.focus();
  }

  function closeDeleteDialog() {
    const overlay = document.querySelector("#folder-delete-overlay");
    if (overlay) overlay.hidden = true;
    pendingDeleteFolder = null;
  }

  function executeDeleteCustomFolder() {
    if (!pendingDeleteFolder) return;
    const folder = pendingDeleteFolder;
    const folderId = folder.id;

    const customFolders = getCustomFolders();
    const assignmentsBefore = getMapFolderAssignments();
    const ordersBefore = getAllFolderMapOrders();
    const collapsedBefore = getCollapsedState();
    const mapsInFolder = getOrderedMapsForFolder(folderId, customFolders);
    const assignments = getMapFolderAssignments();

    const myMapsOrder = getFolderMapOrder("myMaps");

    mapsInFolder.forEach((m) => {
      delete assignments[m.id];
      if (!myMapsOrder.includes(m.id)) myMapsOrder.push(m.id);
    });

    saveMapFolderAssignments(assignments);
    saveFolderMapOrder("myMaps", myMapsOrder);

    try {
      const raw = localStorage.getItem(FOLDER_MAP_ORDER_KEY);
      if (raw) {
        const orders = JSON.parse(raw) || {};
        delete orders[folderId];
        localStorage.setItem(FOLDER_MAP_ORDER_KEY, JSON.stringify(orders));
      }
    } catch { /* noop */ }

    try {
      const raw = localStorage.getItem(LIBRARY_COLLAPSED_KEY);
      if (raw) {
        const state = JSON.parse(raw) || {};
        delete state[folderId];
        localStorage.setItem(LIBRARY_COLLAPSED_KEY, JSON.stringify(state));
      }
    } catch { /* noop */ }

    const updatedFolders = customFolders.filter((f) => f.id !== folderId);
    saveCustomFolders(updatedFolders);

    closeDeleteDialog();
    renderLibraryDrawer();
    showLibraryToast(`已删除文件夹「${folder.name}」，地图已移到「未分类」`, async () => {
      saveCustomFolders(customFolders);
      saveMapFolderAssignments(assignmentsBefore);
      Object.entries(ordersBefore).forEach(([id, order]) => saveFolderMapOrder(id, order));
      saveCollapsedState(collapsedBefore);
      renderLibraryDrawer();
      showLibraryToast(`已恢复文件夹「${folder.name}」`);
    });

    document.querySelector("#btn-create-folder")?.focus();
  }

  document.querySelector("#btn-cancel-delete-folder")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDeleteDialog();
  });

  document.querySelector("#btn-confirm-delete-folder")?.addEventListener("click", (e) => {
    e.stopPropagation();
    executeDeleteCustomFolder();
  });

  document.querySelector("#folder-delete-overlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeDeleteDialog();
    }
  });

  // --- Drag & Drop Helpers ---
  function scheduleAutoExpand(folderId) {
    if (autoExpandFolderId === folderId) return;
    cancelAutoExpand();
    autoExpandFolderId = folderId;
    autoExpandTimer = setTimeout(() => {
      const state = getCollapsedState();
      if (state[folderId]) {
        toggleFolder(folderId);
      }
    }, 450);
  }

  function cancelAutoExpand() {
    if (autoExpandTimer) {
      clearTimeout(autoExpandTimer);
      autoExpandTimer = null;
    }
    autoExpandFolderId = null;
  }

  function clearAllDragIndicators() {
    document.querySelectorAll(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
    document.querySelectorAll(".drag-over-top").forEach((el) => el.classList.remove("drag-over-top"));
    document.querySelectorAll(".drag-over-bottom").forEach((el) => el.classList.remove("drag-over-bottom"));
    document.querySelectorAll(".drop-target-active").forEach((el) => el.classList.remove("drop-target-active"));
    document.querySelectorAll(".is-dragover").forEach((el) => el.classList.remove("is-dragover"));
    cancelAutoExpand();
  }

  function closeAllCardMenus() {
    document.querySelectorAll(".map-action-menu").forEach((m) => {
      m.hidden = true;
    });
    document.querySelectorAll(".btn-card-menu[aria-expanded='true']").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".card-menu-wrapper")) {
      closeAllCardMenus();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (currentDragMap) {
        clearAllDragIndicators();
        currentDragMap = null;
      }
      closeAllCardMenus();
      if (pendingDeleteFolder) {
        closeDeleteDialog();
      }
    }
  });

  function setupFolderDropTargets(section, header, listEl, folderId) {
    if (!section || !header) return;
    if (section.dataset.dropBound === "true") return;
    section.dataset.dropBound = "true";

    header.addEventListener("dragover", (e) => {
      if (!currentDragMap || !isFolderEligibleForMap(folderId, currentDragMap)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      header.classList.add("drop-target-active");
      const state = getCollapsedState();
      if (state[folderId]) {
        scheduleAutoExpand(folderId);
      }
    });

    header.addEventListener("dragleave", (e) => {
      if (e.relatedTarget && header.contains(e.relatedTarget)) return;
      header.classList.remove("drop-target-active");
      cancelAutoExpand();
    });

    header.addEventListener("drop", (e) => {
      if (!currentDragMap || !isFolderEligibleForMap(folderId, currentDragMap)) return;
      e.preventDefault();
      e.stopPropagation();
      const dragged = currentDragMap;
      clearAllDragIndicators();
      currentDragMap = null;
      moveMapToFolder(dragged.id, folderId);
    });

    if (listEl) {
      listEl.addEventListener("dragover", (e) => {
        if (!currentDragMap || !isFolderEligibleForMap(folderId, currentDragMap)) return;
        if (e.target === listEl || e.target.closest(".empty-folder-box") || e.target.closest(".empty-my-maps-box")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          listEl.classList.add("is-dragover");
        }
      });

      listEl.addEventListener("dragleave", (e) => {
        if (e.relatedTarget && listEl.contains(e.relatedTarget)) return;
        listEl.classList.remove("is-dragover");
      });

      listEl.addEventListener("drop", (e) => {
        if (!currentDragMap || !isFolderEligibleForMap(folderId, currentDragMap)) return;
        if (e.target === listEl || e.target.closest(".empty-folder-box") || e.target.closest(".empty-my-maps-box")) {
          e.preventDefault();
          e.stopPropagation();
          const dragged = currentDragMap;
          clearAllDragIndicators();
          currentDragMap = null;
          moveMapToFolder(dragged.id, folderId);
        }
      });
    }
  }

  function createMapCardElement(mapDef, index, list, folderId, customFolders) {
    const card = document.createElement("div");
    card.className = "map-item-card";
    card.dataset.mapId = mapDef.id;
    card.dataset.folderId = folderId;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("draggable", "false");

    const isActive = currentActiveMapId === mapDef.id;
    if (isActive) card.classList.add("is-active-map");

    const title = mapDef.title || mapDef.id;
    const missingStages = mapDef.generatedResult?.diagnostics?.missingStages ?? [];
    const unresolvedCount = mapDef.generatedResult?.unresolvedItems?.length ?? 0;
    const workflowLabel = mapDef.generatedResult?.identity?.frozenWorkflow?.label ?? "VNext";
    const generationSummary = mapDef.generatedResult
      ? ` · ${workflowLabel} · ${mapDef.generatedResult.status === "degraded" ? "部分结果" : "完整结果"} · ${missingStages.length} 个阶段待完善 · ${unresolvedCount} 个未解决项`
      : "";
    const boundary = displayBoundaryLabel(
      (mapDef.boundaryLabel || (mapDef.isImported ? "本地导入 · 数学地图" : "一般数学内容 · Gamma-native 只读地图")) + generationSummary,
    );
    const sourceLabel = mapDef.generatedResult ? "论文生成" : "JSON 导入";
    const persistenceLabel = isLocalDesktop ? "保存在此电脑" : "保存在此浏览器";
    const moveTargets = [
      { id: "myMaps", name: "未分类" },
      ...customFolders.map((folder) => ({ id: folder.id, name: folder.name })),
    ].filter((folder) => folder.id !== folderId);

    card.innerHTML = `
      <div class="map-drag-handle" title="拖拽调整位置或移动到其他文件夹" draggable="true" aria-label="拖拽「${escapeHtml(title)}」">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.3"></circle>
          <circle cx="8" cy="2" r="1.3"></circle>
          <circle cx="2" cy="7" r="1.3"></circle>
          <circle cx="8" cy="7" r="1.3"></circle>
          <circle cx="2" cy="12" r="1.3"></circle>
          <circle cx="8" cy="12" r="1.3"></circle>
        </svg>
      </div>
      <div class="map-card-info">
        <div class="map-card-title-row">
          <strong class="map-title-text">${escapeHtml(title)}</strong>
          ${isActive ? `<span class="map-active-pill">当前浏览中</span>` : ""}
        </div>
        <span class="map-boundary-text">${escapeHtml(sourceLabel)} · ${escapeHtml(persistenceLabel)}${boundary ? ` · ${escapeHtml(boundary)}` : ""}</span>
      </div>
      <div class="card-menu-wrapper">
        <button type="button" class="btn-card-menu" aria-label="更多操作：${escapeHtml(title)}" aria-haspopup="menu" aria-expanded="false">···</button>
        <div class="map-action-menu" role="menu" hidden>
          ${moveTargets.length ? `<span class="map-menu-heading">移动至</span>${moveTargets.map((folder) => `<button type="button" class="map-menu-item btn-menu-move" role="menuitem" data-target-folder="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</button>`).join("")}<span class="map-menu-divider"></span>` : ""}
          <button type="button" class="map-menu-item btn-menu-up" role="menuitem" ${index === 0 ? "disabled" : ""}>上移</button>
          <button type="button" class="map-menu-item btn-menu-down" role="menuitem" ${index === list.length - 1 ? "disabled" : ""}>下移</button>
          <span class="map-menu-divider"></span>
          <button type="button" class="map-menu-item map-menu-danger btn-menu-delete-map" role="menuitem">删除地图</button>
        </div>
      </div>
    `;

    if (highlightedLibraryMapIds.has(mapDef.id)) card.classList.add("is-newly-imported");

    // Menu toggle logic
    const menuBtn = card.querySelector(".btn-card-menu");
    const menuDropdown = card.querySelector(".map-action-menu");

    menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const isCurrentlyOpen = !menuDropdown.hidden;
      closeAllCardMenus();
      if (!isCurrentlyOpen) {
        menuDropdown.hidden = false;
        menuBtn.setAttribute("aria-expanded", "true");
        const firstItem = menuDropdown.querySelector(".map-menu-item:not(:disabled)");
        firstItem?.focus();
      }
    });

    menuDropdown?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    menuDropdown?.addEventListener("keydown", (e) => {
      const items = Array.from(menuDropdown.querySelectorAll(".map-menu-item:not(:disabled)"));
      const currentIdx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % items.length;
        items[nextIdx]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + items.length) % items.length;
        items[prevIdx]?.focus();
      } else if (e.key === "Escape" || e.key === "Tab") {
        closeAllCardMenus();
        menuBtn?.focus();
      }
    });

    const btnUp = card.querySelector(".btn-menu-up");
    const btnDown = card.querySelector(".btn-menu-down");
    btnUp?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      moveMapInFolder(folderId, mapDef.id, -1);
    });
    btnDown?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      moveMapInFolder(folderId, mapDef.id, 1);
    });

    card.querySelectorAll(".btn-menu-move").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = btn.dataset.targetFolder;
        closeAllCardMenus();
        if (target && target !== folderId) {
          moveMapToFolder(mapDef.id, target);
        }
      });
    });

    card.querySelector(".btn-menu-delete-map")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      void deleteUserMap(mapDef, folderId);
    });

    // Native Drag & Drop Handlers on Card
    card.addEventListener("dragstart", (e) => {
      if (!e.target.closest(".map-drag-handle")) {
        e.preventDefault();
        return;
      }
      closeAllCardMenus();
      currentDragMap = {
        id: mapDef.id,
        isImported: Boolean(mapDef.isImported),
        origin: mapDef.origin || (mapDef.isImported ? "myMaps" : "builtin"),
        sourceFolderId: folderId,
        title: title,
      };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", mapDef.id);
      setTimeout(() => {
        if (currentDragMap && currentDragMap.id === mapDef.id) {
          card.classList.add("is-dragging");
        }
      }, 0);
    });

    card.addEventListener("dragover", (e) => {
      if (!currentDragMap) return;
      if (!isFolderEligibleForMap(folderId, currentDragMap)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";

      if (currentDragMap.id === mapDef.id) {
        card.classList.remove("drag-over-top", "drag-over-bottom");
        return;
      }

      const rect = card.getBoundingClientRect();
      const isUpper = (e.clientY - rect.top) < (rect.height / 2);
      card.classList.toggle("drag-over-top", isUpper);
      card.classList.toggle("drag-over-bottom", !isUpper);
    });

    card.addEventListener("dragleave", (e) => {
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;
      card.classList.remove("drag-over-top", "drag-over-bottom");
    });

    card.addEventListener("drop", (e) => {
      if (!currentDragMap) return;
      if (!isFolderEligibleForMap(folderId, currentDragMap)) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = card.getBoundingClientRect();
      const isUpper = (e.clientY - rect.top) < (rect.height / 2);
      const dragged = currentDragMap;
      clearAllDragIndicators();
      currentDragMap = null;

      if (dragged.id !== mapDef.id) {
        insertMapAtPosition(dragged.id, dragged.sourceFolderId, folderId, mapDef.id, isUpper);
      }
    });

    card.addEventListener("dragend", () => {
      clearAllDragIndicators();
      currentDragMap = null;
    });

    function handleCardActivation() {
      if (mapDef.isImported) {
        openMapWithData(mapDef.data, mapDef.boundaryLabel, mapDef.title, mapDef.id, mapDef.numberingLedger);
      } else {
        loadGenericRegistryMap(mapDef, card);
      }
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-menu-wrapper") || e.target.closest(".map-drag-handle")) return;
      handleCardActivation();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target === card) {
          e.preventDefault();
          handleCardActivation();
        }
      }
    });

    return card;
  }

  function renderLibraryDrawer() {
    const customFolders = getCustomFolders();
    applyCollapsedState();
    const scrollBody = document.querySelector("#library-scroll-body");
    const toolbar = document.querySelector("#library-toolbar");
    const sectionMyMaps = document.querySelector("#section-my-maps");
    const sectionCurated = document.querySelector("#section-curated-demos");
    const customContainer = document.querySelector("#custom-folders-container");
    let userRootHeading = document.querySelector("#library-user-root-heading");
    if (!userRootHeading && scrollBody) {
      userRootHeading = document.createElement("div");
      userRootHeading.id = "library-user-root-heading";
      userRootHeading.className = "library-root-heading";
      userRootHeading.innerHTML = `<div><span class="drawer-kicker">YOUR LIBRARY</span><h4>我的地图</h4></div><span class="section-count-badge" id="count-user-total">0</span>`;
      toolbar?.after(userRootHeading);
    }
    let emptyUserLibrary = document.querySelector("#empty-user-library");
    if (!emptyUserLibrary && scrollBody) {
      emptyUserLibrary = document.createElement("div");
      emptyUserLibrary.id = "empty-user-library";
      emptyUserLibrary.className = "empty-user-library";
      emptyUserLibrary.innerHTML = `<p>还没有自己的地图。可以从上方导入 JSON，或从论文生成一张新地图。</p>`;
    }
    if (scrollBody && sectionMyMaps && sectionCurated && customContainer && userRootHeading) {
      userRootHeading.after(customContainer);
      customContainer.after(sectionMyMaps);
      sectionMyMaps.after(emptyUserLibrary);
      let divider = document.querySelector("#library-root-divider");
      if (!divider) {
        divider = document.createElement("div");
        divider.id = "library-root-divider";
        divider.className = "library-root-divider";
      }
      emptyUserLibrary.after(divider);
      divider.after(sectionCurated);
    }
    document.querySelector("#heading-my-maps")?.replaceChildren("未分类");
    document.querySelector("#heading-curated-demos")?.replaceChildren("系统示例");

    // 1. Curated Demos
    const countCurated = document.querySelector("#count-curated");
    if (countCurated) countCurated.textContent = "3";
    const listCurated = document.querySelector("#list-curated-demos");
    const headerCurated = document.querySelector("#header-curated-demos");
    if (headerCurated) {
      headerCurated.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";
      });
    }
    if (listCurated) {
      listCurated.innerHTML = "";
      listCurated.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";
      });
      const curatedItems = [
        {
          id: "spectral-theorem",
          title: "从特征值到谱定理",
          boundary: "高等代数示例",
        },
        {
          id: "intermediate-value-theorem",
          title: "从闭区间套到介值定理",
          boundary: "数学分析示例",
        },
        {
          id: "fundamental-theorem-calculus",
          title: "从积分累积函数到微积分基本定理",
          boundary: "微积分示例",
        },
      ];

      curatedItems.forEach((demo) => {
        const card = document.createElement("div");
        card.className = "map-item-card is-curated-card";
        card.dataset.mapId = demo.id;
        card.setAttribute("role", "listitem");
        card.setAttribute("tabindex", "0");
        const isActive = currentActiveMapId === demo.id;
        if (isActive) card.classList.add("is-active-map");

        card.innerHTML = `
          <div class="map-card-info">
            <div class="map-card-title-row">
              <strong class="map-title-text">${escapeHtml(demo.title)}</strong>
            </div>
            <span class="map-boundary-text">${escapeHtml(demo.boundary)}</span>
          </div>
        `;

        card.addEventListener("click", () => loadCuratedDemo(demo.id));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            loadCuratedDemo(demo.id);
          }
        });

        listCurated.appendChild(card);
      });
    }

    // 2. My JSON Maps
    const allUserMaps = getAllMovableMaps();
    const myMaps = getOrderedMapsForFolder("myMaps", customFolders);
    const countUserTotal = document.querySelector("#count-user-total");
    if (countUserTotal) countUserTotal.textContent = String(allUserMaps.length);
    if (emptyUserLibrary) emptyUserLibrary.hidden = allUserMaps.length !== 0;
    const countMyMaps = document.querySelector("#count-my-maps");
    if (countMyMaps) countMyMaps.textContent = String(myMaps.length);
    const listMyMaps = document.querySelector("#list-my-maps");
    const headerMyMaps = document.querySelector("#header-my-maps");
    setupFolderDropTargets(sectionMyMaps, headerMyMaps, listMyMaps, "myMaps");
    if (sectionMyMaps) sectionMyMaps.hidden = myMaps.length === 0;

    if (listMyMaps) {
      listMyMaps.innerHTML = "";
      if (myMaps.length > 0) {
        myMaps.forEach((mapDef, index, list) => {
          listMyMaps.appendChild(createMapCardElement(mapDef, index, list, "myMaps", customFolders));
        });
      }
    }

    // 3. Builtin Maps
    const builtinMaps = getOrderedMapsForFolder("builtin", customFolders);
    const countBuiltin = document.querySelector("#count-builtin");
    if (countBuiltin) countBuiltin.textContent = String(builtinMaps.length);
    const listBuiltin = document.querySelector("#list-builtin-maps");
    const sectionBuiltin = document.querySelector("#section-builtin-maps");
    const headerBuiltin = document.querySelector("#header-builtin-maps");
    setupFolderDropTargets(sectionBuiltin, headerBuiltin, listBuiltin, "builtin");
    if (sectionBuiltin) sectionBuiltin.hidden = true;

    if (listBuiltin) {
      listBuiltin.innerHTML = "";
      if (builtinMaps.length === 0) {
        const emptyBox = document.createElement("div");
        emptyBox.className = "empty-my-maps-box";
        emptyBox.innerHTML = `<p>内置地图库当前无地图（均已移动至自定义文件夹）</p>`;
        listBuiltin.appendChild(emptyBox);
      } else {
        builtinMaps.forEach((mapDef, index, list) => {
          listBuiltin.appendChild(createMapCardElement(mapDef, index, list, "builtin", customFolders));
        });
      }
    }

    // 4. Custom User Folders
    if (customContainer) {
      customContainer.innerHTML = "";
      const collapsedState = getCollapsedState();

      customFolders.forEach((folder) => {
        const mapsInFolder = getOrderedMapsForFolder(folder.id, customFolders);
        const isCollapsed = Boolean(collapsedState[folder.id]);

        const section = document.createElement("section");
        section.className = `map-library-section custom-folder-section${isCollapsed ? " is-collapsed" : ""}`;
        section.id = `section-${folder.id}`;
        section.setAttribute("aria-labelledby", `heading-${folder.id}`);

        section.innerHTML = `
          <div class="folder-row-shell">
            <div class="folder-drag-handle" draggable="true" title="拖拽调整文件夹顺序" aria-hidden="true">⋮⋮</div>
            <button class="folder-accordion-header${isCollapsed ? " is-collapsed" : ""}" id="header-${folder.id}" data-folder="${folder.id}" type="button" aria-expanded="${isCollapsed ? "false" : "true"}" aria-controls="list-${folder.id}">
              <span class="folder-header-left">
              <svg class="folder-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span id="heading-${folder.id}" class="section-heading">${escapeHtml(folder.name)}</span>
              <span class="section-count-badge" id="count-${folder.id}">${mapsInFolder.length}</span>
              </span>
            </button>
            <div class="card-menu-wrapper folder-menu-wrapper">
              <button type="button" class="btn-card-menu btn-folder-menu" aria-label="文件夹操作：${escapeHtml(folder.name)}" aria-haspopup="menu" aria-expanded="false">···</button>
              <div class="map-action-menu folder-action-menu" role="menu" hidden>
                <button type="button" class="map-menu-item btn-rename-folder" role="menuitem">重命名</button>
                <button type="button" class="map-menu-item btn-folder-up" role="menuitem" ${customFolders.indexOf(folder) === 0 ? "disabled" : ""}>上移</button>
                <button type="button" class="map-menu-item btn-folder-down" role="menuitem" ${customFolders.indexOf(folder) === customFolders.length - 1 ? "disabled" : ""}>下移</button>
                <span class="map-menu-divider"></span>
                <button type="button" class="map-menu-item map-menu-danger btn-delete-folder" role="menuitem">删除文件夹</button>
              </div>
            </div>
          </div>
          <div class="map-cards-list" id="list-${folder.id}" role="list"></div>
        `;

        const header = section.querySelector(".folder-accordion-header");
        header?.addEventListener("click", () => toggleFolder(folder.id));
        const menuButton = section.querySelector(".btn-folder-menu");
        const menu = section.querySelector(".folder-action-menu");
        menuButton?.addEventListener("click", (event) => {
          event.stopPropagation();
          const open = menu.hidden;
          closeAllCardMenus();
          if (open) { menu.hidden = false; menuButton.setAttribute("aria-expanded", "true"); }
        });
        section.querySelector(".btn-delete-folder")?.addEventListener("click", (event) => {
          event.stopPropagation(); closeAllCardMenus(); promptDeleteCustomFolder(folder);
        });
        section.querySelector(".btn-rename-folder")?.addEventListener("click", (event) => {
          event.stopPropagation(); closeAllCardMenus();
          const nextName = window.prompt("输入新的文件夹名称", folder.name)?.trim();
          if (!nextName || nextName === folder.name) return;
          if (["系统示例", "我的地图", "未分类"].includes(nextName) || getCustomFolders().some((item) => item.id !== folder.id && item.name.toLowerCase() === nextName.toLowerCase())) {
            showLibraryToast("该文件夹名称已存在"); return;
          }
          saveCustomFolders(getCustomFolders().map((item) => item.id === folder.id ? { ...item, name: nextName } : item));
          renderLibraryDrawer(); showLibraryToast(`已重命名为「${nextName}」`);
        });
        const moveFolder = (delta) => {
          const folders = getCustomFolders(); const index = folders.findIndex((item) => item.id === folder.id);
          const next = index + delta; if (index < 0 || next < 0 || next >= folders.length) return;
          const [moved] = folders.splice(index, 1); folders.splice(next, 0, moved); saveCustomFolders(folders); renderLibraryDrawer();
        };
        section.querySelector(".btn-folder-up")?.addEventListener("click", (event) => { event.stopPropagation(); moveFolder(-1); });
        section.querySelector(".btn-folder-down")?.addEventListener("click", (event) => { event.stopPropagation(); moveFolder(1); });

        const folderHandle = section.querySelector(".folder-drag-handle");
        folderHandle?.addEventListener("dragstart", (event) => { currentDragFolderId = folder.id; event.dataTransfer.effectAllowed = "move"; });
        section.addEventListener("dragover", (event) => { if (!currentDragFolderId || currentDragFolderId === folder.id) return; event.preventDefault(); section.classList.add("folder-drop-target"); });
        section.addEventListener("dragleave", () => section.classList.remove("folder-drop-target"));
        section.addEventListener("drop", (event) => {
          if (!currentDragFolderId || currentDragFolderId === folder.id) return;
          event.preventDefault();
          const folders = getCustomFolders(); const from = folders.findIndex((item) => item.id === currentDragFolderId); const to = folders.findIndex((item) => item.id === folder.id);
          if (from >= 0 && to >= 0) { const [moved] = folders.splice(from, 1); folders.splice(to, 0, moved); saveCustomFolders(folders); }
          currentDragFolderId = null; renderLibraryDrawer();
        });
        folderHandle?.addEventListener("dragend", () => { currentDragFolderId = null; document.querySelectorAll(".folder-drop-target").forEach((item) => item.classList.remove("folder-drop-target")); });

        const listEl = section.querySelector(".map-cards-list");
        setupFolderDropTargets(section, header, listEl, folder.id);

        if (mapsInFolder.length === 0) {
          const emptyBox = document.createElement("div");
          emptyBox.className = "empty-folder-box";
          emptyBox.innerHTML = `<p>文件夹为空。可拖入地图，也可从地图菜单选择「移动至」。</p>`;
          listEl.appendChild(emptyBox);
        } else {
          mapsInFolder.forEach((mapDef, index, list) => {
            listEl.appendChild(createMapCardElement(mapDef, index, list, folder.id, customFolders));
          });
        }

        customContainer.appendChild(section);
      });
    }
  }

  async function loadGenericRegistryMap(mapDef, cardEl) {
    if (isActivatingMap) return;
    isActivatingMap = true;
    const originalBtn = cardEl?.querySelector(".demo-case-btn");
    const originalBtnText = originalBtn ? originalBtn.textContent : "";
    if (originalBtn) originalBtn.textContent = "载入中…";
    if (cardEl) cardEl.classList.add("is-loading");

    try {
      let data;
      if (mapDef?.dataFile) {
        const response = await fetch(mapDef.dataFile, { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`无法读取地图 JSON ${mapDef.dataFile}（HTTP ${response.status}）`);
        }
        data = await response.json();
      } else if (mapDef?.dataScript) {
        window.CMATH_DATA = undefined;
        await loadScript(mapDef.dataScript);
        data = window.CMATH_DATA;
        if (!data || typeof data !== "object") {
          throw new Error(`数据脚本 ${mapDef.dataScript} 未能成功赋值 window.CMATH_DATA`);
        }
      } else {
        throw new Error(`地图「${mapDef?.title || mapDef?.id}」未指定数据文件 (dataFile) 或数据脚本 (dataScript)`);
      }

      const loader = window.GammaMathMapContentLoader;
      if (loader) {
        if (typeof loader.validateProjectView === "function") {
          loader.validateProjectView(data, mapDef.projectId);
        }
        if (typeof loader.validateMathTextContent === "function" && mapDef.mathTextFormat) {
          loader.validateMathTextContent(data, mapDef.mathTextFormat);
        }
      }

      const boundary = mapDef.boundaryLabel || data.channelOptions?.boundaryLabel || "一般数学内容 · Gamma-native 只读地图";
      const title = mapDef.title || data.project?.title || "数学地图";
      openMapWithData(data, boundary, title, mapDef.id);
    } catch (error) {
      console.error("加载数学地图失败:", error);
      alert(`无法打开数学地图「${mapDef?.title || mapDef?.id}」：\n${error.message}`);
    } finally {
      if (originalBtn) originalBtn.textContent = originalBtnText;
      if (cardEl) cardEl.classList.remove("is-loading");
      isActivatingMap = false;
    }
  }

  function openLibraryDrawer(triggerEl = null) {
    openDrawer("library-drawer", triggerEl);
  }

  const cardCuratedDemos = document.querySelector("#card-curated-demos");
  cardCuratedDemos?.addEventListener("click", (e) => {
    openLibraryDrawer(e.currentTarget);
  });
  cardCuratedDemos?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLibraryDrawer(cardCuratedDemos);
    }
  });

  document.querySelector("#btn-topbar-demos")?.addEventListener("click", (e) => {
    openLibraryDrawer(e.currentTarget);
  });
  document.querySelector("#btn-map-open-demos")?.addEventListener("click", (e) => {
    openLibraryDrawer(e.currentTarget);
  });
  document.querySelector("#btn-close-library-drawer")?.addEventListener("click", closeAllPanels);

  // --- Backup & Restore (Export / Import Backup) ---
  function exportLibraryBackup() {
    const customFolders = getCustomFolders();
    const assignments = getMapFolderAssignments();
    const orders = getAllFolderMapOrders();
    const collapsed = getCollapsedState();

    const backupData = {
      schema: BACKUP_SCHEMA,
      version: 1,
      exportedAt: Date.now(),
      app: "cmath-math-map",
      maps: (sessionImportedMaps || []).map((m) => ({
        schema: "cmath.local-map-record/v1",
        id: m.id,
        title: m.title || m.data?.project?.title || m.id,
        boundaryLabel: m.boundaryLabel || m.data?.channelOptions?.boundaryLabel || "本地导入 · 数学地图",
        importedAt: m.importedAt || Date.now(),
        isImported: true,
        data: m.data,
        ...(m.numberingLedger ? { numberingLedger: m.numberingLedger } : {}),
        ...(m.generatedResult ? { generatedResult: m.generatedResult } : {}),
      })),
      library: {
        customFolders,
        assignments,
        orders,
        collapsed,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    const filename = `cmath-math-map-backup-${dateStr}.json`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    const mapCount = (backupData.maps || []).length;
    const folderCount = (customFolders || []).length;
    showLibraryToast(`已成功导出地图库备份（${mapCount} 张地图，${folderCount} 个分类）`);
  }

  async function handleImportBackupFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      alert("请选择有效的 .json 地图库备份文件。");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("备份文件过大（超过 50MB），无法导入。");
      return;
    }

    let rawText = "";
    try {
      rawText = await file.text();
    } catch (err) {
      alert("读取备份文件失败：" + err.message);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      alert("备份文件不是合法的 JSON 格式。");
      return;
    }

    try {
      const currentLibraryState = getFullLibraryState();
      const reservedIds = [
        ...CURATED_DEMO_IDS,
        ...(window.CMATH_GENERIC_MAP_REGISTRY?.maps || []).map((m) => m.id),
      ];

      const mergeResult = mergeLibraryBackup(
        sessionImportedMaps,
        currentLibraryState,
        parsed,
        reservedIds
      );

      // 1. Persist newly added imported maps
      if (isLocalDesktop && mergeResult.newAddedMaps.length > 0) {
        try {
          await Promise.all(mergeResult.newAddedMaps.map(persistImportedMap));
        } catch (err) {
          console.warn("部分地图保存到本地磁盘失败:", err);
        }
      } else if (!isLocalDesktop && mergeResult.newAddedMaps.length > 0) {
        try {
          await idbPutMaps(mergeResult.newAddedMaps);
        } catch (err) {
          console.warn("保存地图到 IndexedDB 失败:", err);
        }
      }

      sessionImportedMaps = mergeResult.mergedMaps;
      saveSessionImportedMaps(sessionImportedMaps);

      // 2. Apply merged library state and persist
      applyLibraryState(mergeResult.libraryState);
      await persistLibraryOrganization();

      // 3. Re-render drawer
      renderLibraryDrawer();
      showLibraryToast(`已成功恢复备份：新增 ${mergeResult.stats.addedMaps} 张地图，共 ${mergeResult.stats.totalMaps} 张地图、${mergeResult.stats.totalFolders} 个分类`);
    } catch (err) {
      console.error("恢复备份失败:", err);
      alert("恢复地图库备份失败：\n" + err.message);
    }
  }

  function loadCuratedDemo(mapKey) {
    if (isActivatingMap) return;
    isActivatingMap = true;
    try {
      if (!window.CMATH_PORTABLE_MAPS || !window.CMATH_PORTABLE_MAPS[mapKey]) {
        throw new Error(`未找到指定的案例数据：${mapKey}`);
      }
      const data = window.CMATH_PORTABLE_MAPS[mapKey];
      const boundary = displayBoundaryLabel(data.channelOptions?.boundaryLabel || "数学地图示例");
      const title = data.project?.title || "数学地图";
      openMapWithData(data, boundary, title, mapKey);
    } catch (error) {
      console.error(error);
      alert(`无法打开精选 Demo：\n${error.message}`);
    } finally {
      isActivatingMap = false;
    }
  }

  // Pre-render library state on initialization
  renderLibraryDrawer();
  loadPersistedMapsAndState();

  // --- Topbar Settings Trigger ---
  document.querySelector("#btn-topbar-settings")?.addEventListener("click", (e) => {
    openDrawer("settings-drawer", e.currentTarget);
  });
  document.querySelector("#btn-close-settings")?.addEventListener("click", closeAllPanels);

  // --- Map Core Activation & Rendering ---
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法加载 ${src}`));
      document.body.appendChild(script);
    });
  }

  function installProductFocusPresentation() {
    const canvasCapability = window.GammaGraphCanvas;
    const forceGraphFactory = window.ForceGraph;
    if (!canvasCapability?.create || typeof forceGraphFactory !== "function" || canvasCapability.productFocusPresentation) return;

    const presentationByHost = new WeakMap();
    const endpointId = (value) => typeof value === "object" ? value?.id : value;
    const colorWithOpacity = (color, opacity) => {
      const value = String(color ?? "");
      const hex = value.match(/^#([0-9a-f]{6})$/iu)?.[1];
      if (hex) {
        return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${opacity})`;
      }
      const rgb = value.match(/^rgba?\(([^)]+)\)$/iu)?.[1]?.split(",").slice(0, 3).map((part) => part.trim());
      return rgb?.length === 3 ? `rgba(${rgb.join(",")},${opacity})` : value;
    };

    const focusRelation = (state, link) => {
      if (!state.focusIds?.size) return "overview";
      const source = endpointId(link.source);
      const target = endpointId(link.target);
      if (source === state.activeTargetId || target === state.activeTargetId) return "target";
      return state.focusIds.has(source) || state.focusIds.has(target) ? "context" : "background";
    };

    const wrappedForceGraph = (...factoryArgs) => {
      const mount = forceGraphFactory(...factoryArgs);
      return (host) => {
        const graph = mount(host);
        const state = {
          graph,
          focusIds: null,
          activeTargetId: null,
          selectedId: null,
        };
        presentationByHost.set(host, state);

        const originalNodeCanvasObject = graph.nodeCanvasObject.bind(graph);
        graph.nodeCanvasObject = function productNodeCanvasObject(painter) {
          if (!arguments.length) return originalNodeCanvasObject();
          if (typeof painter !== "function" || painter.productFocusPainter) return originalNodeCanvasObject(painter);
          const enhancedPainter = (node, context, scale) => {
            if (!node.isActiveTarget) {
              painter(node, context, scale);
              return;
            }
            context.save();
            context.translate(node.x, node.y);
            context.scale(1.55, 1.55);
            context.translate(-node.x, -node.y);
            painter(node, context, scale);
            context.restore();
          };
          enhancedPainter.productFocusPainter = true;
          return originalNodeCanvasObject(enhancedPainter);
        };

        const enhanceLinkAccessor = (name, enhance) => {
          const originalAccessor = graph[name]?.bind(graph);
          if (!originalAccessor) return;
          graph[name] = function productLinkAccessor(accessor) {
            if (!arguments.length) return originalAccessor();
            if (typeof accessor !== "function") return originalAccessor(accessor);
            return originalAccessor((link) => enhance(accessor(link), focusRelation(state, link)));
          };
        };

        enhanceLinkAccessor("linkColor", (color, relation) => {
          if (relation === "target") return colorWithOpacity(color, 0.96);
          if (relation === "context") return colorWithOpacity(color, 0.68);
          if (relation === "background") return colorWithOpacity(color, 0.08);
          return color;
        });
        enhanceLinkAccessor("linkWidth", (width, relation) => {
          if (relation === "target") return Math.max(2.4, Number(width) * 2.2);
          if (relation === "context") return Math.max(1.45, Number(width) * 1.45);
          if (relation === "background") return Math.max(0.45, Number(width) * 0.55);
          return width;
        });
        enhanceLinkAccessor("linkDirectionalArrowLength", (length, relation) => {
          if (relation === "target") return Math.max(5, Number(length) * 1.35);
          if (relation === "background") return Math.max(1, Number(length) * 0.45);
          return length;
        });
        enhanceLinkAccessor("linkDirectionalArrowColor", (color, relation) => {
          if (relation === "target") return colorWithOpacity(color, 0.96);
          if (relation === "context") return colorWithOpacity(color, 0.68);
          if (relation === "background") return colorWithOpacity(color, 0.08);
          return color;
        });

        return graph;
      };
    };
    Object.assign(wrappedForceGraph, forceGraphFactory);
    window.ForceGraph = wrappedForceGraph;

    window.GammaGraphCanvas = Object.freeze({
      ...canvasCapability,
      productFocusPresentation: true,
      create(container, options) {
        const canvas = canvasCapability.create(container, options);
        const host = container.querySelector(".alpha-force-graph-host");
        const state = presentationByHost.get(host);
        if (!state) return canvas;

        const resolveEndpoint = (value) => {
          if (value && typeof value === "object") return value;
          return state.graph.graphData().nodes.find((node) => node.id === value) ?? null;
        };
        const cssToken = (name, fallback) => {
          if (typeof getComputedStyle !== "function" || typeof document === "undefined") return fallback;
          return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
        };
        state.graph.linkCanvasObjectMode?.(() => "replace");
        state.graph.linkCanvasObject?.((link, context, scale) => {
          const source = resolveEndpoint(link.source);
          const target = resolveEndpoint(link.target);
          if (!source || !target || !Number.isFinite(source.x) || !Number.isFinite(source.y)
            || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

          const relation = focusRelation(state, link);
          const opacity = relation === "target" ? 0.96 : relation === "context" ? 0.68 : relation === "overview" ? 0.48 : 0.08;
          const width = relation === "target" ? 2.8 : relation === "context" ? 1.8 : relation === "overview" ? 1.15 : 0.55;
          const baseColor = link.relation === "conclusion"
            ? cssToken("--math-map-conclusion", "#0E7C66")
            : cssToken("--math-map-premise", "rgba(27,26,21,1)");
          const stroke = colorWithOpacity(baseColor, opacity);
          const safeScale = Math.max(0.1, Number(scale) || 1);

          context.save();
          context.beginPath();
          context.moveTo(source.x, source.y);
          context.lineTo(target.x, target.y);
          context.strokeStyle = stroke;
          context.lineWidth = width / safeScale;
          context.stroke();

          if (relation !== "background") {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0.001) {
              const position = 0.74;
              const tipX = source.x + dx * position;
              const tipY = source.y + dy * position;
              const unitX = dx / distance;
              const unitY = dy / distance;
              const arrowLength = (relation === "target" ? 7 : 5) / safeScale;
              const arrowWidth = arrowLength * 0.55;
              context.beginPath();
              context.moveTo(tipX, tipY);
              context.lineTo(tipX - unitX * arrowLength - unitY * arrowWidth, tipY - unitY * arrowLength + unitX * arrowWidth);
              context.lineTo(tipX - unitX * arrowLength + unitY * arrowWidth, tipY - unitY * arrowLength - unitX * arrowWidth);
              context.closePath();
              context.fillStyle = stroke;
              context.fill();
            }
          }
          context.restore();
        });

        return {
          ...canvas,
          setLayout(layout, action) {
            state.activeTargetId = layout?.nodes?.find((node) => node.isActiveTarget)?.id ?? null;
            return canvas.setLayout(layout, action);
          },
          setSelected(id) {
            state.selectedId = id ?? null;
            return canvas.setSelected(id);
          },
          focusSubgraph(ids, action = {}) {
            state.focusIds = new Set(ids ?? []);
            canvas.focusSubgraph(ids, { ...action, duration: 0, preserveSelection: true });

            const targetId = state.activeTargetId ?? state.selectedId;
            const target = state.graph.graphData().nodes.find((node) => node.id === targetId);
            if (!target) return;
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const duration = reducedMotion ? 0 : (action.duration ?? 320);
            state.graph.centerAt(target.x ?? 0, target.y ?? 0, duration);
            state.graph.zoom(Math.max(1.95, state.graph.zoom()), duration);
          },
          focusNode(id, action) {
            state.focusIds = new Set([id]);
            state.activeTargetId = id;
            return canvas.focusNode(id, action);
          },
          showOverview(duration) {
            state.focusIds = null;
            state.activeTargetId = null;
            return canvas.showOverview(duration);
          },
          restoreOverview(duration) {
            state.focusIds = null;
            state.activeTargetId = null;
            return canvas.restoreOverview(duration);
          },
        };
      },
    });
  }

  function persistMapForReload(data, boundaryLabel, title, mapKey = null, numberingLedger = null) {
    sessionStorage.setItem(SESSION_MAP_KEY, JSON.stringify({ data, boundaryLabel, title, mapKey, numberingLedger }));
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("session-map", "1");
    window.location.assign(next);
  }

  function installInspectorEnhancements() {
    const panel = document.querySelector("#math-map-inspector");
    if (!panel || typeof MutationObserver !== "function") return;

    const refresh = () => {
      const evidenceButton = panel.querySelector("[data-show-evidence]");
      const actions = panel.querySelector(".inspector-actions");
      if (!evidenceButton || !actions) return;

      const nodeId = evidenceButton.dataset.showEvidence;
      const model = window.GammaMathMapLabModel;
      const finalProgress = model?.progressBatches?.length ?? 0;
      const node = model?.layoutThrough?.(finalProgress)?.nodes?.find((item) => item.id === nodeId);
      const hasEvidence = Boolean(String(node?.evidence ?? "").trim());

      evidenceButton.hidden = !hasEvidence;
      actions.classList.toggle("has-single-action", !hasEvidence);
      const heading = actions.previousElementSibling;
      const nextHeading = hasEvidence ? "证据与来源" : "阅读操作";
      if (heading?.tagName === "H3" && heading.textContent !== nextHeading) {
        heading.textContent = nextHeading;
      }
    };

    inspectorEnhancementObserver?.disconnect();
    inspectorEnhancementObserver = new MutationObserver(refresh);
    inspectorEnhancementObserver.observe(panel, { childList: true, subtree: true });
    refresh();
  }

  async function openMapWithData(data, boundaryLabel, title, mapKey = null, numberingLedger = null) {
    closeAllPanels();
    currentActiveMapData = data;
    currentActiveMapTitle = title || data?.project?.title || "math-map";
    currentActiveMapId = mapKey || data.project?.id || title;

    if (mapRuntimeMounted) {
      persistMapForReload(data, boundaryLabel, title, currentActiveMapId, numberingLedger);
      return;
    }

    // 1. Update titles
    mapActiveTitle.textContent = title;
    mapBoundaryTag.textContent = displayBoundaryLabel(boundaryLabel);
    document.title = `CMath · ${title}`;

    // 2. Switch app state to 'map'
    const mapView = document.querySelector("#math-map-view");
    const workbenchView = document.querySelector("#workbench-view");
    if (mapView) mapView.hidden = false;
    if (workbenchView) workbenchView.hidden = true;
    body.setAttribute("data-view", "map");

    // 3. Create Model
    const canonical = isCanonicalMathMap(data);
    const adapter = canonical ? window.GammaCanonicalMathMapAdapter : window.GammaMathMapProjectAdapter;
    if (!adapter?.create) throw new Error(canonical ? "标准数学地图渲染器没有加载" : "Project View 渲染器没有加载");
    const adapterOptions = canonical
      ? { title: title || "标准数学地图", projectId: mapKey || `canonical:${title || "map"}`, numberingLedger }
      : (data.channelOptions?.adapterOptions ?? {});
    const model = adapter.create(data, adapterOptions);
    window.GammaMathMapLabModel = model;
    window.CMATH_PROJECT_PRESENTATION = {
      projectId: data.project?.id ?? adapterOptions.projectId,
      channelOptions: data.channelOptions ?? { boundaryLabel },
    };

    const sectionSelect = document.querySelector("#math-map-section");
    if (sectionSelect) {
      sectionSelect.replaceChildren(
        new Option("全部", "all"),
        ...model.sections.map((section) => new Option(section.label, section.id)),
      );
    }

    // 4. Activate the unchanged map controller only after the selected model exists.
    try {
      installProductFocusPresentation();
      await loadScript("math-map-lab.js");
      mapRuntimeMounted = true;
      installInspectorEnhancements();
    } catch (error) {
      console.error(error);
      alert(`数学地图加载失败：\n${error.message}`);
    }
  }

  // --- Return to Workbench ---
  btnReturnWorkbench?.addEventListener("click", () => {
    const next = new URL(window.location.href);
    next.search = "";
    window.location.assign(next);
  });

  // --- Dynamic Ambient FX: Mouse Parallax & Stardust Particles ---
  (() => {
    const stage = document.querySelector("#ambient-logo-stage");
    const canvas = document.querySelector("#ambient-particle-canvas");
    const workbench = document.querySelector("#workbench-view");
    if (!stage || !workbench) return;

    // 1. Mouse Parallax Tracker
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    window.addEventListener("mousemove", (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX = ((e.clientX / innerWidth) - 0.5) * 36;
      mouseY = ((e.clientY / innerHeight) - 0.5) * 28;
    }, { passive: true });

    function updateParallax() {
      if (document.body.dataset.view === "workbench") {
        currentX += (mouseX - currentX) * 0.06;
        currentY += (mouseY - currentY) * 0.06;
        const rotY = (currentX / 36) * 4.5;
        const rotX = -(currentY / 28) * 4.5;
        stage.style.transform = `translate3d(calc(-50% + ${currentX.toFixed(2)}px), calc(-50% + ${currentY.toFixed(2)}px), 0) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }
      requestAnimationFrame(updateParallax);
    }
    requestAnimationFrame(updateParallax);

    // 2. Mathematical Stardust Particle Field
    if (canvas) {
      const ctx = canvas.getContext("2d");
      let width = (canvas.width = canvas.offsetWidth || 800);
      let height = (canvas.height = canvas.offsetHeight || 800);

      window.addEventListener("resize", () => {
        if (!canvas) return;
        width = canvas.width = canvas.offsetWidth || 800;
        height = canvas.height = canvas.offsetHeight || 800;
      }, { passive: true });

      const particles = Array.from({ length: 38 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.35 ? "45, 212, 191" : "255, 255, 255",
      }));

      function renderParticles() {
        if (document.body.dataset.view === "workbench" && ctx) {
          ctx.clearRect(0, 0, width, height);

          // Update & draw particles
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.phase += 0.025;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            const dynamicAlpha = Math.max(0.1, p.alpha + Math.sin(p.phase) * 0.25);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${dynamicAlpha.toFixed(2)})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${p.color}, 0.5)`;
            ctx.fill();

            // Connect nearby particles with subtle constellation lines
            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const dx = p.x - p2.x;
              const dy = p.y - p2.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 85) {
                const lineAlpha = (1 - dist / 85) * 0.18;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(45, 212, 191, ${lineAlpha.toFixed(2)})`;
                ctx.lineWidth = 0.75;
                ctx.stroke();
              }
            }
          }
        }
        requestAnimationFrame(renderParticles);
      }
      requestAnimationFrame(renderParticles);
    }
  })();

  // Default initial demo trigger helper if requested via URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialMap = urlParams.get("map");
  const sessionMap = urlParams.get("session-map") === "1";
  if (sessionMap) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_MAP_KEY));
      sessionStorage.removeItem(SESSION_MAP_KEY);
      if (!saved?.data) throw new Error("临时地图数据不存在");
      openMapWithData(saved.data, saved.boundaryLabel, saved.title, saved.mapKey, saved.numberingLedger);
    } catch (error) {
      alert(`无法恢复本地数学地图：\n${error.message}`);
    }
  } else if (initialMap && window.CMATH_PORTABLE_MAPS?.[initialMap]) {
    loadCuratedDemo(initialMap);
  } else if (urlParams.get("demos") === "1") {
    openLibraryDrawer();
  }
})();
