#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const semantics = require("../../../../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js");
const caseRoot = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(caseRoot, "benchmark-spec.json"), "utf8"));
const artifactBytes = fs.readFileSync(path.join(caseRoot, spec.baseline.artifact));
const baseline = JSON.parse(artifactBytes.toString("utf8"));
const map = baseline.data;

function isolatedEntryIds(state) {
  const connected = new Set();
  for (const inference of state.inferences) {
    connected.add(inference.conclusion);
    for (const premise of inference.premises) connected.add(premise);
  }
  for (const pair of state.negationPairs) {
    for (const claimId of pair.claimEntryIds) connected.add(claimId);
  }
  return state.entries.map(({ id }) => id).filter((id) => !connected.has(id)).sort();
}

// Counterfactual only: the listed roots were checked against the source but are
// intentionally not written into the preserved baseline artifact.
function openClaimsAfterSourceSupportedRoots(state, rootClaimIds) {
  const available = new Set([
    ...state.entries.filter(({ entryClass }) => entryClass === "fact").map(({ id }) => id),
    ...state.b0ClaimEntryIds,
    ...rootClaimIds,
  ]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const inference of state.inferences) {
      if (inference.operationKind !== "proof") continue;
      if (inference.premises.every((id) => available.has(id)) && !available.has(inference.conclusion)) {
        available.add(inference.conclusion);
        changed = true;
      }
    }
  }
  return state.entries
    .filter(({ entryClass, id }) => entryClass === "claim" && !available.has(id))
    .map(({ id }) => id)
    .sort();
}

const claims = map.entries.filter(({ entryClass }) => entryClass === "claim");
const derived = semantics.deriveMathState(map);
const openClaimIds = Object.entries(derived.claimStates)
  .filter(([, state]) => state === "open")
  .map(([id]) => id)
  .sort();
const isolated = isolatedEntryIds(map);
const rootIds = spec.sourceSupportedMissingProvenance.map(({ baselineClaimId }) => baselineClaimId);
const remainingOpen = openClaimsAfterSourceSupportedRoots(map, rootIds);
const expectedOpen = [...spec.expectedSourceState.legitimateOpenClaimIds].sort();

assert.equal(createHash("sha256").update(artifactBytes).digest("hex"), spec.baseline.artifactSha256);
assert.equal(spec.status, "diagnostic-regression");
assert.equal(spec.scoringEligible, false);
assert.equal(spec.goldStatus, "not-authored");
assert.equal(baseline.generatedResult.identity.frozenWorkflow.releaseId, spec.baseline.workflowReleaseId);
assert.equal(map.entries.length, spec.baseline.entryCount);
assert.equal(map.inferences.length, spec.baseline.inferenceCount);
assert.equal(claims.length, spec.baseline.claimCount);
assert.equal(openClaimIds.length, spec.baseline.openClaimCount);
assert.equal(openClaimIds.length / claims.length, spec.baseline.openClaimRatio);
assert.equal(isolated.length, spec.baseline.isolatedEntryCount);
assert.equal(isolated.length / map.entries.length, spec.baseline.isolatedEntryRatio);
assert.ok(rootIds.every((id) => openClaimIds.includes(id)));
assert.deepEqual(remainingOpen, expectedOpen);
assert.equal(remainingOpen.length, spec.expectedSourceState.maximumOpenClaimCount);
assert.ok(remainingOpen.length / claims.length <= spec.expectedSourceState.maximumOpenClaimRatio);

process.stdout.write(`${JSON.stringify({
  caseId: spec.caseId,
  status: "reproduced",
  baseline: {
    entries: map.entries.length,
    claims: claims.length,
    inferences: map.inferences.length,
    openClaims: openClaimIds.length,
    isolatedEntries: isolated.length,
  },
  counterfactual: {
    sourceSupportedRoots: rootIds.length,
    remainingOpenClaimIds: remainingOpen,
  },
}, null, 2)}\n`);
