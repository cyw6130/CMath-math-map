import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runBatch, runBoundedPool } from "../scripts/run-v521-paper-batch.mjs";

test("bounded paper pool starts six tasks before release and keeps peers after one failure", async () => {
  const started = [];
  let release;
  const allStarted = new Promise((resolve) => { release = resolve; });
  const batch = runBoundedPool(
    Array.from({ length: 6 }, (_, id) => id),
    6,
    async (id) => {
      started.push(id);
      if (started.length === 6) release();
      await allStarted;
      if (id === 0) throw new Error("one paper failed");
      return id;
    },
  );

  await allStarted;
  assert.equal(started.length, 6);
  const results = await batch;

  assert.equal(results.length, 6);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.deepEqual(
    results.filter((result) => result.status === "fulfilled").map((result) => result.value),
    [1, 2, 3, 4, 5],
  );
});

test("failed paper artifacts do not serialize the OpenCode Go key", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "v521-paper-batch-test-"));
  const pdfPath = path.join(root, "secret.pdf");
  const outputDir = path.join(root, "out");
  const apiKey = "opencode-secret-for-test";
  await writeFile(pdfPath, "%PDF-test");

  await runBatch({
    pdfPaths: [pdfPath],
    outputDir,
    apiKey,
    requestPaperProductionImport: async () => {
      throw new Error(`upstream rejected ${apiKey}`);
    },
  });

  const failure = await readFile(path.join(outputDir, "secret.failed.json"), "utf8");
  assert.equal(failure.includes(apiKey), false);
  assert.doesNotMatch(failure, /Authorization|Bearer|apiKey/iu);
});
