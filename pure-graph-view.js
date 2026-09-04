(() => {
  "use strict";

  const root = document.querySelector("#pure-graph-reader");
  const canvasRoot = document.querySelector("#pure-graph-canvas");
  const inspector = document.querySelector("#pure-graph-inspector");
  const empty = document.querySelector("#pure-graph-empty");
  const errorBox = document.querySelector("#pure-graph-error");
  const errorMessage = document.querySelector("#pure-graph-error-message");
  const fileInput = document.querySelector("#pure-graph-file");
  const refreshButton = document.querySelector("#pure-graph-refresh");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/gu, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const renderMath = (value) => window.GammaMath?.render?.(value) ?? escapeHtml(value);
  const cssValue = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

  if (!root || !canvasRoot || !inspector || !window.GammaGraphCanvas
    || !window.CMathMapLibraryCore || !window.GammaMathMapProjectAdapter
    || !window.GammaCanonicalMathMapAdapter) {
    throw new Error("Pure Graph View dependencies are missing");
  }

  let model = null;
  let layout = { nodes: [], edges: [] };
  let nodeById = new Map();
  let currentSource = null;
  let canvas = null;

  function createCanvas() {
    return window.GammaGraphCanvas.create(canvasRoot, {
      visualSemantics: window.GammaMathMapVisualSemantics,
      palette: window.GammaMathMapVisualSemantics?.paletteFromCss?.(cssValue),
      labelMinScale: 1.75,
      nodeLabel: (node) => renderMath(node.title),
      onNodeClick: openInspector,
      onBackgroundClick: closeInspector,
    });
  }

  function visibleLayout(nextLayout) {
    const visibleIds = new Set(nextLayout.nodes
      .filter((node) => node.sourceLayer !== "external-import")
      .map((node) => node.id));
    return {
      nodes: nextLayout.nodes.filter((node) => visibleIds.has(node.id)),
      edges: nextLayout.edges.filter((edge) => visibleIds.has(typeof edge.source === "object" ? edge.source.id : edge.source)
        && visibleIds.has(typeof edge.target === "object" ? edge.target.id : edge.target)),
    };
  }

  function relationButtons(ids, emptyLabel) {
    const buttons = ids.map((id) => {
      const node = nodeById.get(id);
      return node ? `<button type="button" data-node-id="${escapeHtml(id)}">${renderMath(node.title)}</button>` : "";
    }).join("");
    return buttons || `<p>${escapeHtml(emptyLabel)}</p>`;
  }

  function sourceCopy(node) {
    const locator = node.source?.sourceImport?.locator
      ?? node.source?.sourceLocator
      ?? node.source?.sourceRef
      ?? node.evidence;
    return String(locator ?? "").trim();
  }

  function openInspector(id) {
    const node = nodeById.get(id);
    if (!node) return;
    const relations = model.relations(layout, id);
    const source = sourceCopy(node);
    canvas?.setSelected(id);
    inspector.innerHTML = `<header><div><span class="object-type">${escapeHtml(node.nodeKind === "inference" ? "Inference" : node.objectType ?? "Entry")}</span><h2>${renderMath(node.title)}</h2></div><button type="button" class="close-inspector" aria-label="关闭详情">×</button></header>
      <p>${renderMath(node.statement ?? node.argument ?? "")}</p>
      ${node.researchRelation ? `<h3>数学角色</h3><p>${renderMath(node.researchRelation)}</p>` : ""}
      <h3>直接前提</h3><div class="relation-list">${relationButtons(relations.previous, "没有直接前提")}</div>
      <h3>直接后续</h3><div class="relation-list">${relationButtons(relations.next, "没有直接后续")}</div>
      ${source ? `<h3>来源</h3><p class="source-copy">${renderMath(source)}</p>` : ""}`;
    inspector.hidden = false;
  }

  function closeInspector() {
    inspector.hidden = true;
    inspector.replaceChildren();
    canvas?.restoreOverview();
  }

  function project(data) {
    const result = data?.schema === "cmath.v521-paper-batch-result/v1" ? data.result : data;
    const map = window.CMathMapLibraryCore.generatedMapView(result);
    window.CMathMapLibraryCore.validateSupportedMap(map);
    return window.CMathMapLibraryCore.isCanonicalMathMap(map)
      ? window.GammaCanonicalMathMapAdapter.create(map)
      : window.GammaMathMapProjectAdapter.create(map, map.channelOptions?.adapterOptions ?? {});
  }

  async function showData(data, source) {
    model = project(data);
    const progress = model.progressBatches?.length ?? 0;
    layout = visibleLayout(model.layoutThrough(progress));
    nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
    if (!layout.nodes.length) throw new Error("JSON 中没有可显示的数学对象");
    closeInspector();
    canvas?.destroy();
    canvas = createCanvas();
    await canvas.setLayout(layout);
    currentSource = source;
    refreshButton.disabled = false;
    empty.hidden = true;
    errorBox.hidden = true;
    canvasRoot.focus();
  }

  function showError(error) {
    errorMessage.textContent = error?.message || "无法读取这份 JSON";
    errorBox.hidden = false;
    empty.hidden = true;
  }

  async function loadServerInput({ optional = false } = {}) {
    const response = await fetch("/api/pure-graph-input", { cache: "no-store" });
    if (optional && response.status === 404) return false;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `读取 JSON 失败：HTTP ${response.status}`);
    await showData(data, () => loadServerInput());
    return true;
  }

  async function loadFile(file) {
    if (!file) return;
    const read = async () => showData(JSON.parse(await file.text()), read);
    await read();
  }

  async function refresh() {
    if (!currentSource) return;
    refreshButton.disabled = true;
    try {
      await currentSource();
    } catch (error) {
      showError(error);
    } finally {
      refreshButton.disabled = false;
    }
  }

  function chooseFile() {
    fileInput.value = "";
    fileInput.click();
  }

  inspector.addEventListener("click", (event) => {
    const nodeButton = event.target.closest("[data-node-id]");
    if (nodeButton) openInspector(nodeButton.dataset.nodeId);
    if (event.target.closest(".close-inspector")) closeInspector();
  });
  refreshButton.addEventListener("click", refresh);
  document.querySelector("#pure-graph-choose").addEventListener("click", chooseFile);
  document.querySelector("[data-choose-json]").addEventListener("click", chooseFile);
  fileInput.addEventListener("change", () => loadFile(fileInput.files?.[0]).catch(showError));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !inspector.hidden) closeInspector();
  });
  ["dragenter", "dragover"].forEach((name) => root.addEventListener(name, (event) => {
    event.preventDefault();
  }));
  root.addEventListener("drop", (event) => {
    event.preventDefault();
    loadFile(event.dataTransfer?.files?.[0]).catch(showError);
  });

  loadServerInput({ optional: true }).catch(showError);
})();
