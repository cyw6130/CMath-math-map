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
