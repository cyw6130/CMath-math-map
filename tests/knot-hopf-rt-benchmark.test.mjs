import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import contentLoader from "../math-map-content-loader.js";
import previewLoader from "../generic-math-map-preview-loader.js";
import projectAdapter from "../math-map-project-adapter.js";
import semantics from "../math-map-semantics.js";
import paperImportClient from "../paper-import-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesRoot = path.resolve(__dirname, "../benchmarks/paper-import/cases");
const goldFixturePath = path.join(casesRoot, "knot-hopf-rt", "gold-project-view.json");
const specFixturePath = path.join(casesRoot, "knot-hopf-rt", "benchmark-spec.json");

const goldJson = JSON.parse(fs.readFileSync(goldFixturePath, "utf-8"));
const benchmarkSpec = JSON.parse(fs.readFileSync(specFixturePath, "utf-8"));

/**
 * Semantic concept matching helper (same strategy as the Hopf benchmark).
 */
function findEntryByConcept(entries, { id, titleKeywords = [], entryClass = null }) {
  const matchesClass = (entry) => !entryClass || entry.entryClass === entryClass;
  // Exact ID match wins over fuzzy keyword matching: several RT entries share
  // keywords like "Rep_fd" in their titles, so a keyword scan would otherwise
  // resolve to the wrong (earlier) entry.
  if (id) {
    const exact = entries.find((entry) => entry.id === id && matchesClass(entry));
    if (exact) return exact;
  }
  return entries.find((entry) => {
    if (!matchesClass(entry)) return false;
    const title = entry.title || "";
    const shortTitle = entry.shortTitle || "";
    const label = entry.displayLabel || "";
    return titleKeywords.some((kw) => title.includes(kw) || shortTitle.includes(kw) || label.includes(kw));
  });
}

/**
 * Evaluates any candidate Project View against the Knot-Hopf-RT benchmark requirements.
 * Structural and invariant based: exact model IDs are not required, but the four
 * classical boundary theorems must sit in B0 and the RT proof backbone must be intact.
 */
export function evaluateKnotHopfRtBenchmark(candidateView, { isCuratedGold = false } = {}) {
  const view = paperImportClient.paperProjectView(candidateView, {
    fileName: benchmarkSpec.targetPaper.sourcePdf,
    requireB0Classification: true,
  });

  const entries = view.entries;
  const inferences = view.inferences;
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const b0ClaimSet = new Set(view.derivedResearchState.mathematicalState.b0ClaimEntryIds);

  // 1. Fact/Claim and B0 partition
  const facts = entries.filter((e) => e.entryClass === "fact");
  const claims = entries.filter((e) => e.entryClass === "claim");
  const b0Claims = claims.filter((e) => b0ClaimSet.has(e.id));
  const derivedClaims = claims.filter((e) => !b0ClaimSet.has(e.id));

  assert.ok(facts.length > 0, "Candidate must contain Fact entries");
  assert.ok(b0Claims.length > 0, "Candidate must contain B0 Claim entries");
  assert.ok(derivedClaims.length > 0, "Candidate must contain derived Claim entries");

  for (const fact of facts) {
    assert.equal(b0ClaimSet.has(fact.id), false, "Fact " + fact.id + " must not be in B0");
    assert.ok(["definition", "algorithm", "calculation"].includes(fact.factKind), "Invalid factKind for " + fact.id);
  }

  for (const b0Claim of b0Claims) {
    assert.equal(b0Claim.entryClass, "claim", "B0 entry " + b0Claim.id + " must be a Claim");
    assert.ok(b0Claim.sourceReference && b0Claim.sourceReference.trim().length > 0, "B0 Claim " + b0Claim.id + " missing sourceReference");
    assert.ok(b0Claim.sourcePath && b0Claim.sourcePath.trim().length > 0, "B0 Claim " + b0Claim.id + " missing sourcePath");
  }

  // 2. The four classical boundary results must be in B0
  const b0Requirements = [
    { id: "rt:entry:lickorish-wallace", keywords: ["Lickorish", "Wallace", "Surgery 存在性"], name: "Lickorish-Wallace surgery theorem" },
    { id: "rt:entry:kirby-calculus", keywords: ["Kirby calculus", "Kirby 演算"], name: "Kirby calculus" },
    { id: "rt:entry:turaev-ribbon-graph-functor", keywords: ["Ribbon 图函子", "ribbon graph functor"], name: "Turaev ribbon graph functor" },
    { id: "rt:entry:turaev-purification-theorem", keywords: ["纯化定理", "purification theorem"], name: "Turaev purification theorem" },
  ];
  const resolvedB0 = new Map();
  for (const req of b0Requirements) {
    const entry = findEntryByConcept(b0Claims, { id: req.id, titleKeywords: req.keywords, entryClass: "claim" });
    assert.ok(entry, "B0 must contain " + req.name);
    resolvedB0.set(req.id, entry.id);
  }

  // 3. No artificial organization inference
  for (const inf of inferences) {
    if (inf.operationKind === "organization") {
      const conclusion = entryById.get(inf.conclusion);
      assert.equal(conclusion.entryClass, "fact", "Organization " + inf.id + " must conclude a Fact");
      for (const p of inf.premises) {
        assert.equal(entryById.get(p).entryClass, "fact", "Organization " + inf.id + " premises must all be Facts");
      }
      assert.doesNotMatch(inf.id, /org:background/iu, "Artificial background organization is forbidden");
    }
  }


  // 4. Key proof dependencies along the RT backbone
  // (a) Kirby reduction uses Lickorish-Wallace and Kirby calculus
  const kirbyReduction = findEntryByConcept(derivedClaims, {
    id: "rt:entry:kirby-reduction",
    titleKeywords: ["Kirby 约化", "约化为 Kirby"],
    entryClass: "claim",
  });
  assert.ok(kirbyReduction, "Must contain the Kirby reduction proposition");
  const kirbyReductionProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === kirbyReduction.id);
  assert.ok(kirbyReductionProof, "Must have a proof for Kirby reduction (" + kirbyReduction.id + ")");
  assert.ok(
    kirbyReductionProof.premises.includes(resolvedB0.get("rt:entry:lickorish-wallace")),
    "Proof of Kirby reduction must use Lickorish-Wallace as premise",
  );
  assert.ok(
    kirbyReductionProof.premises.includes(resolvedB0.get("rt:entry:kirby-calculus")),
    "Proof of Kirby reduction must use Kirby calculus as premise",
  );

  // (b) Rep_fd(A) ribbon structure assembles the four structural lemmas
  const repRibbon = findEntryByConcept(derivedClaims, {
    id: "rt:entry:rep-ribbon",
    titleKeywords: ["Rep_fd", "表示 Ribbon"],
    entryClass: "claim",
  });
  assert.ok(repRibbon, "Must contain the Rep_fd(A) ribbon structure proposition");
  const repRibbonProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === repRibbon.id);
  assert.ok(repRibbonProof, "Must have a proof for Rep_fd(A) ribbon structure (" + repRibbon.id + ")");
  for (const kw of [["表示张量积", "张量积"], ["表示对偶", "对偶"], ["六边形", "braiding"], ["范畴扭转", "扭转"]]) {
    const premisePresent = repRibbonProof.premises.some((pid) => {
      const pe = entryById.get(pid);
      return pe && kw.some((k) => (pe.title + " " + pe.shortTitle).includes(k));
    });
    assert.ok(premisePresent, "Proof of Rep_fd(A) ribbon structure must use a premise about " + kw[0]);
  }

  // (c) Presentation independence combines the two Kirby-move invariance lemmas
  const presentationIndependence = findEntryByConcept(derivedClaims, {
    id: "rt:entry:kirby-presentation-independence",
    titleKeywords: ["表示无关", "presentation"],
    entryClass: "claim",
  });
  assert.ok(presentationIndependence, "Must contain the surgery presentation independence proposition");
  const piProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === presentationIndependence.id);
  assert.ok(piProof, "Must have a proof for presentation independence (" + presentationIndependence.id + ")");
  const slidePremise = piProof.premises.some((pid) => {
    const pe = entryById.get(pid);
    return pe && /handle.?slide|滑移/iu.test(pe.title + " " + pe.shortTitle);
  });
  const blowupPremise = piProof.premises.some((pid) => {
    const pe = entryById.get(pid);
    return pe && /±1|blow.?up|Kirby 不变/iu.test(pe.title + " " + pe.shortTitle);
  });
  assert.ok(slidePremise, "Proof of presentation independence must use the handle-slide invariance lemma");
  assert.ok(blowupPremise, "Proof of presentation independence must use the blow-up invariance lemma");

  // (d) RT invariant theorem follows from presentation independence + Lickorish-Wallace
  const rtInvariant = findEntryByConcept(derivedClaims, {
    id: "rt:entry:rt-invariant",
    titleKeywords: ["RT 不变量", "Reshetikhin"],
    entryClass: "claim",
  });
  assert.ok(rtInvariant, "Must contain the RT invariant theorem");
  const rtProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === rtInvariant.id);
  assert.ok(rtProof, "Must have a proof for the RT invariant (" + rtInvariant.id + ")");
  assert.ok(
    rtProof.premises.includes(presentationIndependence.id),
    "Proof of the RT invariant must use presentation independence as premise",
  );
  assert.ok(
    rtProof.premises.includes(resolvedB0.get("rt:entry:lickorish-wallace")),
    "Proof of the RT invariant must use Lickorish-Wallace as premise",
  );


  // 5. Main target is the RT invariant theorem
  const mainTargetId = view.derivedResearchState.researchOverlay.loopTargetEntryId;
  const mainTargetEntry = entryById.get(mainTargetId);
  assert.ok(mainTargetEntry, "mainTargetEntryId must resolve to an existing Entry");
  assert.equal(mainTargetEntry.entryClass, "claim", "mainTargetEntryId must be a Claim");
  assert.match(
    mainTargetEntry.title + " " + mainTargetEntry.shortTitle,
    /RT|Reshetikhin|τ/iu,
    "mainTargetEntryId must point to the RT invariant theorem, not a boundary lemma",
  );
  assert.notEqual(mainTargetEntry.id, resolvedB0.get("rt:entry:kirby-calculus"), "mainTargetEntryId must not be the Kirby calculus boundary theorem");

  // 6. Claim closure: the in-paper proved backbone must be established
  const closure = semantics.computeClaimClosure(entries, inferences, {
    b0ClaimEntryIds: view.derivedResearchState.mathematicalState.b0ClaimEntryIds,
  });
  const backboneProvedConcepts = [
    { entry: kirbyReduction, name: "Kirby reduction" },
    { entry: repRibbon, name: "Rep_fd(A) ribbon structure" },
    { entry: presentationIndependence, name: "Surgery presentation independence" },
    { entry: rtInvariant, name: "RT invariant theorem" },
  ];
  for (const { entry, name } of backboneProvedConcepts) {
    assert.equal(
      closure.claimStates[entry.id],
      "established",
      "Backbone proved concept " + name + " (" + entry.id + ") must be established by claim closure",
    );
  }

  const openClaims = paperImportClient.findOpenClaims(view);

  // 7. Display labels format check
  const labelPattern = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(\d+)\s*·\s*(.+)$/u;
  for (const entry of entries) {
    assert.match(entry.displayLabel, labelPattern, "Entry " + entry.id + " displayLabel '" + entry.displayLabel + "' must match canonical format");
  }
  for (const inf of inferences) {
    assert.match(inf.displayLabel, labelPattern, "Inference " + inf.id + " displayLabel '" + inf.displayLabel + "' must match canonical format");
  }

  // 8. Capability validators / adapters accept the fixture
  const prepared = previewLoader.prepare(view, { loader: contentLoader, adapter: projectAdapter });
  assert.equal(prepared.model.classificationDiagnostics.issues.length, 0, "Adapter must produce zero classification issues");

  // 9. Curated gold fixture exact count checks
  if (isCuratedGold) {
    for (const claim of derivedClaims) {
      assert.equal(
        closure.claimStates[claim.id],
        "established",
        "Curated gold derived Claim " + claim.id + " (" + claim.title + ") must be established by claim closure",
      );
    }
    assert.equal(openClaims.length, 0, "Curated gold fixture must have exactly 0 open claims");
    assert.equal(entries.length, 37, "Curated gold fixture must have exactly 37 entries");
    assert.equal(inferences.length, 19, "Curated gold fixture must have exactly 19 inferences");
    assert.equal(facts.length, 20, "Curated gold fixture must have exactly 20 facts");
    assert.equal(b0Claims.length, 4, "Curated gold fixture must have exactly 4 B0 claims");
    assert.equal(derivedClaims.length, 13, "Curated gold fixture must have exactly 13 derived claims");
    assert.equal(closure.establishedClaimIds.length, 17, "Curated gold fixture must establish all 17 claims (4 B0 + 13 derived)");
  }

  return {
    valid: true,
    factCount: facts.length,
    b0ClaimCount: b0Claims.length,
    derivedClaimCount: derivedClaims.length,
    inferenceCount: inferences.length,
    establishedClaimCount: closure.establishedClaimIds.length,
    openClaimCount: openClaims.length,
  };
}


test("Knot-Hopf-RT gold fixture passes the comprehensive semantic benchmark", () => {
  const result = evaluateKnotHopfRtBenchmark(goldJson, { isCuratedGold: true });
  assert.equal(result.valid, true);
  assert.equal(result.factCount, 20);
  assert.equal(result.b0ClaimCount, 4);
  assert.equal(result.derivedClaimCount, 13);
  assert.equal(result.inferenceCount, 19);
  assert.equal(result.establishedClaimCount, 17);
  assert.equal(result.openClaimCount, 0);
});

test("Knot-Hopf-RT benchmark rejects dropping Lickorish-Wallace from the RT proof", () => {
  const badMap = structuredClone(goldJson);
  const rtProof = badMap.inferences.find((inf) => inf.conclusion === "rt:entry:rt-invariant");
  rtProof.premises = rtProof.premises.filter((id) => id !== "rt:entry:lickorish-wallace");

  assert.throws(
    () => evaluateKnotHopfRtBenchmark(badMap),
    /Lickorish/u,
  );
});

test("Knot-Hopf-RT benchmark rejects loop target pointing to a boundary theorem", () => {
  const badMap = structuredClone(goldJson);
  badMap.mainTargetEntryId = "rt:entry:kirby-calculus";
  badMap.derivedResearchState.researchOverlay.loopTargetEntryId = "rt:entry:kirby-calculus";

  assert.throws(
    () => evaluateKnotHopfRtBenchmark(badMap),
    /RT|Reshetikhin/iu,
  );
});

test("Knot-Hopf-RT benchmark rejects in-paper claims entering B0 without sourceReference", () => {
  const badMap = structuredClone(goldJson);
  // Kirby reduction is argued inside the paper; moving it into B0 without a sourceReference is unfaithful.
  badMap.b0ClaimEntryIds.push("rt:entry:kirby-reduction");
  badMap.derivedResearchState.mathematicalState.b0ClaimEntryIds = badMap.b0ClaimEntryIds;
  badMap.inferences = badMap.inferences.filter((inf) => inf.conclusion !== "rt:entry:kirby-reduction");

  assert.throws(
    () => evaluateKnotHopfRtBenchmark(badMap),
    /sourceReference/iu,
  );
});

