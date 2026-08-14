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
const goldFixturePath = path.join(__dirname, "fixtures", "hopf-paper", "hopf-map-gold.json");
const specFixturePath = path.join(__dirname, "fixtures", "hopf-paper", "benchmark-spec.json");

const goldJson = JSON.parse(fs.readFileSync(goldFixturePath, "utf-8"));
const benchmarkSpec = JSON.parse(fs.readFileSync(specFixturePath, "utf-8"));

/**
 * Semantic concept matching helper.
 * Resolves an entry in candidate map based on semantic aliases, title keywords, or fallback IDs.
 */
function findEntryByConcept(entries, { id, titleKeywords = [], entryClass = null }) {
  return entries.find((entry) => {
    if (entryClass && entry.entryClass !== entryClass) return false;
    if (id && entry.id === id) return true;
    const title = entry.title || "";
    const shortTitle = entry.shortTitle || "";
    const label = entry.displayLabel || "";
    return titleKeywords.some((kw) => title.includes(kw) || shortTitle.includes(kw) || label.includes(kw));
  });
}

/**
 * Evaluates any candidate Project View against the semantic benchmark requirements.
 * Does not require exact model IDs or byte equality.
 */
export function evaluateHopfPaperBenchmark(candidateView, { isCuratedGold = false } = {}) {
  // Normalize candidate through paperProjectView
  const view = paperImportClient.paperProjectView(candidateView, {
    fileName: "hopf map.pdf",
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

  // Facts must never be in B0
  for (const fact of facts) {
    assert.equal(b0ClaimSet.has(fact.id), false, `Fact ${fact.id} must not be in B0`);
    assert.ok(["definition", "algorithm", "calculation"].includes(fact.factKind), `Invalid factKind for ${fact.id}`);
  }

  // B0 Claims must carry sourceReference and sourcePath
  for (const b0Claim of b0Claims) {
    assert.equal(b0Claim.entryClass, "claim", `B0 entry ${b0Claim.id} must be a Claim`);
    assert.ok(b0Claim.sourceReference && b0Claim.sourceReference.trim().length > 0, `B0 Claim ${b0Claim.id} missing sourceReference`);
    assert.ok(b0Claim.sourcePath && b0Claim.sourcePath.trim().length > 0, `B0 Claim ${b0Claim.id} missing sourcePath`);
  }

  // 2. The two transversality B0 results are present
  const transversalityExtEntry = findEntryByConcept(b0Claims, {
    id: "paper:b0:transversality-extension",
    titleKeywords: ["横截延拓", "Transversality Extension"],
    entryClass: "claim",
  });
  assert.ok(transversalityExtEntry, "B0 must contain the Transversality Extension Theorem");

  const transversalityHomotopyEntry = findEntryByConcept(b0Claims, {
    id: "paper:b0:transversality-homotopy",
    titleKeywords: ["横截同伦", "Transversality Homotopy"],
    entryClass: "claim",
  });
  assert.ok(transversalityHomotopyEntry, "B0 must contain the Transversality Homotopy Theorem");

  // 3. No artificial organization inference
  for (const inf of inferences) {
    if (inf.operationKind === "organization") {
      const conclusion = entryById.get(inf.conclusion);
      assert.equal(conclusion.entryClass, "fact", `Organization ${inf.id} must conclude a Fact`);
      for (const p of inf.premises) {
        assert.equal(entryById.get(p).entryClass, "fact", `Organization ${inf.id} premises must all be Facts`);
      }
      // Check for forbidden artificial groupings (e.g. background definition grouping)
      assert.doesNotMatch(inf.id, /org:background/iu, "Artificial background organization is forbidden");
    }
  }

  // 4. Key proof dependencies:
  // (a) Extension Theorem proof uses Transversality Extension
  const extensionThm = findEntryByConcept(derivedClaims, {
    id: "paper:thm:extension",
    titleKeywords: ["延拓定理", "Extension Theorem"],
    entryClass: "claim",
  });
  assert.ok(extensionThm, "Must contain the Extension Theorem (延拓定理)");
  const extensionProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === extensionThm.id);
  assert.ok(extensionProof, `Must have a proof for Extension Theorem (${extensionThm.id})`);
  assert.ok(
    extensionProof.premises.includes(transversalityExtEntry.id),
    `Proof of Extension Theorem must use Transversality Extension (${transversalityExtEntry.id}) as premise`,
  );

  // (b) Finite-zero vector field proof uses Transversality Homotopy
  const vfFiniteZerosLemma = findEntryByConcept(derivedClaims, {
    id: "paper:lemma:vf-finite-zeros",
    titleKeywords: ["有限零点向量场", "有限零点"],
    entryClass: "claim",
  });
  assert.ok(vfFiniteZerosLemma, "Must contain the Finite-Zero Vector Field lemma");
  const vfFiniteZerosProof = inferences.find((inf) => inf.operationKind === "proof" && inf.conclusion === vfFiniteZerosLemma.id);
  assert.ok(vfFiniteZerosProof, `Must have a proof for Finite-Zero Vector Field (${vfFiniteZerosLemma.id})`);
  assert.ok(
    vfFiniteZerosProof.premises.includes(transversalityHomotopyEntry.id),
    `Proof of Finite-Zero Vector Field must use Transversality Homotopy (${transversalityHomotopyEntry.id}) as premise`,
  );

  // 5. Main target is Hopf Degree Theorem
  const mainTargetId = view.derivedResearchState.researchOverlay.loopTargetEntryId;
  const mainTargetEntry = entryById.get(mainTargetId);
  assert.ok(mainTargetEntry, "mainTargetEntryId must resolve to an existing Entry");
  assert.equal(mainTargetEntry.entryClass, "claim", "mainTargetEntryId must be a Claim");
  assert.match(
    mainTargetEntry.title + " " + mainTargetEntry.shortTitle,
    /Hopf/iu,
    "mainTargetEntryId must point to the Hopf Degree Theorem, not a boundary lemma",
  );
  assert.notEqual(mainTargetEntry.id, "paper:b0:isotopy", "mainTargetEntryId must not be boundary lemma paper:b0:isotopy");

  // 6. No self / cyclic proof dependencies
  const closure = semantics.computeClaimClosure(entries, inferences, {
    b0ClaimEntryIds: view.derivedResearchState.mathematicalState.b0ClaimEntryIds,
  });

  // 7. Require benchmark's gold in-paper proved backbone concepts to be present and established
  const hopfThm = findEntryByConcept(derivedClaims, {
    id: "paper:thm:hopf",
    titleKeywords: ["Hopf 度定理", "Hopf Degree", "Hopf"],
    entryClass: "claim",
  }) || (mainTargetEntry?.entryClass === "claim" ? mainTargetEntry : null);
  assert.ok(hopfThm, "Must contain the Hopf Degree Theorem (Hopf 度定理)");

  const backboneProvedConcepts = [
    { entry: extensionThm, name: "Extension Theorem (延拓定理)" },
    { entry: vfFiniteZerosLemma, name: "Finite-Zero Vector Field lemma (有限零点向量场)" },
    { entry: hopfThm, name: "Hopf Degree Theorem (Hopf 度定理)" },
  ];

  for (const { entry, name } of backboneProvedConcepts) {
    assert.equal(
      closure.claimStates[entry.id],
      "established",
      `Backbone proved concept '${name}' (${entry.id}) must be established by claim closure`,
    );
  }

  const openClaims = paperImportClient.findOpenClaims(view);

  // 8. Display labels format check
  const labelPattern = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(\d+)\s*·\s*(.+)$/u;
  for (const entry of entries) {
    assert.match(entry.displayLabel, labelPattern, `Entry ${entry.id} displayLabel '${entry.displayLabel}' must match canonical format`);
  }
  for (const inf of inferences) {
    assert.match(inf.displayLabel, labelPattern, `Inference ${inf.id} displayLabel '${inf.displayLabel}' must match canonical format`);
  }

  // 9. Capability validators / adapters accept the fixture
  const prepared = previewLoader.prepare(view, { loader: contentLoader, adapter: projectAdapter });
  assert.equal(prepared.model.classificationDiagnostics.issues.length, 0, "Adapter must produce zero classification issues");

  // 10. Curated gold fixture exact count checks
  if (isCuratedGold) {
    for (const claim of derivedClaims) {
      assert.equal(
        closure.claimStates[claim.id],
        "established",
        `Curated gold derived Claim ${claim.id} (${claim.title}) must be established by claim closure`,
      );
    }
    assert.equal(openClaims.length, 0, "Curated gold fixture must have exactly 0 open claims");
    assert.equal(entries.length, 29, "Curated gold fixture must have exactly 29 entries");
    assert.equal(inferences.length, 16, "Curated gold fixture must have exactly 16 inferences");
    assert.equal(facts.length, 6, "Curated gold fixture must have exactly 6 facts");
    assert.equal(b0Claims.length, 7, "Curated gold fixture must have exactly 7 B0 claims");
    assert.equal(derivedClaims.length, 16, "Curated gold fixture must have exactly 16 derived claims");
    assert.equal(closure.establishedClaimIds.length, 23, "Curated gold fixture must establish all 23 claims (7 B0 + 16 derived)");

    // Ensure no unsupported exact book page numbers (p.70 / p.72) exist in sourceReference
    for (const b0 of b0Claims) {
      assert.doesNotMatch(
        b0.sourceReference,
        /p\.\s*(?:70|72)\b/u,
        `B0 Claim ${b0.id} must not contain unsupported external book page numbers in sourceReference`,
      );
    }
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

test("Hopf gold fixture passes the comprehensive semantic benchmark", () => {
  const result = evaluateHopfPaperBenchmark(goldJson, { isCuratedGold: true });
  assert.equal(result.valid, true);
  assert.equal(result.factCount, 6);
  assert.equal(result.b0ClaimCount, 7);
  assert.equal(result.derivedClaimCount, 16);
  assert.equal(result.inferenceCount, 16);
  assert.equal(result.establishedClaimCount, 23);
  assert.equal(result.openClaimCount, 0);
});

test("semantic benchmark evaluator accepts alternative model IDs and key aliases", () => {
  // Create an aliased copy with different IDs and slightly different wording
  const aliasedMap = {
    projectTitle: "Hopf 度定理：同伦与向量场应用",
    mainTargetEntryId: "custom_claim_hopf_degree_thm",
    b0ClaimEntryIds: [
      "custom_b0_isotopy",
      "custom_b0_linear_iso",
      "custom_b0_sard_thm",
      "custom_b0_trans_ext",
      "custom_b0_trans_homotopy",
      "custom_b0_eps_nbhd",
      "custom_b0_poincare_hopf",
    ],
    entries: [
      { id: "custom_fact_deg", entryClass: "fact", factKind: "definition", shortTitle: "映射度", title: "映射度定义", statement: "deg(f) 定义为相交数。", sourceLocator: "hopf map.pdf#page=1" },
      { id: "custom_fact_winding", entryClass: "fact", factKind: "definition", shortTitle: "环绕数", title: "环绕数定义", statement: "W(f,z) 为方向映射的度。", sourceLocator: "hopf map.pdf#page=2" },
      { id: "custom_fact_stereo", entryClass: "fact", factKind: "definition", shortTitle: "球极投影", title: "球极投影等同", statement: "球面与欧氏空间的等同。", sourceLocator: "hopf map.pdf#page=13" },
      { id: "custom_fact_bump", entryClass: "fact", factKind: "definition", shortTitle: "鼓包函数", title: "鼓包函数构造", statement: "光滑截断函数。", sourceLocator: "hopf map.pdf#page=2" },
      { id: "custom_fact_index", entryClass: "fact", factKind: "definition", shortTitle: "零点指标", title: "向量场零点指标", statement: "零点局部环绕数。", sourceLocator: "hopf map.pdf#page=9" },
      { id: "custom_fact_euler", entryClass: "fact", factKind: "calculation", shortTitle: "球面欧拉数", title: "球面欧拉示性数计算", statement: "chi(S^k) 的值。", sourceLocator: "hopf map.pdf#page=11" },
      { id: "custom_b0_isotopy", entryClass: "claim", claimKind: "lemma", shortTitle: "等痕引理", title: "等痕引理", statement: "可移动有限个点。", sourceReference: "GP 2014 / 正文引用", sourceLocator: "hopf map.pdf#page=2" },
      { id: "custom_b0_linear_iso", entryClass: "claim", claimKind: "lemma", shortTitle: "线性等痕", title: "线性等痕引理", statement: "同构同伦于恒同或反射。", sourceReference: "GP 2014 / 正文引用", sourceLocator: "hopf map.pdf#page=4" },
      { id: "custom_b0_sard_thm", entryClass: "claim", claimKind: "theorem", shortTitle: "Sard 定理", title: "Sard 定理", statement: "正则值存在且稠密。", sourceReference: "GP 2014 / 正文引用", sourceLocator: "hopf map.pdf#page=6" },
      { id: "custom_b0_trans_ext", entryClass: "claim", claimKind: "theorem", shortTitle: "横截延拓定理", title: "横截延拓定理", statement: "边界横截可同伦延拓。", sourceReference: "GP 2014 / 论文 3.8 节引用", sourceLocator: "hopf map.pdf#page=8" },
      { id: "custom_b0_trans_homotopy", entryClass: "claim", claimKind: "theorem", shortTitle: "横截同伦定理", title: "横截同伦定理", statement: "映射可同伦微扰为横截。", sourceReference: "GP 2014 / 论文 4.2 节引用", sourceLocator: "hopf map.pdf#page=10" },
      { id: "custom_b0_eps_nbhd", entryClass: "claim", claimKind: "theorem", shortTitle: "ε-邻域", title: "ε-邻域定理", statement: "管状邻域最近点投影。", sourceReference: "GP 2014 / 正文引用", sourceLocator: "hopf map.pdf#page=7" },
      { id: "custom_b0_poincare_hopf", entryClass: "claim", claimKind: "theorem", shortTitle: "Poincaré–Hopf", title: "Poincaré–Hopf 指标定理", statement: "指标和等于欧拉数。", sourceReference: "GP 2014 / 正文引用", sourceLocator: "hopf map.pdf#page=10" },
      { id: "custom_claim_ext_rk", entryClass: "claim", claimKind: "lemma", shortTitle: "延拓到欧氏空间", title: "边界映射到欧氏空间可延拓", statement: "可光滑延拓到整个流形。", sourceLocator: "hopf map.pdf#page=7" },
      { id: "custom_claim_extension_thm", entryClass: "claim", claimKind: "theorem", shortTitle: "延拓定理", title: "延拓定理", statement: "度为零当且仅当可延拓到球面。", sourceLocator: "hopf map.pdf#page=8" },
      { id: "custom_claim_hopf_degree_thm", entryClass: "claim", claimKind: "theorem", shortTitle: "Hopf 度定理", title: "Hopf 度定理", statement: "同伦当且仅当度相等。", sourceLocator: "hopf map.pdf#page=8" },
      { id: "custom_claim_vf_finite", entryClass: "claim", claimKind: "lemma", shortTitle: "有限零点", title: "有限零点向量场存在性", statement: "流形上存在零点有限的向量场。", sourceLocator: "hopf map.pdf#page=9" },
    ],
    inferences: [
      { id: "inf1", operationKind: "proof", premises: ["custom_b0_eps_nbhd", "custom_fact_bump"], conclusion: "custom_claim_ext_rk", argument: "利用邻域和鼓包函数延拓。", sourceLocator: "hopf map.pdf#page=7" },
      { id: "inf2", operationKind: "proof", premises: ["custom_claim_ext_rk", "custom_b0_sard_thm", "custom_b0_trans_ext", "custom_b0_isotopy", "custom_fact_stereo"], conclusion: "custom_claim_extension_thm", argument: "综合横截延拓和零点消去。", sourceLocator: "hopf map.pdf#page=8" },
      { id: "inf3", operationKind: "proof", premises: ["custom_claim_extension_thm", "custom_fact_deg"], conclusion: "custom_claim_hopf_degree_thm", argument: "构造乘积流形应用延拓定理。", sourceLocator: "hopf map.pdf#page=8" },
      { id: "inf4", operationKind: "proof", premises: ["custom_b0_trans_homotopy"], conclusion: "custom_claim_vf_finite", argument: "由横截同伦定理微扰到横截。", sourceLocator: "hopf map.pdf#page=9" },
    ],
  };

  const evalResult = evaluateHopfPaperBenchmark(aliasedMap, { isCuratedGold: false });
  assert.equal(evalResult.valid, true);
  assert.equal(evalResult.openClaimCount, 0);
});

test("semantic benchmark rejects missing Transversality Homotopy B0 dependency", () => {
  const badMap = structuredClone(goldJson);
  // Remove transversality homotopy from B0 and replace premise in vf-finite-zeros with sard
  badMap.b0ClaimEntryIds = badMap.b0ClaimEntryIds.filter((id) => id !== "paper:b0:transversality-homotopy");
  badMap.entries = badMap.entries.filter((e) => e.id !== "paper:b0:transversality-homotopy");
  const vfProof = badMap.inferences.find((inf) => inf.conclusion === "paper:lemma:vf-finite-zeros");
  vfProof.premises = ["paper:b0:sard"];

  assert.throws(
    () => evaluateHopfPaperBenchmark(badMap),
    /Transversality Homotopy Theorem/u,
  );
});

test("semantic benchmark rejects artificial background organization inference", () => {
  const badMap = structuredClone(goldJson);
  badMap.inferences.push({
    id: "paper:org:background",
    operationKind: "organization",
    displayLabel: "组织 · 1 · 背景知识",
    shortTitle: "组织 · 背景知识",
    title: "组织 背景知识",
    statement: "组织度与环绕数。",
    premises: ["paper:def:degree", "paper:def:winding"],
    conclusion: "paper:def:stereo",
    argument: "背景知识关联。",
    sourceLocator: "hopf map.pdf#page=1",
  });

  assert.throws(
    () => evaluateHopfPaperBenchmark(badMap),
    /Artificial background organization is forbidden/u,
  );
});

test("semantic benchmark rejects loop target pointing to boundary lemma", () => {
  const badMap = structuredClone(goldJson);
  badMap.mainTargetEntryId = "paper:b0:isotopy";
  badMap.derivedResearchState.researchOverlay.loopTargetEntryId = "paper:b0:isotopy";

  assert.throws(
    () => evaluateHopfPaperBenchmark(badMap),
    /Hopf Degree Theorem/u,
  );
});

test("semantic benchmark accepts semantically valid candidate with an extra formal open Claim", () => {
  const candidateWithOpenClaim = structuredClone(goldJson);
  candidateWithOpenClaim.entries.push({
    id: "paper:claim:generalized-hopf-dimension",
    entryClass: "claim",
    claimKind: "theorem",
    shortTitle: "高维推广",
    title: "高维流形上的 Hopf 定理推广",
    statement: "当流形维数满足 $m > k$ 时，同伦分类由高阶不变量决定。",
    sourceLocator: "hopf map.pdf#page=13",
  });
  // The extra Claim is formal, not in B0, and has no proof, so it is an open Claim
  const result = evaluateHopfPaperBenchmark(candidateWithOpenClaim, { isCuratedGold: false });
  assert.equal(result.valid, true);
  assert.equal(result.openClaimCount, 1);
});

