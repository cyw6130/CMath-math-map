import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeCore = require("../src/map-library/core.js");

function projectView(id = "paper:test") {
  return {
    schema: "cmath.project-view-model/v0.1",
    project: { id, title: "测试地图" },
    entries: [{ id: `${id}:entry:one`, entryClass: "fact", title: "对象" }],
    inferences: [],
  };
}

function canonicalMap(entries = [
  { id: "claim:main", entryClass: "claim", claimKind: "theorem", title: "Main", statement: "Main claim" },
]) {
  return { entries, inferences: [], negationPairs: [], b0ClaimEntryIds: [] };
}

function loadBrowserCore() {
  const window = {
    CMathPaperImportCheckpointStore: require("../src/paper-import/workflow/checkpoint-store.js"),
    GammaMathMapSemanticsV3: require("../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js"),
    GammaCanonicalMathMapAdapter: require("../canonical-math-map-adapter.js"),
  };
  const context = vm.createContext({ window, globalThis: window, structuredClone });
  const source = fs.readFileSync(path.join(root, "src/map-library/core.js"), "utf8");
  vm.runInContext(source, context, { filename: "src/map-library/core.js" });
  return window.CMathMapLibraryCore;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Map Library 在浏览器与 Node 中形成相同的 Project View 地图记录", () => {
  const input = { id: "imported:paper-test", data: projectView(), importedAt: 7 };
  const expected = {
    schema: "cmath.local-map-record/v1",
    id: "imported:paper-test",
    title: "测试地图",
    boundaryLabel: "本地导入 · 数学地图",
    importedAt: 7,
    isImported: true,
    data: projectView(),
  };

  assert.deepEqual(nodeCore.normalizeMapRecord(input), expected);
  assert.deepEqual(plain(loadBrowserCore().normalizeMapRecord(input)), expected);
});

test("Map Library 在浏览器与 Node 中保持 Canonical 地图的永久编号", () => {
  const firstInput = { id: "imported:canonical", title: "Canonical", data: canonicalMap(), importedAt: 8 };
  const nodeFirst = nodeCore.normalizeMapRecord(firstInput);
  const browserFirst = plain(loadBrowserCore().normalizeMapRecord(firstInput));
  assert.deepEqual(browserFirst, nodeFirst);
  assert.deepEqual(nodeFirst.numberingLedger.allocations["claim:main"], {
    kind: "定理",
    number: 1,
    state: "active",
  });

  const expandedData = canonicalMap([
    { id: "claim:added-earlier", entryClass: "claim", claimKind: "theorem", title: "Added", statement: "Added claim" },
    ...firstInput.data.entries,
  ]);
  const nodeExpanded = nodeCore.normalizeMapRecord({
    ...firstInput,
    data: expandedData,
    numberingLedger: nodeFirst.numberingLedger,
  });
  const browserExpanded = plain(loadBrowserCore().normalizeMapRecord({
    ...firstInput,
    data: expandedData,
    numberingLedger: browserFirst.numberingLedger,
  }));

  assert.deepEqual(browserExpanded, nodeExpanded);
  assert.deepEqual(nodeExpanded.numberingLedger.allocations["claim:main"], {
    kind: "定理",
    number: 1,
    state: "active",
  });
  assert.deepEqual(nodeExpanded.numberingLedger.allocations["claim:added-earlier"], {
    kind: "定理",
    number: 2,
    state: "active",
  });
});

test("Map Library 在浏览器与 Node 中以 Generated Map 封装作为保存权威", () => {
  const generatedResult = {
    schema: "cmath.paper-to-map-result/v1",
    status: "degraded",
    map: projectView("paper:partial"),
    sourceAnnotations: { source: { fileName: "paper.pdf", pageCount: 1 }, items: [] },
    unresolvedItems: [{
      id: "unresolved:entry:1",
      sourceStage: "entry",
      candidateSummary: "candidate",
      failureCategory: "candidate-invalid",
      validationError: "invalid",
      retryable: true,
    }],
    diagnostics: { mainTargetIdentified: false, openClaimCount: 0, mainProofChainComplete: false, missingStages: ["entry"] },
    stages: { entry: { status: "degraded", attempt: 1 }, closure: { status: "complete", attempt: 1 } },
    identity: { contentFingerprint: "digest", frozenWorkflow: { label: "paper-to-map-vnext" } },
    unexpected: "drop-me",
  };
  const input = {
    id: "imported:partial",
    data: projectView("paper:stale"),
    generatedResult,
    importedAt: 9,
  };

  const nodeRecord = nodeCore.normalizeMapRecord(input);
  const browserRecord = plain(loadBrowserCore().normalizeMapRecord(input));
  assert.deepEqual(browserRecord, nodeRecord);
  assert.equal(nodeRecord.data.project.id, "paper:partial");
  assert.equal(nodeRecord.generatedResult.status, "degraded");
  assert.deepEqual(nodeRecord.generatedResult.diagnostics.missingStages, ["entry"]);
  assert.equal(nodeRecord.generatedResult.unexpected, undefined);
});

test("Map Library 拒绝无效地图与损坏的 Generated Map 封装", () => {
  assert.throws(
    () => nodeCore.normalizeMapRecord({ id: "invalid:map", data: {} }),
    /expected cmath\.project-view-model/u,
  );
  assert.throws(
    () => nodeCore.normalizeMapRecord({
      id: "invalid:generated",
      generatedResult: { schema: "cmath.paper-to-map-result/v1", map: {} },
    }),
    /Generated Map 合同/u,
  );
});

test("生产页面在应用启动前加载 Map Library 核心", () => {
  for (const entry of ["index.html", "index-v5.html"]) {
    const html = fs.readFileSync(path.join(root, entry), "utf8");
    const adapterIndex = html.indexOf('src="canonical-math-map-adapter.js');
    const checkpointIndex = html.indexOf('src="src/paper-import/workflow/checkpoint-store.js');
    const coreIndex = html.indexOf('src="src/map-library/core.js');
    const appIndex = html.indexOf('src="app-v5.js');
    assert.ok(adapterIndex >= 0 && adapterIndex < coreIndex, `${entry} 应先加载 Canonical 地图适配器`);
    assert.ok(checkpointIndex >= 0 && checkpointIndex < coreIndex, `${entry} 应先加载 Generated Map 规整依赖`);
    assert.ok(coreIndex < appIndex, `${entry} 应在应用启动前加载 Map Library 核心`);
  }

  const app = fs.readFileSync(path.join(root, "app-v5.js"), "utf8");
  assert.match(app, /window\.CMathMapLibraryCore/u);
  assert.match(app, /normalizeLibraryState/u);
  assert.doesNotMatch(app, /function (?:validateBackupPayload|mergeLibraryBackup)\(/u);
});

test("Node Map Library 不覆盖已有的旧版数学语义全局", () => {
  const previous = globalThis.GammaMathMapSemantics;
  const legacySentinel = Object.freeze({
    deriveMathState() {
      throw new Error("不应使用旧版语义全局校验 Canonical 地图");
    },
  });
  const modulePath = require.resolve("../src/map-library/core.js");
  try {
    globalThis.GammaMathMapSemantics = legacySentinel;
    delete require.cache[modulePath];
    const isolatedCore = require(modulePath);
    const record = isolatedCore.normalizeMapRecord({
      id: "imported:isolated",
      data: canonicalMap(),
      importedAt: 10,
    });
    assert.equal(record.data.entries[0].id, "claim:main");
    assert.equal(globalThis.GammaMathMapSemantics, legacySentinel);
  } finally {
    delete require.cache[modulePath];
    if (previous === undefined) delete globalThis.GammaMathMapSemantics;
    else globalThis.GammaMathMapSemantics = previous;
  }
});

test("Map Library 在浏览器与 Node 中形成相同的组织状态", () => {
  const input = {
    customFolders: [
      { id: "f1", name: "代数几何", createdAt: 100 },
      { id: "f1", name: "重复文件夹", createdAt: 200 },
      { id: "f2", name: "微分拓扑", createdAt: 300 },
    ],
    assignments: {
      "map-1": "f1",
      "map-2": "missing",
      "map-3": "myMaps",
    },
    orders: {
      f1: ["map-1", "map-1", "map-4"],
      myMaps: ["map-3", "map-3"],
    },
    collapsed: { curated: true, f1: true, f2: false },
    updatedAt: 11,
  };
  const expected = {
    schema: "cmath.local-library-state/v1",
    customFolders: [
      { id: "f1", name: "代数几何", createdAt: 100 },
      { id: "f2", name: "微分拓扑", createdAt: 300 },
    ],
    assignments: { "map-1": "f1", "map-3": "myMaps" },
    orders: { f1: ["map-1", "map-4"], myMaps: ["map-3"] },
    collapsed: { curated: true, myMaps: false, builtin: false, f1: true, f2: false },
    updatedAt: 11,
  };

  assert.deepEqual(nodeCore.normalizeLibraryState(input), expected);
  assert.deepEqual(plain(loadBrowserCore().normalizeLibraryState(input)), expected);
});

test("Map Library 在浏览器与 Node 中以相同规则恢复备份冲突", () => {
  const currentMaps = [
    { id: "imported:same", title: "相同地图", data: projectView("same"), importedAt: 20 },
    { id: "imported:conflict", title: "已有版本", data: projectView("original"), importedAt: 21 },
  ];
  const currentState = {
    customFolders: [{ id: "f_algebra", name: "代数", createdAt: 30 }],
    assignments: { "imported:same": "f_algebra" },
    orders: { f_algebra: ["imported:same"], myMaps: ["imported:conflict"] },
    collapsed: { f_algebra: false },
  };
  const backup = {
    schema: "cmath.math-map.library-backup/v1",
    exportedAt: 40,
    maps: [
      { id: "imported:same", title: "相同地图", data: projectView("same"), importedAt: 20 },
      { id: "imported:conflict", title: "备份版本", data: projectView("changed"), importedAt: 41 },
      { id: "imported:fresh", title: "全新地图", data: projectView("fresh"), importedAt: 42 },
      { id: "invalid", data: {} },
    ],
    library: {
      customFolders: [
        { id: "f_old_algebra", name: "代数", createdAt: 50 },
        { id: "f_geometry", name: "几何", createdAt: 51 },
      ],
      assignments: {
        "imported:same": "f_old_algebra",
        "imported:conflict": "f_geometry",
        "imported:fresh": "f_geometry",
      },
      orders: {
        f_old_algebra: ["imported:same"],
        f_geometry: ["imported:conflict", "imported:fresh"],
      },
      collapsed: { f_geometry: true },
    },
  };

  const nodeResult = plain(nodeCore.mergeLibraryBackup(currentMaps, currentState, backup));
  const browserResult = plain(loadBrowserCore().mergeLibraryBackup(currentMaps, currentState, backup));
  nodeResult.libraryState.updatedAt = 0;
  browserResult.libraryState.updatedAt = 0;
  assert.deepEqual(browserResult, nodeResult);
  assert.equal(nodeResult.mergedMaps.length, 4);
  assert.equal(nodeResult.newAddedMaps.length, 2);
  const renamed = nodeResult.newAddedMaps.find((map) => map.id === "imported:conflict-restored");
  assert.ok(renamed);
  assert.equal(nodeResult.libraryState.assignments[renamed.id], "f_geometry");
  assert.deepEqual(nodeResult.libraryState.orders.f_geometry, [renamed.id, "imported:fresh"]);
  assert.equal(nodeResult.libraryState.collapsed.f_geometry, true);
});

test("Map Library 保留旧备份版本并避让保留地图身份", () => {
  const restored = nodeCore.mergeLibraryBackup([], {}, {
    schema: "cmath.local-library-backup/v1",
    exportedAt: 60,
    maps: [{ id: "builtin:reserved", title: "用户地图", data: projectView("reserved"), importedAt: 61 }],
    library: {},
  }, ["builtin:reserved"]);

  assert.equal(restored.newAddedMaps.length, 1);
  assert.equal(restored.newAddedMaps[0].id, "builtin:reserved-restored");
  assert.equal(restored.libraryState.orders.myMaps.includes("builtin:reserved-restored"), true);
});
