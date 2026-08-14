/* ============================================================================
   CMath Math Map V4 — Application Logic
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
  const modelSelect = document.querySelector("#model-select");
  const customModelGroup = document.querySelector("#custom-model-group");
  const customModelInput = document.querySelector("#custom-model-input");
  const SESSION_MAP_KEY = "cmath.math-map.session-map";
  let mapRuntimeMounted = false;

  const PROVIDER_CONFIGS = {
    deepseek: {
      endpoint: "https://api.deepseek.com/v1",
      models: [
        { value: "deepseek-chat", label: "deepseek-chat (推荐 · 快速高效)", default: true },
        { value: "deepseek-reasoner", label: "deepseek-reasoner (深度推理)" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    openai: {
      endpoint: "https://api.openai.com/v1",
      models: [
        { value: "gpt-4o", label: "gpt-4o (旗舰通用)", default: true },
        { value: "gpt-4o-mini", label: "gpt-4o-mini (轻量高效)" },
        { value: "o1", label: "o1 (高阶推理)" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    gemini: {
      endpoint: "https://generativelanguage.googleapis.com/v1beta",
      models: [
        { value: "gemini-2.5-flash", label: "gemini-2.5-flash (快速响应)", default: true },
        { value: "gemini-2.5-pro", label: "gemini-2.5-pro (深度多模态)" },
        { value: "custom", label: "自定义模型名称..." }
      ]
    },
    custom: {
      endpoint: "",
      models: [
        { value: "custom", label: "自定义模型名称...", default: true }
      ]
    }
  };

  function updateProviderSettings(providerKey) {
    providerBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.provider === providerKey));
    const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.deepseek;
    
    if (providerKey !== "custom" || !apiEndpointInput.value) {
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

    handleModelChange();
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

  modelSelect?.addEventListener("change", handleModelChange);

  // Initialize with DeepSeek
  updateProviderSettings("deepseek");

  // Drawer / Modal triggers
  function closeAllPanels() {
    paperDrawer.classList.remove("is-open");
    settingsDrawer.classList.remove("is-open");
    demoModal.hidden = true;
  }

  // --- Workbench Entrance 1: Upload Paper PDF ---
  document.querySelector("#card-upload-paper")?.addEventListener("click", () => {
    closeAllPanels();
    paperDrawer.classList.add("is-open");
  });
  document.querySelector("#btn-close-paper-drawer")?.addEventListener("click", closeAllPanels);
  const pdfDropZone = paperDrawer?.querySelector(".pdf-drop-zone");
  const startExtractButton = document.querySelector("#btn-start-extract");
  const paperPdfInput = document.createElement("input");
  paperPdfInput.type = "file";
  paperPdfInput.accept = ".pdf,application/pdf";
  paperPdfInput.hidden = true;
  paperDrawer?.appendChild(paperPdfInput);
  let selectedPaperPdf = null;

  function selectPaperPdf(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size <= 0 || file.size > 25 * 1024 * 1024) {
      selectedPaperPdf = null;
      alert("请选择一份不超过 25 MB 的 PDF 论文。");
      return;
    }
    selectedPaperPdf = file;
    pdfDropZone.setAttribute("aria-label", `已选择 ${file.name}`);
  }

  pdfDropZone?.addEventListener("click", () => paperPdfInput.click());
  paperPdfInput?.addEventListener("change", (event) => selectPaperPdf(event.target.files?.[0]));
  pdfDropZone?.addEventListener("dragover", (event) => event.preventDefault());
  pdfDropZone?.addEventListener("drop", (event) => selectPaperPdf(event.dataTransfer?.files?.[0]));

  startExtractButton?.addEventListener("click", async () => {
    if (!selectedPaperPdf) {
      paperPdfInput.click();
      return;
    }
    const apiKey = apiKeyInput?.value.trim();
    if (!apiKey) {
      alert("请先在『模型 API 配置』中临时输入 DeepSeek API Key。");
      return;
    }
    const model = modelSelect.value === "custom" ? customModelInput.value.trim() : modelSelect.value;
    const originalLabel = startExtractButton.textContent;
    startExtractButton.disabled = true;
    startExtractButton.textContent = "正在读取 PDF…";
    try {
      if (!window.GammaPaperImportClient) throw new Error("论文导入组件没有加载，请刷新后重试");
      const pdfjsLib = await import("./vendor/pdfjs/pdf.min.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
      const paper = await window.GammaPaperImportClient.extractPdfText(selectedPaperPdf, { pdfjsLib });
      startExtractButton.textContent = "正在生成数学地图…";
      const projectView = await window.GammaPaperImportClient.requestPaperProjectView({
        endpoint: apiEndpointInput.value,
        apiKey,
        model,
        fileName: selectedPaperPdf.name,
        pageCount: paper.pageCount,
        text: paper.text,
      });
      const blob = new Blob([`${JSON.stringify(projectView, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "paper-project-view.json";
      link.click();
      URL.revokeObjectURL(url);
      alert("论文解析完成，paper-project-view.json 已下载。\n\n现在可以点击『打开本地 JSON』载入图谱。");
      closeAllPanels();
    } catch (error) {
      const message = error instanceof TypeError
        ? "浏览器无法直接连接 DeepSeek。请检查网络、API 服务地址以及服务端的跨域请求设置。"
        : error.message;
      alert(message);
    } finally {
      if (apiKeyInput) apiKeyInput.value = "";
      startExtractButton.disabled = false;
      startExtractButton.textContent = originalLabel;
    }
  });

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
