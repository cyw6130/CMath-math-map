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
  const SESSION_MAP_KEY = "cmath.math-map.session-map";
  const SESSION_IMPORTED_MAPS_KEY = "cmath.math-map.session-imported-maps-v1";
  const MINERU_GATEWAY_URL = String(
    window.CMATH_MINERU_GATEWAY_URL ?? document.documentElement.dataset.mineruGatewayUrl ?? "",
  ).trim();

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
      if (map && typeof map.id === "string" && map.data) byId.set(map.id, { ...map, isImported: true });
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
    if (isLocalDesktop) {
      const response = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(map),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "HTTP " + response.status);
      return payload;
    } else {
      await idbPutMap(map);
      return map;
    }
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

  // Remember the config typed for the provider about to be left, then
  // restore the saved config for the provider being entered.
  function rememberCurrentProviderSettings() {
    const apiKey = apiKeyInput?.value.trim() ?? "";
    const endpoint = apiEndpointInput?.value.trim() ?? "";
    const model = currentProviderModel();
    if (apiKey) {
      rememberSessionKey(activeProviderKey, apiKey);
      persistLocalConfig(activeProviderKey, { apiKey, endpoint, model });
    }
    if (endpoint || model) rememberProviderConfig(activeProviderKey, { endpoint, model });
  }

  function restoreProviderConfig(provider) {
    const pref = providerPref(provider);
    if (pref.endpoint) apiEndpointInput.value = pref.endpoint;
    const saved = pref.model;
    if (!saved) return;
    if (saved === "custom") {
      modelSelect.value = "custom";
      handleModelChange();
      return;
    }
    const option = [...(modelSelect?.options ?? [])].find((opt) => opt.value === saved);
    if (option) modelSelect.value = saved;
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

  function updateProviderSettings(providerKey) {
    if (providerUiBootstrapped) rememberCurrentProviderSettings();
    activeProviderKey = PROVIDER_CONFIGS[providerKey] ? providerKey : "deepseek";
    providerBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.provider === providerKey));
    const config = PROVIDER_CONFIGS[activeProviderKey];

    const savedEndpoint = providerPref(activeProviderKey).endpoint;
    if (savedEndpoint) {
      apiEndpointInput.value = savedEndpoint;
    } else if (providerKey !== "custom" || !apiEndpointInput.value) {
      apiEndpointInput.value = config.endpoint;
    }

    modelSelect.innerHTML = "";
    config.models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.textContent = m.label;
      if (m.default) opt.selected = true;
      modelSelect.appendChild(opt);
    });

    const sessionKey = sessionKeyFor(activeProviderKey);
    if (sessionKey && apiKeyInput) apiKeyInput.value = sessionKey;
    restoreProviderConfig(activeProviderKey);
    handleModelChange();
    updateActiveProviderLabel();
    loadLocalConfigFor(activeProviderKey).then(() => {
      updateActiveProviderLabel();
      if (customModelInput?.value.trim()) rememberProviderConfig(activeProviderKey, { endpoint: apiEndpointInput.value.trim(), model: customModelInput.value.trim() });
    });
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
    const model = currentProviderModel();
    if (model) {
      rememberProviderConfig(activeProviderKey, { endpoint: apiEndpointInput?.value.trim() ?? "", model });
    }
    updateActiveProviderLabel();
  });
  customModelInput?.addEventListener("input", () => {
    const model = currentProviderModel();
    if (model) {
      rememberProviderConfig(activeProviderKey, { endpoint: apiEndpointInput?.value.trim() ?? "", model });
    }
    updateActiveProviderLabel();
  });

  // Initialize with OpenCode Go (DeepSeek V4 Flash; migrating legacy model-only prefs first)
  migrateLegacyPrefs();
  sanitizePollutedPrefs();
  updateProviderSettings("opencode");
  providerUiBootstrapped = true;

  // Drawer / Backdrop Management & Coordination
  function closeAllPanels() {
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
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === "function" && document.body.contains(lastActiveTrigger)) {
      try { lastActiveTrigger.focus(); } catch { /* ignore focus restore error */ }
    }
  }

  function openDrawer(drawerId, triggerEl = null) {
    closeAllPanels();
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

      const closeBtn = drawer.querySelector(".close-btn");
      if (closeBtn) closeBtn.focus();
    }
  }

  [paperDrawerBackdrop, settingsDrawerBackdrop, importDrawerBackdrop, libraryDrawerBackdrop].forEach((backdrop) => {
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllPanels();
      }
    });
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
    { id: "entry", label: "Entry v1.31 数学对象抽取" },
    { id: "consolidate", label: "确定性整合" },
    { id: "w7-verify", label: "W7.1 忠实性校验" },
    { id: "w8-b0", label: "W8 外部结果补漏" },
    { id: "inference", label: "Inference v3.45 推理装配" },
    { id: "closure", label: "Project View 校验与闭包" },
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

  function handleImportStage(stage, info = {}) {
    if (!stepEls.has(stage)) return;
    if (info.phase === "resume") {
      setStep(stage, "done", "已从本地 checkpoint 恢复");
      return;
    }
    if (info.phase === "start") {
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
      const detail = stage === "mineru"
        ? `${info.pageCount ?? "?"} 页 marked Markdown`
        : (Number.isInteger(info.entries) ? `${info.entries} 个对象` : "完成");
      setStep(stage, "done", detail);
      return;
    }
    if (info.phase === "fail") {
      activeImportStage = stage;
      setStep(stage, "active", `失败：${info.message ?? "请重试"}`);
    }
  }

  function finishExtractSteps(view) {
    const entries = view?.entries?.length ?? 0;
    const inferences = view?.inferences?.length ?? 0;
    setStep("inference", "done", `${entries} 个对象 · ${inferences} 条推理`);
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
    setStep("closure", "done", closureDetail);
  }

  function workflowMapRecord(projectView, fileName) {
    const title = (projectView?.project?.title || fileName.replace(/\.pdf$/iu, "") || "论文解析结果").trim();
    const boundaryLabel = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
    const rawId = projectView?.project?.id || title || fileName;
    const slug = String(rawId)
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
    };
  }

  async function saveWorkflowMapToLibrary(projectView, fileName) {
    const map = workflowMapRecord(projectView, fileName);
    const saved = await persistImportedMap(map);
    sessionImportedMaps = mergeImportedMaps(sessionImportedMaps, [saved || map]);
    saveSessionImportedMaps(sessionImportedMaps);
    const currentOrder = getFolderMapOrder("myMaps");
    if (!currentOrder.includes(map.id)) currentOrder.push(map.id);
    saveFolderMapOrder("myMaps", currentOrder);
    renderLibraryDrawer();
    showLibraryToast(`已自动保存到「我的 JSON 地图」：${map.title}`);
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

  function showExtractSuccess(projectView, fileName) {
    extractStatus.hidden = false;
    extractStatus.classList.add("is-success");
    extractStatus.classList.remove("is-error");
    const stepsHtml = extractStatus.querySelector(".extract-steps")?.outerHTML ?? "";
    extractStatus.innerHTML = `${stepsHtml}
      <p class="extract-success-title">✓ 解析完成</p>
      <p class="extract-success-sub">已自动保存到「我的 JSON 地图」</p>
      <div class="extract-success-actions">
        <button type="button" class="extract-open-map">立即在地图中打开</button>
        <button type="button" class="extract-open-library">打开地图库</button>
        <button type="button" class="extract-dismiss">关闭</button>
      </div>`;
    extractStatus.querySelector(".extract-open-map").addEventListener("click", () => {
      const boundary = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
      const title = projectView?.project?.title || fileName.replace(/\.pdf$/i, "");
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

  startExtractButton?.addEventListener("click", async () => {
    if (!selectedPaperPdf) {
      paperPdfInput.click();
      return;
    }
    const apiKey = apiKeyInput?.value.trim();
    if (!apiKey) {
      showExtractError(`请先在『模型 API 配置』中临时输入 ${PROVIDER_CONFIGS[activeProviderKey].label} API Key。`);
      openDrawer("settings-drawer");
      return;
    }
    const model = modelSelect.value === "custom" ? customModelInput.value.trim() : modelSelect.value;
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
      const projectView = await window.GammaPaperImportClient.requestPaperProductionImport({
        pdf: selectedPaperPdf,
        gatewayUrl: MINERU_GATEWAY_URL,
        unzip: (bytes) => window.fflate.unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
        mineruFetchImpl: window.fetch.bind(window),
        endpoint: apiEndpointInput.value,
        apiKey,
        model,
        providerLabel: PROVIDER_CONFIGS[activeProviderKey].label,
        fetchImpl: modelFetch,
        onStage: handleImportStage,
        reasoningEffort: currentModelReasoningEffort(),
      });
      await saveWorkflowMapToLibrary(projectView, selectedPaperPdf.name);
      finishExtractSteps(projectView);
      showExtractSuccess(projectView, selectedPaperPdf.name);
    } catch (error) {
      const message = error instanceof TypeError
        ? (activeImportStage === "mineru"
          ? "浏览器无法连接 MinerU 精准解析服务，请检查网络后重试。"
          : `浏览器无法直接连接 ${PROVIDER_CONFIGS[activeProviderKey].label}。请检查网络、API 服务地址以及服务端的跨域请求设置。`)
        : error.message;
      showExtractError(message);
    } finally {
      if (apiKeyInput) {
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
  const btnTestConnection = document.querySelector("#btn-test-connection");
  const testConnectionResult = document.querySelector("#test-connection-result");

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

    if (!window.GammaGenericMathMapPreviewLoader || !window.GammaMathMapContentLoader || !window.GammaMathMapProjectAdapter) {
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
        const result = await window.GammaGenericMathMapPreviewLoader.loadFile(file, {
          loader: window.GammaMathMapContentLoader,
          adapter: window.GammaMathMapProjectAdapter,
        });

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

        const nodeCount = result.data?.project?.nodes?.length ?? result.data?.nodes?.length ?? 0;
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
          statusText: `校验未通过：${err.message || "文件内容不符合 Project View 格式"}`,
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

    const currentOrder = getFolderMapOrder("myMaps");
    importedMaps.forEach((m) => {
      if (!currentOrder.includes(m.id)) currentOrder.push(m.id);
    });
    saveFolderMapOrder("myMaps", currentOrder);

    closeAllPanels();

    const first = importedMaps[0];
    openMapWithData(first.data, first.boundaryLabel, first.title, first.id);
  });

  // --- Workbench Entrance 3: Unified Math Map Library Drawer ---
  const CURATED_DEMO_IDS = [
    "spectral-theorem",
    "intermediate-value-theorem",
    "fundamental-theorem-calculus",
  ];
  const MY_MAPS_ORDER_KEY = "cmath.math-map.my-maps-order-v1";
  const BUILTIN_MAPS_ORDER_KEY = "cmath.math-map.builtin-maps-order-v1";
  const LIBRARY_COLLAPSED_KEY = "cmath.math-map.library-collapsed-v1";
  const CUSTOM_FOLDERS_KEY = "cmath.math-map.custom-folders-v1";
  const MAP_FOLDER_ASSIGNMENTS_KEY = "cmath.math-map.map-folder-assignments-v1";
  const FOLDER_MAP_ORDER_KEY = "cmath.math-map.folder-map-order-v1";
  let isActivatingMap = false;

  let currentDragMap = null;
  let autoExpandTimer = null;
  let autoExpandFolderId = null;
  let pendingDeleteFolder = null;
  let toastTimeout = null;

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
    return {
      schema: "cmath.local-library-state/v1",
      customFolders: getCustomFolders(),
      assignments: getMapFolderAssignments(),
      orders: getAllFolderMapOrders(),
      collapsed: getCollapsedState(),
      updatedAt: Date.now(),
    };
  }

  function applyLibraryState(state) {
    if (!state || typeof state !== "object") return;
    if (Array.isArray(state.customFolders)) {
      saveCustomFolders(state.customFolders, true);
    }
    if (state.assignments && typeof state.assignments === "object") {
      saveMapFolderAssignments(state.assignments, true);
    }
    if (state.orders && typeof state.orders === "object") {
      try {
        localStorage.setItem(FOLDER_MAP_ORDER_KEY, JSON.stringify(state.orders));
        if (Array.isArray(state.orders.myMaps)) {
          localStorage.setItem(MY_MAPS_ORDER_KEY, JSON.stringify(state.orders.myMaps));
        }
        if (Array.isArray(state.orders.builtin)) {
          localStorage.setItem(BUILTIN_MAPS_ORDER_KEY, JSON.stringify(state.orders.builtin));
        }
      } catch { /* noop */ }
    }
    if (state.collapsed && typeof state.collapsed === "object") {
      saveCollapsedState(state.collapsed, true);
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
    const allMovable = [];
    (sessionImportedMaps || []).forEach((m) => {
      allMovable.push({ ...m, origin: "myMaps", isImported: true });
    });
    const registryMaps = Array.isArray(window.CMATH_GENERIC_MAP_REGISTRY?.maps)
      ? window.CMATH_GENERIC_MAP_REGISTRY.maps.filter((m) => m && typeof m.id === "string" && !CURATED_DEMO_IDS.includes(m.id))
      : [];
    registryMaps.forEach((m) => {
      allMovable.push({ ...m, origin: "builtin", isBuiltin: true, isImported: false });
    });
    return allMovable;
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
    if (folderId === "curated") return "精选 Demo";
    if (folderId === "myMaps") return "我的 JSON 地图";
    if (folderId === "builtin") return "内置地图库";
    const custom = (customFolders || getCustomFolders()).find((f) => f.id === folderId);
    return custom ? custom.name : "文件夹";
  }

  function isFolderEligibleForMap(folderId, mapDef) {
    if (!folderId || !mapDef || folderId === "curated") return false;
    if (folderId === "myMaps") return Boolean(mapDef.isImported);
    if (folderId === "builtin") return !mapDef.isImported;
    return true; // Any custom folder
  }

  function focusCard(mapId) {
    const selector = typeof CSS !== "undefined" && CSS.escape
      ? `.map-item-card[data-map-id="${CSS.escape(mapId)}"]`
      : `.map-item-card[data-map-id="${mapId.replace(/"/g, '\\"')}"]`;
    const card = document.querySelector(selector);
    if (card) card.focus();
  }

  function showLibraryToast(message) {
    const toast = document.querySelector("#library-feedback-toast");
    const liveRegion = document.querySelector("#library-live-region");
    if (liveRegion) liveRegion.textContent = message;
    if (toast) {
      toast.textContent = message;
      toast.hidden = false;
      void toast.offsetWidth;
      toast.classList.add("is-visible");
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => {
          if (!toast.classList.contains("is-visible")) toast.hidden = true;
        }, 200);
      }, 2200);
    }
  }

  function moveMapToFolder(mapId, targetFolderId) {
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
    showLibraryToast(`已将「${mapDef.title || mapId}」移动到「${targetFolderName}」`);

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

  function getCollapsedState() {
    try {
      const raw = localStorage.getItem(LIBRARY_COLLAPSED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch { /* noop */ }
    return { curated: false, myMaps: false, builtin: false };
  }

  function saveCollapsedState(state, skipPersist = false) {
    try {
      localStorage.setItem(LIBRARY_COLLAPSED_KEY, JSON.stringify(state));
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

    const systemFolderNames = ["精选 Demo", "我的 JSON 地图", "内置地图库", "精选 demo", "精选示例"];
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
        descEl.textContent = `确定删除文件夹「${folder.name}」吗？文件夹将被删除，其中的 ${count} 张数学地图将被保留并自动移回原系统文件夹（本地导入地图返回「我的 JSON 地图」，内置地图返回「内置地图库」）。`;
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
    const mapsInFolder = getOrderedMapsForFolder(folderId, customFolders);
    const assignments = getMapFolderAssignments();

    const myMapsOrder = getFolderMapOrder("myMaps");
    const builtinOrder = getFolderMapOrder("builtin");

    mapsInFolder.forEach((m) => {
      delete assignments[m.id];
      if (m.isImported) {
        if (!myMapsOrder.includes(m.id)) myMapsOrder.push(m.id);
      } else {
        if (!builtinOrder.includes(m.id)) builtinOrder.push(m.id);
      }
    });

    saveMapFolderAssignments(assignments);
    saveFolderMapOrder("myMaps", myMapsOrder);
    saveFolderMapOrder("builtin", builtinOrder);

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
    showLibraryToast(`已删除文件夹「${folder.name}」，地图已归还到原系统文件夹`);

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
    card.setAttribute("draggable", "true");

    const isActive = currentActiveMapId === mapDef.id;
    if (isActive) card.classList.add("is-active-map");

    const title = mapDef.title || mapDef.id;
    const boundary = mapDef.boundaryLabel || (mapDef.isImported ? "本地导入 · 数学地图" : "一般数学内容 · Gamma-native 只读地图");
    const sourceBadgeClass = mapDef.isImported ? "source-imported" : "source-builtin";
    const sourceBadgeText = mapDef.isImported ? "本地导入" : "内置库";

    // Build move options: original folder + all custom folders
    const originalFolder = mapDef.isImported ? { id: "myMaps", name: "我的 JSON 地图" } : { id: "builtin", name: "内置地图库" };
    const dests = [originalFolder, ...customFolders];

    const moveOptionsHtml = dests.map((dest) => {
      const isCurrent = dest.id === folderId;
      return `<button type="button" class="map-menu-item btn-menu-move" data-target-folder="${escapeHtml(dest.id)}" role="menuitem"${isCurrent ? " disabled" : ""}>
        <span>${escapeHtml(dest.name)}${isCurrent ? " (当前)" : ""}</span>
      </button>`;
    }).join("");

    card.innerHTML = `
      <div class="map-drag-handle" title="拖拽调整位置或移动到其他文件夹" aria-hidden="true">
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
          <span class="map-source-badge ${sourceBadgeClass}">${sourceBadgeText}</span>
          ${isActive ? `<span class="map-active-pill">当前浏览中</span>` : ""}
        </div>
        <span class="map-boundary-text">${escapeHtml(boundary)}</span>
      </div>
      <div class="map-card-actions">
        <span class="demo-case-btn" title="点击打开地图">打开 →</span>
        <div class="card-menu-wrapper">
          <button type="button" class="btn-card-menu" aria-label="操作「${escapeHtml(title)}」" aria-haspopup="menu" aria-expanded="false" title="更多操作">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
          <div class="map-action-menu" role="menu" hidden>
            <button type="button" class="map-menu-item btn-menu-up" role="menuitem"${index === 0 ? " disabled" : ""}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="18 15 12 9 6 15"></polyline></svg>
              <span>上移一行</span>
            </button>
            <button type="button" class="map-menu-item btn-menu-down" role="menuitem"${index === list.length - 1 ? " disabled" : ""}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              <span>下移一行</span>
            </button>
            <div class="map-menu-divider" role="separator"></div>
            <div class="map-menu-heading">移动至文件夹</div>
            ${moveOptionsHtml}
          </div>
        </div>
      </div>
    `;

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

    // Native Drag & Drop Handlers on Card
    card.addEventListener("dragstart", (e) => {
      if (e.target.closest(".card-menu-wrapper") || e.target.closest(".btn-card-menu") || e.target.closest(".map-action-menu")) {
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
        openMapWithData(mapDef.data, mapDef.boundaryLabel, mapDef.title, mapDef.id);
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
          boundary: "高等代数示例 · 数学地图与 Loop 进展",
        },
        {
          id: "intermediate-value-theorem",
          title: "从闭区间套到介值定理",
          boundary: "数学分析示例 · 数学地图与 Loop 进展",
        },
        {
          id: "fundamental-theorem-calculus",
          title: "从积分累积函数到微积分基本定理",
          boundary: "微积分示例 · 数学地图与 Loop 进展",
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
    const myMaps = getOrderedMapsForFolder("myMaps", customFolders);
    const countMyMaps = document.querySelector("#count-my-maps");
    if (countMyMaps) countMyMaps.textContent = String(myMaps.length);
    const listMyMaps = document.querySelector("#list-my-maps");
    const sectionMyMaps = document.querySelector("#section-my-maps");
    const headerMyMaps = document.querySelector("#header-my-maps");
    setupFolderDropTargets(sectionMyMaps, headerMyMaps, listMyMaps, "myMaps");

    if (listMyMaps) {
      listMyMaps.innerHTML = "";
      if (myMaps.length === 0) {
        const emptyBox = document.createElement("div");
        emptyBox.className = "empty-my-maps-box";
        emptyBox.innerHTML = `
          <p>暂无本地导入的地图，您可以立即导入 JSON 数据包</p>
          <button class="btn-secondary-sm" id="btn-empty-import" type="button">导入 JSON 地图</button>
        `;
        emptyBox.querySelector("#btn-empty-import")?.addEventListener("click", (e) => {
          e.stopPropagation();
          openDrawer("import-drawer");
        });
        listMyMaps.appendChild(emptyBox);
      } else {
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
    const customContainer = document.querySelector("#custom-folders-container");
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
          <div class="folder-accordion-header${isCollapsed ? " is-collapsed" : ""}" id="header-${folder.id}" data-folder="${folder.id}" role="button" tabindex="0" aria-expanded="${isCollapsed ? "false" : "true"}" aria-controls="list-${folder.id}">
            <div class="folder-header-left">
              <svg class="folder-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <h4 id="heading-${folder.id}" class="section-heading">${escapeHtml(folder.name)}</h4>
              <span class="section-count-badge" id="count-${folder.id}">${mapsInFolder.length}</span>
            </div>
            <div class="folder-header-right">
              <span class="section-order-hint">拖拽排序</span>
              <button type="button" class="btn-delete-folder" aria-label="删除文件夹「${escapeHtml(folder.name)}」" title="删除文件夹「${escapeHtml(folder.name)}」">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="map-cards-list" id="list-${folder.id}" role="list"></div>
        `;

        const header = section.querySelector(".folder-accordion-header");
        header?.addEventListener("click", () => toggleFolder(folder.id));
        header?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFolder(folder.id);
          }
        });

        const deleteBtn = section.querySelector(".btn-delete-folder");
        deleteBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          promptDeleteCustomFolder(folder);
        });
        deleteBtn?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            promptDeleteCustomFolder(folder);
          }
        });

        const listEl = section.querySelector(".map-cards-list");
        setupFolderDropTargets(section, header, listEl, folder.id);

        if (mapsInFolder.length === 0) {
          const emptyBox = document.createElement("div");
          emptyBox.className = "empty-folder-box";
          emptyBox.innerHTML = `<p>文件夹为空，可将其他地图拖拽或「移动至」此文件夹</p>`;
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
  mapActiveTitle?.addEventListener("click", (e) => {
    openLibraryDrawer(e.currentTarget);
  });
  mapActiveTitle?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLibraryDrawer(mapActiveTitle);
    }
  });

  document.querySelector("#btn-close-library-drawer")?.addEventListener("click", closeAllPanels);

  // --- Backup & Restore (Export / Import Backup) ---
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
      const data = m.data;
      if (!data || typeof data !== "object") continue;
      if (data.schema !== "cmath.project-view-model/v0.1" || !data.project || !Array.isArray(data.entries) || !Array.isArray(data.inferences)) {
        continue;
      }
      validMaps.push({
        schema: "cmath.local-map-record/v1",
        id,
        title: String(m.title || data.project.title || id).trim(),
        boundaryLabel: String(m.boundaryLabel || data.channelOptions?.boundaryLabel || "本地导入 · 数学地图").trim(),
        importedAt: Number.isFinite(m.importedAt) ? m.importedAt : Date.now(),
        isImported: true,
        data,
      });
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
    const mergedFolders = (currentLibraryState.customFolders || []).filter((f) => f && f.id && f.name);
    const existingFolderIds = new Set(mergedFolders.map((f) => f.id));
    const existingFolderNames = new Map(mergedFolders.map((f) => [f.name.toLowerCase().trim(), f]));
    const folderIdMap = new Map([
      ["myMaps", "myMaps"],
      ["builtin", "builtin"],
      ["curated", "curated"],
    ]);

    const incomingFolders = Array.isArray(validatedBackup.library.customFolders)
      ? validatedBackup.library.customFolders.filter((f) => f && f.id && f.name)
      : [];

    for (const incFolder of incomingFolders) {
      const nameKey = incFolder.name.toLowerCase().trim();
      if (existingFolderNames.has(nameKey)) {
        folderIdMap.set(incFolder.id, existingFolderNames.get(nameKey).id);
      } else if (existingFolderIds.has(incFolder.id)) {
        const newFolderId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        folderIdMap.set(incFolder.id, newFolderId);
        const newFolder = { id: newFolderId, name: incFolder.name, createdAt: incFolder.createdAt || Date.now() };
        mergedFolders.push(newFolder);
        existingFolderIds.add(newFolderId);
        existingFolderNames.set(nameKey, newFolder);
      } else {
        folderIdMap.set(incFolder.id, incFolder.id);
        const newFolder = { id: incFolder.id, name: incFolder.name, createdAt: incFolder.createdAt || Date.now() };
        mergedFolders.push(newFolder);
        existingFolderIds.add(incFolder.id);
        existingFolderNames.set(nameKey, newFolder);
      }
    }

    // Assignments Merge
    const mergedAssignments = { ...(currentLibraryState.assignments || {}) };
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
    const mergedOrders = { ...(currentLibraryState.orders || {}) };
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

    // Ensure all merged maps are in folder orders
    for (const m of mergedMaps) {
      const assignedFolder = mergedAssignments[m.id] || "myMaps";
      if (!Array.isArray(mergedOrders[assignedFolder])) mergedOrders[assignedFolder] = [];
      if (!mergedOrders[assignedFolder].includes(m.id)) {
        mergedOrders[assignedFolder].push(m.id);
      }
    }

    // Collapsed state merge
    const mergedCollapsed = { ...(currentLibraryState.collapsed || { curated: false, myMaps: false, builtin: false }) };
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
        schema: "cmath.local-library-state/v1",
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

  const btnExportBackup = document.querySelector("#btn-export-library-backup");
  const btnImportBackup = document.querySelector("#btn-import-library-backup");
  const inputImportBackup = document.querySelector("#input-import-library-backup");

  btnExportBackup?.addEventListener("click", () => {
    exportLibraryBackup();
  });

  btnImportBackup?.addEventListener("click", () => {
    if (inputImportBackup) {
      inputImportBackup.value = "";
      inputImportBackup.click();
    }
  });

  inputImportBackup?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImportBackupFile(file);
  });

  function loadCuratedDemo(mapKey) {
    if (isActivatingMap) return;
    isActivatingMap = true;
    try {
      if (!window.CMATH_PORTABLE_MAPS || !window.CMATH_PORTABLE_MAPS[mapKey]) {
        throw new Error(`未找到指定的案例数据：${mapKey}`);
      }
      const data = window.CMATH_PORTABLE_MAPS[mapKey];
      const boundary = data.channelOptions?.boundaryLabel || "数学地图示例 · Loop 进展";
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

  function persistMapForReload(data, boundaryLabel, title, mapKey = null) {
    sessionStorage.setItem(SESSION_MAP_KEY, JSON.stringify({ data, boundaryLabel, title, mapKey }));
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("session-map", "1");
    window.location.assign(next);
  }

  async function openMapWithData(data, boundaryLabel, title, mapKey = null) {
    closeAllPanels();
    currentActiveMapData = data;
    currentActiveMapTitle = title || data?.project?.title || "math-map";
    currentActiveMapId = mapKey || data.project?.id || title;

    if (mapRuntimeMounted) {
      persistMapForReload(data, boundaryLabel, title, currentActiveMapId);
      return;
    }

    // 1. Update titles
    mapActiveTitle.textContent = title;
    mapBoundaryTag.textContent = boundaryLabel;
    document.title = `CMath · ${title}`;

    // 2. Switch app state to 'map'
    const mapView = document.querySelector("#math-map-view");
    const workbenchView = document.querySelector("#workbench-view");
    if (mapView) mapView.hidden = false;
    if (workbenchView) workbenchView.hidden = true;
    body.setAttribute("data-view", "map");

    // 3. Create Model
    const adapter = window.GammaMathMapProjectAdapter;
    const adapterOptions = data.channelOptions?.adapterOptions ?? {};
    const model = adapter.create(data, adapterOptions);
    window.GammaMathMapLabModel = model;
    window.CMATH_PROJECT_PRESENTATION = {
      projectId: data.project?.id,
      channelOptions: data.channelOptions ?? {},
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
      await loadScript("math-map-lab.js");
      mapRuntimeMounted = true;
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
      openMapWithData(saved.data, saved.boundaryLabel, saved.title, saved.mapKey);
    } catch (error) {
      alert(`无法恢复本地数学地图：\n${error.message}`);
    }
  } else if (initialMap && window.CMATH_PORTABLE_MAPS?.[initialMap]) {
    loadCuratedDemo(initialMap);
  } else if (urlParams.get("demos") === "1") {
    openLibraryDrawer();
  }
})();
