import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);

function presentationHarness() {
  const { installProductFocusPresentation } = require(
    "../src/map-presentation/product-focus.js",
  );
  const accessors = {};
  const navigation = [];
  let zoom = 1;
  const graph = {
    graphData(next) {
      if (next) { this.data = next; return this; }
      return this.data;
    },
    nodeCanvasObject(next) {
      if (next) { accessors.nodeCanvasObject = next; return this; }
      return accessors.nodeCanvasObject;
    },
    centerAt(...args) { navigation.push(["centerAt", ...args]); return this; },
    zoom(next, duration) {
      if (next !== undefined) {
        zoom = next;
        navigation.push(["zoom", next, duration]);
        return this;
      }
      return zoom;
    },
    refresh() {},
  };
  for (const name of [
    "linkColor",
    "linkWidth",
    "linkDirectionalArrowLength",
    "linkDirectionalArrowColor",
    "linkCanvasObject",
    "linkCanvasObjectMode",
  ]) {
    graph[name] = function accessor(next) {
      if (next) { accessors[name] = next; return this; }
      return accessors[name];
    };
  }

  const host = {};
  const container = {
    querySelector(selector) {
      return selector === ".alpha-force-graph-host" ? host : null;
    },
  };
  const root = {
    document: { body: {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    matchMedia: () => ({ matches: true }),
  };
  root.ForceGraph = () => () => graph;
  root.GammaGraphCanvas = {
    create() {
      const mounted = root.ForceGraph()(host);
      mounted.nodeCanvasObject(() => {});
      mounted.linkColor(() => "rgba(27,26,21,1)");
      mounted.linkWidth(() => 1);
      mounted.linkDirectionalArrowLength(() => 3);
      mounted.linkDirectionalArrowColor(() => "rgba(27,26,21,1)");
      return {
        setLayout(layout) { mounted.graphData({ nodes: layout.nodes, links: layout.edges }); },
        setSelected() {},
        focusSubgraph() { mounted.refresh(); },
        focusNode() {},
        showOverview() {},
        restoreOverview() {},
      };
    },
  };

  installProductFocusPresentation({ root });
  const canvas = root.GammaGraphCanvas.create(container, {});
  return { accessors, canvas, navigation };
}

test("产品聚焦呈现通过单一接口安装且重复安装幂等", () => {
  const { installProductFocusPresentation } = require(
    "../src/map-presentation/product-focus.js",
  );
  const originalForceGraph = () => () => ({});
  const root = {
    ForceGraph: originalForceGraph,
    GammaGraphCanvas: { create() { return {}; } },
  };

  assert.equal(installProductFocusPresentation({ root }), true);
  const installedForceGraph = root.ForceGraph;
  const installedCanvas = root.GammaGraphCanvas;
  assert.notEqual(installedForceGraph, originalForceGraph);
  assert.equal(installedCanvas.productFocusPresentation, true);

  assert.equal(installProductFocusPresentation({ root }), false);
  assert.equal(root.ForceGraph, installedForceGraph);
  assert.equal(root.GammaGraphCanvas, installedCanvas);
});

test("聚焦主目标时保留上下文关系并突出目标关系", () => {
  const { accessors, canvas, navigation } = presentationHarness();
  const layout = {
    nodes: [
      { id: "premise", x: 0, y: 0 },
      { id: "proof", x: 40, y: 20 },
      { id: "goal", x: 80, y: 0, isActiveTarget: true },
    ],
    edges: [
      { source: "premise", target: "proof", relation: "premise" },
      { source: "proof", target: "goal", relation: "conclusion" },
    ],
  };

  canvas.setLayout(layout);
  canvas.focusSubgraph(["proof", "goal"], { duration: 200 });

  assert.match(accessors.linkColor(layout.edges[0]), /,0\.68\)$/u);
  assert.ok(accessors.linkWidth(layout.edges[0]) >= 1.45);
  assert.match(accessors.linkColor(layout.edges[1]), /,0\.96\)$/u);
  assert.ok(accessors.linkWidth(layout.edges[1]) >= 2.4);
  assert.ok(accessors.linkDirectionalArrowLength(layout.edges[1]) >= 5);
  assert.match(accessors.linkDirectionalArrowColor(layout.edges[1]), /,0\.96\)$/u);
  assert.deepEqual(navigation, [
    ["centerAt", 80, 0, 0],
    ["zoom", 1.95, 0],
  ]);
});

test("聚焦和总览都在可见画布上绘制完整关系", () => {
  const { accessors, canvas } = presentationHarness();
  const edge = { source: "premise", target: "goal", relation: "premise" };
  const layout = {
    nodes: [
      { id: "premise", x: 0, y: 0 },
      { id: "goal", x: 60, y: 30, isActiveTarget: true },
    ],
    edges: [edge],
  };
  const paint = () => {
    const strokes = [];
    let fills = 0;
    const context = {
      save() {}, restore() {}, beginPath() {}, closePath() {},
      fill() { fills += 1; },
      moveTo(x, y) { strokes.push(["moveTo", x, y]); },
      lineTo(x, y) { strokes.push(["lineTo", x, y]); },
      stroke() { strokes.push(["stroke", this.strokeStyle, this.lineWidth]); },
    };
    accessors.linkCanvasObject(edge, context, 1);
    return { fills, strokes };
  };

  canvas.setLayout(layout);
  canvas.focusSubgraph(["goal"]);
  assert.equal(accessors.linkCanvasObjectMode(edge), "replace");
  const focused = paint();
  assert.deepEqual(focused.strokes[0], ["moveTo", 0, 0]);
  assert.deepEqual(focused.strokes[1], ["lineTo", 60, 30]);
  assert.match(focused.strokes[2][1], /,0\.96\)$/u);
  assert.equal(focused.fills, 1);

  canvas.showOverview();
  const overview = paint();
  assert.match(overview.strokes[2][1], /,0\.48\)$/u);
  assert.ok(overview.strokes[2][2] >= 1.1);
  assert.equal(overview.fills, 1);
});

test("焦点外背景关系保持可见但不绘制方向箭头", () => {
  const { accessors, canvas } = presentationHarness();
  const backgroundEdge = { source: "outside-a", target: "outside-b", relation: "premise" };
  const layout = {
    nodes: [
      { id: "goal", x: 0, y: 0, isActiveTarget: true },
      { id: "outside-a", x: 40, y: 20 },
      { id: "outside-b", x: 80, y: 30 },
    ],
    edges: [backgroundEdge],
  };
  let fills = 0;
  const context = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fill() { fills += 1; },
  };

  canvas.setLayout(layout);
  canvas.focusSubgraph(["goal"]);
  accessors.linkCanvasObject(backgroundEdge, context, 1);

  assert.match(accessors.linkColor(backgroundEdge), /,0\.08\)$/u);
  assert.ok(accessors.linkWidth(backgroundEdge) >= 0.45);
  assert.equal(fills, 0);
});

test("主目标节点在产品聚焦呈现中保持放大", () => {
  const { accessors } = presentationHarness();
  const transforms = [];
  const context = {
    save() { transforms.push(["save"]); },
    restore() { transforms.push(["restore"]); },
    translate(x, y) { transforms.push(["translate", x, y]); },
    scale(x, y) { transforms.push(["scale", x, y]); },
  };

  accessors.nodeCanvasObject({ id: "goal", x: 12, y: 8, isActiveTarget: true }, context, 1);

  assert.deepEqual(transforms, [
    ["save"],
    ["translate", 12, 8],
    ["scale", 1.55, 1.55],
    ["translate", -12, -8],
    ["restore"],
  ]);
});

test("浏览器普通 script 暴露产品聚焦呈现接口", () => {
  const source = fs.readFileSync(
    new URL("../src/map-presentation/product-focus.js", import.meta.url),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context, { filename: "src/map-presentation/product-focus.js" });

  assert.equal(
    typeof context.window.CMathProductFocusPresentation.installProductFocusPresentation,
    "function",
  );
});

test("生产入口在界面前加载呈现模块，界面只调用公开接口", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app-v5.js", import.meta.url), "utf8");
  const runtime = fs.readFileSync(
    new URL("../src/runtime/capabilities.js", import.meta.url),
    "utf8",
  );
  const canvasIndex = html.indexOf('src="graph-canvas.js');
  const presentationIndex = html.indexOf('src="src/map-presentation/product-focus.js');
  const appIndex = html.indexOf('src="app-v5.js');

  assert.ok(canvasIndex >= 0 && canvasIndex < presentationIndex);
  assert.ok(presentationIndex < appIndex);
  assert.match(runtime, /root\.CMathProductFocusPresentation/u);
  assert.match(app, /productFocusPresentation\.installProductFocusPresentation\(\)/u);
  assert.doesNotMatch(app, /window\.CMathProductFocusPresentation/u);
  assert.doesNotMatch(app, /function installProductFocusPresentation\(/u);
  assert.doesNotMatch(app, /window\.(?:ForceGraph|GammaGraphCanvas)\s*=/u);
});
