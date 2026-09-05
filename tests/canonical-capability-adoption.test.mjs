import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const scriptIndex = (html, src) => html.indexOf(`<script src="${src}`);

const mapPages = [
  { page: "index.html", loader: "src/workbench/app-v5.js" },
  { page: "index-v5.html", loader: "src/workbench/app-v5.js" },
  { page: "pages/generic-math-map-lab.html", loader: "src/legacy/generic-math-map-bootstrap.js" },
  { page: "pages/generic-math-map-lab-redesign.html", loader: "src/legacy/generic-math-map-bootstrap.js" },
];

test("Math Map loads the graph contract before the shared canvas", () => {
  for (const { page } of mapPages) {
    assert.ok(existsSync(resolve(root, page)), `${page} exists`);
    const html = read(page);
    const contractAt = scriptIndex(html, "capabilities/browser/graph-contract.js");
    const canvasAt = scriptIndex(html, "capabilities/browser/graph-canvas.js");
    assert.ok(contractAt >= 0, `${page} loads graph-contract.js`);
    assert.ok(canvasAt >= 0, `${page} loads graph-canvas.js`);
    assert.ok(contractAt < canvasAt, `${page} loads the contract first`);
  }
});

test("the adopted graph canvas uses GammaGraphContract.assertLayout", () => {
  const source = read("capabilities/browser/graph-canvas.js");
  assert.match(source, /const graphContract = window\.GammaGraphContract/);
  assert.match(source, /GammaGraphContract must load before GammaGraphCanvas/);
  assert.match(source, /graphContract\.assertLayout/);
});

test("Math Map loads visual semantics before the workspace controller and injects it", () => {
  const workspace = read("capabilities/browser/math-map-lab.js");
  assert.match(workspace, /visualSemantics:\s*window\.GammaMathMapVisualSemantics/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const visualAt = scriptIndex(html, "capabilities/browser/math-map-visual-semantics.js");
    const loaderAt = scriptIndex(html, loader);
    assert.ok(visualAt >= 0, `${page} loads math-map-visual-semantics.js`);
    assert.ok(loaderAt >= 0, `${page} loads ${loader}`);
    assert.ok(visualAt < loaderAt, `${page} loads visual semantics before ${loader}`);

    const loaderSource = read(loader);
    assert.match(loaderSource, /math-map-lab\.js/);
  }
});

test("Math Map loads the adopted content channel before each current map controller", () => {
  const contentLoader = read("capabilities/browser/math-map-content-loader.js");
  assert.match(contentLoader, /root\.GammaMathMapContentLoader = api/);
  assert.match(contentLoader, /function validateProjectView/);
  assert.match(contentLoader, /function load\(mapId, options = \{\}\)/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const channelAt = scriptIndex(html, "capabilities/browser/math-map-content-loader.js");
    const controllerAt = scriptIndex(html, loader);
    assert.ok(channelAt >= 0, `${page} loads math-map-content-loader.js`);
    assert.ok(controllerAt >= 0, `${page} loads ${loader}`);
    assert.ok(channelAt < controllerAt, `${page} loads the content channel before ${loader}`);
  }
});

test("Math Map loads the adopted preview loader after validation and before controllers", () => {
  const previewLoader = read("capabilities/browser/generic-math-map-preview-loader.js");
  assert.match(previewLoader, /root\.GammaGenericMathMapPreviewLoader = api/);
  assert.match(previewLoader, /return Object\.freeze\(\{ loadFile, parse, prepare, previewDefinition \}\)/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const contentAt = scriptIndex(html, "capabilities/browser/math-map-content-loader.js");
    const previewAt = scriptIndex(html, "capabilities/browser/generic-math-map-preview-loader.js");
    const controllerAt = scriptIndex(html, loader);
    assert.ok(previewAt >= 0, `${page} loads generic-math-map-preview-loader.js`);
    assert.ok(contentAt < previewAt, `${page} loads validation before preview`);
    assert.ok(previewAt < controllerAt, `${page} loads preview before ${loader}`);
    const source = read(loader);
    assert.match(
      source,
      loader === "src/workbench/app-v5.js"
        ? /mapRuntime\.genericPreviewLoader/
        : /GammaGenericMathMapPreviewLoader/,
    );
  }
});

test("current Math Map pages do not expose a synthetic Route switcher", () => {
  for (const { page } of mapPages) {
    const html = read(page);
    assert.doesNotMatch(html, /route-switcher|route-options|data-route/);
  }

  const workspace = read("capabilities/browser/math-map-lab.js");
  assert.match(workspace, /@package math-map-workspace-v3/);
  assert.match(workspace, /model\.focusView/);
  assert.doesNotMatch(workspace, /activeRouteId|routeView|switchRoute|data-route/);
});

test("generic source content records typed Entry and Inference deltas", () => {
  for (const file of [
    "examples/generic-math-content/fundamental-theorem-calculus-project-view.json",
    "examples/generic-math-content/intermediate-value-theorem-project-view.json",
    "examples/generic-math-content/spectral-theorem-project-view.json",
  ]) {
    const source = read(file);
    assert.match(source, /"deltaEntryIds"/);
    assert.match(source, /"deltaInferenceIds"/);
    assert.doesNotMatch(source, /"deltaIds"/);
  }
});
