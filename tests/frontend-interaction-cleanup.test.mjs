import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (fileName) => fs.readFileSync(path.join(root, fileName), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

function focusPresentationHarness() {
  const accessors = {};
  let zoom = 1;
  const graph = {
    graphData(next) {
      if (next) {
        this.data = next;
        return this;
      }
      return this.data;
    },
    nodeCanvasObject(next) {
      if (next) {
        accessors.nodeCanvasObject = next;
        return this;
      }
      return accessors.nodeCanvasObject;
    },
    centerAt() { return this; },
    zoom(next) {
      if (next !== undefined) {
        zoom = next;
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
      if (next) {
        accessors[name] = next;
        return this;
      }
      return accessors[name];
    };
  }

  const host = {};
  const container = {
    querySelector(selector) {
      return selector === ".alpha-force-graph-host" ? host : null;
    },
  };
  const browserWindow = {
    matchMedia: () => ({ matches: true }),
  };
  browserWindow.ForceGraph = () => () => graph;
  browserWindow.GammaGraphCanvas = {
    create() {
      const mounted = browserWindow.ForceGraph()(host);
      mounted.nodeCanvasObject(() => {});
      mounted.linkColor(() => "rgba(27,26,21,1)");
      mounted.linkWidth(() => 1);
      mounted.linkDirectionalArrowLength(() => 3);
      mounted.linkDirectionalArrowColor(() => "rgba(27,26,21,1)");
      return {
        setLayout(layout) {
          mounted.graphData({ nodes: layout.nodes, links: layout.edges });
        },
        setSelected() {},
        focusSubgraph() { mounted.refresh(); },
        focusNode() {},
        showOverview() {},
        restoreOverview() {},
      };
    },
  };

  const source = read("app-v5.js");
  const installer = extractFunction(source, "installProductFocusPresentation");
  vm.runInNewContext(`${installer}; installProductFocusPresentation();`, {
    window: browserWindow,
    WeakMap,
    Object,
    Set,
    String,
    Number,
    Math,
    parseInt,
  });
  const canvas = browserWindow.GammaGraphCanvas.create(container, {});
  return { accessors, canvas };
}

test("production entry and v5 mirror expose the same reduced interaction shell", () => {
  const production = read("index.html");
  const mirror = read("index-v5.html");

  assert.equal(mirror, production);
  assert.doesNotMatch(production, /id="btn-map-chat"/u);
  assert.doesNotMatch(production, /id="btn-export-library-backup"|id="btn-import-library-backup"/u);
  assert.match(production, /<span id="map-active-title"/u);
  assert.match(production, /class="legacy-map-capability-hooks" hidden aria-hidden="true"/u);
  assert.match(production, /id="math-map-context"[^>]* hidden aria-hidden="true"/u);
  assert.match(production, />\s*生成数学地图/u);
  assert.match(production, /自动保存到<strong>「我的 JSON 地图」<\/strong>/u);
});

test("product shell keeps explicit focus exit and conditionally exposes evidence", () => {
  const app = read("app-v5.js");
  const styles = read("app-v5.css");

  assert.match(app, /function installInspectorEnhancements\(\)/u);
  assert.match(app, /evidenceButton\.hidden = !hasEvidence/u);
  assert.match(styles, /body\[data-lens-state="focus"\] #math-map-view \.map-history-actions/u);
  assert.match(styles, /#math-map-view \.progress-timeline,[\s\S]*#math-map-view \.loop-inspector/u);
});

test("product focus enlarges its target and preserves visible proof context", () => {
  const app = read("app-v5.js");
  const canonicalCanvas = read("graph-canvas.js");

  assert.match(app, /function installProductFocusPresentation\(\)/u);
  assert.match(app, /context\.scale\(1\.55, 1\.55\)/u);
  assert.match(app, /relation === "target"[\s\S]*Math\.max\(2\.4/u);
  assert.match(app, /relation === "context"[\s\S]*Math\.max\(1\.45/u);
  assert.match(app, /relation === "background"[\s\S]*colorWithOpacity\(color, 0\.08\)/u);
  assert.match(app, /state\.graph\.centerAt\(target\.x/u);
  assert.match(app, /state\.graph\.zoom\(Math\.max\(1\.95/u);
  assert.match(app, /focusSubgraph\(ids, \{ \.\.\.action, duration: 0, preserveSelection: true \}\)/u);
  assert.match(canonicalCanvas, /@warning DO NOT EDIT DIRECTLY/u);
  assert.doesNotMatch(canonicalCanvas, /productFocusPresentation/u);
});

test("a proof edge entering the focused subgraph remains visible", () => {
  const { accessors, canvas } = focusPresentationHarness();
  const layout = {
    nodes: [
      { id: "premise" },
      { id: "proof" },
      { id: "goal", isActiveTarget: true },
    ],
    edges: [
      { source: "premise", target: "proof", relation: "premise" },
      { source: "proof", target: "goal", relation: "conclusion" },
    ],
  };
  canvas.setLayout(layout);
  canvas.focusSubgraph(["proof", "goal"]);

  assert.match(accessors.linkColor(layout.edges[0]), /,0\.68\)$/u);
  assert.ok(accessors.linkWidth(layout.edges[0]) >= 1.45);
  assert.match(accessors.linkColor(layout.edges[1]), /,0\.96\)$/u);
  assert.ok(accessors.linkWidth(layout.edges[1]) >= 2.4);
});

test("focused proof edges are explicitly painted onto the visible canvas", () => {
  const { accessors, canvas } = focusPresentationHarness();
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
  canvas.focusSubgraph(["proof", "goal"]);

  assert.equal(accessors.linkCanvasObjectMode(layout.edges[0]), "replace");
  const strokes = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo(x, y) { strokes.push(["moveTo", x, y]); },
    lineTo(x, y) { strokes.push(["lineTo", x, y]); },
    closePath() {},
    stroke() { strokes.push(["stroke", this.strokeStyle, this.lineWidth]); },
    fill() {},
  };
  accessors.linkCanvasObject(layout.edges[0], context, 1);

  assert.deepEqual(strokes[0], ["moveTo", 0, 0]);
  assert.deepEqual(strokes[1], ["lineTo", 40, 20]);
  assert.match(strokes[2][1], /,0\.68\)$/u);
  assert.ok(strokes[2][2] >= 1.45);
});

test("exiting focus keeps the complete graph connected on the visible canvas", () => {
  const { accessors, canvas } = focusPresentationHarness();
  const edge = { source: "premise", target: "goal", relation: "premise" };
  const layout = {
    nodes: [
      { id: "premise", x: 0, y: 0 },
      { id: "goal", x: 60, y: 30, isActiveTarget: true },
    ],
    edges: [edge],
  };
  canvas.setLayout(layout);
  canvas.focusSubgraph(["goal"]);
  canvas.showOverview();

  assert.equal(accessors.linkCanvasObjectMode(edge), "replace");
  const strokes = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() { strokes.push([this.strokeStyle, this.lineWidth]); },
    fill() {},
  };
  accessors.linkCanvasObject(edge, context, 1);

  assert.equal(strokes.length, 1);
  assert.match(strokes[0][0], /,0\.48\)$/u);
  assert.ok(strokes[0][1] >= 1.1);
});

test("folder drag movement and within-folder ordering remain available", () => {
  const app = read("app-v5.js");

  assert.match(app, /function moveMapToFolder\(/u);
  assert.match(app, /function insertMapAtPosition\(/u);
  assert.match(app, /card\.addEventListener\("dragstart"/u);
});

test("settings separate CMath-provided access from explicitly saved BYOK configuration", () => {
  const html = read("index.html");
  const app = read("app-v5.js");

  assert.match(html, /name="model-access-mode" value="cmath" checked/u);
  assert.match(html, /name="model-access-mode" value="own"/u);
  assert.match(html, /id="btn-save-settings"/u);
  assert.match(html, /id="settings-discard-confirm"[^>]*role="alertdialog"/u);
  assert.match(html, /id="btn-toggle-api-key"[^>]*aria-pressed="false"/u);
  assert.match(html, /Muse Spark Contributor 可能使用这些内容训练未来模型/u);
  assert.match(app, /MODEL_ACCESS_PREF_KEY/u);
  assert.match(app, /function settingsAreDirty\(\)/u);
  assert.match(app, /function saveSettings\(\)/u);
  assert.match(app, /if \(!force && settingsOpen && settingsAreDirty\(\)\)/u);
  assert.doesNotMatch(app, /OPENCODE_GO_API_KEY/u);
});

test("provided Muse access requires versioned consent and uses the model gateway", () => {
  const html = read("index.html");
  const app = read("app-v5.js");

  assert.match(html, /data-model-gateway-url=/u);
  assert.match(html, /id="model-consent-card"[^>]*role="alertdialog"/u);
  assert.match(app, /MODEL_CONSENT_VERSION/u);
  assert.match(app, /requestProvidedModelConsent\(\)/u);
  assert.match(app, /createCmathMuseChatImpl\(\)/u);
  assert.match(app, /CMATH_PROVIDED_MODEL = "muse-spark-1\.2-contributor"/u);
  assert.match(app, /showProvidedModelFailure\(message\)/u);
});
