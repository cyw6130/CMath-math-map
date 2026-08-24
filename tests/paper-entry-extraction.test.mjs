import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import paperEntryArtifact from "../paper-entry-artifact-v1.js";

const {
  ENTRY_ARTIFACT_SCHEMA,
  ENTRY_MODULE_VERSION,
  VALID_ENTRY_MODULE_VERSIONS,
  validatePaperEntryArtifact,
  normalizePaperEntryArtifact,
  createPaperEntryArtifact,
  freezePaperEntryArtifact,
  hasBalancedMathDelimiters,
  validateMathDelimiters,
  stripControlCharacters,
} = paperEntryArtifact;

import paperImportClient from "../paper-import-client.js";
import paperImportV3Capability from "../paper-import-v3-capability.js";
import guideLeadContract from "../guide-lead-contract-v1.js";
import leadGuidedExtraction from "../lead-guided-extraction-v1.js";
import dualLaneAggregation from "../dual-lane-extraction-aggregation-v1.js";
import paperRawEntryPool from "../paper-raw-entry-pool-v1.js";
import paperEntryConsolidation from "../paper-entry-consolidation-v1.js";
import paperEntryConsolidationModel from "../paper-entry-consolidation-v1.1-model.js";

const {
  CONSOLIDATION_MODULE_VERSION: MODEL_CONSOLIDATION_MODULE_VERSION,
  consolidationPrompt,
  consolidatePaperEntryPoolWithModel,
  resolveRunnerExecutionConfig: resolveModelConsolidationExecutionConfig,
} = paperEntryConsolidationModel;

const {
  RAW_ENTRY_POOL_SCHEMA,
  EXTRACTION_MODULE_VERSION: PARALLEL_EXTRACTION_MODULE_VERSION,
  EXTRACTION_MODULE_VERSION_V1_4,
  EXTRACTION_MODULE_VERSION_V1_5,
  EXTRACTION_MODULE_VERSION_V1_6,
  EXTRACTION_MODULE_VERSION_V1_7,
  EXTRACTION_MODULE_VERSION_V1_8,
  EXTRACTION_MODULE_VERSION_V1_9,
  EXTRACTION_MODULE_VERSION_V1_10,
  VALID_EXTRACTION_MODULE_VERSIONS: VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS,
  validateRawEntryPool,
  createRawEntryPool,
  freezeRawEntryPool,
  extractParallelRawEntryPool,
  resolveRunnerExecutionConfig,
  splitTextIntoChunks: splitTextIntoChunksRawPool,
  splitTextIntoFixedBlocks,
  splitTextIntoWindows,
  entriesPrompt,
  v14FoundationPrompt,
  v14ResultPrompt,
  v14LanePrompt,
  v17DualOutputPrompt,
  v18DualOutputPrompt,
  v19DualOutputPrompt,
  v110DualOutputPrompt,
  parseModelJson,
  repairJsonStringEscapes,
} = paperRawEntryPool;

const {
  CONSOLIDATION_MODULE_VERSION,
  consolidateRawEntryPool,
  freezePaperEntryArtifact: freezeConsolidatedPaperEntryArtifact,
} = paperEntryConsolidation;

const {
  entryReviewPrompt,
  applyEntryReviewPatches,
} = paperImportClient;

import {
  PROMPT_VERSION as SOL_ENTRY_PROMPT_VERSION,
  SCHEMA_ID as SOL_ENTRY_SCHEMA_ID,
  SCORER_MODEL as SOL_ENTRY_SCORER_MODEL,
  validateSolEntryScore,
  renderPromptTemplate,
  scorePaperEntryExtraction,
} from "../scripts/score-paper-entry-extraction-with-sol.mjs";

test("Paper Entry Extraction Module - Schema & Artifact Validation", async (t) => {
  await t.test("exports valid constants and functions", () => {
    assert.equal(ENTRY_ARTIFACT_SCHEMA, "cmath.paper-entry-artifact/v1");
    assert.equal(ENTRY_MODULE_VERSION, "paper-entry-extraction-v1.1");
    assert.ok(VALID_ENTRY_MODULE_VERSIONS.includes("paper-entry-extraction-v1"));
    assert.ok(VALID_ENTRY_MODULE_VERSIONS.includes("paper-entry-extraction-v1.1"));
    assert.ok(VALID_ENTRY_MODULE_VERSIONS.includes("paper-entry-consolidation-v1"));
    assert.ok(VALID_ENTRY_MODULE_VERSIONS.includes("paper-entry-consolidation-v1.1-model"));
    assert.equal(typeof validatePaperEntryArtifact, "function");
    assert.equal(typeof normalizePaperEntryArtifact, "function");
    assert.equal(typeof createPaperEntryArtifact, "function");
    assert.equal(typeof freezePaperEntryArtifact, "function");
    assert.equal(typeof hasBalancedMathDelimiters, "function");
    assert.equal(typeof validateMathDelimiters, "function");
    assert.equal(typeof stripControlCharacters, "function");
    assert.equal(typeof entryReviewPrompt, "function");
    assert.equal(typeof applyEntryReviewPatches, "function");
  });

  await t.test("cleans control characters correctly", () => {
    const raw = "Theorem\u0000 1\u0007: Let $x \\in X$\u001F and $y \\in Y$.\u0008";
    const cleaned = stripControlCharacters(raw);
    assert.equal(cleaned, "Theorem 1: Let $x \\in X$ and $y \\in Y$.");
    assert.equal(stripControlCharacters("Normal string with \n newline and \t tab"), "Normal string with \n newline and \t tab");
  });

  await t.test("validates math delimiter balance correctly", () => {
    assert.equal(hasBalancedMathDelimiters("Let $x \\in X$ and $y \\in Y$."), true);
    assert.equal(hasBalancedMathDelimiters("Equation: $$\\sum_{i=1}^n x_i = 0$$"), true);
    assert.equal(hasBalancedMathDelimiters("Inline \\( a^2 + b^2 = c^2 \\) and display \\[ E = mc^2 \\]"), true);
    assert.equal(hasBalancedMathDelimiters("Unbalanced dollar: Let $x \\in X"), false);
    assert.equal(hasBalancedMathDelimiters("Unbalanced double dollar: $$\\int_0^1 f(x) dx"), false);
    assert.equal(hasBalancedMathDelimiters("Unbalanced paren: \\( a + b = c"), false);
    assert.equal(hasBalancedMathDelimiters("Unbalanced bracket: \\[ a + b = c"), false);

    assert.throws(() => validateMathDelimiters("Bad $formula", "statement"), /未配对的数学公式定界符/);
    assert.doesNotThrow(() => validateMathDelimiters("Good $x$ formula", "statement"));
  });

  await t.test("accepts both v1 and v1.1 entry artifacts", () => {
    const srcText = "[[PAGE 1]]\nDefinition 1.1: Hopf map.\n\n[[PAGE 2]]\nTheorem 2.1: S3 -> S2 is a fiber bundle.";
    const validV11Artifact = {
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: "paper-entry-extraction-v1.1",
      source: {
        fileName: "hopf-fibration.pdf",
        pageCount: 3,
        characters: srcText.length,
        sourceText: srcText,
      },
      paperGuide: {
        title: "On the Hopf Fibration",
        main_target: { title: "Hopf Bundle Theorem", pages: [2] },
        leads: [{ title: "Hopf map", pages: [1] }],
      },
      guideLeadSet: {
        leads: [{ id: "lead-1", title: "Hopf map", pages: [1] }],
      },
      lanes: {
        coverageEntries: [{ id: "def_hopf", name: "Definition 1.1", type: "definition", entryClass: "definition", page: 1, statement: "Let $S^3 \\to S^2$ be the Hopf map." }],
        leadGuidedEntries: [{ id: "thm_main", name: "Theorem 2.1", type: "theorem", entryClass: "theorem", page: 2, statement: "The map $S^3 \\to S^2$ forms a fiber bundle." }],
      },
      aggregation: {
        records: [
          { id: "def_hopf", name: "Definition 1.1", type: "definition", entryClass: "definition", page: 1, statement: "Let $S^3 \\to S^2$ be the Hopf map." },
          { id: "thm_main", name: "Theorem 2.1", type: "theorem", entryClass: "theorem", page: 2, statement: "The map $S^3 \\to S^2$ forms a fiber bundle." },
        ],
        conflicts: [],
        counts: { coverage: 1, leadGuided: 1, total: 2, conflicts: 0 },
        provenance: { def_hopf: "coverage", thm_main: "lead" },
      },
      entries: [
        { id: "def_hopf", name: "Definition 1.1", entryClass: "fact", factKind: "definition", page: 1, statement: "Let $S^3 \\to S^2$ be the Hopf map." },
        { id: "thm_main", name: "Theorem 2.1", entryClass: "claim", claimKind: "theorem", page: 2, statement: "The map $S^3 \\to S^2$ forms a fiber bundle." },
      ],
      aliases: {},
      reviewInputs: {
        missingExtractionCandidates: [],
        externalEvidenceIndex: null,
        externalBoundaryCandidates: { b0: [], fixedEntries: [], classifications: [] },
        protectedClaimIds: ["thm_main"],
        canonicalIndex: { def_hopf: "def_hopf", thm_main: "thm_main" },
      },
      diagnostics: {
        durationMs: 120,
        stages: [{ stage: "prepare", atMs: 10 }],
        calls: [{ stage: "guide", durationMs: 50 }],
        modelCallMetadata: { model: "gpt-5.6-luna", provider: "Luna Gateway", reasoningEffort: "none" },
        moduleIdentity: { name: ENTRY_MODULE_VERSION, schema: ENTRY_ARTIFACT_SCHEMA, backbone: "v3.26" },
      },
    };

    assert.doesNotThrow(() => validatePaperEntryArtifact(validV11Artifact));
    const frozen = freezePaperEntryArtifact(validV11Artifact);
    assert.throws(() => { frozen.entries.push({ id: "hacked" }); });

    // Old v1 artifact is also accepted
    const validV1Artifact = {
      ...validV11Artifact,
      entryModuleVersion: "paper-entry-extraction-v1",
      diagnostics: {
        ...validV11Artifact.diagnostics,
        moduleIdentity: { name: "paper-entry-extraction-v1", schema: ENTRY_ARTIFACT_SCHEMA, backbone: "v3.26" },
      },
    };
    assert.doesNotThrow(() => validatePaperEntryArtifact(validV1Artifact));
    t.test("requires canonical Fact/Claim discriminants in artifact.entries", () => {
    const rawEntryArtifact = structuredClone(validV11Artifact);
    rawEntryArtifact.entries[0] = {
      id: "def_hopf",
      name: "Definition 1.1",
      type: "definition",
      statement: "Let $S^3 \\to S^2$ be the Hopf map.",
    };
    assert.throws(
      () => validatePaperEntryArtifact(rawEntryArtifact),
      /必须使用 entryClass=fact\|claim/u,
    );

    const conflictingArtifact = structuredClone(validV11Artifact);
    conflictingArtifact.entries[0].claimKind = "theorem";
    assert.throws(
      () => validatePaperEntryArtifact(conflictingArtifact),
      /Fact.*不能包含 claimKind/u,
    );

    const unsupportedKindArtifact = structuredClone(validV11Artifact);
    unsupportedKindArtifact.entries[1].claimKind = "corollary";
    assert.throws(
      () => validatePaperEntryArtifact(unsupportedKindArtifact),
      /claimKind.*lemma\|proposition\|theorem/u,
    );
  });
  });


  await t.test("rejects malformed entry artifacts", () => {
    assert.throws(() => validatePaperEntryArtifact(null), /必须是非空 JSON 对象/);
    assert.throws(() => validatePaperEntryArtifact({ schema: "wrong-schema" }), /无效的 artifact schema/);
    assert.throws(() => validatePaperEntryArtifact({ schema: ENTRY_ARTIFACT_SCHEMA, entryModuleVersion: "wrong-ver" }), /无效的 entryModuleVersion/);
    assert.throws(() => validatePaperEntryArtifact({
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: ENTRY_MODULE_VERSION,
      source: null,
    }), /artifact.source 必须是对象/);
    assert.throws(() => validatePaperEntryArtifact({
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: ENTRY_MODULE_VERSION,
      source: { fileName: "a.pdf", pageCount: 1, characters: 4, sourceText: "text" },
      paperGuide: { title: "T", main_target: { title: "T", pages: [1] }, leads: [] },
      guideLeadSet: { leads: [] },
      lanes: { coverageEntries: [], leadGuidedEntries: [] },
      aggregation: { records: [], conflicts: [] },
      entries: [{ id: "dup", name: "E1", entryClass: "fact", factKind: "definition", statement: "stmt1" }, { id: "dup", name: "E2", entryClass: "fact", factKind: "definition", statement: "stmt2" }],
      aliases: {},
      reviewInputs: { missingExtractionCandidates: [] },
    }), /重复的 entry ID/);
    assert.throws(() => validatePaperEntryArtifact({
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: ENTRY_MODULE_VERSION,
      source: { fileName: "a.pdf", pageCount: 1, characters: 4, sourceText: "text" },
      paperGuide: { title: "T", main_target: { title: "T", pages: [1] }, leads: [] },
      guideLeadSet: { leads: [] },
      lanes: { coverageEntries: [], leadGuidedEntries: [] },
      aggregation: { records: [], conflicts: [] },
      entries: [{ id: "e1", name: "E1", entryClass: "fact", factKind: "definition", statement: "Unbalanced $formula" }],
      aliases: {},
      reviewInputs: { missingExtractionCandidates: [] },
    }), /包含未配对的数学公式定界符/);
  });
});

test("Paper Entry Extraction Module - Source-Grounded Entry Review & Safe Patch Application", async (t) => {
  const initialEntries = [
    { id: "calc:hopf_bracket", type: "calculation", name: "Hopf 括号关系", statement: "The bracket $[e_1, e_2] = e_3$ defines the Lie algebra.", page: 1 },
    { id: "def:duplicate_1", type: "definition", name: "结定义 A", statement: "A knot is an embedding of $S^1$ into $S^3$.", page: 1 },
    { id: "def:duplicate_2", type: "definition", name: "结定义 B", statement: "A knot is an embedding of $S^1$ into $S^3$.", page: 1 },
  ];

  await t.test("successfully applies valid add, replace, remove, and alias review patches", () => {
    const reviewProposal = {
      patches: [
        // 1. 拆出/补充关键对象
        {
          action: "add",
          entry: {
            id: "thm:hopf_invariant",
            type: "theorem",
            name: "Hopf 不变量定理",
            statement: "The Hopf invariant of $\\eta: S^3 \\to S^2$ equals $1$.",
            page: 2,
          },
        },
        // 2. 纠正误标 calculation 为 definition
        {
          action: "replace",
          id: "calc:hopf_bracket",
          entry: {
            id: "def:hopf_bracket",
            type: "definition",
            name: "Hopf 括号定义",
            statement: "The bracket $[e_1, e_2] = e_3$ defines the Lie algebra $\\mathfrak{g}$.",
            page: 1,
          },
        },
        // 3. 别名去重
        {
          action: "alias",
          from: "def:duplicate_2",
          to: "def:duplicate_1",
        },
      ],
      summary: "拆出关键定理，纠正括号关系类型为定义，并合并重复的结定义。",
    };

    const result = applyEntryReviewPatches(initialEntries, {}, reviewProposal, { pageCount: 3 });
    assert.equal(result.diagnostics.appliedCount, 3);
    assert.equal(result.diagnostics.rejectedCount, 0);
    assert.equal(result.diagnostics.addCount, 1);
    assert.equal(result.diagnostics.replaceCount, 1);
    assert.equal(result.diagnostics.aliasCount, 1);

    // 验证 entries 列表结果
    const ids = result.entries.map((e) => e.id);
    assert.ok(ids.includes("thm:hopf_invariant"));
    assert.ok(ids.includes("def:hopf_bracket"));
    assert.ok(ids.includes("def:duplicate_1"));
    assert.ok(!ids.includes("def:duplicate_2"));
    assert.ok(!ids.includes("calc:hopf_bracket"));

    // 验证替换后的 type 变为 definition
    const replaced = result.entries.find((e) => e.id === "def:hopf_bracket");
    assert.equal(replaced.type, "definition");

    // 验证别名映射
    assert.equal(result.aliases["def:duplicate_2"], "def:duplicate_1");
    assert.equal(result.aliases["calc:hopf_bracket"], "def:hopf_bracket");
  });

  await t.test("strictly rejects invalid/unsafe review patches", () => {
    const badProposal = {
      patches: [
        // 无 page 必须拒绝（拒绝无来源新数学）
        { action: "add", entry: { id: "bad_no_page", type: "theorem", name: "No Page Thm", statement: "Statement." } },
        // 越界 page 必须拒绝
        { action: "add", entry: { id: "bad_page_overflow", type: "theorem", name: "Overflow", statement: "Statement.", page: 99 } },
        // 非法 type 必须拒绝
        { action: "add", entry: { id: "bad_type", type: "unknown_conjecture", name: "Conjecture", statement: "Statement.", page: 1 } },
        // 数学未闭合必须拒绝
        { action: "add", entry: { id: "bad_math", type: "theorem", name: "Unbalanced", statement: "Let $x \\in X formula", page: 1 } },
        // 含有下游推理字段时必须清洗或过滤
        {
          action: "add",
          entry: {
            id: "thm:with_inference",
            type: "theorem",
            name: "Cleaned Thm",
            statement: "Statement with $x = y$.",
            page: 1,
            inference: { conclusion: "xxx", premises: [] },
            b0: ["external"],
            mainTarget: true,
          },
        },
      ],
    };

    const result = applyEntryReviewPatches(initialEntries, {}, badProposal, { pageCount: 2 });
    assert.equal(result.diagnostics.rejectedCount, 4);

    // 带下游推理字段的 entry 被清洗后安全录入，不保留任何 inference/b0/mainTarget 属性
    const cleanedEntry = result.entries.find((e) => e.id === "thm:with_inference");
    assert.ok(cleanedEntry);
    assert.equal("inference" in cleanedEntry, false);
    assert.equal("b0" in cleanedEntry, false);
    assert.equal("mainTarget" in cleanedEntry, false);
  });
});

test("Paper Entry Extraction Module - Extraction Call Topology & Guide Repair", async (t) => {
  const sampleText = `[[PAGE 1]]
Definition 1 (Knot). A knot is an embedding of S1 into S3.
Definition 2 (Hopf link). The Hopf link is the simplest nontrivial link with two components.

[[PAGE 2]]
Theorem 1 (Linking Number). The linking number of the Hopf link is +/- 1.
Proposition 2 (Invariance). The linking number is a topological invariant.
`;

  const mockGuideResponse = {
    schema: "cmath.paper-guide/v0.1",
    kind: "paper_guide",
    title: "Knot and Link Invariants",
    sections: [{ id: "sec:1", title: "Introduction", pages: [1] }],
    symbols: [],
    leads: [
      {
        id: "lead:main",
        title: "Theorem 1 (Linking Number)",
        statement: "The linking number of the Hopf link is +/- 1.",
        narrative_role: "main_target",
        related_lead_ids: [],
        expansion_needs: [],
        pages: [2],
      },
    ],
  };

  const mockCoverageResponse = {
    schema: "cmath.paper-entry-extraction/v0.3",
    lane: "coverage",
    entries: [
      { id: "def_knot", name: "结的定义", type: "definition", num: 1, page: 1, statement: "A knot is an embedding of $S^1$ into $S^3$." },
      { id: "def_hopf", name: "Hopf 环链", type: "definition", num: 2, page: 1, statement: "The Hopf link is the simplest nontrivial link with two components." },
      { id: "thm_linking", name: "环绕数定理", type: "theorem", num: 1, page: 2, statement: "The linking number of the Hopf link is $\\pm 1$." },
    ],
  };

  const mockLeadResponse = {
    schema: "cmath.paper-entry-extraction/v0.3",
    lane: "lead-guided",
    entries: [
      { id: "prop_invariance", name: "拓扑不变性", type: "proposition", num: 2, page: 2, statement: "The linking number is a topological invariant." },
    ],
  };

  const mockBoundaryResponse = {
    b0: [],
    classifications: [],
    fixedEntries: [],
  };

  const mockIntegrationResponse = {
    entries: [
      { id: "def_knot", name: "结的定义", type: "definition", num: 1, page: 1, statement: "A knot is an embedding of $S^1$ into $S^3$." },
      { id: "def_hopf", name: "Hopf 环链", type: "definition", num: 2, page: 1, statement: "The Hopf link is the simplest nontrivial link with two components." },
      { id: "thm_linking", name: "环绕数定理", type: "theorem", num: 1, page: 2, statement: "The linking number of the Hopf link is $\\pm 1$." },
      { id: "prop_invariance", name: "拓扑不变性", type: "proposition", num: 2, page: 2, statement: "The linking number is a topological invariant." },
    ],
    aliases: {},
  };

  const mockReviewResponse = {
    patches: [
      {
        action: "add",
        entry: {
          id: "def_gauss_map",
          type: "definition",
          name: "Gauss 映射",
          statement: "The Gauss map associated to the link components.",
          page: 2,
        },
      },
    ],
    summary: "补充 Gauss 映射定义",
  };

  const mockAssemblyResponse = {
    projectTitle: "Knot and Link Invariants",
    mainTargetEntryId: "thm_linking",
    b0: [],
    b0ClaimEntryIds: [],
    inferences: [
      {
        conclusion: "thm_linking",
        type: "proof",
        operationKind: "proof",
        premises: ["def_hopf", "def_knot"],
        argument: "Direct computation of the Gauss linking integral.",
        sourceLocator: "page=2",
      },
      {
        conclusion: "prop_invariance",
        type: "proof",
        operationKind: "proof",
        premises: ["thm_linking"],
        argument: "Homotopy invariance of degree.",
        sourceLocator: "page=2",
      },
    ],
  };

  await t.test("entry extraction stops before assembly with exact 6 call topology (including review)", async () => {
    const executedStages = [];
    const reasoningEfforts = [];

    async function mockChat(request) {
      const stage = request.stage;
      executedStages.push(stage);
      reasoningEfforts.push(request.reasoningEffort);

      const promptContent = request.messages?.[0]?.content || "";

      if (promptContent.includes("数学论文 Entry 提取评审员") || promptContent.includes("source-grounded entry review")) {
        return { content: JSON.stringify(mockReviewResponse) };
      }
      if (promptContent.includes("联合定向提取") || promptContent.includes("lead-guided") || promptContent.includes("SELECTED LEADS")) {
        return { content: JSON.stringify(mockLeadResponse) };
      }
      if (stage === "guide" || promptContent.includes("建立 Paper Guide") || promptContent.includes("buildPaperGuidePromptFromText")) {
        return { content: JSON.stringify(mockGuideResponse) };
      }
      if (promptContent.includes("外部依赖") || promptContent.includes("EXTERNAL BOUNDARY") || promptContent.includes("BOUNDARY")) {
        return { content: JSON.stringify(mockBoundaryResponse) };
      }
      if (promptContent.includes("整合") || promptContent.includes("integration") || promptContent.includes("CATALOG")) {
        return { content: JSON.stringify(mockIntegrationResponse) };
      }
      if (promptContent.includes("全文覆盖") || promptContent.includes("coverage") || stage === "extract") {
        return { content: JSON.stringify(mockCoverageResponse) };
      }
      throw new Error(`Unexpected stage called during entry extraction: ${stage}`);
    }

    const artifact = await paperImportClient.requestPaperEntryArtifact({
      fileName: "knot-paper.pdf",
      pageCount: 2,
      text: sampleText,
      chatImpl: mockChat,
      maxChunks: 1,
      workflowCapabilities: {
        paper: paperImportV3Capability,
        guideLead: guideLeadContract,
        leadGuided: leadGuidedExtraction,
        aggregate: dualLaneAggregation,
      },
    });

    assert.equal(artifact.schema, ENTRY_ARTIFACT_SCHEMA);
    assert.equal(artifact.entryModuleVersion, ENTRY_MODULE_VERSION);
    assert.equal(artifact.entries.length, 5); // 4 initial + 1 reviewed add
    assert.equal(artifact.source.fileName, "knot-paper.pdf");
    assert.equal(artifact.source.pageCount, 2);

    // Exact v1.1 extraction call topology: 1 guide, 1 coverage, 1 lead, 1 boundary, 1 integrate, 1 review = exactly 6 calls
    assert.equal(executedStages.length, 6);
    assert.deepEqual(executedStages, ["guide", "assemble", "extract", "extract", "aggregate", "aggregate"]);
    assert.deepEqual(reasoningEfforts, ["low", "none", "none", "none", "none", "none"]);

    // Diagnostics verify
    assert.equal(artifact.diagnostics.moduleIdentity.backbone, "v3.26");
    assert.equal(artifact.diagnostics.moduleIdentity.name, "paper-entry-extraction-v1.1");
    assert.equal(artifact.diagnostics.calls.length, 6);
    assert.ok(artifact.diagnostics.reviewDiagnostics);
    assert.equal(artifact.diagnostics.reviewDiagnostics.addCount, 1);

    // Validate full artifact schema
    assert.doesNotThrow(() => validatePaperEntryArtifact(artifact));
  });

  await t.test("Guide repair recovers when first attempt misses leads but second succeeds", async () => {
    let guideAttempt = 0;
    const executedStages = [];

    async function mockChatWithGuideRepair(request) {
      const stage = request.stage;
      executedStages.push(stage);
      const promptContent = request.messages?.[0]?.content || "";

      if (stage === "guide" || promptContent.includes("建立 Paper Guide")) {
        guideAttempt += 1;
        if (guideAttempt === 1) {
          // First attempt: returns guide with missing leads
          return { content: JSON.stringify({ schema: "cmath.paper-guide/v0.1", kind: "paper_guide", sections: [], symbols: [], leads: [] }) };
        } else {
          // Second attempt (repair): returns valid guide
          return { content: JSON.stringify(mockGuideResponse) };
        }
      }
      if (promptContent.includes("数学论文 Entry 提取评审员")) return { content: JSON.stringify(mockReviewResponse) };
      if (promptContent.includes("联合定向提取")) return { content: JSON.stringify(mockLeadResponse) };
      if (promptContent.includes("外部依赖")) return { content: JSON.stringify(mockBoundaryResponse) };
      if (promptContent.includes("整合")) return { content: JSON.stringify(mockIntegrationResponse) };
      if (promptContent.includes("全文覆盖") || stage === "extract") return { content: JSON.stringify(mockCoverageResponse) };
      throw new Error(`Unexpected stage: ${stage}`);
    }

    const artifact = await paperImportClient.requestPaperEntryArtifact({
      fileName: "knot-paper.pdf",
      pageCount: 2,
      text: sampleText,
      chatImpl: mockChatWithGuideRepair,
      maxChunks: 1,
      workflowCapabilities: {
        paper: paperImportV3Capability,
        guideLead: guideLeadContract,
        leadGuided: leadGuidedExtraction,
        aggregate: dualLaneAggregation,
      },
    });

    assert.ok(artifact);
    assert.equal(guideAttempt, 2); // 1 initial + 1 repair
    assert.equal(artifact.diagnostics.calls.length, 7); // 2 guide calls + 5 other calls
  });

  await t.test("Guide fails closed when repair also fails", async () => {
    async function mockChatWithFailingGuide(request) {
      const stage = request.stage;
      if (stage === "guide") {
        return { content: JSON.stringify({ schema: "cmath.paper-guide/v0.1", kind: "paper_guide", sections: [], symbols: [], leads: [] }) };
      }
      return { content: "{}" };
    }

    await assert.rejects(
      async () => {
        await paperImportClient.requestPaperEntryArtifact({
          fileName: "knot-paper.pdf",
          pageCount: 2,
          text: sampleText,
          chatImpl: mockChatWithFailingGuide,
          maxChunks: 1,
          workflowCapabilities: {
            paper: paperImportV3Capability,
            guideLead: guideLeadContract,
            leadGuided: leadGuidedExtraction,
            aggregate: dualLaneAggregation,
          },
        });
      },
      /Paper Guide 必须包含 sections、symbols 和非空 leads/
    );
  });

  await t.test("Guide network/HTTP errors fail immediately without content repair", async () => {
    let guideCalls = 0;
    async function mockChatWithNetworkError(request) {
      if (request.stage === "guide") {
        guideCalls += 1;
        const err = new Error("HTTP 502 Bad Gateway");
        err.status = 502;
        throw err;
      }
      return { content: "{}" };
    }

    await assert.rejects(
      async () => {
        await paperImportClient.requestPaperEntryArtifact({
          fileName: "knot-paper.pdf",
          pageCount: 2,
          text: sampleText,
          chatImpl: mockChatWithNetworkError,
          maxChunks: 1,
          workflowCapabilities: {
            paper: paperImportV3Capability,
            guideLead: guideLeadContract,
            leadGuided: leadGuidedExtraction,
            aggregate: dualLaneAggregation,
          },
        });
      },
      /HTTP 502/
    );
    assert.equal(guideCalls, 1); // No second content repair call on network error
  });

  await t.test("resumed inference executes only assembly without extraction calls and accepts both v1 and v1.1 artifacts", async () => {
    // Generate valid v1.1 entry artifact
    const entryArtifactV11 = createPaperEntryArtifact({
      source: { fileName: "knot-paper.pdf", pageCount: 2, characters: sampleText.length, sourceText: sampleText },
      paperGuide: mockGuideResponse,
      guideLeadSet: { leads: [{ id: "l1", title: "Linking", pages: [2] }] },
      lanes: { coverageEntries: mockCoverageResponse.entries, leadGuidedEntries: mockLeadResponse.entries },
      aggregation: { records: mockIntegrationResponse.entries, conflicts: [], counts: { coverage: 3, leadGuided: 1, total: 4, conflicts: 0 } },
      entries: mockIntegrationResponse.entries,
      aliases: {},
      reviewInputs: {
        missingExtractionCandidates: [],
        externalEvidenceIndex: null,
        externalBoundaryCandidates: mockBoundaryResponse,
        protectedClaimIds: ["thm_linking"],
        canonicalIndex: { thm_linking: "thm_linking" },
      },
    });

    const initialEntriesSnapshot = JSON.stringify(entryArtifactV11.entries);

    const inferenceStages = [];
    async function mockInferenceChat(request) {
      const stage = request.stage;
      inferenceStages.push(stage);
      if (stage === "assemble" || stage === "repair") {
        return { content: JSON.stringify(mockAssemblyResponse) };
      }
      throw new Error(`Unexpected stage called during resumed inference: ${stage}`);
    }

    const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
      artifact: entryArtifactV11,
      chatImpl: mockInferenceChat,
      workflowCapabilities: {
        paper: paperImportV3Capability,
        guideLead: guideLeadContract,
        leadGuided: leadGuidedExtraction,
        aggregate: dualLaneAggregation,
      },
    });

    assert.ok(view);
    assert.equal(view.projectTitle, "Knot and Link Invariants");
    assert.equal(view.mainTargetEntryId, "thm_linking");
    assert.equal(view.entries.length, 4);
    assert.equal(view.inferences.length, 2);

    // Assembly/repair stages called, 0 extraction calls
    assert.ok(inferenceStages.every((st) => st === "assemble" || st === "repair"));
    assert.ok(!inferenceStages.includes("guide"));
    assert.ok(!inferenceStages.includes("extract"));
    assert.ok(!inferenceStages.includes("aggregate"));

    // Immutability: original entryArtifact.entries was NOT mutated
    assert.equal(JSON.stringify(entryArtifactV11.entries), initialEntriesSnapshot);
  });
});

test("Paper Entry Extraction Module - Development Sol Entry Scorer", async (t) => {
  await t.test("prompt template substitution renders correctly without leakage", () => {
    const template = fs.readFileSync(
      path.join(process.cwd(), "benchmarks/paper-import/entry-module/sol-entry-score-prompt-v1.md"),
      "utf8"
    );

    const rendered = renderPromptTemplate(template, {
      GOLD_PATH: "./gold.json",
      CANDIDATE_PATH: "./candidate.json",
      SOL_ENTRY_SCORE_SCHEMA_PATH: "./sol-entry-score-schema.json",
      CASE_ID: "knot-hopf-rt",
      GOLD_REVISION: "gold-v2-objective-conventions",
      CANDIDATE_ARTIFACT: "benchmarks/model-outputs/entry-module/knot.json",
    });

    assert.ok(rendered.includes("./gold.json"));
    assert.ok(rendered.includes("./candidate.json"));
    assert.ok(rendered.includes("./sol-entry-score-schema.json"));
    assert.ok(!rendered.includes("__GOLD_PATH__"));
    assert.ok(!rendered.includes("__CANDIDATE_PATH__"));
    assert.ok(!rendered.includes("__SOL_ENTRY_SCORE_SCHEMA_PATH__"));

    // Fails closed on undeclared placeholder
    assert.throws(
      () => renderPromptTemplate(template + "\n__UNAUTHORIZED_PLACEHOLDER__", {
        GOLD_PATH: "g", CANDIDATE_PATH: "c", SOL_ENTRY_SCORE_SCHEMA_PATH: "s",
        CASE_ID: "case", GOLD_REVISION: "revision", CANDIDATE_ARTIFACT: "candidate",
      }),
      /Undeclared placeholders found/
    );
  });

  await t.test("validates Sol entry score schema and arithmetic", () => {
    const validScore = {
      schema: SOL_ENTRY_SCHEMA_ID,
      scorerModel: SOL_ENTRY_SCORER_MODEL,
      promptVersion: SOL_ENTRY_PROMPT_VERSION,
      candidateArtifact: "candidate.json",
      goldRevision: "v1",
      caseId: "knot-paper",
      correctness: 24,
      completeness: 18,
      solEntryScore: 42,
      verdict: "flawless",
      summary: "High quality faithful extraction of all mathematical definitions and claims.",
      strengths: ["Proper delimiter balance", "Accurate claim classifications"],
      issues: [],
    };

    assert.doesNotThrow(() => validateSolEntryScore(validScore, {
      caseId: "knot-paper",
      goldRevision: "v1",
      candidatePath: "candidate.json",
    }));

    // Arithmetic mismatch
    const badArithmetic = { ...validScore, solEntryScore: 40 };
    assert.throws(() => validateSolEntryScore(badArithmetic), /solEntryScore arithmetic error/);

    // Out of bounds
    const badCorrectness = { ...validScore, correctness: 26, solEntryScore: 44 };
    assert.throws(() => validateSolEntryScore(badCorrectness), /Invalid correctness/);

    // Wrong verdict bracket
    const badVerdict = { ...validScore, solEntryScore: 42, verdict: "usable" };
    assert.throws(() => validateSolEntryScore(badVerdict), /Verdict mismatch/);

    // Schema ID mismatch
    const badSchema = { ...validScore, schema: "wrong-schema" };
    assert.throws(() => validateSolEntryScore(badSchema), /Invalid score schema/);
  });

  await t.test("dry-run produces auditable plan with strict staging isolation", async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "scratch-test-dry-run-"));
    const goldPath = path.join(tempDir, "gold.json");
    const candidatePath = path.join(tempDir, "candidate.json");

    fs.writeFileSync(goldPath, JSON.stringify({ caseId: "test-case", revision: "v1", entries: [] }));
    fs.writeFileSync(candidatePath, JSON.stringify({
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: ENTRY_MODULE_VERSION,
      source: { fileName: "test.pdf", pageCount: 1, characters: 10, sourceText: "text" },
      entries: [],
    }));

    try {
      const plan = await scorePaperEntryExtraction({
        goldPath,
        candidatePath,
        dryRun: true,
      });

      assert.equal(plan.dryRun, true);
      assert.equal(plan.caseId, "test-case");
      assert.equal(plan.goldRevision, "v1");
      assert.equal(plan.schemaId, SOL_ENTRY_SCHEMA_ID);
      assert.equal(plan.promptVersion, SOL_ENTRY_PROMPT_VERSION);
      assert.deepEqual(plan.stagingPlan.files, [], "inline-single-turn mode stages no files");
      assert.equal(plan.stagingPlan.mode, "inline-single-turn");
      assert.ok(plan.renderedPrompt.includes("Gold Reference Artifact (inlined below)"), "inline prompt inlines gold artifact");
      assert.ok(plan.renderedPrompt.includes("Candidate Entry Extraction Artifact (inlined below)"), "inline prompt inlines candidate artifact");
      assert.ok(!plan.renderedPrompt.includes("__GOLD_PATH__"), "placeholder must be replaced");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

test("Paper Entry Modular Pipeline - Parallel Chunk Extraction & Raw Entry Pool", async (t) => {
  await t.test("exports valid raw pool constants and functions", () => {
    assert.equal(RAW_ENTRY_POOL_SCHEMA, "cmath.paper-raw-entry-pool/v1");
    assert.equal(PARALLEL_EXTRACTION_MODULE_VERSION, "paper-entry-parallel-extraction-v1.3");
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1"));
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1.1"));
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1.2"));
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1.3"));
    assert.equal(CONSOLIDATION_MODULE_VERSION, "paper-entry-consolidation-v1");
    assert.equal(typeof validateRawEntryPool, "function");
    assert.equal(typeof createRawEntryPool, "function");
    assert.equal(typeof freezeRawEntryPool, "function");
    assert.equal(typeof extractParallelRawEntryPool, "function");
    assert.equal(typeof resolveRunnerExecutionConfig, "function");
    assert.equal(typeof entriesPrompt, "function");
    assert.equal(typeof parseModelJson, "function");
    assert.equal(typeof repairJsonStringEscapes, "function");
  });

  await t.test("confirms exactly two pages of overlap for adjacent chunks using historical strategy", () => {
    const text6Pages = [
      "[[PAGE 1]]\nDefinition 1: Complex numbers $\\mathbb{C}$.",
      "[[PAGE 2]]\nDefinition 2: Quaternions $\\mathbb{H}$.",
      "[[PAGE 3]]\nDefinition 3: Octonions $\\mathbb{O}$.",
      "[[PAGE 4]]\nTheorem 1: Hopf fibration $S^3 \\to S^2$.",
      "[[PAGE 5]]\nTheorem 2: Second Hopf fibration $S^7 \\to S^4$.",
      "[[PAGE 6]]\nTheorem 3: Third Hopf fibration $S^{15} \\to S^8$.",
    ].join("\n\n");

    const chunks = splitTextIntoChunksRawPool(text6Pages, 3, 2);
    assert.equal(chunks.length, 3);

    // Chunk 0: Pages 1, 2
    assert.ok(chunks[0].includes("[[PAGE 1]]"));
    assert.ok(chunks[0].includes("[[PAGE 2]]"));
    assert.ok(!chunks[0].includes("[[PAGE 3]]"));

    // Chunk 1: Overlaps pages 1, 2 from Chunk 0, plus pages 3, 4
    assert.ok(chunks[1].includes("[[PAGE 1]]"));
    assert.ok(chunks[1].includes("[[PAGE 2]]"));
    assert.ok(chunks[1].includes("[[PAGE 3]]"));
    assert.ok(chunks[1].includes("[[PAGE 4]]"));
    assert.ok(!chunks[1].includes("[[PAGE 5]]"));

    // Chunk 2: Overlaps pages 3, 4 from Chunk 1, plus pages 5, 6
    assert.ok(!chunks[2].includes("[[PAGE 1]]"));
    assert.ok(!chunks[2].includes("[[PAGE 2]]"));
    assert.ok(chunks[2].includes("[[PAGE 3]]"));
    assert.ok(chunks[2].includes("[[PAGE 4]]"));
    assert.ok(chunks[2].includes("[[PAGE 5]]"));
    assert.ok(chunks[2].includes("[[PAGE 6]]"));
  });

  await t.test("confirms parallel extraction starts all chunk requests without serial waiting", async () => {
    const text6Pages = [
      "[[PAGE 1]]\nDefinition 1: Complex numbers $\\mathbb{C}$.",
      "[[PAGE 2]]\nDefinition 2: Quaternions $\\mathbb{H}$.",
      "[[PAGE 3]]\nDefinition 3: Octonions $\\mathbb{O}$.",
      "[[PAGE 4]]\nTheorem 1: Hopf fibration $S^3 \\to S^2$.",
      "[[PAGE 5]]\nTheorem 2: Second Hopf fibration $S^7 \\to S^4$.",
      "[[PAGE 6]]\nTheorem 3: Third Hopf fibration $S^{15} \\to S^8$.",
    ].join("\n\n");

    const requestStartTimes = [];
    const requestFinishTimes = [];

    async function mockParallelChat(req) {
      const started = performance.now();
      requestStartTimes.push(started);
      // Simulate 50ms async model call
      await new Promise((r) => setTimeout(r, 50));
      requestFinishTimes.push(performance.now());

      return {
        content: JSON.stringify({
          entries: [
            {
              id: `chunk_${req.chunkIndex}_entry`,
              type: "definition",
              name: `Chunk ${req.chunkIndex} Def`,
              statement: `Statement from chunk ${req.chunkIndex} with $x \\in X$.`,
              page: req.chunkIndex + 1,
            },
          ],
        }),
      };
    }

    const rawPool = await extractParallelRawEntryPool({
      fileName: "hopf-parallel.pdf",
      pageCount: 6,
      text: text6Pages,
      chatImpl: mockParallelChat,
      maxChunks: 3,
      forceChunks: true,
    });

    assert.equal(requestStartTimes.length, 3);
    // All 3 requests must start before the first request finishes (concurrent non-blocking)
    assert.ok(requestStartTimes[1] < requestFinishTimes[0], "Chunk 1 must start before Chunk 0 finishes");
    assert.ok(requestStartTimes[2] < requestFinishTimes[0], "Chunk 2 must start before Chunk 0 finishes");
    assert.equal(rawPool.chunks.length, 3);
    assert.equal(rawPool.rawEntries.length, 3);
  });

  await t.test("explicitly asserts no guide, boundary, lead-guided, integration, review, or repair request occurs", async () => {
    const executedStages = [];
    const promptContents = [];

    async function mockChatTracking(req) {
      executedStages.push(req.stage);
      const prompt = req.messages?.[0]?.content || "";
      promptContents.push(prompt);
      return {
        content: JSON.stringify({
          entries: [
            { id: "def_test", type: "definition", name: "Test", statement: "Test statement $a=b$.", page: 1 },
          ],
        }),
      };
    }

    const rawPool = await extractParallelRawEntryPool({
      fileName: "test.pdf",
      pageCount: 2,
      text: "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nDef 2",
      chatImpl: mockChatTracking,
      maxChunks: 2,
      forceChunks: true,
    });

    // Zero guide/boundary/lead/integration/review/repair stages
    assert.ok(executedStages.length > 0);
    assert.ok(executedStages.every((st) => st === "extract"));
    assert.ok(!executedStages.includes("guide"));
    assert.ok(!executedStages.includes("boundary"));
    assert.ok(!executedStages.includes("lead-guided"));
    assert.ok(!executedStages.includes("integrate"));
    assert.ok(!executedStages.includes("review"));
    assert.ok(!executedStages.includes("repair"));

    // Verify prompts are entry extraction only
    for (const p of promptContents) {
      assert.ok(!p.includes("Paper Guide"));
      assert.ok(!p.includes("EXTERNAL BOUNDARY"));
      assert.ok(!p.includes("SELECTED LEADS"));
      assert.ok(!p.includes("数学论文 Entry 提取评审员"));
      assert.ok(!p.includes("整合模块"));
      assert.ok(!p.includes("修复"));
    }
  });

  await t.test("raw pool freezes and preserves chunk entries and provenance", async () => {
    const mockChunk0 = [
      { id: "def_c", type: "definition", name: "复数", statement: "The complex plane $\\mathbb{C}$.", page: 1 },
    ];
    const mockChunk1 = [
      { id: "thm_hopf", type: "theorem", name: "Hopf 纤维化", statement: "The map $S^3 \\to S^2$ is a bundle.", page: 2 },
    ];

    async function mockChat(req) {
      return {
        content: JSON.stringify({ entries: req.chunkIndex === 0 ? mockChunk0 : mockChunk1 }),
      };
    }

    const text = "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nThm 1";
    const rawPool = await extractParallelRawEntryPool({
      fileName: "provenance-test.pdf",
      pageCount: 2,
      text,
      chatImpl: mockChat,
      maxChunks: 2,
      forceChunks: true,
    });

    assert.equal(rawPool.schema, RAW_ENTRY_POOL_SCHEMA);
    assert.equal(rawPool.extractionModuleVersion, PARALLEL_EXTRACTION_MODULE_VERSION);
    assert.equal(rawPool.source.fileName, "provenance-test.pdf");
    assert.equal(rawPool.source.pageCount, 2);
    assert.equal(rawPool.chunks.length, 2);
    assert.equal(rawPool.rawEntries.length, 2);

    // Provenance check
    assert.equal(rawPool.rawEntries[0].id, "def_c");
    assert.equal(rawPool.rawEntries[0]._provenance.chunkIndex, 0);
    assert.equal(rawPool.rawEntries[1].id, "thm_hopf");
    assert.equal(rawPool.rawEntries[1]._provenance.chunkIndex, 1);

    // Deep immutability check
    assert.ok(Object.isFrozen(rawPool));
    assert.ok(Object.isFrozen(rawPool.rawEntries));
    assert.throws(() => { rawPool.rawEntries.push({}); });
    assert.throws(() => { rawPool.chunks[0].rawEntries.push({}); });

    // Validate raw pool schema
    assert.doesNotThrow(() => validateRawEntryPool(rawPool));
  });

  await t.test("parallel chunk extraction strictly fails on chunk JSON parse failure without swallowing as empty chunk", async () => {
    async function mockFailingChat(req) {
      if (req.chunkIndex === 1) {
        return { content: "Malformed output {not-json" };
      }
      return {
        content: JSON.stringify({
          entries: [{ id: "def:c0", type: "definition", name: "C0", statement: "Chunk 0 def.", page: 1 }],
        }),
      };
    }

    await assert.rejects(
      async () => {
        await extractParallelRawEntryPool({
          fileName: "parse-failure.pdf",
          pageCount: 4,
          text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2\n\n[[PAGE 3]]\nP3\n\n[[PAGE 4]]\nP4",
          chatImpl: mockFailingChat,
          maxChunks: 2,
          forceChunks: true,
        });
      },
      (err) => {
        assert.ok(err.message.includes("Chunk 2"));
        assert.ok(err.message.includes("parse failure"));
        assert.ok(err.diagnostics);
        assert.ok(Array.isArray(err.diagnostics.calls));
        return true;
      }
    );
  });

  await t.test("parallel chunk extraction strictly fails on chunk response with missing or empty entries array", async () => {
    async function mockMissingEntriesChat(req) {
      return { content: JSON.stringify({ status: "success", count: 0 }) };
    }

    await assert.rejects(
      async () => {
        await extractParallelRawEntryPool({
          fileName: "missing-entries.pdf",
          pageCount: 2,
          text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
          chatImpl: mockMissingEntriesChat,
          maxChunks: 1,
        });
      },
      /Chunk 1.*missing valid entries array/
    );

    async function mockEmptyEntriesChat(req) {
      return { content: JSON.stringify({ entries: [] }) };
    }

    await assert.rejects(
      async () => {
        await extractParallelRawEntryPool({
          fileName: "empty-entries.pdf",
          pageCount: 2,
          text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
          chatImpl: mockEmptyEntriesChat,
          maxChunks: 1,
        });
      },
      /Chunk 1.*no valid entries/
    );
  });

  await t.test("accepts v1, v1.1, v1.2, and v1.3 raw entry pools, emits v1.3 on new runs, and keeps historical raw pools valid", async () => {
    const srcText = "[[PAGE 1]]\nDefinition 1: Knot.\n\n[[PAGE 2]]\nTheorem 1: Invariant.";
    const validV13RawPool = {
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.3",
      source: {
        fileName: "test.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            { id: "def:knot", type: "definition", name: "结定义", statement: "结的定义 $S^1 \\to S^3$。", page: 1 },
            { id: "thm:inv", type: "theorem", name: "不变量定理", statement: "拓扑不变量 $I(K)$。", page: 2 },
          ],
        },
      ],
      rawEntries: [
        { id: "def:knot", type: "definition", name: "结定义", statement: "结的定义 $S^1 \\to S^3$。", page: 1 },
        { id: "thm:inv", type: "theorem", name: "不变量定理", statement: "拓扑不变量 $I(K)$。", page: 2 },
      ],
      diagnostics: {
        durationMs: 50,
        stages: [{ stage: "extract", atMs: 50 }],
        calls: [{ stage: "extract", durationMs: 40 }],
        chunkCount: 1,
        rawEntryCount: 2,
        modelCallMetadata: { model: "gpt-5.6-luna", provider: "Luna Gateway", reasoningEffort: "none" },
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1.3", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };

    // 1. v1.3 validates
    assert.doesNotThrow(() => validateRawEntryPool(validV13RawPool));
    const consolidatedFromV13 = consolidateRawEntryPool(validV13RawPool);
    assert.equal(consolidatedFromV13.entries.length, 2);

    // 2. Historical v1.2 raw pool validates and consolidates seamlessly
    const validV12RawPool = {
      ...validV13RawPool,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.2",
      diagnostics: {
        ...validV13RawPool.diagnostics,
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1.2", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };
    assert.doesNotThrow(() => validateRawEntryPool(validV12RawPool));
    const consolidatedFromV12 = consolidateRawEntryPool(validV12RawPool);
    assert.equal(consolidatedFromV12.entries.length, 2);

    // 3. Historical v1.1 raw pool validates and consolidates seamlessly
    const validV11RawPool = {
      ...validV13RawPool,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.1",
      diagnostics: {
        ...validV13RawPool.diagnostics,
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1.1", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };
    assert.doesNotThrow(() => validateRawEntryPool(validV11RawPool));
    const consolidatedFromV11 = consolidateRawEntryPool(validV11RawPool);
    assert.equal(consolidatedFromV11.entries.length, 2);

    // 4. Historical v1 raw pool validates and consolidates seamlessly
    const validV1RawPool = {
      ...validV13RawPool,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1",
      diagnostics: {
        ...validV13RawPool.diagnostics,
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };
    assert.doesNotThrow(() => validateRawEntryPool(validV1RawPool));
    const consolidatedFromV1 = consolidateRawEntryPool(validV1RawPool);
    assert.equal(consolidatedFromV1.entries.length, 2);

    // 5. New runs emit v1.3
    async function mockChat(req) {
      return {
        content: JSON.stringify({
          entries: [
            { id: "def:knot", type: "definition", name: "结定义", statement: "结的定义 $S^1 \\to S^3$。", page: 1 },
          ],
        }),
      };
    }
    const newPool = await extractParallelRawEntryPool({
      fileName: "test.pdf",
      pageCount: 2,
      text: srcText,
      chatImpl: mockChat,
      maxChunks: 1,
    });
    assert.equal(newPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.3");
    assert.equal(newPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.3");

    // 6. Unsupported extraction module version throws error
    assert.throws(
      () => validateRawEntryPool({ ...validV13RawPool, extractionModuleVersion: "paper-entry-parallel-extraction-v0" }),
      /无效的 extractionModuleVersion/
    );
  });

  await t.test("prompt contract for v1.3 retains atomicity and unnumbered objects, excludes v1.2 coverage/classification self-check block, and forbids downstream stages", () => {
    const rendered = entriesPrompt({
      fileName: "quantum-invariants.pdf",
      pageCount: 6,
      text: "[[PAGE 1]]\nSection 1 text.\n\n[[PAGE 2]]\nSection 2 text.",
      pageRange: { first: 1, last: 2 },
    });

    // Requests unnumbered objects introduced and used in constructions/arguments
    assert.ok(rendered.includes("未显式编号") || rendered.includes("即使原文未显式编号"));
    assert.ok(rendered.includes("基础定义") && rendered.includes("definition"));
    assert.ok(rendered.includes("结构相容性引理") && rendered.includes("lemma"));
    assert.ok((rendered.includes("构造/归一化公式") || rendered.includes("归一化公式")) && rendered.includes("calculation"));
    assert.ok(rendered.includes("不变性") && (rendered.includes("约化") || rendered.includes("proposition/theorem")));

    // Enforces atomicity without hiding inside broad umbrella entries
    assert.ok(rendered.includes("原子性") || rendered.includes("Atomicity"));
    assert.ok(rendered.includes("拆分为独立的 Entry"));
    assert.ok(rendered.includes("宽泛的大条目") || rendered.includes("大条目"));

    // Strictly excludes v1.2 Coverage & Classification Self-Check block and terms
    assert.ok(!rendered.includes("输出前自检"));
    assert.ok(!rendered.includes("Self-Check"));
    assert.ok(!rendered.includes("Coverage & Classification"));
    assert.ok(!rendered.includes("quotient"));
    assert.ok(!rendered.includes("purification"));
    assert.ok(!rendered.includes("modding-out"));
    assert.ok(!rendered.includes("well-definedness"));
    assert.ok(!rendered.includes("声称诱导构造"));

    // Excludes forbidden categories and downstream fields
    assert.ok(rendered.includes("排除范围") || rendered.includes("严格排除"));
    assert.ok(rendered.includes("推导关系") || rendered.includes("Inference"));
    assert.ok(rendered.includes("B0"));
    assert.ok(rendered.includes("mainTarget"));
    assert.ok(rendered.includes("证明") || rendered.includes("proof"));

    // Generic guidance only: no case-specific leakage or scoring exposure
    assert.ok(!rendered.includes("RT-invariants"));
    assert.ok(!rendered.includes("Kirby"));
    assert.ok(!rendered.includes("Hopf"));
    assert.ok(!rendered.includes("Gold"));
    assert.ok(!rendered.includes("Sol Entry score"));
  });

  await t.test("resolveRunnerExecutionConfig maps modes to exact reasoningEffort and token budgets", () => {
    // 1. off-compact mode: reasoningEffort none, budget 10000/16000
    const offConfig = resolveRunnerExecutionConfig("off-compact");
    assert.equal(offConfig.reasoningEffort, "none");
    assert.deepEqual(offConfig.tokenBudget, { normal: 10000, retry: 16000 });

    // 2. low-compact mode: reasoningEffort low, budget identical to off-compact (10000/16000)
    const lowConfig = resolveRunnerExecutionConfig("low-compact");
    assert.equal(lowConfig.reasoningEffort, "low");
    assert.deepEqual(lowConfig.tokenBudget, { normal: 10000, retry: 16000 });
    assert.deepEqual(lowConfig.tokenBudget, offConfig.tokenBudget);

    // 3. medium-compact mode: reasoningEffort medium, budget identical to off/low (10000/16000)
    const mediumConfig = resolveRunnerExecutionConfig("medium-compact");
    assert.equal(mediumConfig.reasoningEffort, "medium");
    assert.deepEqual(mediumConfig.tokenBudget, { normal: 10000, retry: 16000 });
    assert.deepEqual(mediumConfig.tokenBudget, offConfig.tokenBudget);

    // 4. high-compact mode: reasoningEffort high, budget identical to off/low/medium (10000/16000)
    const highCompactConfig = resolveRunnerExecutionConfig("high-compact");
    assert.equal(highCompactConfig.reasoningEffort, "high");
    assert.deepEqual(highCompactConfig.tokenBudget, { normal: 10000, retry: 16000 });
    assert.deepEqual(highCompactConfig.tokenBudget, offConfig.tokenBudget);

    // 5. high-generous mode: reasoningEffort high, budget 32000/64000
    const highConfig = resolveRunnerExecutionConfig("high-generous");
    assert.equal(highConfig.reasoningEffort, "high");
    assert.deepEqual(highConfig.tokenBudget, { normal: 32000, retry: 64000 });

    // 6. Default mode is off-compact
    const defaultConfig = resolveRunnerExecutionConfig();
    assert.deepEqual(defaultConfig, offConfig);

    // 7. Unknown mode throws descriptive error
    assert.throws(() => resolveRunnerExecutionConfig("unknown-mode"), /unknown mode: unknown-mode/);
  });
});

test("Paper Entry Modular Pipeline - Deterministic Entry Consolidation", async (t) => {
  const sampleSrcText = "[[PAGE 1]]\nPage 1\n\n[[PAGE 2]]\nPage 2\n\n[[PAGE 3]]\nPage 3";
  const sampleRawPool = createRawEntryPool({
    source: {
      fileName: "sample.pdf",
      pageCount: 3,
      characters: sampleSrcText.length,
      sourceText: sampleSrcText,
    },
    chunks: [
      {
        chunkIndex: 0,
        pageRange: { first: 1, last: 2 },
        characterCount: 30,
        text: "[[PAGE 1]]\nPage 1\n\n[[PAGE 2]]\nPage 2",
        rawEntries: [
          {
            id: "thm:main",
            type: "theorem",
            name: "Main Theorem",
            statement: "The map $\\phi: X \\to Y$ is an isomorphism.",
            page: 2,
            _provenance: { chunkIndex: 0, pageRange: { first: 1, last: 2 } },
          },
          {
            id: "def:space",
            type: "definition",
            name: "Space $X$\u0000",
            statement: "A topological space $X$.\u001F",
            page: 1,
            _provenance: { chunkIndex: 0, pageRange: { first: 1, last: 2 } },
          },
        ],
      },
      {
        chunkIndex: 1,
        pageRange: { first: 2, last: 3 },
        characterCount: 30,
        text: "[[PAGE 2]]\nPage 2\n\n[[PAGE 3]]\nPage 3",
        rawEntries: [
          {
            // Same-ID duplicate with corrupted/unbalanced LaTeX and missing name
            id: "thm:main",
            type: "theorem",
            statement: "The map $\\phi: X \\to Y is an isomorphism.",
            page: 2,
            _provenance: { chunkIndex: 1, pageRange: { first: 2, last: 3 } },
          },
          {
            id: "prop:smooth",
            type: "proposition",
            name: "Smoothness",
            statement: "Every map is $C^\\infty$.",
            page: 3,
            _provenance: { chunkIndex: 1, pageRange: { first: 2, last: 3 } },
          },
        ],
      },
    ],
  });

  await t.test("consolidation performs zero fetch/model calls", () => {
    let callCount = 0;
    const artifact = consolidateRawEntryPool(sampleRawPool);
    assert.equal(callCount, 0);
    assert.equal(artifact.diagnostics.calls.length, 0);
    assert.equal(artifact.entryModuleVersion, CONSOLIDATION_MODULE_VERSION);
    assert.equal(artifact.schema, ENTRY_ARTIFACT_SCHEMA);
  });

  await t.test("same-ID duplicate prefers intact LaTeX over corrupted variant and never rewrites statement", () => {
    const artifact = consolidateRawEntryPool(sampleRawPool);
    const mainThm = artifact.entries.find((e) => e.id === "thm:main");
    assert.ok(mainThm);
    // Preserves intact LaTeX statement
    assert.equal(mainThm.statement, "The map $\\phi: X \\to Y$ is an isomorphism.");
    assert.equal(mainThm.name, "Main Theorem");
    // Does NOT rewrite statement semantically
    assert.ok(!mainThm.statement.includes("The map $\\phi: X \\to Y is an isomorphism."));
  });

  await t.test("invalid pages/control characters/unbalanced delimiters handled by explicit deterministic contract", () => {
    const edgeSrcText = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";
    const rawPoolWithEdgeCases = createRawEntryPool({
      source: {
        fileName: "edge.pdf",
        pageCount: 2,
        characters: edgeSrcText.length,
        sourceText: edgeSrcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: 40,
          text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
          rawEntries: [
            // Control characters stripped
            { id: "def:dirty", type: "defn", name: "Dirty\u0008 Name", statement: "Statement with \u0007control char.", page: 1 },
            // Lone damaged math entry discarded under strictMath
            { id: "thm:broken_lone", type: "theorem", name: "Broken", statement: "Unbalanced $formula here.", page: 2 },
            // Normalized alias types
            { id: "lem:quick", type: "lem", name: "Quick Lemma", statement: "Let $z = 0$.", page: 2 },
          ],
        },
      ],
    });

    const artifact = consolidateRawEntryPool(rawPoolWithEdgeCases, { strictMath: true });
    const dirty = artifact.entries.find((e) => e.id === "def:dirty");
    assert.ok(dirty);
    assert.equal(dirty.name, "Dirty Name");
    assert.equal(dirty.statement, "Statement with control char.");
    assert.equal(dirty.entryClass, "fact");
    assert.equal(dirty.factKind, "definition");
    assert.equal("type" in dirty, false);

    const lem = artifact.entries.find((e) => e.id === "lem:quick");
    assert.ok(lem);
    assert.equal(lem.entryClass, "claim");
    assert.equal(lem.claimKind, "lemma");
    assert.equal("type" in lem, false);

    // Broken lone entry with unbalanced math was discarded under strictMath
    const broken = artifact.entries.find((e) => e.id === "thm:broken_lone");
    assert.equal(broken, undefined);
  });

  await t.test("invalid, missing, and out-of-range pages are strictly rejected and never rewritten to page 1", () => {
    const srcText = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";
    const rawPool = createRawEntryPool({
      source: {
        fileName: "invalid-page.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            // Out of range page (page 99 for 2-page paper)
            { id: "thm:overflow", type: "theorem", name: "Overflow Thm", statement: "Overflow $x=y$.", page: 99 },
            // Missing page (undefined)
            { id: "thm:no_page", type: "theorem", name: "No Page Thm", statement: "No page $a=b$." },
            // Non-integer / negative page
            { id: "def:neg_page", type: "definition", name: "Neg Page", statement: "Neg page $c=d$.", page: -1 },
            { id: "def:zero_page", type: "definition", name: "Zero Page", statement: "Zero page $e=f$.", page: 0 },
            { id: "def:str_invalid_page", type: "definition", name: "Str Page", statement: "Str page $g=h$.", page: "not-a-number" },
            // Valid page entry
            { id: "thm:valid", type: "theorem", name: "Valid Thm", statement: "Valid page $1+1=2$.", page: 2 },
          ],
        },
      ],
    });

    const artifact = consolidateRawEntryPool(rawPool);
    // Only the valid page entry survived
    assert.equal(artifact.entries.length, 1);
    assert.equal(artifact.entries[0].id, "thm:valid");
    assert.equal(artifact.entries[0].page, 2);

    // Assert invalid entries were never rewritten to page 1
    const ids = artifact.entries.map((e) => e.id);
    assert.ok(!ids.includes("thm:overflow"));
    assert.ok(!ids.includes("thm:no_page"));
    assert.ok(!ids.includes("def:neg_page"));
    assert.ok(!ids.includes("def:zero_page"));
    assert.ok(!ids.includes("def:str_invalid_page"));

    // Check diagnostics counts
    assert.equal(artifact.diagnostics.consolidationSummary.invalidPageCount, 5);
    assert.equal(artifact.diagnostics.consolidationSummary.malformedCount, 5);
    assert.equal(artifact.diagnostics.consolidationSummary.consolidatedEntryCount, 1);
  });

  await t.test("consolidation chooses valid same-ID duplicate over invalid-page duplicate without inventing page", () => {
    const srcText = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";
    const rawPool = createRawEntryPool({
      source: {
        fileName: "dup-page.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            // Candidate 1: invalid page 99
            { id: "thm:hopf_dup", type: "theorem", name: "Hopf Thm", statement: "Hopf statement with $S^3 \\to S^2$.", page: 99 },
            // Candidate 2: valid page 2
            { id: "thm:hopf_dup", type: "theorem", name: "Hopf Thm", statement: "Hopf statement with $S^3 \\to S^2$.", page: 2 },
          ],
        },
      ],
    });

    const artifact = consolidateRawEntryPool(rawPool);
    assert.equal(artifact.entries.length, 1);
    assert.equal(artifact.entries[0].id, "thm:hopf_dup");
    assert.equal(artifact.entries[0].page, 2); // Valid page 2 preserved, not page 1
    assert.equal(artifact.diagnostics.consolidationSummary.invalidPageCount, 1);
  });

  await t.test("candidate with only invalid page and no valid duplicate is omitted with explicit diagnostics", () => {
    const srcText = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";
    const rawPool = createRawEntryPool({
      source: {
        fileName: "lone-bad-page.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            { id: "thm:lone_bad_page", type: "theorem", name: "Bad", statement: "Bad page $x=1$.", page: 50 },
            { id: "def:good", type: "definition", name: "Good", statement: "Good page $y=2$.", page: 1 },
          ],
        },
      ],
    });

    const artifact = consolidateRawEntryPool(rawPool);
    assert.equal(artifact.entries.length, 1);
    assert.equal(artifact.entries[0].id, "def:good");
    assert.ok(!artifact.entries.some((e) => e.id === "thm:lone_bad_page"));
    assert.equal(artifact.diagnostics.consolidationSummary.invalidPageCount, 1);
  });

  await t.test("new consolidated artifact can be consumed by existing Sol Entry scorer and inference-resume path structurally", async () => {
    const artifact = consolidateRawEntryPool(sampleRawPool);
    assert.doesNotThrow(() => validatePaperEntryArtifact(artifact));

    // Resumed inference accepts consolidated artifact
    const inferenceStages = [];
    async function mockInferenceChat(request) {
      inferenceStages.push(request.stage);
      return {
        content: JSON.stringify({
          projectTitle: "Consolidated Paper",
          mainTargetEntryId: "thm:main",
          b0: [],
          inferences: [
            {
              conclusion: "thm:main",
              type: "proof",
              operationKind: "proof",
              premises: ["def:space"],
              argument: "Proof argument.",
              sourceLocator: "sample.pdf#page=2",
              page: 2,
            },
          ],
        }),
      };
    }

    const view = await paperImportClient.requestPaperInferenceFromEntryArtifact({
      artifact,
      chatImpl: mockInferenceChat,
      workflowCapabilities: {
        paper: paperImportV3Capability,
        guideLead: guideLeadContract,
        leadGuided: leadGuidedExtraction,
        aggregate: dualLaneAggregation,
      },
    });

    assert.ok(view);
    assert.equal(view.mainTargetEntryId, "thm:main");
    assert.equal(inferenceStages.every((s) => s === "assemble" || s === "repair"), true);
    assert.ok(!inferenceStages.includes("guide"));
    assert.ok(!inferenceStages.includes("extract"));

    // Sol Entry Scorer compatibility test with consolidated artifact
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "scratch-test-consolidation-sol-"));
    const goldPath = path.join(tempDir, "gold.json");
    const candidatePath = path.join(tempDir, "candidate.json");

    fs.writeFileSync(goldPath, JSON.stringify({
      caseId: "sample-case",
      revision: "v1",
      entries: [
        { id: "thm:main", type: "theorem", name: "Main Theorem", statement: "The map $\\phi: X \\to Y$ is an isomorphism.", page: 2 },
      ],
    }));
    fs.writeFileSync(candidatePath, JSON.stringify(artifact));

    try {
      const plan = await scorePaperEntryExtraction({
        goldPath,
        candidatePath,
        dryRun: true,
      });
      assert.equal(plan.dryRun, true);
      assert.equal(plan.caseId, "sample-case");
      assert.equal(plan.goldRevision, "v1");
      assert.ok(plan.renderedPrompt.includes("Candidate Entry Extraction Artifact (inlined below)"), "inline prompt inlines candidate artifact");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test("consolidateRawEntryPool produces recursively deep-frozen artifact ensuring immutability across all nested objects and entries", () => {
    assert.equal(typeof freezeConsolidatedPaperEntryArtifact, "function");
    const artifact = consolidateRawEntryPool(sampleRawPool);

    // 1. Top-level artifact is frozen
    assert.equal(Object.isFrozen(artifact), true);

    // 2. All nested metadata, container objects, and arrays are recursively frozen
    assert.equal(Object.isFrozen(artifact.source), true);
    assert.equal(Object.isFrozen(artifact.paperGuide), true);
    assert.equal(Object.isFrozen(artifact.paperGuide.leads), true);
    assert.equal(Object.isFrozen(artifact.guideLeadSet), true);
    assert.equal(Object.isFrozen(artifact.guideLeadSet.leads), true);
    assert.equal(Object.isFrozen(artifact.lanes), true);
    assert.equal(Object.isFrozen(artifact.lanes.coverageEntries), true);
    assert.equal(Object.isFrozen(artifact.lanes.leadGuidedEntries), true);
    assert.equal(Object.isFrozen(artifact.aggregation), true);
    assert.equal(Object.isFrozen(artifact.aggregation.records), true);
    assert.equal(Object.isFrozen(artifact.aggregation.conflicts), true);
    assert.equal(Object.isFrozen(artifact.aggregation.counts), true);
    assert.equal(Object.isFrozen(artifact.aliases), true);
    assert.equal(Object.isFrozen(artifact.reviewInputs), true);
    assert.equal(Object.isFrozen(artifact.reviewInputs.missingExtractionCandidates), true);
    assert.equal(Object.isFrozen(artifact.reviewInputs.protectedClaimIds), true);
    assert.equal(Object.isFrozen(artifact.reviewInputs.canonicalIndex), true);
    assert.equal(Object.isFrozen(artifact.diagnostics), true);
    assert.equal(Object.isFrozen(artifact.diagnostics.stages), true);
    assert.equal(Object.isFrozen(artifact.diagnostics.stages[0]), true);
    assert.equal(Object.isFrozen(artifact.diagnostics.calls), true);
    assert.equal(Object.isFrozen(artifact.diagnostics.consolidationSummary), true);
    assert.equal(Object.isFrozen(artifact.diagnostics.moduleIdentity), true);

    // 3. entries array and each entry object are frozen
    assert.equal(Object.isFrozen(artifact.entries), true);
    assert.ok(artifact.entries.length > 0);
    for (const entry of artifact.entries) {
      assert.equal(Object.isFrozen(entry), true);
    }

    // 4. Mechanically assert mutation operations cannot succeed:
    // In non-strict mode contexts / via reflection primitives, mutations return false
    assert.equal(Reflect.set(artifact, "newProperty", 123), false);
    assert.equal(Reflect.set(artifact.source, "fileName", "mutated.pdf"), false);
    assert.equal(Reflect.set(artifact.entries, 0, { id: "mutated" }), false);
    assert.equal(Reflect.set(artifact.entries[0], "name", "Mutated Name"), false);
    assert.equal(Reflect.set(artifact.entries[0], "statement", "Mutated statement"), false);
    assert.equal(Reflect.defineProperty(artifact.entries[0], "extraField", { value: true }), false);
    assert.equal(Reflect.deleteProperty(artifact.entries[0], "id"), false);

    // In strict mode contexts, direct assignment or array mutations throw TypeError
    assert.throws(() => { artifact.entries.push({ id: "mutated" }); }, TypeError);
    assert.throws(() => { artifact.entries[0].name = "mutated"; }, TypeError);
    assert.throws(() => { artifact.source.fileName = "mutated.pdf"; }, TypeError);
  });

  await t.test("preserves legitimate metadata (name, num, external/source) when deduplicating candidates across chunks", () => {
    const multiChunkText = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2\n\n[[PAGE 3]]\nP3";
    const rawPool = createRawEntryPool({
      source: {
        fileName: "metadata-preservation.pdf",
        pageCount: 3,
        characters: multiChunkText.length,
        sourceText: multiChunkText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: 30,
          text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
          rawEntries: [
            // Candidate A: detailed statement and name, but missing num
            {
              id: "thm:linking_invariant",
              type: "theorem",
              name: "环绕数不变量定理",
              statement: "设 $M$ 为三维球面 $S^3$ 中的不相交闭曲线构成的双分支环链 $L = K_1 \\cup K_2$。则其环绕数 $\\operatorname{lk}(K_1, K_2) = \\pm 1$ 是完全拓扑不变量且在同痕下保持不变。",
              page: 2,
              _provenance: { chunkIndex: 0 },
            },
            // Candidate C: very long statement (>200 chars), but name missing (fallback to ID)
            {
              id: "def:homotopy_group",
              type: "definition",
              statement: "设 $X$ 为带基点拓扑空间 $(X, x_0)$。对于任意非负整数 $n \\ge 0$，第 $n$ 阶同伦群 $\\pi_n(X, x_0)$ 定义为从带基点球面 $(S^n, s_0)$ 到 $(X, x_0)$ 的所有保持基点的连续映射在基点同伦关系下的等价类集合，配备由球面上并置诱导的标准群乘法运算结构。",
              page: 1,
              _provenance: { chunkIndex: 0 },
            },
            // Candidate E: external theorem with detailed statement, but missing source on candidate 1
            {
              id: "thm:sard",
              type: "theorem",
              name: "Sard 定理",
              statement: "设 $f: M \\to N$ 为光滑流形之间的光滑映射，则 $M$ 的临界点在 $N$ 中的像（即临界值集合）在测度论意义下其 Lebesgue 测度必为零。",
              page: 1,
              external: true,
              _provenance: { chunkIndex: 0 },
            },
          ],
        },
        {
          chunkIndex: 1,
          pageRange: { first: 2, last: 3 },
          characterCount: 30,
          text: "[[PAGE 2]]\nP2\n\n[[PAGE 3]]\nP3",
          rawEntries: [
            // Candidate B: duplicate of thm:linking_invariant with num as string, but shorter statement
            {
              id: "thm:linking_invariant",
              type: "theorem",
              name: "环绕数不变量定理",
              statement: "环链环绕数 $\\operatorname{lk}(K_1, K_2) = \\pm 1$ 在同痕下不变。",
              num: "1", // String numeric representation
              page: 2,
              _provenance: { chunkIndex: 1 },
            },
            // Candidate D: duplicate of def:homotopy_group with explicit name, but shorter statement
            {
              id: "def:homotopy_group",
              type: "definition",
              name: "同伦群定义",
              statement: "从 $(S^n, s_0)$ 到 $(X, x_0)$ 的同伦等价类群 $\\pi_n(X, x_0)$。",
              page: 1,
              _provenance: { chunkIndex: 1 },
            },
            // Candidate F: duplicate of thm:sard with explicit source reference, but shorter statement
            {
              id: "thm:sard",
              type: "theorem",
              statement: "光滑映射临界值测度为零。",
              page: 1,
              external: true,
              source: "Sard, 1942",
              _provenance: { chunkIndex: 1 },
            },
            // Candidate G: entry using shortTitle instead of name/title
            {
              id: "def:hopf_fibration",
              type: "definition",
              shortTitle: "Hopf 纤维化",
              statement: "映射 $p: S^3 \\to S^2$ 定义了以 $S^1$ 为纤维的主丛。",
              page: 3,
              _provenance: { chunkIndex: 1 },
            },
          ],
        },
      ],
    });

    const artifact = consolidateRawEntryPool(rawPool);
    assert.equal(artifact.entries.length, 4);

    // 1. Check thm:linking_invariant preserved the detailed statement AND inherited num from candidate B
    const linking = artifact.entries.find((e) => e.id === "thm:linking_invariant");
    assert.ok(linking);
    assert.equal(linking.name, "环绕数不变量定理");
    assert.equal(linking.num, 1); // Parsed and inherited from candidate B ("1" -> 1)
    assert.ok(linking.statement.includes("双分支环链")); // Detailed statement from candidate A preserved

    // 2. Check def:homotopy_group preserved long statement from candidate C AND inherited name from candidate D
    const homotopy = artifact.entries.find((e) => e.id === "def:homotopy_group");
    assert.ok(homotopy);
    assert.equal(homotopy.name, "同伦群定义"); // Inherited from candidate D instead of falling back to def:homotopy_group ID
    assert.ok(homotopy.statement.includes("基点同伦关系下的等价类集合")); // Detailed statement from candidate C preserved

    // 3. Check thm:sard preserved detailed statement AND inherited source from candidate F
    const sard = artifact.entries.find((e) => e.id === "thm:sard");
    assert.ok(sard);
    assert.equal(sard.name, "Sard 定理");
    assert.equal(sard.external, true);
    assert.equal(sard.source, "Sard, 1942"); // Inherited from candidate F
    assert.ok(sard.statement.includes("Lebesgue 测度必为零")); // Detailed statement from candidate E preserved

    // 4. Check def:hopf_fibration correctly extracted name from shortTitle
    const hopf = artifact.entries.find((e) => e.id === "def:hopf_fibration");
    assert.ok(hopf);
    assert.equal(hopf.name, "Hopf 纤维化");
    assert.equal(hopf.entryClass, "fact");
    assert.equal(hopf.factKind, "definition");
    assert.equal("type" in hopf, false);
  });

  await t.test("consolidates raw pool with chunk.entries fallback format without dropping candidates", () => {
    const rawPoolWithChunkEntries = {
      schema: "cmath.paper-raw-entry-pool/v1",
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.3",
      source: {
        fileName: "chunk-entries.pdf",
        pageCount: 1,
        characters: 20,
        sourceText: "[[PAGE 1]]\nContent",
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 1 },
          characterCount: 20,
          text: "[[PAGE 1]]\nContent",
          entries: [
            { id: "def:sample", type: "definition", name: "样本定义", statement: "设 $X$ 为非空集。", page: 1 },
          ],
        },
      ],
    };

    const artifact = consolidateRawEntryPool(rawPoolWithChunkEntries);
    assert.equal(artifact.entries.length, 1);
    assert.equal(artifact.entries[0].id, "def:sample");
    assert.equal(artifact.entries[0].name, "样本定义");
  });
});

test("Paper Entry Modular Pipeline - Model JSON Protocol & TeX Backslash Escape Recovery", async (t) => {
  await t.test("recovers TeX alpha, mathcal, operatorname and symbol macros with bare backslashes, retaining single backslashes in parsed values", () => {
    const rawJsonWithBareTeX = '{"entries":[{"id":"thm:alpha","type":"theorem","name":"α-定理","statement":"设 $\\alpha > 0$ 且 $\\mathcal{M}$ 为流形，使得 $\\operatorname{deg}(f) = 1$。","page":1},{"id":"calc:int","type":"calculation","name":"积分计算","statement":"计算公式 $\\sum_{i=1}^n \\int_0^1 \\partial_t f dt = \\infty$ 与集合 $\\{ x \\in X \\mid x > 0 \\}$。","page":2}]}';

    // Strict JSON.parse throws SyntaxError on illegal escapes like \a, \m, \o, \s, \p, \i, \{, \}
    assert.throws(() => JSON.parse(rawJsonWithBareTeX), /JSON/);

    const diagnostics = { repaired: false, repairCount: 0 };
    const parsed = parseModelJson(rawJsonWithBareTeX, { diagnostics });

    assert.equal(diagnostics.repaired, true);
    assert.ok(diagnostics.repairCount >= 8);
    assert.equal(parsed.entries.length, 2);

    // Verify parsed value retains single backslash
    const thm = parsed.entries[0];
    assert.ok(thm.statement.includes("\\alpha"));
    assert.ok(thm.statement.includes("\\mathcal{M}"));
    assert.ok(thm.statement.includes("\\operatorname{deg}"));

    const calc = parsed.entries[1];
    assert.ok(calc.statement.includes("\\sum"));
    assert.ok(calc.statement.includes("\\int"));
    assert.ok(calc.statement.includes("\\partial_t"));
    assert.ok(calc.statement.includes("\\infty"));
    assert.ok(calc.statement.includes("\\{"));
    assert.ok(calc.statement.includes("\\}"));
  });

  await t.test("preserves valid whitespace, quote, backslash, and unicode escape sequences without alteration", () => {
    // JSON with valid \n (newline), \t (tab), \" (escaped quote), \\ (escaped backslash), and \u03b1 (unicode alpha)
    const validJson = '{"entries":[{"id":"def:unicode","type":"definition","name":"Valid Escapes","statement":"Line 1\\nLine 2 with \\"quoted text\\", tab \\t, double backslash \\\\, and unicode \\u03b1.","page":1}]}';

    // Strict JSON.parse works directly
    assert.doesNotThrow(() => JSON.parse(validJson));

    const diagnostics = { repaired: false, repairCount: 0 };
    const parsed = parseModelJson(validJson, { diagnostics });

    // Zero repairs needed for already valid escapes
    assert.equal(diagnostics.repaired, false);
    assert.equal(diagnostics.repairCount, 0);

    const stmt = parsed.entries[0].statement;
    assert.ok(stmt.includes("Line 1\nLine 2")); // \n became real newline
    assert.ok(stmt.includes('"quoted text"')); // \" became quote
    assert.ok(stmt.includes("\t")); // \t became tab
    assert.ok(stmt.includes("\\")); // \\ became single backslash
    assert.ok(stmt.includes("α")); // \u03b1 became Greek alpha

    // Also verify mixed case: valid \n, \u03b1 AND bare \alpha in the same string
    const mixedJson = '{"statement":"Valid newline\\n, unicode \\u03b1, and bare TeX \\alpha."}';
    assert.throws(() => JSON.parse(mixedJson));
    const mixedDiag = { repaired: false, repairCount: 0 };
    const mixedParsed = parseModelJson(mixedJson, { diagnostics: mixedDiag });
    assert.equal(mixedDiag.repaired, true);
    assert.equal(mixedDiag.repairCount, 1);
    assert.ok(mixedParsed.statement.includes("Valid newline\n"));
    assert.ok(mixedParsed.statement.includes("unicode α"));
    assert.ok(mixedParsed.statement.includes("bare TeX \\alpha."));
  });

  await t.test("recovers TeX commands starting with \\u that are not 4 hex digits (e.g. \\underbrace, \\uparrow)", () => {
    const rawWithUnderbrace = '{"statement":"Formulas: \\underbrace{A + B}_{\\text{total}} and \\uparrow."}';
    assert.throws(() => JSON.parse(rawWithUnderbrace));

    const diagnostics = { repaired: false, repairCount: 0 };
    const parsed = parseModelJson(rawWithUnderbrace, { diagnostics });
    assert.equal(diagnostics.repaired, true);
    assert.ok(parsed.statement.includes("\\underbrace"));
    assert.ok(parsed.statement.includes("\\uparrow"));
  });

  await t.test("extracts JSON wrapped in markdown code blocks even with bare TeX escapes", () => {
    const markdownWrapped = [
      "Here is the extraction result in JSON format:",
      "```json",
      "{",
      '  "entries": [',
      '    { "id": "thm:knot", "type": "theorem", "name": "结不变量", "statement": "设 $K \\subset S^3$ 为纽结，则 $\\Delta_K(t) \\in \\mathbb{Z}[t, t^{-1}]$。", "page": 2 }',
      "  ]",
      "}",
      "```",
      "Hope this helps!",
    ].join("\n");

    const diagnostics = { repaired: false, repairCount: 0 };
    const parsed = parseModelJson(markdownWrapped, { diagnostics });
    assert.ok(parsed);
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].id, "thm:knot");
    assert.ok(parsed.entries[0].statement.includes("\\subset"));
    assert.ok(parsed.entries[0].statement.includes("\\Delta_K"));
    assert.ok(parsed.entries[0].statement.includes("\\mathbb{Z}"));
  });

  await t.test("strictly fails closed on broken JSON structure, missing quotes, missing braces, trailing commas, or empty content", () => {
    // Empty output
    assert.throws(() => parseModelJson(""), /模型输出为空/);
    assert.throws(() => parseModelJson("   "), /模型输出为空/);
    assert.throws(() => parseModelJson(null), /模型输出为空/);

    // No JSON block
    assert.throws(() => parseModelJson("No JSON content here"), /模型输出不包含有效 JSON 片段/);

    // Missing closing brace
    assert.throws(() => parseModelJson('{"entries": [{"statement": "Let \\alpha = 1"'), /JSON/);

    // Missing closing quote
    assert.throws(() => parseModelJson('{"name: "Test \\alpha"}'), /JSON/);

    // Trailing comma in array or object
    assert.throws(() => parseModelJson('{"entries": [{"id": "e1", "name": "E1",}],}'), /JSON/);

    // Bare TeX backslash outside string (structural region)
    assert.throws(() => parseModelJson('{\\alpha: "value"}'), /JSON/);

    // Completely corrupted text
    assert.throws(() => parseModelJson("Malformed output {not-json"), /模型输出不包含有效 JSON 片段/);
  });

  await t.test("parallel chunk extraction records per-chunk repair flags, counts, and raw pool diagnostics on TeX recovery", async () => {
    const text3Pages = [
      "[[PAGE 1]]\nDefinition 1: Alpha structure $\\alpha$.\n\n[[PAGE 2]]\nTheorem 1: Mathcal result $\\mathcal{M}$.\n\n[[PAGE 3]]\nCalculation 1: Degree $\\operatorname{deg}$.",
    ].join("\n\n");

    const stageEvents = [];

    async function mockParallelChatWithRepairs(req) {
      if (req.chunkIndex === 0) {
        // Chunk 0 has bare TeX escapes: \alpha, \mathcal
        return {
          content: '{"entries":[{"id":"def:alpha","type":"definition","name":"Alpha 定义","statement":"定义 $\\alpha \\in \\mathcal{A}$。","page":1}]}',
        };
      } else {
        // Chunk 1 has clean JSON
        return {
          content: JSON.stringify({
            entries: [
              { id: "thm:clean", type: "theorem", name: "Clean Thm", statement: "Clean statement with $x=y$.", page: 2 },
            ],
          }),
        };
      }
    }

    const rawPool = await extractParallelRawEntryPool({
      fileName: "repair-test.pdf",
      pageCount: 2,
      text: text3Pages,
      chatImpl: mockParallelChatWithRepairs,
      maxChunks: 2,
      forceChunks: true,
      onStage: (st, info) => stageEvents.push({ st, info }),
    });

    assert.equal(rawPool.chunks.length, 2);
    assert.equal(rawPool.rawEntries.length, 2);

    // Chunk 0 recovered
    assert.equal(rawPool.rawEntries[0].id, "def:alpha");
    assert.ok(rawPool.rawEntries[0].statement.includes("\\alpha"));
    assert.ok(rawPool.rawEntries[0].statement.includes("\\mathcal{A}"));

    // Check calls diagnostics
    assert.equal(rawPool.diagnostics.calls[0].repaired, true);
    assert.ok(rawPool.diagnostics.calls[0].repairCount >= 2);
    assert.equal(rawPool.diagnostics.calls[1].repaired, false);
    assert.equal(rawPool.diagnostics.calls[1].repairCount, 0);

    // Check pool-level diagnostics
    assert.ok(rawPool.diagnostics.jsonRepairCount >= 2);
    assert.equal(rawPool.diagnostics.repairSummary.repairedChunkCount, 1);
    assert.ok(rawPool.diagnostics.repairSummary.totalJsonRepairs >= 2);

    // Check notify event
    const repairEvent = stageEvents.find((e) => e.st === "parallel-extract-json-repair");
    assert.ok(repairEvent);
    assert.equal(repairEvent.info.chunk, 1);

    // Schema validation and consolidation work seamlessly
    assert.doesNotThrow(() => validateRawEntryPool(rawPool));
    const consolidated = consolidateRawEntryPool(rawPool);
    assert.equal(consolidated.entries.length, 2);
  });
});

test("Paper Entry Modular Pipeline - Isolated Dual-Lane Fixed-Block Extraction (v1.4)", async (t) => {
  await t.test("exports valid v1.4 constants and functions", () => {
    assert.equal(EXTRACTION_MODULE_VERSION_V1_4, "paper-entry-parallel-extraction-v1.4");
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1.4"));
    assert.equal(typeof splitTextIntoFixedBlocks, "function");
    assert.equal(typeof v14FoundationPrompt, "function");
    assert.equal(typeof v14ResultPrompt, "function");
    assert.equal(typeof v14LanePrompt, "function");
  });

  await t.test("confirms exact 2-page base blocks with 1-page overlap for adjacent blocks", () => {
    const text6Pages = [
      "[[PAGE 1]]\nDefinition 1: Complex numbers $\\mathbb{C}$.",
      "[[PAGE 2]]\nDefinition 2: Quaternions $\\mathbb{H}$.",
      "[[PAGE 3]]\nDefinition 3: Octonions $\\mathbb{O}$.",
      "[[PAGE 4]]\nTheorem 1: Hopf fibration $S^3 \\to S^2$.",
      "[[PAGE 5]]\nTheorem 2: Second Hopf fibration $S^7 \\to S^4$.",
      "[[PAGE 6]]\nTheorem 3: Third Hopf fibration $S^{15} \\to S^8$.",
    ].join("\n\n");

    const blocks6 = splitTextIntoFixedBlocks(text6Pages, 2, 1);
    assert.equal(blocks6.length, 3);

    // Block 0: Pages 1, 2
    assert.ok(blocks6[0].includes("[[PAGE 1]]"));
    assert.ok(blocks6[0].includes("[[PAGE 2]]"));
    assert.ok(!blocks6[0].includes("[[PAGE 3]]"));

    // Block 1: Overlaps page 2 with Block 0, covers pages 2, 3, 4
    assert.ok(!blocks6[1].includes("[[PAGE 1]]"));
    assert.ok(blocks6[1].includes("[[PAGE 2]]"));
    assert.ok(blocks6[1].includes("[[PAGE 3]]"));
    assert.ok(blocks6[1].includes("[[PAGE 4]]"));
    assert.ok(!blocks6[1].includes("[[PAGE 5]]"));

    // Block 2: Overlaps page 4 with Block 1, covers pages 4, 5, 6
    assert.ok(!blocks6[2].includes("[[PAGE 1]]"));
    assert.ok(!blocks6[2].includes("[[PAGE 2]]"));
    assert.ok(!blocks6[2].includes("[[PAGE 3]]"));
    assert.ok(blocks6[2].includes("[[PAGE 4]]"));
    assert.ok(blocks6[2].includes("[[PAGE 5]]"));
    assert.ok(blocks6[2].includes("[[PAGE 6]]"));

    // 5-page document -> 3 blocks: [1,2], [2,3,4], [4,5]
    const text5Pages = [
      "[[PAGE 1]]\nP1",
      "[[PAGE 2]]\nP2",
      "[[PAGE 3]]\nP3",
      "[[PAGE 4]]\nP4",
      "[[PAGE 5]]\nP5",
    ].join("\n\n");
    const blocks5 = splitTextIntoFixedBlocks(text5Pages, 2, 1);
    assert.equal(blocks5.length, 3);
    assert.ok(blocks5[0].includes("[[PAGE 1]]") && blocks5[0].includes("[[PAGE 2]]") && !blocks5[0].includes("[[PAGE 3]]"));
    assert.ok(!blocks5[1].includes("[[PAGE 1]]") && blocks5[1].includes("[[PAGE 2]]") && blocks5[1].includes("[[PAGE 3]]") && blocks5[1].includes("[[PAGE 4]]") && !blocks5[1].includes("[[PAGE 5]]"));
    assert.ok(!blocks5[2].includes("[[PAGE 3]]") && blocks5[2].includes("[[PAGE 4]]") && blocks5[2].includes("[[PAGE 5]]"));

    // 4-page document -> 2 blocks: [1,2], [2,3,4]
    const text4Pages = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2\n\n[[PAGE 3]]\nP3\n\n[[PAGE 4]]\nP4";
    const blocks4 = splitTextIntoFixedBlocks(text4Pages, 2, 1);
    assert.equal(blocks4.length, 2);
    assert.ok(blocks4[0].includes("[[PAGE 1]]") && blocks4[0].includes("[[PAGE 2]]") && !blocks4[0].includes("[[PAGE 3]]"));
    assert.ok(!blocks4[1].includes("[[PAGE 1]]") && blocks4[1].includes("[[PAGE 2]]") && blocks4[1].includes("[[PAGE 3]]") && blocks4[1].includes("[[PAGE 4]]"));

    // 3-page document -> 2 blocks (pages 1-2, pages 2-3)
    const text3Pages = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2\n\n[[PAGE 3]]\nP3";
    const blocks3 = splitTextIntoFixedBlocks(text3Pages, 2, 1);
    assert.equal(blocks3.length, 2);
    assert.ok(blocks3[0].includes("[[PAGE 1]]") && blocks3[0].includes("[[PAGE 2]]"));
    assert.ok(blocks3[1].includes("[[PAGE 2]]") && blocks3[1].includes("[[PAGE 3]]"));

    // 2-page document -> 1 block (pages 1-2)
    const text2Pages = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";
    const blocks2 = splitTextIntoFixedBlocks(text2Pages, 2, 1);
    assert.equal(blocks2.length, 1);
    assert.ok(blocks2[0].includes("[[PAGE 1]]") && blocks2[0].includes("[[PAGE 2]]"));

    // 1-page document -> 1 block (page 1)
    const text1Page = "[[PAGE 1]]\nP1";
    const blocks1 = splitTextIntoFixedBlocks(text1Page, 2, 1);
    assert.equal(blocks1.length, 1);
    assert.ok(blocks1[0].includes("[[PAGE 1]]"));

    // 19-page document -> 10 blocks (not 18 sliding windows)
    const text19Pages = Array.from({ length: 19 }, (_, i) => `[[PAGE ${i + 1}]]\nPage content ${i + 1}`).join("\n\n");
    const blocks19 = splitTextIntoFixedBlocks(text19Pages, 2, 1);
    assert.equal(blocks19.length, 10);
    assert.ok(blocks19[0].includes("[[PAGE 1]]") && blocks19[0].includes("[[PAGE 2]]") && !blocks19[0].includes("[[PAGE 3]]"));
    assert.ok(blocks19[1].includes("[[PAGE 2]]") && blocks19[1].includes("[[PAGE 3]]") && blocks19[1].includes("[[PAGE 4]]") && !blocks19[1].includes("[[PAGE 5]]"));
    assert.ok(blocks19[9].includes("[[PAGE 18]]") && blocks19[9].includes("[[PAGE 19]]"));
  });

  await t.test("confirms two lane calls per block begin without serial dependence across all blocks", async () => {
    const text3Pages = [
      "[[PAGE 1]]\nDefinition 1: Complex numbers $\\mathbb{C}$.",
      "[[PAGE 2]]\nDefinition 2: Quaternions $\\mathbb{H}$.",
      "[[PAGE 3]]\nTheorem 1: Hopf fibration $S^3 \\to S^2$.",
    ].join("\n\n");

    const callStartTimes = [];
    const callFinishTimes = [];
    const executedLanes = [];

    async function mockParallelChat(req) {
      const started = performance.now();
      callStartTimes.push(started);
      executedLanes.push({ block: req.chunkIndex, lane: req.lane });
      // Simulate 50ms async model call
      await new Promise((r) => setTimeout(r, 50));
      callFinishTimes.push(performance.now());

      if (req.lane === "foundation") {
        return {
          content: JSON.stringify({
            entries: [
              {
                id: `block_${req.chunkIndex}_def`,
                type: "definition",
                name: `Block ${req.chunkIndex} Def`,
                statement: `Foundation statement from block ${req.chunkIndex} with $x \\in X$.`,
                page: req.chunkIndex + 1,
              },
            ],
          }),
        };
      } else {
        return {
          content: JSON.stringify({
            entries: [
              {
                id: `block_${req.chunkIndex}_thm`,
                type: "theorem",
                name: `Block ${req.chunkIndex} Thm`,
                statement: `Result statement from block ${req.chunkIndex} with $y \\in Y$.`,
                page: req.chunkIndex + 1,
              },
            ],
          }),
        };
      }
    }

    const rawPool = await extractParallelRawEntryPool({
      fileName: "dual-lane-test.pdf",
      pageCount: 3,
      text: text3Pages,
      chatImpl: mockParallelChat,
      version: "paper-entry-parallel-extraction-v1.4",
    });

    // 3-page document -> 2 blocks -> exactly 4 calls (2 blocks * 2 lanes)
    assert.equal(callStartTimes.length, 4);
    assert.equal(executedLanes.length, 4);

    // Verify all 4 calls started before the first call finished (fully non-blocking concurrent start)
    assert.ok(callStartTimes[1] < callFinishTimes[0], "Call 1 must start before Call 0 finishes");
    assert.ok(callStartTimes[2] < callFinishTimes[0], "Call 2 must start before Call 0 finishes");
    assert.ok(callStartTimes[3] < callFinishTimes[0], "Call 3 must start before Call 0 finishes");

    // Both lanes executed for each block
    const block0Lanes = executedLanes.filter((c) => c.block === 0).map((c) => c.lane).sort();
    const block1Lanes = executedLanes.filter((c) => c.block === 1).map((c) => c.lane).sort();
    assert.deepEqual(block0Lanes, ["foundation", "result"]);
    assert.deepEqual(block1Lanes, ["foundation", "result"]);

    assert.equal(rawPool.chunks.length, 2);
    assert.equal(rawPool.rawEntries.length, 4);
    assert.equal(rawPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.4");
  });

  await t.test("confirms measuredFetch retries once on prompt_cache_retention compatibility 400 and removes property from retry payload", async () => {
    const { createMeasuredFetch } = await import("../scripts/run-paper-entry-raw-extraction.mjs");

    // Scenario 1: Intermittent 400 on attempt 1, 200 on attempt 2
    const fetchCalls = [];
    const recordedCalls = [];
    let attemptCount = 0;

    const mockFetch = async (url, init) => {
      attemptCount += 1;
      fetchCalls.push({ url, init, attempt: attemptCount });
      if (attemptCount === 1) {
        return new Response(JSON.stringify({ error: { message: "prompt_cache_retention is not supported on this model" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"entries":[]}' } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const measuredFetch = createMeasuredFetch(recordedCalls, { fetchImpl: mockFetch });
    const initialPayload = {
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: "test" }],
      prompt_cache_retention: "auto",
    };

    const response = await measuredFetch("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(initialPayload),
      headers: { "Content-Type": "application/json" },
    });

    assert.equal(response.status, 200);
    assert.equal(recordedCalls.length, 2);
    assert.equal(recordedCalls[0].attempt, 1);
    assert.equal(recordedCalls[0].status, 400);
    assert.equal(recordedCalls[1].attempt, 2);
    assert.equal(recordedCalls[1].status, 200);

    // Verify prompt_cache_retention was stripped on retry
    assert.equal(JSON.parse(fetchCalls[0].init.body).prompt_cache_retention, "auto");
    assert.equal(JSON.parse(fetchCalls[1].init.body).prompt_cache_retention, undefined);

    // Scenario 2: Generic 400 error does NOT retry
    const genericRecordedCalls = [];
    let genericAttempts = 0;
    const genericMockFetch = async (url, init) => {
      genericAttempts += 1;
      return new Response(JSON.stringify({ error: { message: "Invalid parameter: foo" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    };

    const genericMeasuredFetch = createMeasuredFetch(genericRecordedCalls, { fetchImpl: genericMockFetch });
    const genericResponse = await genericMeasuredFetch("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });
    assert.equal(genericResponse.status, 400);
    assert.equal(genericAttempts, 1);
    assert.equal(genericRecordedCalls.length, 1);

    // Scenario 3: Persistent prompt_cache_retention 400 retries at most once (stops at attempt 2)
    const persistentRecordedCalls = [];
    let persistentAttempts = 0;
    const persistentMockFetch = async (url, init) => {
      persistentAttempts += 1;
      return new Response("prompt_cache_retention is not supported on this model", {
        status: 400,
      });
    };

    const persistentMeasuredFetch = createMeasuredFetch(persistentRecordedCalls, { fetchImpl: persistentMockFetch });
    const persistentResponse = await persistentMeasuredFetch("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });
    assert.equal(persistentResponse.status, 400);
    assert.equal(persistentAttempts, 2);
    assert.equal(persistentRecordedCalls.length, 2);
  });

  await t.test("confirms measuredFetch retries once on HTTP 500-599 responses and records both attempts", async () => {
    const { createMeasuredFetch } = await import("../scripts/run-paper-entry-raw-extraction.mjs");

    // Scenario 1: 502 then 200 succeeds and records 2 attempts
    const calls502 = [];
    let attempts502 = 0;
    const mockFetch502 = async (url, init) => {
      attempts502 += 1;
      if (attempts502 === 1) {
        return new Response("Bad Gateway", { status: 502, headers: { "Content-Type": "text/plain" } });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"entries":[]}' } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const measuredFetch502 = createMeasuredFetch(calls502, { fetchImpl: mockFetch502 });
    const res502 = await measuredFetch502("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });

    assert.equal(res502.status, 200);
    assert.equal(attempts502, 2);
    assert.equal(calls502.length, 2);
    assert.equal(calls502[0].attempt, 1);
    assert.equal(calls502[0].status, 502);
    assert.equal(calls502[1].attempt, 2);
    assert.equal(calls502[1].status, 200);

    // Scenario 2: persistent 503 returns second 503 after exactly 2 attempts
    const calls503 = [];
    let attempts503 = 0;
    const mockFetch503 = async (url, init) => {
      attempts503 += 1;
      return new Response("Service Unavailable", { status: 503, headers: { "Content-Type": "text/plain" } });
    };

    const measuredFetch503 = createMeasuredFetch(calls503, { fetchImpl: mockFetch503 });
    const res503 = await measuredFetch503("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });

    assert.equal(res503.status, 503);
    assert.equal(attempts503, 2);
    assert.equal(calls503.length, 2);
    assert.equal(calls503[0].attempt, 1);
    assert.equal(calls503[0].status, 503);
    assert.equal(calls503[1].attempt, 2);
    assert.equal(calls503[1].status, 503);

    // Scenario 3: 504 then 200 succeeds and records 2 attempts
    const calls504 = [];
    let attempts504 = 0;
    const mockFetch504 = async (url, init) => {
      attempts504 += 1;
      if (attempts504 === 1) {
        return new Response("Gateway Timeout", { status: 504, headers: { "Content-Type": "text/plain" } });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"entries":[]}' } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const measuredFetch504 = createMeasuredFetch(calls504, { fetchImpl: mockFetch504 });
    const res504 = await measuredFetch504("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });

    assert.equal(res504.status, 200);
    assert.equal(attempts504, 2);
    assert.equal(calls504.length, 2);
    assert.equal(calls504[0].attempt, 1);
    assert.equal(calls504[0].status, 504);
    assert.equal(calls504[1].attempt, 2);
    assert.equal(calls504[1].status, 200);

    // Scenario 4: HTTP 500 is retried once, like every transient 5xx.
    const calls500 = [];
    let attempts500 = 0;
    const mockFetch500 = async (url, init) => {
      attempts500 += 1;
      return attempts500 === 1
        ? new Response("Internal Server Error", { status: 500 })
        : new Response(JSON.stringify({ choices: [{ message: { content: '{"entries":[]}' } }] }), { status: 200 });
    };

    const measuredFetch500 = createMeasuredFetch(calls500, { fetchImpl: mockFetch500 });
    const res500 = await measuredFetch500("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });

    assert.equal(res500.status, 200);
    assert.equal(attempts500, 2);
    assert.equal(calls500.length, 2);
    assert.equal(calls500[0].attempt, 1);
    assert.equal(calls500[0].status, 500);
    assert.equal(calls500[1].status, 200);

    // Scenario 5: generic HTTP 400 is NOT retried (records 1 attempt)
    const calls400 = [];
    let attempts400 = 0;
    const mockFetch400 = async (url, init) => {
      attempts400 += 1;
      return new Response(JSON.stringify({ error: { message: "Bad Request: invalid parameter" } }), { status: 400 });
    };

    const measuredFetch400 = createMeasuredFetch(calls400, { fetchImpl: mockFetch400 });
    const res400 = await measuredFetch400("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
    });

    assert.equal(res400.status, 400);
    assert.equal(attempts400, 1);
    assert.equal(calls400.length, 1);
    assert.equal(calls400[0].attempt, 1);
    assert.equal(calls400[0].status, 400);

    // Scenario 6: Aborted signal does NOT retry on HTTP 502
    const callsAborted = [];
    let attemptsAborted = 0;
    const controller = new AbortController();
    const mockFetchAborted = async (url, init) => {
      attemptsAborted += 1;
      controller.abort();
      return new Response("Bad Gateway", { status: 502 });
    };

    const measuredFetchAborted = createMeasuredFetch(callsAborted, { fetchImpl: mockFetchAborted });
    const resAborted = await measuredFetchAborted("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna" }),
      signal: controller.signal,
    });

    assert.equal(resAborted.status, 502);
    assert.equal(attemptsAborted, 1);
    assert.equal(callsAborted.length, 1);
  });

  await t.test("confirms failure of one parallel request in v1.4 aborts peer in-flight requests promptly via shared AbortController", async () => {
    const text4Pages = [
      "[[PAGE 1]]\nP1",
      "[[PAGE 2]]\nP2",
      "[[PAGE 3]]\nP3",
      "[[PAGE 4]]\nP4",
    ].join("\n\n");

    const signalsReceived = [];
    let peerAbortedCount = 0;

    async function mockFailingChat(req) {
      signalsReceived.push(req.signal);

      // Block 0 foundation lane fails immediately
      if (req.blockIndex === 0 && req.lane === "foundation") {
        throw new Error("Simulated hard failure on block 0 foundation");
      }

      // Other peer requests wait for a moment and observe if their signal gets aborted
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({ content: JSON.stringify({ entries: [] }) });
        }, 1000);

        if (req.signal) {
          if (req.signal.aborted) {
            clearTimeout(timeout);
            peerAbortedCount += 1;
            reject(new Error("aborted"));
          } else {
            req.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              peerAbortedCount += 1;
              reject(new Error("aborted"));
            }, { once: true });
          }
        }
      });
    }

    const start = performance.now();
    await assert.rejects(
      async () => {
        await extractParallelRawEntryPool({
          fileName: "abort-test.pdf",
          pageCount: 4,
          text: text4Pages,
          chatImpl: mockFailingChat,
          version: "paper-entry-parallel-extraction-v1.4",
        });
      },
      (err) => {
        assert.ok(err.message.includes("Simulated hard failure on block 0 foundation"));
        assert.ok(err.diagnostics);
        assert.ok(Array.isArray(err.diagnostics.stages));
        return true;
      }
    );
    const duration = performance.now() - start;

    // Fast fail: Did NOT wait for the 1000ms timer
    assert.ok(duration < 500, `Expected fast fail-closed abort under 500ms, took ${duration}ms`);
    // Signals received by peer requests were aborted
    assert.ok(signalsReceived.some((s) => s?.aborted === true));
  });

  await t.test("confirms lane prompts have disjoint responsibilities and strictly exclude review, inference, assembly, and downstream decisions", () => {
    const fPrompt = v14FoundationPrompt({
      fileName: "test-foundation.pdf",
      pageCount: 4,
      text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
      pageRange: { first: 1, last: 2 },
      blockIndex: 0,
      totalBlocks: 3,
    });

    const rPrompt = v14ResultPrompt({
      fileName: "test-result.pdf",
      pageCount: 4,
      text: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2",
      pageRange: { first: 1, last: 2 },
      blockIndex: 0,
      totalBlocks: 3,
    });

    // Foundation prompt specifics
    assert.ok(fPrompt.includes("基础通道") || fPrompt.includes("Foundation Lane"));
    assert.ok(fPrompt.includes("基础定义") && fPrompt.includes("definition"));
    assert.ok(fPrompt.includes("记号与约定"));
    assert.ok(fPrompt.includes("构造与计算公式") || (fPrompt.includes("algorithm") && fPrompt.includes("calculation")));
    assert.ok(fPrompt.includes("外部引用基础") || fPrompt.includes("external foundation"));
    // Explicitly forbids result objects
    assert.ok(fPrompt.includes("Result 通道") && (fPrompt.includes("一律不要提取") || fPrompt.includes("专门提取")));

    // Result prompt specifics
    assert.ok(rPrompt.includes("结果通道") || rPrompt.includes("Result Lane"));
    assert.ok(rPrompt.includes("引理") && rPrompt.includes("lemma"));
    assert.ok(rPrompt.includes("命题") && rPrompt.includes("proposition"));
    assert.ok(rPrompt.includes("定理") && rPrompt.includes("theorem"));
    assert.ok(rPrompt.includes("推论"));
    // Explicitly forbids foundation objects
    assert.ok(rPrompt.includes("Foundation 通道") && (rPrompt.includes("一律不要提取") || rPrompt.includes("专门提取")));

    // Both prompts strictly forbid review, inference/proof synthesis, and downstream decisions
    for (const prompt of [fPrompt, rPrompt]) {
      assert.ok(prompt.includes("严禁推导") || prompt.includes("Inference"));
      assert.ok(prompt.includes("严禁下游决策") || prompt.includes("下游决策"));
      assert.ok(prompt.includes("B0 清单") || prompt.includes("B0"));
      assert.ok(prompt.includes("mainTarget"));
      assert.ok(prompt.includes("Paper Guide"));
      assert.ok(prompt.includes("Review") || prompt.includes("评审"));
      assert.ok(prompt.includes("原子性") || prompt.includes("Atomicity"));
      assert.ok(prompt.includes("简体中文"));

      // Exclude self-check or scoring leakage
      assert.ok(!prompt.includes("Self-Check"));
      assert.ok(!prompt.includes("Sol Entry score"));
      assert.ok(!prompt.includes("RT-invariants"));
      assert.ok(!prompt.includes("Kirby"));
    }

    // Generic lane prompt dispatcher
    const dispatchedF = v14LanePrompt({ lane: "foundation", fileName: "f.pdf", pageCount: 1, text: "t" });
    const dispatchedR = v14LanePrompt({ lane: "result", fileName: "r.pdf", pageCount: 1, text: "t" });
    assert.ok(dispatchedF.includes("Foundation"));
    assert.ok(dispatchedR.includes("Result"));
    assert.throws(() => v14LanePrompt({ lane: "unknown", fileName: "u.pdf", pageCount: 1, text: "t" }), /Unknown lane/);
  });

  await t.test("confirms lane provenance is retained on each raw entry and in call diagnostics, and zero-call consolidation works unchanged", () => {
    const mockFoundation = [
      { id: "def:manifold", type: "definition", name: "流形定义", statement: "设 $M$ 为 4-流形。", page: 1 },
      { id: "calc:norm", type: "calculation", name: "归一化公式", statement: "归一化常数 $\\tau = 1$。", page: 2 },
    ];
    const mockResult = [
      { id: "lem:compact", type: "lemma", name: "紧致引理", statement: "流形 $M$ 是紧致的。", page: 2 },
      { id: "thm:main", type: "theorem", name: "主分类定理", statement: "闭单连通 4-流形同胚分类定理。", page: 2 },
    ];

    async function mockChat(req) {
      if (req.lane === "foundation") {
        return { content: JSON.stringify({ entries: mockFoundation }) };
      } else {
        return { content: JSON.stringify({ entries: mockResult }) };
      }
    }

    const text = "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nThm 1";
    return extractParallelRawEntryPool({
      fileName: "provenance-v14.pdf",
      pageCount: 2,
      text,
      chatImpl: mockChat,
      version: "paper-entry-parallel-extraction-v1.4",
    }).then((rawPool) => {
      assert.equal(rawPool.schema, RAW_ENTRY_POOL_SCHEMA);
      assert.equal(rawPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.4");
      assert.equal(rawPool.source.fileName, "provenance-v14.pdf");
      assert.equal(rawPool.source.pageCount, 2);
      assert.equal(rawPool.chunks.length, 1); // 2 pages -> 1 block
      assert.equal(rawPool.rawEntries.length, 4);

      // Verify provenance on entries
      const foundationEntries = rawPool.rawEntries.filter((e) => e._provenance.lane === "foundation");
      const resultEntries = rawPool.rawEntries.filter((e) => e._provenance.lane === "result");
      assert.equal(foundationEntries.length, 2);
      assert.equal(resultEntries.length, 2);

      for (const e of foundationEntries) {
        assert.equal(e._provenance.lane, "foundation");
        assert.equal(e._provenance.chunkIndex, 0);
        assert.equal(e._provenance.version, "paper-entry-parallel-extraction-v1.4");
      }
      for (const e of resultEntries) {
        assert.equal(e._provenance.lane, "result");
        assert.equal(e._provenance.chunkIndex, 0);
        assert.equal(e._provenance.version, "paper-entry-parallel-extraction-v1.4");
      }

      // Verify provenance in diagnostics.calls
      assert.equal(rawPool.diagnostics.calls.length, 2);
      assert.equal(rawPool.diagnostics.calls[0].lane, "foundation");
      assert.equal(rawPool.diagnostics.calls[1].lane, "result");
      assert.equal(rawPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.4");

      // Deep immutability check
      assert.ok(Object.isFrozen(rawPool));
      assert.ok(Object.isFrozen(rawPool.rawEntries));
      assert.throws(() => { rawPool.rawEntries.push({}); });

      // Zero-call deterministic consolidation succeeds unchanged
      assert.doesNotThrow(() => validateRawEntryPool(rawPool));
      const consolidated = consolidateRawEntryPool(rawPool);
      assert.equal(consolidated.schema, ENTRY_ARTIFACT_SCHEMA);
      assert.equal(consolidated.entryModuleVersion, CONSOLIDATION_MODULE_VERSION);
      assert.equal(consolidated.entries.length, 4);
      assert.equal(consolidated.diagnostics.calls.length, 0); // 0 model calls
    });
  });

  await t.test("confirms v1.3 regression unchanged when version is omitted or requested as v1.3", async () => {
    let callCount = 0;
    const callLanes = [];

    async function mockV13Chat(req) {
      callCount += 1;
      callLanes.push(req.lane);
      return {
        content: JSON.stringify({
          entries: [
            { id: `chunk_${req.chunkIndex}_def`, type: "definition", name: `Def ${req.chunkIndex}`, statement: `Statement $x=1$.`, page: 1 },
          ],
        }),
      };
    }

    const text = "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2";

    // 1. Default (no version argument) uses v1.3
    const defaultPool = await extractParallelRawEntryPool({
      fileName: "default-v13.pdf",
      pageCount: 2,
      text,
      chatImpl: mockV13Chat,
    });
    assert.equal(defaultPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.3");
    assert.equal(defaultPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.3");
    // In v1.3, single call per chunk without lane
    assert.equal(callLanes[0], undefined);

    // 2. Explicit version: "paper-entry-parallel-extraction-v1.3" or "v1.3"
    const explicitPool = await extractParallelRawEntryPool({
      fileName: "explicit-v13.pdf",
      pageCount: 2,
      text,
      chatImpl: mockV13Chat,
      version: "v1.3",
    });
    assert.equal(explicitPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.3");
    assert.equal(explicitPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.3");
  });

  await t.test("confirms schema validation and normalization accept and preserve v1.4", () => {
    const srcText = "[[PAGE 1]]\nDefinition 1: Alpha.\n\n[[PAGE 2]]\nTheorem 1: Beta.";
    const validV14RawPool = {
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.4",
      source: {
        fileName: "v14.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            { id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha def $a=1$.", page: 1, _provenance: { chunkIndex: 0, lane: "foundation" } },
            { id: "thm:beta", type: "theorem", name: "Beta", statement: "Beta thm $b=2$.", page: 2, _provenance: { chunkIndex: 0, lane: "result" } },
          ],
        },
      ],
      rawEntries: [
        { id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha def $a=1$.", page: 1, _provenance: { chunkIndex: 0, lane: "foundation" } },
        { id: "thm:beta", type: "theorem", name: "Beta", statement: "Beta thm $b=2$.", page: 2, _provenance: { chunkIndex: 0, lane: "result" } },
      ],
      diagnostics: {
        durationMs: 40,
        stages: [{ stage: "extract", atMs: 40 }],
        calls: [
          { stage: "extract", lane: "foundation", chunkIndex: 0, durationMs: 30 },
          { stage: "extract", lane: "result", chunkIndex: 0, durationMs: 35 },
        ],
        chunkCount: 1,
        rawEntryCount: 2,
        modelCallMetadata: { model: "gpt-5.6-luna", provider: "Luna Gateway", reasoningEffort: "none" },
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1.4", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };

    assert.doesNotThrow(() => validateRawEntryPool(validV14RawPool));
    const normalized = paperRawEntryPool.normalizeRawEntryPool(validV14RawPool);
    assert.equal(normalized.extractionModuleVersion, "paper-entry-parallel-extraction-v1.4");
    assert.equal(normalized.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.4");

    // Rejected on unknown version
    assert.throws(
      () => validateRawEntryPool({ ...validV14RawPool, extractionModuleVersion: "paper-entry-parallel-extraction-v9.9" }),
      /无效的 extractionModuleVersion/
    );
  });
});

test("Paper Entry Parallel Extraction v1.7 - one read, dual output", async () => {
  assert.equal(EXTRACTION_MODULE_VERSION_V1_7, "paper-entry-parallel-extraction-v1.7");
  assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes(EXTRACTION_MODULE_VERSION_V1_7));
  const prompt = v17DualOutputPrompt({ fileName: "sample.pdf", pageCount: 2, text: "[[PAGE 1]]\nDefinition X.\n[[PAGE 2]]\nTheorem Y follows from X.", pageRange: { first: 1, last: 2 }, blockIndex: 0, totalBlocks: 1 });
  assert.ok(prompt.includes("foundationEntries"));
  assert.ok(prompt.includes("resultEntries"));
  assert.ok(prompt.includes("inferenceHints"));
  assert.ok(prompt.includes("严禁逐步复述证明"));

  const requests = [];
  const pool = await extractParallelRawEntryPool({
    fileName: "sample.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nDefinition X.\n\n[[PAGE 2]]\nTheorem Y follows from X.",
    version: "v1.7",
    chatImpl: async (request) => {
      requests.push(request);
      assert.equal(request.maxTokens, undefined);
      return { content: JSON.stringify({
        foundationEntries: [{ id: "paper:def:x", type: "definition", name: "X", statement: "定义 $X$。", page: 1 }],
        resultEntries: [{ id: "paper:thm:y", type: "theorem", name: "Y", statement: "由 $X$ 得到 $Y$。", page: 2 }],
        inferenceHints: [{ premiseRefs: ["X"], conclusionRef: "Y", relationText: "由 X 得到 Y。", page: 2 }],
      }) };
    },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].lane, "combined");
  assert.equal(pool.rawEntries.length, 2);
  assert.equal(pool.rawEntries[0]._provenance.lane, "foundation");
  assert.equal(pool.rawEntries[1]._provenance.lane, "result");
  assert.equal(pool.inferenceHints.length, 1);
  assert.equal(pool.inferenceHints[0].conclusionRef, "Y");
  assert.equal(pool.diagnostics.calls.length, 1);
  assert.doesNotThrow(() => validateRawEntryPool(pool));
});

test("Paper Entry Parallel Extraction v1.8 - focused completeness without topology change", async () => {
  assert.equal(EXTRACTION_MODULE_VERSION_V1_8, "paper-entry-parallel-extraction-v1.8");
  assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes(EXTRACTION_MODULE_VERSION_V1_8));
  const prompt = v18DualOutputPrompt({ fileName: "sample.pdf", pageCount: 2, text: "[[PAGE 1]]\nHopf algebra.\n[[PAGE 2]]\nHandle-slide invariance.", pageRange: { first: 1, last: 2 }, blockIndex: 0, totalBlocks: 1 });
  assert.ok(prompt.includes("完整性补充"));
  assert.ok(prompt.includes("基础结构定义"));
  assert.ok(prompt.includes("handle-slide"));
  assert.ok(prompt.includes("modular data"));

  const requests = [];
  const pool = await extractParallelRawEntryPool({
    fileName: "sample.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nHopf algebra.\n\n[[PAGE 2]]\nHandle-slide invariance.",
    version: "v1.8",
    chatImpl: async (request) => {
      requests.push(request);
      return { content: JSON.stringify({
        foundationEntries: [{ id: "paper:def:hopf", type: "definition", name: "Hopf 代数", statement: "定义 Hopf 代数。", page: 1 }],
        resultEntries: [{ id: "paper:lemma:handle-slide", type: "lemma", name: "把手滑动不变性", statement: "构造在把手滑动下不变。", page: 2 }],
        inferenceHints: [],
      }) };
    },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].lane, "combined");
  assert.equal(pool.extractionModuleVersion, EXTRACTION_MODULE_VERSION_V1_8);
  assert.equal(pool.rawEntries.length, 2);
  assert.doesNotThrow(() => validateRawEntryPool(pool));
});

test("Paper Entry Parallel Extraction v1.9 - supports direct result backtracking", async () => {
  assert.equal(EXTRACTION_MODULE_VERSION_V1_9, "paper-entry-parallel-extraction-v1.9");
  assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes(EXTRACTION_MODULE_VERSION_V1_9));
  const prompt = v19DualOutputPrompt({
    fileName: "sample.pdf",
    pageCount: 5,
    text: "[[PAGE 1]]\nMain theorem.\n[[PAGE 2]]\nHandle-slide and modular data.",
    pageRange: { first: 1, last: 2 },
    blockIndex: 0,
    totalBlocks: 1,
  });
  assert.match(prompt, /主结果|支撑|回溯/);
  assert.match(prompt, /handle-slide/);
  assert.match(prompt, /presentation-independence/);
  assert.match(prompt, /modular/);

  const requests = [];
  const pool = await extractParallelRawEntryPool({
    fileName: "sample.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\nMain theorem.\n\n[[PAGE 2]]\nHandle-slide invariance and modular data.",
    version: "v1.9",
    chatImpl: async (request) => {
      requests.push(request);
      return { content: JSON.stringify({
        foundationEntries: [{ id: "paper:def:hopf", type: "definition", name: "Hopf 代数", statement: "定义 Hopf 代数。", page: 1 }],
        resultEntries: [{ id: "paper:lemma:handle-slide", type: "lemma", name: "把手滑动不变性", statement: "构造在把手滑动下不变。", page: 2 }],
        inferenceHints: [],
      }) };
    },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].lane, "combined");
  assert.equal(pool.extractionModuleVersion, EXTRACTION_MODULE_VERSION_V1_9);
  assert.equal(pool.rawEntries.length, 2);
  assert.doesNotThrow(() => validateRawEntryPool(pool));
});

test("Paper Entry Parallel Extraction v1.10 - tightens generic Entry boundaries", async () => {
  assert.equal(EXTRACTION_MODULE_VERSION_V1_10, "paper-entry-parallel-extraction-v1.10");
  assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes(EXTRACTION_MODULE_VERSION_V1_10));
  const prompt = v110DualOutputPrompt({
    fileName: "sample.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\\nDefinition X.\\n[[PAGE 2]]\\nTheorem Y.",
    pageRange: { first: 1, last: 2 },
    blockIndex: 0,
    totalBlocks: 1,
  });
  assert.match(prompt, /边界与唯一性/);
  assert.match(prompt, /同一数学对象只出现一次/);
  assert.match(prompt, /不允许生成 Inference/);
  const requests = [];
  const pool = await extractParallelRawEntryPool({
    fileName: "sample.pdf",
    pageCount: 2,
    text: "[[PAGE 1]]\\nDefinition X.\\n\\n[[PAGE 2]]\\nTheorem Y.",
    version: "v1.10",
    chatImpl: async (request) => {
      requests.push(request);
      return { content: JSON.stringify({
        foundationEntries: [{ id: "paper:def:x", type: "definition", name: "X", statement: "定义 X。", page: 1 }],
        resultEntries: [{ id: "paper:thm:y", type: "theorem", name: "Y", statement: "定理 Y。", page: 2 }],
        inferenceHints: [],
      }) };
    },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].lane, "combined");
  assert.equal(pool.extractionModuleVersion, EXTRACTION_MODULE_VERSION_V1_10);
  assert.equal(pool.rawEntries.length, 2);
  assert.doesNotThrow(() => validateRawEntryPool(pool));
});

test("Paper Entry Modular Pipeline - Model-Assisted Consolidation v1.1", async (t) => {
  await t.test("exports valid model consolidation constants and functions", () => {
    assert.equal(MODEL_CONSOLIDATION_MODULE_VERSION, "paper-entry-consolidation-v1.1-model");
    assert.ok(VALID_ENTRY_MODULE_VERSIONS.includes("paper-entry-consolidation-v1.1-model"));
    assert.equal(typeof consolidationPrompt, "function");
    assert.equal(typeof consolidatePaperEntryPoolWithModel, "function");
    assert.equal(typeof resolveModelConsolidationExecutionConfig, "function");

    const offCfg = resolveModelConsolidationExecutionConfig("off-compact");
    assert.equal(offCfg.reasoningEffort, "none");
    assert.equal(offCfg.tokenBudget.normal, 10000);

    const lowCfg = resolveModelConsolidationExecutionConfig("low-compact");
    assert.equal(lowCfg.reasoningEffort, "low");

    const medCfg = resolveModelConsolidationExecutionConfig("medium-compact");
    assert.equal(medCfg.reasoningEffort, "medium");

    const highCfg = resolveModelConsolidationExecutionConfig("high-compact");
    assert.equal(highCfg.reasoningEffort, "high");

    const generousCfg = resolveModelConsolidationExecutionConfig("high-generous");
    assert.equal(generousCfg.reasoningEffort, "high");
    assert.equal(generousCfg.tokenBudget.normal, 32000);

    // Aliases
    assert.equal(resolveModelConsolidationExecutionConfig("off").reasoningEffort, "none");
    assert.equal(resolveModelConsolidationExecutionConfig("high").reasoningEffort, "high");

    assert.throws(() => resolveModelConsolidationExecutionConfig("unknown-mode"), /unknown mode/);
  });

  await t.test("confirms prompt excludes forbidden stages and includes delimitation, source-grounding, and corruption rules", () => {
    const prompt = consolidationPrompt({
      fileName: "test-paper.pdf",
      pageCount: 3,
      sourceText: "[[PAGE 1]]\nDefinition 1: Hopf fibration $S^3 \\to S^2$.\n\n[[PAGE 2]]\nTheorem 1: The linking number of Hopf link is $\\pm 1$.\n\n[[PAGE 3]]\nExternal theorem: Sard's theorem (Sard, 1942).",
      candidates: [
        { id: "def:hopf", type: "definition", name: "Hopf 纤维丛", statement: "设 $S^3 \\to S^2$ 为 Hopf 纤维丛映射。", page: 1 },
        { id: "thm:linking", type: "theorem", name: "环绕数定理", statement: "Hopf 环链的环绕数为 $\\pm 1$。", page: 2 },
      ],
    });

    // Instructions and required rules
    assert.ok(prompt.includes("Model-Assisted Entry Consolidation v1.1") || prompt.includes("语义合并与定界规范化编辑器"));
    assert.ok(prompt.includes("语义去重") || prompt.includes("Semantic Deduplication"));
    assert.ok(prompt.includes("定界") || prompt.includes("Delimitation"));
    assert.ok(prompt.includes("原子性") || prompt.includes("Atomicity"));
    assert.ok(prompt.includes("排除") && prompt.includes("章节标题") && prompt.includes("表格行") && prompt.includes("历史介绍"));
    assert.ok(prompt.includes("破损与占位符识别修复") || prompt.includes("Corruption"));
    assert.ok(prompt.includes("external") && prompt.includes("source"));
    assert.ok(prompt.includes("简体中文"));
    assert.ok(prompt.includes("$...$") || prompt.includes("$$...$$"));
    assert.ok(prompt.includes("test-paper.pdf"));
    assert.ok(prompt.includes("[[PAGE 1]]"));
    assert.ok(prompt.includes("初始候选对象清单"));

    // Prohibitions & Forbidden Stages
    assert.ok(prompt.includes("严禁推导") || prompt.includes("Inference"));
    assert.ok(prompt.includes("严禁下游决策") || prompt.includes("下游决策"));
    assert.ok(prompt.includes("B0 清单") || prompt.includes("B0"));
    assert.ok(prompt.includes("mainTarget"));
    assert.ok(prompt.includes("Paper Guide"));
    assert.ok(prompt.includes("Review") || prompt.includes("评审"));
    assert.ok(prompt.includes("严禁脱离候选清单独立重读全文") || prompt.includes("凭空重提取全文"));
    assert.ok(prompt.includes("严禁臆造或强化数学") || prompt.includes("充分条件或必要条件改写为等价条件"));

    // Score / Benchmark isolation
    assert.ok(!prompt.includes("Sol Entry score"));
    assert.ok(!prompt.includes("Self-Check"));
    assert.ok(!prompt.includes("gold.json"));
  });

  await t.test("confirms exactly one model call executes over dual-lane raw pool with both sourceText and pre-canonical candidates", async () => {
    const srcText = [
      "[[PAGE 1]]\nDefinition 1: Hopf fibration $S^3 \\to S^2$.\nNotation: Let $\\eta$ denote the Hopf generator.",
      "[[PAGE 2]]\nTheorem 1: The linking number of Hopf link is $\\pm 1$.\nCorollary 1: Hopf link is nontrivial.",
      "[[PAGE 3]]\nTheorem (Sard, 1942): The set of critical values has measure zero.",
    ].join("\n\n");

    const rawPool = createRawEntryPool({
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.4",
      source: {
        fileName: "hopf-dual-lane.pdf",
        pageCount: 3,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: 150,
          text: "[[PAGE 1]]\nDefinition 1: Hopf fibration $S^3 \\to S^2$.\nNotation: Let $\\eta$ denote the Hopf generator.\n\n[[PAGE 2]]\nTheorem 1: The linking number of Hopf link is $\\pm 1$.",
          rawEntries: [
            { id: "def:hopf_fibration", type: "definition", name: "Hopf 纤维丛", statement: "设 $S^3 \\to S^2$ 为 Hopf 纤维丛映射。", page: 1, _provenance: { lane: "foundation", chunkIndex: 0 } },
            { id: "def:hopf_notation", type: "definition", name: "Hopf 记号", statement: "设 $\\eta$ 为 Hopf 生成元。", page: 1, _provenance: { lane: "foundation", chunkIndex: 0 } },
            { id: "thm:linking_num", type: "theorem", name: "环绕数定理", statement: "Hopf 环链的环绕数为 $\\pm 1$。", page: 2, _provenance: { lane: "result", chunkIndex: 0 } },
          ],
        },
        {
          chunkIndex: 1,
          pageRange: { first: 2, last: 3 },
          characterCount: 150,
          text: "[[PAGE 2]]\nTheorem 1: The linking number of Hopf link is $\\pm 1$.\nCorollary 1: Hopf link is nontrivial.\n\n[[PAGE 3]]\nTheorem (Sard, 1942): The set of critical values has measure zero.",
          rawEntries: [
            { id: "thm:linking_num_overlap", type: "theorem", name: "环绕数定理", statement: "Hopf 环链的环绕数为 $\\pm 1$。", page: 2, _provenance: { lane: "result", chunkIndex: 1 } },
            { id: "cor:nontrivial", type: "theorem", name: "非平凡推论", statement: "Hopf 环链是非平凡的拓扑环链。", page: 2, _provenance: { lane: "result", chunkIndex: 1 } },
            { id: "thm:sard", type: "theorem", name: "Sard 定理", statement: "光滑映射的临界值集合勒贝格测度为零。", page: 3, external: true, source: "Sard, 1942", _provenance: { lane: "foundation", chunkIndex: 1 } },
          ],
        },
      ],
      rawEntries: [
        { id: "def:hopf_fibration", type: "definition", name: "Hopf 纤维丛", statement: "设 $S^3 \\to S^2$ 为 Hopf 纤维丛映射。", page: 1, _provenance: { lane: "foundation", chunkIndex: 0 } },
        { id: "def:hopf_notation", type: "definition", name: "Hopf 记号", statement: "设 $\\eta$ 为 Hopf 生成元。", page: 1, _provenance: { lane: "foundation", chunkIndex: 0 } },
        { id: "thm:linking_num", type: "theorem", name: "环绕数定理", statement: "Hopf 环链的环绕数为 $\\pm 1$。", page: 2, _provenance: { lane: "result", chunkIndex: 0 } },
        { id: "thm:linking_num_overlap", type: "theorem", name: "环绕数定理", statement: "Hopf 环链的环绕数为 $\\pm 1$。", page: 2, _provenance: { lane: "result", chunkIndex: 1 } },
        { id: "cor:nontrivial", type: "theorem", name: "非平凡推论", statement: "Hopf 环链是非平凡的拓扑环链。", page: 2, _provenance: { lane: "result", chunkIndex: 1 } },
        { id: "thm:sard", type: "theorem", name: "Sard 定理", statement: "光滑映射的临界值集合勒贝格测度为零。", page: 3, external: true, source: "Sard, 1942", _provenance: { lane: "foundation", chunkIndex: 1 } },
      ],
    });

    const recordedRequests = [];
    async function mockConsolidationChat(req) {
      recordedRequests.push(req);
      const modelConsolidatedResponse = {
        entries: [
          // 1. Consolidated definition combining main definition and notation
          {
            id: "paper:def:hopf-fibration",
            type: "definition",
            num: 1,
            name: "Hopf 纤维丛",
            statement: "设 $S^3 \\to S^2$ 为 Hopf 纤维丛映射，记 $\\eta$ 为其生成元。",
            page: 1,
          },
          // 2. Deduplicated linking number theorem (merging chunk 0 and chunk 1 overlap)
          {
            id: "paper:thm:linking-number",
            type: "theorem",
            num: 1,
            name: "环绕数定理",
            statement: "Hopf 环链的环绕数为 $\\pm 1$。",
            page: 2,
          },
          // 3. Corollary
          {
            id: "paper:cor:nontrivial",
            type: "theorem",
            name: "非平凡推论",
            statement: "Hopf 环链是非平凡的拓扑环链。",
            page: 2,
          },
          // 4. External Sard Theorem
          {
            id: "paper:thm:sard",
            type: "theorem",
            name: "Sard 定理",
            statement: "光滑映射的临界值集合勒贝格测度为零。",
            page: 3,
            external: true,
            source: "Sard, 1942",
          },
        ],
      };
      return {
        status: 200,
        content: JSON.stringify(modelConsolidatedResponse),
        finishReason: "stop",
        usage: { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 },
      };
    }

    const artifact = await consolidatePaperEntryPoolWithModel({
      rawPool,
      chatImpl: mockConsolidationChat,
      model: "gpt-5.6-luna",
      reasoningEffort: "low",
    });

    // Exactly one model call
    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].stage, "consolidate");
    assert.equal(recordedRequests[0].reasoningEffort, "low");
    assert.ok(recordedRequests[0].messages[0].content.includes("[[PAGE 1]]"));
    assert.ok(recordedRequests[0].messages[0].content.includes("初始候选对象清单"));

    // Verify artifact schema & version
    assert.equal(artifact.schema, ENTRY_ARTIFACT_SCHEMA);
    assert.equal(artifact.entryModuleVersion, "paper-entry-consolidation-v1.1-model");
    assert.equal(artifact.source.fileName, "hopf-dual-lane.pdf");
    assert.equal(artifact.source.pageCount, 3);
    assert.equal(artifact.entries.length, 4);

    // Verify validation
    assert.doesNotThrow(() => validatePaperEntryArtifact(artifact));

    // Verify entries content and sorting
    assert.equal(artifact.entries[0].id, "paper:def:hopf-fibration");
    assert.equal(artifact.entries[0].page, 1);
    assert.equal(artifact.entries[1].id, "paper:cor:nontrivial");
    assert.equal(artifact.entries[1].page, 2);
    assert.equal(artifact.entries[2].id, "paper:thm:linking-number");
    assert.equal(artifact.entries[2].page, 2);
    assert.equal(artifact.entries[3].id, "paper:thm:sard");
    assert.equal(artifact.entries[3].external, true);
    assert.equal(artifact.entries[3].source, "Sard, 1942");

    // Verify diagnostics
    assert.equal(artifact.diagnostics.calls.length, 1);
    assert.equal(artifact.diagnostics.calls[0].stage, "consolidate");
    assert.equal(artifact.diagnostics.calls[0].status, 200);
    assert.equal(artifact.diagnostics.consolidationSummary.rawEntryCount, 6);
    assert.ok(artifact.diagnostics.consolidationSummary.preCanonicalCount > 0);
    assert.equal(artifact.diagnostics.consolidationSummary.outputEntryCount, 4);
    assert.equal(artifact.diagnostics.consolidationSummary.modelCalls, 1);
    assert.equal(artifact.diagnostics.moduleIdentity.name, "paper-entry-consolidation-v1.1-model");
    assert.equal(artifact.diagnostics.modelCallMetadata.model, "gpt-5.6-luna");
    assert.equal(artifact.diagnostics.modelCallMetadata.reasoningEffort, "low");

    // Immutability
    assert.ok(Object.isFrozen(artifact));
    assert.ok(Object.isFrozen(artifact.entries));
    assert.throws(() => { artifact.entries.push({}); });
  });

  await t.test("confirms fail-closed behavior on HTTP error, parse error, empty entries, and malformed entries", async () => {
    const rawPool = createRawEntryPool({
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.4",
      source: { fileName: "fail-test.pdf", pageCount: 2, characters: 40, sourceText: "[[PAGE 1]]\nP1\n\n[[PAGE 2]]\nP2" },
      chunks: [{ chunkIndex: 0, text: "[[PAGE 1]]\nP1", rawEntries: [{ id: "e1", type: "definition", statement: "Stmt $x$.", page: 1 }] }],
      rawEntries: [{ id: "e1", type: "definition", statement: "Stmt $x$.", page: 1 }],
    });

    // 1. HTTP error
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => {
            const err = new Error("HTTP 500 Internal Server Error");
            err.status = 500;
            throw err;
          },
        });
      },
      /HTTP 500/
    );

    // 2. Non-JSON output
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: "Here is your consolidated math: not a JSON!" }),
        });
      },
      /模型输出不包含有效 JSON 片段|JSON 解析失败/
    );

    // 3. Empty entries array
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: '{"entries": []}' }),
        });
      },
      /模型整合输出为空或未包含有效的 entries 数组/
    );

    // 4. Malformed entry (missing type)
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: '{"entries": [{"id": "bad_entry", "statement": "Stmt without type.", "page": 1}]}' }),
        });
      },
      /包含无效的 entry 类型/
    );

    // 5. Invalid page out of bounds
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: '{"entries": [{"id": "page_overflow", "type": "theorem", "statement": "Stmt.", "page": 99}]}' }),
        });
      },
      /页码无效/
    );

    // 6. Unbalanced math delimiters
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: '{"entries": [{"id": "bad_math", "type": "theorem", "statement": "Let $x \\in X formula", "page": 1}]}' }),
        });
      },
      /未配对的数学公式定界符/
    );

    // 7. Unrecovered corruption placeholder
    await assert.rejects(
      async () => {
        await consolidatePaperEntryPoolWithModel({
          rawPool,
          chatImpl: async () => ({ content: '{"entries": [{"id": "corrupted_entry", "type": "theorem", "statement": "Formula [corrupted]...", "page": 1}]}' }),
        });
      },
      /包含未修复的破损占位符/
    );
  });

  await t.test("confirms historical deterministic v1 consolidation works unchanged with 0 model calls", () => {
    const rawPool = createRawEntryPool({
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.4",
      source: { fileName: "v1-compat.pdf", pageCount: 2, characters: 40, sourceText: "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nThm 1" },
      chunks: [{ chunkIndex: 0, text: "[[PAGE 1]]\nDef 1", rawEntries: [{ id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha $a=1$.", page: 1 }] }],
      rawEntries: [{ id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha $a=1$.", page: 1 }],
    });

    const v1Artifact = consolidateRawEntryPool(rawPool);
    assert.equal(v1Artifact.schema, ENTRY_ARTIFACT_SCHEMA);
    assert.equal(v1Artifact.entryModuleVersion, "paper-entry-consolidation-v1");
    assert.equal(v1Artifact.entries.length, 1);
    assert.equal(v1Artifact.diagnostics.calls.length, 0);
    assert.doesNotThrow(() => validatePaperEntryArtifact(v1Artifact));
  });

  await t.test("confirms runner script exports and argument handling", async () => {
    const { runCli, createMeasuredFetch, isTransientNetworkError } = await import("../scripts/run-paper-entry-model-consolidation.mjs");
    assert.equal(typeof runCli, "function");
    assert.equal(typeof createMeasuredFetch, "function");
    assert.equal(typeof isTransientNetworkError, "function");

    // Network error detection
    assert.ok(isTransientNetworkError(new Error("fetch failed")));
    assert.ok(isTransientNetworkError({ cause: { code: "ECONNRESET" } }));
    assert.ok(!isTransientNetworkError(new Error("Invalid parameter")));
  });
});

test("Paper Entry Modular Pipeline - Isolated Dual-Lane 5-Page Window Extraction (v1.5)", async (t) => {
  await t.test("exports valid v1.5 constants and functions", () => {
    assert.equal(EXTRACTION_MODULE_VERSION_V1_5, "paper-entry-parallel-extraction-v1.5");
    assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes("paper-entry-parallel-extraction-v1.5"));
    assert.equal(typeof splitTextIntoWindows, "function");
    assert.equal(typeof splitTextIntoFixedBlocks, "function");
    assert.equal(typeof v14FoundationPrompt, "function");
    assert.equal(typeof v14ResultPrompt, "function");
    assert.equal(typeof v14LanePrompt, "function");
  });

  await t.test("confirms exact 5-page windows with 1-page overlap and stride 4 for 18 pages", () => {
    const text18Pages = Array.from({ length: 18 }, (_, i) => `[[PAGE ${i + 1}]]\nPage content ${i + 1}`).join("\n\n");
    const blocks18 = splitTextIntoWindows(text18Pages, 5, 1);
    assert.equal(blocks18.length, 5);

    // Block 0: [1, 2, 3, 4, 5]
    assert.ok(blocks18[0].includes("[[PAGE 1]]") && blocks18[0].includes("[[PAGE 2]]") && blocks18[0].includes("[[PAGE 3]]") && blocks18[0].includes("[[PAGE 4]]") && blocks18[0].includes("[[PAGE 5]]"));
    assert.ok(!blocks18[0].includes("[[PAGE 6]]"));

    // Block 1: [5, 6, 7, 8, 9] (shares 5 with Block 0)
    assert.ok(!blocks18[1].includes("[[PAGE 4]]"));
    assert.ok(blocks18[1].includes("[[PAGE 5]]") && blocks18[1].includes("[[PAGE 6]]") && blocks18[1].includes("[[PAGE 7]]") && blocks18[1].includes("[[PAGE 8]]") && blocks18[1].includes("[[PAGE 9]]"));
    assert.ok(!blocks18[1].includes("[[PAGE 10]]"));

    // Block 2: [9, 10, 11, 12, 13] (shares 9 with Block 1)
    assert.ok(!blocks18[2].includes("[[PAGE 8]]"));
    assert.ok(blocks18[2].includes("[[PAGE 9]]") && blocks18[2].includes("[[PAGE 10]]") && blocks18[2].includes("[[PAGE 11]]") && blocks18[2].includes("[[PAGE 12]]") && blocks18[2].includes("[[PAGE 13]]"));
    assert.ok(!blocks18[2].includes("[[PAGE 14]]"));

    // Block 3: [13, 14, 15, 16, 17] (shares 13 with Block 2)
    assert.ok(!blocks18[3].includes("[[PAGE 12]]"));
    assert.ok(blocks18[3].includes("[[PAGE 13]]") && blocks18[3].includes("[[PAGE 14]]") && blocks18[3].includes("[[PAGE 15]]") && blocks18[3].includes("[[PAGE 16]]") && blocks18[3].includes("[[PAGE 17]]"));
    assert.ok(!blocks18[3].includes("[[PAGE 18]]"));

    // Block 4: [17, 18] (shares 17 with Block 3)
    assert.ok(!blocks18[4].includes("[[PAGE 16]]"));
    assert.ok(blocks18[4].includes("[[PAGE 17]]") && blocks18[4].includes("[[PAGE 18]]"));

    // 17-page document -> 4 blocks: [1..5], [5..9], [9..13], [13..17]
    const text17Pages = Array.from({ length: 17 }, (_, i) => `[[PAGE ${i + 1}]]\nPage content ${i + 1}`).join("\n\n");
    const blocks17 = splitTextIntoWindows(text17Pages, 5, 1);
    assert.equal(blocks17.length, 4);
    assert.ok(blocks17[0].includes("[[PAGE 1]]") && blocks17[0].includes("[[PAGE 5]]") && !blocks17[0].includes("[[PAGE 6]]"));
    assert.ok(blocks17[1].includes("[[PAGE 5]]") && blocks17[1].includes("[[PAGE 9]]") && !blocks17[1].includes("[[PAGE 10]]"));
    assert.ok(blocks17[2].includes("[[PAGE 9]]") && blocks17[2].includes("[[PAGE 13]]") && !blocks17[2].includes("[[PAGE 14]]"));
    assert.ok(blocks17[3].includes("[[PAGE 13]]") && blocks17[3].includes("[[PAGE 17]]"));

    // 5-page document -> 1 block: [1,2,3,4,5]
    const text5Pages = Array.from({ length: 5 }, (_, i) => `[[PAGE ${i + 1}]]\nPage ${i + 1}`).join("\n\n");
    const blocks5 = splitTextIntoWindows(text5Pages, 5, 1);
    assert.equal(blocks5.length, 1);
    assert.ok(blocks5[0].includes("[[PAGE 1]]") && blocks5[0].includes("[[PAGE 5]]"));

    // 4-page document -> 1 block: [1,2,3,4]
    const text4Pages = Array.from({ length: 4 }, (_, i) => `[[PAGE ${i + 1}]]\nPage ${i + 1}`).join("\n\n");
    const blocks4 = splitTextIntoWindows(text4Pages, 5, 1);
    assert.equal(blocks4.length, 1);
    assert.ok(blocks4[0].includes("[[PAGE 1]]") && blocks4[0].includes("[[PAGE 4]]"));

    // 6-page document -> 2 blocks: [1..5], [5..6]
    const text6Pages = Array.from({ length: 6 }, (_, i) => `[[PAGE ${i + 1}]]\nPage ${i + 1}`).join("\n\n");
    const blocks6 = splitTextIntoWindows(text6Pages, 5, 1);
    assert.equal(blocks6.length, 2);
    assert.ok(blocks6[0].includes("[[PAGE 1]]") && blocks6[0].includes("[[PAGE 5]]") && !blocks6[0].includes("[[PAGE 6]]"));
    assert.ok(blocks6[1].includes("[[PAGE 5]]") && blocks6[1].includes("[[PAGE 6]]") && !blocks6[1].includes("[[PAGE 4]]"));

    // 1-page document -> 1 block: [1]
    const text1Page = "[[PAGE 1]]\nSingle page.";
    const blocks1 = splitTextIntoWindows(text1Page, 5, 1);
    assert.equal(blocks1.length, 1);
    assert.ok(blocks1[0].includes("[[PAGE 1]]"));

    // Verify v1.4 splitTextIntoFixedBlocks behavior remains exactly [1,2], [2,3,4], [4,5,6]
    const v14Blocks6 = splitTextIntoFixedBlocks(text6Pages, 2, 1);
    assert.equal(v14Blocks6.length, 3);
    assert.ok(v14Blocks6[0].includes("[[PAGE 1]]") && v14Blocks6[0].includes("[[PAGE 2]]") && !v14Blocks6[0].includes("[[PAGE 3]]"));
    assert.ok(v14Blocks6[1].includes("[[PAGE 2]]") && v14Blocks6[1].includes("[[PAGE 3]]") && v14Blocks6[1].includes("[[PAGE 4]]") && !v14Blocks6[1].includes("[[PAGE 5]]"));
    assert.ok(v14Blocks6[2].includes("[[PAGE 4]]") && v14Blocks6[2].includes("[[PAGE 5]]") && v14Blocks6[2].includes("[[PAGE 6]]"));
  });

  await t.test("confirms two lane calls per block begin without serial dependence across all blocks in v1.5", async () => {
    const text6Pages = Array.from({ length: 6 }, (_, i) => `[[PAGE ${i + 1}]]\nContent page ${i + 1}`).join("\n\n");

    const callStartTimes = [];
    const callFinishTimes = [];
    const executedLanes = [];

    async function mockParallelChat(req) {
      const started = performance.now();
      callStartTimes.push(started);
      executedLanes.push({ block: req.chunkIndex, lane: req.lane });
      await new Promise((r) => setTimeout(r, 50));
      callFinishTimes.push(performance.now());

      if (req.lane === "foundation") {
        return {
          content: JSON.stringify({
            entries: [
              {
                id: `block_${req.chunkIndex}_def`,
                type: "definition",
                name: `Block ${req.chunkIndex} Def`,
                statement: `Foundation statement from block ${req.chunkIndex} with $x \\in X$.`,
                page: req.chunkIndex * 4 + 1,
              },
            ],
          }),
        };
      } else {
        return {
          content: JSON.stringify({
            entries: [
              {
                id: `block_${req.chunkIndex}_thm`,
                type: "theorem",
                name: `Block ${req.chunkIndex} Thm`,
                statement: `Result statement from block ${req.chunkIndex} with $y \\in Y$.`,
                page: req.chunkIndex * 4 + 1,
              },
            ],
          }),
        };
      }
    }

    const rawPool = await extractParallelRawEntryPool({
      fileName: "dual-lane-v15.pdf",
      pageCount: 6,
      text: text6Pages,
      chatImpl: mockParallelChat,
      version: "paper-entry-parallel-extraction-v1.5",
    });

    // 6-page document in v1.5 -> 2 blocks -> exactly 4 calls (2 blocks * 2 lanes)
    assert.equal(callStartTimes.length, 4);
    assert.equal(executedLanes.length, 4);

    // Verify all 4 calls started before the first call finished (non-blocking concurrent start)
    assert.ok(callStartTimes[1] < callFinishTimes[0], "Call 1 must start before Call 0 finishes");
    assert.ok(callStartTimes[2] < callFinishTimes[0], "Call 2 must start before Call 0 finishes");
    assert.ok(callStartTimes[3] < callFinishTimes[0], "Call 3 must start before Call 0 finishes");

    // Both lanes executed for each block
    const block0Lanes = executedLanes.filter((c) => c.block === 0).map((c) => c.lane).sort();
    const block1Lanes = executedLanes.filter((c) => c.block === 1).map((c) => c.lane).sort();
    assert.deepEqual(block0Lanes, ["foundation", "result"]);
    assert.deepEqual(block1Lanes, ["foundation", "result"]);

    assert.equal(rawPool.chunks.length, 2);
    assert.equal(rawPool.rawEntries.length, 4);
    assert.equal(rawPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.5");
    assert.equal(rawPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.5");
  });

  await t.test("confirms failure of one parallel request in v1.5 aborts peer in-flight requests promptly via shared AbortController", async () => {
    const text8Pages = Array.from({ length: 8 }, (_, i) => `[[PAGE ${i + 1}]]\nP${i + 1}`).join("\n\n");

    const signalsReceived = [];
    let peerAbortedCount = 0;

    async function mockFailingChat(req) {
      signalsReceived.push(req.signal);

      // Block 0 foundation lane fails immediately
      if (req.blockIndex === 0 && req.lane === "foundation") {
        throw new Error("Simulated hard failure on block 0 foundation in v1.5");
      }

      // Other peer requests wait and check for abort
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({ content: JSON.stringify({ entries: [] }) });
        }, 1000);

        if (req.signal) {
          if (req.signal.aborted) {
            clearTimeout(timeout);
            peerAbortedCount += 1;
            reject(new Error("aborted"));
          } else {
            req.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              peerAbortedCount += 1;
              reject(new Error("aborted"));
            }, { once: true });
          }
        }
      });
    }

    const start = performance.now();
    await assert.rejects(
      async () => {
        await extractParallelRawEntryPool({
          fileName: "abort-v15-test.pdf",
          pageCount: 8,
          text: text8Pages,
          chatImpl: mockFailingChat,
          version: "paper-entry-parallel-extraction-v1.5",
        });
      },
      (err) => {
        assert.ok(err.message.includes("Simulated hard failure on block 0 foundation in v1.5"));
        assert.ok(err.diagnostics);
        assert.ok(Array.isArray(err.diagnostics.stages));
        return true;
      }
    );
    const duration = performance.now() - start;

    // Fast fail: Did NOT wait for the 1000ms timer
    assert.ok(duration < 500, `Expected fast fail-closed abort under 500ms, took ${duration}ms`);
    assert.ok(signalsReceived.some((s) => s?.aborted === true));
  });

  await t.test("confirms lane provenance is retained on each raw entry and in call diagnostics for v1.5, and zero-call consolidation works unchanged", async () => {
    const mockFoundation = [
      { id: "def:manifold", type: "definition", name: "流形定义", statement: "设 $M$ 为 4-流形。", page: 1 },
      { id: "calc:norm", type: "calculation", name: "归一化公式", statement: "归一化常数 $\\tau = 1$。", page: 2 },
    ];
    const mockResult = [
      { id: "lem:compact", type: "lemma", name: "紧致引理", statement: "流形 $M$ 是紧致的。", page: 2 },
      { id: "thm:main", type: "theorem", name: "主分类定理", statement: "闭单连通 4-流形同胚分类定理。", page: 2 },
    ];

    async function mockChat(req) {
      if (req.lane === "foundation") {
        return { content: JSON.stringify({ entries: mockFoundation }) };
      } else {
        return { content: JSON.stringify({ entries: mockResult }) };
      }
    }

    const text = "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nThm 1";
    const rawPool = await extractParallelRawEntryPool({
      fileName: "provenance-v15.pdf",
      pageCount: 2,
      text,
      chatImpl: mockChat,
      version: "paper-entry-parallel-extraction-v1.5",
    });

    assert.equal(rawPool.schema, RAW_ENTRY_POOL_SCHEMA);
    assert.equal(rawPool.extractionModuleVersion, "paper-entry-parallel-extraction-v1.5");
    assert.equal(rawPool.source.fileName, "provenance-v15.pdf");
    assert.equal(rawPool.source.pageCount, 2);
    assert.equal(rawPool.chunks.length, 1);
    assert.equal(rawPool.rawEntries.length, 4);

    // Verify provenance on entries
    const foundationEntries = rawPool.rawEntries.filter((e) => e._provenance.lane === "foundation");
    const resultEntries = rawPool.rawEntries.filter((e) => e._provenance.lane === "result");
    assert.equal(foundationEntries.length, 2);
    assert.equal(resultEntries.length, 2);

    for (const e of foundationEntries) {
      assert.equal(e._provenance.lane, "foundation");
      assert.equal(e._provenance.chunkIndex, 0);
      assert.equal(e._provenance.version, "paper-entry-parallel-extraction-v1.5");
    }
    for (const e of resultEntries) {
      assert.equal(e._provenance.lane, "result");
      assert.equal(e._provenance.chunkIndex, 0);
      assert.equal(e._provenance.version, "paper-entry-parallel-extraction-v1.5");
    }

    // Verify provenance in diagnostics.calls
    assert.equal(rawPool.diagnostics.calls.length, 2);
    assert.equal(rawPool.diagnostics.calls[0].lane, "foundation");
    assert.equal(rawPool.diagnostics.calls[1].lane, "result");
    assert.equal(rawPool.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.5");

    // Deep immutability check
    assert.ok(Object.isFrozen(rawPool));
    assert.ok(Object.isFrozen(rawPool.rawEntries));
    assert.throws(() => { rawPool.rawEntries.push({}); });

    // Zero-call deterministic consolidation succeeds unchanged
    assert.doesNotThrow(() => validateRawEntryPool(rawPool));
    const consolidated = consolidateRawEntryPool(rawPool);
    assert.equal(consolidated.schema, ENTRY_ARTIFACT_SCHEMA);
    assert.equal(consolidated.entryModuleVersion, CONSOLIDATION_MODULE_VERSION);
    assert.equal(consolidated.entries.length, 4);
    assert.equal(consolidated.diagnostics.calls.length, 0);
  });

  await t.test("confirms schema validation and normalization accept and preserve v1.5", () => {
    const srcText = "[[PAGE 1]]\nDefinition 1: Alpha.\n\n[[PAGE 2]]\nTheorem 1: Beta.";
    const validV15RawPool = {
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.5",
      source: {
        fileName: "v15.pdf",
        pageCount: 2,
        characters: srcText.length,
        sourceText: srcText,
      },
      chunks: [
        {
          chunkIndex: 0,
          pageRange: { first: 1, last: 2 },
          characterCount: srcText.length,
          text: srcText,
          rawEntries: [
            { id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha def $a=1$.", page: 1, _provenance: { chunkIndex: 0, lane: "foundation", version: "paper-entry-parallel-extraction-v1.5" } },
            { id: "thm:beta", type: "theorem", name: "Beta", statement: "Beta thm $b=2$.", page: 2, _provenance: { chunkIndex: 0, lane: "result", version: "paper-entry-parallel-extraction-v1.5" } },
          ],
        },
      ],
      rawEntries: [
        { id: "def:alpha", type: "definition", name: "Alpha", statement: "Alpha def $a=1$.", page: 1, _provenance: { chunkIndex: 0, lane: "foundation", version: "paper-entry-parallel-extraction-v1.5" } },
        { id: "thm:beta", type: "theorem", name: "Beta", statement: "Beta thm $b=2$.", page: 2, _provenance: { chunkIndex: 0, lane: "result", version: "paper-entry-parallel-extraction-v1.5" } },
      ],
      diagnostics: {
        durationMs: 40,
        stages: [{ stage: "extract", atMs: 40 }],
        calls: [
          { stage: "extract", lane: "foundation", chunkIndex: 0, durationMs: 30 },
          { stage: "extract", lane: "result", chunkIndex: 0, durationMs: 35 },
        ],
        chunkCount: 1,
        rawEntryCount: 2,
        modelCallMetadata: { model: "gpt-5.6-luna", provider: "Luna Gateway", reasoningEffort: "none" },
        moduleIdentity: { name: "paper-entry-parallel-extraction-v1.5", schema: RAW_ENTRY_POOL_SCHEMA },
      },
    };

    assert.doesNotThrow(() => validateRawEntryPool(validV15RawPool));
    const normalized = paperRawEntryPool.normalizeRawEntryPool(validV15RawPool);
    assert.equal(normalized.extractionModuleVersion, "paper-entry-parallel-extraction-v1.5");
    assert.equal(normalized.diagnostics.moduleIdentity.name, "paper-entry-parallel-extraction-v1.5");
  });

  await t.test("confirms runner CLI flags and version resolution accept --version=v1.5, --v1.5, -v1.5, and positional v1.5", async () => {
    // 1. Alias handling in extractParallelRawEntryPool
    let requestedVersionReceived = null;
    async function mockChat(req) {
      return {
        content: JSON.stringify({
          entries: [{ id: "e1", type: "definition", statement: "Stmt $x$.", page: 1 }],
        }),
      };
    }

    const text = "[[PAGE 1]]\nDef 1";

    const poolFromAlias = await extractParallelRawEntryPool({
      fileName: "test.pdf",
      pageCount: 1,
      text,
      chatImpl: mockChat,
      version: "v1.5",
    });
    assert.equal(poolFromAlias.extractionModuleVersion, "paper-entry-parallel-extraction-v1.5");

    const poolFromExplicit = await extractParallelRawEntryPool({
      fileName: "test.pdf",
      pageCount: 1,
      text,
      chatImpl: mockChat,
      version: "paper-entry-parallel-extraction-v1.5",
    });
    assert.equal(poolFromExplicit.extractionModuleVersion, "paper-entry-parallel-extraction-v1.5");
  });
});

test("Paper Entry Extraction v1.6 removes content/token limits and resumes completed lanes", async () => {
  assert.equal(EXTRACTION_MODULE_VERSION_V1_6, "paper-entry-parallel-extraction-v1.6");
  assert.ok(VALID_PARALLEL_EXTRACTION_MODULE_VERSIONS.includes(EXTRACTION_MODULE_VERSION_V1_6));

  const sourceText = "[[PAGE 1]]\nDefinition A.\n\n[[PAGE 2]]\nTheorem B.";
  const completed = [];
  const firstRequests = [];
  let failedOnce = false;
  await assert.rejects(() => extractParallelRawEntryPool({
    fileName: "resume.pdf", pageCount: 2, text: sourceText, version: "v1.6",
    chatImpl: async (request) => {
      firstRequests.push(request);
      if (request.lane === "result" && !failedOnce) {
        failedOnce = true;
        throw new Error("temporary result failure");
      }
      return { content: JSON.stringify({ entries: [{ id: `paper:${request.lane}:one`, type: request.lane === "result" ? "theorem" : "definition", name: "对象", statement: "陈述。", page: 1 }] }) };
    },
    onLaneComplete: async ({ cacheKey, entries }) => { completed.push([cacheKey, entries]); },
  }), /temporary result failure/u);
  assert.ok(firstRequests.every((request) => !("maxTokens" in request)), "v1.6 must not send maxTokens");
  const laneCache = Object.fromEntries(completed);
  assert.ok(Array.isArray(laneCache["0:foundation"]));

  const resumedRequests = [];
  const resumed = await extractParallelRawEntryPool({
    fileName: "resume.pdf", pageCount: 2, text: sourceText, version: "v1.6", laneCache,
    chatImpl: async (request) => {
      resumedRequests.push(request);
      return { content: JSON.stringify({ entries: [{ id: "paper:result:one", type: "theorem", name: "结果", statement: "结果陈述。", page: 2 }] }) };
    },
  });
  assert.deepEqual(resumedRequests.map((request) => request.lane), ["result"]);
  assert.equal(resumed.rawEntries.length, 2);
});

test("Paper Entry Modular Pipeline - Production Provider Adapter (Luna & OpenCode Go)", async (t) => {
  const rawRunner = await import("../scripts/run-paper-entry-raw-extraction.mjs");
  const modelRunner = await import("../scripts/run-paper-entry-model-consolidation.mjs");

  await t.test("exports provider adapter functions from both runners", () => {
    assert.equal(typeof rawRunner.resolveProviderConfig, "function");
    assert.equal(typeof rawRunner.createProxyFetch, "function");
    assert.equal(typeof rawRunner.createMeasuredFetch, "function");
    assert.equal(typeof rawRunner.isTransientNetworkError, "function");
    assert.equal(typeof rawRunner.runCli, "function");

    assert.equal(typeof modelRunner.resolveProviderConfig, "function");
    assert.equal(typeof modelRunner.createProxyFetch, "function");
    assert.equal(typeof modelRunner.createMeasuredFetch, "function");
    assert.equal(typeof modelRunner.isTransientNetworkError, "function");
    assert.equal(typeof modelRunner.runCli, "function");
  });

  await t.test("resolves Luna default configuration preserving endpoint, model, and direct fetch without proxy", () => {
    const config = rawRunner.resolveProviderConfig("luna", null, { apiKey: "test-luna-key" });
    assert.equal(config.provider, "luna");
    assert.equal(config.providerId, "luna-gateway");
    assert.equal(config.providerLabel, "Luna Gateway");
    assert.equal(config.endpoint, "https://8.220.199.185.sslip.io/v1");
    assert.equal(config.model, "gpt-5.6-luna");
    assert.equal(config.useProxy, false);
    assert.equal(config.apiKey, "test-luna-key");

    // Allows custom model for Luna
    const customConfig = rawRunner.resolveProviderConfig("luna", "gpt-5.6-luna-extended", { apiKey: "test-luna-key" });
    assert.equal(customConfig.model, "gpt-5.6-luna-extended");
  });

  await t.test("resolves OpenCode Go configuration with deepseek-v4-flash, endpoint, and proxyUrl", () => {
    const config = rawRunner.resolveProviderConfig("opencode-go", null, { apiKey: "test-key" });
    assert.equal(config.provider, "opencode-go");
    assert.equal(config.providerId, "opencode-go");
    assert.equal(config.providerLabel, "OpenCode Go");
    assert.equal(config.endpoint, "https://opencode.ai/zen/go/v1");
    assert.equal(config.model, "deepseek-v4-flash");
    assert.equal(config.useProxy, true);
    assert.equal(config.proxyUrl, "http://127.0.0.1:7100/api/model-proxy");
    assert.equal(config.apiKey, "test-key");

    // Allows explicit deepseek-v4-flash
    const explicitConfig = rawRunner.resolveProviderConfig("opencode-go", "deepseek-v4-flash", { apiKey: "test-key" });
    assert.equal(explicitConfig.model, "deepseek-v4-flash");

    const museConfig = rawRunner.resolveProviderConfig("opencode-go", "muse-spark-1.2-contributor", { apiKey: "test-key" });
    assert.equal(museConfig.model, "muse-spark-1.2-contributor");
    const museConsolidationConfig = modelRunner.resolveProviderConfig("opencode-go", "muse-spark-1.2-contributor", { apiKey: "test-key" });
    assert.equal(museConsolidationConfig.model, "muse-spark-1.2-contributor");
  });

  await t.test("strictly rejects mismatched models when provider is opencode-go", () => {
    assert.throws(
      () => rawRunner.resolveProviderConfig("opencode-go", "gpt-5.6-luna", { apiKey: "test-key" }),
      /Provider 'opencode-go' supports models/
    );
    assert.throws(
      () => rawRunner.resolveProviderConfig("opencode-go", "claude-3-7-sonnet", { apiKey: "test-key" }),
      /Provider 'opencode-go' supports models/
    );
    assert.throws(
      () => modelRunner.resolveProviderConfig("opencode-go", "gpt-5.6-luna", { apiKey: "test-key" }),
      /Provider 'opencode-go' supports models/
    );
  });

  await t.test("strictly fails when keys are missing or provider is unsupported", () => {
    assert.throws(
      () => rawRunner.resolveProviderConfig("unsupported-provider", null, { apiKey: "test-key" }),
      /Unsupported provider 'unsupported-provider'/
    );
    assert.throws(
      () => rawRunner.resolveProviderConfig("luna", null, { apiKey: "", lunaKeyPath: "/nonexistent/path/to/key" }),
      /Luna API key is required/
    );
    assert.throws(
      () => rawRunner.resolveProviderConfig("opencode-go", null, { apiKey: "", keysPath: "/nonexistent/keys.json" }),
      /OpenCode Go API key is required/
    );
  });

  await t.test("createProxyFetch formats payload matching {targetUrl, apiKey, body} and passes response through", async () => {
    const proxyRequests = [];
    const mockProxyFetchImpl = async (url, init) => {
      proxyRequests.push({ url, init, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({
        id: "chatcmpl-test",
        choices: [{ message: { content: '{"entries":[]}' }, finish_reason: "stop" }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const proxyFetch = rawRunner.createProxyFetch({
      proxyUrl: "http://127.0.0.1:7100/api/model-proxy",
      apiKey: "fake-secret",
      fetchImpl: mockProxyFetchImpl,
    });

    const targetUrl = "https://opencode.ai/zen/go/v1/chat/completions";
    const requestBody = {
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "Extract entries" }],
      reasoning_effort: "high",
      max_tokens: 16000,
    };

    const response = await proxyFetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer fake-secret",
      },
      body: JSON.stringify(requestBody),
    });

    assert.equal(response.status, 200);
    assert.equal(proxyRequests.length, 1);
    assert.equal(proxyRequests[0].url, "http://127.0.0.1:7100/api/model-proxy");
    assert.equal(proxyRequests[0].init.method, "POST");
    assert.equal(proxyRequests[0].body.targetUrl, "https://opencode.ai/zen/go/v1/chat/completions");
    assert.equal(proxyRequests[0].body.apiKey, "fake-secret");
    assert.deepEqual(proxyRequests[0].body.body, requestBody);
    assert.equal(proxyRequests[0].body.body.reasoning_effort, "high");

    const json = await response.json();
    assert.equal(json.id, "chatcmpl-test");
    assert.equal(json.choices[0].finish_reason, "stop");
  });

  await t.test("createProxyFetch produces clear error when proxy connection is refused", async () => {
    const mockRefusedFetch = async () => {
      const err = new TypeError("fetch failed");
      err.cause = { code: "ECONNREFUSED" };
      throw err;
    };

    const proxyFetch = rawRunner.createProxyFetch({
      proxyUrl: "http://127.0.0.1:7100/api/model-proxy",
      apiKey: "test-key",
      fetchImpl: mockRefusedFetch,
    });

    await assert.rejects(
      async () => {
        await proxyFetch("https://opencode.ai/zen/go/v1/chat/completions", {
          method: "POST",
          body: JSON.stringify({ model: "deepseek-v4-flash" }),
        });
      },
      /Local model proxy server unavailable at http:\/\/127\.0\.0\.1:7100\/api\/model-proxy/
    );
  });

  await t.test("measuredFetch wraps proxyFetch and retains 502/503/504 retry and prompt_cache_retention retry without leaking secrets", async () => {
    const recordedCalls = [];
    const proxyPayloads = [];
    let attemptCount = 0;

    const mockProxyFetch = async (url, init) => {
      attemptCount += 1;
      const parsedBody = JSON.parse(init.body);
      proxyPayloads.push(parsedBody);

      if (attemptCount === 1) {
        return new Response("Bad Gateway from upstream", { status: 502, headers: { "Content-Type": "text/plain" } });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"entries":[{"id":"def:1","name":"D1","type":"definition","statement":"Let $x=1$.","page":1}]}' }, finish_reason: "stop" }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const proxyFetch = rawRunner.createProxyFetch({
      proxyUrl: "http://127.0.0.1:7100/api/model-proxy",
      apiKey: "fake-key",
      fetchImpl: mockProxyFetch,
    });

    const measuredFetch = rawRunner.createMeasuredFetch(recordedCalls, { fetchImpl: proxyFetch });

    const targetUrl = "https://opencode.ai/zen/go/v1/chat/completions";
    const res = await measuredFetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer fake-key" },
      body: JSON.stringify({ model: "deepseek-v4-flash", messages: [{ role: "user", content: "extract" }] }),
    });

    assert.equal(res.status, 200);
    assert.equal(attemptCount, 2);
    assert.equal(recordedCalls.length, 2);
    assert.equal(recordedCalls[0].attempt, 1);
    assert.equal(recordedCalls[0].status, 502);
    assert.equal(recordedCalls[1].attempt, 2);
    assert.equal(recordedCalls[1].status, 200);

    // Ensure fake-key is NOT leaked into recordedCalls diagnostics
    const callsDump = JSON.stringify(recordedCalls);
    assert.ok(!callsDump.includes("fake-key"), "Recorded calls must never leak API secrets");
  });

  await t.test("runCli in run-paper-entry-raw-extraction accepts --provider=opencode-go and produces valid raw pool with OpenCode Go diagnostics", async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "scratch-test-raw-runner-"));
    const outputPath = path.join(tempDir, "output-raw-pool.json");
    const mockProxyCalls = [];

    const mockFetchImpl = async (url, init) => {
      const payload = JSON.parse(init.body);
      mockProxyCalls.push(payload);
      return new Response(JSON.stringify({
        id: "chatcmpl-raw-test",
        choices: [{
          message: {
            content: JSON.stringify({
              entries: [
                { id: "def:braid", type: "definition", name: "Braid", statement: "A braid is a collection of $n$ strands.", page: 1 },
              ],
            }),
          },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 80, completion_tokens: 40, total_tokens: 120 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      await rawRunner.runCli([
        "mock-paper.pdf",
        outputPath,
        "deepseek-v4-flash",
        "high-compact",
        "--provider=opencode-go",
      ], {
        apiKey: "test-secret",
        text: "[[PAGE 1]]\nDefinition 1: Braid.\n\n[[PAGE 2]]\nTheorem 1: Braid group.",
        pageCount: 2,
        fetchImpl: mockFetchImpl,
      });

      assert.ok(fs.existsSync(outputPath));
      const pool = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      assert.equal(pool.schema, RAW_ENTRY_POOL_SCHEMA);
      assert.equal(pool.rawEntries.length, 1);
      assert.equal(pool.diagnostics.modelCallMetadata.provider, "OpenCode Go");
      assert.equal(pool.diagnostics.modelCallMetadata.model, "deepseek-v4-flash");
      assert.equal(pool.diagnostics.modelCallMetadata.reasoningEffort, "high");

      // Verify proxy target and body
      assert.ok(mockProxyCalls.length >= 1);
      for (const call of mockProxyCalls) {
        assert.equal(call.targetUrl, "https://opencode.ai/zen/go/v1/chat/completions");
        assert.equal(call.apiKey, "test-secret");
        assert.equal(call.body.model, "deepseek-v4-flash");
        assert.equal(call.body.reasoning_effort, "high");
      }

      // Verify no secrets written to disk
      const poolContent = fs.readFileSync(outputPath, "utf8");
      assert.ok(!poolContent.includes("test-secret"), "Artifact file must never leak API secrets");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test("runCli in run-paper-entry-model-consolidation accepts --provider opencode-go and produces valid artifact with OpenCode Go diagnostics", async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "scratch-test-model-runner-"));
    const rawPoolPath = path.join(tempDir, "raw-pool.json");
    const outputPath = path.join(tempDir, "output-artifact.json");
    const mockProxyCalls = [];

    const rawPool = createRawEntryPool({
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: "paper-entry-parallel-extraction-v1.4",
      source: { fileName: "knot.pdf", pageCount: 2, characters: 50, sourceText: "[[PAGE 1]]\nDef 1\n\n[[PAGE 2]]\nThm 1" },
      chunks: [{ chunkIndex: 0, text: "[[PAGE 1]]\nDef 1", rawEntries: [{ id: "def:knot", type: "definition", name: "Knot", statement: "A knot $K \\subset S^3$.", page: 1 }] }],
      rawEntries: [{ id: "def:knot", type: "definition", name: "Knot", statement: "A knot $K \\subset S^3$.", page: 1 }],
    });
    fs.writeFileSync(rawPoolPath, JSON.stringify(rawPool, null, 2));

    const mockFetchImpl = async (url, init) => {
      const payload = JSON.parse(init.body);
      mockProxyCalls.push(payload);
      return new Response(JSON.stringify({
        id: "chatcmpl-consolidation-test",
        choices: [{
          message: {
            content: JSON.stringify({
              entries: [
                { id: "def:knot", type: "definition", name: "Knot", statement: "A knot $K \\subset S^3$.", page: 1 },
              ],
            }),
          },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 150, completion_tokens: 60, total_tokens: 210 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      await modelRunner.runCli([
        rawPoolPath,
        outputPath,
        "deepseek-v4-flash",
        "off-compact",
        "--provider",
        "opencode-go",
      ], {
        apiKey: "cons-key-7",
        fetchImpl: mockFetchImpl,
      });

      assert.ok(fs.existsSync(outputPath));
      const artifact = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      assert.equal(artifact.schema, ENTRY_ARTIFACT_SCHEMA);
      assert.equal(artifact.entryModuleVersion, MODEL_CONSOLIDATION_MODULE_VERSION);
      assert.equal(artifact.entries.length, 1);
      assert.equal(artifact.diagnostics.modelCallMetadata.provider, "OpenCode Go");
      assert.equal(artifact.diagnostics.modelCallMetadata.model, "deepseek-v4-flash");

      // Verify proxy target and body
      assert.equal(mockProxyCalls.length, 1);
      assert.equal(mockProxyCalls[0].targetUrl, "https://opencode.ai/zen/go/v1/chat/completions");
      assert.equal(mockProxyCalls[0].apiKey, "cons-key-7");
      assert.equal(mockProxyCalls[0].body.model, "deepseek-v4-flash");

      // Verify no secrets written to disk
      const artifactContent = fs.readFileSync(outputPath, "utf8");
      assert.ok(!artifactContent.includes("cons-key-7"), "Artifact file must never leak API secrets");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test("both runners default to Luna when provider flag is omitted", async () => {
    const rawDefault = rawRunner.resolveProviderConfig(undefined, undefined, { apiKey: "test-luna-key" });
    assert.equal(rawDefault.provider, "luna");
    assert.equal(rawDefault.model, "gpt-5.6-luna");
    assert.equal(rawDefault.useProxy, false);

    const modelDefault = modelRunner.resolveProviderConfig(undefined, undefined, { apiKey: "test-luna-key" });
    assert.equal(modelDefault.provider, "luna");
    assert.equal(modelDefault.model, "gpt-5.6-luna");
    assert.equal(modelDefault.useProxy, false);
  });
});
