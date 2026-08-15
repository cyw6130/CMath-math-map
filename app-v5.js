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
  const paperDrawer = document.querySelector("#paper-drawer");
  const settingsDrawer = document.querySelector("#settings-drawer");
  const demoModal = document.querySelector("#demo-modal");
  const localJsonInput = document.querySelector("#local-json-file-input");

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
  let mapRuntimeMounted = false;
  let activeProviderKey = "opencode";

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
    rememberCurrentProviderSettings();
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
  updateProviderSettings("opencode");

  // Drawer / Modal triggers
  function closeAllPanels() {
    paperDrawer.classList.remove("is-open");
    settingsDrawer.classList.remove("is-open");
    demoModal.hidden = true;
  }

  // --- Workbench Entrance 1: Upload Paper PDF ---
  document.querySelector("#card-upload-paper")?.addEventListener("click", () => {
    closeAllPanels();
    if (typeof resetExtractStatus === "function") resetExtractStatus();
    paperDrawer.classList.add("is-open");
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
      settingsDrawer.classList.add("is-open");
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

  // --- Workbench Entrance 2: Open Local JSON ---
  document.querySelector("#card-open-json")?.addEventListener("click", () => {
    localJsonInput.click();
  });
  document.querySelector("#btn-map-open-json")?.addEventListener("click", () => {
    localJsonInput.click();
  });

  localJsonInput?.addEventListener("change", async (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    try {
      if (!window.GammaGenericMathMapPreviewLoader || !window.GammaMathMapContentLoader || !window.GammaMathMapProjectAdapter) {
        throw new Error("数学地图核心能力模块尚未完全就绪，请刷新重试");
      }
      const result = await window.GammaGenericMathMapPreviewLoader.loadFile(file, {
        loader: window.GammaMathMapContentLoader,
        adapter: window.GammaMathMapProjectAdapter,
      });
      openMapWithData(result.data, result.definition.boundaryLabel, result.definition.title);
    } catch (err) {
      alert(`无法载入本地 JSON 文件：\n${err.message}`);
    } finally {
      localJsonInput.value = "";
    }
  });

  // --- Workbench Entrance 3: Curated Demos ---
  function openDemoModal() {
    closeAllPanels();
    demoModal.hidden = false;
  }

  document.querySelector("#card-curated-demos")?.addEventListener("click", openDemoModal);
  document.querySelector("#btn-topbar-demos")?.addEventListener("click", openDemoModal);
  document.querySelector("#btn-map-open-demos")?.addEventListener("click", () => {
    if (!mapRuntimeMounted) {
      openDemoModal();
      return;
    }
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("demos", "1");
    window.location.assign(next);
  });
  document.querySelector("#btn-close-demo-modal")?.addEventListener("click", closeAllPanels);

  // Bind the 3 Curated Demos
  document.querySelectorAll(".demo-case-card").forEach((card) => {
    card.addEventListener("click", () => {
      const mapKey = card.dataset.mapKey;
      loadCuratedDemo(mapKey);
    });
  });

  function loadCuratedDemo(mapKey) {
    if (!window.CMATH_PORTABLE_MAPS || !window.CMATH_PORTABLE_MAPS[mapKey]) {
      alert(`未找到指定的案例数据：${mapKey}`);
      return;
    }
    const data = window.CMATH_PORTABLE_MAPS[mapKey];
    const boundary = data.channelOptions?.boundaryLabel || "数学地图示例 · Loop 进展";
    const title = data.project?.title || "数学地图";
    openMapWithData(data, boundary, title, mapKey);
  }

  // --- Topbar Settings Trigger ---
  document.querySelector("#btn-topbar-settings")?.addEventListener("click", () => {
    closeAllPanels();
    settingsDrawer.classList.add("is-open");
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

  function persistMapForReload(data, boundaryLabel, title) {
    sessionStorage.setItem(SESSION_MAP_KEY, JSON.stringify({ data, boundaryLabel, title }));
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("session-map", "1");
    window.location.assign(next);
  }

  async function openMapWithData(data, boundaryLabel, title, mapKey = null) {
    closeAllPanels();

    if (mapRuntimeMounted) {
      persistMapForReload(data, boundaryLabel, title);
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
      openMapWithData(saved.data, saved.boundaryLabel, saved.title);
    } catch (error) {
      alert(`无法恢复本地数学地图：\n${error.message}`);
    }
  } else if (initialMap && window.CMATH_PORTABLE_MAPS?.[initialMap]) {
    loadCuratedDemo(initialMap);
  } else if (urlParams.get("demos") === "1") {
    openDemoModal();
  }
})();
