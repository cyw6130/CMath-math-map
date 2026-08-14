/* Persistent ForceGraph stage for Gamma.
   One renderer instance owns the whole lifetime of the canvas. Layout changes
   reuse node objects and coordinates; graph actions change emphasis, camera,
   or topology without replacing the canvas. */
(() => {
  "use strict";

  if (typeof window === "undefined") return;

  const graphContract = window.GammaGraphContract;
  if (!graphContract) throw new Error("GammaGraphContract must load before GammaGraphCanvas");

  const DEFAULT_PALETTE = {
    background: "#0C1220",
    entryFill: "#D9A83F",
    entryStroke: "#E6EDF5",
    entryTitle: "#E6EDF5",
    factFill: "#8E9AAA",
    factStroke: "#D8DEE7",
    claimOpenFill: "#0C1220",
    claimOpenStroke: "#E58BA7",
    claimOpenTitle: "#F0A8BC",
    claimEstablishedFill: "#67CDB0",
    claimEstablishedStroke: "#E5F8F1",
    claimEstablishedTitle: "#91E0C9",
    inferenceFill: "#A793F0",
    inferenceStroke: "#D6CCFF",
    inferenceTitle: "#D6CCFF",
    foundationStroke: "#070A10",
    focusHalo: "rgba(117,174,235,.5)",
    focusTitle: "#A9CDF5",
    hubStroke: "#E6EDF5",
    premiseStroke: "rgba(141,160,184,.55)",
    conclusionStroke: "#7FA8D9",
  };

  const KIND_COLORS = {
    convention: "#8DA0B8",
    definition: "#7FA8D9",
    assumption: "#C6A15B",
    proposition: "#D9A83F",
    theorem: "#7FA8D9",
    computation: "#69CDB2",
    counterexample: "#E08A5F",
    open_problem: "#E08AA5",
  };

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const endpointId = (value) => typeof value === "object" ? value?.id : value;
  const edgeKey = (edge) => `${endpointId(edge.source)}>${endpointId(edge.target)}:${edge.relation ?? "edge"}`;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  // Stable seeds give the force simulation an organic starting cloud without
  // making the map jump to a different shape after every reload.
  function hashUnit(value, salt = 0) {
    let hash = 2166136261 ^ salt;
    for (const char of String(value ?? "")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  function organicPlacement(node, index, count, spread = 1) {
    const angle = hashUnit(node.id, 17) * Math.PI * 2;
    const radius = (54 + Math.sqrt((index + 0.7) / Math.max(1, count)) * 260) * spread;
    const wobble = (hashUnit(node.id, 73) - 0.5) * 76 * spread;
    return {
      x: Math.cos(angle) * (radius + wobble),
      y: Math.sin(angle) * (radius - wobble * 0.45),
    };
  }

  function mixedHashUnit(value, salt) {
    let hash = Math.floor(hashUnit(value, salt) * 4294967295) >>> 0;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967295;
  }

  function localRandomPlacement(node, anchor) {
    const angle = mixedHashUnit(node.id, 131) * Math.PI * 2;
    const radius = 12 + mixedHashUnit(node.id, 197) * 42;
    return {
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius,
    };
  }

  function colorWithAlpha(color, alpha) {
    const value = String(color ?? "");
    const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
    if (hex) return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;
    const rgb = value.match(/^rgba?\(([^)]+)\)$/i)?.[1]?.split(",").slice(0, 3).map((part) => part.trim());
    return rgb?.length === 3 ? `rgba(${rgb.join(",")},${alpha})` : value;
  }

  function create(container, options = {}) {
    const onNodeClick = typeof options.onNodeClick === "function" ? options.onNodeClick : () => {};
    const onBackgroundClick = typeof options.onBackgroundClick === "function" ? options.onBackgroundClick : () => {};
    const nodeLabel = typeof options.nodeLabel === "function"
      ? options.nodeLabel
      : (node) => `<strong>${node.nodeKind === "entry" ? "Entry" : "Inference"}</strong><br>${window.GammaMath?.render(node.title) ?? node.title}`;
    const visualSemantics = options.visualSemantics;
    const classifyNode = (node) => visualSemantics?.classifyNode?.(node) ?? {
      isInference: node.nodeKind === "inference",
      isFact: Boolean(node.isFact),
      isClaim: Boolean(node.isClaim),
      isFoundation: Boolean(node.isFoundation || node.isClaimSeed),
      isFocused: Boolean(node.isActiveTarget),
      operationKind: node.nodeKind === "inference" && node.operationKind === "organization" ? "organization" : "proof",
    };
    let palette = { ...DEFAULT_PALETTE, ...(visualSemantics?.DEFAULT_PALETTE ?? {}), ...(options.palette ?? {}) };
    const labelMinScale = Number.isFinite(options.labelMinScale) ? options.labelMinScale : 2.4;
    const spreadScale = Number.isFinite(options.spread) ? options.spread : 1;
    const forceOptions = {
      chargeStrength: -190,
      chargeDistanceMax: 520,
      linkDistance: 70,
      linkStrength: 0.85,
      ...(options.forces ?? {}),
    };
    let graph = null;
    let layout = { nodes: [], edges: [] };
    let selectedId = null;
    let filterOpacityIds = null;
    let focusOpacityIds = null;
    let destroyed = false;
    let initialFitPending = true;
    let dragActive = false;
    let dragRelaxing = false;
    let resizeObserver = null;
    let transitionFrame = null;
    let rendererGeneration = 0;
    let engineStopWaiters = [];

    container.innerHTML = "";
    const host = document.createElement("div");
    host.className = "alpha-force-graph-host";
    host.setAttribute("aria-hidden", "true");
    container.appendChild(host);

    const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionDuration = (duration) => reduceMotion() ? 0 : duration;

    const nodeBaseColor = (node) => node.nodeKind === "inference"
      ? palette.inferenceFill
      : node.isFact ? palette.factFill
        : KIND_COLORS[node.entryKind] ?? palette.entryFill;

    const legacyClaimEstablishedProgress = (node) => clamp(Number.isFinite(node.claimVisualEstablished)
      ? node.claimVisualEstablished
      : (node.claimState ?? node.status) === "established" ? 1 : 0, 0, 1);
    const claimEstablishedProgress = (node) => visualSemantics?.claimEstablishedProgress?.(node) ?? legacyClaimEstablishedProgress(node);

    const visibleAlpha = (node) => {
      let alpha = 1;
      if (filterOpacityIds && !filterOpacityIds.has(node.id)) alpha *= 0.16;
      if (focusOpacityIds && !focusOpacityIds.has(node.id)) alpha *= 0.14;
      return alpha * (node.enterProgress ?? 1);
    };

    const shortLabel = (value, limit = 18) => {
      const chars = Array.from(String(value ?? "").trim());
      return chars.length > limit ? `${chars.slice(0, limit).join("")}…` : chars.join("");
    };

    const repaint = () => {
      if (!graph) return;
      if (typeof graph.refresh === "function") graph.refresh();
      else graph.nodeCanvasObject(graph.nodeCanvasObject());
    };

    const paintNode = (node, context, scale) => {
      const visual = classifyNode(node);
      const safeScale = Math.max(scale, 0.1);
      const alpha = visibleAlpha(node);
      const selected = node.id === selectedId;
      const progress = node.enterProgress ?? 1;
      const sizeProgress = 0.32 + 0.68 * progress;
      const hubScale = node.isUnderstandingHub ? 1.6 : 1;
      const radiusPx = (visual.isInference ? 5.5 : visual.isFact ? 6.25 : visual.isClaim ? 8.25 : 7.5) * sizeProgress * hubScale;
      const radius = radiusPx / safeScale;
      context.save();
      context.globalAlpha = alpha;

      if (visual.isFocused) {
        context.beginPath();
        context.arc(node.x, node.y, (radiusPx + 10) / safeScale, 0, Math.PI * 2);
        context.strokeStyle = palette.focusHalo;
        context.lineWidth = 5 / safeScale;
        context.shadowColor = palette.focusHalo;
        context.shadowBlur = 12 / safeScale;
        context.stroke();
        context.shadowBlur = 0;
      }

      if (!visual.isInference && visual.isFoundation) {
        context.beginPath();
        context.arc(node.x, node.y, (radiusPx + 4) / safeScale, 0, Math.PI * 2);
        context.strokeStyle = palette.foundationStroke;
        context.lineWidth = 3 / safeScale;
        context.stroke();
      }

      if (node.isUnderstandingHub) {
        const endpointStroke = node.hubEndpointRole === "end" ? palette.conclusionStroke
          : node.hubEndpointRole === "start" ? palette.entryStroke
            : palette.hubStroke;
        context.beginPath();
        context.arc(node.x, node.y, (radiusPx + 5) / safeScale, 0, Math.PI * 2);
        context.strokeStyle = endpointStroke;
        context.lineWidth = (node.hubEndpointRole ? 2.4 : 1.6) / safeScale;
        context.stroke();
      }

      if (selected) {
        context.beginPath();
        context.arc(node.x, node.y, (radiusPx + 7) / safeScale, 0, Math.PI * 2);
        context.strokeStyle = "rgba(255,255,255,.94)";
        context.lineWidth = 1.8 / safeScale;
        context.stroke();
      }

      context.beginPath();
      if (visual.isInference) {
        context.moveTo(node.x, node.y - radius);
        context.lineTo(node.x + radius, node.y);
        context.lineTo(node.x, node.y + radius);
        context.lineTo(node.x - radius, node.y);
        context.closePath();
      } else {
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      }
      if (visual.isClaim) {
        context.fillStyle = palette.claimOpenFill || palette.background;
        context.fill();
        context.strokeStyle = palette.claimOpenStroke;
        context.lineWidth = 1.8 / safeScale;
        context.stroke();

        const establishedProgress = claimEstablishedProgress(node);
        if (establishedProgress > 0) {
          context.save();
          context.globalAlpha = alpha * establishedProgress;
          context.beginPath();
          context.arc(node.x, node.y, radius, 0, Math.PI * 2);
          context.fillStyle = palette.claimEstablishedFill;
          context.fill();
          context.strokeStyle = palette.claimEstablishedStroke;
          context.lineWidth = 1.5 / safeScale;
          context.stroke();
          context.restore();
        }
      } else {
        const organization = visual.isInference && visual.operationKind === "organization";
        context.fillStyle = organization ? palette.background : nodeBaseColor(node);
        context.fill();
        context.strokeStyle = visual.isInference ? palette.inferenceStroke : visual.isFact ? palette.factStroke : palette.entryStroke;
        context.lineWidth = (organization ? 1.6 : 1.2) / safeScale;
        context.stroke();
      }

      if (visual.isFocused && scale >= 1.25 && progress > 0.72) {
        const focusFontSize = clamp(9 / Math.sqrt(scale), 7, 10);
        context.font = `800 ${focusFontSize}px "Avenir Next","PingFang SC",system-ui,sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillStyle = palette.focusTitle;
        context.fillText("当前聚焦", node.x, node.y - (radiusPx + 9) / safeScale);
      }

      if (node.hubEndpointRole && progress > 0.72) {
        const endpointLabel = node.hubEndpointRole === "start" ? "起点" : node.hubEndpointRole === "end" ? "终点" : "根节点";
        const endpointFontSize = clamp(9 / Math.sqrt(scale), 7, 10);
        context.font = `800 ${endpointFontSize}px "Avenir Next","PingFang SC",system-ui,sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillStyle = node.hubEndpointRole === "end" ? palette.conclusionStroke : palette.hubStroke;
        context.fillText(endpointLabel, node.x, node.y - (radiusPx + 8) / safeScale);
      }

      if ((scale >= labelMinScale || selected || node.isUnderstandingHub) && progress > 0.72) {
        const visibleName = node.displayName ?? node.title;
        const text = shortLabel(window.GammaMath?.toPlainText(visibleName) ?? visibleName);
        const fontSize = clamp(11 / Math.sqrt(scale), 8, 13);
        context.font = `${node.nodeKind === "inference" ? 700 : 600} ${fontSize}px "Avenir Next","PingFang SC",system-ui,sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "top";
        context.lineJoin = "round";
        context.lineWidth = 4 / safeScale;
        context.strokeStyle = palette.background;
        context.strokeText(text, node.x, node.y + (radiusPx + 5) / safeScale);
        context.fillStyle = node.nodeKind === "inference"
          ? palette.inferenceTitle
          : node.isClaim ? (claimEstablishedProgress(node) >= 0.5 ? palette.claimEstablishedTitle : palette.claimOpenTitle)
            : palette.entryTitle;
        context.fillText(text, node.x, node.y + (radiusPx + 5) / safeScale);
      }
      context.restore();
    };

    const fit = (duration = 360, ids = null, padding = 86) => {
      if (!graph || !graph.graphData().nodes.length) return;
      const framedIds = ids ? new Set(ids) : null;
      const framedNodes = framedIds ? graph.graphData().nodes.filter((node) => framedIds.has(node.id)) : graph.graphData().nodes;
      const actualDuration = motionDuration(duration);
      if (framedNodes.length === 1) {
        const node = framedNodes[0];
        graph.centerAt(node.x ?? 0, node.y ?? 0, actualDuration);
        graph.zoom(Math.max(1.7, graph.zoom()), actualDuration);
        return;
      }
      graph.zoomToFit(actualDuration, padding, framedIds ? (node) => framedIds.has(node.id) : undefined);
    };

    const resize = () => {
      if (!graph || destroyed) return;
      const bounds = container.getBoundingClientRect();
      if (bounds.width < 40 || bounds.height < 40) return;
      graph.width(Math.max(320, bounds.width)).height(Math.max(420, bounds.height));
    };

    const beginDragRelaxation = () => {
      if (!graph || destroyed || dragActive) return;
      dragActive = true;
      dragRelaxing = false;
      graph.cooldownTicks(reduceMotion() ? 36 : 72);
      graph.resumeAnimation();
      graph.d3ReheatSimulation();
    };

    const endDragRelaxation = () => {
      if (!graph || destroyed) return;
      dragActive = false;
      dragRelaxing = true;
      graph.cooldownTicks(reduceMotion() ? 48 : 110);
      graph.resumeAnimation();
      graph.d3ReheatSimulation();
    };

    const ensureGraph = () => {
      if (graph || destroyed) return graph;
      if (typeof window.ForceGraph !== "function") {
        host.innerHTML = '<p class="graph-load-error">图组件未加载，请检查本地 force-graph 资源。</p>';
        return null;
      }
      graph = window.ForceGraph()(host)
        .graphData({ nodes: [], links: [] })
        .backgroundColor(palette.background)
        .nodeId("id")
        .nodeVal((node) => node.isUnderstandingHub ? 18 : node.isClaim ? 10 : node.isFact ? 6 : node.nodeKind === "entry" ? 8 : 5)
        .nodeLabel(nodeLabel)
        .nodeCanvasObjectMode(() => "replace")
        .nodeCanvasObject(paintNode)
        .linkColor((link) => colorWithAlpha(link.relation === "conclusion" ? palette.conclusionStroke : palette.premiseStroke, Math.max(0.04, link.enterProgress ?? 1)))
        .linkWidth((link) => (link.relation === "conclusion" ? 1.5 : 1) * Math.max(0.05, link.enterProgress ?? 1))
        .linkDirectionalArrowLength((link) => (link.relation === "conclusion" ? 5 : 3) * (link.enterProgress ?? 1))
        .linkDirectionalArrowRelPos(0.74)
        .linkDirectionalArrowColor((link) => colorWithAlpha(link.relation === "conclusion" ? palette.conclusionStroke : palette.premiseStroke, Math.max(0.04, link.enterProgress ?? 1)))
        .warmupTicks(reduceMotion() ? 220 : 150)
        // Every topology update is arranged off-screen during warmup. There is
        // no visible force-simulation phase after the settled frame appears.
        .cooldownTicks(0)
        .onNodeDrag(beginDragRelaxation)
        .onNodeDragEnd(endDragRelaxation)
        .onNodeClick((node) => onNodeClick(node.id))
        .onBackgroundClick(onBackgroundClick)
        .onEngineStop(() => {
          if (dragRelaxing) {
            dragRelaxing = false;
            graph.cooldownTicks(0);
          }
          if (initialFitPending) {
            initialFitPending = false;
            if (selectedId) focusNode(selectedId, { duration: 0 });
            else if (focusOpacityIds?.size) fit(0, focusOpacityIds, 110);
            else fit(420);
          }
          const waiters = engineStopWaiters;
          engineStopWaiters = [];
          waiters.forEach((resolve) => resolve());
        });
      graph.d3Force("charge")?.strength(forceOptions.chargeStrength).distanceMax(forceOptions.chargeDistanceMax);
      graph.d3Force("link")?.distance(forceOptions.linkDistance).strength(forceOptions.linkStrength);
      rendererGeneration += 1;
      resize();
      return graph;
    };

    const waitForSettledLayout = () => new Promise((resolve) => {
      let settled = false;
      let fallback = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (fallback !== null) window.clearTimeout(fallback);
        engineStopWaiters = engineStopWaiters.filter((waiter) => waiter !== finish);
        resolve();
      };
      engineStopWaiters.push(finish);
      // Protect the UI if a browser suppresses engine-stop while backgrounded.
      fallback = window.setTimeout(finish, 320);
    });

    const runTransition = (duration, update) => new Promise((resolve) => {
      if (transitionFrame) cancelAnimationFrame(transitionFrame);
      const actualDuration = motionDuration(duration);
      if (!actualDuration) {
        update(1);
        repaint();
        resolve();
        return;
      }
      const start = performance.now();
      const tick = (now) => {
        const raw = Math.max(0, Math.min(1, (now - start) / actualDuration));
        update(easeOutCubic(raw));
        repaint();
        if (raw < 1 && !destroyed) transitionFrame = requestAnimationFrame(tick);
        else {
          transitionFrame = null;
          resolve();
        }
      };
      transitionFrame = requestAnimationFrame(tick);
    });

    const anchorPlacement = (rawNode, nextLayout, existingById, anchorIds) => {
      const explicit = (anchorIds ?? []).map((id) => existingById.get(id)).filter(Boolean);
      const connectedIds = (nextLayout.edges ?? []).flatMap((edge) => {
        const source = endpointId(edge.source);
        const target = endpointId(edge.target);
        if (source === rawNode.id && existingById.has(target)) return [target];
        if (target === rawNode.id && existingById.has(source)) return [source];
        return [];
      });
      const anchors = explicit.length ? explicit : connectedIds.map((id) => existingById.get(id)).filter(Boolean);
      if (!anchors.length) return { x: rawNode.x ?? 0, y: rawNode.y ?? 0 };
      return {
        x: anchors.reduce((sum, node) => sum + (node.x ?? 0), 0) / anchors.length,
        y: anchors.reduce((sum, node) => sum + (node.y ?? 0), 0) / anchors.length,
      };
    };

    const setLayout = async (nextLayout, action = {}) => {
      layout = graphContract.assertLayout(nextLayout ?? { nodes: [], edges: [] });
      if (!ensureGraph()) return;
      const previousData = graph.graphData();
      const existingById = new Map(previousData.nodes.map((node) => [node.id, node]));
      const previousLinks = new Map(previousData.links.map((link) => [edgeKey(link), link]));
      const claimTransitions = [];
      const updateNodePresentation = (existing, rawNode) => {
        ["isCandidate", "candidateVisual", "candidateStatus"].forEach((key) => delete existing[key]);
        const previousVisual = claimEstablishedProgress(existing);
        Object.assign(existing, {
          nodeKind: rawNode.nodeKind,
          entryClass: rawNode.entryClass,
          entryKind: rawNode.entryKind,
          factKind: rawNode.factKind,
          claimKind: rawNode.claimKind,
          operationKind: rawNode.operationKind,
          isFoundation: Boolean(rawNode.isFoundation),
          isFact: Boolean(rawNode.isFact),
          isClaim: Boolean(rawNode.isClaim),
          isClaimSeed: Boolean(rawNode.isClaimSeed),
          claimState: rawNode.claimState,
          status: rawNode.status,
          goalLevel: rawNode.goalLevel,
          isActiveTarget: Boolean(rawNode.isActiveTarget),
          isUnderstandingHub: Boolean(rawNode.isUnderstandingHub),
          hubEndpointRole: rawNode.hubEndpointRole ?? null,
          displayName: rawNode.displayName,
          title: rawNode.title,
          layer: rawNode.layer,
          lane: rawNode.lane,
          enterProgress: 1,
        });
        const targetVisual = existing.isClaim && (existing.claimState ?? existing.status) === "established" ? 1 : 0;
        existing.claimVisualEstablished = previousVisual;
        if (Math.abs(previousVisual - targetVisual) > 0.001) claimTransitions.push({ node: existing, start: previousVisual, target: targetVisual });
        else existing.claimVisualEstablished = targetVisual;
      };

      if (action.styleOnly) {
        layout.nodes.forEach((rawNode) => {
          const existing = existingById.get(rawNode.id);
          if (existing) updateNodePresentation(existing, rawNode);
        });
        if (claimTransitions.length) {
          await runTransition(action.duration ?? 180, (progress) => claimTransitions.forEach((transition) => {
            transition.node.claimVisualEstablished = transition.start + (transition.target - transition.start) * progress;
          }));
        } else repaint();
        return;
      }

      const requestedEntering = action.enteringIds ? new Set(action.enteringIds) : null;
      const enteringIds = new Set();
      const initialLoad = previousData.nodes.length === 0;
      const enteringRawNodes = initialLoad ? [] : layout.nodes.filter((node) => !existingById.has(node.id) && (!requestedEntering || requestedEntering.has(node.id)));
      const batchAnchor = enteringRawNodes.length ? anchorPlacement(enteringRawNodes[0], layout, existingById, action.anchorIds) : null;
      const enterSeeds = batchAnchor
        ? new Map(enteringRawNodes.map((node) => [node.id, localRandomPlacement(node, batchAnchor)]))
        : new Map();

      const nodes = layout.nodes.map((rawNode, index) => {
        const existing = existingById.get(rawNode.id);
        if (existing) {
          updateNodePresentation(existing, rawNode);
          if (!Number.isFinite(existing.x) || !Number.isFinite(existing.y)) {
            existing.x = rawNode.x ?? 0;
            existing.y = rawNode.y ?? 0;
          }
          // Reuse the same object and its current coordinates as the next
          // simulation seed, but release it so the full graph can make room.
          delete existing.fx;
          delete existing.fy;
          return existing;
        }
        const seed = organicPlacement(rawNode, index, layout.nodes.length, spreadScale);
        const isEntering = !initialLoad && (!requestedEntering || requestedEntering.has(rawNode.id));
        const target = isEntering ? enterSeeds.get(rawNode.id) ?? batchAnchor : seed;
        const node = {
          ...Object.fromEntries(Object.entries(rawNode).filter(([key]) => !["isCandidate", "candidateVisual", "candidateStatus"].includes(key))),
          x: target.x,
          y: target.y,
          enterProgress: isEntering ? 0 : 1,
          claimVisualEstablished: rawNode.isClaim && (rawNode.claimState ?? rawNode.status) === "established" ? 1 : 0,
        };
        if (isEntering) {
          enteringIds.add(node.id);
        }
        return node;
      });

      const nodeIds = new Set(nodes.map((node) => node.id));
      const links = (layout.edges ?? []).filter((edge) => nodeIds.has(endpointId(edge.source)) && nodeIds.has(endpointId(edge.target))).map((rawEdge) => {
        const normalized = { ...rawEdge, source: endpointId(rawEdge.source), target: endpointId(rawEdge.target) };
        const existing = previousLinks.get(edgeKey(normalized));
        if (existing) {
          Object.assign(existing, normalized, { enterProgress: 1 });
          return existing;
        }
        return { ...normalized, enterProgress: enteringIds.has(normalized.source) || enteringIds.has(normalized.target) ? 0 : 1 };
      });

      const settledLayout = enteringIds.size ? waitForSettledLayout() : null;
      graph.graphData({ nodes, links });
      resize();
      if (!enteringIds.size) {
        repaint();
        if (action.focusIds) focusSubgraph(action.focusIds, action);
        if (claimTransitions.length) {
          await runTransition(action.duration ?? 180, (progress) => claimTransitions.forEach((transition) => {
            transition.node.claimVisualEstablished = transition.start + (transition.target - transition.start) * progress;
          }));
        }
        return;
      }

      await settledLayout;

      if (action.focusIds) focusSubgraph(action.focusIds, action);
      await runTransition(action.duration ?? 180, (progress) => {
        nodes.forEach((node) => {
          if (!enteringIds.has(node.id)) return;
          node.enterProgress = progress;
        });
        links.forEach((link) => {
          if (enteringIds.has(endpointId(link.source)) || enteringIds.has(endpointId(link.target))) link.enterProgress = progress;
        });
        claimTransitions.forEach((transition) => {
          transition.node.claimVisualEstablished = transition.start + (transition.target - transition.start) * progress;
        });
      });
    };

    const setSelected = (id) => {
      selectedId = id;
      repaint();
    };

    const setDimmed = (ids) => {
      filterOpacityIds = ids ? new Set(ids) : null;
      repaint();
    };

    const showOverview = (duration = 420) => {
      focusOpacityIds = null;
      selectedId = null;
      repaint();
      fit(duration);
    };

    const focusNode = (id, offsets = {}) => {
      if (!graph) return;
      const node = graph.graphData().nodes.find((item) => item.id === id);
      if (!node) return;
      focusOpacityIds = new Set([id]);
      selectedId = id;
      repaint();
      const zoom = Math.max(1.45, graph.zoom());
      const centerX = (node.x ?? 0) - (offsets.offsetX ?? 0) / zoom;
      const centerY = (node.y ?? 0) - (offsets.offsetY ?? 0) / zoom;
      const duration = motionDuration(offsets.duration ?? 420);
      graph.centerAt(centerX, centerY, duration);
      graph.zoom(Math.max(zoom, offsets.zoom ?? 1.7), duration);
    };

    const focusSubgraph = (ids, action = {}) => {
      const valid = new Set((ids ?? []).filter((id) => graph?.graphData().nodes.some((node) => node.id === id)));
      if (!valid.size) return;
      focusOpacityIds = valid;
      if (action.preserveSelection !== true) selectedId = null;
      repaint();
      fit(action.duration ?? 420, valid, action.padding ?? 110);
    };

    const insertAndFocusSubgraph = async (nextLayout, action = {}) => {
      const existing = new Set(graph?.graphData().nodes.map((node) => node.id) ?? []);
      const enteringIds = action.enteringIds ?? (nextLayout.nodes ?? []).map((node) => node.id).filter((id) => !existing.has(id));
      await setLayout(nextLayout, { ...action, enteringIds, focusIds: action.focusIds ?? enteringIds });
    };

    const restoreOverview = (duration = 420) => showOverview(duration);

    const setPalette = (nextPalette) => {
      palette = { ...palette, ...(nextPalette ?? {}) };
      graph?.backgroundColor(palette.background);
      repaint();
    };

    const keyboardSelect = (event) => {
      if (!layout?.nodes?.length || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") {
        restoreOverview();
        return;
      }
      if (event.key === "Enter") {
        if (selectedId) onNodeClick(selectedId);
        return;
      }
      const ids = layout.nodes.map((node) => node.id);
      const current = Math.max(0, ids.indexOf(selectedId));
      const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const nextId = ids[(current + step + ids.length) % ids.length];
      onNodeClick(nextId);
      focusNode(nextId);
    };

    container.addEventListener("keydown", keyboardSelect);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    ensureGraph();

    return {
      setLayout,
      setSelected,
      setDimmed,
      showOverview,
      focusNode,
      focusSubgraph,
      insertAndFocusSubgraph,
      restoreOverview,
      fit,
      resize,
      setPalette,
      getContract: graphContract.describe,
      getState() {
        return {
          rendererGeneration,
          nodeIds: graph?.graphData().nodes.map((node) => node.id) ?? [],
          edgeCount: graph?.graphData().links.length ?? 0,
          focusIds: focusOpacityIds ? [...focusOpacityIds] : [],
          filterIds: filterOpacityIds ? [...filterOpacityIds] : [],
          selectedId,
        };
      },
      destroy() {
        destroyed = true;
        if (transitionFrame) cancelAnimationFrame(transitionFrame);
        resizeObserver?.disconnect();
        graph?.pauseAnimation?.();
        container.removeEventListener("keydown", keyboardSelect);
        host.remove();
      },
    };
  }

  window.GammaGraphCanvas = {
    create,
    contractVersion: graphContract.CONTRACT_VERSION,
    capabilities: [...graphContract.CAPABILITIES],
  };
})();
