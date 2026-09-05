import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createLocalLibraryStateStore,
  normalizeLibraryState,
  LIBRARY_STATE_SCHEMA,
  BACKUP_SCHEMA,
  validateBackupPayload,
  mergeLibraryBackup,
} = require("../src/map-library/local-library-state.js");

function createSampleProjectView(title = "测试项目", id = "test-proj") {
  return {
    schema: "cmath.project-view-model/v0.1",
    project: { id, title },
    entries: [{ id: `${id}:entry:1`, entryClass: "fact", title: "定理1" }],
    inferences: [],
  };
}

test("normalizeLibraryState produces clean defaults for empty or invalid input", () => {
  const normalized = normalizeLibraryState(null);
  assert.equal(normalized.schema, LIBRARY_STATE_SCHEMA);
  assert.deepEqual(normalized.customFolders, []);
  assert.deepEqual(normalized.assignments, {});
  assert.deepEqual(normalized.orders, {});
  assert.deepEqual(normalized.collapsed, { curated: false, myMaps: false, builtin: false });
  assert.ok(Number.isFinite(normalized.updatedAt));
});

test("normalizeLibraryState sanitizes folders, deduplicates IDs, and filters assignments", () => {
  const raw = {
    customFolders: [
      { id: "f1", name: "代数几何", createdAt: 100 },
      { id: "f1", name: "重复应被去重", createdAt: 200 },
      { id: "   ", name: "空ID应被过滤" },
      { id: "f2", name: "微分拓扑" },
    ],
    assignments: {
      "map-1": "f1",
      "map-2": "f2",
      "map-3": "non-existent-folder",
      "map-4": "myMaps",
    },
    orders: {
      f1: ["map-1", "map-1", "map-99"],
      myMaps: ["map-4", "map-4"],
    },
    collapsed: {
      curated: true,
      f1: true,
      f2: false,
    },
  };

  const normalized = normalizeLibraryState(raw);
  assert.equal(normalized.customFolders.length, 2);
  assert.equal(normalized.customFolders[0].id, "f1");
  assert.equal(normalized.customFolders[0].name, "代数几何");
  assert.equal(normalized.customFolders[1].id, "f2");

  assert.equal(normalized.assignments["map-1"], "f1");
  assert.equal(normalized.assignments["map-2"], "f2");
  assert.equal(normalized.assignments["map-3"], undefined);
  assert.equal(normalized.assignments["map-4"], "myMaps");

  assert.deepEqual(normalized.orders.f1, ["map-1", "map-99"]);
  assert.deepEqual(normalized.orders.myMaps, ["map-4"]);

  assert.equal(normalized.collapsed.curated, true);
  assert.equal(normalized.collapsed.f1, true);
  assert.equal(normalized.collapsed.f2, false);
});

test("createLocalLibraryStateStore reads, writes atomically, and persists to disk", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-lib-state-"));
  const filePath = path.join(tmpDir, "library-state.json");
  try {
    const store = createLocalLibraryStateStore(filePath);

    // Initial read on non-existent file returns valid defaults
    const initial = store.read();
    assert.equal(initial.schema, LIBRARY_STATE_SCHEMA);
    assert.deepEqual(initial.customFolders, []);

    // Write valid state
    const saved = store.write({
      customFolders: [{ id: "custom-1", name: "我的测试分类" }],
      assignments: { "imported:test-1": "custom-1" },
      orders: { "custom-1": ["imported:test-1"] },
      collapsed: { "custom-1": true },
    });

    assert.equal(saved.customFolders[0].name, "我的测试分类");
    assert.equal(fs.existsSync(filePath), true);

    // Re-read from disk
    const reloaded = store.read();
    assert.equal(reloaded.customFolders.length, 1);
    assert.equal(reloaded.customFolders[0].id, "custom-1");
    assert.equal(reloaded.assignments["imported:test-1"], "custom-1");
    assert.deepEqual(reloaded.orders["custom-1"], ["imported:test-1"]);
    assert.equal(reloaded.collapsed["custom-1"], true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("validateBackupPayload validates schema and filters malformed maps", () => {
  assert.throws(() => validateBackupPayload(null), /必须是 JSON 对象/u);
  assert.throws(() => validateBackupPayload({ schema: "bad.schema/v1" }), /未知或不受支持的备份版本/u);
  assert.throws(() => validateBackupPayload({ schema: BACKUP_SCHEMA }), /缺少地图数据列表/u);

  const validated = validateBackupPayload({
    schema: BACKUP_SCHEMA,
    maps: [
      { id: "map-ok", title: "正常地图", data: createSampleProjectView("地图A", "map-a") },
      { id: "map-bad", data: { invalid: true } }, // Should be safely ignored
      { id: "", data: createSampleProjectView("无ID") }, // Should be ignored
    ],
    library: {
      customFolders: [{ id: "f1", name: "拓扑" }],
    },
  });

  assert.equal(validated.schema, BACKUP_SCHEMA);
  assert.equal(validated.maps.length, 1);
  assert.equal(validated.maps[0].id, "map-ok");
  assert.equal(validated.maps[0].title, "正常地图");
});

test("backup validation retains VNext generation metadata and strict map compatibility", () => {
  const map = createSampleProjectView("部分地图", "partial");
  const generatedResult = {
    schema: "cmath.paper-to-map-result/v1", status: "degraded", map,
    sourceAnnotations: { items: [] }, unresolvedItems: [],
    diagnostics: { missingStages: ["inference"] }, stages: {},
    identity: { contentFingerprint: "digest", frozenWorkflow: { label: "vnext" } },
  };
  const validated = validateBackupPayload({
    schema: BACKUP_SCHEMA,
    maps: [{ id: "imported:partial", generatedResult }],
  });
  assert.equal(validated.maps.length, 1);
  assert.deepEqual(validated.maps[0].data, map);
  assert.equal(validated.maps[0].generatedResult.status, "degraded");
});

test("mergeLibraryBackup deterministically merges maps and handles ID conflicts", () => {
  const currentMaps = [
    {
      id: "imported:same",
      title: "相同地图",
      data: createSampleProjectView("相同内容", "same"),
    },
    {
      id: "imported:conflict",
      title: "已有版本",
      data: createSampleProjectView("已有内容", "orig"),
    },
  ];

  const currentLibraryState = {
    customFolders: [{ id: "f_algebra", name: "代数" }],
    assignments: { "imported:same": "f_algebra" },
    orders: { f_algebra: ["imported:same"], myMaps: ["imported:conflict"] },
    collapsed: { f_algebra: false },
  };

  const backupPayload = {
    schema: BACKUP_SCHEMA,
    maps: [
      // 1. Identical map: same id and same content
      {
        id: "imported:same",
        title: "相同地图",
        data: createSampleProjectView("相同内容", "same"),
      },
      // 2. Conflicting map: same id but different content
      {
        id: "imported:conflict",
        title: "备份中的不同版本",
        data: createSampleProjectView("新内容", "new"),
      },
      // 3. Brand new map
      {
        id: "imported:fresh",
        title: "全新地图",
        data: createSampleProjectView("全新内容", "fresh"),
      },
    ],
    library: {
      customFolders: [
        // Name matches existing "代数" -> should reuse f_algebra
        { id: "f_old_algebra", name: "代数" },
        // New folder
        { id: "f_geometry", name: "几何" },
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
      collapsed: {
        f_geometry: true,
      },
    },
  };

  const result = mergeLibraryBackup(currentMaps, currentLibraryState, backupPayload);

  // Total maps should be 4: current 2 + 1 renamed conflict + 1 fresh
  assert.equal(result.mergedMaps.length, 4);
  assert.equal(result.newAddedMaps.length, 2);

  // Check that the conflicting map was renamed
  const renamed = result.mergedMaps.find((m) => m.id.startsWith("imported:conflict-restored"));
  assert.ok(renamed, "Conflicting map must be renamed to avoid overwriting existing map");
  assert.equal(renamed.data.project.title, "新内容");

  // Check folders: "代数" was reused, "几何" was added
  assert.equal(result.libraryState.customFolders.length, 2);
  const algebraFolder = result.libraryState.customFolders.find((f) => f.name === "代数");
  assert.equal(algebraFolder.id, "f_algebra");
  const geometryFolder = result.libraryState.customFolders.find((f) => f.name === "几何");
  assert.ok(geometryFolder);

  // Check assignments rewritten for the renamed map
  assert.equal(result.libraryState.assignments[renamed.id], geometryFolder.id);
  assert.equal(result.libraryState.assignments["imported:fresh"], geometryFolder.id);

  // Check orders rewritten
  assert.ok(result.libraryState.orders[geometryFolder.id].includes(renamed.id));
  assert.ok(result.libraryState.orders[geometryFolder.id].includes("imported:fresh"));

  // Check collapsed state merged
  assert.equal(result.libraryState.collapsed[geometryFolder.id], true);
});
