import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const {
  IDB_DATABASE_NAME,
  IDB_DATABASE_VERSION,
  IDB_STATE_KEY,
  IDB_STORE_MAPS,
  IDB_STORE_STATE,
  createHttpMapLibraryAdapter,
  createIndexedDbMapLibraryAdapter,
  createMapLibrary,
  createMemoryMapLibraryAdapter,
} = require("../src/map-library/lifecycle.js");
const { createLocalMapStore } = require("../local-map-store.js");

function projectView(id, title = id) {
  return {
    schema: "cmath.project-view-model/v0.1",
    project: { id, title },
    entries: [{ id: `${id}:entry:one`, entryClass: "fact", title: "对象" }],
    inferences: [],
  };
}

test("Map Library 通过内存适配器完成加载、保存、删除与组织状态生命周期", async () => {
  const adapter = createMemoryMapLibraryAdapter();
  const library = createMapLibrary({ adapter });
  const fallbackState = {
    customFolders: [{ id: "f1", name: "代数", createdAt: 1 }],
    assignments: { "imported:one": "f1" },
    orders: { f1: ["imported:one"] },
    collapsed: { f1: true },
    updatedAt: 2,
  };

  const initial = await library.load({
    maps: [{ id: "imported:one", data: projectView("one", "第一张"), importedAt: 3 }],
    state: fallbackState,
  });
  assert.deepEqual(initial.maps.map((map) => map.id), ["imported:one"]);
  assert.equal(initial.state.customFolders[0].name, "代数");

  await library.saveMap({ id: "imported:two", data: projectView("two", "第二张"), importedAt: 4 });
  await library.deleteMap("imported:one");
  await library.saveState({
    customFolders: [{ id: "f2", name: "拓扑", createdAt: 5 }],
    assignments: { "imported:two": "f2" },
    orders: { f2: ["imported:two"] },
    collapsed: { f2: false },
    updatedAt: 6,
  });

  const reloaded = await library.load();
  assert.deepEqual(reloaded.maps.map((map) => map.id), ["imported:two"]);
  assert.equal(reloaded.maps[0].title, "第二张");
  assert.deepEqual(reloaded.state.customFolders, [{ id: "f2", name: "拓扑", createdAt: 5 }]);
  assert.equal(reloaded.state.assignments["imported:two"], "f2");
  assert.deepEqual(reloaded.state.orders.f2, ["imported:two"]);
  assert.equal(reloaded.state.collapsed.f2, false);
});

test("浏览器 IndexedDB 不可用时保留当前会话地图与组织状态", async () => {
  assert.equal(IDB_DATABASE_NAME, "cmath_math_map_db");
  assert.equal(IDB_DATABASE_VERSION, 1);
  assert.equal(IDB_STORE_MAPS, "maps");
  assert.equal(IDB_STORE_STATE, "library_state");
  assert.equal(IDB_STATE_KEY, "current");
  const errors = [];
  const library = createMapLibrary({
    adapter: createIndexedDbMapLibraryAdapter({ indexedDB: null }),
    onError: (stage, error) => errors.push([stage, error]),
  });
  const fallbackMap = { id: "imported:fallback", data: projectView("fallback"), importedAt: 7 };
  const fallbackState = {
    customFolders: [{ id: "fallback-folder", name: "会话分类", createdAt: 8 }],
    assignments: { "imported:fallback": "fallback-folder" },
  };

  const loaded = await library.load({ maps: [fallbackMap], state: fallbackState });
  const saved = await library.saveMap(fallbackMap);

  assert.deepEqual(loaded.maps.map((map) => map.id), ["imported:fallback"]);
  assert.equal(loaded.state.customFolders[0].name, "会话分类");
  assert.equal(saved.id, "imported:fallback");
  assert.deepEqual(errors, []);
});

test("桌面 HTTP 适配器保持既有路由与请求合同，并显式报告地图写入失败", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url === "/api/maps" && init.method === "POST") {
      const record = JSON.parse(init.body);
      return { ok: true, status: 201, json: async () => record };
    }
    if (url === "/api/maps" && !init.method) {
      return { ok: true, status: 200, json: async () => ({ maps: [] }) };
    }
    if (url === "/api/library-state" && !init.method) {
      return { ok: true, status: 200, json: async () => null };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const adapter = createHttpMapLibraryAdapter({ fetchImpl });
  const library = createMapLibrary({ adapter });
  const record = { id: "imported:http", data: projectView("http"), importedAt: 9 };

  await library.load();
  await library.saveMap(record);
  await library.deleteMap(record.id);
  await library.saveState({ customFolders: [] });

  assert.deepEqual(calls.map((call) => [call.url, call.init.method || "GET"]), [
    ["/api/maps", "GET"],
    ["/api/library-state", "GET"],
    ["/api/maps", "POST"],
    ["/api/maps/imported%3Ahttp", "DELETE"],
    ["/api/library-state", "PUT"],
  ]);

  const failedLibrary = createMapLibrary({
    adapter: createHttpMapLibraryAdapter({
      fetchImpl: async () => ({
        ok: false,
        status: 507,
        json: async () => ({ error: "disk full" }),
      }),
    }),
  });
  await assert.rejects(failedLibrary.saveMap(record), /disk full/u);
});

test("文件系统适配器的持久化失败不会被吞掉", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-library-failure-"));
  const blockedDirectory = path.join(temporaryRoot, "maps");
  fs.writeFileSync(blockedDirectory, "not a directory");
  try {
    const store = createLocalMapStore(blockedDirectory);
    assert.throws(
      () => store.put({ id: "imported:disk", data: projectView("disk"), importedAt: 10 }),
      /EEXIST|not a directory|ENOTDIR/iu,
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("浏览器普通 script 加载暴露生命周期接口", () => {
  const source = fs.readFileSync(
    new URL("../src/map-library/lifecycle.js", import.meta.url),
    "utf8",
  );
  const context = vm.createContext({
    console,
    window: { CMathMapLibraryCore: require("../src/map-library/core.js") },
  });
  vm.runInContext(source, context, { filename: "src/map-library/lifecycle.js" });
  assert.equal(typeof context.window.CMathMapLibraryLifecycle.createMapLibrary, "function");
  assert.equal(typeof context.window.CMathMapLibraryLifecycle.createIndexedDbMapLibraryAdapter, "function");
});

test("生产加载图在界面前装配生命周期，界面不再直接编排底层存储", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app-v5.js", import.meta.url), "utf8");
  const coreIndex = html.indexOf('src="src/map-library/core.js');
  const lifecycleIndex = html.indexOf('src="src/map-library/lifecycle.js');
  const appIndex = html.indexOf('src="app-v5.js');

  assert.ok(coreIndex >= 0 && coreIndex < lifecycleIndex);
  assert.ok(lifecycleIndex < appIndex);
  assert.doesNotMatch(app, /\/api\/(?:maps|library-state)|indexedDB/u);
  assert.match(app, /mapLibrary\.(?:load|saveMap|saveMaps|deleteMap|saveState)/u);
});
