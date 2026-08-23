import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pool = require("../paper-raw-entry-pool-v1.js");

// ADR-0002 seam: v1.25 violates the 6-type contract (Claim only
// lemma|proposition|theorem) and must not be selectable anywhere.
const V125 = "paper-entry-parallel-extraction-v1.25";

test("v1.25 is rejected by the extraction version whitelist", () => {
  assert.equal(
    pool.VALID_EXTRACTION_MODULE_VERSIONS.includes(V125),
    false,
    "VALID_EXTRACTION_MODULE_VERSIONS must not contain the deprecated corollary experiment v1.25",
  );
});

test("v1.25 prompt is unreachable from the public entry point", async () => {
  const text = "[[PAGE 1]]\nCorollary 1.5 Let X be a 4-manifold.";
  await assert.rejects(
    pool.extractParallelRawEntryPool({
      fileName: "geometry-paper.pdf",
      pageCount: 12,
      text,
      pageRange: { first: 1, last: 5 },
      extractionModuleVersion: V125,
      notify: () => {},
      callModel: async () => ({ foundationEntries: [], resultEntries: [], inferenceHints: [] }),
    }),
    /extractionModuleVersion/iu,
    "requesting v1.25 must fail loudly, never silently fall back to another prompt",
  );
});
