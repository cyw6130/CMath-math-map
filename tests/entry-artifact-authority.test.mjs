import assert from "node:assert/strict";
import test from "node:test";

import canonicalArtifact from "../src/paper-import/entry/artifact.js";
import legacyArtifact from "../src/paper-import/paper-entry-artifact-v1.js";

function makeArtifact(entry) {
  const sourceText = "Canonical Entry source.";
  return {
    schema: "cmath.paper-entry-artifact/v1",
    entryModuleVersion: "paper-entry-extraction-v1.1",
    source: {
      fileName: "canonical-entry.pdf",
      pageCount: 1,
      characters: sourceText.length,
      sourceText,
    },
    paperGuide: { title: "Canonical Entry", main_target: { title: "Target", pages: [1] }, leads: [] },
    guideLeadSet: { leads: [] },
    lanes: { coverageEntries: [], leadGuidedEntries: [] },
    aggregation: { records: [], conflicts: [] },
    entries: [entry],
    aliases: {},
    reviewInputs: {
      missingExtractionCandidates: [],
      externalEvidenceIndex: null,
      externalBoundaryCandidates: null,
      protectedClaimIds: [],
    },
    diagnostics: { durationMs: 0, stages: [], calls: [] },
  };
}

const publicEntrances = [canonicalArtifact, legacyArtifact];

test("Entry Artifact canonical and legacy entrances share public identity", () => {
  assert.strictEqual(legacyArtifact, canonicalArtifact);
  assert.strictEqual(legacyArtifact.ENTRY_ARTIFACT_SCHEMA, canonicalArtifact.ENTRY_ARTIFACT_SCHEMA);
  assert.strictEqual(legacyArtifact.ENTRY_MODULE_VERSION, canonicalArtifact.ENTRY_MODULE_VERSION);
  assert.strictEqual(legacyArtifact.VALID_ENTRY_MODULE_VERSIONS, canonicalArtifact.VALID_ENTRY_MODULE_VERSIONS);

  for (const name of [
    "validatePaperEntryArtifact",
    "normalizePaperEntryArtifact",
    "createPaperEntryArtifact",
    "freezePaperEntryArtifact",
    "hasBalancedMathDelimiters",
    "validateMathDelimiters",
    "stripControlCharacters",
    "canonicalizeEntry",
  ]) {
    assert.strictEqual(legacyArtifact[name], canonicalArtifact[name], `${name} must be shared`);
  }
});

test("Canonical Fact and Claim artifacts validate through both public entrances", () => {
  const fact = makeArtifact({
    id: "fact:def",
    entryClass: "fact",
    factKind: "definition",
    statement: "A definition of $X$.",
  });
  const claim = makeArtifact({
    id: "claim:thm",
    entryClass: "claim",
    claimKind: "theorem",
    statement: "The theorem holds for $X$.",
  });

  for (const entrance of publicEntrances) {
    assert.equal(entrance.validatePaperEntryArtifact(fact), true);
    assert.equal(entrance.validatePaperEntryArtifact(claim), true);
  }
});

test("Canonical validation preserves draft, source, and math delimiter errors", () => {
  const invalidDraft = makeArtifact({
    id: "draft:entry",
    type: "definition",
    statement: "A draft entry.",
  });
  const invalidSource = makeArtifact({
    id: "fact:source",
    entryClass: "fact",
    factKind: "definition",
    statement: "A definition.",
  });
  invalidSource.source = null;
  const invalidMath = makeArtifact({
    id: "claim:math",
    entryClass: "claim",
    claimKind: "theorem",
    statement: "An unbalanced $formula.",
  });

  for (const entrance of publicEntrances) {
    assert.throws(
      () => entrance.validatePaperEntryArtifact(invalidDraft),
      /必须使用 entryClass=fact\|claim/u,
    );
    assert.throws(
      () => entrance.validatePaperEntryArtifact(invalidSource),
      /artifact\.source 必须是对象/u,
    );
    assert.throws(
      () => entrance.validatePaperEntryArtifact(invalidMath),
      /包含未配对的数学公式定界符/u,
    );
  }
});
