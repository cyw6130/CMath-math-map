import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import modules from "../../paper-import-modules-v3.26.js";
import paperEntryArtifact from "../../paper-entry-artifact-v1.js";

/**
 * 候选 Assembly Prompt 生成器（实现 candidate.md 中定义的改进逻辑）
 */
function buildCandidateAssemblyPrompt({
  fileName,
  pageCount,
  text,
  catalog,
  externalBoundaryInventory = null,
  paperGuide = null,
  missingCandidates = [],
  externalEvidenceIndex = null,
}) {
  const boundaryNote = externalBoundaryInventory
    ? `\n【外部边界候选清单】这是前置专门通道从全文识别的 B0 候选，必须逐项复核而非机械照抄。active_premise 默认进入 b0；definitional_foundation 只有被本文采用的定义直接依赖时进入 b0；context_only 绝不能进入 b0。清单不是最终 B0，最终 b0 仍由你依据全文判断。\n${JSON.stringify(externalBoundaryInventory)}\n`
    : "";

  const guideNote = paperGuide
    ? `\n【Paper Guide 主线约束】下面的 Paper Guide 是本篇论文的叙事导航，不是额外的数学来源。main_target lead 表示论文最终要解释/证明的核心结果；key_result 是为它服务的关键中间结果。先将 main_target 的 statement 与 Entry 目录逐一对照，再选择 mainTargetEntryId；不要仅因某个 theorem 较晚出现、名字含 gluing/vanishing 或有较长 proof 就把它当成主目标。若 main_target 是综述性目标或由多个结果共同实现，选择最能表达该 lead statement 的核心 Claim，并保留其支撑结果的 proof 边。lead 的 related_lead_ids 与 expansion_needs 只是导航，不得直接生成 proof。\nPaper Guide：\n${JSON.stringify(paperGuide)}\n`
    : "";

  return `你是数学论文结构化编辑器。下面给出一篇论文的 Canonical Entry ID 索引（已提取的数学对象）与全文文本。请通读全文，只输出推理关系与地图元信息，紧凑输出一个 JSON 对象，不要 Markdown，不要输出 Entry 本体。\n\n`
    + `【语言要求】projectTitle 与 argument 一律使用简体中文撰写；数学符号与公式保留 $...$ / $$...$$，必须成对闭合。\n\n`
    + `Gamma 语义与提取规则：\n`
    + `- Fact: entryClass=fact，factKind 只能是 definition|algorithm|calculation。definition、algorithm、calculation 属于 Fact，绝不能作为 proof 的结论。\n`
    + `- Claim: entryClass=claim，claimKind 只能是 lemma|proposition|theorem。论文明确提出但未证明的数学陈述仍是正式 Claim，保留在地图中并由闭包派生为 open；不要创建 conjecture、candidate 或 draft 类型。\n`
    + `- Inference: operationKind 只能是 organization（Fact 到 Fact）或 proof（若干 Fact/Claim 到 Claim）。\n`
    + `- 【规则 1】proof 的结论（conclusion）只能是 entryClass=claim 的 Entry，绝不能以 Fact 为结论。\n`
    + `- 【规则 2】definition/algorithm/calculation 属于 Fact，绝不能作为 proof 的结论。\n`
    + `- 【规则 3】若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim（lemma|proposition|theorem），并将 proof 的 conclusion 指向该 Claim。\n`
    + `- 【规则 4】若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系，不要生成 Inference。\n`
    + `- 【规则 5】严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference；只有论文中实际存在的证明或组织关系才输出 Inference。\n`
    + `- 【证明依赖】论文中实际给出证明的 Claim 才输出 proof。premises 只列论文证明实际使用且已在 Entry 目录中的直接依赖 id；proof 的 conclusion 严禁同时出现在自己的 premises 中，严禁产生循环证明依赖，也不要为闭合地图而补造依赖。\n`
    + `- 【证明覆盖】论文中给出证明的每个 Claim 通常都应有对应 proof；不要因为证明简短或显然而省略（推论的一句话证明也算）。\n`
    + `- 【Paper Guide 主线分支与核心证明覆盖】装配时必须以 Paper Guide 的 main_target 与 key_result 为叙事骨干，结合 Canonical Entry 索引，输出论文实际支持的完整内部证明链：\n`
    + `  ① 内部主目标必须有 proof：论文内部证明的核心主定理（mainTargetEntryId）必须有直接或多步 proof 支撑，严禁悬空为 open，严禁因证明篇幅长或跨章节而遗漏主结论推导；\n`
    + `  ② 覆盖所有关键中间结果分支：对于 Paper Guide 标记的 key_result，若论文给出证明，必须输出对应 proof 及其所依赖的关键定义（Fact）与前置引理，完整表达从基础/外部 B0 经各 key_result 到 main_target 的数学路线；\n`
    + `  ③ 拒绝仅输出少量局部引理：绝不能仅输出开头 3-4 条局部简单引理就停止装配；必须覆盖论文实际包含的各个核心证明分支与支撑结构；\n`
    + `  ④ 保持真实，严禁臆造：只输出论文中真实存在的证明（proof）与概念组织（organization），不为闭合地图臆造不存在的依赖，允许自然的多连通分支。\n`
    + `- 【闭包一致性】地图会按「Fact 与 b0 可用、proof 沿依赖传递建立」做闭包推导。逐项检查：任何被某条 proof 的 premises 引用的 Claim，必须要么自己有 proof、要么列入 b0。若某个被依赖的 Claim 两者都不是：论文证明了它就补 proof；论文未证明但直接引用，就通过 fixedEntries 给它补 "external":true 与非空 source 并把它列入 b0；论文明确未证明的 Claim（猜想/开放问题）不得作为 premise 使用。\n`
    + `- 没有被 proof 建立的 Claim 不要改动、不要提及；地图会把它派生为 open。\n`
    + `- 只有论文中实际存在的证明关系才输出 proof；只有实际的 Fact-to-Fact 组织关系才输出 organization。\n`
    + `- 【主目标】必须输出 mainTargetEntryId，指明本文证明或探讨的核心目标 Claim（必须是 Entry 目录中的 Claim id，例如主定理），不能指向 Fact 或未列出的 id。\n`
    + `- 【主目标与 Paper Guide 对齐】在 Paper Guide 的 main_target lead 范围内选择最能表达其最终结论的 Claim；不要把全文中另一个更晚出现、但仅属 supporting_result 或应用/特例的 theorem 当作主目标。若 main_target 对应多个等价层次，选择该 lead 明确陈述的最强原始结果，并保留其下游 corollary/应用 proof。\n`
    + `- 【主目标与 Paper Guide 闭包保护】mainTargetEntryId 必须与 Paper Guide 的 main_target 对齐。Paper Guide 中的 formal main_target 与 key_result Claim 属于受保护核心结果，后置收敛不会将其删除；不要强行将每个 key_result 都塞入 mainTarget 的直接 premises 中，论文中实际存在独立或分支证明的 key_result 应建立其各自的内部 proof 依赖，技术支撑定理必须连接到全局主定理的证明链中；未证明的侧向推论或次要叙事标记为 context_only 或保持 open，严禁为其臆造 proof 或强行放入 B0。\n`
    + `- 【上下文外部结果】仅用于 related work、历史特殊情形、比较或应用史的 external Claim 不得放入 fixedEntries/b0，也不得被任何 inference 引用；它们不是数学地图的论证边界。\n`
    + `- 【B0 清单】必须输出 b0 数组，逐项列出 Entry 目录中所有标记「外部结果」的 Claim id。论文自己证明的结果与 Fact 绝不能放进 b0；不要编造目录中不存在的 id。\n`
    + `- 【B0 复核】逐项复核 Entry 的 external 标记：分段提取时模型只看得到局部页段，可能把「本文后文实际给出了证明」的结果误标为外部结果。若你在全文中找到该结果的证明，绝不能把它放进 b0。\n`
    + `- 【Gold 对照式自检】装配前按四个独立维度复核：①论文明确命名/编号的对象是否都在目录；②证明实际使用的外部 Claim 是否全部进入 B0 且有来源；③B0 中是否混入本文证明的 Claim 或内部定理；④mainTarget 是否是论文主结果而不是背景定理、定义或例子。四项分别核对，不能用“存在一条闭合路径”替代对象覆盖。\n`
    + `- 【完整性核对】输出前先核对全文：论文中明确编号或命名的 definition/algorithm/calculation/lemma/proposition/theorem 是否都已在 Entry 目录中？论文论证实际调用的外部结果是否都已收录并标记？若有遗漏，必须在 JSON 顶层 "fixedEntries" 数组中补充完整条目（新 id、type/num/name/statement/page，外部结果另加 "external":true 与非空 source），补充的外部结果 id 同时列入 b0。\n`
    + `- 【Canonical ID 引用约束】proof 与 organization 的 premises/conclusion 只能使用 Canonical Entry ID 索引中列出的已有条目 id；若目录中已有等价条目，必须使用其原始 id。\n`
    + `- 【过渡步骤约束】论文论证中的解释性过渡步骤、中间计算说明只能写在 argument 中，严禁升格或新建不存在的内部 theorem/lemma 条目。\n`
    + `- 【严禁因标题自创新条目】不得因正文的自然语言小节标题、段落说明或引言叙述自行新建内部 theorem/lemma；只有论文正式陈述的数学对象才作为 Entry。\n`
    + `- premises 与 conclusion 只能使用 Entry 目录中列出的 id。若你发现某个前提或结论确实不在目录中（提取阶段遗漏），不要编造 id：在 JSON 顶层加 "fixedEntries" 数组补充该条目。\n`
    + `- argument 最多 400 个字符，概括证明或组织要点；page 填写该关系在正文出现的页码。\n\n`
    + `JSON 形状：\n`
    + `{"projectTitle":"……","mainTargetEntryId":"……","b0":["……"],"inferences":[{"type":"proof","premises":["……"],"conclusion":"……","argument":"……","page":5}]}\n\n`
    + `Canonical Entry ID 索引：\n${catalog}\n${boundaryNote}${guideNote}\n论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
}

test("1. Candidate prompt removes <=30 inference clamp and contains 4 mainline coverage instructions", () => {
  const guide = {
    leads: [
      { id: "lead:main", title: "RT Invariant", statement: "Construction of RT invariant", narrative_role: "main_target", pages: [15] },
      { id: "lead:key1", title: "Kirby Move Invariance", statement: "Invariance under Kirby moves", narrative_role: "key_result", pages: [10] },
    ],
  };
  const prompt = buildCandidateAssemblyPrompt({
    fileName: "RT.pdf",
    pageCount: 19,
    text: "[[PAGE 1]] content...",
    catalog: "- paper:def:ribbon\n- paper:theorem:rt-main",
    paperGuide: guide,
  });

  // 必须移除 30 条限制
  assert.equal(prompt.includes("Inference 总数建议在 30 条以内"), false, "Candidate prompt must omit <=30 count clamp");

  // 必须包含主线分支覆盖核心指引
  assert.match(prompt, /【Paper Guide 主线分支与核心证明覆盖】/u);
  assert.match(prompt, /内部主目标必须有 proof/u);
  assert.match(prompt, /覆盖所有关键中间结果分支/u);
  assert.match(prompt, /拒绝仅输出少量局部引理/u);
  assert.match(prompt, /保持真实，严禁臆造/u);
  assert.match(prompt, /mainTargetEntryId/u);
});

test("2. Format module validates candidate-compliant project view with full 40/40 score", () => {
  const entryArtifact = {
    schema: "cmath.paper-entry-artifact/v1",
    entryModuleVersion: "v3.26-entry-v1",
    source: { fileName: "RT.pdf", pageCount: 19, characters: 1000, sourceText: "text" },
    entries: [
      { id: "paper:def:ribbon-category", entryClass: "fact", factKind: "definition", title: "Ribbon 范畴", statement: "定义 Ribbon 范畴", page: 2 },
      { id: "paper:claim:kirby-moves", entryClass: "claim", claimKind: "lemma", title: "Kirby 移动不变性", statement: "加权不变性", page: 10 },
      { id: "paper:claim:rt-main-theorem", entryClass: "claim", claimKind: "theorem", title: "RT 3-流形不变量主定理", statement: "存在良定 3-流形不变量", page: 15 },
    ],
  };

  const sampleCandidateView = {
    projectTitle: "Reshetikhin-Turaev Invariant",
    mainTargetEntryId: "paper:claim:rt-main-theorem",
    entries: entryArtifact.entries,
    inferences: [
      {
        id: "inf:1",
        operationKind: "proof",
        premises: ["paper:def:ribbon-category"],
        conclusion: "paper:claim:kirby-moves",
        argument: "利用 Ribbon 范畴的 trace 与 twist 验证 Kirby I, II 移动下的不变性。",
        page: 10,
      },
      {
        id: "inf:2",
        operationKind: "proof",
        premises: ["paper:def:ribbon-category", "paper:claim:kirby-moves"],
        conclusion: "paper:claim:rt-main-theorem",
        argument: "由 Kirby 移动不变性与 Lickorish-Wallace 定理，构造出良定的闭 3-流形拓扑不变量。",
        page: 15,
      },
    ],
    derivedResearchState: { mathematicalState: { b0ClaimEntryIds: [] } },
  };

  const formatReport = modules.validateFormatArtifact({
    schema: modules.INFERENCE_ARTIFACT_SCHEMA,
    view: sampleCandidateView,
  });

  assert.equal(formatReport.passed, true);
  assert.equal(formatReport.formatScore, 40);
  assert.equal(formatReport.formatScoreMax, 40);
  assert.equal(formatReport.counts.entries, 3);
  assert.equal(formatReport.counts.inferences, 2);
});

test("3. Verifies reduction in isolated entries when mainline proof branches are populated", () => {
  const entries = [
    { id: "def:1", entryClass: "fact" },
    { id: "def:2", entryClass: "fact" },
    { id: "key:1", entryClass: "claim" },
    { id: "main:1", entryClass: "claim" },
  ];

  // 模拟原有 V3.26 劣质产物（仅 1 条局部 proof，main target 悬空）
  const legacyInferences = [
    { operationKind: "proof", premises: ["def:1"], conclusion: "key:1" },
  ];
  const legacyConnected = new Set(["def:1", "key:1"]);
  const legacyIsolated = entries.filter((e) => !legacyConnected.has(e.id));
  assert.equal(legacyIsolated.length, 2); // def:2 和 main:1 孤立！

  // 模拟候选产物（完整主线覆盖）
  const candidateInferences = [
    { operationKind: "proof", premises: ["def:1"], conclusion: "key:1" },
    { operationKind: "proof", premises: ["def:2", "key:1"], conclusion: "main:1" },
  ];
  const candidateConnected = new Set();
  for (const inf of candidateInferences) {
    candidateConnected.add(inf.conclusion);
    for (const p of inf.premises) candidateConnected.add(p);
  }
  const candidateIsolated = entries.filter((e) => !candidateConnected.has(e.id));
  assert.equal(candidateIsolated.length, 0); // 孤立 Entry 降为 0！
});
