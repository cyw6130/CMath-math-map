import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import capabilityRuntimeModule from "../src/runtime/capabilities.js";
import paperImportWorkbenchModule from "../src/workbench/paper-import.js";

function runtimeRoot(overrides = {}) {
  const calls = [];
  const library = {
    async deleteMap() {},
    async load() { return { maps: [], state: {} }; },
    mergeMaps(...collections) { return collections.flat(); },
    async saveMap(record) { return record; },
    async saveMaps(records) { return records; },
    async saveState(state) { return state; },
  };
  return {
    location: { hostname: "localhost" },
    console: { warn() {} },
    CMathPaperImportProductionFacade: {
      MODULE_ID: "cmath.paper-import.production/v1",
      endpointUrl: (value) => value,
      async requestPaperProductionImport() {},
    },
    CMathMapLibraryCore: {
      PROJECT_VIEW_SCHEMA: "cmath.project-view-model/v0.1",
      generatedMapView: (value) => value.map ?? value,
      isCanonicalMathMap: () => true,
      mergeLibraryBackup: () => ({}),
      normalizeLibraryState: (value) => value,
      sanitizeGeneratedResult: (value) => value,
    },
    CMathMapLibraryLifecycle: {
      createHttpMapLibraryAdapter() { calls.push("http"); return { kind: "http" }; },
      createIndexedDbMapLibraryAdapter() { calls.push("indexeddb"); return { kind: "indexeddb" }; },
      createMapLibrary({ adapter }) { calls.push(adapter.kind); return library; },
    },
    GammaMathMapSemanticsV3: {
      CAPABILITY_ID: "cmath-gamma.math-map-semantics/v3",
      deriveMathState() {},
    },
    GammaMathMapSemantics: { computeClaimClosure() {} },
    GammaMathMapContentLoader: {
      PROJECT_VIEW_SCHEMA: "cmath.project-view-model/v0.1",
      async load() {},
    },
    GammaMathMapProjectAdapter: {
      CAPABILITY_ID: "cmath-gamma.alpha-project-adapter/v0.2",
      create() {},
    },
    GammaCanonicalMathMapAdapter: { create() {} },
    CMathProductFocusPresentation: { installProductFocusPresentation() {} },
    GammaGenericMathMapPreviewLoader: { async loadFile() {} },
    fetch: globalThis.fetch,
    Response: globalThis.Response,
    calls,
    ...overrides,
  };
}

test("Capability Runtime validates identities once and hides the host storage adapter", () => {
  const localRoot = runtimeRoot();
  const localRuntime = capabilityRuntimeModule.createCapabilityRuntime({ root: localRoot });
  assert.equal(localRuntime.id, "cmath.capability-runtime/v1");
  assert.deepEqual(localRoot.calls, ["http", "http"]);
  assert.equal(typeof localRuntime.paperImport.requestPaperProductionImport, "function");
  assert.equal(typeof localRuntime.mapLibrary.saveMap, "function");
  assert.equal(typeof localRuntime.mapRuntime.canonicalAdapter.create, "function");
  assert.equal(typeof localRuntime.mapRuntime.projectArchiveToMathState, "function");

  const webRoot = runtimeRoot({ location: { hostname: "cyw6130.github.io" } });
  capabilityRuntimeModule.createCapabilityRuntime({ root: webRoot });
  assert.deepEqual(webRoot.calls, ["indexeddb", "indexeddb"]);

  const incompatible = runtimeRoot();
  incompatible.CMathPaperImportProductionFacade.MODULE_ID = "unknown";
  assert.throws(
    () => capabilityRuntimeModule.createCapabilityRuntime({ root: incompatible }),
    /拒绝不兼容的 Paper Import/u,
  );
  assert.deepEqual(incompatible.calls, [], "fail-close happens before storage or model side effects");

  const incompatibleMapRuntime = runtimeRoot();
  incompatibleMapRuntime.GammaMathMapSemanticsV3.CAPABILITY_ID = "unknown";
  assert.throws(
    () => capabilityRuntimeModule.createCapabilityRuntime({ root: incompatibleMapRuntime }),
    /拒绝不兼容的 Math Map Semantics/u,
  );
  assert.deepEqual(incompatibleMapRuntime.calls, [], "all capabilities fail-close before host adapter setup");
});

test("Capability Runtime projects archive records only through the synchronized adapter", async () => {
  const runtime = capabilityRuntimeModule.createCapabilityRuntime({ root: runtimeRoot() });
  const projected = await runtime.mapRuntime.projectArchiveToMathState({
    entries: [],
    inferences: [],
    negationPairs: [],
    b0ClaimEntryIds: [],
  });
  assert.deepEqual(projected, {
    mathState: { entries: [], inferences: [], negationPairs: [], b0ClaimEntryIds: [] },
    issues: [],
  });
});

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    if (force === undefined ? !this.values.has(value) : force) this.values.add(value);
    else this.values.delete(value);
  }
  toString() { return [...this.values].join(" "); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.textContent = "";
    this.value = "";
    this.files = [];
    this._innerHTML = "";
  }
  set className(value) {
    this.classList = new FakeClassList();
    String(value).split(/\s+/u).filter(Boolean).forEach((item) => this.classList.add(item));
  }
  get className() { return this.classList.toString(); }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    if (this._innerHTML.includes("extract-steps")) {
      const list = new FakeElement("ol");
      list.className = "extract-steps";
      for (const id of ["mineru", "generate", "repair", "validate", "save"]) {
        const item = new FakeElement("li");
        item.dataset.step = id;
        const detail = new FakeElement("span");
        detail.className = "step-detail";
        item.appendChild(detail);
        list.appendChild(item);
      }
      this.appendChild(list);
    }
    for (const className of [
      "extract-error-text",
      "extract-open-map",
      "extract-open-library",
      "extract-dismiss",
      "extract-retry-provided",
      "extract-use-own",
    ]) {
      if (this._innerHTML.includes(className)) {
        const child = new FakeElement(className.includes("text") ? "p" : "button");
        child.className = className;
        this.appendChild(child);
      }
    }
  }
  get innerHTML() { return this._innerHTML; }
  get outerHTML() {
    return `<${this.tagName.toLowerCase()} class="${this.className}">${this.children.map((child) => child.outerHTML).join("")}</${this.tagName.toLowerCase()}>`;
  }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  before(child) {
    const index = this.parentElement.children.indexOf(this);
    child.parentElement = this.parentElement;
    this.parentElement.children.splice(index, 0, child);
  }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(type, handler, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, once: options?.once === true });
  }
  removeEventListener(type, handler) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry.handler !== handler));
  }
  dispatchEvent(event) {
    event.target ??= this;
    event.currentTarget = this;
    const entries = [...(this.listeners.get(event.type) ?? [])];
    for (const entry of entries) {
      entry.handler(event);
      if (entry.once) this.removeEventListener(event.type, entry.handler);
    }
    return true;
  }
  click() { this.dispatchEvent({ type: "click", preventDefault() {} }); }
  focus() {}
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selector === "li" && child.tagName === "LI") matches.push(child);
        else if (selector.startsWith(".") && child.classList.contains(selector.slice(1))) matches.push(child);
        else if (selector.startsWith("#") && child.id === selector.slice(1)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

function workbenchHarness() {
  const elements = new Map();
  const define = (selector, element = new FakeElement()) => { elements.set(selector, element); return element; };
  const paperDrawer = define("#paper-drawer");
  const dropZone = new FakeElement();
  dropZone.className = "pdf-drop-zone";
  const dropMain = new FakeElement();
  dropMain.className = "drop-main";
  dropMain.textContent = "选择 PDF";
  const dropSub = new FakeElement();
  dropSub.className = "drop-sub";
  dropSub.textContent = "不超过 200 MB";
  dropZone.appendChild(dropMain);
  dropZone.appendChild(dropSub);
  paperDrawer.appendChild(dropZone);
  const footer = new FakeElement();
  const startButton = define("#btn-start-extract", new FakeElement("button"));
  startButton.textContent = "生成数学地图";
  footer.appendChild(startButton);
  paperDrawer.appendChild(footer);
  for (const selector of [
    "#model-consent-card",
    "#btn-accept-model-consent",
    "#btn-use-own-model",
    "#btn-topbar-settings",
    "#btn-close-paper-drawer",
    "#card-curated-demos",
    "#api-key-input",
    "#api-endpoint-input",
    "#remember-key-input",
    "#model-select",
    "#custom-model-input",
  ]) define(selector, new FakeElement(selector.includes("btn") ? "button" : "input"));
  define('input[name="model-access-mode"][value="own"]', new FakeElement("input"));
  elements.get("#remember-key-input").checked = true;
  elements.get("#api-endpoint-input").value = "https://model.example/v1";
  elements.get("#model-select").value = "deepseek-chat";

  class FakeEvent {
    constructor(type) { this.type = type; }
    preventDefault() {}
  }
  const localStorage = new MemoryStorage({
    "cmath.math-map.model-access-mode-v1": "own",
    "cmath.math-map.saved-model-config-v1": JSON.stringify({
      provider: "deepseek",
      endpoint: "https://model.example/v1",
      model: "deepseek-chat",
    }),
  });
  const sessionStorage = new MemoryStorage({
    "cmath.math-map.session-keys": JSON.stringify({ deepseek: "secret" }),
  });
  const root = {
    documentElement: { dataset: { mineruGatewayUrl: "https://mineru.example" } },
    defaultView: {
      AbortController,
      Event: FakeEvent,
      fflate: { unzipSync: (value) => value },
      fetch: async () => ({ ok: true }),
      localStorage,
      location: { hostname: "example.com" },
      sessionStorage,
    },
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => elements.get(selector) ?? null,
  };
  return { elements, paperDrawer, root, startButton };
}

test("Paper Import Workbench mounts once, saves before handoff, and disposes cleanly", async () => {
  const harness = workbenchHarness();
  const events = [];
  const map = {
    schema: "cmath.math-map/v3",
    project: { id: "paper", title: "Paper" },
    entries: [],
    inferences: [],
  };
  const result = {
    schema: "cmath.paper-to-map-result/v1",
    map,
    diagnostics: { missingStages: [], runReport: { repairAttempts: 0 } },
    unresolvedItems: [],
    identity: {
      contentFingerprint: "fingerprint",
      frozenWorkflow: { capabilitySyncIdentity: "capability", productionContractVersion: "contract" },
    },
  };
  const runtime = {
    paperImport: {
      endpointUrl: (value) => value,
      fetch: globalThis.fetch,
      V5_PROGRESS_STAGES: [
        { id: "mineru", label: "解析论文" },
        { id: "generate", label: "生成数学地图" },
        { id: "repair", label: "检查并修正地图" },
        { id: "validate", label: "检查地图格式" },
      ],
      async requestPaperProductionImport() { events.push("import"); return result; },
    },
    mapLibrary: {
      generatedMapView: (value) => value.map,
      isCanonicalMathMap: () => true,
      sanitizeGeneratedResult: (value) => value,
      async saveMap(record) { events.push("save"); return record; },
    },
  };
  const onMapReady = ({ open }) => { events.push(open ? "open" : "ready"); };
  const first = paperImportWorkbenchModule.mountPaperImportWorkbench({
    root: harness.root,
    runtime,
    onMapReady,
  });
  const second = paperImportWorkbenchModule.mountPaperImportWorkbench({
    root: harness.root,
    runtime,
    onMapReady,
  });
  assert.equal(second, first);

  const pdfInput = harness.paperDrawer.children.find((child) => child.type === "file");
  pdfInput.files = [{ name: "paper.pdf", size: 1024 }];
  pdfInput.dispatchEvent({ type: "change", preventDefault() {} });
  harness.startButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["import", "save", "ready"]);

  const status = harness.paperDrawer.children.find((child) => child.classList.contains("extract-status"));
  status.querySelector(".extract-open-map").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["import", "save", "ready", "open"]);

  first.dispose();
  let failedReady = 0;
  const failingRuntime = {
    ...runtime,
    mapLibrary: {
      ...runtime.mapLibrary,
      async saveMap() { events.push("save-failed"); throw new Error("save failed"); },
    },
  };
  const remounted = paperImportWorkbenchModule.mountPaperImportWorkbench({
    root: harness.root,
    runtime: failingRuntime,
    onMapReady() { failedReady += 1; },
  });
  assert.notEqual(remounted, first);
  const remountedInput = harness.paperDrawer.children.find((child) => child.type === "file");
  remountedInput.files = [{ name: "paper.pdf", size: 1024 }];
  remountedInput.dispatchEvent({ type: "change", preventDefault() {} });
  harness.startButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(failedReady, 0);
  assert.deepEqual(events.slice(-2), ["import", "save-failed"]);
  remounted.dispose();
});

test("Paper Import Workbench turns the active action into a stop control", async () => {
  const harness = workbenchHarness();
  let importSignal;
  let saved = false;
  const runtime = {
    paperImport: {
      endpointUrl: (value) => value,
      fetch: globalThis.fetch,
      V5_PROGRESS_STAGES: [
        { id: "mineru", label: "解析论文" },
        { id: "generate", label: "生成" },
        { id: "repair", label: "修复" },
        { id: "validate", label: "校验" },
      ],
      requestPaperProductionImport({ signal }) {
        importSignal = signal;
        return new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve({ ignoredAbort: true }), { once: true });
        });
      },
    },
    mapLibrary: {
      generatedMapView: (value) => value,
      isCanonicalMathMap: () => true,
      sanitizeGeneratedResult: (value) => value,
      async saveMap(value) { saved = true; return value; },
    },
  };
  const mounted = paperImportWorkbenchModule.mountPaperImportWorkbench({
    root: harness.root,
    runtime,
    onMapReady() {},
  });
  const pdfInput = harness.paperDrawer.children.find((child) => child.type === "file");
  pdfInput.files = [{ name: "paper.pdf", size: 1024 }];
  pdfInput.dispatchEvent({ type: "change", preventDefault() {} });

  harness.startButton.click();
  assert.equal(harness.startButton.textContent, "停止解析");
  assert.equal(harness.startButton.disabled, false);

  harness.startButton.click();
  assert.equal(importSignal.aborted, true);
  assert.equal(harness.startButton.textContent, "正在停止…");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(saved, false);
  assert.equal(harness.startButton.textContent, "生成数学地图");
  assert.equal(harness.startButton.disabled, false);
  assert.equal(harness.startButton.classList.contains("is-stop-action"), false);
  const status = harness.paperDrawer.children.find((child) => child.classList.contains("extract-status"));
  assert.match(status.innerHTML, /解析已停止/u);
  mounted.dispose();
});

test("Paper Import Workbench treats MinerU cancellation as a stopped import", async () => {
  const harness = workbenchHarness();
  const runtime = {
    paperImport: {
      endpointUrl: (value) => value,
      fetch: globalThis.fetch,
      V5_PROGRESS_STAGES: [{ id: "mineru", label: "解析论文" }],
      requestPaperProductionImport({ signal }) {
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("操作已取消");
            error.code = "MINERU_ABORTED";
            reject(error);
          }, { once: true });
        });
      },
    },
    mapLibrary: {
      generatedMapView: (value) => value,
      isCanonicalMathMap: () => true,
      sanitizeGeneratedResult: (value) => value,
      async saveMap(value) { return value; },
    },
  };
  const mounted = paperImportWorkbenchModule.mountPaperImportWorkbench({
    root: harness.root,
    runtime,
    onMapReady() {},
  });
  const pdfInput = harness.paperDrawer.children.find((child) => child.type === "file");
  pdfInput.files = [{ name: "paper.pdf", size: 1024 }];
  pdfInput.dispatchEvent({ type: "change", preventDefault() {} });

  harness.startButton.click();
  harness.startButton.click();
  await new Promise((resolve) => setImmediate(resolve));

  const status = harness.paperDrawer.children.find((child) => child.classList.contains("extract-status"));
  assert.match(status.innerHTML, /解析已停止/u);
  mounted.dispose();
});

test("production entry loads Runtime and Workbench before the application shell", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const runtimeAt = html.indexOf('src="src/runtime/capabilities.js');
  const workbenchAt = html.indexOf('src="src/workbench/paper-import.js');
  const appAt = html.indexOf('src="app-v5.js');
  assert.ok(runtimeAt >= 0 && runtimeAt < workbenchAt && workbenchAt < appAt);
});
