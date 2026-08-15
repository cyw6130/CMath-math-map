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
  const MAX_PAPER_TEXT_CHARS = 80_000;
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

  // 装配：基于全量 Entry 目录与全文，只生成 Inference、B0 与主目标（输出很小）。
  function assemblyPrompt({ fileName, pageCount, text, catalog }) {
    return `你是数学论文结构化编辑器。下面给出一篇论文的 Entry 目录（已提取的数学对象）与全文文本。请通读全文，只输出推理关系与地图元信息，紧凑输出一个 JSON 对象，不要 Markdown，不要输出 Entry 本体。\n\n`
      + `【语言要求】projectTitle 与 argument 一律使用简体中文撰写；数学符号与公式保留 $...$ / $$...$$，必须成对闭合。\n\n`
      + semanticRulesText()
      + `- 【证明依赖】论文中实际给出证明的 Claim 才输出 proof。premises 只列论文证明实际使用且已在 Entry 目录中的直接依赖 id；proof 的 conclusion 严禁同时出现在自己的 premises 中，严禁产生循环证明依赖，也不要为闭合地图而补造依赖。\n`
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
      + `- Inference 总数建议在 30 条以内，只保留论文中明确存在的证明/组织关系。\n\n`
      + `JSON 形状：\n`
      + `{"projectTitle":"……","mainTargetEntryId":"……","b0":["……"],"inferences":[{"type":"proof","premises":["……"],"conclusion":"……","argument":"……","page":5}]}\n\n`
      + `Entry 目录：\n${catalog}\n\n论文文件：${fileName}\n页数：${pageCount}\n\n论文文本：\n${text}`;
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

  /* ------------------------------------------------------------------------
   * 紧凑输出展开与本地机械修复
   *
   * 模型按紧凑 schema 输出（id/type/num/name/statement/page/external/source），
   * 冗余字段（displayLabel/shortTitle/title/sourceLocator）在这里生成；
   * 常见机械瑕疵（缺 operationKind、premises 悬空、循环依赖、$ 未配对、
   * B0 缺 sourceReference、mainTargetEntryId 缺失等）在这里就地修复或降级，
   * 不再为此让模型整份重发重生成——重试只留给结构性坏输出。
   * ------------------------------------------------------------------------ */

  function escapeUnescapedDollars(text) {
    let out = "";
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "$") {
        let backslashes = 0;
        let j = out.length - 1;
        while (j >= 0 && out[j] === "\\") { backslashes += 1; j -= 1; }
        if (backslashes % 2 === 0) out += "\\";
      }
      out += text[i];
    }
    return out;
  }

  function isCompactEntry(entry) {
    return !entry?.entryClass && typeof (entry?.type ?? entry?.kind) === "string";
  }

  function expandCompactEntry(entry, { fileName }) {
    const type = String(entry.type ?? entry.kind).trim();
    const entryClass = FACT_KINDS.has(type) ? "fact" : CLAIM_KINDS.has(type) ? "claim" : "";
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const num = Number.isInteger(entry.num) && entry.num > 0 ? entry.num : null;
    const page = Number.isInteger(entry.page) && entry.page > 0 ? entry.page : null;
    const label = ENTRY_LABELS[type];
    const statement = typeof entry.statement === "string" ? entry.statement.trim() : "";
    const title = name || statement.slice(0, 24);
    return {
      id: typeof entry.id === "string" ? entry.id.trim() : "",
      entryClass,
      ...(entryClass === "fact" ? { factKind: type } : { claimKind: type }),
      ...(num !== null && label && name ? { displayLabel: `${label} · ${num} · ${name}` } : {}),
      shortTitle: title,
      title,
      statement,
      sourceLocator: page !== null
        ? `${fileName}#page=${page}`
        : (typeof entry.sourceLocator === "string" ? entry.sourceLocator : ""),
      ...(typeof entry.source === "string" && entry.source.trim() ? { sourceReference: entry.source.trim() } : {}),
      ...(entry.external === true ? { external: true } : {}),
    };
  }

  function isCompactInference(inference) {
    return !inference?.operationKind && typeof (inference?.type ?? inference?.kind) === "string";
  }

  function expandCompactInference(inference, { fileName }) {
    const page = Number.isInteger(inference.page) && inference.page > 0 ? inference.page : null;
    return {
      ...inference,
      operationKind: String(inference.type ?? inference.kind).trim(),
      sourceLocator: page !== null
        ? `${fileName}#page=${page}`
        : (typeof inference.sourceLocator === "string" ? inference.sourceLocator : ""),
    };
  }

  // 规范化：只做无内容判断的机械处理——展开紧凑 schema、补齐派生字段、
  // 生成缺失 id、合并跨分段重复条目并重映射引用。不做任何「修复性」删改。
  function normalizeRawProjectView(raw, { fileName = "paper.pdf" } = {}) {
    const notes = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { raw, notes };
    const fixed = { ...raw };
    if (!Array.isArray(fixed.entries)) return { raw: fixed, notes };

    const entries = [];
    const entryById = new Map();
    const idRemap = new Map();
    const seenKeys = new Map();
    const generatedIds = new Map();
    const usedIds = new Set();

    const uniqueGeneratedId = (type) => {
      let counter = generatedIds.get(type) ?? 0;
      let candidate;
      do {
        counter += 1;
        candidate = `paper:entry:${type || "object"}:${counter}`;
      } while (usedIds.has(candidate));
      generatedIds.set(type, counter);
      return candidate;
    };

    fixed.entries.forEach((entryRaw, index) => {
      if (!entryRaw || typeof entryRaw !== "object" || Array.isArray(entryRaw)) {
        notes.push(`忽略无法识别的第 ${index + 1} 个 Entry`);
        return;
      }
      const entry = isCompactEntry(entryRaw) ? expandCompactEntry(entryRaw, { fileName }) : { ...entryRaw };
      entry.id = typeof entry.id === "string" ? entry.id.trim() : "";
      const kind = entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
      const kinds = entry.entryClass === "fact" ? FACT_KINDS : CLAIM_KINDS;
      if (!ENTRY_CLASSES.has(entry.entryClass) || !kinds.has(kind)) {
        notes.push(`忽略类型无效的 Entry：${entry.id || `#${index + 1}`}`);
        return;
      }
      // 标题类字段兜底：compact schema 只有 name，rich 输出也可能漏字段
      const titleText = typeof entry.title === "string" ? entry.title.trim() : "";
      const shortTitleText = typeof entry.shortTitle === "string" ? entry.shortTitle.trim() : "";
      const nameFallback = (shortTitleText || titleText).slice(0, 24);
      if (!titleText && nameFallback) entry.title = nameFallback;
      if (!shortTitleText && titleText) entry.shortTitle = titleText.slice(0, 24);
      if (!entry.id) entry.id = uniqueGeneratedId(kind);
      // 同一对象在不同分段被重复提取：按「类型 + 名称」合并，id 重映射到先出现的条目
      const dedupeKey = `${kind}:${(entry.shortTitle || entry.title || "").toLowerCase().replace(/\s+/gu, "")}`;
      if (dedupeKey.length > kind.length + 1 && seenKeys.has(dedupeKey)) {
        const keptId = seenKeys.get(dedupeKey);
        if (keptId !== entry.id) idRemap.set(entry.id, keptId);
        const kept = entryById.get(keptId);
        if (kept && !kept.sourceReference && entry.sourceReference) kept.sourceReference = entry.sourceReference;
        notes.push(`合并重复条目：${entry.id} → ${keptId}`);
        return;
      }
      if (usedIds.has(entry.id)) {
        const regenerated = uniqueGeneratedId(kind);
        notes.push(`Entry id ${entry.id} 重复，后出现的条目改用 ${regenerated}`);
        entry.id = regenerated;
      }
      usedIds.add(entry.id);
      if (dedupeKey.length > kind.length + 1) seenKeys.set(dedupeKey, entry.id);
      entries.push(entry);
      entryById.set(entry.id, entry);
    });

    const remapId = (id) => {
      let current = typeof id === "string" ? id.trim() : "";
      const seen = new Set();
      while (idRemap.has(current) && !seen.has(current)) {
        seen.add(current);
        current = idRemap.get(current);
      }
      return current;
    };

    const inferences = (Array.isArray(fixed.inferences) ? fixed.inferences : [])
      .filter((inference) => inference && typeof inference === "object" && !Array.isArray(inference))
      .map((inference) => {
        const expanded = isCompactInference(inference) ? expandCompactInference(inference, { fileName }) : { ...inference };
        if (typeof expanded.conclusion === "string") expanded.conclusion = remapId(expanded.conclusion);
        if (Array.isArray(expanded.premises)) {
          expanded.premises = [...new Set(expanded.premises.map((value) => remapId(value)).filter(Boolean))];
        }
        return expanded;
      });

    for (const key of ["b0ClaimEntryIds", "b0"]) {
      if (Array.isArray(fixed[key])) fixed[key] = [...new Set(fixed[key].map((value) => remapId(value)).filter(Boolean))];
    }
    if (typeof fixed.mainTargetEntryId === "string") fixed.mainTargetEntryId = remapId(fixed.mainTargetEntryId);

    return { raw: { ...fixed, entries, inferences }, notes };
  }

  // 诊断：在规范化后的输出上收集全部问题（只报告，不修改），
  // 问题清单会返还模型做定点修复。
  // includeOpenPremiseIssues：是否报告「被依赖但未建立」的 Claim（无 proof、不在 b0、
  // 却被其他 proof 引用）。该类问题依赖模型对论文的理解，首轮报告一次即可，
  // 模型坚持保留（如猜想）时不应反复回炉。
  function collectRawProjectViewIssues(raw, { includeOpenPremiseIssues = true } = {}) {
    const issues = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["输出必须是 JSON 对象"];
    if (!Array.isArray(raw.entries)) return ["输出缺少 entries 数组"];
    const entryById = new Map();
    raw.entries.forEach((entry, index) => {
      const label = entry?.id || `第 ${index + 1} 个 Entry`;
      if (!entry || typeof entry !== "object") { issues.push(`${label} 不是对象`); return; }
      if (entry.id) entryById.set(entry.id, entry);
      const kind = entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
      const kinds = entry.entryClass === "fact" ? FACT_KINDS : CLAIM_KINDS;
      if (!ENTRY_CLASSES.has(entry.entryClass) || !kinds.has(kind)) {
        issues.push(`${label} 的数学类型无效（只能是 definition|algorithm|calculation|lemma|proposition|theorem）`);
        return;
      }
      if (typeof entry.statement !== "string" || !entry.statement.trim()) issues.push(`${label} 缺少 statement`);
      if (typeof entry.title !== "string" || !entry.title.trim()) {
        issues.push(`${label} 缺少 title/name`);
      } else if (REF_LABEL_NAME.test(entry.title.trim())) {
        issues.push(`${label} 的名称只是引用编号（${entry.title.trim()}），必须是数学短名（可用 fixedEntries 修复）`);
      }
      if (typeof (entry.sourceLocator ?? entry.sourcePath) !== "string" || !(entry.sourceLocator ?? entry.sourcePath).trim()) {
        issues.push(`${label} 缺少页码定位（page/sourceLocator）`);
      }
      for (const field of ["title", "shortTitle", "displayLabel", "statement"]) {
        if (typeof entry[field] === "string" && !hasBalancedMathDelimiters(entry[field])) {
          issues.push(`${label} 的 ${field} 数学公式定界符 $ 未配对`);
        }
      }
    });
    if (!raw.entries.length) issues.push("没有提取出任何数学 Entry");

    const inferenceList = Array.isArray(raw.inferences) ? raw.inferences : [];
    inferenceList.forEach((inference, index) => {
      const label = inference?.id ? `Inference ${inference.id}` : `第 ${index + 1} 条 Inference`;
      if (!inference || typeof inference !== "object") { issues.push(`${label} 不是对象`); return; }
      const conclusionEntry = typeof inference.conclusion === "string" ? entryById.get(inference.conclusion.trim()) : null;
      if (!conclusionEntry) {
        issues.push(`${label} 的 conclusion ${inference.conclusion ?? "（缺失）"} 不存在于 Entry 目录`);
      }
      const premises = Array.isArray(inference.premises) ? inference.premises.filter((v) => typeof v === "string" && v.trim()) : [];
      if (!premises.length) {
        issues.push(`${label} 的 premises 为空或缺失`);
      } else {
        const dangling = premises.filter((id) => !entryById.has(id.trim()));
        if (dangling.length) issues.push(`${label} 引用了不存在的 premise：${dangling.join("、")}`);
        if (premises.some((id) => id.trim() === inference.conclusion?.trim())) issues.push(`${label} 的 conclusion 同时出现在 premises 中`);
      }
      const operationKind = String(inference.operationKind ?? "").trim();
      if (!OPERATION_KINDS.has(operationKind)) {
        issues.push(`${label} 缺少 operationKind/type（只能 proof|organization）`);
      } else if (conclusionEntry) {
        if (operationKind === "proof" && conclusionEntry.entryClass !== "claim") {
          issues.push(`${label} 是 proof 但以 Fact（${conclusionEntry.id}）为结论：proof 必须以 Claim 为结论`);
        }
        if (operationKind === "organization" && (conclusionEntry.entryClass !== "fact"
          || premises.some((id) => entryById.get(id.trim())?.entryClass !== "fact"))) {
          issues.push(`${label} 是 organization 但涉及 Claim：organization 必须是 Fact 到 Fact`);
        }
      }
      if (typeof inference.argument !== "string" || !inference.argument.trim()) issues.push(`${label} 缺少 argument`);
      for (const field of ["title", "shortTitle", "displayLabel", "statement", "argument"]) {
        if (typeof inference[field] === "string" && !hasBalancedMathDelimiters(inference[field])) {
          issues.push(`${label} 的 ${field} 数学公式定界符 $ 未配对`);
        }
      }
    });

    // 循环证明依赖
    const proofDeps = new Map();
    inferenceList
      .filter((inf) => inf?.operationKind === "proof" && typeof inf?.conclusion === "string")
      .forEach((inf) => {
        const deps = proofDeps.get(inf.conclusion) ?? new Set();
        (Array.isArray(inf.premises) ? inf.premises : []).forEach((premise) => {
          if (typeof premise === "string") deps.add(premise.trim());
        });
        proofDeps.set(inf.conclusion, deps);
      });
    const visitState = new Map();
    const path = [];
    let cycleReported = false;
    function detectCycle(node) {
      if (cycleReported) return;
      visitState.set(node, 1);
      path.push(node);
      for (const dep of proofDeps.get(node) ?? []) {
        if (visitState.get(dep) === 1) {
          cycleReported = true;
          issues.push(`存在循环证明依赖：${[...path.slice(path.indexOf(dep)), dep].join(" -> ")}`);
          return;
        }
        if (!visitState.get(dep)) detectCycle(dep);
        if (cycleReported) return;
      }
      path.pop();
      visitState.set(node, 2);
    }
    for (const node of proofDeps.keys()) {
      if (!visitState.get(node)) detectCycle(node);
      if (cycleReported) break;
    }

    const b0List = raw.b0ClaimEntryIds ?? raw.b0 ?? raw.derivedResearchState?.mathematicalState?.b0ClaimEntryIds;
    if (!Array.isArray(b0List)) {
      issues.push("未输出 b0 数组（若论文没有调用外部结果请显式输出空数组）");
    } else {
      b0List.forEach((id) => {
        const entry = typeof id === "string" ? entryById.get(id.trim()) : null;
        if (!entry || entry.entryClass !== "claim") {
          issues.push(`b0 引用了非 Claim 或不存在的条目：${id}`);
        } else if (!entry.sourceReference) {
          issues.push(`B0 Claim ${entry.id} 缺少 sourceReference/source（所引文献信息）`);
        }
      });
    }

    const target = raw.mainTargetEntryId ?? raw.derivedResearchState?.researchOverlay?.loopTargetEntryId;
    if (typeof target !== "string" || !target.trim()) {
      issues.push("未输出 mainTargetEntryId（必须指向本文核心目标 Claim）");
    } else if (entryById.get(target.trim())?.entryClass !== "claim") {
      issues.push(`mainTargetEntryId 指向了不存在或非 Claim 的条目：${target}`);
    }

    if (typeof raw.projectTitle !== "string" || !raw.projectTitle.trim()) {
      issues.push("未输出 projectTitle");
    } else if (!hasBalancedMathDelimiters(raw.projectTitle)) {
      issues.push("projectTitle 的数学公式定界符 $ 未配对");
    }

    // 闭包一致性：被 proof 依赖的 Claim 必须要么自己有 proof、要么在 b0
    if (includeOpenPremiseIssues) {
      const b0Set = new Set(Array.isArray(b0List) ? b0List.map((id) => String(id).trim()) : []);
      const provedIds = new Set(inferenceList
        .filter((inf) => inf?.operationKind === "proof" && typeof inf?.conclusion === "string")
        .map((inf) => inf.conclusion.trim()));
      const reliedUpon = new Set();
      inferenceList
        .filter((inf) => inf?.operationKind === "proof" && Array.isArray(inf?.premises))
        .forEach((inf) => inf.premises.forEach((id) => {
          if (typeof id === "string") reliedUpon.add(id.trim());
        }));
      for (const id of reliedUpon) {
        const entry = entryById.get(id);
        if (entry?.entryClass === "claim" && !provedIds.has(id) && !b0Set.has(id)) {
          issues.push(`Claim ${id}（${entry.title}）被证明引用但自身未建立（既无 proof 也不在 b0）：若论文证明了它请补对应 proof；若为外部引用结果请用 fixedEntries 补 "external":true 与 source 并列入 b0；若论文明确未证明则不应作为 premise`);
        }
      }
    }
    return issues;
  }

  // 本地机械修复：模型修复两轮仍失败时的最后兜底（降级会丢失信息，仅在此时启用）
  function sanitizeRawProjectView(raw, { fileName = "paper.pdf" } = {}) {
    const { raw: normalized, notes } = normalizeRawProjectView(raw, { fileName });
    const actions = [...notes];
    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return { raw: normalized, actions };
    if (!Array.isArray(normalized.entries)) return { raw: normalized, actions };
    const fixed = normalized;
    const entries = fixed.entries;
    const entryById = new Map(entries.map((entry) => [entry.id, entry]));

    // 条目级修复：转义未配对定界符
    entries.forEach((entry) => {
      for (const field of ["title", "shortTitle", "displayLabel", "statement"]) {
        if (typeof entry[field] === "string" && !hasBalancedMathDelimiters(entry[field])) {
          entry[field] = escapeUnescapedDollars(entry[field]);
          actions.push(`Entry ${entry.id} 的 ${field} 数学公式定界符未配对，已转义`);
        }
      }
    });

    // ---- Inferences：修 operationKind、断悬空引用、破循环 ----
    const prepared = [];
    fixed.inferences.forEach((inference, index) => {
      const label = inference.id || `第 ${index + 1} 条 Inference`;

      const conclusionEntry = inference.conclusion && entryById.get(inference.conclusion);
      if (!conclusionEntry) {
        actions.push(`丢弃 conclusion 缺失或悬空的 ${label}`);
        return;
      }

      const premises = (Array.isArray(inference.premises) ? inference.premises : [])
        .filter((value) => {
          if (!value) return false;
          if (!entryById.has(value)) {
            actions.push(`${label} 的 premise ${value} 不存在，已移除`);
            return false;
          }
          return true;
        });
      const deduped = [...new Set(premises)];
      if (deduped.includes(inference.conclusion)) {
        actions.push(`${label} 的 conclusion 出现在 premises 中，已移除`);
      }
      inference.premises = deduped.filter((premise) => premise !== inference.conclusion);
      if (!inference.premises.length) {
        actions.push(`丢弃 premises 为空的 ${label}`);
        return;
      }

      let operationKind = String(inference.operationKind ?? "").trim();
      if (!OPERATION_KINDS.has(operationKind)) {
        operationKind = conclusionEntry.entryClass === "claim" ? "proof" : "organization";
        actions.push(`${label} 缺少 operationKind，已按结论类型推断为 ${operationKind}`);
      }
      if (operationKind === "proof" && conclusionEntry.entryClass !== "claim") {
        const allFacts = inference.premises.every((premise) => entryById.get(premise)?.entryClass === "fact");
        if (allFacts) {
          operationKind = "organization";
          actions.push(`${label} 以 Fact 为证明结论，已降级为 organization`);
        } else {
          actions.push(`丢弃以 Fact 为证明结论且前提含 Claim 的 ${label}`);
          return;
        }
      }
      if (operationKind === "organization") {
        const touchesClaim = conclusionEntry.entryClass !== "fact"
          || inference.premises.some((premise) => entryById.get(premise)?.entryClass !== "fact");
        if (touchesClaim) {
          if (conclusionEntry.entryClass === "claim") {
            operationKind = "proof";
            actions.push(`${label} 的 organization 涉及 Claim，已改判为 proof`);
          } else {
            actions.push(`丢弃跨越 Fact/Claim 的 organization ${label}`);
            return;
          }
        }
      }
      inference.operationKind = operationKind;

      if (typeof inference.argument !== "string" || !inference.argument.trim()) {
        inference.argument = "（论证要点从略，详见原文对应页码。）";
        actions.push(`${label} 缺少 argument，已占位`);
      }
      if (typeof inference.sourceLocator !== "string" || !inference.sourceLocator.trim()) {
        const fallback = conclusionEntry.sourceLocator ?? conclusionEntry.sourcePath;
        if (typeof fallback === "string" && fallback.trim()) {
          inference.sourceLocator = fallback;
          actions.push(`${label} 缺少 sourceLocator，已沿用结论条目的定位`);
        }
      }
      for (const field of ["title", "shortTitle", "displayLabel", "statement", "argument"]) {
        if (typeof inference[field] === "string" && !hasBalancedMathDelimiters(inference[field])) {
          inference[field] = escapeUnescapedDollars(inference[field]);
          actions.push(`${label} 的 ${field} 数学公式定界符未配对，已转义`);
        }
      }
      prepared.push(inference);
    });

    // 循环证明依赖：按出现顺序保留边，发现成环即丢弃该条 proof
    const keptDeps = new Map();
    const reachable = (from, target) => {
      const stack = [from];
      const seen = new Set([from]);
      while (stack.length) {
        const node = stack.pop();
        if (node === target) return true;
        for (const dep of keptDeps.get(node) ?? []) {
          if (!seen.has(dep)) { seen.add(dep); stack.push(dep); }
        }
      }
      return false;
    };
    const inferences = [];
    prepared.forEach((inference) => {
      if (inference.operationKind === "proof") {
        if (inference.premises.some((premise) => reachable(premise, inference.conclusion))) {
          actions.push(`丢弃形成循环证明依赖的 proof（结论 ${inference.conclusion}）`);
          return;
        }
        const deps = keptDeps.get(inference.conclusion) ?? new Set();
        inference.premises.forEach((premise) => deps.add(premise));
        keptDeps.set(inference.conclusion, deps);
      }
      inferences.push(inference);
    });

    // ---- B0 清单：缺清单时按 external 标记推导，缺来源时按条目名补齐 ----
    let b0List = fixed.b0ClaimEntryIds ?? fixed.b0 ?? fixed.derivedResearchState?.mathematicalState?.b0ClaimEntryIds;
    if (!Array.isArray(b0List)) {
      b0List = entries.filter((entry) => entry.entryClass === "claim" && entry.external === true).map((entry) => entry.id);
      actions.push(b0List.length ? "模型未输出 B0 清单，已按 external 标记推导" : "模型未输出 B0 清单，按空清单处理");
    }
    fixed.b0ClaimEntryIds = [...new Set(b0List.filter((id) => {
      if (id && entryById.get(id)?.entryClass === "claim") return true;
      actions.push(`B0 清单移除非 Claim 条目：${id || "（空）"}`);
      return false;
    }))];
    fixed.b0ClaimEntryIds.forEach((id) => {
      const entry = entryById.get(id);
      if (entry && !entry.sourceReference) {
        entry.sourceReference = entry.title || entry.shortTitle || id;
        actions.push(`B0 Claim ${id} 缺少 sourceReference，已按条目名称补齐`);
      }
    });

    // ---- 主目标与标题兜底 ----
    const target = fixed.mainTargetEntryId ?? fixed.derivedResearchState?.researchOverlay?.loopTargetEntryId;
    if (target && entryById.get(target)?.entryClass === "claim") {
      fixed.mainTargetEntryId = target;
    } else {
      const claims = entries.filter((entry) => entry.entryClass === "claim");
      const proved = new Set(inferences.filter((inf) => inf.operationKind === "proof").map((inf) => inf.conclusion));
      const b0Set = new Set(fixed.b0ClaimEntryIds);
      const pick = [...claims].reverse().find((entry) => proved.has(entry.id) && !b0Set.has(entry.id))
        ?? [...claims].reverse().find((entry) => !b0Set.has(entry.id))
        ?? claims.at(-1);
      if (pick) {
        fixed.mainTargetEntryId = pick.id;
        actions.push(`mainTargetEntryId 缺失或无效，已回退为 ${pick.id}`);
      }
    }
    if (typeof fixed.projectTitle === "string" && fixed.projectTitle.trim()) {
      const trimmed = fixed.projectTitle.trim();
      if (!hasBalancedMathDelimiters(trimmed)) {
        fixed.projectTitle = escapeUnescapedDollars(trimmed);
        actions.push("projectTitle 的数学公式定界符未配对，已转义");
      } else {
        fixed.projectTitle = trimmed;
      }
    } else {
      const stem = String(fileName).replace(/\.pdf$/iu, "").trim();
      fixed.projectTitle = stem || "论文导入地图";
      actions.push("模型未输出 projectTitle，已按文件名生成");
    }

    return { raw: { ...fixed, inferences }, actions };
  }

  // 分段输出的即时诊断（返还模型修复前检查）
  const REF_LABEL_NAME = /^(lemma|proposition|theorem|corollary|conjecture|definition|claim|remark|example|定理|引理|命题|推论|猜想|定义|备注|例)\s*[\d.]+$/iu;

  function collectChunkEntryIssues(entries) {
    const issues = [];
    const VALID_TYPES = new Set([...FACT_KINDS, ...CLAIM_KINDS]);
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
      } else if (REF_LABEL_NAME.test(name.trim())) {
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

  function assemblyRepairPrompt(issues) {
    return `你的上一次输出校验未通过，存在以下问题：\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}\n\n`
      + `【修复要求】\n`
      + `- 只输出修复后的完整 JSON：{"projectTitle","mainTargetEntryId","b0","inferences"}，形状与之前一致。\n`
      + `- 若问题出在 Entry 本体（缺少 source、statement 缺失或公式定界符未配对等），在 JSON 顶层增加 "fixedEntries" 数组，放入这些 Entry 的完整修正版本（id 不变，字段与 Entry 提取的紧凑形状一致）；若某个 premise/conclusion 指向的条目在目录中不存在，也在 fixedEntries 中补充该条目（新 id，完整字段）后再引用它。其余 Entry 不要重复输出。\n`
      + `- 不要为了消除错误而删除论文中真实存在的证明关系；优先修正 premises/conclusion 指向或补齐字段。\n`
      + `- 循环证明依赖必须断开：删除或调整成环的 proof。`;
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

  // 应用整合结果：校验 alias/rename 的合法性（目标必须存在、不成环、命名合法），
  // 非法项丢弃；整合输出整体非法时由调用方决定跳过。
  function applyIntegration(entries, raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { entries, aliasCount: 0, renameCount: 0 };
    const indexById = new Map();
    entries.forEach((entry, index) => {
      const id = typeof entry?.id === "string" ? entry.id.trim() : "";
      if (id && !indexById.has(id)) indexById.set(id, index);
    });

    const aliasMap = new Map();
    const aliases = raw.aliases && typeof raw.aliases === "object" && !Array.isArray(raw.aliases) ? raw.aliases : {};
    for (const [dupRaw, keepRaw] of Object.entries(aliases)) {
      const dup = String(dupRaw).trim();
      const keep = String(keepRaw).trim();
      if (dup && keep && dup !== keep && indexById.has(dup) && indexById.has(keep)) aliasMap.set(dup, keep);
    }
    const resolveAlias = (id) => {
      const seen = new Set();
      let current = id;
      while (aliasMap.has(current) && !seen.has(current)) {
        seen.add(current);
        current = aliasMap.get(current);
      }
      return current;
    };

    const merged = [];
    let aliasCount = 0;
    entries.forEach((entry) => {
      const id = typeof entry?.id === "string" ? entry.id.trim() : "";
      const target = id && aliasMap.has(id) ? resolveAlias(id) : id;
      if (target && target !== id && indexById.has(target)) {
        // 重复条目：把来源信息并回保留条目后丢弃
        const kept = entries[indexById.get(target)];
        if (kept && typeof kept === "object") {
          const source = entry.source ?? entry.sourceReference;
          if (source && !(kept.source ?? kept.sourceReference)) {
            if ("source" in kept || !("sourceReference" in kept)) kept.source = kept.source ?? source;
            else kept.sourceReference = source;
          }
          if (entry.external === true) kept.external = true;
        }
        aliasCount += 1;
        return;
      }
      merged.push(entry);
    });

    let renameCount = 0;
    const keptIndexById = new Map();
    merged.forEach((entry, index) => {
      const id = typeof entry?.id === "string" ? entry.id.trim() : "";
      if (id && !keptIndexById.has(id)) keptIndexById.set(id, index);
    });
    const renames = Array.isArray(raw.renames) ? raw.renames : [];
    for (const rename of renames) {
      if (!rename || typeof rename !== "object" || Array.isArray(rename)) continue;
      const id = typeof rename.id === "string" ? rename.id.trim() : "";
      const name = typeof rename.name === "string" ? rename.name.trim() : "";
      if (!id || !name || name.length > 60 || REF_LABEL_NAME.test(name) || !keptIndexById.has(id)) continue;
      const entry = merged[keptIndexById.get(id)];
      if (isCompactEntry(entry)) {
        entry.name = name;
      } else {
        entry.title = name;
        entry.shortTitle = name.slice(0, 24);
      }
      renameCount += 1;
    }
    return { entries: merged, aliasCount, renameCount };
  }

  function entryCatalogLine(entry) {
    const type = entry.type ?? entry.kind ?? entry.factKind ?? entry.claimKind ?? "?";
    const name = entry.name ?? entry.shortTitle ?? entry.title ?? "";
    const external = entry.external === true || entry.sourceReference ? "｜外部结果" : "";
    return `- ${entry.id}｜${type}｜${name}${external}`;
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
    const b0MissingSourceReference = [];
    b0ClaimEntryIds.forEach((id) => {
      const entry = entryById.get(id);
      if (!entry || entry.entryClass !== "claim") throw new Error(`B0 必须引用 Claim：${id}`);
      if (!entry.sourceReference) b0MissingSourceReference.push(id);
    });
    if (b0MissingSourceReference.length) {
      throw new Error(`B0 Claim ${b0MissingSourceReference.join("、")} 必须包含 sourceReference`);
    }

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

  async function requestPaperProjectView({ endpoint, apiKey, model, providerLabel = "模型服务", fileName, pageCount, text, fetchImpl = globalThis.fetch, signal, onStage, maxChunks = 5, reasoningEffort } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("当前浏览器不支持网络请求");
    const key = nonEmpty(apiKey, "API Key");
    const modelName = nonEmpty(model, "模型名称");
    const serviceName = nonEmpty(providerLabel, "模型服务名称");
    const targetUrl = endpointUrl(endpoint);
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch { /* 进度回调不影响主流程 */ } };

    // 只负责收发：HTTP/网络错误直接抛（不重试），返回原始文本与结束原因
    async function executeChatCall(messages, maxTokens) {
      const response = await fetchImpl(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: modelName,
          messages,
          response_format: { type: "json_object" },
          // temperature is intentionally omitted: several upstream providers
          // (e.g. OpenCode Go's Kimi models) only accept their own default (1)
          // and reject any explicit value.
          max_tokens: maxTokens,
          // reasoningEffort 只在调用方显式指定时发送：部分模型（如 OpenCode Go 的
          // deepseek-v4-flash）默认带思维链，会在大任务上烧光 max_tokens 导致空输出。
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
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
      return {
        content: extractMessageText(envelope.choices?.[0]?.message),
        finishReason: envelope.choices?.[0]?.finish_reason,
      };
    }

    // 第一阶段：按页段并行提取紧凑 Entry。每段输出有问题时，把输出连同问题
    // 清单返还给模型定点修复一次（会话式，只重出该段，输出很小）。
    async function extractChunkEntries(chunk, index, chunks) {
      const messages = [{
        role: "user",
        content: entriesPrompt({ fileName, pageCount, text: chunk, pageRange: chunks.length > 1 ? pageRangeOf(chunk) : null }),
      }];
      let entries = [];
      let truncated = false;
      for (let round = 0; round < 2; round += 1) {
        // 上轮被截断（含思维链烧光额度）时，本轮放大输出预算
        const { content, finishReason } = await executeChatCall(messages, truncated ? 32000 : 16000);
        truncated = finishReason === "length";
        let parsed = null;
        let issues;
        if (!content.trim()) {
          issues = [truncated
            ? "输出被截断：请精简每个 statement、只保留本段中明确编号或命名的数学对象"
            : "输出为空：请输出本段的 Entry JSON"];
        } else {
          try {
            parsed = parseModelJson(content);
            entries = entriesOfChunkResponse(parsed);
            issues = collectChunkEntryIssues(entries);
          } catch (error) {
            issues = [`输出不是有效 JSON：${error.message}`];
          }
        }
        if (!issues.length) break;
        if (round === 0) {
          notify("entries-repair", { chunk: index + 1, total: chunks.length, count: issues.length });
          messages.push({ role: "assistant", content }, { role: "user", content: chunkRepairPrompt(issues) });
        }
      }
      return entries;
    }

    async function extractEntriesInParallel() {
      // 段数按论文长度自适应：约 2.5 万字符一段，最多 maxChunks 段；相邻段重叠 1 页
      const chunkBudget = Math.max(1, Math.min(maxChunks, Math.ceil(String(text).length / 25000)));
      const chunks = splitTextIntoChunks(text, chunkBudget, 1);
      notify("request", { chars: String(text).length, chunks: chunks.length });
      const perChunk = new Array(chunks.length).fill(null);
      let done = 0;
      await Promise.all(chunks.map(async (chunk, index) => {
        perChunk[index] = await extractChunkEntries(chunk, index, chunks);
        done += 1;
        notify("entries-progress", { done, total: chunks.length });
      }));
      return perChunk.flat();
    }

    // 整合：对全量 Entry 目录做一次小而快的语义整合（去重/改名）。
    // 输出非法时整体跳过（退回本地合并），HTTP 错误与中断照常抛出。
    async function integrateEntries(entries) {
      if (entries.length < 2) return entries;
      notify("integrate", { entries: entries.length });
      let parsed;
      try {
        const catalog = entries.map(integrationCatalogLine).join("\n");
        const { content } = await executeChatCall(
          [{ role: "user", content: integrationPrompt({ fileName, catalog }) }],
          8000,
        );
        parsed = parseModelJson(content);
      } catch (error) {
        if (signal?.aborted || error?.name === "AbortError" || String(error?.message).includes("HTTP")) throw error;
        notify("integrate-skipped", { reason: error?.message ?? "整合输出不可用" });
        return entries;
      }
      const { entries: merged, aliasCount, renameCount } = applyIntegration(entries, parsed);
      if (aliasCount || renameCount) notify("integrate-applied", { aliasCount, renameCount });
      return merged;
    }

    // 第二阶段：一次小调用装配 Inference / B0 / 主目标。校验问题连同输出返还
    // 模型定点修复（最多两轮）；仍不通过才启用本地机械修复兜底。
    async function assembleInferences(entries) {
      const catalog = entries.map(entryCatalogLine).join("\n");
      notify("assemble", { entries: entries.length });
      const messages = [{ role: "user", content: assemblyPrompt({ fileName, pageCount, text, catalog }) }];
      let lastMerged = null;
      let lastIssues = ["装配没有产出有效输出"];
      let truncated = false;
      for (let round = 0; round < 3; round += 1) {
        const { content, finishReason } = await executeChatCall(messages, truncated ? 32000 : 16000);
        truncated = finishReason === "length";
        notify("response", {});
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
              // 「被依赖但未建立」只在首轮诊断报告：模型坚持保留（如猜想）时不反复回炉
              issues = collectRawProjectViewIssues(normalized, { includeOpenPremiseIssues: round === 0 });
              lastMerged = normalized;
              if (!issues.length) {
                notify("validate", {});
                try {
                  return paperProjectView(normalized, { fileName, requireB0Classification: true });
                } catch (error) {
                  issues = [`系统校验未通过：${error.message}`];
                }
              }
            }
          }
        }
        lastIssues = issues;
        if (round < 2) {
          notify("repair", { reason: `${issues.length} 处问题`, attempt: round + 1 });
          messages.push({ role: "assistant", content }, { role: "user", content: assemblyRepairPrompt(issues) });
        }
      }
      // 模型修复两轮仍未通过：本地机械修复兜底，尽量保住这次导入
      if (lastMerged) {
        const { raw: fixed, actions } = sanitizeRawProjectView(lastMerged, { fileName });
        if (actions.length) notify("autofix", { count: actions.length, actions });
        notify("validate", {});
        try {
          return paperProjectView(fixed, { fileName, requireB0Classification: true });
        } catch (error) {
          throw new Error(`${serviceName} 论文导入失败（模型已修复 2 次）：${error.message}`);
        }
      }
      throw new Error(`${serviceName} 论文导入失败（模型已修复 2 次）：${lastIssues.join("；")}`);
    }

    const entries = await extractEntriesInParallel();
    if (!entries.length) throw new Error(`${serviceName} 论文导入失败：模型服务没有提取出任何数学 Entry`);
    const integratedEntries = await integrateEntries(entries);
    const view = await assembleInferences(integratedEntries);

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
    entriesPrompt,
    assemblyPrompt,
    parseModelJson,
    normalizeRawProjectView,
    collectRawProjectViewIssues,
    sanitizeRawProjectView,
    applyIntegration,
    splitTextIntoChunks,
    paperProjectView,
    findOpenClaims,
    requestPaperProjectView,
  });
});
