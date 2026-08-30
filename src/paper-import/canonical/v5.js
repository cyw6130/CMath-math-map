/**
 * Frozen canonical Paper-to-Map V5.1 workflow.
 *
 * V5.1 retains the accepted V5 mathematical extraction rules and adds the
 * website's default Simplified-Chinese output policy. Keep it isolated from
 * the laboratory prompt, which continues to evolve independently.
 */
(function publishCanonicalPaperImportV5(root, factory) {
  "use strict";
  const loadCanonicalSemantics = () => {
    if (root?.GammaMathMapSemanticsV3) return root.GammaMathMapSemanticsV3;
    if (typeof require !== "function") return root?.GammaMathMapSemantics ?? null;
    const previous = root?.GammaMathMapSemantics;
    const loaded = require("../../../capabilities/runtime/packages/math-map/state/math-graph-semantics-v3/src/index.js");
    if (root) {
      if (previous === undefined) delete root.GammaMathMapSemantics;
      else root.GammaMathMapSemantics = previous;
    }
    return loaded;
  };
  const transport = root?.CMathPaperModelTransport
    ?? (typeof require === "function" ? require("../core/model-transport.js") : null);
  const semantics = loadCanonicalSemantics();
  const api = factory(transport, semantics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathCanonicalPaperImportV5 = api;
})(typeof window !== "undefined" ? window : globalThis, function createCanonicalPaperImportV5(modelTransport, semantics) {
  "use strict";

  const PROMPT_VERSION = "canonical-map-v5.1-zh-default-fidelity-with-complete-dependencies-r2";
  const INPUT_TOKEN_LIMIT = 100_000;
  const MAX_REPAIR_ATTEMPTS = 2;
  const RESULT_SCHEMA = "cmath.paper-to-map-result/v1";
  const CAPABILITY_SYNC_IDENTITY = "sha256:3ad779db70b37cdfb7be9e9435e6de54d727482b273fc3e38c5295895a6d3198";
  const FROZEN_WORKFLOW = Object.freeze({
    label: "canonical-paper-to-map-v5.1-zh-default",
    productionContractVersion: "production-canonical-paper-import/v1",
    resultContractVersion: RESULT_SCHEMA,
    mineruInputVersion: "cmath.paper-import.mineru/v1",
    promptVersion: PROMPT_VERSION,
    semanticRuntimeVersion: "cmath-gamma.math-map-semantics/v3",
    capabilityAuthority: "../CMath-capabilities/exports/canonical.json",
    capabilitySyncIdentity: CAPABILITY_SYNC_IDENTITY,
    outputSchema: "cmath.math-map-state/v3",
  });

  const CONTRACT_MARKDOWN = `# Math Map State Space v3

\`cmath-gamma.math-map-semantics/v3\` 定义严格数学状态 \`M\` 的合法结构和确定性派生。它不定义草稿、审核、写入授权、持久化、来源治理、路线状态或前端。

## 1. Interface

Module 只提供一个主要 interface：

\`\`\`js
deriveMathState(M)
\`\`\`

输入非法时抛出带稳定 \`code\` 的错误；输入合法时返回 Closure、Claim 状态、派生见证和开放阻塞诊断。函数不修改输入，也不写入外部状态。

## 2. 严格数学状态

\`\`\`text
M = Entries + Inferences + NegationPairs + B0
Closure = derive(M)
\`\`\`

逻辑容器恰有四个顶层字段：

\`\`\`js
{
  entries: [],
  inferences: [],
  negationPairs: [],
  b0ClaimEntryIds: []
}
\`\`\`

所有字段均为数组；未知顶层字段非法。位于 \`M\` 中就意味着对象已经 formal，不另设 \`formal\` 或 \`draft\` 字段。

## 3. Entry

\`\`\`text
Entry = Fact | Claim
Fact = definition | algorithm | calculation
Claim = lemma | proposition | theorem
\`\`\`

Fact 的字段恰为：

\`\`\`text
id / entryClass=fact / factKind / title / statement
\`\`\`

Claim 的字段恰为：

\`\`\`text
id / entryClass=claim / claimKind / title / statement
\`\`\`

所有字符串必须非空且不得带首尾空白。kind 是封闭集合；新增 kind 产生新的能力主版本。

### Claim Narrative Role

\`lemma | proposition | theorem\` 是 Claim 在当前数学研究项目中的项目级叙事角色，不表示逻辑强弱、证明难度、可信等级或证明状态：

- Lemma 是局部、战术性、中间性或工具性的结果。
- Proposition 是非核心但可以独立陈述、构成实质性研究进展的结果。
- Theorem 是项目的核心数学内容、核心答案或最终结论。

Narrative Role 在 Entry 进入严格数学状态 M 时确定，此后不变。路线选择、Claim 状态以及后来对内容正确性的判断都不回写这一角色；即使一个 Entry 后来被判错，其 Narrative Role 也保持原值。外部来源中的命名不决定项目内角色。

Corollary 不是第四种 Claim kind，而是结果与其推导来源之间的关系描述；该结果仍根据它在当前项目中的叙事作用归入 lemma、proposition 或 theorem。

所有 Fact 天然可用，不具有 Claim 数学状态。

## 4. Inference

Inference 的字段恰为：

\`\`\`text
id / operationKind / premises / conclusion / argument
\`\`\`

\`operationKind\` 仅为 \`proof | organization\`。Inference 没有语义 \`title\`。

- premises 至少一个，是无重复的联合依赖集合；顺序没有数学语义。
- conclusion 恰好一个。
- argument 必须是非空、来源忠实的论证。
- 所有端点必须引用同一 \`M\` 中的 Entry。

Proof：

\`\`\`text
(Fact | Claim)+ → Claim
\`\`\`

不同 proof 指向同一 Claim 时构成替代路径；任一路径的全部 premises 可用即可建立结论。proof 循环合法，但没有 B0 或循环外入口时不能自行建立 Claim。

Organization：

\`\`\`text
(Fact | Claim)+ → Fact(definition)
\`\`\`

Organization 表达概念形成，不参与 Closure，不改变 Claim 状态。organization 自环或多节点循环非法。

## 5. ID

Entry 与 Inference 在单个 \`M\` 中共享全局命名空间。ID 区分大小写；首尾空白导致验证失败，不进行静默规范化。跨提交稳定性、改名和 revision 不属于本合同。

## 6. B0

B0 是可靠的外部 Claim 前提子集：

- Fact 不得进入 B0。
- B0 不得重复。
- 来源范围内部提出但未证明的 Claim 保持 open。
- 若移除某个 B0 种子后，该 Claim 仍能由其他 B0、Fact 与 proof 独立建立，则它已经在范围内重新证明，不得再属于 B0。
- B0 可以为 proof 循环提供入口；仅有指向 B0 Claim 的循环 proof 不构成独立重证。

## 7. Negation Pair

Negative Claim 是普通 Claim，不是新的 Claim kind。

\`\`\`js
{ claimEntryIds: ["P", "not-P"] }
\`\`\`

NegationPair 没有独立 ID，其无序 Claim 端点集合就是关系身份：

- 两端必须是不同 Claim。
- 重复或反向重复非法。
- 一个 Claim 最多属于一个 NegationPair。
- 未知字段非法。

## 8. Closure 与 Claim 三态

Closure 初始可用集合为全部 Fact 与全部 B0 Claim。反复应用 proof，直到不再有新的 Claim 可以加入。

\`\`\`text
P ∈ Closure                  → established
P ∉ Closure, ¬P ∈ Closure    → refuted
P ∉ Closure, ¬P ∉ Closure    → open
P ∈ Closure, ¬P ∈ Closure    → M 非法
\`\`\`

严格状态只有 \`open | established | refuted\`；不存在 \`supported\` 或 \`inconsistent\`。

## 9. 派生结果

\`deriveMathState(M)\` 返回：

\`\`\`js
{
  availableFactIds,
  b0ClaimEntryIds,
  closureClaimEntryIds,
  claimStates,
  claimDerivations
}
\`\`\`

派生见证：

- B0 established Claim：\`{ basis: "b0" }\`。
- proof established Claim：\`{ basis: "proof", establishingProofIds: [...] }\`，包含所有当前可用的直接 proof。
- refuted Claim：记录 \`negatingClaimEntryId\` 与 \`negationPairClaimEntryIds\`。
- 无 proof 的 open Claim：\`{ basis: "open", reason: "no_proof" }\`。
- 有 proof 但尚未闭合的 open Claim：逐条记录 \`proofId\` 与 \`missingPremiseIds\`。

见证只解释当前 \`M\` 的确定性结构，不是来源证据、审核记录或路线选择。

## 10. 稳定错误码

- \`INVALID_STATE_SHAPE\`
- \`UNKNOWN_FIELD\`
- \`INVALID_ENTRY\`
- \`DUPLICATE_ID\`
- \`INVALID_INFERENCE\`
- \`UNKNOWN_REFERENCE\`
- \`INVALID_NEGATION_PAIR\`
- \`ORGANIZATION_CYCLE\`
- \`INVALID_B0\`
- \`CONTRADICTORY_CLOSURE\`

## 11. 明确排除

本能力不拥有数学草稿、Candidate、Review、TransitionProposal、Governance Receipt、来源位置、证据等级、持久化或序列化格式、revocation、Route、Task、Attempt、Obstacle、命名、布局和前端。`;

  const OUTPUT_LANGUAGE_RULE = "Entry.title、Entry.statement 与 Inference.argument 默认使用准确、自然的简体中文；数学公式、符号、变量、标准专名与必要英文缩写按来源保留。翻译不得改变命题条件、量词、逻辑方向或数学术语含义。";

  const GENERATE_TEMPLATE = `# 任务

从给定论文来源构造一份完整的标准数学地图。

## 步骤

1. 阅读全部来源，识别来源支持的 Entry。
2. 在同一张地图中建立直接 Inference、B0 与来源确实同时陈述的否定关系。
3. 覆盖论文的主要定义、定理、引用的外部前提、关键中间结果和主证明步骤；不要因为避免错误而改成极小摘要。
4. 对每条 Inference 逐条核对：前提确实在来源论证中被使用，结论与来源的作用范围、条件和论证方向一致。
5. 对每个 Entry 逐条核对其认识论类型：定义、假设、问题、猜想、例子、备注、引理与定理不得互相提升或混淆。
6. 做一次覆盖回查：核心外部前提、主要定义与结果、来源明确给出的组织性依赖、关键中间步骤和主证明支路均已进入地图。
7. 按注入的能力合同检查类型、引用、论证方向和字段。
8. 只输出最终 JSON。

## 完成标准

- 只输出一个完整 JSON 对象，不使用 Markdown 代码围栏或解释文字。
- 顶层仅包含 \`entries\`、\`inferences\`、\`negationPairs\`、\`b0ClaimEntryIds\`。
- {{OUTPUT_LANGUAGE_RULE}}
- 每个数学陈述和论证都能由来源支持。
- \`negationPairs\` 是可选的；如果来源没有明确陈述两个互为逻辑否定的 Claim Entry，必须输出空数组。
- 严禁为了填充 \`negationPairs\` 而新造原命题的反命题、反例存在性或“一般成立”的对立命题。例如，来源证明“某条件下不存在 X”时，不得额外生成“存在 X”的 Claim。
- 不得删除原命题的必要条件、把局部或已归一化结论改成无条件结论，也不得把论文中未完成的 purification、normalization 或 correction 省略后声称结论已成立。
- 开放问题、作者提问、猜想和未决方向必须明确保留为问题或未证陈述，绝不能写成已证明的 Claim，也不能作为已知前提支持后续结论。
- 定理、引理、命题、定义、例子和备注必须保留来源中的陈述强度与量词；不得把单向蕴含改成等价、把存在性改成全称性，或把附带条件省略。
- 例子、特例计算或 application 只能支持它们在来源中实际证明的范围；不得用一个例子充当一般定理的证明前提。
- 每条 Inference 都必须能读成来源中实际出现的一步论证：逐一保留所需假设、论证方向、适用范围与结论强度。若来源只给动机、类比、组织关系或章节导引，不得把它编码成证明 Inference。
- 来源明确陈述的数学组织关系可以编码为 Inference，但必须使用准确的关系说明，不得伪装成演绎证明；尤其不要漏掉主结果依赖的代数结构、范畴结构、图形演算、构造步骤或适用条件。
- 准确性检查不得成为删减理由。遇到复杂支路时应拆成较小且可核对的 Entry/Inference，而不是省略整个定义、外部前提或证明分支。
- 不得用“由上述结果立即得”之类笼统 Inference 合并多条独立证明支路；应保留导致主要 Claim 的必要中间作用。
- 输出满足以下能力合同：

{{CAPABILITY_CONTRACT}}

## 论文来源

{{MARKED_MARKDOWN}}`;

  const REPAIR_TEMPLATE = `# 任务

修复一份未通过能力合同校验的完整数学地图。

## 步骤

1. 根据精确校验错误定位问题。
2. 对照论文来源修正结构，同时保持来源数学含义。
3. 重新检查整张地图的类型、引用和论证方向。
4. 重新输出完整 JSON；不要输出 patch。

## 完成标准

- 只输出一个完整 JSON 对象，不使用 Markdown 代码围栏或解释文字。
- 顶层仅包含 \`entries\`、\`inferences\`、\`negationPairs\`、\`b0ClaimEntryIds\`。
- {{OUTPUT_LANGUAGE_RULE}}
- 修复后的每个数学陈述和论证都能由来源支持。
- 输出满足以下能力合同：

{{CAPABILITY_CONTRACT}}

## 精确校验错误

{{VALIDATION_ERROR}}

## 校验失败的 JSON

{{INVALID_MAP}}

## 论文来源

{{MARKED_MARKDOWN}}`;

  function contractText() {
    return `${JSON.stringify({
      capabilityId: "cmath-gamma.math-map-semantics/v3",
      syncIdentity: CAPABILITY_SYNC_IDENTITY,
      output: {
        topLevelFields: ["entries", "inferences", "negationPairs", "b0ClaimEntryIds"],
        authority: "deriveMathState",
      },
    }, null, 2)}\n\n${CONTRACT_MARKDOWN}`;
  }

  function renderGeneratePrompt(markedMarkdown) {
    return GENERATE_TEMPLATE
      .replace("{{OUTPUT_LANGUAGE_RULE}}", OUTPUT_LANGUAGE_RULE)
      .replace("{{CAPABILITY_CONTRACT}}", contractText())
      .replace("{{MARKED_MARKDOWN}}", markedMarkdown);
  }

  function renderRepairPrompt(markedMarkdown, invalidMap, validationError) {
    return REPAIR_TEMPLATE
      .replace("{{OUTPUT_LANGUAGE_RULE}}", OUTPUT_LANGUAGE_RULE)
      .replace("{{CAPABILITY_CONTRACT}}", contractText())
      .replace("{{VALIDATION_ERROR}}", String(validationError))
      .replace("{{INVALID_MAP}}", JSON.stringify(invalidMap, null, 2))
      .replace("{{MARKED_MARKDOWN}}", markedMarkdown);
  }

  function parseMap(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("模型没有返回 JSON 内容");
    const text = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    const map = JSON.parse(text);
    if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("模型输出必须是一个 JSON 对象");
    return map;
  }

  function estimateTokens(text) {
    const bytes = typeof TextEncoder === "function"
      ? new TextEncoder().encode(text).byteLength
      : (typeof Buffer !== "undefined" ? Buffer.byteLength(text, "utf8") : text.length * 3);
    return Math.ceil(bytes / 2);
  }

  function validateMap(map) {
    if (typeof semantics?.deriveMathState !== "function") throw new Error("标准数学地图 v3 校验能力没有加载");
    semantics.deriveMathState(map);
    return map;
  }

  async function run({ markedMarkdown, chatImpl, endpoint, apiKey, model, providerLabel, fetchImpl, reasoningEffort, signal, onStage } = {}) {
    if (typeof markedMarkdown !== "string" || !markedMarkdown.trim()) throw new TypeError("MinerU marked Markdown 不能为空");
    if (!modelTransport?.createModelTransport) throw new Error("模型传输模块没有加载");
    const generatePrompt = renderGeneratePrompt(markedMarkdown);
    const inputTokens = estimateTokens(generatePrompt);
    if (inputTokens > INPUT_TOKEN_LIMIT) {
      const error = new Error(`论文输入约 ${inputTokens.toLocaleString()} tokens，超过 ${INPUT_TOKEN_LIMIT.toLocaleString()} token 上限`);
      error.code = "CANONICAL_V5_INPUT_TOO_LONG";
      throw error;
    }
    const transport = modelTransport.createModelTransport({ chatImpl, endpoint, apiKey, model, providerLabel, fetchImpl, signal });
    const calls = [];
    let invalidMap = null;
    let invalidArtifact = null;
    let validationError = null;

    const complete = async (stage, prompt) => {
      const startedAt = Date.now();
      onStage?.(stage, { phase: "start" });
      const transportStage = stage === "generate" ? "assemble" : stage;
      const response = await transport.complete({
        stage: transportStage,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 100_000,
        responseFormat: { type: "json_object" },
        reasoningEffort,
        signal,
      });
      calls.push({ stage, transportStage, durationMs: Date.now() - startedAt });
      return response.content;
    };

    const generatedContent = await complete("generate", generatePrompt);
    invalidArtifact = generatedContent;
    try {
      invalidMap = parseMap(generatedContent);
      invalidArtifact = invalidMap;
      validateMap(invalidMap);
      onStage?.("validate", { phase: "complete", entries: invalidMap.entries.length, inferences: invalidMap.inferences.length });
      return {
        map: invalidMap,
        report: { status: "completed", inputTokens, generationAttempts: 1, repairAttempts: 0, calls },
      };
    } catch (error) {
      validationError = error;
      onStage?.("validate", { phase: "fail", message: error.message });
    }

    for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
      const prompt = renderRepairPrompt(markedMarkdown, invalidArtifact, validationError.message);
      const repairedContent = await complete("repair", prompt);
      invalidArtifact = repairedContent;
      try {
        invalidMap = parseMap(repairedContent);
        invalidArtifact = invalidMap;
        validateMap(invalidMap);
        onStage?.("validate", { phase: "complete", entries: invalidMap.entries.length, inferences: invalidMap.inferences.length });
        return {
          map: invalidMap,
          report: { status: "completed", inputTokens, generationAttempts: 1, repairAttempts: attempt, calls },
        };
      } catch (error) {
        validationError = error;
        onStage?.("validate", { phase: "fail", message: error.message });
      }
    }
    validationError.code ??= "CANONICAL_V5_MAP_INVALID_AFTER_REPAIR";
    throw validationError;
  }

  return Object.freeze({
    PROMPT_VERSION,
    OUTPUT_LANGUAGE_RULE,
    INPUT_TOKEN_LIMIT,
    MAX_REPAIR_ATTEMPTS,
    RESULT_SCHEMA,
    FROZEN_WORKFLOW,
    CONTRACT_MARKDOWN,
    renderGeneratePrompt,
    renderRepairPrompt,
    parseMap,
    validateMap,
    run,
  });
});
