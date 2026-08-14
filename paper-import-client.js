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

  function extractionPrompt({ fileName, pageCount, text }) {
    return `你是数学论文结构化编辑器。请忠实整理下面这篇已经发表或可信的论文，不评价结果真伪，也不要补造论文没有的结果。\n\n`
      + `目标：输出一张可直接载入数学地图的 Project View 内容，把正文拆成 Fact、Claim 和 Inference。只输出一个 JSON 对象，不要 Markdown。\n\n`
      + `【语言要求】所有面向读者的文本字段（projectTitle、displayLabel、shortTitle、title、statement、argument）一律使用简体中文撰写，可从原文翻译转写；数学符号与公式保留 $...$ / $$...$$；Entry 与 Inference 的 id 使用英文小写 slug。\n\n`
      + `Gamma 语义与提取规则：\n`
      + `- Fact: entryClass=fact，factKind 只能是 definition|algorithm|calculation。definition、algorithm、calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- Claim: entryClass=claim，claimKind 只能是 lemma|proposition|theorem|conjecture。\n`
      + `- 【猜想规则】只有论文明确提出但【未给出证明】的猜想、开放问题、推测，才允许 claimKind=conjecture；论文中已被证明的命题严禁标为 conjecture。\n`
      + `- Inference: operationKind 只能是 organization（Fact 到 Fact）或 proof（若干 Fact/Claim 到 Claim）。\n`
      + `- 【规则 1】proof 的结论（conclusion）只能是 entryClass=claim 的 Entry，绝不能以 Fact 为结论。\n`
      + `- 【规则 2】definition/algorithm/calculation 属于 Fact，绝不能作为 proof 的结论。\n`
      + `- 【规则 3】若论文证明了某个明确编号或命名的 lemma、proposition、theorem，必须将该陈述提取为 Claim（lemma|proposition|theorem），并将 proof 的 conclusion 指向该 Claim。\n`
      + `- 【规则 4】若某个推导或关系以 Fact 为结论，除非是实际的 Fact-to-Fact 组织关系（organization），否则必须省略该关系，不要生成 Inference。\n`
      + `- 【规则 5】严禁将一般推导、相关性、阅读顺序或章节连接编码为 Inference；只有论文中实际存在的证明或组织关系才输出 Inference。\n`
      + `- 【证明完整性】论文中每一个被证明的 Claim（包括所有引理、命题、定理）都必须有一条对应的 proof Inference；proof 的 premises 必须是图中已存在的 Fact 或已被证明的 Claim，确保从 Fact 出发沿 proof 链可以抵达该结论——不允许出现"有 proof 但前提本身未被建立"的悬空链。目标是：整张地图收敛后，除 conjecture 外的所有 Claim 都处于已建立状态。\n`
      + `- 没有被 proof 建立的 Claim 仍然输出到 entries；地图会把它派生为 open，并显示为空心圆。不要把它改成候选或草稿对象。\n`
      + `- 只有论文中实际存在的证明关系才输出 proof。\n`
      + `- 第一版只建立数学地图，不复现完整证明正文。优先提取论文中明确编号或命名的 definition、algorithm、calculation、lemma、proposition、theorem、conjecture；不要把一般说明段落拆成 Entry。\n`
      + `- 提取核心骨干，总数最多 20 个 Entry 和 16 个 Inference。statement 最多 600 个字符，argument 最多 800 个字符，在不遗漏假设、量词和关键依赖的前提下简洁转写。\n`
      + `- Entry 必须包含稳定且唯一的 id、shortTitle、title、statement、sourceLocator。\n`
      + `- Inference 必须包含 premises（Entry id 数组）、conclusion（Entry id）、argument 和 sourceLocator（id、displayLabel、shortTitle、title、statement 可由系统生成）。每条 Inference 必须输出 sourceLocator。\n`
      + `- sourceLocator 使用 ${JSON.stringify(fileName)}#page=N；只引用文本中的 [[PAGE N]] 页码。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，不要输出裸 TeX。保留论文原有假设、量词和局部约定。\n`
      + `- 只提取论文明确陈述的定义、算法、计算、引理、命题、定理、猜想及明确的证明/组织关系。\n\n`
      + `JSON 形状：\n`
      + `{"projectTitle":"...","entries":[...],"inferences":[...]}\n\n`
      + `论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
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

  function paperProjectView(raw, { fileName = "paper.pdf" } = {}) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("模型服务输出必须是 JSON 对象");
    const entries = objectArray(raw.entries, "entries");
    const inferences = objectArray(raw.inferences ?? [], "inferences");
    const ids = new Set();
    const entryById = new Map();
    const counters = { definition: 0, algorithm: 0, calculation: 0, lemma: 0, proposition: 0, theorem: 0, conjecture: 0 };
    const labels = { definition: "定义", algorithm: "算法", calculation: "计算", lemma: "引理", proposition: "命题", theorem: "定理", conjecture: "猜想" };
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
      const normalized = {
        id,
        entryClass: entry.entryClass,
        ...(entry.entryClass === "fact" ? { factKind: kind } : { claimKind: kind }),
        displayLabel: entry.displayLabel?.trim() || `${labels[kind]} ${counters[kind]}`,
        shortTitle: entry.shortTitle?.trim() || title.slice(0, 24),
        title,
        statement: nonEmpty(entry.statement, `${id}.statement`),
        sourcePath: nonEmpty(entry.sourceLocator, `${id}.sourceLocator`),
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
      const argument = nonEmpty(inference.argument, `${id}.argument`);
      const sourcePath = nonEmpty(inference.sourceLocator, `${id}.sourceLocator`);
      const normalized = {
        id,
        operationKind: inference.operationKind,
        displayLabel: inference.displayLabel?.trim() || `${inference.operationKind === "proof" ? "证明" : "组织"} ${index + 1}`,
        shortTitle: inference.shortTitle?.trim() || `${inference.operationKind === "proof" ? "证明" : "组织"} · ${conclusionEntry.shortTitle}`,
        title: inference.title?.trim() || `${inference.operationKind === "proof" ? "证明" : "组织"} ${conclusionEntry.title}`,
        statement: inference.statement?.trim() || argument,
        premises,
        conclusion,
        argument,
        sourcePath,
      };
      semantics.validateInference(normalized, entryById);
      return normalized;
    });
    if (!normalizedEntries.length) throw new Error("模型服务没有提取出任何数学 Entry");
    const initialFocusId = normalizedEntries.find((entry) => entry.entryClass === "claim")?.id
      ?? normalizedEntries[0].id;
    const stem = String(fileName).replace(/\.pdf$/iu, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "paper";
    const projectId = `cmath:project:paper:${stem}`;
    return {
      schema: PROJECT_VIEW_SCHEMA,
      semanticModel: SEMANTIC_MODEL,
      project: { id: projectId, title: nonEmpty(raw.projectTitle, "projectTitle") },
      channelOptions: {
        schema: CHANNEL_SCHEMA,
        projectId,
        boundaryLabel: "论文导入地图 · 浏览器本地预览",
        adapterOptions: {},
      },
      derivedResearchState: {
        mathematicalState: { b0ClaimEntryIds: [] },
        researchOverlay: { loopTargetEntryId: initialFocusId },
      },
      entries: normalizedEntries,
      inferences: normalizedInferences,
    };
  }

  function findOpenNonConjectures(view) {
    const closure = semantics.computeClaimClosure(view.entries, view.inferences, {
      b0ClaimEntryIds: view.derivedResearchState?.mathematicalState?.b0ClaimEntryIds ?? [],
    });
    return view.entries.filter(
      (entry) => entry.entryClass === "claim"
        && entry.claimKind !== "conjecture"
        && closure.claimStates[entry.id] !== "established",
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
          max_tokens: 8192,
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
      const content = envelope.choices?.[0]?.message?.content;
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
      view = paperProjectView(raw, { fileName });
    } catch (firstError) {
      if (signal?.aborted || firstError.name === "AbortError" || String(firstError.message).includes("HTTP")) {
        throw firstError;
      }
      let repairGuidance = "";
      if (String(firstError.message).includes("proof 必须以 Claim 为结论")) {
        repairGuidance = `\n【修复指引】\n`
          + `1. proof 的结论（conclusion）只能是 entryClass=claim 的 Entry（lemma|proposition|theorem|conjecture），绝不能以 Fact 为结论。\n`
          + `2. definition/algorithm/calculation 属于 Fact，不能作为 proof 的结论。\n`
          + `3. 若论文证明了该命名定理/引理/命题，请将该 Entry 定义为 Claim 并将 proof 的 conclusion 指向它。\n`
          + `4. 若该关系仅为推导/说明/并非证明 Claim，请直接删除该 Inference，不要将推导、相关性或章节顺序编码为 Inference。\n`;
      }
      const repairPrompt = `${extractionPrompt({ fileName, pageCount, text })}\n\n`
        + `【重要修复要求】你上一次的输出存在以下错误：\n${firstError.message}\n`
        + repairGuidance
        + `\n请严格修复以上错误，重新输出完整的合法 JSON 对象。`;
      notify("repair", { reason: firstError.message });
      try {
        const repaired = await executeChatCall([{ role: "user", content: repairPrompt }]);
        notify("validate", {});
        view = paperProjectView(repaired, { fileName });
      } catch (retryError) {
        throw new Error(`${serviceName} 论文导入失败（已重试 1 次）：${retryError.message}`);
      }
    }

    // 第二阶段：证明闭包检查——除猜想外不允许存在未建立的 Claim
    const openClaims = findOpenNonConjectures(view);
    if (openClaims.length > 0) {
      const listing = openClaims.map((entry) => `- ${entry.id}（${entry.displayLabel}：${entry.title}）`).join("\n");
      const closurePrompt = `${extractionPrompt({ fileName, pageCount, text })}\n\n`
        + `【证明完整性修复要求】你上一次的输出中，以下 Claim 在论文中有证明，但地图里它们未被建立（缺少 proof，或 proof 的前提链没有落到 Fact / 已建立 Claim）：\n${listing}\n\n`
        + `请重新输出完整的合法 JSON，并满足：\n`
        + `1. 为上述每个 Claim 补充对应的 proof Inference，premises 必须引用图中已存在的 Fact 或已被证明的 Claim（可以为引理先补 proof，再用引理证明定理）。\n`
        + `2. 若论文确实没有证明某条，请把它的 claimKind 改为 conjecture。\n`
        + `3. 其余 Entry 与 Inference 保持不变，并继续使用简体中文。\n`;
      notify("closure-repair", { openClaims: openClaims.map((entry) => entry.displayLabel) });
      try {
        const completed = await executeChatCall([{ role: "user", content: closurePrompt }]);
        notify("validate", {});
        const completedView = paperProjectView(completed, { fileName });
        // 补全后的版本只要合法就采用；仍有猜想以外的未建立 Claim 时保留补全版（通常更好）
        view = completedView;
      } catch (closureError) {
        if (signal?.aborted || closureError.name === "AbortError" || String(closureError.message).includes("HTTP")) {
          throw closureError;
        }
        // 补全失败时回退到第一阶段的合法结果，不让整个导入失败
        notify("closure-repair-failed", { reason: closureError.message });
      }
    }

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
    requestPaperProjectView,
  });
});
