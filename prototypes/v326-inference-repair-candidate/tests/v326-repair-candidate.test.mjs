import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import v326Modules from "../../../paper-import-modules-v3.26.js";
import candidateApi from "../candidate-repair-prompt.js";
import candidateInferenceModule from "../candidate-inference-module.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("deriveV326MainlineRepairContextCandidate deterministically identifies unproven core targets (0 API calls)", () => {
  const candidate = {
    mainTargetEntryId: "thm:main",
    entries: [
      { id: "def:braiding", entryClass: "fact", factKind: "definition", title: "Braiding", statement: "$c_{V,W}$", page: 2 },
      { id: "lem:yb", entryClass: "claim", claimKind: "lemma", title: "Yang-Baxter", statement: "$YBE$", page: 3 },
      { id: "thm:main", entryClass: "claim", claimKind: "theorem", title: "Main Invariant", statement: "$RT(M)$", page: 6 },
      { id: "conj:open", entryClass: "claim", claimKind: "conjecture", title: "Open Question", statement: "$Q$", page: 8, explicitOpen: true },
    ],
    inferences: [
      { id: "i1", operationKind: "proof", premises: ["def:braiding"], conclusion: "lem:yb" },
    ],
    b0ClaimEntryIds: [],
  };

  const paperGuide = {
    leads: [
      { id: "thm:main", narrative_role: "main_target", title: "Main Invariant" },
      { id: "lem:yb", narrative_role: "key_result", title: "Yang-Baxter" },
    ],
  };

  const context = candidateApi.deriveV326MainlineRepairContextCandidate(candidate, {
    paperGuide,
    protectedClaimIds: ["thm:main"],
  });

  // 验证提取内容
  assert.ok(context.includes("【核心主线目标缺失 Proof 清单 (Unproven Core Mainline Targets)】"));
  assert.ok(context.includes("thm:main"));
  // lem:yb 已有入向证明，不应列入缺失清单
  assert.ok(!context.includes("[key_result] lem:yb"));
  // 可用前提池应包含 def:braiding 与 lem:yb
  assert.ok(context.includes("【可作为 proof.premises 的有效前置条目索引 (Available Premise Catalog)】"));
  assert.ok(context.includes("def:braiding"));
  assert.ok(context.includes("lem:yb"));
});

test("v326FocusedAssemblyRepairPromptCandidate generates complete fail-closed repair prompt", () => {
  const issues = [
    "Claim thm:main（Main Invariant）没有 proof 且不在 b0",
  ];

  const candidate = {
    mainTargetEntryId: "thm:main",
    entries: [
      { id: "def:1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "$x$", page: 1 },
      { id: "thm:main", entryClass: "claim", claimKind: "theorem", title: "Main Invariant", statement: "$T$", page: 5 },
    ],
    inferences: [],
    b0ClaimEntryIds: [],
  };

  const prompt = candidateApi.v326FocusedAssemblyRepairPromptCandidate(issues, {
    candidate,
    paperGuide: { leads: [{ id: "thm:main", narrative_role: "main_target" }] },
    canonicalIndex: "- def:1\n- thm:main",
    requirePage: true,
  });

  assert.ok(prompt.includes("这是 V3.26 定向装配修复"));
  assert.ok(prompt.includes("【主线证明闭包优先 (Mainline Proof Closure)】"));
  assert.ok(prompt.includes("【严守 Fail-Closed 与不臆造原则 (Strict Fail-Closed)】"));
  assert.ok(prompt.includes("thm:main"));
  assert.ok(prompt.includes("inferencesToAdd"));
  assert.ok(prompt.includes("fixedEntries"));
});

test("applyCandidateRepairPatch applies mainline inference without rewriting existing entry statements", () => {
  const base = {
    projectTitle: "Test Project",
    mainTargetEntryId: "thm:main",
    entries: [
      { id: "def:1", entryClass: "fact", factKind: "definition", title: "Def 1", statement: "Original Math Statement $A$", page: 1, sourcePath: "p.pdf#page=1" },
      { id: "thm:main", entryClass: "claim", claimKind: "theorem", title: "Main Theorem", statement: "Original Main Statement $B$", page: 5, sourcePath: "p.pdf#page=5" },
    ],
    inferences: [],
    b0ClaimEntryIds: [],
  };

  const patch = {
    inferencesToAdd: [
      {
        type: "proof",
        premises: ["def:1"],
        conclusion: "thm:main",
        argument: "由 def:1 直接推导主定理。",
        page: 5,
      },
    ],
    fixedEntries: [
      // 试图篡改已有数学陈述（应被安全忽略或不覆写数学 statement）
      { id: "thm:main", statement: "Malicious Tampered Statement" },
    ],
  };

  const patched = candidateInferenceModule.applyCandidateRepairPatch(base, patch);

  // 1. 验证证明边成功添加
  assert.equal(patched.inferences.length, 1);
  assert.equal(patched.inferences[0].operationKind, "proof");
  assert.deepEqual(patched.inferences[0].premises, ["def:1"]);
  assert.equal(patched.inferences[0].conclusion, "thm:main");

  // 2. 验证已有数学陈述绝对未被覆写
  const thmEntry = patched.entries.find((e) => e.id === "thm:main");
  assert.equal(thmEntry.statement, "Original Main Statement $B$");

  // 3. 验证经过 Format Module 40分制严格校验
  const formatReport = v326Modules.validateFormatArtifact(patched);
  assert.equal(formatReport.passed, true);
  assert.equal(formatReport.formatScore, 40);
});

test("Real benchmark evaluation: repairs knot-hopf-rt V3.26 missing mainline proof", () => {
  const rtOutputFile = path.resolve(__dirname, "../../../benchmarks/model-outputs/fixed-1.0/knot-hopf-rt-v3.26-20260818T095734Z.json");
  if (!fs.existsSync(rtOutputFile)) {
    // 若环境缺少该文件则跳过测试
    return;
  }

  const rawJson = JSON.parse(fs.readFileSync(rtOutputFile, "utf-8"));
  const view = rawJson.view;

  // 验证原输出存在未建立主定理 (paper:theorem:6.3) 的问题
  const rtThmId = "paper:theorem:6.3";
  const originalInboundProofs = (view.inferences || []).filter((inf) => inf.operationKind === "proof" && inf.conclusion === rtThmId);
  // 原输出无 inbound proof
  assert.equal(originalInboundProofs.length, 0);

  // 运行 Context 提取器
  const context = candidateApi.deriveV326MainlineRepairContextCandidate(view, {
    protectedClaimIds: [rtThmId],
    paperGuide: {
      leads: [
        { id: rtThmId, narrative_role: "main_target", title: "Reshetikhin–Turaev invariant" },
      ],
    },
  });

  assert.ok(context.includes("【核心主线目标缺失 Proof 清单"));
  assert.ok(context.includes(rtThmId));

  // 模拟单次 Repair 补全主线推导边
  const repairPatch = {
    inferencesToAdd: [
      {
        type: "proof",
        premises: [
          "paper:def:ribbon-category",
          "paper:def:modular-category",
          "paper:lemma:unit-braiding",
        ],
        conclusion: rtThmId,
        argument: "由 ribbon category 与 modular category 经 surgery construction 得到 Reshetikhin-Turaev 3-manifold 不变量。",
        page: 15,
      },
    ],
  };

  const repairedView = candidateInferenceModule.applyCandidateRepairPatch(view, repairPatch);

  // 验证主线建立
  const newInboundProofs = repairedView.inferences.filter((inf) => inf.operationKind === "proof" && inf.conclusion === rtThmId);
  assert.equal(newInboundProofs.length, 1);

  // 验证 format 评分达到 40/40 满分
  const report = v326Modules.validateFormatArtifact(repairedView);
  assert.equal(report.passed, true);
  assert.equal(report.formatScore, 40);
});
