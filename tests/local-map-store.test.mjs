import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createLocalMapStore, normalizeMapRecord } = require("../local-map-store.js");

function projectView(id = "paper:test") {
  return {
    schema: "cmath.project-view-model/v0.1",
    project: { id, title: "测试地图" },
    entries: [{ id: id + ":entry:one", entryClass: "fact", title: "对象" }],
    inferences: [],
  };
}

test("local map store persists and lists a Project View record", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-store-"));
  try {
    const store = createLocalMapStore(directory);
    const saved = store.put({ id: "imported:paper-test", data: projectView(), importedAt: 7 });
    assert.equal(saved.title, "测试地图");
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0].data.entries.length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("local map store replaces the same id atomically", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-store-"));
  try {
    const store = createLocalMapStore(directory);
    store.put({ id: "imported:same", title: "旧", data: projectView("old") });
    store.put({ id: "imported:same", title: "新", data: projectView("new") });
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0].title, "新");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("local map store rejects non Project View payloads", () => {
  assert.throws(() => normalizeMapRecord({ id: "bad", data: {} }), /expected cmath\.project-view-model/u);
});
