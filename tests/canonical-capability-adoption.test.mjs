import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const mapPages = [
  { page: "index.html", loader: "app-v5.js" },
  { page: "index-v5.html", loader: "app-v5.js" },
  { page: "generic-math-map-lab.html", loader: "generic-math-map-bootstrap.js" },
  { page: "generic-math-map-lab-redesign.html", loader: "generic-math-map-bootstrap.js" },
];

test("Math Map loads the graph contract before the shared canvas", () => {
  for (const { page } of mapPages) {
    assert.ok(existsSync(resolve(root, page)), `${page} exists`);
    const html = read(page);
    const contractAt = html.indexOf('<script src="graph-contract.js"></script>');
    const canvasAt = html.indexOf('<script src="graph-canvas.js"></script>');
    assert.ok(contractAt >= 0, `${page} loads graph-contract.js`);
    assert.ok(canvasAt >= 0, `${page} loads graph-canvas.js`);
    assert.ok(contractAt < canvasAt, `${page} loads the contract first`);
  }
});

test("the adopted graph canvas uses GammaGraphContract.assertLayout", () => {
  const source = read("graph-canvas.js");
  assert.match(source, /const graphContract = window\.GammaGraphContract/);
  assert.match(source, /GammaGraphContract must load before GammaGraphCanvas/);
  assert.match(source, /graphContract\.assertLayout/);
});

test("Math Map loads visual semantics before the workspace controller and injects it", () => {
  const workspace = read("math-map-lab.js");
  assert.match(workspace, /visualSemantics:\s*window\.GammaMathMapVisualSemantics/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const visualAt = html.indexOf('<script src="math-map-visual-semantics.js"></script>');
    const loaderAt = html.indexOf(`<script src="${loader}"></script>`);
    assert.ok(visualAt >= 0, `${page} loads math-map-visual-semantics.js`);
    assert.ok(loaderAt >= 0, `${page} loads ${loader}`);
    assert.ok(visualAt < loaderAt, `${page} loads visual semantics before ${loader}`);

    const loaderSource = read(loader);
    assert.match(loaderSource, /math-map-lab\.js/);
  }
});

test("Math Map loads the adopted content channel before each current map controller", () => {
  const contentLoader = read("math-map-content-loader.js");
  assert.match(contentLoader, /root\.GammaMathMapContentLoader = api/);
  assert.match(contentLoader, /function validateProjectView/);
  assert.match(contentLoader, /function load\(mapId, options = \{\}\)/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const channelAt = html.indexOf('<script src="math-map-content-loader.js"></script>');
    const controllerAt = html.indexOf(`<script src="${loader}"></script>`);
    assert.ok(channelAt >= 0, `${page} loads math-map-content-loader.js`);
    assert.ok(controllerAt >= 0, `${page} loads ${loader}`);
    assert.ok(channelAt < controllerAt, `${page} loads the content channel before ${loader}`);
  }
});

test("Math Map loads the adopted preview loader after validation and before controllers", () => {
  const previewLoader = read("generic-math-map-preview-loader.js");
  assert.match(previewLoader, /root\.GammaGenericMathMapPreviewLoader = api/);
  assert.match(previewLoader, /return Object\.freeze\(\{ loadFile, parse, prepare, previewDefinition \}\)/);

  for (const { page, loader } of mapPages) {
    const html = read(page);
    const contentAt = html.indexOf('<script src="math-map-content-loader.js"></script>');
    const previewAt = html.indexOf('<script src="generic-math-map-preview-loader.js"></script>');
    const controllerAt = html.indexOf(`<script src="${loader}"></script>`);
    assert.ok(previewAt >= 0, `${page} loads generic-math-map-preview-loader.js`);
    assert.ok(contentAt < previewAt, `${page} loads validation before preview`);
    assert.ok(previewAt < controllerAt, `${page} loads preview before ${loader}`);
    assert.match(read(loader), /GammaGenericMathMapPreviewLoader/);
  }
});

test("current Math Map pages do not expose a synthetic Route switcher", () => {
  for (const { page } of mapPages) {
    const html = read(page);
    assert.doesNotMatch(html, /route-switcher|route-options|data-route/);
  }

  const workspace = read("math-map-lab.js");
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
