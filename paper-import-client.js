(function publishPaperImportClient(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaPaperImportClient = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperImportClient(root) {
  "use strict";

  const productionFacade = root?.CMathPaperImportProductionFacade
    ?? (typeof require === "function" ? require("./src/paper-import/production/index.js") : null);
  if (!productionFacade
    || typeof productionFacade.endpointUrl !== "function"
    || typeof productionFacade.requestPaperProjectView !== "function"
    || typeof productionFacade.requestPaperProductionSemanticPipeline !== "function"
    || typeof productionFacade.requestPaperProductionImport !== "function"
    || !productionFacade.FROZEN_WORKFLOW) {
    throw new Error("CMath Production Paper Import facade 没有加载（src/paper-import/production/index.js）");
  }

  const PROJECT_VIEW_SCHEMA = productionFacade.FROZEN_WORKFLOW.projectViewVersion;
  const SEMANTIC_MODEL = "cmath.fact-claim-operation/v0.1";
  const CHANNEL_SCHEMA = "cmath-gamma.project-channel/v0.1";
  const MAX_PDF_BYTES = 25 * 1024 * 1024;
  // ── Frozen Production Reproduction (ADR-0005) ──
  // The production facade owns this identity; the client preserves the same
  // object identity for compatibility callers.
  const FROZEN_WORKFLOW = productionFacade.FROZEN_WORKFLOW;
  const MAX_PAPER_TEXT_CHARS = 80_000;
  const inferenceModule = root?.CMathPaperInferenceModule
    ?? (typeof require === "function" ? require("./src/paper-import/inference/index.js") : null);
  if (!inferenceModule
    || typeof inferenceModule.assemblyPrompt !== "function"
    || typeof inferenceModule.paperProjectView !== "function"
    || typeof inferenceModule.findOpenClaims !== "function"
    || typeof inferenceModule.requestPaperInferenceFromEntryArtifact !== "function") {
    throw new Error("CMath Inference Module 没有加载（src/paper-import/inference/index.js）");
  }
  const assemblyPrompt = inferenceModule.assemblyPrompt;
  const paperProjectView = inferenceModule.paperProjectView;
  const findOpenClaims = inferenceModule.findOpenClaims;
  const requestPaperInferenceFromEntryArtifact = inferenceModule.requestPaperInferenceFromEntryArtifact;
  const coreValidation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("./src/paper-import/core/validation.js") : null);
  if (!coreValidation || typeof coreValidation.hasBalancedMathDelimiters !== "function" || typeof coreValidation.validateMathDelimiters !== "function") {
    throw new Error("CMath 核心校验能力没有加载（src/paper-import/core/validation.js）");
  }
  const hasBalancedMathDelimiters = coreValidation.hasBalancedMathDelimiters;
  const validateMathDelimiters = coreValidation.validateMathDelimiters;

  const projectViewCore = root?.CMathPaperProjectView
    ?? (typeof require === "function" ? (() => {
      try { return require("./src/paper-import/core/project-view.js"); } catch { return null; }
    })() : null);
  if (!projectViewCore
    || typeof projectViewCore.normalizeRawProjectView !== "function"
    || typeof projectViewCore.collectRawProjectViewIssues !== "function"
    || typeof projectViewCore.sanitizeRawProjectView !== "function"
    || typeof projectViewCore.applyIntegration !== "function"
    || typeof projectViewCore.isReferenceLabelName !== "function") {
    throw new Error("CMath Project View 能力没有加载（src/paper-import/core/project-view.js）");
  }
  const normalizeRawProjectView = projectViewCore.normalizeRawProjectView;
  const collectRawProjectViewIssues = projectViewCore.collectRawProjectViewIssues;
  const sanitizeRawProjectView = projectViewCore.sanitizeRawProjectView;
  const applyIntegration = projectViewCore.applyIntegration;
  const isReferenceLabelName = projectViewCore.isReferenceLabelName;

  const entryModule = root?.CMathPaperEntryModule
    ?? (typeof require === "function" ? (() => {
      try { return require("./src/paper-import/entry/index.js"); } catch { return null; }
    })() : null);
  if (!entryModule
    || typeof entryModule.entryReviewPrompt !== "function"
    || typeof entryModule.applyEntryReviewPatches !== "function"
    || typeof entryModule.requestPaperEntryArtifact !== "function"
    || typeof entryModule.createPaperEntryArtifact !== "function"
    || typeof entryModule.validatePaperEntryArtifact !== "function") {
    throw new Error("CMath Entry Module 没有加载（src/paper-import/entry/index.js）");
  }
  const entryReviewPrompt = entryModule.entryReviewPrompt;
  const applyEntryReviewPatches = entryModule.applyEntryReviewPatches;
  const requestPaperEntryArtifact = entryModule.requestPaperEntryArtifact;

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
    let truncated = false;
    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const text = pageText((await page.getTextContent()).items);
        pages.push(`[[PAGE ${pageNumber}]]\n${text}`);
        try { onProgress?.({ stage: "read", page: pageNumber, pageCount }); } catch { /* 进度回调不影响主流程 */ }
        if (pages.join("\n\n").length > maxChars) {
          truncated = true;
          break;
        }
      }
    } finally {
      await document.destroy?.();
    }
    let text = pages.join("\n\n").trim();
    if (text.length > maxChars) {
      truncated = true;
      text = `${text.slice(0, maxChars).trimEnd()}\n\n[文本超过 ${maxChars.toLocaleString()} 字符，仅处理前 ${maxChars.toLocaleString()} 字符]`;
    }
    if (!text.replace(/\[\[PAGE \d+\]\]/gu, "").trim()) {
      throw new Error("这份 PDF 没有可提取的文本层，当前版本暂不支持扫描版 OCR");
    }
    return Object.freeze({ text, pageCount, truncated });
  }

  // 分段提取（并行）：模型只输出紧凑 Entry，displayLabel/title 等冗余字段由系统生成，
  // 直接砍掉约三分之一的输出 token（这是导入耗时的主要来源）。
  function entriesPrompt({ fileName, pageCount, text, pageRange = null }) {
    const rangeNote = pageRange
      ? `本段覆盖第 ${pageRange.first}–${pageRange.last} 页（全文共 ${pageCount} 页；其余页由并行通道处理，无需兼顾，也不要重复提取本段之外的对象）。本段开头与上一段末尾可能有 1 页重叠，供你理解前文记号；重叠页中的对象允许重复提取，下游会自动合并。`
      : `全文共 ${pageCount} 页。`;
    return `你是数学论文结构化编辑器。请忠实整理论文的指定段落，不评价结果真伪，也不要补造论文没有的结果。\n\n`
      + `任务：只提取本段中的数学对象（Entry），紧凑输出一个 JSON 对象，不要 Markdown。推导关系（Inference）与 B0 清单由后续步骤统一装配，本步一律不要输出。\n\n`
      + `【语言要求】name 与 statement 一律使用简体中文撰写，可从原文翻译转写；数学符号与公式保留 $...$ / $$...$$；id 使用英文小写 slug。\n\n`
      + `提取规则：\n`
      + `- type 只能是 definition|algorithm|calculation|lemma|proposition|theorem；前三者是 Fact，后三者是 Claim。论文明确提出但未证明的数学陈述仍是正式 Claim；不要创建 conjecture、candidate 或 draft 类型。\n`
      + `- 完整提取本段中所有明确编号或命名的 definition、algorithm、calculation、lemma、proposition、theorem，以及论证实际调用的外部结果（包括证明正文中明确提及但论文未自行证明的外部定理/引理/命题，例如横截同伦定理、Sard 定理、Poincaré–Hopf 定理等）；不要把一般说明段落拆成 Entry。\n`
      + `- 外部结果（论文未证明、直接调用的定理/引理/命题）必须标记 "external":true 并填写非空 source（所引文献名、作者或正文引用位置等确切信息；严禁臆造外部书籍的具体页码；若论文只提及定理名，source 填写定理名与可见的作者信息即可）。论文自己证明的结果与 Fact 绝不能标记 external。\n`
      + `- num 填写论文中的原编号（正整数，例如「定理 8」填 8）；若编号含小数点（如 "Lemma 2.20"）或没有编号，省略 num 字段。\n`
      + `- name 必须是数学短名（如「映射度」「Sard 定理」），严禁只填论文的引用编号（如 "Lemma 2.20"、"定理 3.5"、"推论 2.24"）。\n`
      + `- statement 最多 300 个字符，在不遗漏假设、量词和关键依赖的前提下简洁转写。\n`
      + `- page 填写该对象实际出现的页码，只引用文本中的 [[PAGE N]] 页码，输出整数。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，必须成对闭合，不要输出裸 TeX。保留论文原有假设、量词和局部约定。\n\n`
      + `JSON 形状：\n`
      + `{"entries":[{"id":"paper:def:degree-map","type":"definition","num":1,"name":"映射度","statement":"……","page":4},{"id":"paper:b0:sard","type":"theorem","name":"Sard 定理","statement":"……","page":4,"external":true,"source":"Sard, 1942"}]}\n\n`
      + `论文文件：${fileName}\n${rangeNote}\n\n论文文本（指定段落）：\n${text}`;
  }

  function parseModelJson(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("模型服务没有返回 JSON 内容");
    const trimmed = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    try { return JSON.parse(trimmed); }
    catch (error) { throw new Error(`模型服务返回的内容不是有效 JSON：${error.message}`); }
  }

  // 分段输出的即时诊断（返还模型修复前检查）
  function collectChunkEntryIssues(entries) {
    const issues = [];
    const VALID_TYPES = new Set(["definition", "algorithm", "calculation", "lemma", "proposition", "theorem"]);
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push(`第 ${index + 1} 个条目不是对象`);
        return;
      }
      const label = entry.id || `第 ${index + 1} 个条目`;
      const type = entry.type ?? entry.kind ?? entry.factKind ?? entry.claimKind;
      if (!VALID_TYPES.has(type)) issues.push(`${label} 的 type 无效（只能 definition|algorithm|calculation|lemma|proposition|theorem）`);
      if (typeof entry.id !== "string" || !entry.id.trim()) issues.push(`第 ${index + 1} 个条目缺少 id`);
      const name = entry.name ?? entry.title ?? entry.shortTitle;
      if (typeof name !== "string" || !name.trim()) {
        issues.push(`${label} 缺少 name`);
      } else if (isReferenceLabelName(name)) {
        issues.push(`${label} 的 name 只是引用编号（${name.trim()}）：name 必须是数学短名（如「映射度」「Sard 定理」）`);
      }
      if (typeof entry.statement !== "string" || !entry.statement.trim()) {
        issues.push(`${label} 缺少 statement`);
      } else if (!hasBalancedMathDelimiters(entry.statement)) {
        issues.push(`${label} 的 statement 数学公式定界符 $ 未配对`);
      }
      if (!Number.isInteger(entry.page) && typeof entry.sourceLocator !== "string") issues.push(`${label} 缺少 page`);
      if (entry.external === true && !(entry.source ?? entry.sourceReference)) issues.push(`${label} 标记为外部结果但缺少 source`);
    });
    if (!entries.length) {
      issues.unshift(`未提取到任何 Entry；若本段确实没有编号或命名的数学对象请原样输出 {"entries":[]}，否则必须完整提取`);
    }
    return issues;
  }

  function chunkRepairPrompt(issues) {
    return `你的上一次输出存在以下问题：\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}\n\n`
      + `请只输出修复后的完整 JSON（{"entries":[...]}），形状与之前一致；不要删除论文中真实存在的数学对象，优先修正字段。`;
  }

  // 按 [[PAGE N]] 标记把全文切成若干连续页段，供并行提取。
  // 相邻分段重叠 overlapPages 页：段边界附近的记号约定/前文引用对后一段保持可见，
  // 重叠页中重复提取的对象由下游去重合并。
  function splitTextIntoChunks(text, maxChunks, overlapPages = 0) {
    const segments = String(text).split(/(?=\[\[PAGE \d+\]\])/u).map((segment) => segment.trim()).filter(Boolean);
    if (segments.length <= 1 || maxChunks <= 1) return [String(text)];
    const chunkCount = Math.min(maxChunks, segments.length);
    const total = segments.reduce((sum, segment) => sum + segment.length, 0);
    const target = Math.ceil(total / chunkCount);
    const chunks = [];
    let current = [];
    let currentLength = 0;
    segments.forEach((segment, index) => {
      const remainingAfterThis = segments.length - index - 1;
      const slotsAfterClose = chunkCount - chunks.length - 1;
      // 关闭当前段的条件：超长、还有剩余配额、且剩余页段足够填满后续每个分段
      if (current.length && currentLength + segment.length > target && slotsAfterClose > 0 && remainingAfterThis >= slotsAfterClose - 1) {
        chunks.push(current);
        current = [];
        currentLength = 0;
      }
      current.push(segment);
      currentLength += segment.length + 2;
    });
    if (current.length) chunks.push(current);
    return chunks.map((segmentsInChunk, index) => {
      const overlap = index > 0 && overlapPages > 0 ? chunks[index - 1].slice(-overlapPages) : [];
      return [...overlap, ...segmentsInChunk].join("\n\n");
    });
  }

  function pageRangeOf(chunk) {
    const pages = [...String(chunk).matchAll(/\[\[PAGE (\d+)\]\]/gu)].map((match) => Number(match[1]));
    if (!pages.length) return null;
    return { first: Math.min(...pages), last: Math.max(...pages) };
  }

  function entriesOfChunkResponse(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
    return [];
  }

  // 整合调用：分段并行提取后、装配前，让模型对全量 Entry 目录做语义整合
  // （识别跨段重复、修正不规范命名）。输入输出都很小，失败可整体跳过。
  function integrationPrompt({ fileName, catalog }) {
    return `你是数学论文结构化编辑器的整合模块。下面是一篇论文经不同页段并行提取后合并的 Entry 目录，`
      + `可能存在同一对象被重复提取（名称略有差异）或命名不规范的情况。\n\n`
      + `任务：只输出一个 JSON 对象，不要 Markdown：\n`
      + `- "aliases"：把重复条目的 id 映射到应保留的 id（保留页码靠前、信息更完整的那个）。形如 {"重复id":"保留id"}。\n`
      + `- "renames"：仅当 name 明显不规范时才改（如只剩引用编号 "Lemma 2.20"），改成数学短名；大多数条目不应需要改名。形如 [{"id":"...","name":"..."}]。\n`
      + `- 只有高度确信的重复才合并（同一数学对象、陈述一致）；拿不准的一律不动。没有需要处理的就输出 {"aliases":{},"renames":[]}。\n\n`
      + `论文文件：${fileName}\n\nEntry 目录：\n${catalog}`;
  }

  function integrationCatalogLine(entry) {
    const type = entry.type ?? entry.kind ?? entry.factKind ?? entry.claimKind ?? "?";
    const name = entry.name ?? entry.shortTitle ?? entry.title ?? "";
    const page = Number.isInteger(entry.page) ? entry.page : null;
    const statement = typeof entry.statement === "string" ? entry.statement.replace(/\s+/gu, " ").slice(0, 80) : "";
    const external = entry.external === true || entry.sourceReference ? "｜外部结果" : "";
    return `- ${entry.id}｜${type}｜${name}${page !== null ? `｜p${page}` : ""}${external}｜${statement}`;
  }

  return Object.freeze({
    PROJECT_VIEW_SCHEMA,
    SEMANTIC_MODEL,
    FROZEN_WORKFLOW,
    MAX_PDF_BYTES,
    MAX_PAPER_TEXT_CHARS,
    endpointUrl: productionFacade.endpointUrl,
    extractPdfText,
    entriesPrompt,
    assemblyPrompt,
    parseModelJson,
    hasBalancedMathDelimiters,
    validateMathDelimiters,
    normalizeRawProjectView,
    collectRawProjectViewIssues,
    sanitizeRawProjectView,
    applyIntegration,
    splitTextIntoChunks,
    paperProjectView,
    findOpenClaims,
    entryReviewPrompt,
    applyEntryReviewPatches,
    requestPaperEntryArtifact,
    requestPaperInferenceFromEntryArtifact,
    requestPaperProjectView: productionFacade.requestPaperProjectView,
    requestPaperProductionSemanticPipeline: productionFacade.requestPaperProductionSemanticPipeline,
    requestPaperProductionImport: productionFacade.requestPaperProductionImport,
  });
});
