import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { inspectRenderingDeployment } from "../scripts/check-production-rendering.mjs";
import { productionAssetSource } from "../scripts/production-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (fileName) => fs.readFileSync(path.join(root, fileName), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const paramsStart = source.indexOf("(", start);
  let paramsDepth = 0;
  let bodyStart = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")") paramsDepth -= 1;
    if (paramsDepth === 0) {
      bodyStart = source.indexOf("{", index);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `${name} body exists`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

function importProgressHarness() {
  const source = read("app-v5.js");
  const steps = ["mineru", "generate", "validate", "repair", "save"];
  const stepEls = new Map(steps.map((id) => {
    const classes = new Set();
    const detail = { textContent: "" };
    return [id, {
      classList: {
        add(...names) { names.forEach((name) => classes.add(name)); },
        remove(...names) { names.forEach((name) => classes.delete(name)); },
        contains(name) { return classes.has(name); },
      },
      querySelector(selector) { return selector === ".step-detail" ? detail : null; },
    }];
  }));
  const context = {
    stepEls,
    activeImportStage: "mineru",
    EXTRACT_STEPS: steps.map((id) => ({ id })),
  };
  vm.runInNewContext(`
    ${extractFunction(source, "setStep")};
    ${extractFunction(source, "completePriorSteps")};
    ${extractFunction(source, "handleImportStage")};
    this.handleImportStage = handleImportStage;
  `, context);
  return { handleImportStage: context.handleImportStage, stepEls };
}

function loadMathRenderingHarness() {
  const calls = [];
  const browserWindow = {
    katex: {
      renderToString(math, options) {
        calls.push({ math, options });
        return `<math data-display="${options.displayMode}">${math}</math>`;
      },
    },
  };
  vm.runInNewContext(read("math-text.js"), { window: browserWindow, document: {} });
  vm.runInNewContext(read("math-rendering-consumer.js"), { window: browserWindow, document: {} });
  return { api: browserWindow.GammaMath, calls };
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
  assert.ok(production.indexOf('src="math-text.js"') < production.indexOf('src="math-rendering-consumer.js'));
  assert.match(production, /math-rendering-consumer\.js\?v=[^"\s]+/u);
  assert.match(production, />\s*生成数学地图/u);
  assert.match(production, /自动保存到<strong>「我的地图 \/ 未分类」<\/strong>/u);
});

test("paper import marks every finished stage with a solid completion state", () => {
  const { handleImportStage, stepEls } = importProgressHarness();

  handleImportStage("mineru", { phase: "complete", pageCount: 25 });
  handleImportStage("generate", { phase: "start" });
  handleImportStage("validate", { phase: "fail", message: "contract mismatch" });
  handleImportStage("repair", { phase: "start" });

  for (const id of ["mineru", "generate", "validate"]) {
    assert.equal(stepEls.get(id).classList.contains("is-done"), true, `${id} is shown as completed`);
  }
  assert.equal(stepEls.get("repair").classList.contains("is-active"), true);
});

test("math rendering capability keeps an undelimited spaced formula intact", () => {
  const { api, calls } = loadMathRenderingHarness();
  const source = "定义 M_{j,k} = \\bigoplus_{r=0}^{j} S^{j-r+k/2}(u_p) \\otimes \\Lambda^r g，且 dim ker d_V - dim im d_V 可计算。";
  const html = api.render(source);

  assert.match(html, /<math data-display="(?:true|false)">M_\{j,k\} = \\bigoplus_\{r=0\}\^\{j\} S\^\{j-r\+k\/2\}\(u_p\) \\otimes \\Lambda\^r g<\/math>/u);
  assert.match(html, /<math data-display="(?:true|false)">\\dim \\ker d_V - \\dim \\operatorname\{im\} d_V<\/math>/u);
  assert.equal(calls.some(({ math }) => /(?:^|\s)[_^](?:\s|$)/u.test(math)), false, "never sends broken script fragments to KaTeX");
});

test("long formulas become scrollable display math while short symbols stay inline", () => {
  const { api, calls } = loadMathRenderingHarness();
  api.render("定义 M_{j,k} = \\bigoplus_{r=0}^{j} S^{j-r+k/2}(u_p) \\otimes \\Lambda^r g，且 d_V 非零。");

  const formula = calls.find(({ math }) => math.startsWith("M_{j,k}"));
  const symbol = calls.find(({ math }) => math === "d_V");
  assert.equal(formula?.options.displayMode, true);
  assert.equal(symbol?.options.displayMode, false);

  const styles = read("app-v5.css");
  assert.match(styles, /\.math-map-inspector \.katex-display[\s\S]*overflow-x:\s*auto/u);
});

test("common mathematical operators use upright KaTeX commands", () => {
  const { api, calls } = loadMathRenderingHarness();
  api.render("由 dim ker d_V - dim im d_V = 0 得到结论。");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].math, "\\dim \\ker d_V - \\dim \\operatorname{im} d_V = 0");
});

test("the default test suite includes frontend regressions", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.match(packageJson.scripts.test, /tests\/\*\.mjs/u);
  assert.equal(packageJson.scripts["check:production-rendering"], "node scripts/check-production-rendering.mjs");
});

test("production rendering check rejects release drift and accepts the current entry", () => {
  assert.throws(
    () => inspectRenderingDeployment('<script src="math-text.js"></script>', ""),
    /尚未加载带版本指纹/u,
  );
  assert.throws(
    () => inspectRenderingDeployment(
      '<script src="math-rendering-consumer.js?v=stale"></script>',
      'consumerAdapterId: "cmath-math-map.math-rendering-consumer/v1"',
    ),
    /发布身份/u,
  );
  const assetPath = productionAssetSource("math-rendering-consumer.js");
  assert.deepEqual(
    inspectRenderingDeployment(
      read("index.html"),
      read("math-rendering-consumer.js"),
    ),
    {
      assetPath,
      adapterId: "cmath-math-map.math-rendering-consumer/v1",
    },
  );
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

test("map library keeps imports available and gives every user map a complete action path", () => {
  const html = read("index.html");
  const app = read("app-v5.js");
  const styles = read("app-v5.css");

  assert.match(html, /id="btn-library-import-json"/u);
  assert.match(app, /YOUR LIBRARY[\s\S]*我的地图/u);
  assert.match(app, /sourceLabel = mapDef\.generatedResult \? "论文生成" : "JSON 导入"/u);
  assert.doesNotMatch(app, /sourceBadgeText = mapDef\.isImported \? "用户导入"/u);
  assert.match(app, /btn-menu-delete-map/u);
  assert.match(app, /function deleteUserMap\(/u);
  assert.match(app, /library-toast-undo/u);
  assert.match(app, /currentOrder\.unshift\(\.\.\.importedIds\)/u);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.map-drag-handle,[\s\S]*display: none/u);
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
