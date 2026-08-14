(() => {
  "use strict";

  const registry = window.CMATH_GENERIC_MAP_REGISTRY;
  const loader = window.GammaMathMapContentLoader;
  const previewLoader = window.GammaGenericMathMapPreviewLoader;
  const errorPanel = document.querySelector("#generic-map-error");
  const picker = document.querySelector("#generic-map-picker");
  const lensSwitcher = document.querySelector(".lens-switcher");
  const previewPanel = document.querySelector("#generic-map-preview");
  const previewInput = document.querySelector("#generic-map-preview-file");
  const previewStatus = document.querySelector("#generic-map-preview-status");
  const pageUrl = new URL(window.location.href);
  const previewMode = pageUrl.searchParams.get("preview") === "1";
  const aiPreviewMode = pageUrl.searchParams.get("preview") === "ai";

  function showError(message) {
    errorPanel.textContent = `数学地图加载失败：${message}`;
    errorPanel.hidden = false;
  }

  function clearError() {
    errorPanel.textContent = "";
    errorPanel.hidden = true;
  }

  function fail(message) {
    showError(message);
    throw new Error(message);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function bindDefinition(definition) {
    const workspaceViews = definition.workspaceViews ?? ["global"];
    const contentView = workspaceViews.includes("progress") ? "global-progress" : "global-only";
    document.documentElement.dataset.contentMapId = definition.id;
    document.documentElement.dataset.contentView = contentView;
    document.body.dataset.contentView = contentView;
    document.title = `Gamma 数学地图 · ${definition.title}`;
    document.querySelector("#generic-map-title").textContent = definition.title;
    document.querySelector("#generic-map-boundary").textContent = definition.boundaryLabel;
    document.querySelector("#math-map-canvas").setAttribute("aria-label", `${definition.title}数学地图画布`);
    lensSwitcher.replaceChildren(...workspaceViews.map((view) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.lens = view;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(view === "global"));
      button.textContent = view === "progress" ? "进展" : "全图";
      return button;
    }));
  }

  function loadRuntimeScripts({ includeAdapter = true } = {}) {
    const scripts = ["math-map-model.js"];
    if (includeAdapter) scripts.push("math-map-project-adapter.js");
    scripts.push("math-map-project-bridge.js", "math-map-lab.js", "lab-experiments.js");
    return scripts.reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve());
  }

  function activatePreview(result) {
    window.CMATH_DATA = result.data;
    bindDefinition(result.definition);
    return loadRuntimeScripts({ includeAdapter: false });
  }

  if (!loader || typeof loader.validateProjectView !== "function") fail("数学内容 Loader 缺失");

  if (aiPreviewMode) {
    const session = window.CMATH_AI_MAP_SESSION;
    if (!previewLoader || typeof previewLoader.prepare !== "function") fail("Preview Loader 缺失");
    if (!session || session.error || !session.data) fail(session?.error ?? "当前会话数学地图不存在");
    document.documentElement.dataset.contentMapId = "ai-preview";
    document.title = "Gamma 数学地图 · AI 回答投影";
    document.querySelector("#generic-map-title").textContent = "AI 回答投影";
    document.querySelector("#generic-map-boundary").textContent = "当前浏览器会话";
    picker.replaceChildren(Object.assign(document.createElement("option"), {
      value: "ai-preview",
      textContent: "AI 回答投影",
      selected: true,
    }));
    picker.disabled = true;
    loadScript("math-map-project-adapter.js")
      .then(() => previewLoader.prepare(session.data, {
        loader,
        adapter: window.GammaMathMapProjectAdapter,
        fileName: "AI 回答投影",
      }))
      .then(activatePreview)
      .catch((error) => fail(error.message));
    return;
  }

  if (previewMode) {
    if (!previewLoader || typeof previewLoader.loadFile !== "function") fail("Preview Loader 缺失");
    if (!previewPanel || !previewInput || !previewStatus) fail("预览文件入口缺失");

    document.documentElement.dataset.contentMapId = "preview";
    document.title = "Gamma 数学地图 · 本地预览";
    document.querySelector("#generic-map-title").textContent = "本地预览";
    document.querySelector("#generic-map-boundary").textContent = "浏览器本地读取 · 不写入项目";
    picker.replaceChildren(Object.assign(document.createElement("option"), {
      value: "preview",
      textContent: "本地 Project View",
      selected: true,
    }));
    picker.disabled = true;
    previewPanel.hidden = false;

    let adapterReady;
    previewInput.addEventListener("change", async () => {
      const [file] = previewInput.files ?? [];
      if (!file) return;
      clearError();
      previewInput.disabled = true;
      previewStatus.textContent = "正在校验数学内容…";
      try {
        adapterReady ??= loadScript("math-map-project-adapter.js");
        await adapterReady;
        const result = await previewLoader.loadFile(file, {
          loader,
          adapter: window.GammaMathMapProjectAdapter,
        });
        previewStatus.textContent = "校验通过，正在绘制全图…";
        await activatePreview(result);
        previewPanel.hidden = true;
      } catch (error) {
        showError(error.message);
        previewStatus.textContent = `未载入：${error?.message ?? error}`;
        previewInput.disabled = false;
        previewInput.value = "";
      }
    });
    return;
  }

  if (!registry || registry.schema !== "cmath-gamma.generic-math-map-runtime-registry/v0.1"
      || !Array.isArray(registry.maps) || !registry.maps.length) {
    fail("通用地图 registry 缺失或不兼容");
  }

  const requestedMapId = pageUrl.searchParams.get("map");
  const definition = requestedMapId
    ? registry.maps.find((item) => item.id === requestedMapId)
    : registry.maps[0];
  if (!definition) fail(`未知 mapId：${requestedMapId}`);
  if (!requestedMapId && window.history?.replaceState) {
    const normalized = new URL(window.location.href);
    normalized.searchParams.set("map", definition.id);
    try {
      window.history.replaceState(null, "", normalized.toString());
    } catch {
      // Some file:// hosts reject history updates; rendering does not depend on normalization.
    }
  }

  picker.replaceChildren(...registry.maps.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.title;
    option.selected = item.id === definition.id;
    return option;
  }));
  picker.addEventListener("change", () => {
    const next = new URL(window.location.href);
    next.searchParams.set("map", picker.value);
    window.location.assign(next.toString());
  });

  bindDefinition(definition);

  loadScript(definition.dataScript)
    .then(() => {
    loader.validateProjectView(window.CMATH_DATA, definition.projectId);
    loader.validateMathTextContent(window.CMATH_DATA, definition.mathTextFormat);
      return loadRuntimeScripts();
    })
    .catch((error) => fail(error.message));
})();
