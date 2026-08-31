/**
 * Frozen canonical Paper-to-Map V5.2 workflow.
 *
 * V5.2 keeps the accepted generation contract and always spends its second
 * and final model call on source-grounded atomic audit and repair.
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
  const validation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("../core/validation.js") : null);
  const semantics = loadCanonicalSemantics();
  const api = factory(transport, semantics, validation);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathCanonicalPaperImportV5 = api;
})(typeof window !== "undefined" ? window : globalThis, function createCanonicalPaperImportV5(modelTransport, semantics, validation) {
  "use strict";

  const PROMPT_VERSION = "canonical-map-v5.2-zh-default-atomic-repair-v28-disposition-receipt";
  const INPUT_TOKEN_LIMIT = 100_000;
  const MAX_REPAIR_ATTEMPTS = 1;
  const RESULT_SCHEMA = "cmath.paper-to-map-result/v1";
  const CAPABILITY_SYNC_IDENTITY = "sha256:3ad779db70b37cdfb7be9e9435e6de54d727482b273fc3e38c5295895a6d3198";
  const FROZEN_WORKFLOW = Object.freeze({
    label: "canonical-paper-to-map-v5.2-default-atomic-repair",
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
- 数学表达式必须使用成对的数学定界符；LaTeX 命令、上下标和公式不得出现在数学定界符之外。
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

在一次调用中审查并精确修复当前 Canonical Math Map。审查能力合同、来源忠实性、数学语义和 LaTeX 格式；只输出补丁，不输出完整地图。不得参考 Benchmark Gold、评分结果、已知测试错误或外部答案。

## 审查顺序

1. **能力合同。** 根据初稿校验结果修复确定性合同错误；初稿合法时仍继续内容审查。
2. **来源内容。** 以论文来源为唯一内容证据，逐个检查全部对象：
   - 先检查 Entry。保留来源中的对象、前提、量词、公式、参数、索引、常数、方向、范围、例外、认识论类型和结论强度。
   - 再检查 Inference。\`premises\`、\`conclusion\` 和 \`argument\` 必须忠实表达来源声称的同一步直接论证；\`premises\` 必须覆盖该论证实际使用的直接依赖。
   - proof 记录来源声称的论证关系，不独立认证论证是否充分或严密。来源明确用一段简略、直观、跨节或未编号的论述建立某个精确结论时，应保留或修复对应 Inference；来源明确只论证一个方向、特例或较弱结论时，不得把它扩展为完整定理。
   - B0 只收录来源直接调用但不在当前范围内证明的 Claim。NegationPair 只有在来源分别明确陈述两个互为否定的精确 Claim 时才能存在。
3. **主证明链。** 完整检查而非抽查：先核对链中每个 Entry 的完整陈述，再按来源顺序核对每个 Inference 及其直接依赖。缺少衔接时只可使用来源明确给出的最小步骤；不得补写来源没有声称的证明桥梁。
4. **LaTeX 格式。** 修复初稿校验列出的确定性格式问题：数学定界符必须成对，LaTeX 命令、上下标和公式不得散落在数学定界符之外。只在来源能确认原记号时修改；先完成内容修复，不能让格式修改挤占内容修复。

## 修复原则

- 默认保持原内容。不得润色、重排、统一风格、重写全图或顺手修改无关内容。
- ${OUTPUT_LANGUAGE_RULE}
- \`derivedState.claimStates\` 与 \`claimDerivations\` 是程序计算结果，不是来源证据或修复目标。不得为了改变 \`open\`、\`established\` 或 \`refuted\` 状态而修改对象。
- 每个非合同 finding 必须引用论文中带 \`[L000001]\` 编号的连续 \`sourceSpan\`，最多 120 行，并覆盖支持诊断和修改的完整上下文。
- 每个 finding 及其 operations 是一个最小原子修复组。只修改该 finding 的 \`targetIds\`；同一对象的全部问题合并在一个 finding，必要的直接依赖修改放在同一组。
- 修正已有 Entry 或 Inference 只能使用 \`replaceFields\`，逐项给出直接字段的精确 \`before\` 和 \`after\`。新增使用 \`add\`，删除来源不支持且无法通过修改恢复的对象使用 \`remove\`。
- 来源证据不足、存在多种解释或无法安全修复时，不输出该 finding 或 operation，保留原内容。

## 逐对象处置回执

对当前地图的每个 Entry 和 Inference 恰好输出一条 reviewedObjects 记录。只有核对过完整来源陈述、直接依赖和论证关系后才能处置：确认无误时 disposition 为 clean 且 findingId 为 null；需要修改时 disposition 为 finding，findingId 必须引用本响应中实际覆盖该对象的 finding。不得把被 finding 点名的对象标为 clean，也不得只机械抄录 ID。

## 输出格式

只输出一个 JSON 对象，不使用 Markdown 或解释文字：

{
  "schema": "cmath.audited-patch-repair/v0.3",
  "reviewedObjects": [{ "objectKind": "entry | inference", "targetId": "对象 ID", "disposition": "clean | finding", "findingId": null }],
  "findings": [{
    "id": "F1",
    "category": "contract | fabrication | distortion | missing-content | entry-role | inference-semantics | b0-boundary | negation-semantics | main-proof-chain | format",
    "objectKind": "entry | inference | b0 | negationPair | map",
    "targetIds": ["被操作的对象 ID"],
    "sourceRefs": ["页码或章节"],
    "sourceSpan": { "startLine": 1, "endLine": 1 },
    "diagnosis": "当前对象的具体问题",
    "repairRequirement": "修改后必须满足的来源约束"
  }],
  "operations": [{
    "findingId": "F1",
    "op": "replaceFields",
    "objectKind": "entry | inference",
    "targetId": "对象 ID",
    "changes": [{ "field": "直接字段名", "before": "当前精确值", "after": "修改后的精确值" }]
  }]
}

新增 Entry 或 Inference 时使用 \`op: "add"\` 并提供与 \`targetId\` 一致的完整 \`object\`；删除时使用 \`op: "remove"\`。对 B0 使用 \`objectKind: "b0"\`、\`op: "add | remove"\` 和 \`targetId\`。对 NegationPair 使用 \`objectKind: "negationPair"\`、\`op: "add | remove"\` 和含两个 Claim ID 的 \`claimEntryIds\`。涉及多种对象类型时，finding 使用 \`objectKind: "map"\`。仅 \`contract\` finding 可以省略 \`sourceSpan\`。

## 能力合同

{{CAPABILITY_CONTRACT}}

## 初稿能力包校验结果

{{INITIAL_VALIDATION}}

## 当前完整地图

{{CANDIDATE_MAP}}

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

  function numberSourceLines(markedMarkdown) {
    return markedMarkdown.split(/\r?\n/u)
      .map((line, index) => `[L${String(index + 1).padStart(6, "0")}] ${line}`)
      .join("\n");
  }

  function renderRepairPrompt(markedMarkdown, candidateMap, initialValidation) {
    return REPAIR_TEMPLATE
      .replace("{{CAPABILITY_CONTRACT}}", contractText())
      .replace("{{INITIAL_VALIDATION}}", JSON.stringify(initialValidation, null, 2))
      .replace("{{CANDIDATE_MAP}}", JSON.stringify(candidateMap, null, 2))
      .replace("{{MARKED_MARKDOWN}}", numberSourceLines(markedMarkdown));
  }

  function parseMap(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("模型没有返回 JSON 内容");
    const text = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    let map;
    try {
      map = JSON.parse(text);
    } catch (originalError) {
      const candidates = [];
      for (let start = content.indexOf("{"); start >= 0;) {
        let depth = 0, quoted = false, escaped = false, end = -1;
        for (let index = start; index < content.length; index += 1) {
          const char = content[index];
          if (quoted) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === '"') quoted = false;
            continue;
          }
          if (char === '"') quoted = true;
          else if (char === "{") depth += 1;
          else if (char === "}" && --depth === 0) {
            end = index;
            try { candidates.push(JSON.parse(content.slice(start, index + 1))); } catch {}
            break;
          }
        }
        start = content.indexOf("{", end >= 0 ? end + 1 : start + 1);
      }
      if (candidates.length !== 1) throw originalError;
      [map] = candidates;
    }
    if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("模型输出必须是一个 JSON 对象");
    return map;
  }

  function isAddressableMap(map) {
    if (!map || typeof map !== "object" || Array.isArray(map)
      || !["entries", "inferences", "negationPairs", "b0ClaimEntryIds"].every((field) => Array.isArray(map[field]))) return false;
    const ids = [...map.entries, ...map.inferences].map((item) => item?.id);
    return ids.every((id) => typeof id === "string" && id.trim()) && new Set(ids).size === ids.length;
  }

  function inspectMathFormat(map) {
    const issues = [];
    const inspect = (objectKind, object, field) => {
      const value = object?.[field];
      if (typeof value !== "string" || !value.trim()) return;
      if (!validation?.hasBalancedMathDelimiters?.(value)) {
        issues.push({ objectKind, targetId: object.id, field, code: "unclosed-math-delimiter" });
      }
      let outside = value
        .replace(/\$\$[\s\S]*?\$\$/gu, " ")
        .replace(/\$[^$]*\$/gu, " ")
        .replace(/\\\[[\s\S]*?\\\]/gu, " ")
        .replace(/\\\([\s\S]*?\\\)/gu, " ");
      if (/\\[A-Za-z]+|[_^](?:\{|[A-Za-z0-9\u0370-\u03ff])/u.test(outside)) {
        issues.push({ objectKind, targetId: object.id, field, code: "undelimited-latex" });
      }
    };
    for (const entry of map?.entries ?? []) for (const field of ["title", "statement"]) inspect("entry", entry, field);
    for (const inference of map?.inferences ?? []) inspect("inference", inference, "argument");
    return issues;
  }

  function validationSnapshot(map) {
    const formatIssues = inspectMathFormat(map);
    try {
      return { valid: true, derivedState: semantics.deriveMathState(map), formatIssues, error: null };
    } catch (error) {
      return { valid: false, derivedState: null, formatIssues, error: error.message };
    }
  }

  function formatIssueKey(issue) {
    return `${issue.objectKind}:${issue.targetId}:${issue.field}:${issue.code}`;
  }

  function deepEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left), rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
  }

  function operationKey(operation) {
    if (!["entry", "inference", "b0", "negationPair"].includes(operation?.objectKind)
      || !["add", "replaceFields", "remove"].includes(operation?.op)) throw new Error("不支持的原子操作");
    if (operation.objectKind === "negationPair") {
      if (!Array.isArray(operation.claimEntryIds) || operation.claimEntryIds.length !== 2) throw new Error("NegationPair 操作必须有两个 Claim ID");
      return `negationPair:${[...operation.claimEntryIds].sort().join("|")}`;
    }
    if (typeof operation.targetId !== "string" || !operation.targetId.trim()) throw new Error("原子操作缺少 targetId");
    return `${operation.objectKind}:${operation.targetId}`;
  }

  function samePair(left, right) {
    return Array.isArray(left?.claimEntryIds) && left.claimEntryIds.length === 2
      && [...left.claimEntryIds].sort().join("|") === [...right].sort().join("|");
  }

  function applyOperations(map, operations) {
    const result = structuredClone(map);
    for (const operation of operations) {
      const key = operationKey(operation);
      if (operation.objectKind === "entry" || operation.objectKind === "inference") {
        const collection = operation.objectKind === "entry" ? result.entries : result.inferences;
        const index = collection.findIndex((item) => item?.id === operation.targetId);
        if (operation.op === "add") {
          if (index >= 0 || operation.object?.id !== operation.targetId) throw new Error(`${key} 无法新增`);
          collection.push(structuredClone(operation.object));
        } else if (operation.op === "remove") {
          if (index < 0) throw new Error(`${key} 不存在`);
          collection.splice(index, 1);
        } else {
          if (index < 0 || !Array.isArray(operation.changes) || !operation.changes.length) throw new Error(`${key} 无法修改`);
          const seen = new Set();
          for (const change of operation.changes) {
            if (typeof change?.field !== "string" || change.field === "id" || /[.[\]]/u.test(change.field)
              || seen.has(change.field) || !Object.hasOwn(collection[index], change.field)
              || !Object.hasOwn(change, "before") || !Object.hasOwn(change, "after")
              || !deepEqual(collection[index][change.field], change.before)) throw new Error(`${key} 的 before 不匹配`);
            seen.add(change.field);
          }
          for (const change of operation.changes) collection[index][change.field] = structuredClone(change.after);
        }
      } else if (operation.objectKind === "b0") {
        if (operation.op === "replaceFields") throw new Error("B0 不支持字段修改");
        const index = result.b0ClaimEntryIds.indexOf(operation.targetId);
        if (operation.op === "add") {
          if (index >= 0) throw new Error(`${key} 已存在`);
          result.b0ClaimEntryIds.push(operation.targetId);
        } else {
          if (index < 0) throw new Error(`${key} 不存在`);
          result.b0ClaimEntryIds.splice(index, 1);
        }
      } else {
        if (operation.op === "replaceFields") throw new Error("NegationPair 不支持字段修改");
        const index = result.negationPairs.findIndex((pair) => samePair(pair, operation.claimEntryIds));
        if (operation.op === "add") {
          if (index >= 0) throw new Error(`${key} 已存在`);
          result.negationPairs.push({ claimEntryIds: [...operation.claimEntryIds] });
        } else {
          if (index < 0) throw new Error(`${key} 不存在`);
          result.negationPairs.splice(index, 1);
        }
      }
    }
    return result;
  }

  const FINDING_CATEGORIES = new Set([
    "contract", "fabrication", "distortion", "missing-content", "entry-role",
    "inference-semantics", "b0-boundary", "negation-semantics", "main-proof-chain", "format",
  ]);

  function validateReceipt(bundle, map) {
    if (!Array.isArray(bundle.reviewedObjects)) throw new Error("审修响应缺少 reviewedObjects");
    const expected = new Set([
      ...map.entries.map(({ id }) => `entry:${id}`),
      ...map.inferences.map(({ id }) => `inference:${id}`),
    ]);
    const findings = new Map((bundle.findings ?? []).map((finding) => [finding.id, finding]));
    const seen = new Set();
    for (const record of bundle.reviewedObjects) {
      const key = `${record?.objectKind}:${record?.targetId}`;
      if (!expected.has(key) || seen.has(key)) throw new Error(`无效或重复的 reviewedObjects：${key}`);
      seen.add(key);
      const targeting = [...findings.values()].filter((finding) => finding?.targetIds?.includes(record.targetId));
      if (record.disposition === "clean") {
        if (record.findingId !== null || targeting.length) throw new Error(`${key} 的 clean 回执与 finding 冲突`);
      } else if (record.disposition === "finding") {
        const finding = findings.get(record.findingId);
        if (!finding?.targetIds?.includes(record.targetId)) throw new Error(`${key} 没有连接到对应 finding`);
      } else throw new Error(`${key} 的 disposition 无效`);
    }
    if (seen.size !== expected.size) throw new Error(`reviewedObjects 只覆盖 ${seen.size}/${expected.size} 个对象`);
    return { objectCount: seen.size, cleanCount: bundle.reviewedObjects.filter(({ disposition }) => disposition === "clean").length };
  }

  function validateFindingGroup(finding, operations, map, markedMarkdown) {
    if (!finding || typeof finding.id !== "string" || !finding.id.trim()) throw new Error("finding 缺少 ID");
    if (!FINDING_CATEGORIES.has(finding.category)) throw new Error(`finding ${finding.id} 的 category 无效`);
    if (!["entry", "inference", "b0", "negationPair", "map"].includes(finding.objectKind)) throw new Error(`finding ${finding.id} 的 objectKind 无效`);
    if (!Array.isArray(finding.targetIds) || finding.targetIds.some((id) => typeof id !== "string" || !id.trim())) throw new Error(`finding ${finding.id} 的 targetIds 无效`);
    if (!Array.isArray(finding.sourceRefs) || (finding.category !== "contract" && finding.sourceRefs.length === 0)) throw new Error(`finding ${finding.id} 缺少来源引用`);
    if (finding.category !== "contract" || finding.sourceSpan !== undefined) {
      const { startLine, endLine } = finding.sourceSpan ?? {};
      const lineCount = markedMarkdown.split(/\r?\n/u).length;
      if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine
        || endLine > lineCount || endLine - startLine + 1 > 120) throw new Error(`finding ${finding.id} 的 sourceSpan 无效`);
    }
    if (typeof finding.diagnosis !== "string" || !finding.diagnosis.trim()
      || typeof finding.repairRequirement !== "string" || !finding.repairRequirement.trim()) throw new Error(`finding ${finding.id} 的诊断不完整`);
    if (!operations.length) throw new Error(`finding ${finding.id} 没有操作`);
    const keys = new Set();
    for (const operation of operations) {
      if (operation.findingId !== finding.id) throw new Error(`finding ${finding.id} 的操作引用错误`);
      const key = operationKey(operation);
      const target = operation.objectKind === "negationPair" ? operation.claimEntryIds.join("|") : operation.targetId;
      if (finding.objectKind !== "map" && finding.objectKind !== operation.objectKind) throw new Error(`finding ${finding.id} 的操作越界`);
      if (!finding.targetIds.includes(target) && !finding.targetIds.includes(operation.targetId)) throw new Error(`finding ${finding.id} 的目标越界`);
      if (keys.has(key)) throw new Error(`finding ${finding.id} 重复修改 ${key}`);
      keys.add(key);
    }
    const candidate = applyOperations(map, operations);
    const before = new Set(inspectMathFormat(map).map(formatIssueKey));
    const introduced = inspectMathFormat(candidate).find((issue) => !before.has(formatIssueKey(issue)));
    if (introduced) throw new Error(`finding ${finding.id} 引入新的格式问题`);
    return { finding, operations, keys: [...keys] };
  }

  function applyAuditBundle(bundle, map, markedMarkdown) {
    if (bundle?.schema !== "cmath.audited-patch-repair/v0.3"
      || !Array.isArray(bundle.findings) || !Array.isArray(bundle.operations)) throw new Error("审修响应不符合 audited patch schema");
    const receipt = validateReceipt(bundle, map);
    const idCounts = new Map();
    for (const finding of bundle.findings) idCounts.set(finding?.id, (idCounts.get(finding?.id) ?? 0) + 1);
    const rejectedGroups = [];
    const groups = [];
    for (const finding of bundle.findings) {
      try {
        if (idCounts.get(finding?.id) !== 1) throw new Error(`重复的 finding ID：${finding?.id}`);
        groups.push(validateFindingGroup(
          finding,
          bundle.operations.filter((operation) => operation?.findingId === finding.id),
          map,
          markedMarkdown,
        ));
      } catch (error) { rejectedGroups.push({ findingId: finding?.id ?? null, error: error.message }); }
    }
    for (const operation of bundle.operations) {
      if (!bundle.findings.some((finding) => finding?.id === operation?.findingId)) {
        rejectedGroups.push({ findingId: operation?.findingId ?? null, error: "操作引用未知 finding" });
      }
    }
    const owners = new Map();
    for (const group of groups) for (const key of group.keys) owners.set(key, [...(owners.get(key) ?? []), group.finding.id]);
    const conflicts = new Set([...owners.values()].filter((ids) => ids.length > 1).flat());
    for (const findingId of conflicts) rejectedGroups.push({ findingId, error: "多个 finding 修改同一对象" });
    const accepted = groups.filter((group) => !conflicts.has(group.finding.id));
    return {
      map: applyOperations(map, accepted.flatMap((group) => group.operations)),
      receipt,
      bundle: {
        schema: bundle.schema,
        findings: accepted.map((group) => group.finding),
        operations: accepted.flatMap((group) => group.operations),
      },
      rejectedGroups,
    };
  }

  function renderRecoveryPrompt(markedMarkdown, invalidArtifact, parseError) {
    return renderRepairPrompt(markedMarkdown, { invalidArtifact }, { valid: false, error: parseError })
      .replace(
        "在一次调用中审查并精确修复当前 Canonical Math Map。审查能力合同、来源忠实性、数学语义和 LaTeX 格式；只输出补丁，不输出完整地图。",
        "这是第二次也是最后一次调用。先把失败输出精确恢复为 recoveredMap，再以 recoveredMap 为基线完成能力合同、来源忠实性、数学语义和 LaTeX 的原子修复。只在 recoveredMap 字段输出恢复地图，其余内容只输出补丁。",
      )
      .replace("## 审查顺序", "## 恢复阶段\n\n只修复 JSON 外壳，使 recoveredMap 可解析且对象可寻址；不得在恢复阶段润色、扩写、删减或重排数学内容。随后再执行下列审查。\n\n## 审查顺序")
      .replace('  "reviewedObjects":', '  "recoveredMap": { "entries": [], "inferences": [], "negationPairs": [], "b0ClaimEntryIds": [] },\n  "reviewedObjects":');
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
    if (!validation?.hasBalancedMathDelimiters) throw new Error("数学格式校验模块没有加载");
    const generatePrompt = renderGeneratePrompt(markedMarkdown);
    const inputTokens = estimateTokens(generatePrompt);
    if (inputTokens > INPUT_TOKEN_LIMIT) {
      const error = new Error(`论文输入约 ${inputTokens.toLocaleString()} tokens，超过 ${INPUT_TOKEN_LIMIT.toLocaleString()} token 上限`);
      error.code = "CANONICAL_V5_INPUT_TOO_LONG";
      throw error;
    }
    const transport = modelTransport.createModelTransport({ chatImpl, endpoint, apiKey, model, providerLabel, fetchImpl, signal });
    const calls = [];
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
    let map;
    let routeError = null;
    try {
      map = parseMap(generatedContent);
      if (!isAddressableMap(map)) throw new Error("生成地图不能进行对象级原子修复");
    } catch (error) {
      routeError = error;
    }

    let repair;
    if (!routeError) {
      const initialValidation = validationSnapshot(map);
      const repairedContent = await complete("audited-patch-repair", renderRepairPrompt(markedMarkdown, map, initialValidation));
      const audited = applyAuditBundle(parseMap(repairedContent), map, markedMarkdown);
      const finalValidation = validationSnapshot(audited.map);
      const beforeFormat = new Set(initialValidation.formatIssues.map(formatIssueKey));
      const introducedFormat = finalValidation.formatIssues.find((issue) => !beforeFormat.has(formatIssueKey(issue)));
      if (!finalValidation.valid || introducedFormat) {
        if (!initialValidation.valid) throw new Error(`原子修复后地图仍不合法：${finalValidation.error ?? formatIssueKey(introducedFormat)}`);
        repair = {
          selection: "original",
          reason: finalValidation.valid ? "patch-format-regression" : "patch-contract-invalid",
          initialValidation,
          finalValidation,
          bundle: audited.bundle,
          rejectedGroups: audited.rejectedGroups,
          receipt: audited.receipt,
        };
      } else {
        map = audited.map;
        repair = {
          selection: audited.bundle.operations.length ? "patched" : "original",
          reason: audited.bundle.operations.length
            ? (audited.rejectedGroups.length ? "partial-patch-contract-valid" : "patch-contract-valid")
            : (audited.rejectedGroups.length ? "all-finding-groups-rejected" : "audit-clean"),
          initialValidation,
          finalValidation,
          bundle: audited.bundle,
          rejectedGroups: audited.rejectedGroups,
          receipt: audited.receipt,
        };
      }
    } else {
      const recoveredContent = await complete(
        "recovery-and-audited-patch",
        renderRecoveryPrompt(markedMarkdown, generatedContent, routeError.message),
      );
      const envelope = parseMap(recoveredContent);
      map = envelope.recoveredMap;
      if (!isAddressableMap(map)) throw new Error("recoveredMap 不能进行对象级原子修复");
      const initialValidation = validationSnapshot(map);
      const audited = applyAuditBundle(envelope, map, markedMarkdown);
      const finalValidation = validationSnapshot(audited.map);
      const beforeFormat = new Set(initialValidation.formatIssues.map(formatIssueKey));
      const introducedFormat = finalValidation.formatIssues.find((issue) => !beforeFormat.has(formatIssueKey(issue)));
      if (!finalValidation.valid || introducedFormat) throw new Error(`恢复与原子修复后地图仍不合法：${finalValidation.error ?? formatIssueKey(introducedFormat)}`);
      map = audited.map;
      repair = {
        selection: `recovered-${audited.bundle.operations.length ? "patched" : "original"}`,
        reason: routeError.message,
        initialValidation,
        finalValidation,
        bundle: audited.bundle,
        rejectedGroups: audited.rejectedGroups,
        receipt: audited.receipt,
      };
    }

    validateMap(map);
    if (calls.length !== 2) throw new Error(`Canonical V5.2 必须恰好调用模型两次，实际 ${calls.length} 次`);
    onStage?.("validate", { phase: "complete", entries: map.entries.length, inferences: map.inferences.length });
    return {
      map,
      report: { status: "completed", inputTokens, generationAttempts: 1, repairAttempts: 1, repair, calls },
    };
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
    renderRecoveryPrompt,
    parseMap,
    isAddressableMap,
    inspectMathFormat,
    validateMap,
    run,
  });
});
