(function publishPaperImportClient(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaPaperImportClient = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperImportClient(root) {
  "use strict";

  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const SEMANTIC_MODEL = "cmath.fact-claim-operation/v0.1";
  const CHANNEL_SCHEMA = "cmath-gamma.project-channel/v0.1";
  const MAX_PDF_BYTES = 25 * 1024 * 1024;
  const MAX_PAPER_TEXT_CHARS = 180_000;
  const semantics = root?.GammaMathMapSemantics
    ?? (typeof require === "function" ? require("./math-map-semantics.js") : null);
  if (!semantics || typeof semantics.validateEntry !== "function" || typeof semantics.validateInference !== "function") {
    throw new Error("Gamma 数学地图语义能力没有加载");
  }
  const ENTRY_CLASSES = new Set(semantics.ENTRY_CLASSES);
  const FACT_KINDS = new Set(semantics.FACT_KINDS);
  const CLAIM_KINDS = new Set(semantics.CLAIM_KINDS);
  const OPERATION_KINDS = new Set(semantics.OPERATION_KINDS);

  function nonEmpty(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
  }

  function hasBalancedMathDelimiters(text) {
    if (typeof text !== "string") return true;
    let inInline = false;
    let inDisplay = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && text[j] === "\\") {
        backslashCount += 1;
        j -= 1;
      }
      const isEscaped = backslashCount % 2 === 1;

      if (!isEscaped && text[i] === "$") {
        const isDouble = i + 1 < len && text[i + 1] === "$";
        if (inDisplay) {
          if (isDouble) {
            inDisplay = false;
            i += 2;
            continue;
          }
        } else if (inInline) {
          if (!isDouble) {
            inInline = false;
            i += 1;
            continue;
          } else {
            return false;
          }
        } else {
          if (isDouble) {
            inDisplay = true;
            i += 2;
            continue;
          } else {
            inInline = true;
            i += 1;
            continue;
          }
        }
      }
      i += 1;
    }

    return !inInline && !inDisplay;
  }

  function validateMathDelimiters(value, label) {
    if (typeof value !== "string") return;
    if (!hasBalancedMathDelimiters(value)) {
      throw new Error(`${label} 包含未配对的数学公式定界符 $ 或 $$（请确保成对闭合或使用 \\$ 转义）`);
    }
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

  function pageText(items) {
    let text = "";
    for (const item of items ?? []) {
      if (typeof item?.str !== "string") continue;
      text += item.str;
      text += item.hasEOL ? "\n" : " ";
    }
    return text.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim();
  }

  async function extractPdfText(file, { pdfjsLib, maxChars = MAX_PAPER_TEXT_CHARS, onProgress } = {}) {
    if (!file || typeof file.arrayBuffer !== "function") throw new Error("请选择一份 PDF 论文");
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) throw new Error("请选择一份不超过 25 MB 的 PDF 论文");
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") throw new Error("PDF 解析组件没有加载");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const document = await loadingTask.promise;
    const pageCount = document.numPages;
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const text = pageText((await page.getTextContent()).items);
        pages.push(`[[PAGE ${pageNumber}]]\n${text}`);
        try { onProgress?.({ stage: "read", page: pageNumber, pageCount }); } catch { /* 进度回调不影响主流程 */ }
        if (pages.join("\n\n").length > maxChars) {
          throw new Error(`论文文本超过当前浏览器导入上限（${maxChars.toLocaleString()} 字符）`);
        }
      }
    } finally {
      await document.destroy?.();
    }
    const text = pages.join("\n\n").trim();
    if (!text.replace(/\[\[PAGE \d+\]\]/gu, "").trim()) {
      throw new Error("这份 PDF 没有可提取的文本层，当前版本暂不支持扫描版 OCR");
    }
    return Object.freeze({ text, pageCount });
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

  function extractionPrompt({ fileName, pageCount, text }) {
    return `你是数学论文结构化编辑器。请忠实整理下面这篇已经发表或可信的论文，不评价结果真伪，也不要补造论文没有的结果。\n\n`
      + `目标：输出一张可直接载入数学地图的 Project View 内容，把正文拆成 Fact、Claim 和 Inference。只输出一个 JSON 对象，不要 Markdown。\n\n`
      + `【语言要求】所有面向读者的文本字段（projectTitle、displayLabel、shortTitle、title、statement、argument）一律使用简体中文撰写，可从原文翻译转写；数学符号与公式保留 $...$ / $$...$$；Entry 与 Inference 的 id 使用英文小写 slug。\n\n`
      + `Gamma 语义与提取规则：\n`
      + `- Fact: entryClass=fact，factKind 只能是 definition|algorithm|calculation。definition、algorithm、calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- Claim: entryClass=claim，claimKind 只能是 lemma|proposition|theorem。论文明确提出但未证明的数学陈述仍是正式 Claim，保留在地图中并由闭包派生为 open；不要创建 conjecture、candidate 或 draft 类型。\n`
      + `- Inference: operationKind 只能是 organization（Fact 到 Fact）或 proof（若干 Fact/Claim 到 Claim）。\n`
      + `- 【规则 1】proof 的结论（conclusion）只能是 entryClass=claim 的 Entry，绝不能以 Fact 为结论。\n`
      + `- 【规则 2】definition/algorithm/calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- 【规则 3】若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim（lemma|proposition|theorem），并将 proof 的 conclusion 指向该 Claim。\n`
      + `- 【规则 4】若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系，不要生成 Inference。\n`
      + `- 【规则 5】严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference；只有论文中实际存在的证明或组织关系才输出 Inference。\n`
      + `- 【B0 引理与定理清点】必须完整清点论文在论证中实际调用的每一个外部定理/引理/命题（包括在证明正文叙述中明确提及但论文未自行证明的外部结果，例如横截同伦定理、横截延拓定理、Sard 定理、等痕引理、Poincaré–Hopf 定理等），将其提取为 Claim（lemma|proposition|theorem）并列入顶层 b0ClaimEntryIds 数组。\n`
      + `- 【B0 来源引用】B0 Claim 必须填写非空 sourceReference（说明所引文献名、作者或正文引用位置等确切信息，严禁臆造外部书籍的具体页码；仅在有确切支持精度时填写），且 sourceLocator 必须定位到本文实际引用该结果的页码（如 [[PAGE N]]）。论文自己证明的结果绝不能放进 B0。Fact 天然可用，绝不能放进 B0。\n`
      + `- 【主目标】必须输出 mainTargetEntryId，指明本文证明或探讨的核心目标 Claim（必须是 entries 中 entryClass=claim 的 Claim id，例如主定理），不能指向 Fact 或未包含的对象。\n`
      + `- 【证明依赖】论文中实际给出证明的 Claim 才输出 proof。premises 只列论文证明实际使用且已提取为 Entry 的直接依赖；proof 的 conclusion 严禁同时出现在自己的 premises 中，严禁产生循环证明依赖，也不要为闭合地图而补造依赖。\n`
      + `- 没有被 proof 建立的 Claim 仍然输出到 entries；地图会把它派生为 open，并显示为空心圆。不要把它改成候选或草稿对象。\n`
      + `- 只有论文中实际存在的证明关系才输出 proof。\n`
      + `- 第一版只建立数学地图，不复现完整证明正文。完整提取论文中所有明确编号或命名的 definition、algorithm、calculation、lemma、proposition、theorem 以及论证实际调用的外部结果；不要把一般说明段落拆成 Entry。\n`
      + `- 优先保证明确/命名数学对象与外部调用结果的完整性，总数建议在 40 个 Entry 和 30 个 Inference 以内（避免人为限制在 20 个以下导致遗漏必要引理或外部定理）。statement 最多 600 个字符，argument 最多 800 个字符，在不遗漏假设、量词和关键依赖的前提下简洁转写。\n`
      + `- Entry 必须包含稳定且唯一的 id、displayLabel、shortTitle、title、statement、sourceLocator。\n`
      + `- Inference 必须包含 premises（Entry id 数组）、conclusion（Entry id）、argument 和 sourceLocator（id、displayLabel、shortTitle、title、statement 可由系统生成）。每条 Inference 必须输出 sourceLocator。\n`
      + `- displayLabel 必须符合 '<类型> · <正整数> · <数学短名>' 格式（例如 '定义 · 1 · 映射度'、'定理 · 8 · Hopf 度定理'、'证明 · 1 · 正则点环绕数 ±1'）。\n`
      + `- sourceLocator 使用 ${JSON.stringify(fileName)}#page=N；只引用文本中的 [[PAGE N]] 页码。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，不要输出裸 TeX。保留论文原有假设、量词和局部约定。\n`
      + `- 只提取论文明确陈述的定义、算法、计算、引理、命题、定理及明确的证明/组织关系。\n\n`
      + `JSON 形状：\n`
      + `{"projectTitle":"...","mainTargetEntryId":"...","b0ClaimEntryIds":["..."],"entries":[...],"inferences":[...]}\n\n`
      + `论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
  }

  function extractMessageText(message) {
    if (!message || typeof message !== "object") return "";
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          if (part.type === "text" || part.type === "output_text") return String(part.text ?? "");
        }
        return "";
      }).join("");
    }
    return "";
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
        while (ids.has(`${prefix}:${counter}`)) {
          counter += 1;
        }
        id = `${prefix}:${counter}`;
      }
      ids.add(id);
      if (!OPERATION_KINDS.has(inference.operationKind)) throw new Error(`${id} 缺少 operationKind=organization|proof`);
      if (!Array.isArray(inference.premises) || inference.premises.length === 0) throw new Error(`${id}.premises 必须是非空数组`);
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
      semantics.validateInference(normalized, entryById);
      return normalized;
    });

    if (!normalizedEntries.length) throw new Error("模型服务没有提取出任何数学 Entry");
    if (requireB0Classification && !Array.isArray(raw.b0ClaimEntryIds) && !Array.isArray(raw.derivedResearchState?.mathematicalState?.b0ClaimEntryIds)) {
      throw new Error("模型服务必须显式输出 b0ClaimEntryIds 数组");
    }
    const b0RawList = raw.b0ClaimEntryIds ?? raw.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [];
    const b0ClaimEntryIds = [...new Set(b0RawList.map((value, index) => nonEmpty(value, `b0ClaimEntryIds[${index}]`)))];
    b0ClaimEntryIds.forEach((id) => {
      const entry = entryById.get(id);
      if (!entry || entry.entryClass !== "claim") throw new Error(`B0 必须引用 Claim：${id}`);
      if (!entry.sourceReference) throw new Error(`B0 Claim ${id} 必须包含 sourceReference`);
    });

    // Cyclic proof dependency validation
    const proofDependencies = new Map();
    normalizedEntries.forEach((entry) => {
      proofDependencies.set(entry.id, new Set());
    });
    normalizedInferences
      .filter((inf) => inf.operationKind === "proof")
      .forEach((inf) => {
        inf.premises.forEach((premiseId) => {
          proofDependencies.get(inf.conclusion)?.add(premiseId);
        });
      });

    const visitState = new Map();
    const currentPath = [];
    function detectProofCycle(nodeId) {
      visitState.set(nodeId, 1);
      currentPath.push(nodeId);
      const deps = proofDependencies.get(nodeId) ?? new Set();
      for (const depId of deps) {
        if (visitState.get(depId) === 1) {
          const startIndex = currentPath.indexOf(depId);
          const cyclePath = [...currentPath.slice(startIndex), depId];
          throw new Error(`数学地图存在循环证明依赖：${cyclePath.join(" -> ")}`);
        }
        if (!visitState.get(depId)) {
          detectProofCycle(depId);
        }
      }
      currentPath.pop();
      visitState.set(nodeId, 2);
    }

    for (const entryId of entryById.keys()) {
      if (!visitState.get(entryId)) {
        detectProofCycle(entryId);
      }
    }

    const mainTargetEntryId = nonEmpty(
      raw.mainTargetEntryId ?? raw.derivedResearchState?.researchOverlay?.loopTargetEntryId,
      "mainTargetEntryId"
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

  async function requestPaperProjectView({ endpoint, apiKey, model, providerLabel = "模型服务", fileName, pageCount, text, fetchImpl = globalThis.fetch, signal, onStage } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("当前浏览器不支持网络请求");
    const key = nonEmpty(apiKey, "API Key");
    const modelName = nonEmpty(model, "模型名称");
    const serviceName = nonEmpty(providerLabel, "模型服务名称");
    const targetUrl = endpointUrl(endpoint);
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch { /* 进度回调不影响主流程 */ } };

    async function executeChatCall(messages) {
      notify("request", { chars: messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) });
      const response = await fetchImpl(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: modelName,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.1,
          // Reasoning models consume max_tokens with their chain of thought
          // before any visible output; a large extraction task needs room.
          max_tokens: 32000,
          stream: false,
        }),
        signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        let message = responseText.slice(-500);
        try { message = JSON.parse(responseText).error?.message || message; } catch { /* use response text */ }
        throw new Error(`${serviceName} 请求失败（HTTP ${response.status}）：${message || "没有错误详情"}`);
      }
      let envelope;
      try { envelope = JSON.parse(responseText); }
      catch { throw new Error(`${serviceName} 响应不是有效 JSON`); }
      if (envelope.error) {
        throw new Error(`${serviceName} 服务端错误：${String(envelope.error?.message ?? envelope.error).slice(0, 300)}`);
      }
      const message = envelope.choices?.[0]?.message;
      const content = extractMessageText(message);
      const finishReason = envelope.choices?.[0]?.finish_reason;
      if (!content && finishReason === "length") {
        throw new Error(`${serviceName} 输出被截断：模型将全部额度用于推理仍未完成（这是推理模型在大任务下的常见现象），请换用更大配额或非推理模型重试`);
      }
      const parsed = parseModelJson(content);
      notify("response", {});
      return parsed;
    }

    const initialMessages = [{ role: "user", content: extractionPrompt({ fileName, pageCount, text }) }];

    // 第一阶段：生成合法的结构化 JSON（结构错误允许修复 1 次）
    let view;
    try {
      const raw = await executeChatCall(initialMessages);
      notify("validate", {});
      view = paperProjectView(raw, { fileName, requireB0Classification: true });
    } catch (firstError) {
      if (signal?.aborted || firstError.name === "AbortError" || String(firstError.message).includes("HTTP")) {
        throw firstError;
      }
      let repairGuidance = "";
      if (String(firstError.message).includes("proof 必须以 Claim 为结论")) {
        repairGuidance = `\n【修复指引】\n`
          + `1. proof 的结论（conclusion）只能是 entryClass=claim 的 Entry（lemma|proposition|theorem），绝不能以 Fact 为结论。\n`
          + `2. definition/algorithm/calculation 属于 Fact，不能作为 proof 的结论。\n`
          + `3. 若论文证明了该命名定理/引理/命题，请将该 Entry 定义为 Claim 并将 proof 的 conclusion 指向它。\n`
          + `4. 若该关系仅为推导/说明/并非证明 Claim，请直接删除该 Inference，不要将推导、相关性或章节顺序编码为 Inference。\n`;
      } else if (String(firstError.message).includes("mainTargetEntryId")) {
        repairGuidance = `\n【修复指引】\n`
          + `1. 必须输出顶层 mainTargetEntryId 字段，指明本文核心证明目标 Claim 的 id。\n`
          + `2. mainTargetEntryId 必须是 entries 中 entryClass=claim 的 Claim（如主定理），不能指向 Fact 或不存在的 id。\n`;
      } else if (String(firstError.message).includes("循环证明依赖")) {
        repairGuidance = `\n【修复指引】\n`
          + `1. 证明依赖必须是有向无环图（DAG），严禁循环证明依赖。\n`
          + `2. 检查各 proof 的 premises，移除导致循环的前提。\n`;
      } else if (String(firstError.message).includes("数学公式定界符")) {
        repairGuidance = `\n【修复指引】\n`
          + `1. 检查所有文本字段（title、statement、argument 等）中的数学公式定界符。\n`
          + `2. 行内公式 $...$ 与块级公式 $$...$$ 必须成对闭合，严禁出现单边未闭合的 $ 或 $$（例如 ' < k$' 或 '$x > 0' 漏掉另一侧定界符）。\n`
          + `3. 若文本中包含普通美元符号而非数学公式，请使用 \\$ 进行转义。\n`;
      }
      const repairPrompt = `${extractionPrompt({ fileName, pageCount, text })}\n\n`
        + `【重要修复要求】你上一次的输出存在以下错误：\n${firstError.message}\n`
        + repairGuidance
        + `\n请严格修复以上错误，重新输出完整的合法 JSON 对象。`;
      notify("repair", { reason: firstError.message });
      try {
        const repaired = await executeChatCall([{ role: "user", content: repairPrompt }]);
        notify("validate", {});
        view = paperProjectView(repaired, { fileName, requireB0Classification: true });
      } catch (retryError) {
        throw new Error(`${serviceName} 论文导入失败（已重试 1 次）：${retryError.message}`);
      }
    }

    notify("closure", { openClaims: findOpenClaims(view).map((entry) => entry.displayLabel) });
    return view;
  }

  return Object.freeze({
    PROJECT_VIEW_SCHEMA,
    SEMANTIC_MODEL,
    MAX_PDF_BYTES,
    MAX_PAPER_TEXT_CHARS,
    endpointUrl,
    extractPdfText,
    extractionPrompt,
    parseModelJson,
    paperProjectView,
    findOpenClaims,
    requestPaperProjectView,
  });
});
