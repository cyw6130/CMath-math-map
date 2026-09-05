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
  const source = read("src/workbench/paper-import.js");
  const steps = ["mineru", "generate", "repair", "validate", "save"];
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
    activeStage: "mineru",
    stageContractError: null,
    extractSteps: steps.map((id) => ({ id })),
  };
  vm.runInNewContext(`
    ${extractFunction(source, "setStep")};
    ${extractFunction(source, "completePriorSteps")};
    ${extractFunction(source, "handleImportStage")};
    this.handleImportStage = handleImportStage;
  `, context);
  return {
    handleImportStage: context.handleImportStage,
    stepEls,
    stageContractError: () => context.stageContractError,
  };
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
  vm.runInNewContext(read("capabilities/browser/math-text.js"), { window: browserWindow, document: {} });
  vm.runInNewContext(read("src/math-map/math-rendering-consumer.js"), { window: browserWindow, document: {} });
  return { api: browserWindow.GammaMath, calls };
}

test("production entry exposes the reduced interaction shell", () => {
  const production = read("index.html");

  assert.doesNotMatch(production, /id="btn-map-chat"/u);
  assert.doesNotMatch(production, /id="btn-export-library-backup"|id="btn-import-library-backup"/u);
  assert.match(production, /<span id="map-active-title"/u);
  assert.match(production, /class="legacy-map-capability-hooks" hidden aria-hidden="true"/u);
  assert.match(production, /id="math-map-context"[^>]* hidden aria-hidden="true"/u);
  assert.ok(production.indexOf('src="capabilities/browser/math-text.js"') < production.indexOf('src="src/math-map/math-rendering-consumer.js'));
  assert.match(production, /math-rendering-consumer\.js\?v=[^"\s]+/u);
  assert.match(production, />\s*生成数学地图/u);
  assert.match(production, /自动保存到<strong>「我的地图 \/ 未分类」<\/strong>/u);
});

test("paper import marks every finished stage with a solid completion state", () => {
  const { handleImportStage, stepEls } = importProgressHarness();

  handleImportStage("mineru", { phase: "complete", pageCount: 25 });
  handleImportStage("generate", { phase: "start" });
  handleImportStage("repair", { phase: "start" });
  handleImportStage("validate", { phase: "fail", message: "contract mismatch" });

  for (const id of ["mineru", "generate", "repair", "validate"]) {
    assert.equal(stepEls.get(id).classList.contains("is-done"), true, `${id} is shown as completed`);
  }
  assert.match(stepEls.get("validate").querySelector(".step-detail").textContent, /contract mismatch/u);
});

test("paper import records an incompatible workflow stage instead of ignoring it", () => {
  const { handleImportStage, stageContractError } = importProgressHarness();
  handleImportStage("audited-patch-repair", { phase: "start" });
  assert.match(stageContractError().message, /网站工作流阶段不兼容：audited-patch-repair/u);
});

test("paper import presents recovery as the same bounded repair stage", () => {
  const { handleImportStage, stepEls } = importProgressHarness();
  handleImportStage("repair", { phase: "start", operation: "recovery-and-audited-patch" });
  assert.equal(stepEls.get("repair").querySelector(".step-detail").textContent, "正在检查并修正地图");
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

  const styles = read("assets/styles/app-v5.css");
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
    () => inspectRenderingDeployment('<script src="capabilities/browser/math-text.js"></script>', ""),
    /尚未加载带版本指纹/u,
  );
  assert.throws(
    () => inspectRenderingDeployment(
      '<script src="src/math-map/math-rendering-consumer.js?v=stale"></script>',
      'consumerAdapterId: "cmath-math-map.math-rendering-consumer/v1"',
    ),
    /发布身份/u,
  );
  const assetPath = productionAssetSource("src/math-map/math-rendering-consumer.js");
  assert.deepEqual(
    inspectRenderingDeployment(
      read("index.html"),
      read("src/math-map/math-rendering-consumer.js"),
    ),
    {
      assetPath,
      adapterId: "cmath-math-map.math-rendering-consumer/v1",
    },
  );
});

test("product shell keeps explicit focus exit and conditionally exposes evidence", () => {
  const app = read("src/workbench/app-v5.js");
  const styles = read("assets/styles/app-v5.css");

  assert.match(app, /function installInspectorEnhancements\(\)/u);
  assert.match(app, /evidenceButton\.hidden = !hasEvidence/u);
  assert.match(styles, /body\[data-lens-state="focus"\] #math-map-view \.map-history-actions/u);
  assert.match(styles, /#math-map-view \.progress-timeline,[\s\S]*#math-map-view \.loop-inspector/u);
});

test("folder drag movement and within-folder ordering remain available", () => {
  const app = read("src/workbench/app-v5.js");

  assert.match(app, /function moveMapToFolder\(/u);
  assert.match(app, /function insertMapAtPosition\(/u);
  assert.match(app, /card\.addEventListener\("dragstart"/u);
});

test("map library keeps imports available and gives every user map a complete action path", () => {
  const html = read("index.html");
  const app = read("src/workbench/app-v5.js");
  const styles = read("assets/styles/app-v5.css");

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
  const app = read("src/workbench/app-v5.js");

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
  const workbench = read("src/workbench/paper-import.js");

  assert.match(html, /data-model-gateway-url=/u);
  assert.match(html, /id="model-consent-card"[^>]*role="alertdialog"/u);
  assert.match(workbench, /MODEL_CONSENT_VERSION/u);
  assert.match(workbench, /requestConsent\(\)/u);
  assert.match(workbench, /createProvidedChat\(urls\.model\)/u);
  assert.match(workbench, /CMATH_PROVIDED_MODEL = "muse-spark-1\.3-contributor"/u);
  assert.match(workbench, /showProvidedFailure\(message\)/u);
});
