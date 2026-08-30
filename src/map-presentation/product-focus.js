/** Product-focus presentation for the interactive Math Map canvas. */
(function publishProductFocusPresentation(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathProductFocusPresentation = api;
})(typeof window !== "undefined" ? window : globalThis, function createProductFocusPresentation(hostRoot) {
  "use strict";

  function installProductFocusPresentation({ root = hostRoot } = {}) {
    const canvasCapability = root?.GammaGraphCanvas;
    const forceGraphFactory = root?.ForceGraph;
    if (!canvasCapability?.create || typeof forceGraphFactory !== "function") return false;
    if (canvasCapability.productFocusPresentation) return false;

    const presentationByHost = new WeakMap();
    const endpointId = (value) => typeof value === "object" ? value?.id : value;
    const colorWithOpacity = (color, opacity) => {
      const value = String(color ?? "");
      const hex = value.match(/^#([0-9a-f]{6})$/iu)?.[1];
      if (hex) {
        return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${opacity})`;
      }
      const rgb = value.match(/^rgba?\(([^)]+)\)$/iu)?.[1]
        ?.split(",").slice(0, 3).map((part) => part.trim());
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
        const state = { graph, focusIds: null, activeTargetId: null, selectedId: null };
        presentationByHost.set(host, state);

        const originalNodeCanvasObject = graph.nodeCanvasObject.bind(graph);
        graph.nodeCanvasObject = function productNodeCanvasObject(painter) {
          if (!arguments.length) return originalNodeCanvasObject();
          if (typeof painter !== "function" || painter.productFocusPainter) {
            return originalNodeCanvasObject(painter);
          }
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
    root.ForceGraph = wrappedForceGraph;
    root.GammaGraphCanvas = Object.freeze({
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
          if (typeof root.getComputedStyle !== "function" || !root.document) return fallback;
          return root.getComputedStyle(root.document.body).getPropertyValue(name).trim() || fallback;
        };
        state.graph.linkCanvasObjectMode?.(() => "replace");
        state.graph.linkCanvasObject?.((link, context, scale) => {
          const source = resolveEndpoint(link.source);
          const target = resolveEndpoint(link.target);
          if (!source || !target || !Number.isFinite(source.x) || !Number.isFinite(source.y)
            || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

          const relation = focusRelation(state, link);
          const opacity = relation === "target" ? 0.96
            : relation === "context" ? 0.68
              : relation === "overview" ? 0.48 : 0.08;
          const width = relation === "target" ? 2.8
            : relation === "context" ? 1.8
              : relation === "overview" ? 1.15 : 0.55;
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
              context.lineTo(
                tipX - unitX * arrowLength - unitY * arrowWidth,
                tipY - unitY * arrowLength + unitX * arrowWidth,
              );
              context.lineTo(
                tipX - unitX * arrowLength + unitY * arrowWidth,
                tipY - unitY * arrowLength - unitX * arrowWidth,
              );
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
            const reducedMotion = root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
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
    return true;
  }

  return Object.freeze({ installProductFocusPresentation });
});
