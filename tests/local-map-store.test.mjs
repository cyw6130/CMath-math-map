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

test("local map store roundtrips a map with a long id", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-store-"));
  const id = "m".repeat(245);
  try {
    const store = createLocalMapStore(directory);
    const saved = store.put({ id, data: projectView(id), importedAt: 8 });
    assert.equal(saved.id, id);
    assert.deepEqual(store.list().map((item) => item.id), [id]);
    assert.equal(store.remove(id), true);
    assert.deepEqual(store.list(), []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("local map store preserves base64url filenames for short ids", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-store-"));
  const id = "imported:short";
  try {
    const store = createLocalMapStore(directory);
    store.put({ id, data: projectView(id) });
    assert.deepEqual(fs.readdirSync(directory), [Buffer.from(id).toString("base64url") + ".json"]);
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

test("local map store deletes one map without touching the others", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-map-store-"));
  try {
    const store = createLocalMapStore(directory);
    store.put({ id: "imported:one", data: projectView("one") });
    store.put({ id: "imported:two", data: projectView("two") });
    assert.equal(store.remove("imported:one"), true);
    assert.equal(store.remove("imported:one"), false);
    assert.deepEqual(store.list().map((item) => item.id), ["imported:two"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("local map store rejects non Project View payloads", () => {
  assert.throws(() => normalizeMapRecord({ id: "bad", data: {} }), /expected cmath\.project-view-model/u);
});

test("local map store persists canonical Math Map v3 JSON", () => {
  const map = {
    entries: [{ id: "claim:main", entryClass: "claim", claimKind: "theorem", title: "Main", statement: "Main claim" }],
    inferences: [],
    negationPairs: [],
    b0ClaimEntryIds: [],
  };
  const saved = normalizeMapRecord({ id: "imported:canonical", title: "Canonical", data: map });
  assert.deepEqual(saved.data, map);
  assert.equal(saved.title, "Canonical");
  assert.equal(saved.numberingLedger.schema, "cmath-gamma.math-map-numbering-ledger/v1");
  assert.deepEqual(saved.numberingLedger.allocations["claim:main"], { kind: "定理", number: 1, state: "active" });

  const expanded = normalizeMapRecord({
    id: "imported:canonical",
    title: "Canonical",
    data: {
      ...map,
      entries: [
        { id: "claim:added-earlier", entryClass: "claim", claimKind: "theorem", title: "Added", statement: "Added claim" },
        ...map.entries,
      ],
    },
    numberingLedger: saved.numberingLedger,
  });
  assert.deepEqual(expanded.numberingLedger.allocations["claim:main"], { kind: "定理", number: 1, state: "active" });
  assert.deepEqual(expanded.numberingLedger.allocations["claim:added-earlier"], { kind: "定理", number: 2, state: "active" });
});

test("local map store preserves a sanitized VNext Generated Map envelope while reopening its strict map", () => {
  const result = {
    schema: "cmath.paper-to-map-result/v1",
    status: "degraded",
    map: projectView("paper:partial"),
    sourceAnnotations: { source: { fileName: "paper.pdf", pageCount: 1 }, items: [] },
    unresolvedItems: [{
      id: "unresolved:entry:1", sourceStage: "entry", candidateSummary: "candidate",
      failureCategory: "candidate-invalid", validationError: "invalid", retryable: true,
    }],
    diagnostics: { mainTargetIdentified: false, openClaimCount: 0, mainProofChainComplete: false, missingStages: ["entry"] },
    stages: { entry: { status: "degraded", attempt: 1 }, closure: { status: "complete", attempt: 1 } },
    identity: { contentFingerprint: "digest", frozenWorkflow: { label: "paper-to-map-vnext" } },
  };
  const saved = normalizeMapRecord({ id: "imported:partial", generatedResult: result });
  assert.deepEqual(saved.data, result.map);
  assert.equal(saved.generatedResult.status, "degraded");
  assert.equal(saved.generatedResult.unresolvedItems.length, 1);
  assert.deepEqual(saved.generatedResult.diagnostics.missingStages, ["entry"]);

  const mismatched = normalizeMapRecord({
    id: "imported:mismatched",
    data: projectView("paper:stale"),
    generatedResult: result,
  });
  assert.equal(mismatched.data.project.id, "paper:partial");
});
