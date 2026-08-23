import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scorer = require("../scripts/score-paper-entry-extraction-with-sol.mjs");

test("prepareSlimGold strips UI, channel, and graph configurations while preserving math entries", () => {
  assert.equal(typeof scorer.prepareSlimGold, "function", "prepareSlimGold must be exported");

  const bloatedGold = {
    schema: "cmath.project-view-model/v0.1",
    semanticModel: "cmath.fact-claim-operation/v0.1",
    project: { id: "cmath:project:paper:yasui", title: "几何单连通流形" },
    channelOptions: { complexUiConfig: "...", adapterOptions: { theme: "dark" }, largeBloat: "A".repeat(1000) },
    derivedResearchState: { state1: "...", state2: "...", largeBloat: "B".repeat(1000) },
    views: [{ id: "view-1", layout: "dag", largeBloat: "C".repeat(1000) }],
    entries: [
      { id: "paper:def:1", entryClass: "fact", factKind: "definition", title: "定义1", statement: "流形定义...", sourcePath: "paper.pdf#page=1" },
      { id: "paper:thm:1", entryClass: "claim", claimKind: "theorem", title: "定理1", statement: "定理结论...", sourcePath: "paper.pdf#page=3" }
    ],
    inferences: [
      { id: "inf-1", premiseEntryIds: ["paper:def:1"], targetEntryId: "paper:thm:1" }
    ]
  };

  const slim = scorer.prepareSlimGold(bloatedGold);

  // Math core must be preserved
  assert.equal(slim.entries.length, 2);
  assert.equal(slim.entries[0].id, "paper:def:1");
  assert.equal(slim.entries[1].id, "paper:thm:1");

  // Non-math bloat must be stripped
  assert.equal(slim.channelOptions, undefined);
  assert.equal(slim.derivedResearchState, undefined);
  assert.equal(slim.views, undefined);

  const origSize = JSON.stringify(bloatedGold).length;
  const slimSize = JSON.stringify(slim).length;
  assert.ok(slimSize < origSize * 0.7, `Slim gold size (${slimSize}) should be < 70% of original (${origSize})`);
});

test("validateCandidateSanity fails closed on empty or severely defective artifacts without calling Sol", () => {
  assert.equal(typeof scorer.validateCandidateSanity, "function", "validateCandidateSanity must be exported");

  // Empty candidate
  assert.throws(() => {
    scorer.validateCandidateSanity({ rawEntries: [] }, { minEntries: 5 });
  }, /Candidate artifact contains too few entries/);

  // Null or missing
  assert.throws(() => {
    scorer.validateCandidateSanity(null);
  }, /Invalid candidate object/);

  // Healthy candidate passes
  const valid = scorer.validateCandidateSanity({
    rawEntries: Array.from({ length: 15 }, (_, i) => ({ id: `e-${i}`, statement: "Math..." }))
  }, { minEntries: 5 });

  assert.equal(valid, true);
});
