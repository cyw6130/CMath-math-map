(() => {
  "use strict";

  const model = window.GammaMathMapLabModel;
  if (window.GammaMathMapLabProjectionError) return;
  if (!model || !window.GammaGraphCanvas) throw new Error("Math map lab dependencies are missing");

  const controllerUrl = document.currentScript?.src || document.baseURI;
  const mathRenderingReady = (() => {
    if (window.GammaMathRendering?.ready) return window.GammaMathRendering.ready;
    if (window.GammaMath) return Promise.resolve(window.GammaMath);
    if (typeof URL !== "function" || !document.scripts || !document.head) {
      return Promise.resolve(null);
    }
    const src = new URL("math-rendering-loader.js", controllerUrl).href;
    const existing = [...document.scripts].find((script) => script.src === src);
    return new Promise((resolve) => {
      const script = existing || document.createElement("script");
      script.addEventListener("load", () => {
        Promise.resolve(window.GammaMathRendering?.ready).then(resolve, () => resolve(null));
      }, { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      if (!existing) {
        script.src = src;
        script.dataset.gammaMathCapability = "v1";
        document.head.appendChild(script);
      }
    });
  })();
  const completeLayoutWithReferences = model.layoutThrough(model.progressBatches.length);
  const externalReferenceNodes = completeLayoutWithReferences.nodes
    .filter((node) => node.sourceLayer === "external-import");
  const withoutExternalReferences = (layout) => {
    const visibleIds = new Set(layout.nodes
      .filter((node) => node.sourceLayer !== "external-import")
      .map((node) => node.id));
    return {
      nodes: layout.nodes.filter((node) => visibleIds.has(node.id)),
      edges: layout.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    };
  };
  const completeNodes = withoutExternalReferences(completeLayoutWithReferences).nodes;
  const byId = (id) => currentLayout.nodes.find((node) => node.id === id)
    ?? completeNodes.find((node) => node.id === id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const renderMath = (value) => window.GammaMath?.render
    ? window.GammaMath.render(value)
    : escapeHtml(value);
  const plainMath = (value) => window.GammaMath?.toPlainText ? window.GammaMath.toPlainText(value) : String(value ?? "");
  const setMathText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.innerHTML = renderMath(value);
  };
  const historyStack = [];
  const cssValue = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();
  const ensureLoopInspector = () => {
    let panel = document.querySelector("#loop-inspector");
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "loop-inspector";
    panel.className = "loop-inspector";
    panel.setAttribute("aria-label", "Loop 详情");
    panel.hidden = true;
    panel.innerHTML = '<header><span id="loop-display-label"></span><strong id="loop-status"></strong></header><h2 id="loop-action"></h2><h3>本轮影响</h3><p id="loop-effect"></p><h3>剩余缺口</h3><p id="loop-gap"></p><footer id="loop-delta"></footer>';
    document.querySelector(".math-map-main").appendChild(panel);
    return panel;
  };
  const loopInspector = ensureLoopInspector();
  const finalProgress = model.progressBatches.length;
  let currentLayout = model.layoutThrough(finalProgress);
  currentLayout = withoutExternalReferences(currentLayout);
  let inserting = false;
  const isolateFocusLens = window.CMATH_PROJECT_PRESENTATION?.channelOptions?.isolateFocusLens === true;
  const requestedInitialLens = document.body.dataset.lensState
    || window.CMATH_PROJECT_PRESENTATION?.channelOptions?.initialLens;
  const initialLens = ["global", "focus", "progress"].includes(requestedInitialLens) ? requestedInitialLens : "global";
  const state = {
    lens: initialLens,
    activeRouteId: model.routes[0].id,
    sectionId: "all",
    q: null,
    progressIndex: 0,
  };
  const externalReferenceTrigger = document.querySelector("#external-reference-inventory");
  const externalReferencePanel = document.querySelector("#external-reference-panel");
  if (isolateFocusLens && state.lens === "focus") {
    const initialIds = new Set(model.routeView(state.activeRouteId, currentLayout).nodeIds);
    currentLayout = {
      nodes: currentLayout.nodes.filter((node) => initialIds.has(node.id)),
      edges: currentLayout.edges.filter((edge) => initialIds.has(edge.source) && initialIds.has(edge.target)),
    };
  }

  const canvas = window.GammaGraphCanvas.create(document.querySelector("#math-map-canvas"), {
    visualSemantics: window.GammaMathMapVisualSemantics,
    palette: window.GammaMathMapVisualSemantics?.paletteFromCss(cssValue),
    nodeLabel: (node) => renderMath(node.title),
    onNodeClick: openInspector,
    onBackgroundClick: closeInspector,
  });

  function snapshot() {
    return {
      lens: state.lens,
      activeRouteId: state.activeRouteId,
      sectionId: state.sectionId,
      q: state.q,
      progressIndex: state.progressIndex,
    };
  }

  function remember() {
    const next = snapshot();
    if (JSON.stringify(historyStack.at(-1)) !== JSON.stringify(next)) historyStack.push(next);
    if (historyStack.length > 40) historyStack.shift();
  }

  function routeView(routeId = state.activeRouteId, layout = withoutExternalReferences(model.layoutThrough(finalProgress))) {
    return model.routeView(routeId, layout);
  }

  function claimStatesForView() {
    const count = state.lens === "progress" ? state.progressIndex : finalProgress;
    return typeof model.claimStatesThrough === "function" ? model.claimStatesThrough(count) : {};
  }

  function layoutForState(count) {
    let layout = state.lens === "progress" && typeof model.progressLayoutThrough === "function"
      ? model.progressLayoutThrough(count)
      : model.layoutThrough(count);
    if (state.lens === "focus" && isolateFocusLens) {
      const ids = new Set(routeView(state.activeRouteId, layout).nodeIds);
      if (state.q) model.neighborhood(layout, state.q).forEach((id) => ids.add(id));
      layout = {
        nodes: layout.nodes.filter((node) => ids.has(node.id)),
        edges: layout.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
      };
    }
    return withoutExternalReferences(layout);
  }

  async function syncLayoutForState() {
    const count = state.lens === "progress" ? state.progressIndex : finalProgress;
    const nextLayout = layoutForState(count);
    await canvas.setLayout(nextLayout);
    currentLayout = nextLayout;
  }

  function displayedClaimState(node) {
    return node?.isClaim ? claimStatesForView()[node.id] ?? node.claimState ?? node.status ?? "open" : null;
  }

  function objectInformationMarkup(node, relations) {
    if (!node.isClaim) return "";
    const stateLabel = displayedClaimState(node) === "established" ? "已建立" : "开放";
    const isB0 = Boolean(node.isBaseClaim || node.isFoundation || node.isClaimSeed);
    let basis = "尚无可用证明";
    if (isB0) {
      basis = "B₀ · 当前语境直接采用的基础 Claim";
    } else {
      const proofNames = relations.previous.map(byId)
        .filter((item) => item?.nodeKind === "inference" && item.operationKind === "proof")
        .map((item) => item.displayName ?? item.title);
      if (proofNames.length) basis = `图内证明：${proofNames.join("、")}`;
    }
    const basisMarkup = isB0 ? renderMath(node.researchRelation) : renderMath(basis);
    return `<h3>对象信息</h3><dl class="object-information"><div><dt>数学状态</dt><dd>${stateLabel}</dd></div><div><dt>建立依据</dt><dd>${basisMarkup}</dd></div></dl>`;
  }

  function governanceMarkup(node) {
    const source = node?.source;
    if (!source) return "";
    const sections = [];
    if (source.openDisposition) {
      sections.push(`<h3>开放角色</h3><p><strong>${escapeHtml(source.openDisposition.label)}</strong> · 当前 formal Entry 尚未进入 established 闭包。</p>`);
    }
    if (source.governanceState) {
      sections.push(`<h3>治理状态</h3><p>${escapeHtml(source.governanceLabel ?? source.governanceState)}</p>`);
      const review = source.latestReview;
      if (review) {
        const blocker = review.decisionNote ?? review.bodyMarkdown;
        const decidedAt = review.decidedAt ? `<div><dt>时间</dt><dd>${escapeHtml(review.decidedAt)}</dd></div>` : "";
        const blockerMarkup = blocker
          ? `<p>${escapeHtml(blocker).replace(/\n/g, "<br>")}</p>`
          : "<p>该 Review 未记录 blocker 文本。</p>";
        sections.push(`<details class="governance-review"><summary>最新 Review blocker</summary><dl><div><dt>Decision</dt><dd>${escapeHtml(review.decision)}</dd></div>${decidedAt}<div><dt>Review</dt><dd><code>${escapeHtml(review.id)}</code></dd></div></dl>${blockerMarkup}</details>`);
      }
    }
    return sections.join("");
  }

  function sourceLineageMarkup(node) {
    const lineage = node?.source?.sourceLineage;
    if (lineage?.kind !== "promoted_candidate") return "";
    const reviewCount = lineage.acceptedReviewIds?.length ?? 0;
    const loop = lineage.sourceLoopLabel ? `，来源 ${lineage.sourceLoopLabel}` : "";
    const auditRows = [
      `<div><dt>Candidate</dt><dd><code>${escapeHtml(lineage.candidateId)}</code></dd></div>`,
      ...(lineage.acceptedReviewIds ?? []).map((id) => `<div><dt>Accepted Review</dt><dd><code>${escapeHtml(id)}</code></dd></div>`),
      lineage.sourceLoopId ? `<div><dt>Source Loop</dt><dd><code>${escapeHtml(lineage.sourceLoopId)}</code></dd></div>` : "",
      `<div><dt>Formal Entry</dt><dd><code>${escapeHtml(node.id)}</code></dd></div>`,
    ].filter(Boolean).join("");
    return `<h3>转正来源</h3><p>本节点已折叠原候选「${escapeHtml(lineage.candidateTitle)}」，经 ${reviewCount} 条 accepted Review 转为当前正式 Entry${escapeHtml(loop)}。该转正不等于进入 established 闭包。</p><details class="source-lineage"><summary>展开审计标识</summary><dl>${auditRows}</dl></details>`;
  }

  function activeFocusEntryId() {
    if (state.lens === "focus") return routeView().currentGoalId;
    if (state.lens === "progress" && state.progressIndex) {
      const batch = model.progressBatches[state.progressIndex - 1];
      return batch?.focusEntryId ?? batch?.targetEntryId ?? null;
    }
    return null;
  }

  function presentationLayout() {
    const claimStates = claimStatesForView();
    const activeTargetId = activeFocusEntryId();
    return {
      nodes: currentLayout.nodes.map((node) => {
        const claimState = node.isClaim ? claimStates[node.id] ?? node.claimState ?? node.status ?? "open" : node.claimState;
        return {
          ...node,
          claimState,
          status: node.isClaim ? claimState : node.status,
          isActiveTarget: node.id === activeTargetId,
        };
      }),
      edges: currentLayout.edges,
    };
  }

  function setContext(title, copy) {
    document.querySelector("#math-map-context").innerHTML = `<strong>${renderMath(title)}</strong><span>${renderMath(copy)}</span>`;
  }

  function applySearch() {
    const query = document.querySelector("#math-map-search").value.trim().toLocaleLowerCase();
    if (!query) {
      canvas.setDimmed(null);
      return;
    }
    const matches = currentLayout.nodes.filter((node) => plainMath(`${node.displayName} ${node.title} ${node.statement} ${node.objectType}`).toLocaleLowerCase().includes(query)).map((node) => node.id);
    canvas.setDimmed(matches);
  }

  function updateChrome() {
    document.body.dataset.lensState = state.lens;
    document.querySelectorAll("[data-lens]").forEach((button) => {
      const active = button.dataset.lens === state.lens;
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelector("#math-map-section").value = state.sectionId;
    document.querySelector("#route-switcher").hidden = state.lens !== "focus";
    document.querySelector("#progress-timeline").hidden = state.lens !== "progress";
    document.querySelector("#math-map-back").disabled = historyStack.length === 0;
    const activeView = routeView();
    setMathText("#final-goal-title", byId(activeView.finalGoalId)?.title ?? activeView.finalGoalId);
    setMathText("#milestone-title", byId(activeView.milestoneId)?.title ?? activeView.milestoneId);
    setMathText("#route-summary", activeView.summary);
    document.querySelector("#route-options").innerHTML = model.routes.map((route) => {
      const view = routeView(route.id);
      const target = byId(view.currentGoalId);
      const latestLoop = model.loops.find((loop) => loop.id === view.loopIds.at(-1));
      const active = route.id === state.activeRouteId;
      return `<button type="button" data-route="${escapeHtml(route.id)}" class="${active ? "is-active" : ""}" ${active ? 'aria-current="true"' : ""}><span>${renderMath(route.label)}</span><strong>${renderMath(target?.title ?? view.currentGoalId)}</strong><small>${renderMath(`${view.loopIds.length} 次近期${model.temporalUnitLabel ?? "Loop"}${latestLoop ? ` · ${latestLoop.title}` : ""}`)}</small></button>`;
    }).join("");
    updateProgressChrome();
  }

  function updateProgressChrome() {
    const batch = state.progressIndex ? model.progressBatches[state.progressIndex - 1] : null;
    document.querySelector("#progress-position").textContent = batch ? `${batch.displayLabel} · ${state.progressIndex}/${model.progressBatches.length}` : `基线 · 0/${model.progressBatches.length}`;
    setMathText("#progress-title", batch?.action ?? "尚未加入新的研究子图");
    setMathText("#progress-summary", batch?.effect ?? "向前推进会把下一轮增量加入同一张图。");
    document.querySelector("#progress-previous").disabled = state.progressIndex === 0 || inserting;
    document.querySelector("#progress-next").disabled = state.progressIndex >= model.progressBatches.length || inserting;
    loopInspector.hidden = state.lens !== "progress" || !batch;
    if (batch) {
      document.querySelector("#loop-display-label").textContent = batch.displayLabel;
      document.querySelector("#loop-status").textContent = batch.statusLabel;
      setMathText("#loop-action", batch.action);
      setMathText("#loop-effect", batch.effect);
      setMathText("#loop-gap", batch.remainingGap);
      document.querySelector("#loop-delta").textContent = batch.mathematicalDeltaApplied
        ? `数学增量：${batch.deltaEntryIds.length} 个 Entry，${batch.deltaInferenceIds.length} 个 Inference`
        : "本事件没有改变数学图。";
    }
  }

  function focusIdsForState() {
    if (state.lens === "focus") {
      const ids = new Set(routeView().nodeIds);
      if (state.q) model.neighborhood(currentLayout, state.q).forEach((id) => ids.add(id));
      return [...ids];
    }
    if (state.lens === "progress" && state.progressIndex) return model.presentIds(currentLayout, model.progressBatches[state.progressIndex - 1].focusIds);
    if (state.lens === "global" && state.sectionId !== "all") {
      const section = model.sections.find((item) => item.id === state.sectionId);
      return section ? model.presentIds(currentLayout, section.nodeIds) : [];
    }
    return [];
  }

  function applyLens(duration = 320) {
    void canvas.setLayout(presentationLayout(), { styleOnly: true, duration: Math.min(duration, 180) });
    const focusIds = focusIdsForState();
    if (focusIds.length) canvas.focusSubgraph(focusIds, { duration });
    else canvas.showOverview(duration);
    canvas.setSelected(state.q);
    applySearch();
    updateChrome();

    if (state.lens === "focus") {
      const view = routeView();
      const target = byId(view.currentGoalId);
      const browsing = state.q && state.q !== view.currentGoalId ? ` · 浏览焦点 q：${byId(state.q)?.title ?? state.q}` : "";
      setContext(`${view.label} · ${target?.title ?? view.currentGoalId}`, `${view.summary}${browsing}`);
    } else if (state.lens === "progress") {
      const batch = state.progressIndex ? model.progressBatches[state.progressIndex - 1] : null;
      setContext(batch?.title ?? "进展基线", batch?.summary ?? "下一轮会把新增子图加入同一张图。");
    } else if (state.sectionId !== "all") {
      const section = model.sections.find((item) => item.id === state.sectionId);
      setContext(section?.label ?? "Section", "Section 作为子图进入焦点，图外对象仍保留为语境。");
    } else {
      setContext("当前状态", "完整项目数学图显示当前结果与证明关系；外部参考资料独立保存。");
    }
  }

  async function switchLens(lens) {
    if (state.lens === lens || inserting) return;
    remember();
    state.lens = lens;
    state.sectionId = lens === "global" ? state.sectionId : "all";
    if (lens === "focus" && !state.q) state.q = routeView().currentGoalId;
    if (lens === "progress" && state.progressIndex === 0 && model.progressBatches.length) state.progressIndex = 1;
    await syncLayoutForState();
    applyLens();
  }

  async function switchRoute(routeId) {
    if ((state.activeRouteId === routeId && state.lens === "focus") || inserting) return;
    remember();
    state.lens = "focus";
    state.sectionId = "all";
    state.activeRouteId = routeId;
    state.q = routeView(routeId).currentGoalId;
    await syncLayoutForState();
    applyLens();
  }

  async function switchSection(sectionId) {
    if (inserting) return;
    remember();
    state.lens = "global";
    state.sectionId = sectionId;
    state.q = null;
    closeInspector();
    await syncLayoutForState();
    applyLens();
  }

  function openInspector(id) {
    const node = byId(id);
    if (!node) return;
    closeExternalReferencePanel(false);
    state.q = id;
    canvas.setSelected(id);
    const relations = model.relations(currentLayout, id);
    const relationButtons = (ids, empty) => ids.map((relatedId) => {
      const related = byId(relatedId);
      return related ? `<button type="button" data-inspect-node="${escapeHtml(related.id)}">${renderMath(related.title)}</button>` : "";
    }).join("") || `<p>${escapeHtml(empty)}</p>`;
    const panel = document.querySelector("#math-map-inspector");
    const evidenceLabel = node.isClaim
      ? (node.isBaseClaim || node.isFoundation || node.isClaimSeed ? "查看来源" : "查看证明")
      : "查看证据";
    panel.innerHTML = `<header><div><span class="object-type">${renderMath(node.displayName ?? node.title)}</span><h2>${renderMath(node.title)}</h2></div><button class="close-inspector" type="button" data-close-inspector aria-label="关闭详情">×</button></header><p>${renderMath(node.statement)}</p>${objectInformationMarkup(node, relations)}${governanceMarkup(node)}${sourceLineageMarkup(node)}<h3>直接前提</h3><div class="relation-list">${relationButtons(relations.previous, "没有直接前提")}</div><h3>直接后续</h3><div class="relation-list">${relationButtons(relations.next, "没有直接后续")}</div><h3>证据与来源</h3><div class="inspector-actions"><button type="button" data-show-evidence="${escapeHtml(id)}">${evidenceLabel}</button><button type="button" data-focus-object="${escapeHtml(id)}">聚焦于此</button></div>`;
    panel.hidden = false;
  }

  function closeInspector() {
    document.querySelector("#math-map-inspector").hidden = true;
    canvas.setSelected(state.lens === "focus" ? state.q : null);
  }

  function renderExternalReferenceInventory() {
    const count = document.querySelector("#external-reference-count");
    const summary = document.querySelector("#external-reference-summary");
    const list = document.querySelector("#external-reference-list");
    if (!externalReferenceTrigger || !externalReferencePanel || !count || !summary || !list) return;
    count.textContent = String(externalReferenceNodes.length);
    summary.textContent = `共保存 ${externalReferenceNodes.length} 条外部资料。它们不作为证明节点展示；与项目结果的继承关系仍待逐项核对。`;
    list.innerHTML = externalReferenceNodes.map((node) => {
      const sourceImport = node.source?.sourceImport;
      const sourceLabel = sourceImport?.locator ?? node.evidence ?? "来源已保存";
      return `<li data-external-reference-id="${escapeHtml(node.id)}"><div><span>关系待整理</span><strong>${renderMath(node.title)}</strong></div><small>${escapeHtml(sourceLabel)}</small></li>`;
    }).join("");
  }

  function openExternalReferencePanel() {
    if (!externalReferenceTrigger || !externalReferencePanel) return;
    closeInspector();
    externalReferencePanel.hidden = false;
    externalReferenceTrigger.setAttribute("aria-expanded", "true");
    document.querySelector("#close-external-reference-panel").focus?.();
  }

  function closeExternalReferencePanel(restoreFocus = true) {
    if (!externalReferenceTrigger || !externalReferencePanel) return;
    externalReferencePanel.hidden = true;
    externalReferenceTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) externalReferenceTrigger.focus?.();
  }

  async function focusObject(id) {
    if (inserting) return;
    remember();
    state.q = id;
    state.lens = "focus";
    state.sectionId = "all";
    await syncLayoutForState();
    applyLens();
    openInspector(id);
  }

  function showEvidence(id) {
    const node = byId(id);
    if (!node) return;
    setMathText("#evidence-title", node.title);
    setMathText("#evidence-copy", node.evidence);
    document.querySelector("#math-map-evidence").hidden = false;
  }

  async function moveProgress(step) {
    if (inserting) return;
    const target = state.progressIndex + step;
    if (target < 0 || target > model.progressBatches.length) return;
    remember();
    state.lens = "progress";
    state.sectionId = "all";
    inserting = true;
    updateProgressChrome();
    const nextLayout = withoutExternalReferences(typeof model.progressLayoutThrough === "function"
      ? model.progressLayoutThrough(target)
      : model.layoutThrough(target));
    try {
      if (target > state.progressIndex) {
        const batch = model.progressBatches[target - 1];
        await canvas.insertAndFocusSubgraph(nextLayout, {
          enteringIds: model.presentIds(nextLayout, batch.nodes.map((node) => node.id)),
          focusIds: model.presentIds(nextLayout, batch.focusIds),
          anchorIds: model.presentIds(nextLayout, batch.anchorIds),
          duration: 180,
        });
      } else await canvas.setLayout(nextLayout);
      currentLayout = nextLayout;
      state.progressIndex = target;
    } finally {
      inserting = false;
    }
    state.q = null;
    closeInspector();
    applyLens(220);
  }

  async function restorePrevious() {
    if (inserting) return;
    const previous = historyStack.pop();
    if (!previous) return;
    Object.assign(state, previous);
    closeInspector();
    await syncLayoutForState();
    applyLens();
  }

  async function returnToOverview() {
    if (inserting) return;
    remember();
    Object.assign(state, { lens: "global", sectionId: "all", q: null });
    closeInspector();
    await syncLayoutForState();
    canvas.restoreOverview(320);
    void canvas.setLayout(presentationLayout(), { styleOnly: true, duration: 180 });
    applySearch();
    updateChrome();
    setContext("当前状态", "完整数学图显示项目此刻已经达到的状态。");
  }

  renderExternalReferenceInventory();
  document.querySelectorAll("[data-lens]").forEach((button) => button.addEventListener("click", () => switchLens(button.dataset.lens)));
  document.querySelector("#route-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-route]");
    if (button) switchRoute(button.dataset.route);
  });
  document.querySelector("#math-map-section").addEventListener("change", (event) => switchSection(event.target.value));
  document.querySelector("#math-map-search").addEventListener("input", applySearch);
  externalReferenceTrigger?.addEventListener("click", openExternalReferencePanel);
  document.querySelector("#close-external-reference-panel")?.addEventListener("click", () => closeExternalReferencePanel());
  document.querySelector("#math-map-back").addEventListener("click", restorePrevious);
  document.querySelector("#math-map-overview").addEventListener("click", returnToOverview);
  document.querySelector("#progress-previous").addEventListener("click", () => moveProgress(-1));
  document.querySelector("#progress-next").addEventListener("click", () => moveProgress(1));
  document.querySelector("#close-evidence").addEventListener("click", () => { document.querySelector("#math-map-evidence").hidden = true; });
  document.querySelector("#math-map-inspector").addEventListener("click", (event) => {
    const inspect = event.target.closest("[data-inspect-node]");
    const focus = event.target.closest("[data-focus-object]");
    const evidence = event.target.closest("[data-show-evidence]");
    if (event.target.closest("[data-close-inspector]")) closeInspector();
    else if (inspect) openInspector(inspect.dataset.inspectNode);
    else if (focus) focusObject(focus.dataset.focusObject);
    else if (evidence) showEvidence(evidence.dataset.showEvidence);
  });
  window.addEventListener("resize", () => requestAnimationFrame(() => { canvas.resize(); applyLens(180); }));

  canvas.setLayout(currentLayout).then(() => applyLens(0));
})();
