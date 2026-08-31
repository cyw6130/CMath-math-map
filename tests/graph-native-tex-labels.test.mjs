import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = resolve(new URL("..", import.meta.url).pathname);

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this._innerHTML = "";
    this._textContent = "";
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (!this._innerHTML) this.children = [];
  }

  get innerHTML() { return this._innerHTML; }

  set textContent(value) {
    this._textContent = String(value);
    this._innerHTML = "";
    this.children = [];
  }

  get textContent() { return this._textContent; }

  setAttribute(name, value) { this.attributes[name] = String(value); }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  querySelector(selector) {
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      if (this.className.split(/\s+/u).includes(className)) return this;
      if (this._innerHTML.includes(`class="${className}"`)) return this;
    }
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  getBoundingClientRect() { return { width: 800, height: 600, top: 0, left: 0 }; }

  addEventListener() {}
  removeEventListener() {}
}

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

function createGraphHarness() {
  const accessors = {};
  const forces = {};
  const graph = {
    data: { nodes: [], links: [] },
    zoomLevel: 3,
    graphData(next) {
      if (next) {
        this.data = next;
        accessors.onEngineStop?.();
        return this;
      }
      return this.data;
    },
    graph2ScreenCoords(x, y) {
      accessors.graph2ScreenCoords?.push([x, y]);
      return { x: x * 2 + 100, y: y * 2 + 50 };
    },
    zoom(next) {
      if (next !== undefined) {
        this.zoomLevel = next;
        return this;
      }
      return this.zoomLevel;
    },
    refresh() {},
    d3Force(name, next) {
      if (next !== undefined) {
        forces[name] = next;
        return this;
      }
      return forces[name] ?? {
        strength() { return this; },
        distance() { return this; },
        distanceMax() { return this; },
      };
    },
    graph2ScreenCoordsCalls: [],
    centerAt() { return this; },
    zoomToFit() { return this; },
    width() { return this; },
    height() { return this; },
    pauseAnimation() {},
    resumeAnimation() { return this; },
    d3ReheatSimulation() { return this; },
    warmupTicks() { return this; },
    cooldownTicks() { return this; },
  };
  accessors.graph2ScreenCoords = graph.graph2ScreenCoordsCalls;

  for (const name of [
    "backgroundColor", "nodeId", "nodeVal", "nodeLabel", "nodeCanvasObjectMode",
    "nodeCanvasObject", "linkColor", "linkWidth", "linkDirectionalArrowLength",
    "linkDirectionalArrowRelPos", "linkDirectionalArrowColor", "warmupTicks",
    "cooldownTicks", "onNodeDrag", "onNodeDragEnd", "onNodeClick", "onBackgroundClick",
    "onRenderFramePost",
  ]) {
    graph[name] = function accessor(next) {
      if (next !== undefined) {
        accessors[name] = next;
        return this;
      }
      return accessors[name];
    };
  }
  graph.onEngineStop = function onEngineStop(next) {
    if (next !== undefined) {
      accessors.onEngineStop = next;
      return this;
    }
    return accessors.onEngineStop;
  };

  return { accessors, graph };
}

function createRuntime() {
  const document = {
    createElement: (tagName) => new FakeElement(tagName),
  };
  const { accessors, graph } = createGraphHarness();
  const renderCalls = [];
  const browserWindow = {
    document,
    GammaMath: {
      render(value) {
        renderCalls.push(value);
        return `<span class="katex">${String(value)}</span>`;
      },
    },
    ForceGraph: () => () => graph,
    matchMedia: () => ({ matches: true }),
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
  };
  const runtime = {
    window: browserWindow,
    document,
    ResizeObserver: FakeResizeObserver,
    setTimeout: browserWindow.setTimeout,
    clearTimeout: browserWindow.clearTimeout,
    requestAnimationFrame: browserWindow.requestAnimationFrame,
    cancelAnimationFrame: browserWindow.cancelAnimationFrame,
    performance: { now: () => 0 },
  };
  vm.runInNewContext(readFileSync(resolve(root, "graph-contract.js"), "utf8"), runtime);
  vm.runInNewContext(readFileSync(resolve(root, "graph-canvas.js"), "utf8"), runtime);
  return { accessors, browserWindow, document, graph, renderCalls };
}

test("GammaGraphCanvas renders visible TeX labels in a DOM layer and keeps Canvas text-free", async () => {
  const runtime = createRuntime();
  const container = new FakeElement("section");
  const canvas = runtime.browserWindow.GammaGraphCanvas.create(container);

  await canvas.setLayout({
    nodes: [{
      id: "entry-1",
      nodeKind: "entry",
      title: "$H_{n,k}$",
      displayName: "$H_{n,k}$",
      x: 12,
      y: 8,
    }],
    edges: [],
  });

  const layer = container.querySelector(".gamma-graph-label-layer");
  assert.ok(layer, "setLayout creates the DOM label layer");
  assert.equal(layer.children.length, 1);
  const label = layer.children[0];
  assert.equal(label.style.visibility, "visible");
  assert.ok(Number.parseFloat(label.style.fontSize) >= 11);
  assert.match(label.innerHTML, /class="katex"/u);
  assert.deepEqual(runtime.renderCalls, ["$H_{n,k}$"]);

  const node = runtime.graph.data.nodes[0];
  node.x = 12;
  node.y = 8;
  runtime.accessors.graph2ScreenCoords.length = 0;
  runtime.accessors.onRenderFramePost({}, 3);
  assert.deepEqual(runtime.accessors.graph2ScreenCoords, [[12, 8]]);
  assert.equal(label.style.left, "124px");
  assert.equal(label.style.top, "66px");

  const textCalls = [];
  runtime.accessors.nodeCanvasObject(node, {
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    fillText(...args) { textCalls.push(["fillText", ...args]); },
    strokeText(...args) { textCalls.push(["strokeText", ...args]); },
  }, 3);
  assert.deepEqual(textCalls, []);
});
