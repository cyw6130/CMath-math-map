/**
 * Inference lifecycle — assembles Inference, B0, and the main target behind
 * the canonical Inference Module seam.
 *
 * UMD/CommonJS is intentional: the static site can load this file as a plain
 * script and Node consumers can require it directly.
 */
(function publishCMathPaperInferenceLifecycle(root, factory) {
  "use strict";
  const semantics = root?.GammaMathMapSemantics
    ?? (typeof require === "function" ? require("../../../math-map-semantics.js") : null);
  const validation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("../core/validation.js") : null);
  const projectViewCore = root?.CMathPaperProjectView
    ?? (typeof require === "function" ? require("../core/project-view.js") : null);
  const modelTransport = root?.CMathPaperModelTransport
    ?? (typeof require === "function" ? require("../core/model-transport.js") : null);
  const strategyIndex = root?.CMathPaperImportStrategyIndex
    ?? (typeof require === "function" ? require("./strategies/index.js") : null);
  const api = factory(root, semantics, validation, projectViewCore, modelTransport, strategyIndex);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperInferenceLifecycle = api;
})(typeof window !== "undefined" ? window : globalThis, function createCMathPaperInferenceLifecycle(
  root,
  semantics,
  validation,
  projectViewCore,
  modelTransport,
  strategyIndex,
) {
  "use strict";

  if (!semantics
    || !Array.isArray(semantics.ENTRY_CLASSES)
    || !Array.isArray(semantics.FACT_KINDS)
    || !Array.isArray(semantics.CLAIM_KINDS)
    || !Array.isArray(semantics.OPERATION_KINDS)
    || typeof semantics.validateEntry !== "function"
    || typeof semantics.validateInference !== "function"
    || typeof semantics.computeClaimClosure !== "function") {
    throw new Error("CMath Inference Lifecycle 缺少数学地图语义能力");
  }
  if (!validation
    || typeof validation.hasBalancedMathDelimiters !== "function"
    || typeof validation.validateMathDelimiters !== "function") {
    throw new Error("CMath Inference Lifecycle 缺少核心校验能力");
  }
  if (!projectViewCore
    || typeof projectViewCore.normalizeRawProjectView !== "function"
    || typeof projectViewCore.collectRawProjectViewIssues !== "function"
    || typeof projectViewCore.sanitizeRawProjectView !== "function") {
    throw new Error("CMath Inference Lifecycle 缺少 Project View Core 能力");
  }
  if (!modelTransport
    || typeof modelTransport.createModelTransport !== "function"
    || typeof modelTransport.isModelTransportError !== "function"
    || !modelTransport.ERROR_CODES
    || typeof modelTransport.ModelTransportError !== "function") {
    throw new Error("CMath Inference Lifecycle 缺少模型传输能力");
  }

  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const SEMANTIC_MODEL = "cmath.fact-claim-operation/v0.1";
  const CHANNEL_SCHEMA = "cmath-gamma.project-channel/v0.1";
  const ENTRY_CLASSES = new Set(semantics.ENTRY_CLASSES);
  const FACT_KINDS = new Set(semantics.FACT_KINDS);
  const CLAIM_KINDS = new Set(semantics.CLAIM_KINDS);
  const OPERATION_KINDS = new Set(semantics.OPERATION_KINDS);
  const hasBalancedMathDelimiters = validation.hasBalancedMathDelimiters;
  const validateMathDelimiters = validation.validateMathDelimiters;
  const normalizeRawProjectView = projectViewCore.normalizeRawProjectView;
  const collectRawProjectViewIssues = projectViewCore.collectRawProjectViewIssues;
  const sanitizeRawProjectView = projectViewCore.sanitizeRawProjectView;

  function nonEmpty(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
  }

  function inferenceStrategySection(version) {
    const section = strategyIndex?.sectionFor?.(version);
    if (typeof section === "string" && section) return section;
    if (["v3.43", "v3.44", "v3.45"].includes(version)) {
      throw new Error(`CMath Inference 策略 ${version} 没有加载`);
    }
    return "";
  }

  const ENTRY_LABELS = Object.freeze({
    definition: "定义",
    algorithm: "算法",
    calculation: "计算",
    lemma: "引理",
    proposition: "命题",
    theorem: "定理",
  });
  const INFERENCE_LABELS = Object.freeze({
    proof: "证明",
    organization: "组织",
  });
  const CANONICAL_LABEL_PATTERN = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(\d+)\s*·\s*(.+)$/u;
  const LEGACY_LABEL_PATTERN = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*·\s*(.+?)\s*·\s*(\d+)$/u;
  const SIMPLE_LABEL_PATTERN = /^(定义|算法|计算|引理|命题|定理|组织|证明)\s*(\d+)$/u;

  function resolveDisplayLabel(rawLabel, kindLabel, counter, shortTitle) {
    const text = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (text) {
      let match = text.match(CANONICAL_LABEL_PATTERN);
      if (match) return `${match[1]} · ${Number(match[2])} · ${match[3].trim()}`;
      match = text.match(LEGACY_LABEL_PATTERN);
      if (match) return `${match[1]} · ${Number(match[3])} · ${match[2].trim()}`;
      match = text.match(SIMPLE_LABEL_PATTERN);
      if (match) return `${match[1]} · ${Number(match[2])} · ${shortTitle}`;
    }
    return `${kindLabel} · ${counter} · ${shortTitle}`;
  }

  function semanticRulesText() {
    return `Gamma 语义与提取规则：\n`
      + `- Fact: entryClass=fact，factKind 只能是 definition|algorithm|calculation。definition、algorithm、calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- Claim: entryClass=claim，claimKind 只能是 lemma|proposition|theorem。论文明确提出但未证明的数学陈述仍是正式 Claim，保留在地图中并由闭包派生为 open；不要创建 conjecture、candidate 或 draft 类型。\n`
      + `- Inference: operationKind 只能是 organization（Fact 到 Fact）或 proof（若干 Fact/Claim 到 Claim）。\n`
      + `- 【规则 1】proof 的结论（conclusion）只能是 entryClass=claim 的 Entry，绝不能以 Fact 为结论。\n`
      + `- 【规则 2】definition/algorithm/calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- 【规则 3】若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim（lemma|proposition|theorem），并将 proof 的 conclusion 指向该 Claim。\n`
      + `- 【规则 4】若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系，不要生成 Inference。\n`
      + `- 【规则 5】严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference；只有论文中实际存在的证明或组织关系才输出 Inference。\n`;
  }

  // 装配：基于全量 Entry 目录与全文，只生成 Inference、B0 与主目标（输出很小）。
  function assemblyPrompt({ fileName, pageCount, text, catalog, workflowVersion = "v1", paperGuide = null, externalBoundaryInventory = null }) {
    const isV43Prompt = workflowVersion === "v3.43";
    const isV44Prompt = workflowVersion === "v3.44";
    const isV45Prompt = workflowVersion === "v3.45";
    const guideSection = paperGuide && ["v3.43", "v3.44", "v3.45"].includes(workflowVersion)
      ? `\n【Paper Guide 主线约束】下面的 Paper Guide 是本篇论文的叙事导航，不是额外的数学来源。main_target 是论文最终要解释/证明的核心结果；key_result 是为它服务的关键中间结果。\nPaper Guide：\n${JSON.stringify(paperGuide)}\n`
      : "";
    const boundarySection = externalBoundaryInventory && ["v3.43", "v3.44", "v3.45"].includes(workflowVersion)
      ? `\n【外部边界候选清单】这是前置专门通道从全文识别的 B0 候选，必须逐项复核而非机械照抄。active_premise 默认进入 b0；definitional_foundation 只有被本文采用的定义直接依赖时进入 b0；context_only 绝不能进入 b0。\n${JSON.stringify(externalBoundaryInventory)}\n`
      : "";
    const v43Section = isV43Prompt ? inferenceStrategySection("v3.43") : "";
    const v44Section = isV44Prompt ? inferenceStrategySection("v3.44") : "";
    const v45Section = isV45Prompt ? inferenceStrategySection("v3.45") : "";
    const mainlineSection = (isV43Prompt || isV44Prompt || isV45Prompt)
      ? `- 【主线推导与分支覆盖规划】装配前须在内部结合 Paper Guide 的 main_target 与 key_result 线索以及 Canonical Entry 索引，在内部建立叙事证明链的覆盖规划；输出论文真实支持的所有核心 proof 与 organization 推理，完整表达从基础/外部 B0 经各关键中间结果到主目标的数学路线。必须覆盖论文中具有实质意义的各个独立证明分支与结构归属，绝不能仅输出少量局部引理或局部推导；严禁输出内部规划为额外字段、严禁臆造不存在的证明。\n`
      : "";
    return `你是数学论文结构化编辑器。下面给出一篇论文的 Entry 目录（已提取的数学对象）与全文文本。请通读全文，只输出推理关系与地图元信息，紧凑输出一个 JSON 对象，不要 Markdown，不要输出 Entry 本体。\n\n`
      + `【语言要求】projectTitle 与 argument 一律使用简体中文撰写；数学符号与公式保留 $...$ / $$...$$，必须成对闭合。\n\n`
      + semanticRulesText()
      + `- 【证明依赖】论文中实际给出证明的 Claim 才输出 proof。premises 只列论文证明实际使用且已在 Entry 目录中的直接依赖 id；自足证明允许 premises=[]，但 argument 必须记录完整数学论证；proof 的 conclusion 严禁同时出现在自己的 premises 中。互推 proof 可表达等价或相互蕴含，但如果循环没有已建立的外部入口，闭包不会建立其中任何 Claim。不要为闭合地图而补造依赖。\n`
      + `- 【证明覆盖】论文中给出证明的每个 Claim 通常都应有对应 proof；不要因为证明简短或显然而省略（推论的一句话证明也算）。\n`
      + `- 【闭包一致性】地图会按「Fact 与 b0 可用、proof 沿依赖传递建立」做闭包推导。逐项检查：任何被某条 proof 的 premises 引用的 Claim，必须要么自己有 proof、要么列入 b0。若某个被依赖的 Claim 两者都不是：论文证明了它就补 proof；论文未证明但直接引用，就通过 fixedEntries 给它补 "external":true 与非空 source 并把它列入 b0；论文明确未证明的 Claim（猜想/开放问题）不得作为 premise 使用。\n`
      + `- 没有被 proof 建立的 Claim 不要改动、不要提及；地图会把它派生为 open。\n`
      + `- 只有论文中实际存在的证明关系才输出 proof；只有实际的 Fact-to-Fact 组织关系才输出 organization。\n`
      + `- 【主目标】必须输出 mainTargetEntryId，指明本文证明或探讨的核心目标 Claim（必须是 Entry 目录中的 Claim id，例如主定理），不能指向 Fact 或未列出的 id。\n`
      + `- 【B0 清单】必须输出 b0 数组，逐项列出 Entry 目录中所有标记「外部结果」的 Claim id。论文自己证明的结果与 Fact 绝不能放进 b0；不要编造目录中不存在的 id。\n`
      + `- 【B0 复核】逐项复核 Entry 的 external 标记：分段提取时模型只看得到局部页段，可能把「本文后文实际给出了证明」的结果误标为外部结果。若你在全文中找到该结果的证明，绝不能把它放进 b0。\n`
      + `- 【完整性核对】输出前先核对全文：论文中明确编号或命名的 definition/algorithm/calculation/lemma/proposition/theorem 是否都已在 Entry 目录中？论文论证实际调用的外部结果是否都已收录并标记？若有遗漏，必须在 JSON 顶层 "fixedEntries" 数组中补充完整条目（新 id、type/num/name/statement/page，外部结果另加 "external":true 与非空 source），补充的外部结果 id 同时列入 b0。特别注意：只在证明正文中被提及、调用的外部定理/引理（包括教材引用，如「由 Transversality Extension Theorem（GP 第 72 页）可得」）也属于论证实际调用的外部结果，必须收录。\n`
      + `- premises 与 conclusion 只能使用 Entry 目录中列出的 id。若你发现某个前提或结论确实不在目录中（提取阶段遗漏），不要编造 id：在 JSON 顶层加 "fixedEntries" 数组补充该条目（完整紧凑字段：id/type/name/statement/page），然后在 premises/conclusion 中引用它。\n`
      + `- argument 最多 400 个字符，概括证明或组织要点；page 填写该关系在正文出现的页码（整数，只引用文本中的 [[PAGE N]] 页码）。\n`
      + `- Inference 总数建议在 30 条以内，只保留论文中明确存在的证明/组织关系。\n`
      + v43Section + v44Section + v45Section + mainlineSection
      + guideSection + boundarySection
      + `JSON 形状：\n`
      + `{"projectTitle":"……","mainTargetEntryId":"……","b0":["……"],"inferences":[{"type":"proof","premises":["……"],"conclusion":"……","argument":"……","page":5}]}\n\n`
      + `Entry 目录：\n${catalog}\n\n论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
  }

  function parseModelJson(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("模型服务没有返回 JSON 内容");
    const trimmed = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    try { return JSON.parse(trimmed); }
    catch (error) { throw new Error(`模型服务返回的内容不是有效 JSON：${error.message}`); }
  }

  function objectArray(value, label) {
    if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
    return value.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${label}[${index}] 必须是对象`);
      return { ...item };
    });
  }

  function assemblyRepairPrompt(issues) {
    return `你的上一次输出校验未通过，存在以下问题：\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}\n\n`
      + `【修复要求】\n`
      + `- 只输出修复后的完整 JSON：{"projectTitle","mainTargetEntryId","b0","inferences"}，形状与之前一致。\n`
      + `- 若问题出在 Entry 本体（缺少 source、statement 缺失或公式定界符未配对等），在 JSON 顶层增加 "fixedEntries" 数组，放入这些 Entry 的完整修正版本（id 不变，字段与 Entry 提取的紧凑形状一致）；若某个 premise/conclusion 指向的条目在目录中不存在，也在 fixedEntries 中补充该条目（新 id，完整字段）后再引用它。其余 Entry 不要重复输出。\n`
      + `- 不要为了消除错误而删除论文中真实存在的证明关系；优先修正 premises/conclusion 指向或补齐字段。\n`
      + `- 保留论文真实存在的 Claim 互推或等价循环 proof；循环本身不能自证，若没有已建立的外部入口，相关 Claim 在 Closure 中保持 open。只删除 conclusion 同时出现在自身 premises 中的直接自依赖。`;
  }

  function applyEntryPatches(entries, patches) {
    const indexById = new Map();
    entries.forEach((entry, index) => {
      if (entry && typeof entry.id === "string" && entry.id.trim()) indexById.set(entry.id.trim(), index);
    });
    patches.forEach((patch) => {
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
      const id = typeof patch.id === "string" ? patch.id.trim() : "";
      if (!id) return;
      if (indexById.has(id)) {
        entries[indexById.get(id)] = { ...patch };
      } else {
        // 装配阶段发现目录遗漏的条目：允许补充新 Entry（后续照常校验）
        indexById.set(id, entries.length);
        entries.push({ ...patch });
      }
    });
  }

  function entryCatalogLine(entry) {
    const type = entry.type ?? entry.kind ?? entry.factKind ?? entry.claimKind ?? "?";
    const name = entry.name ?? entry.shortTitle ?? entry.title ?? "";
    const external = entry.external === true || entry.sourceReference ? "｜外部结果" : "";
    return `- ${entry.id}｜${type}｜${name}${external}`;
  }

  function endpointUrl(endpoint) {
    let url;
    try { url = new URL(nonEmpty(endpoint, "API 服务地址")); }
    catch { throw new Error("API 服务地址不是有效 URL"); }
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      throw new Error("API 服务地址必须使用 HTTPS");
    }
    url.search = "";
    url.hash = "";
    url.pathname = `${url.pathname.replace(/\/+$/u, "")}/chat/completions`
      .replace(/\/chat\/completions\/chat\/completions$/u, "/chat/completions");
    return url.toString();
  }

  function paperProjectView(raw, { fileName = "paper.pdf", requireB0Classification = false } = {}) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("模型服务输出必须是 JSON 对象");
    const entries = objectArray(raw.entries, "entries");
    const inferences = objectArray(raw.inferences ?? [], "inferences");
    const ids = new Set();
    const entryById = new Map();
    const counters = { definition: 0, algorithm: 0, calculation: 0, lemma: 0, proposition: 0, theorem: 0 };
    const normalizedEntries = entries.map((entry, index) => {
      const id = nonEmpty(entry.id, `entries[${index}].id`);
      if (ids.has(id)) throw new Error(`数学地图对象 id 重复：${id}`);
      ids.add(id);
      if (!ENTRY_CLASSES.has(entry.entryClass)) throw new Error(`${id} 缺少 entryClass=fact|claim`);
      const kind = entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
      const kinds = entry.entryClass === "fact" ? FACT_KINDS : CLAIM_KINDS;
      if (!kinds.has(kind)) throw new Error(`${id} 的数学类型无效`);
      counters[kind] += 1;
      const title = nonEmpty(entry.title, `${id}.title`);
      validateMathDelimiters(title, `${id}.title`);
      const statement = nonEmpty(entry.statement, `${id}.statement`);
      validateMathDelimiters(statement, `${id}.statement`);
      const shortTitle = entry.shortTitle?.trim() || title.slice(0, 24);
      validateMathDelimiters(shortTitle, `${id}.shortTitle`);
      const displayLabel = resolveDisplayLabel(entry.displayLabel, ENTRY_LABELS[kind], counters[kind], shortTitle);
      validateMathDelimiters(displayLabel, `${id}.displayLabel`);
      const sourceReference = typeof entry.sourceReference === "string" ? entry.sourceReference.trim() : "";
      const normalized = {
        id,
        entryClass: entry.entryClass,
        ...(entry.entryClass === "fact" ? { factKind: kind } : { claimKind: kind }),
        displayLabel,
        shortTitle,
        title,
        statement,
        sourcePath: nonEmpty(entry.sourceLocator ?? entry.sourcePath, `${id}.sourceLocator`),
        ...(sourceReference ? { sourceReference } : {}),
      };
      entryById.set(id, normalized);
      semantics.validateEntry(normalized);
      return normalized;
    });

    const normalizedInferences = inferences.map((inference, index) => {
      let id;
      if (typeof inference.id === "string" && inference.id.trim()) {
        id = inference.id.trim();
        if (ids.has(id)) throw new Error(`数学地图对象 id 重复：${id}`);
      } else {
        let counter = index + 1;
        const prefix = `paper:inference:${inference.operationKind || "op"}`;
        while (ids.has(`${prefix}:${counter}`)) counter += 1;
        id = `${prefix}:${counter}`;
      }
      ids.add(id);
      if (!OPERATION_KINDS.has(inference.operationKind)) throw new Error(`${id} 缺少 operationKind=organization|proof`);
      if (!Array.isArray(inference.premises) || (inference.operationKind === "organization" && inference.premises.length === 0)) throw new Error(`${id}.premises 必须是非空数组`);
      const premises = [...new Set(inference.premises.map((value, premiseIndex) => nonEmpty(value, `${id}.premises[${premiseIndex}]`)))];
      if (premises.some((premise) => !entryById.has(premise))) throw new Error(`${id} 引用了不存在的 premise`);
      const conclusion = nonEmpty(inference.conclusion, `${id}.conclusion`);
      const conclusionEntry = entryById.get(conclusion);
      if (!conclusionEntry) throw new Error(`${id} 引用了不存在的 conclusion`);
      if (inference.operationKind === "organization" && (conclusionEntry.entryClass !== "fact" || premises.some((premise) => entryById.get(premise).entryClass !== "fact"))) {
        throw new Error(`${id} 的 organization 必须是 Fact 到 Fact`);
      }
      if (inference.operationKind === "proof" && conclusionEntry.entryClass !== "claim") {
        throw new Error(`${id} 的 proof 必须以 Claim 为结论（当前结论 ${conclusion} 是 ${conclusionEntry.entryClass}；definition/algorithm/calculation 等 Fact 不能作为证明结论，若论文证明了该结果请提取为 Claim，若非证明关系请省略该 Inference）`);
      }
      if (premises.includes(conclusion)) throw new Error(`${id} 的 conclusion 不能同时出现在 premises 中`);
      const argument = nonEmpty(inference.argument, `${id}.argument`);
      validateMathDelimiters(argument, `${id}.argument`);
      const sourcePath = nonEmpty(inference.sourceLocator ?? inference.sourcePath, `${id}.sourceLocator`);
      const kindLabel = INFERENCE_LABELS[inference.operationKind];
      const shortTitle = inference.shortTitle?.trim() || `${kindLabel} · ${conclusionEntry.shortTitle}`;
      validateMathDelimiters(shortTitle, `${id}.shortTitle`);
      const shortMathName = shortTitle.replace(/^(证明|组织)\s*·\s*/u, "").trim() || conclusionEntry.shortTitle;
      const displayLabel = resolveDisplayLabel(inference.displayLabel, kindLabel, index + 1, shortMathName);
      validateMathDelimiters(displayLabel, `${id}.displayLabel`);
      const title = inference.title?.trim() || `${kindLabel} ${conclusionEntry.title}`;
      validateMathDelimiters(title, `${id}.title`);
      const statement = inference.statement?.trim() || argument;
      validateMathDelimiters(statement, `${id}.statement`);
      const normalized = {
        id,
        operationKind: inference.operationKind,
        displayLabel,
        shortTitle,
        title,
        statement,
        premises,
        conclusion,
        argument,
        sourcePath,
      };
      if (premises.length || inference.operationKind !== "proof") semantics.validateInference(normalized, entryById);
      return normalized;
    });

    if (!normalizedEntries.length) throw new Error("模型服务没有提取出任何数学 Entry");
    if (requireB0Classification && !Array.isArray(raw.b0ClaimEntryIds) && !Array.isArray(raw.derivedResearchState?.mathematicalState?.b0ClaimEntryIds)) {
      throw new Error("模型服务必须显式输出 b0ClaimEntryIds 数组");
    }
    const b0RawList = raw.b0ClaimEntryIds ?? raw.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [];
    const b0ClaimEntryIds = [...new Set(b0RawList.map((value, index) => nonEmpty(value, `b0ClaimEntryIds[${index}]`)))];
    const b0MissingSourceReference = [];
    b0ClaimEntryIds.forEach((id) => {
      const entry = entryById.get(id);
      if (!entry || entry.entryClass !== "claim") throw new Error(`B0 必须引用 Claim：${id}`);
      if (!entry.sourceReference) b0MissingSourceReference.push(id);
    });
    if (b0MissingSourceReference.length) {
      throw new Error(`B0 Claim ${b0MissingSourceReference.join("、")} 必须包含 sourceReference`);
    }

    const mainTargetEntryId = nonEmpty(
      raw.mainTargetEntryId ?? raw.derivedResearchState?.researchOverlay?.loopTargetEntryId,
      "mainTargetEntryId",
    );
    const mainTargetEntry = entryById.get(mainTargetEntryId);
    if (!mainTargetEntry || mainTargetEntry.entryClass !== "claim") {
      throw new Error(`mainTargetEntryId 必须指向已存在的 Claim：${mainTargetEntryId}`);
    }

    const stem = String(fileName).replace(/\.pdf$/iu, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "paper";
    const projectId = `cmath:project:paper:${stem}`;
    const projectTitle = nonEmpty(raw.projectTitle ?? raw.project?.title, "projectTitle");
    validateMathDelimiters(projectTitle, "projectTitle");
    return {
      schema: PROJECT_VIEW_SCHEMA,
      semanticModel: SEMANTIC_MODEL,
      project: { id: projectId, title: projectTitle },
      mainTargetEntryId,
      channelOptions: {
        schema: CHANNEL_SCHEMA,
        projectId,
        boundaryLabel: "论文导入地图 · 浏览器本地预览",
        adapterOptions: {},
      },
      derivedResearchState: {
        mathematicalState: { b0ClaimEntryIds },
        researchOverlay: { loopTargetEntryId: mainTargetEntryId },
      },
      entries: normalizedEntries,
      inferences: normalizedInferences,
    };
  }

  function findOpenClaims(view) {
    const closure = semantics.computeClaimClosure(view.entries, view.inferences, {
      b0ClaimEntryIds: view.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [],
    });
    return view.entries.filter(
      (entry) => entry.entryClass === "claim" && closure.claimStates[entry.id] !== "established",
    );
  }

  async function requestPaperInferenceFromEntryArtifact({ artifact, endpoint, apiKey, model, providerLabel = "Opencode", fetchImpl = globalThis.fetch, chatImpl, chatDefaults, signal, onStage, reasoningEffort, workflowVersion = "v3.43", workflowCapabilities, tokenBudget, maxChunks } = {}) {
    if (!artifact || typeof artifact !== "object") throw new Error("artifact 必须是非空对象");
    if (typeof fetchImpl !== "function") throw new Error("当前环境不支持网络请求");
    const fileName = artifact.source?.fileName || "paper.pdf";
    const text = artifact.source?.sourceText || "";
    const pageCount = artifact.source?.pageCount ?? 1;
    // Use frozen entries from artifact; guard immutability
    const entries = Array.isArray(artifact.entries) ? artifact.entries.map((e) => ({ ...e })) : [];
    if (!entries.length) throw new Error("artifact.entries 为空，无法执行 Inference");
    const paperGuide = artifact.paperGuide ?? null;
    const externalBoundaryInventory = artifact.reviewInputs?.externalBoundaryCandidates ?? artifact.reviewInputs?.externalBoundaryInventory ?? null;
    const key = typeof apiKey === "string" ? apiKey.trim() : "";
    const modelName = typeof model === "string" && model.trim() ? model.trim() : "host-routed";
    const serviceName = typeof providerLabel === "string" && providerLabel.trim() ? providerLabel.trim() : "模型服务";
    const targetUrl = endpoint ? endpointUrl(endpoint) : null;
    const transport = modelTransport.createModelTransport({
      chatImpl,
      fetchImpl,
      endpoint: targetUrl || endpoint,
      apiKey: key,
      model: modelName,
      providerLabel: serviceName,
      signal,
      chatDefaults,
    });
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch {} };
    async function executeChatCall(messages, maxTokens) {
      const inferredStage = messages.length > 1 ? "repair" : "assemble";
      const body = {
        model: modelName,
        messages,
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        stream: false,
      };
      try {
        const result = await transport.complete({
          stage: inferredStage,
          messages,
          model: modelName,
          maxTokens,
          reasoningEffort,
          signal,
          body,
        });
        return { content: result.content, finishReason: result.finishReason };
      } catch (error) {
        // Preserve the historical repair loop for a successful HTTP response
        // that lacks its first choice message. Malformed JSON and transport /
        // service failures remain structured and fail immediately as before.
        if (modelTransport.isModelTransportError(error)
          && error.code === modelTransport.ERROR_CODES.INVALID_ENVELOPE
          && error.reason === "missing_message") {
          return { content: "", finishReason: null };
        }
        if (modelTransport.isModelTransportError(error)
          && error.code === modelTransport.ERROR_CODES.HTTP) {
          let message = typeof error.body === "string" ? error.body.slice(-500) : "";
          try { message = JSON.parse(error.body).error?.message || message; } catch {}
          throw new modelTransport.ModelTransportError(
            error.code,
            `${serviceName} 请求失败（HTTP ${error.status}）：${message || "没有错误详情"}`,
            { ...(error.details || {}), cause: error },
          );
        }
        throw error;
      }
    }
    notify("assemble", { entries: entries.length, workflowVersion });
    const catalog = entries.map(entryCatalogLine).join("\n");
    const messages = [{ role: "user", content: assemblyPrompt({ fileName, pageCount, text, catalog, workflowVersion, paperGuide, externalBoundaryInventory }) }];
    let lastMerged = null;
    let lastIssues = ["装配没有产出有效输出"];
    let truncated = false;
    const configuredMaxRounds = typeof process === "object" && process?.env
      ? process.env.INFERENCE_MAX_ROUNDS
      : undefined;
    const maxRounds = Number(configuredMaxRounds || 4);
    for (let round = 0; round < maxRounds; round += 1) {
      const maxTokens = truncated ? (tokenBudget?.retry ?? 32000) : (tokenBudget?.normal ?? 16000);
      const { content, finishReason } = await executeChatCall(messages, maxTokens);
      truncated = finishReason === "length";
      notify("response", { round: round + 1 });
      let issues = [];
      if (!content.trim()) {
        issues = [truncated ? "输出被截断：请精简 argument" : "输出为空：请输出装配 JSON"];
      } else {
        let assembly = null;
        try { assembly = parseModelJson(content); } catch (error) { issues = [`装配输出不是有效 JSON：${error.message}`]; }
        if (assembly) {
          if (typeof assembly !== "object" || Array.isArray(assembly)) {
            issues = ["装配输出必须是 JSON 对象"];
          } else {
            if (Array.isArray(assembly.fixedEntries)) applyEntryPatches(entries, assembly.fixedEntries);
            const merged = {
              projectTitle: assembly.projectTitle,
              mainTargetEntryId: assembly.mainTargetEntryId,
              b0ClaimEntryIds: assembly.b0 ?? assembly.b0ClaimEntryIds,
              entries,
              inferences: Array.isArray(assembly.inferences) ? assembly.inferences : [],
            };
            const { raw: normalized } = normalizeRawProjectView(merged, { fileName });
            issues = collectRawProjectViewIssues(normalized);
            lastMerged = normalized;
            if (!issues.length) {
              notify("validate", {});
              try {
                const view = paperProjectView(normalized, { fileName, requireB0Classification: true });
                if (!("projectTitle" in view) && view?.project?.title) view.projectTitle = view.project.title;
                return view;
              } catch (error) {
                issues = [`系统校验未通过：${error.message}`];
              }
            }
          }
        }
      }
      lastIssues = issues;
      if (round < maxRounds - 1) {
        notify("repair", { reason: `${issues.length} 处问题`, attempt: round + 1 });
        messages.push({ role: "assistant", content }, { role: "user", content: assemblyRepairPrompt(issues) });
      }
    }
    if (lastMerged) {
      const { raw: fixed, actions } = sanitizeRawProjectView(lastMerged, { fileName });
      if (actions.length) notify("autofix", { count: actions.length, actions });
      notify("validate", {});
      try {
        const view = paperProjectView(fixed, { fileName, requireB0Classification: true });
        if (!("projectTitle" in view) && view?.project?.title) view.projectTitle = view.project.title;
        return view;
      } catch (error) {
        throw new Error(`${serviceName} 论文导入失败（模型已修复 3 次）：${error.message}`);
      }
    }
    throw new Error(`${serviceName} 论文导入失败（模型已修复 3 次）：${lastIssues.join("；")}`);
  }

  return Object.freeze({
    INFERENCE_LIFECYCLE_MODULE_ID: "cmath.paper-import.inference.lifecycle/v1",
    assemblyPrompt,
    paperProjectView,
    findOpenClaims,
    requestPaperInferenceFromEntryArtifact,
  });
});
