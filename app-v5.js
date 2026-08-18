/* ============================================================================
   CMath Math Map V5 — Application Logic
   真实后端接线版：论文 PDF 解析（pdf.js + GammaPaperImportClient）、
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
    { id: "read", label: "读取 PDF 文本" },
    { id: "send", label: "发送至模型服务" },
    { id: "wait", label: "模型生成数学结构" },
    { id: "validate", label: "校验并组装 JSON" },
    { id: "closure", label: "检查证明闭包" },
  ];
  let stepEls = new Map();
  let awaitingStepId = "wait";

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
    awaitingStepId = "wait";
  }

  function setStep(id, state, detail) {
    const li = stepEls.get(id);
    if (!li) return;
    li.classList.remove("is-active", "is-done");
    if (state) li.classList.add(state === "active" ? "is-active" : "is-done");
    if (detail !== undefined) li.querySelector(".step-detail").textContent = detail;
  }

  function isStepDone(id) {
    return stepEls.get(id)?.classList.contains("is-done") ?? false;
  }

  function addStepAfter(afterId, id, label) {
    const anchor = stepEls.get(afterId);
    if (!anchor || stepEls.has(id)) return;
    const li = document.createElement("li");
    li.dataset.step = id;
    li.innerHTML = `<span class="step-dot"></span><span class="step-label"></span><span class="step-detail"></span>`;
    li.querySelector(".step-label").textContent = label;
    anchor.after(li);
    stepEls.set(id, li);
  }

  function handleImportStage(stage, info = {}) {
    if (stage === "request") {
      if (!isStepDone("send")) {
        const chunksNote = (info.chunks ?? 1) > 1 ? ` · 分 ${info.chunks} 段并行提取` : "";
        setStep("send", "done", `约 ${((info.chars ?? 0) / 1000).toFixed(1)}k 字符${chunksNote}`);
        setStep("wait", "active");
        awaitingStepId = "wait";
      } else {
        setStep(awaitingStepId, "active");
      }
    } else if (stage === "entries-progress") {
      setStep("wait", "active", `分段提取对象 ${info.done ?? 0}/${info.total ?? 1}`);
    } else if (stage === "entries-repair") {
      setStep("wait", "active", `第 ${info.chunk ?? "?"}/${info.total ?? "?"} 段输出修复中（${info.count ?? 0} 处）`);
    } else if (stage === "integrate") {
      setStep("wait", "active", `整合 ${info.entries ?? "…"} 个对象（语义去重）`);
    } else if (stage === "integrate-applied") {
      setStep("wait", "active", `整合完成：合并 ${info.aliasCount ?? 0} 处重复 · 改名 ${info.renameCount ?? 0} 处`);
    } else if (stage === "assemble") {
      setStep("wait", "active", `装配 ${info.entries ?? "…"} 个对象的推理关系`);
    } else if (stage === "response") {
      setStep(awaitingStepId, "done");
      setStep("validate", "active");
    } else if (stage === "autofix") {
      setStep("validate", "active", `模型修复未通过，本地兜底修复 ${info.count ?? 0} 处`);
    } else if (stage === "repair") {
      setStep("validate", "done", `校验未通过（${info.reason ?? "结构问题"}），模型定点修复中`);
      addStepAfter("validate", "repair-step", "模型定点修复（输出 + 问题清单返还）");
      setStep("repair-step", "active");
      awaitingStepId = "repair-step";
    }
  }

  function finishExtractSteps(view) {
    const entries = view?.entries?.length ?? 0;
    const inferences = view?.inferences?.length ?? 0;
    setStep("validate", "done", `${entries} 个对象 · ${inferences} 条推理`);
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
      <p class="extract-success-sub">paper-project-view.json 已下载到本地</p>
      <div class="extract-success-actions">
        <button type="button" class="extract-open-map">立即在地图中打开</button>
        <button type="button" class="extract-dismiss">关闭</button>
      </div>`;
    extractStatus.querySelector(".extract-open-map").addEventListener("click", () => {
      const boundary = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
      const title = projectView?.project?.title || fileName.replace(/\.pdf$/i, "");
      openMapWithData(projectView, boundary, title);
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
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size <= 0 || file.size > 25 * 1024 * 1024) {
      clearSelectedPaperPdf();
      showExtractError("请选择一份不超过 25 MB 的 PDF 论文。");
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
    const originalLabel = startExtractButton.textContent;
    startExtractButton.disabled = true;
    startExtractButton.textContent = "解析中…";
    showExtractSteps();
    setStep("read", "active");
    try {
      if (!window.GammaPaperImportClient) throw new Error("论文导入组件没有加载，请刷新后重试");
      const pdfjsLib = await import("./vendor/pdfjs/pdf.min.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
      const paper = await window.GammaPaperImportClient.extractPdfText(selectedPaperPdf, {
        pdfjsLib,
        onProgress: ({ page, pageCount }) => setStep("read", "active", `第 ${page} / ${pageCount} 页`),
      });
      setStep("read", "done", `共 ${paper.pageCount} 页 · ${paper.text.length.toLocaleString()} 字符${paper.truncated ? "（已截断，仅处理前部）" : ""}`);
      setStep("send", "active");
      const projectView = await window.GammaPaperImportClient.requestPaperProjectView({
        endpoint: apiEndpointInput.value,
        apiKey,
        model,
        providerLabel: PROVIDER_CONFIGS[activeProviderKey].label,
        fileName: selectedPaperPdf.name,
        pageCount: paper.pageCount,
        text: paper.text,
        fetchImpl: modelFetch,
        onStage: handleImportStage,
        reasoningEffort: currentModelReasoningEffort(),
      });
      finishExtractSteps(projectView);
      const blob = new Blob([`${JSON.stringify(projectView, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "paper-project-view.json";
      link.click();
      URL.revokeObjectURL(url);
      showExtractSuccess(projectView, selectedPaperPdf.name);
    } catch (error) {
      const message = error instanceof TypeError
        ? `浏览器无法直接连接 ${PROVIDER_CONFIGS[activeProviderKey].label}。请检查网络、API 服务地址以及服务端的跨域请求设置。`
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

  btnStartBatchImport?.addEventListener("click", () => {
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

    sessionImportedMaps.push(...newMaps);
    saveSessionImportedMaps(sessionImportedMaps);

    const currentOrder = getFolderMapOrder("myMaps");
    newMaps.forEach((m) => {
      if (!currentOrder.includes(m.id)) currentOrder.push(m.id);
    });
    saveFolderMapOrder("myMaps", currentOrder);

    closeAllPanels();

    const first = newMaps[0];
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

  function saveCustomFolders(folders) {
    try {
      localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(folders));
    } catch { /* noop */ }
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

  function saveMapFolderAssignments(assignments) {
    try {
      localStorage.setItem(MAP_FOLDER_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch { /* noop */ }
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

  function saveFolderMapOrder(folderId, ids) {
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

  function moveMapToFolder(mapId, targetFolderId) {
    const customFolders = getCustomFolders();
    const assignments = getMapFolderAssignments();
    const prevFolderId = assignments[mapId] || (sessionImportedMaps.some((m) => m.id === mapId) ? "myMaps" : "builtin");

    if (prevFolderId === targetFolderId) return;

    assignments[mapId] = targetFolderId;
    saveMapFolderAssignments(assignments);

    // Remove from previous folder's order
    const prevOrder = getFolderMapOrder(prevFolderId).filter((id) => id !== mapId);
    saveFolderMapOrder(prevFolderId, prevOrder);

    // Append to target folder's order
    const targetOrder = getFolderMapOrder(targetFolderId).filter((id) => id !== mapId);
    targetOrder.push(mapId);
    saveFolderMapOrder(targetFolderId, targetOrder);

    renderLibraryDrawer();

    // Focus the moved card in its new folder
    setTimeout(() => {
      const selector = typeof CSS !== "undefined" && CSS.escape
        ? `.map-item-card[data-map-id="${CSS.escape(mapId)}"]`
        : `.map-item-card[data-map-id="${mapId.replace(/"/g, '\\"')}"]`;
      const movedCard = document.querySelector(selector);
      if (movedCard) {
        movedCard.focus();
      }
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
    focusCardOrButton(mapId, delta);
  }

  function focusCardOrButton(mapId, delta) {
    const selector = typeof CSS !== "undefined" && CSS.escape
      ? `.map-item-card[data-map-id="${CSS.escape(mapId)}"]`
      : `.map-item-card[data-map-id="${mapId.replace(/"/g, '\\"')}"]`;
    const updatedCard = document.querySelector(selector);
    if (updatedCard) {
      const targetBtn = delta < 0
        ? updatedCard.querySelector(".btn-move-up")
        : updatedCard.querySelector(".btn-move-down");
      if (targetBtn && !targetBtn.disabled) {
        targetBtn.focus();
      } else {
        updatedCard.focus();
      }
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
    return { curated: false, myMaps: false, builtin: false };
  }

  function saveCollapsedState(state) {
    try {
      localStorage.setItem(LIBRARY_COLLAPSED_KEY, JSON.stringify(state));
    } catch { /* noop */ }
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

  function createMapCardElement(mapDef, index, list, folderId, customFolders) {
    const card = document.createElement("div");
    card.className = "map-item-card";
    card.dataset.mapId = mapDef.id;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
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
      return `<option value="${escapeHtml(dest.id)}"${isCurrent ? " disabled" : ""}>${escapeHtml(dest.name)}${isCurrent ? " (当前)" : ""}</option>`;
    }).join("");

    card.innerHTML = `
      <div class="map-card-info">
        <div class="map-card-meta-row">
          <span class="map-source-badge ${sourceBadgeClass}">${sourceBadgeText}</span>
          ${isActive ? `<span class="map-active-pill">当前浏览中</span>` : ""}
        </div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(boundary)}</span>
      </div>
      <div class="map-card-actions">
        <div class="map-reorder-btns" aria-label="排序控制">
          <button type="button" class="btn-reorder btn-move-up" title="上移" aria-label="上移「${escapeHtml(title)}」"${index === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="btn-reorder btn-move-down" title="下移" aria-label="下移「${escapeHtml(title)}」"${index === list.length - 1 ? " disabled" : ""}>↓</button>
        </div>
        <div class="map-move-wrap">
          <select class="map-move-select" aria-label="移动「${escapeHtml(title)}」到文件夹" data-map-id="${escapeHtml(mapDef.id)}">
            <option value="" disabled selected>移动到…</option>
            ${moveOptionsHtml}
          </select>
        </div>
        <span class="demo-case-btn">打开地图 →</span>
      </div>
    `;

    const btnUp = card.querySelector(".btn-move-up");
    const btnDown = card.querySelector(".btn-move-down");
    btnUp?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      moveMapInFolder(folderId, mapDef.id, -1);
    });
    btnDown?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      moveMapInFolder(folderId, mapDef.id, 1);
    });

    const moveSelect = card.querySelector(".map-move-select");
    if (moveSelect) {
      ["click", "mousedown", "pointerdown", "keydown"].forEach((evt) => {
        moveSelect.addEventListener(evt, (e) => e.stopPropagation());
      });
      moveSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        const target = e.target.value;
        if (target && target !== folderId) {
          moveMapToFolder(mapDef.id, target);
        }
      });
    }

    function handleCardActivation() {
      if (mapDef.isImported) {
        openMapWithData(mapDef.data, mapDef.boundaryLabel, mapDef.title, mapDef.id);
      } else {
        loadGenericRegistryMap(mapDef, card);
      }
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest(".map-reorder-btns") || e.target.closest(".map-move-wrap")) return;
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
    if (listCurated) {
      listCurated.innerHTML = "";
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
        card.className = "map-item-card";
        card.dataset.mapId = demo.id;
        card.setAttribute("role", "listitem");
        card.setAttribute("tabindex", "0");
        const isActive = currentActiveMapId === demo.id;
        if (isActive) card.classList.add("is-active-map");

        card.innerHTML = `
          <div class="map-card-info">
            <div class="map-card-meta-row">
              <span class="map-source-badge source-demo">精选 DEMO</span>
              ${isActive ? `<span class="map-active-pill">当前浏览中</span>` : ""}
            </div>
            <strong>${escapeHtml(demo.title)}</strong>
            <span>${escapeHtml(demo.boundary)}</span>
          </div>
          <div class="map-card-actions">
            <span class="demo-case-btn">打开地图 →</span>
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
    if (listBuiltin) {
      listBuiltin.innerHTML = "";
      if (builtinMaps.length === 0) {
        const emptyBox = document.createElement("div");
        emptyBox.className = "empty-my-maps-box";
        emptyBox.innerHTML = `<p>内置地图库当前无地图（均已移动至其他文件夹）</p>`;
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
            <span class="section-order-hint">支持上下微调排序 · 自动记忆</span>
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

        const listEl = section.querySelector(".map-cards-list");
        if (mapsInFolder.length === 0) {
          const emptyBox = document.createElement("div");
          emptyBox.className = "empty-folder-box";
          emptyBox.innerHTML = `<p>文件夹为空，可将其他地图「移动到…」此文件夹</p>`;
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
      if (!mapDef?.dataScript) {
        throw new Error(`地图「${mapDef?.title || mapDef?.id}」未指定数据脚本 (dataScript)`);
      }
      window.CMATH_DATA = undefined;
      await loadScript(mapDef.dataScript);
      const data = window.CMATH_DATA;
      if (!data || typeof data !== "object") {
        throw new Error(`数据脚本 ${mapDef.dataScript} 未能成功赋值 window.CMATH_DATA`);
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
