(function publishPaperImportClient(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaPaperImportClient = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperImportClient() {
  "use strict";

  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const SEMANTIC_MODEL = "cmath.fact-claim-operation/v0.1";
  const CHANNEL_SCHEMA = "cmath-gamma.project-channel/v0.1";
  const MAX_PDF_BYTES = 25 * 1024 * 1024;
  const MAX_PAPER_TEXT_CHARS = 180_000;
  const ENTRY_CLASSES = new Set(["fact", "claim"]);
  const FACT_KINDS = new Set(["definition", "algorithm", "calculation"]);
  const CLAIM_KINDS = new Set(["lemma", "proposition", "theorem"]);
  const OPERATION_KINDS = new Set(["organization", "proof"]);

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

  async function extractPdfText(file, { pdfjsLib, maxChars = MAX_PAPER_TEXT_CHARS } = {}) {
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
      + `目标：输出一张候选数学地图，把正文拆成 Fact、Claim 和 Inference。只输出一个 JSON 对象，不要 Markdown。\n\n`
      + `Gamma 语义：\n`
      + `- Fact: entryClass=fact，factKind 只能是 definition|algorithm|calculation。\n`
      + `- Claim: entryClass=claim，claimKind 只能是 lemma|proposition|theorem。\n`
      + `- Inference: operationKind=organization（Fact 到 Fact）或 proof（若干 Fact/Claim 到 Claim）。\n`
      + `- 每个对象都要有稳定且唯一的 id、displayLabel、shortTitle、title、statement、sourceLocator。\n`
      + `- Inference 还要有 premises（Entry id 数组）、conclusion（Entry id）和 argument。\n`
      + `- sourceLocator 使用 ${JSON.stringify(fileName)}#page=N；只引用文本中的 [[PAGE N]] 页码。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，不要输出裸 TeX。保留论文原有假设、量词和局部约定。\n`
      + `- 只提取论文明确陈述的定义、算法、计算、引理、命题、定理及明确的证明/组织关系。\n\n`
      + `JSON 形状：\n`
      + `{"projectTitle":"...","entries":[...],"inferences":[...]}\n\n`
      + `论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
  }

  function parseModelJson(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek 没有返回 JSON 内容");
    const trimmed = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    try { return JSON.parse(trimmed); }
    catch (error) { throw new Error(`DeepSeek 返回的内容不是有效 JSON：${error.message}`); }
  }

  function objectArray(value, label) {
    if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
    return value.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${label}[${index}] 必须是对象`);
      return { ...item };
    });
  }

  function candidateProjectView(raw, { fileName = "paper.pdf" } = {}) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("DeepSeek 输出必须是 JSON 对象");
    const entries = objectArray(raw.entries, "entries");
    const inferences = objectArray(raw.inferences, "inferences");
    const ids = new Set();
    const entryById = new Map();
    const counters = { definition: 0, algorithm: 0, calculation: 0, lemma: 0, proposition: 0, theorem: 0 };
    const labels = { definition: "定义", algorithm: "算法", calculation: "计算", lemma: "引理", proposition: "命题", theorem: "定理" };
    const normalizedEntries = entries.map((entry, index) => {
      const id = nonEmpty(entry.id, `entries[${index}].id`);
      if (ids.has(id)) throw new Error(`数学地图对象 id 重复：${id}`);
      ids.add(id);
      if (!ENTRY_CLASSES.has(entry.entryClass)) throw new Error(`${id} 缺少 entryClass=fact|claim`);
      const kind = entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
      const kinds = entry.entryClass === "fact" ? FACT_KINDS : CLAIM_KINDS;
      if (!kinds.has(kind)) throw new Error(`${id} 的数学类型无效`);
      counters[kind] += 1;
      const normalized = {
        id,
        entryClass: entry.entryClass,
        ...(entry.entryClass === "fact" ? { factKind: kind } : { claimKind: kind }),
        displayLabel: entry.displayLabel?.trim() || `${labels[kind]} ${counters[kind]}`,
        shortTitle: nonEmpty(entry.shortTitle, `${id}.shortTitle`),
        title: nonEmpty(entry.title, `${id}.title`),
        statement: nonEmpty(entry.statement, `${id}.statement`),
        sourcePath: nonEmpty(entry.sourceLocator, `${id}.sourceLocator`),
        governanceState: "external_import",
      };
      entryById.set(id, normalized);
      return normalized;
    });
    const normalizedInferences = inferences.map((inference, index) => {
      const id = nonEmpty(inference.id, `inferences[${index}].id`);
      if (ids.has(id)) throw new Error(`数学地图对象 id 重复：${id}`);
      ids.add(id);
      if (!OPERATION_KINDS.has(inference.operationKind)) throw new Error(`${id} 缺少 operationKind=organization|proof`);
      if (!Array.isArray(inference.premises)) throw new Error(`${id}.premises 必须是数组`);
      const premises = [...new Set(inference.premises.map((value, premiseIndex) => nonEmpty(value, `${id}.premises[${premiseIndex}]`)))];
      if (premises.some((premise) => !entryById.has(premise))) throw new Error(`${id} 引用了不存在的 premise`);
      const conclusion = nonEmpty(inference.conclusion, `${id}.conclusion`);
      const conclusionEntry = entryById.get(conclusion);
      if (!conclusionEntry) throw new Error(`${id} 引用了不存在的 conclusion`);
      if (inference.operationKind === "organization" && (conclusionEntry.entryClass !== "fact" || premises.some((premise) => entryById.get(premise).entryClass !== "fact"))) {
        throw new Error(`${id} 的 organization 必须是 Fact 到 Fact`);
      }
      if (inference.operationKind === "proof" && conclusionEntry.entryClass !== "claim") throw new Error(`${id} 的 proof 必须以 Claim 为结论`);
      return {
        id,
        operationKind: inference.operationKind,
        displayLabel: inference.displayLabel?.trim() || `${inference.operationKind === "proof" ? "证明" : "组织"} ${index + 1}`,
        shortTitle: nonEmpty(inference.shortTitle, `${id}.shortTitle`),
        title: nonEmpty(inference.title, `${id}.title`),
        statement: nonEmpty(inference.statement, `${id}.statement`),
        premises,
        conclusion,
        argument: nonEmpty(inference.argument, `${id}.argument`),
        sourcePath: nonEmpty(inference.sourceLocator, `${id}.sourceLocator`),
        governanceState: "external_import",
      };
    });
    if (!normalizedEntries.length) throw new Error("DeepSeek 没有提取出任何数学 Entry");
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
        boundaryLabel: "论文导入候选地图 · 未执行正式准入",
        adapterOptions: {},
      },
      derivedResearchState: {
        mathematicalState: { b0ClaimEntryIds: [] },
        researchOverlay: { loopTargetEntryId: initialFocusId },
      },
      entries: [],
      inferences: [],
      candidateEntries: normalizedEntries,
      candidateInferences: normalizedInferences,
      historicalCandidateEntries: [],
      historicalCandidateInferences: [],
    };
  }

  async function requestCandidateProjectView({ endpoint, apiKey, model, fileName, pageCount, text, fetchImpl = globalThis.fetch, signal } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("当前浏览器不支持网络请求");
    const key = nonEmpty(apiKey, "API Key");
    const response = await fetchImpl(endpointUrl(endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: nonEmpty(model, "模型名称"),
        messages: [{ role: "user", content: extractionPrompt({ fileName, pageCount, text }) }],
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
      throw new Error(`DeepSeek 请求失败（HTTP ${response.status}）：${message || "没有错误详情"}`);
    }
    let envelope;
    try { envelope = JSON.parse(responseText); }
    catch { throw new Error("DeepSeek 响应不是有效 JSON"); }
    return candidateProjectView(parseModelJson(envelope.choices?.[0]?.message?.content), { fileName });
  }

  return Object.freeze({
    PROJECT_VIEW_SCHEMA,
    SEMANTIC_MODEL,
    MAX_PDF_BYTES,
    MAX_PAPER_TEXT_CHARS,
    endpointUrl,
    extractPdfText,
    parseModelJson,
    candidateProjectView,
    requestCandidateProjectView,
  });
});
