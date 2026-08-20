/**
 * @file paper-raw-entry-pool-v1.js
 * Contract, schema validation, and parallel extraction runner for the Raw Entry Pool artifact.
 * Schema: cmath.paper-raw-entry-pool/v1
 * ExtractionModuleVersion: paper-entry-parallel-extraction-v1.3
 */
(function publishPaperRawEntryPool(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperRawEntryPoolV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createPaperRawEntryPoolModule(root) {
  "use strict";

  const RAW_ENTRY_POOL_SCHEMA = "cmath.paper-raw-entry-pool/v1";
  const EXTRACTION_MODULE_VERSION = "paper-entry-parallel-extraction-v1.3";
  const EXTRACTION_MODULE_VERSION_V1_4 = "paper-entry-parallel-extraction-v1.4";
  const EXTRACTION_MODULE_VERSION_V1_5 = "paper-entry-parallel-extraction-v1.5";
  const EXTRACTION_MODULE_VERSION_V1_5_1 = "paper-entry-parallel-extraction-v1.5.1";
  const EXTRACTION_MODULE_VERSION_V1_5_2 = "paper-entry-parallel-extraction-v1.5.2";
  const EXTRACTION_MODULE_VERSION_V1_6 = "paper-entry-parallel-extraction-v1.6";
  const EXTRACTION_MODULE_VERSION_V1_7 = "paper-entry-parallel-extraction-v1.7";
  const EXTRACTION_MODULE_VERSION_V1_8 = "paper-entry-parallel-extraction-v1.8";
  const EXTRACTION_MODULE_VERSION_V1_9 = "paper-entry-parallel-extraction-v1.9";
  const EXTRACTION_MODULE_VERSION_V1_10 = "paper-entry-parallel-extraction-v1.10";
  const EXTRACTION_MODULE_VERSION_V1_11 = "paper-entry-parallel-extraction-v1.11";
  const EXTRACTION_MODULE_VERSION_V1_12 = "paper-entry-parallel-extraction-v1.12";
  const EXTRACTION_MODULE_VERSION_V1_13 = "paper-entry-parallel-extraction-v1.13";
  const EXTRACTION_MODULE_VERSION_V1_14 = "paper-entry-parallel-extraction-v1.14";
  const EXTRACTION_MODULE_VERSION_V1_15 = "paper-entry-parallel-extraction-v1.15";
  const EXTRACTION_MODULE_VERSION_V1_16 = "paper-entry-parallel-extraction-v1.16";
  const VALID_EXTRACTION_MODULE_VERSIONS = Object.freeze([
    "paper-entry-parallel-extraction-v1",
    "paper-entry-parallel-extraction-v1.1",
    "paper-entry-parallel-extraction-v1.2",
    "paper-entry-parallel-extraction-v1.3",
    "paper-entry-parallel-extraction-v1.4",
    "paper-entry-parallel-extraction-v1.5",
    "paper-entry-parallel-extraction-v1.5.1",
    "paper-entry-parallel-extraction-v1.5.2",
    "paper-entry-parallel-extraction-v1.6",
    "paper-entry-parallel-extraction-v1.7",
    "paper-entry-parallel-extraction-v1.8",
    "paper-entry-parallel-extraction-v1.9",
    "paper-entry-parallel-extraction-v1.10",
    "paper-entry-parallel-extraction-v1.11",
    "paper-entry-parallel-extraction-v1.12",
    "paper-entry-parallel-extraction-v1.13",
    "paper-entry-parallel-extraction-v1.14",
    "paper-entry-parallel-extraction-v1.15",
    "paper-entry-parallel-extraction-v1.16",
  ]);
  const CONSOLIDATION_MODULE_VERSION = "paper-entry-consolidation-v1";

  function stripControlCharacters(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  function isObject(val) {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  function nonEmptyString(val, label) {
    if (typeof val !== "string" || !val.trim()) {
      throw new Error(`${label} 必须是非空字符串`);
    }
    return val.trim();
  }

  function hasBalancedMathDelimiters(text) {
    if (typeof text !== "string") return true;
    let inDollarInline = false;
    let inDollarDisplay = false;
    let inParenInline = false;
    let inBracketDisplay = false;
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
        if (inDollarDisplay) {
          if (isDouble) {
            inDollarDisplay = false;
            i += 2;
            continue;
          }
        } else if (inDollarInline) {
          if (!isDouble) {
            inDollarInline = false;
            i += 1;
            continue;
          } else {
            return false;
          }
        } else {
          if (isDouble) {
            inDollarDisplay = true;
            i += 2;
            continue;
          } else {
            inDollarInline = true;
            i += 1;
            continue;
          }
        }
      } else if (!isEscaped && text[i] === "\\" && i + 1 < len) {
        const nextChar = text[i + 1];
        if (nextChar === "(") {
          if (inParenInline) return false;
          inParenInline = true;
          i += 2;
          continue;
        } else if (nextChar === ")") {
          if (!inParenInline) return false;
          inParenInline = false;
          i += 2;
          continue;
        } else if (nextChar === "[") {
          if (inBracketDisplay) return false;
          inBracketDisplay = true;
          i += 2;
          continue;
        } else if (nextChar === "]") {
          if (!inBracketDisplay) return false;
          inBracketDisplay = false;
          i += 2;
          continue;
        }
      }
      i += 1;
    }

    return !inDollarInline && !inDollarDisplay && !inParenInline && !inBracketDisplay;
  }

  function validateMathDelimiters(value, label) {
    if (typeof value !== "string") return;
    if (!hasBalancedMathDelimiters(value)) {
      throw new Error(`${label} 包含未配对的数学公式定界符 $ 或 $$（请确保成对闭合或使用 \\$ 转义）`);
    }
  }

  function splitTextIntoChunks(text, maxChunks, overlapPages = 2) {
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

  function splitTextIntoFixedBlocks(text, baseBlockPages = 2, overlapPages = 1) {
    const segments = String(text).split(/(?=\[\[PAGE \d+\]\])/u).map((segment) => segment.trim()).filter(Boolean);
    if (segments.length <= 1) return [String(text)];

    const pageSize = Math.max(1, baseBlockPages);
    const overlapSize = Math.max(0, overlapPages);
    const blocks = [];

    for (let i = 0; i < segments.length; i += pageSize) {
      const core = segments.slice(i, i + pageSize);
      const overlap = (i > 0 && overlapSize > 0)
        ? segments.slice(Math.max(0, i - overlapSize), i)
        : [];
      blocks.push([...overlap, ...core].join("\n\n"));
    }
    return blocks;
  }

  function splitTextIntoWindows(text, windowPages = 5, overlapPages = 1) {
    const segments = String(text).split(/(?=\[\[PAGE \d+\]\])/u).map((segment) => segment.trim()).filter(Boolean);
    if (segments.length <= 1) return [String(text)];

    const maxPages = Math.max(1, windowPages);
    const overlap = Math.max(0, overlapPages);
    const stride = Math.max(1, maxPages - overlap);
    const blocks = [];

    for (let i = 0; i < segments.length; i += stride) {
      const blockSegments = segments.slice(i, i + maxPages);
      if (blockSegments.length > 0) {
        blocks.push(blockSegments.join("\n\n"));
      }
      if (i + maxPages >= segments.length) {
        break;
      }
    }
    return blocks;
  }

  function pageRangeOf(chunk) {
    const pages = [...String(chunk).matchAll(/\[\[PAGE (\d+)\]\]/gu)].map((match) => Number(match[1]));
    if (!pages.length) return null;
    return { first: Math.min(...pages), last: Math.max(...pages) };
  }

  function cloneJson(val) {
    if (val === undefined) return undefined;
    return JSON.parse(JSON.stringify(val));
  }

  function freezeRawEntryPool(target) {
    if (target === null || typeof target !== "object") return target;
    const propNames = Object.getOwnPropertyNames(target);
    for (const name of propNames) {
      const value = target[name];
      if (value !== null && typeof value === "object") {
        freezeRawEntryPool(value);
      }
    }
    return Object.freeze(target);
  }

  function cleanEntryFields(entry) {
    if (!isObject(entry)) return entry;
    const cleaned = { ...entry };
    for (const key of Object.keys(cleaned)) {
      if (typeof cleaned[key] === "string") {
        cleaned[key] = stripControlCharacters(cleaned[key]);
      }
    }
    return cleaned;
  }

  function entriesPrompt({ fileName, pageCount, text, pageRange = null }) {
    const rangeNote = pageRange
      ? `本段覆盖第 ${pageRange.first}–${pageRange.last} 页（全文共 ${pageCount} 页；其余页由并行通道处理，无需兼顾，也不要重复提取本段之外的对象）。本段开头与上一段末尾可能有 2 页重叠，供你理解前文记号；重叠页中的对象允许重复提取，下游会自动合并。`
      : `全文共 ${pageCount} 页。`;
    return `你是数学论文结构化编辑器。请忠实整理论文的指定段落，不评价结果真伪，也不要补造论文没有的结果。\n\n`
      + `任务：只提取本段中的数学对象（Entry），紧凑输出一个 JSON 对象，不要 Markdown。推导关系（Inference）与 B0 清单由后续步骤统一装配，本步一律不要输出。\n\n`
      + `【语言要求】name 与 statement 一律使用简体中文撰写，可从原文翻译转写；数学符号与公式保留 $...$ / $$...$$；id 使用英文小写 slug。\n\n`
      + `提取规则：\n`
      + `- type 只能是 definition|algorithm|calculation|lemma|proposition|theorem；前三者是 Fact，后三者是 Claim。论文明确提出但未证明的数学陈述仍是正式 Claim；不要创建 conjecture、candidate 或 draft 类型。\n`
      + `- 完整提取本段中所有明确编号或命名的 formal objects，以及正文中引入且在后续构造或论证中被实际使用的每一个具有独立数学意义的对象（即使原文未显式编号）：包括基础定义（definition）、结构相容性引理（lemma）、独立展示的构造/归一化公式（calculation）、独立的不变性与约化步骤（proposition/theorem），以及论证实际调用的外部结果（包括正文中提及但未自行证明的外部定理/引理/命题，如 Sard 定理等）。\n`
      + `- 原子性（Atomicity）：当一段正文、定理或构造同时包含多个可独立引用的数学对象或关键推演步骤时，必须将其拆分为独立的 Entry 输出；切勿把独立的定义、引理或计算公式仅仅打包合并在一个宽泛的大条目中。\n`
      + `- 排除范围：仍然严格排除一般性背景说明、历史介绍、无独立数学角色的例子，以及推导证明过程（Inference/proof）、B0 清单、mainTarget 标记。\n`
      + `- 外部结果（论文未证明、直接调用的定理/引理/命题）必须标记 "external":true 并填写非空 source（所引文献名、作者或正文引用位置等确切信息；严禁臆造外部书籍的具体页码；若论文只提及定理名，source 填写定理名与可见的作者信息即可）。论文自己证明的结果与 Fact 绝不能标记 external。\n`
      + `- num 填写论文中的原编号（正整数，例如「定理 8」填 8）；若编号含小数点（如 "Lemma 2.20"）或没有编号（如未编号定义、公式、引理），省略 num 字段。\n`
      + `- name 必须是数学短名（如「映射度」「Sard 定理」「配分函数归一化」「相容性引理」），严禁只填论文的引用编号（如 "Lemma 2.20"、"定理 3.5"、"推论 2.24"）。\n`
      + `- statement 最多 300 个字符，在不遗漏假设、量词和关键依赖的前提下简洁转写。\n`
      + `- page 填写该对象实际出现的页码，只引用文本中的 [[PAGE N]] 页码，输出整数。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，必须成对闭合，不要输出裸 TeX。保留论文原有假设、量词和局部约定。\n\n`
      + `JSON 形状：\n`
      + `{"entries":[{"id":"paper:def:degree-map","type":"definition","num":1,"name":"映射度","statement":"……","page":4},{"id":"paper:b0:sard","type":"theorem","name":"Sard 定理","statement":"……","page":4,"external":true,"source":"Sard, 1942"}]}\n\n`
      + `论文文件：${fileName}\n${rangeNote}\n\n论文文本（指定段落）：\n${text}`;
  }

  function v14FoundationPrompt({ fileName, pageCount, text, pageRange = null, blockIndex = 0, totalBlocks = 1, bounded = false }) {
    const rangeNote = pageRange
      ? `本块覆盖第 ${pageRange.first}–${pageRange.last} 页（全文共 ${pageCount} 页，当前为第 ${blockIndex + 1}/${totalBlocks} 块；其余页由并行通道处理）。相邻块有 1 页重叠供理解上下文，重叠页中的对象允许重复提取，下游会自动去重。`
      : `全文共 ${pageCount} 页。`;
    return `你是数学论文结构化基础通道（Foundation Lane）编辑器。请忠实整理指定段落中的数学基础对象，不评价真伪，严禁补充论文没有的内容。\n\n`
      + `【本通道职责：只提取基础对象与依赖】\n`
      + `本通道专门负责提取以下四类数学对象：\n`
      + `1. 基础定义与概念（definition）：包括显式定义的数学结构、空间、代数、范畴、态射等。\n`
      + `2. 记号与约定（definition）：论文明确声明的符号记号、全局或局部约定、代数/几何约定。\n`
      + `3. 构造与计算公式（algorithm / calculation）：独立展示的构造算法、归一化公式、代表元计算公式。\n`
      + `4. 必要外部引用基础（external foundation）：正文论证实际依赖但未在本文证明的外部经典定理/引理/命题，必须标记 "external":true 并填写非空 source（所引文献或作者；严禁臆造页码）。\n\n`
      + `【严格责任划分与排除范围】\n`
      + `- 论文自身陈述与证明的引理、命题、定理、推论（lemma/proposition/theorem）由并行的 Result 通道专门提取，本通道一律不要提取。\n`
      + `- 严禁推导/证明合成（Inference / proof synthesis）：严禁生成任何推理步骤、证明链条或推导关系。\n`
      + `- 严禁下游决策：严禁生成 B0 清单、mainTarget 标记、Paper Guide、评审意见（Review）或全局装配决策。\n`
      + `- 排除范围：严格排除一般性历史介绍、无独立数学角色的例子。\n\n`
      + (bounded
        ? `- 参考文献表、bibliography、文献标题和作者列表本身不是 Entry。只有正文在定义、定理或论证中明确调用的外部数学结果才可提取。\n`
          + `- 本块最多输出 30 个 Entry。若候选过多，优先保留正文明确定义的对象、实际使用的构造/公式，以及正文论证直接依赖的外部结果；不要枚举外围术语或参考文献。\n\n`
        : "")
      + `【提取规则】\n`
      + `- type 只能是 definition|algorithm|calculation|lemma|proposition|theorem（外部引用基础用 claim 类型并加 external:true）。\n`
      + `- 原子性（Atomicity）：当一段正文包含多个独立基础定义或构造时，必须拆分为独立的 Entry，不要合并在大条目中。\n`
      + `- 语言要求：name 与 statement 一律使用简体中文撰写；数学公式保留 $...$ / $$...$$；id 使用英文小写 slug。\n`
      + `- num 填写论文中的原编号（正整数）；若无或含小数点则省略。\n`
      + `- name 必须是数学短名，严禁只填编号。\n`
      + `- statement 最多 300 字符，保留假设和量词。\n`
      + `- page 填写对象实际出现的页码（整数），只引用文本中的 [[PAGE N]]。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，必须成对闭合。\n\n`
      + `JSON 形状：\n`
      + `{"entries":[{"id":"paper:def:degree-map","type":"definition","num":1,"name":"映射度","statement":"……","page":4}]}\n\n`
      + `论文文件：${fileName}\n${rangeNote}\n\n论文文本（指定段落）：\n${text}`;
  }

  function v14ResultPrompt({ fileName, pageCount, text, pageRange = null, blockIndex = 0, totalBlocks = 1 }) {
    const rangeNote = pageRange
      ? `本块覆盖第 ${pageRange.first}–${pageRange.last} 页（全文共 ${pageCount} 页，当前为第 ${blockIndex + 1}/${totalBlocks} 块；其余页由并行通道处理）。相邻块有 1 页重叠供理解上下文，重叠页中的对象允许重复提取，下游会自动去重。`
      : `全文共 ${pageCount} 页。`;
    return `你是数学论文结构化结果通道（Result Lane）编辑器。请忠实整理指定段落中的显式数学结论，不评价真伪，严禁补充论文没有的内容。\n\n`
      + `【本通道职责：只提取论文显式陈述的数学结论】\n`
      + `本通道专门负责提取论文在正文中明确陈述的数学结果及其精确表述：\n`
      + `1. 引理（lemma）：论文提出或证明的辅助性命题与结构相容性引理。\n`
      + `2. 命题（proposition）：论文提出或证明的性质、约化步骤与不变性命题。\n`
      + `3. 定理（theorem）：论文的主定理、主要数学结论与分类定理。\n`
      + `4. 推论（theorem / proposition / lemma）：由定理或命题直接推得的显式推论。\n\n`
      + `【严格责任划分与排除范围】\n`
      + `- 基础定义、记号约定、算法构造与显式计算公式由并行的 Foundation 通道专门提取，本通道一律不要提取。\n`
      + `- 严禁推导/证明合成（Inference / proof synthesis）：严禁生成任何推理步骤、证明链条或推导关系。只提取结论陈述（Statement），不要提取证明过程。\n`
      + `- 严禁下游决策：严禁生成 B0 清单、mainTarget 标记、Paper Guide、评审意见（Review）或全局装配决策。\n`
      + `- 排除范围：严格排除一般性历史介绍、无独立数学角色的例子。\n\n`
      + `【提取规则】\n`
      + `- type 只能是 lemma|proposition|theorem。\n`
      + `- 原子性（Atomicity）：当一段正文包含多个独立数学结论或步骤时，必须拆分为独立的 Entry。\n`
      + `- 语言要求：name 与 statement 一律使用简体中文撰写；数学公式保留 $...$ / $$...$$；id 使用英文小写 slug。\n`
      + `- num 填写论文中的原编号（正整数）；若无或含小数点则省略。\n`
      + `- name 必须是数学短名，严禁只填编号。\n`
      + `- statement 最多 300 字符，完整忠实转写假设、量词和精确结论。\n`
      + `- page 填写对象实际出现的页码（整数），只引用文本中的 [[PAGE N]]。\n`
      + `- 数学公式使用 $...$ 或 $$...$$，必须成对闭合。\n\n`
      + `JSON 形状：\n`
      + `{"entries":[{"id":"paper:thm:main","type":"theorem","num":1,"name":"主定理","statement":"……","page":4}]}\n\n`
      + `论文文件：${fileName}\n${rangeNote}\n\n论文文本（指定段落）：\n${text}`;
  }

  function v14LanePrompt({ lane, fileName, pageCount, text, pageRange = null, blockIndex = 0, totalBlocks = 1, boundedFoundation = false }) {
    if (lane === "foundation") {
      return v14FoundationPrompt({ fileName, pageCount, text, pageRange, blockIndex, totalBlocks, bounded: boundedFoundation });
    }
    if (lane === "result") {
      return v14ResultPrompt({ fileName, pageCount, text, pageRange, blockIndex, totalBlocks });
    }
    throw new Error(`Unknown lane for v1.4 extraction: ${lane}`);
  }

  function v17DualOutputPrompt({ fileName, pageCount, text, pageRange = null, blockIndex = 0, totalBlocks = 1 }) {
    const rangeNote = pageRange
      ? `本块覆盖第 ${pageRange.first}–${pageRange.last} 页（全文共 ${pageCount} 页，当前为第 ${blockIndex + 1}/${totalBlocks} 块）。相邻块有 1 页重叠；重复对象由下游合并。`
      : `全文共 ${pageCount} 页。`;
    return `你是数学论文结构化提取编辑器。只阅读本段一次，同时完成 Foundation 与 Result 两类 Entry 的提取；忠实于原文，不评价真伪，不补造内容。\n\n`
      + `【Foundation Entries】提取 definition、algorithm、calculation，以及正文实际依赖但本文未证明的外部 lemma/proposition/theorem（后者必须 external:true 并填写可见 source）。\n`
      + `【Result Entries】只提取论文自身明确陈述的 lemma、proposition、theorem、corollary；推论归入最合适的 lemma/proposition/theorem。\n`
      + `同一对象只能放入一个数组。论文自身结果不得放入 foundationEntries；定义、构造和计算不得放入 resultEntries。\n\n`
      + `【为后续 Inference 保留证据，但本步不构造 Inference】\n`
      + `只记录本次 foundationEntries/resultEntries 中 Entry 之间、且原文明示的直接依赖。premiseRefs 与 conclusionRef 必须填写本次输出的 Entry id，不得填写长陈述、公式或未提取对象。relationText 只摘录一句最短的关系证据；同一组前提与结论只保留一次。\n`
      + `inferenceHints 不是证明摘要：严禁逐步复述证明、严禁记录一般性概念共现、严禁把每一句“因此”都变成 hint、严禁为外部未提取对象造占位符。没有两端都能对应本次 Entry 的明确直接关系，就输出空数组。不要为了产生 hint 而降低 Entry 提取完整性。\n\n`
      + `【共同规则】type 只能是 definition|algorithm|calculation|lemma|proposition|theorem；name 和 statement 使用简体中文；id 使用英文小写 slug；statement 最多 300 字符并保留假设、量词和公式；page 只能取 [[PAGE N]] 的整数页码；数学公式用成对的 $...$ 或 $$...$$。正式编号含小数或不存在时省略 num。一般背景、历史介绍、参考文献表、无数学角色的例子不是 Entry。严禁输出 B0、mainTarget、Paper Guide、Review 或正式 Inference。\n\n`
      + `JSON 形状（只输出 JSON）：\n`
      + `{"foundationEntries":[{"id":"paper:def:object","type":"definition","name":"数学对象","statement":"……","page":2}],"resultEntries":[{"id":"paper:thm:result","type":"theorem","name":"形式化结论","statement":"……","page":4}],"inferenceHints":[]}\n\n`
      + `论文文件：${fileName}\n${rangeNote}\n\n论文文本（指定段落）：\n${text}`;
  }

  function v18DualOutputPrompt(options) {
    const base = v17DualOutputPrompt(options);
    const recallRules = `【完整性补充】在保持原子性且不复述证明的前提下，优先检查并独立提取：\n`
      + `- 后续结果实际使用的基础结构定义；即使作者默认读者熟悉，只要本段给出公理、运算或结构条件，就应作为 definition。\n`
      + `- 带有独立名称、公式或可引用结论的中间引理，包括结构相容性、表示/范畴结构以及不变性、等价性、约化步骤。\n`
      + `- 主结果成立所需的不同数学步骤不得压缩进主定理：若原文分别陈述 handle-slide、blow-up、归一化、presentation independence 等性质，应分别提取。\n`
      + `- 明确给出的 modular data、维数、twist、矩阵或归一化常数等成组数据，应形成一个自足的 definition 或 calculation，而不能只散落在其他 statement 中。\n`
      + `不要为了数量拆分纯叙述句；只有能被后续数学论证独立引用的对象才成为 Entry。\n\n`;
    return base.replace("【共同规则】", `${recallRules}【共同规则】`);
  }

  function v19DualOutputPrompt(options) {
    const base = v18DualOutputPrompt(options);
    const dependencyRules = "【主结果支撑回溯】本块出现主定理或核心命题时，回溯并提取本块可见的直接支撑定义、结构、引理、命题和不变性结果。\n"
      + "- handle-slide、blow-up、presentation-independence、normalization、equivalence、compatibility 等可独立引用的性质分别建 Entry。\n"
      + "- 参数、维数、矩阵、twist、归一化常数等成组数据建自足 definition 或 calculation。\n"
      + "- 只提取本块明确陈述或可核验标题/编号的对象，不补造结果，不生成 Inference。\n\n";
    return base.replace("【共同规则】", dependencyRules + "【共同规则】");
  }

  // v1.10 is a single-variable experiment over the frozen v1.7 prompt:
  // tighten Entry boundaries and identity/type selection without changing
  // windowing, model calls, consolidation, or downstream inference.
  function v110DualOutputPrompt(options) {
    const base = v17DualOutputPrompt(options);
    const boundaryRules = `【Entry 边界与唯一性（本版本唯一实验变量）】\n`
      + `- definition 用于定义的数学对象、结构、参数、矩阵或数据；lemma/proposition/theorem 用于原文明确陈述的数学断言。\n`
      + `- 只有原文明确给出可执行步骤或算法流程时才使用 algorithm；只有原文明确给出计算出的恒等式/数值且它不是定义或正式断言时才使用 calculation。结构定义、归一化规则、矩阵/数据和不变性断言不要误分类为 algorithm 或 calculation。\n`
      + `- 一个可独立引用的对象保持一个 Entry：不要把多个独立定义、性质或结果压进一个宽泛 Entry；也不要把同一对象因同义名称、不同语言或窗口重叠拆成多个 ID。跨窗口再次出现时使用相同的稳定英文 slug。\n`
      + `- 仅有概念共现、背景介绍、证明中的临时措辞或纯记号变化，不建立 Entry；不要为了增加数量拆分。\n`
      + `- 输出前逐项检查：每个 Entry 都有独立数学角色、原文证据、准确类型和页码；同一数学对象只出现一次。以上规则只约束 Entry，不允许生成 Inference。\n\n`;
    return base.replace("【共同规则】", boundaryRules + "【共同规则】");
  }

  // v1.11 is a single-variable experiment over v1.10:
  // tighten Entry type decision (lemma vs proposition vs theorem vs remark) without changing
  // boundaries, windowing, model calls, consolidation, or downstream inference.
  function v111DualOutputPrompt(options) {
    const base = v110DualOutputPrompt(options);
    const typeRules = `【类型判定强化（本版本唯一实验变量）】\n`
      + `- 类型必须按原文 cue 词直译：原文写 Definition/定义/称为/denoted/记为 时才用 definition；原文写 Lemma/引理 时用 lemma；Proposition/命题 时用 proposition；Theorem/定理/Corollary/推论 时用 theorem。Remark/Example/Note/Observation 保持 remark，不升格为 lemma/theorem。\n`
      + `- 结构定义、归一化规则、参数/矩阵/数据定义不因“可算”而改判为 calculation；不变性/分类断言不因“构造性”而改判为 algorithm。calculation 仅用于原文已算出且独立成句的数值/恒等式，algorithm 仅用于原文分步可执行的构造流程。\n`
      + `- 同一数学事实只定一种类型：不要把同一引理在不同窗口重复为 theorem 与 lemma 两种类型；跨窗口复现时保持首次判定的稳定类型与英文 slug。\n\n`;
    return base.replace("【共同规则】", typeRules + "【共同规则】");
  }

  // v1.12 is a single-variable experiment over v1.11:
  // add external attribution and cross-window dedup guard without changing
  // boundaries, type rules from v1.11, windowing, model calls, or consolidation.
  function v112DualOutputPrompt(options) {
    const base = v111DualOutputPrompt(options);
    const extRules = `【外部归属与去重（本版本唯一实验变量）】\n`
      + `- 外部性判定：若陈述含引用标记 [n]/作者年份/“due to / see / by” 且非本文证明，置 external:true 并填 sourceReference；本文新证置 external:false。不确定时按正文叙述判定，不因主题重要性臆断外部性。\n`
      + `- 去重：同一数学对象跨窗口仅保留一条，ID 用稳定英文 slug（原文编号或英文短名），禁止中英复写、单复数、大小写变体分两条；若原文 Lemma/Theorem 编号相同则合并为一条。\n`
      + `- 覆盖度：对每个独立编号的 Definition/Lemma/Proposition/Theorem（含 Corollary）至少尝试提取一条 Entry，遗漏编号项计 completeness 缺口。\n\n`;
    return base.replace("【共同规则】", extRules + "【共同规则】");
  }

  // v1.13 is a single-variable experiment over v1.12:
  // enforce coverage of every numbered formal result and infrastructure definition
  // without changing boundaries, type, external rules, windowing, or consolidation.
  function v113DualOutputPrompt(options) {
    const base = v112DualOutputPrompt(options);
    const coverageRules = `【覆盖度强制（本版本唯一实验变量）】\n`
      + `- 必须覆盖所有带编号的形式化陈述：每个 Definition/Theorem/Lemma/Proposition/Corollary（无论是否编号）至少一条；特别检查 Hopf algebra、twist、graphical calculus、finite simple system、Hopf S-matrix、Kirby reduction、quantum trace、handle-slide/blowup/presentation-independence、purified modular 等支撑链条不得整段遗漏。\n`
      + `- 对 Gay-Kirby、Meier-Schirmer-Zupan、Lambert-Cole、Feller 等带引用 [n] 的外部定理，即使在综述段落出现也须单独成条并标 external:true，不因“综述”而跳过。\n`
      + `- 自检：输出前对照页码扫描 1..N 是否每页至少一条与原文编号对应的 Entry，缺失编号即补。\n\n`;
    return base.replace("【共同规则】", coverageRules + "【共同规则】");
  }

  // v1.14 is the generic baseline: it deliberately branches from v1.12 so
  // paper-specific coverage and Gold-aware pruning rules cannot enter the
  // frozen prompt through the v1.13 inheritance chain.
  function v114DualOutputPrompt(options) {
    const base = v112DualOutputPrompt(options);
    const coverageRules = `【通用覆盖与范围收束（本版本唯一实验变量）】\n`
      + `- 覆盖本段中所有明确编号或命名的 formal object；对正文实际使用且具有独立数学意义的未编号对象，也在原文证据充分时提取。\n`
      + `- 正文论证直接调用但本文未证明的外部数学结果，按原文可见归属提取并标记 external:true；不要根据主题、常识或候选答案猜测外部结果。\n`
      + `- 同一数学对象因窗口重叠、同义名称、语言变体或计算碎片重复出现时合并为一个 Entry；只有原文证据表明对象具有独立数学角色时才拆分。\n`
      + `- 计算、公式或局部性质若只是同一正式对象的组成部分，合并进该对象的 statement；若原文将其作为独立可引用对象陈述，则单独提取。\n`
      + `- 严格限制在指定页码和原文证据内；不得从背景知识、参考文献表、后续页码或未出现的对象推断 Entry。\n`
      + `- 输出前逐项核对独立数学角色、原文证据、类型、假设、量词、公式、external/source 与页码；不要为了增加或压低数量而改变提取边界。\n\n`;
    return base.replace("【共同规则】", coverageRules + "【共同规则】");
  }

  // v1.15 is a single-variable experiment over v1.14:
  // enforce statement precision for congruences, winding dimension, and Euler data
  function v115DualOutputPrompt(options) {
    const base = v114DualOutputPrompt(options);
    const precisionRules = `【陈述精度（本版本唯一实验变量）】\n`
      + `- 同余/不等式原样抄录：not ≡1 mod4 不得写成 ≡1 mod4 或 ≤1；b2+ 与 b2- 分开陈述，不可合并为 b2。\n`
      + `- 维数敏感：winding number 的靶 S^{k-1} 随 k 变化，k>1 时不写 S^1；degree 与 winding 的定义域/值域按原文维度标注。\n`
      + `- Euler/示性数不编造公式：χ(T^n)=0 等背景公式以原文为准，不推导 χ(T^k)=-2(k-2) 等错误恒等式；spin^c 条件 b2+≡3 mod4 等按 Bauer 原文逐字保留。\n\n`;
    return base.replace("【共同规则】", precisionRules + "【共同规则】");
  }

  // v1.16 is a single-variable experiment over v1.14 (branch from best 30.17, skip regressed v1.15):
  // restore core proof chain for knot/hopf/4-dim that v1.14 pruned too aggressively
  function v116DualOutputPrompt(options) {
    const base = v114DualOutputPrompt(options);
    const chainRules = `【核心证明链补齐（本版本唯一实验变量）】\n`
      + `- 必补 Hopf 代数定义与4引理：coproduct-monoidal / antipode-duality / R-matrix-braiding / universal-twist 各单条 lemma，不可压成 definition 或 calculation 碎片。\n`
      + `- 必补 4-dim 链：functorial-link-theory 定义与 MWW lasagna 背景点，缺失计 completeness 缺口。\n`
      + `- 必补 winding/degree 链：保留 S^{k-1} 维数与 bump 函数定义，不过度合并。\n\n`;
    return base.replace("【共同规则】", chainRules + "【共同规则】");
  }

  function repairJsonStringEscapes(jsonStr) {
    let inString = false;
    let result = "";
    let repairs = 0;
    const len = jsonStr.length;
    let i = 0;

    while (i < len) {
      const char = jsonStr[i];

      if (!inString) {
        if (char === '"') {
          inString = true;
        }
        result += char;
        i += 1;
      } else {
        if (char === '"') {
          inString = false;
          result += char;
          i += 1;
        } else if (char === "\\") {
          if (i + 1 >= len) {
            result += "\\\\";
            repairs += 1;
            i += 1;
            continue;
          }

          const next = jsonStr[i + 1];

          // Valid JSON escape sequences: \", \\, \/, \b, \f, \n, \r, \t
          if (next === '"' || next === '\\' || next === '/' || next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
            result += "\\" + next;
            i += 2;
          } else if (next === 'u') {
            // \u followed by 4 hexadecimal digits
            const hex = jsonStr.slice(i + 2, i + 6);
            if (hex.length === 4 && /^[0-9a-fA-F]{4}$/.test(hex)) {
              result += "\\u" + hex;
              i += 6;
            } else {
              // TeX macro or invalid unicode escape (e.g. \underbrace, \uparrow, \union)
              result += "\\\\";
              repairs += 1;
              i += 1;
            }
          } else {
            // TeX macro or invalid escape (e.g. \alpha, \mathcal, \operatorname, \{, \$, etc.)
            result += "\\\\";
            repairs += 1;
            i += 1;
          }
        } else {
          result += char;
          i += 1;
        }
      }
    }

    return { text: result, repairs };
  }

  function parseModelJson(content, options = null) {
    const raw = String(content ?? "").trim();
    if (!raw) throw new Error("模型输出为空");

    // 1. Strict parse full string first
    try {
      return JSON.parse(raw);
    } catch (rawParseErr) {
      let candidate = raw;
      let matchedSlice = false;

      if (!(raw.startsWith("{") && raw.endsWith("}")) && !(raw.startsWith("[") && raw.endsWith("]"))) {
        const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/u);
        if (!match) throw new Error(`模型输出不包含有效 JSON 片段: ${raw.slice(0, 200)}`);
        candidate = match[0];
        matchedSlice = true;

        // Try strict parse on extracted codeblock/slice before repair
        try {
          return JSON.parse(candidate);
        } catch (_) {
          // Fall through to conservative repair
        }
      }

      // 2. Conservative repair: scan string boundaries and double illegal bare backslashes
      const { text: repaired, repairs } = repairJsonStringEscapes(candidate);
      if (repairs > 0) {
        try {
          const parsed = JSON.parse(repaired);
          if (options && typeof options === "object") {
            if (options.diagnostics && typeof options.diagnostics === "object") {
              options.diagnostics.repaired = true;
              options.diagnostics.repairCount = (options.diagnostics.repairCount || 0) + repairs;
            }
            if ("repaired" in options || "repairCount" in options) {
              options.repaired = true;
              options.repairCount = (options.repairCount || 0) + repairs;
            }
            if (typeof options.onRepair === "function") {
              options.onRepair({ repairs, original: candidate, repaired });
            }
          }
          return parsed;
        } catch (repairErr) {
          throw new Error(`JSON 修复后解析仍失败: ${repairErr.message}`);
        }
      }

      // 3. No repair was possible / applicable -> fail closed with parse error
      if (matchedSlice) {
        JSON.parse(candidate);
      }
      throw rawParseErr;
    }
  }

  function validateRawEntryPool(pool) {
    if (!isObject(pool)) {
      throw new Error("Raw Entry Pool 必须是非空 JSON 对象");
    }
    if (pool.schema !== RAW_ENTRY_POOL_SCHEMA) {
      throw new Error(`无效的 raw pool schema: 预期 "${RAW_ENTRY_POOL_SCHEMA}"，实际收到 "${pool.schema}"`);
    }
    if (!VALID_EXTRACTION_MODULE_VERSIONS.includes(pool.extractionModuleVersion)) {
      throw new Error(`无效的 extractionModuleVersion: 预期 "${EXTRACTION_MODULE_VERSION}"、"paper-entry-parallel-extraction-v1.2"、"paper-entry-parallel-extraction-v1.1" 或 "paper-entry-parallel-extraction-v1"，实际收到 "${pool.extractionModuleVersion}"`);
    }

    if (!isObject(pool.source)) {
      throw new Error("pool.source 必须是对象");
    }
    nonEmptyString(pool.source.fileName, "pool.source.fileName");
    if (!Number.isInteger(pool.source.pageCount) || pool.source.pageCount < 1) {
      throw new Error(`pool.source.pageCount 必须是正整数，收到 ${pool.source.pageCount}`);
    }
    nonEmptyString(pool.source.sourceText, "pool.source.sourceText");
    if (typeof pool.source.characters !== "number" || pool.source.characters !== pool.source.sourceText.length) {
      throw new Error(`pool.source.characters (${pool.source.characters}) 与 sourceText.length (${pool.source.sourceText.length}) 不一致`);
    }
    if (pool.source.pageCount > 1 && !pool.source.sourceText.includes("[[PAGE ")) {
      throw new Error("多页论文 sourceText 必须包含 [[PAGE x]] 页码标记");
    }

    if (!Array.isArray(pool.chunks) || pool.chunks.length === 0) {
      throw new Error("pool.chunks 必须是非空数组");
    }
    for (let i = 0; i < pool.chunks.length; i += 1) {
      const chunk = pool.chunks[i];
      if (!isObject(chunk)) throw new Error(`chunks[${i}] 必须是对象`);
      if (typeof chunk.chunkIndex !== "number") throw new Error(`chunks[${i}].chunkIndex 必须是数字`);
      if (typeof chunk.text !== "string" || !chunk.text.trim()) throw new Error(`chunks[${i}].text 必须是非空字符串`);
      if (!Array.isArray(chunk.rawEntries)) throw new Error(`chunks[${i}].rawEntries 必须是数组`);
    }

    if (!Array.isArray(pool.rawEntries)) {
      throw new Error("pool.rawEntries 必须是数组");
    }

    if (!isObject(pool.diagnostics)) {
      throw new Error("pool.diagnostics 必须是对象");
    }
    if (typeof pool.diagnostics.durationMs !== "number" || pool.diagnostics.durationMs < 0) {
      throw new Error("pool.diagnostics.durationMs 必须是非负数");
    }
    if (!Array.isArray(pool.diagnostics.stages)) {
      throw new Error("pool.diagnostics.stages 必须是数组");
    }
    if (!Array.isArray(pool.diagnostics.calls)) {
      throw new Error("pool.diagnostics.calls 必须是数组");
    }

    try {
      JSON.parse(JSON.stringify(pool));
    } catch (err) {
      throw new Error(`pool 无法进行确定性 JSON 序列化: ${err.message}`);
    }

    return true;
  }

  function normalizeRawEntryPool(input) {
    if (!isObject(input)) throw new Error("Input must be an object");
    const sourceText = stripControlCharacters(String(input.source?.sourceText ?? input.sourceText ?? input.text ?? ""));
    const fileName = stripControlCharacters(String(input.source?.fileName ?? input.fileName ?? "").trim());
    const pageCount = Number(input.source?.pageCount ?? input.pageCount ?? 1);
    const characters = sourceText.length;
    const targetVersion = (typeof input.extractionModuleVersion === "string" && VALID_EXTRACTION_MODULE_VERSIONS.includes(input.extractionModuleVersion))
      ? input.extractionModuleVersion
      : EXTRACTION_MODULE_VERSION;

    const rawChunks = Array.isArray(input.chunks) ? input.chunks : [];
    const chunks = rawChunks.map((chunk, index) => {
      const text = stripControlCharacters(String(chunk.text ?? ""));
      const rawEntries = Array.isArray(chunk.rawEntries)
        ? chunk.rawEntries.map(cleanEntryFields)
        : (Array.isArray(chunk.entries) ? chunk.entries.map(cleanEntryFields) : []);
      return {
        chunkIndex: typeof chunk.chunkIndex === "number" ? chunk.chunkIndex : index,
        pageRange: chunk.pageRange ?? pageRangeOf(text),
        characterCount: text.length,
        text,
        rawEntries,
        ...(Array.isArray(chunk.inferenceHints) ? { inferenceHints: cloneJson(chunk.inferenceHints) } : {}),
      };
    });

    const rawEntries = Array.isArray(input.rawEntries)
      ? input.rawEntries.map(cleanEntryFields)
      : (Array.isArray(input.entries) ? input.entries.map(cleanEntryFields) : chunks.flatMap((c) => c.rawEntries));

    const diagnostics = {
      durationMs: Number(input.diagnostics?.durationMs ?? input.durationMs ?? 0),
      stages: Array.isArray(input.diagnostics?.stages) ? input.diagnostics.stages : (Array.isArray(input.stages) ? input.stages : []),
      calls: Array.isArray(input.diagnostics?.calls) ? input.diagnostics.calls : (Array.isArray(input.calls) ? input.calls : []),
      chunkCount: chunks.length,
      rawEntryCount: rawEntries.length,
      ...(typeof input.diagnostics?.jsonRepairCount === "number" ? { jsonRepairCount: input.diagnostics.jsonRepairCount } : (typeof input.jsonRepairCount === "number" ? { jsonRepairCount: input.jsonRepairCount } : {})),
      ...(input.diagnostics?.repairSummary ? { repairSummary: input.diagnostics.repairSummary } : (input.repairSummary ? { repairSummary: input.repairSummary } : {})),
      modelCallMetadata: input.diagnostics?.modelCallMetadata ?? input.modelCallMetadata ?? null,
      moduleIdentity: input.diagnostics?.moduleIdentity ?? {
        name: targetVersion,
        schema: RAW_ENTRY_POOL_SCHEMA,
      },
    };

    const pool = {
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: targetVersion,
      source: {
        fileName,
        pageCount,
        characters,
        sourceText,
      },
      chunks: cloneJson(chunks),
      rawEntries: cloneJson(rawEntries),
      ...(Array.isArray(input.inferenceHints) ? { inferenceHints: cloneJson(input.inferenceHints) } : {}),
      diagnostics: cloneJson(diagnostics),
    };

    validateRawEntryPool(pool);
    return pool;
  }

  function createRawEntryPool(options) {
    const normalized = normalizeRawEntryPool(options);
    return freezeRawEntryPool(normalized);
  }

  /**
   * Parallel chunk Entry extraction:
   * Splits sourceText into page chunks with 2-page overlap, fires all chunk model requests
   * concurrently without serial waiting, and outputs a frozen Raw Entry Pool artifact.
   * Strictly NO Paper Guide, NO boundary, NO lead-guided, NO model integration, NO review calls.
   */
  async function extractParallelRawEntryPool({
    fileName,
    pageCount,
    text,
    chatImpl,
    fetchImpl = globalThis.fetch,
    endpoint,
    apiKey,
    model = "gpt-5.6-luna",
    providerLabel = "Luna Gateway",
    reasoningEffort = "none",
    maxChunks = 4,
    charsPerChunk = 25000,
    forceChunks = false,
    tokenBudget,
    signal,
    onStage,
    version,
    extractionModuleVersion,
    laneCache,
    onLaneComplete,
  } = {}) {
    const executionStartedAt = performance.now();
    const stages = [];
    const calls = [];

    const notify = (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - executionStartedAt) });
      if (typeof onStage === "function") {
        try { onStage(stage, info); } catch (_) {}
      }
    };

    const cleanFileName = stripControlCharacters(String(fileName || "paper.pdf").trim());
    const cleanText = stripControlCharacters(String(text || ""));
    const numPages = Number(pageCount || 1);

    if (!cleanText.trim()) throw new Error("Paper source text cannot be empty");

    let targetVersion = EXTRACTION_MODULE_VERSION;
    const requestedVersion = extractionModuleVersion || version;
    if (typeof requestedVersion === "string" && requestedVersion.trim()) {
      const v = requestedVersion.trim();
      if (v === "paper-entry-parallel-extraction-v1.5" || v === "v1.5" || v === "1.5") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_5;
      } else if (v === "paper-entry-parallel-extraction-v1.5.1" || v === "v1.5.1" || v === "1.5.1") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_5_1;
      } else if (v === "paper-entry-parallel-extraction-v1.5.2" || v === "v1.5.2" || v === "1.5.2") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_5_2;
      } else if (v === "paper-entry-parallel-extraction-v1.6" || v === "v1.6" || v === "1.6") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_6;
      } else if (v === "paper-entry-parallel-extraction-v1.9" || v === "v1.9" || v === "1.9") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_9;
      } else if (v === "paper-entry-parallel-extraction-v1.10" || v === "v1.10" || v === "1.10") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_10;
      } else if (v === "paper-entry-parallel-extraction-v1.8" || v === "v1.8" || v === "1.8") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_8;
      } else if (v === "paper-entry-parallel-extraction-v1.7" || v === "v1.7" || v === "1.7") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_7;
      } else if (v === "paper-entry-parallel-extraction-v1.4" || v === "v1.4" || v === "1.4") {
        targetVersion = EXTRACTION_MODULE_VERSION_V1_4;
      } else if (v === "paper-entry-parallel-extraction-v1.3" || v === "v1.3" || v === "1.3") {
        targetVersion = "paper-entry-parallel-extraction-v1.3";
      } else if (v === "paper-entry-parallel-extraction-v1.2" || v === "v1.2" || v === "1.2") {
        targetVersion = "paper-entry-parallel-extraction-v1.2";
      } else if (v === "paper-entry-parallel-extraction-v1.1" || v === "v1.1" || v === "1.1") {
        targetVersion = "paper-entry-parallel-extraction-v1.1";
      } else if (v === "paper-entry-parallel-extraction-v1" || v === "v1" || v === "1") {
        targetVersion = "paper-entry-parallel-extraction-v1";
      } else if (VALID_EXTRACTION_MODULE_VERSIONS.includes(v)) {
        targetVersion = v;
      }
    }

    if ([EXTRACTION_MODULE_VERSION_V1_7, EXTRACTION_MODULE_VERSION_V1_8, EXTRACTION_MODULE_VERSION_V1_9, EXTRACTION_MODULE_VERSION_V1_10, EXTRACTION_MODULE_VERSION_V1_11, EXTRACTION_MODULE_VERSION_V1_12, EXTRACTION_MODULE_VERSION_V1_13, EXTRACTION_MODULE_VERSION_V1_14, EXTRACTION_MODULE_VERSION_V1_15, EXTRACTION_MODULE_VERSION_V1_16].includes(targetVersion)) {
      const blocks = splitTextIntoWindows(cleanText, 5, 1);
      notify("parallel-extract-start", { chars: cleanText.length, blocks: blocks.length, overlapPages: 1, lanes: ["combined"], version: targetVersion });
      const perBlock = blocks.map(() => ({ foundation: [], result: [], inferenceHints: [] }));
      let completedCalls = 0;

      const tasks = blocks.map((blockText, blockIndex) => async () => {
        const pageRange = pageRangeOf(blockText);
        const cacheKey = `${blockIndex}:combined`;
        const cached = laneCache?.[cacheKey];
        if (isObject(cached) && Array.isArray(cached.foundationEntries) && Array.isArray(cached.resultEntries) && Array.isArray(cached.inferenceHints)) {
          perBlock[blockIndex] = {
            foundation: cloneJson(cached.foundationEntries),
            result: cloneJson(cached.resultEntries),
            inferenceHints: cloneJson(cached.inferenceHints),
          };
          completedCalls += 1;
          notify("parallel-extract-lane-cache-hit", { block: blockIndex + 1, lane: "combined", totalBlocks: blocks.length, extractedCount: cached.foundationEntries.length + cached.resultEntries.length, inferenceHintCount: cached.inferenceHints.length, doneCalls: completedCalls, totalCalls: blocks.length });
          return;
        }

        const promptBuilder = targetVersion === EXTRACTION_MODULE_VERSION_V1_16
          ? v116DualOutputPrompt
          : (targetVersion === EXTRACTION_MODULE_VERSION_V1_15
            ? v115DualOutputPrompt
            : (targetVersion === EXTRACTION_MODULE_VERSION_V1_14
              ? v114DualOutputPrompt
              : (targetVersion === EXTRACTION_MODULE_VERSION_V1_13
                ? v113DualOutputPrompt
              : (targetVersion === EXTRACTION_MODULE_VERSION_V1_12
                ? v112DualOutputPrompt
                : (targetVersion === EXTRACTION_MODULE_VERSION_V1_11
                  ? v111DualOutputPrompt
                  : (targetVersion === EXTRACTION_MODULE_VERSION_V1_10
                    ? v110DualOutputPrompt
                    : (targetVersion === EXTRACTION_MODULE_VERSION_V1_9
                      ? v19DualOutputPrompt
                      : (targetVersion === EXTRACTION_MODULE_VERSION_V1_8 ? v18DualOutputPrompt : v17DualOutputPrompt))))))));
        const prompt = promptBuilder({ fileName: cleanFileName, pageCount: numPages, text: blockText, pageRange, blockIndex, totalBlocks: blocks.length });
        const callStartedAt = performance.now();
        let responseContent = "";
        let responseStatus = 200;
        let finishReason = null;
        let usage = null;
        if (typeof chatImpl === "function") {
          const response = await chatImpl({ stage: "extract", lane: "combined", chunkIndex: blockIndex, blockIndex, totalChunks: blocks.length, totalBlocks: blocks.length, messages: [{ role: "user", content: prompt }], reasoningEffort, signal });
          responseContent = response.content ?? "";
          responseStatus = response.status ?? 200;
          finishReason = response.finishReason ?? null;
          usage = response.usage ?? null;
        } else if (endpoint && apiKey) {
          const res = await fetchImpl(`${endpoint.replace(/\/+$/u, "")}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0, ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}) }),
            signal,
          });
          responseStatus = res.status;
          if (!res.ok) throw new Error(`HTTP ${res.status} block ${blockIndex + 1} combined extraction failed: ${(await res.text()).slice(0, 300)}`);
          const json = await res.json();
          responseContent = json.choices?.[0]?.message?.content ?? "";
          finishReason = json.choices?.[0]?.finish_reason ?? null;
          usage = json.usage ?? null;
        } else {
          throw new Error("extractParallelRawEntryPool requires either chatImpl or (endpoint and apiKey)");
        }

        const callRecord = { stage: "extract", lane: "combined", chunkIndex: blockIndex, blockIndex, durationMs: Math.round(performance.now() - callStartedAt), status: responseStatus, finishReason, usage, repaired: false, repairCount: 0 };
        calls.push(callRecord);
        const parseDiagnostics = { repaired: false, repairCount: 0 };
        let parsed;
        try { parsed = parseModelJson(responseContent, { diagnostics: parseDiagnostics }); }
        catch (err) { throw new Error(`Block ${blockIndex + 1} combined lane parse failure: ${err.message}`); }
        callRecord.repaired = parseDiagnostics.repaired;
        callRecord.repairCount = parseDiagnostics.repairCount;
        if (!isObject(parsed) || !Array.isArray(parsed.foundationEntries) || !Array.isArray(parsed.resultEntries) || !Array.isArray(parsed.inferenceHints)) {
          throw new Error(`Block ${blockIndex + 1} combined lane response missing foundationEntries, resultEntries, or inferenceHints array`);
        }
        const addProvenance = (entry, lane) => ({ ...cleanEntryFields(entry), _provenance: { chunkIndex: blockIndex, blockIndex, pageRange, lane, version: targetVersion } });
        const foundation = parsed.foundationEntries.filter(isObject).map((entry) => addProvenance(entry, "foundation"));
        const result = parsed.resultEntries.filter(isObject).map((entry) => addProvenance(entry, "result"));
        const inferenceHints = parsed.inferenceHints.filter(isObject).map((hint) => ({
          premiseRefs: Array.isArray(hint.premiseRefs) ? hint.premiseRefs.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [],
          conclusionRef: typeof hint.conclusionRef === "string" ? hint.conclusionRef.trim() : "",
          relationText: typeof hint.relationText === "string" ? hint.relationText.trim().slice(0, 120) : "",
          page: Number.isInteger(hint.page) ? hint.page : pageRange?.first,
          _provenance: { blockIndex, pageRange, version: targetVersion },
        }));
        perBlock[blockIndex] = { foundation, result, inferenceHints };
        if (typeof onLaneComplete === "function") await onLaneComplete({ cacheKey, blockIndex, lane: "combined", pageRange, entries: cloneJson({ foundationEntries: foundation, resultEntries: result, inferenceHints }) });
        completedCalls += 1;
        notify("parallel-extract-lane", { block: blockIndex + 1, lane: "combined", totalBlocks: blocks.length, extractedCount: foundation.length + result.length, foundationCount: foundation.length, resultCount: result.length, inferenceHintCount: inferenceHints.length, doneCalls: completedCalls, totalCalls: blocks.length, repaired: parseDiagnostics.repaired, repairCount: parseDiagnostics.repairCount });
      });

      let nextTask = 0;
      const taskErrors = [];
      const workers = Array.from({ length: Math.min(3, tasks.length) }, async () => {
        while (nextTask < tasks.length) {
          const taskIndex = nextTask++;
          try { await tasks[taskIndex](); } catch (error) { taskErrors.push(error); }
        }
      });
      await Promise.all(workers);
      if (taskErrors.length) {
        const err = taskErrors[0];
        err.diagnostics = { durationMs: Math.round(performance.now() - executionStartedAt), stages, calls };
        throw err;
      }

      const blocksData = blocks.map((blockText, index) => ({ chunkIndex: index, pageRange: pageRangeOf(blockText), characterCount: blockText.length, text: blockText, rawEntries: [...perBlock[index].foundation, ...perBlock[index].result], inferenceHints: perBlock[index].inferenceHints }));
      const allRawEntries = blocksData.flatMap((block) => block.rawEntries);
      const allInferenceHints = blocksData.flatMap((block) => block.inferenceHints);
      notify("parallel-extract-done", { totalRawEntries: allRawEntries.length, totalInferenceHints: allInferenceHints.length, blocks: blocks.length, version: targetVersion });
      return createRawEntryPool({ schema: RAW_ENTRY_POOL_SCHEMA, extractionModuleVersion: targetVersion, source: { fileName: cleanFileName, pageCount: numPages, characters: cleanText.length, sourceText: cleanText }, chunks: blocksData, rawEntries: allRawEntries, inferenceHints: allInferenceHints, diagnostics: { durationMs: Math.round(performance.now() - executionStartedAt), stages, calls, chunkCount: blocks.length, rawEntryCount: allRawEntries.length, inferenceHintCount: allInferenceHints.length, jsonRepairCount: calls.reduce((sum, call) => sum + (call.repairCount || 0), 0), modelCallMetadata: { model, provider: providerLabel, reasoningEffort }, moduleIdentity: { name: targetVersion, schema: RAW_ENTRY_POOL_SCHEMA } } });
    }

    if (targetVersion === EXTRACTION_MODULE_VERSION_V1_6 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_2 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_1 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5 || targetVersion === EXTRACTION_MODULE_VERSION_V1_4) {
      const blocks = targetVersion === EXTRACTION_MODULE_VERSION_V1_6 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_2 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_1 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5
        ? splitTextIntoWindows(cleanText, 5, 1)
        : splitTextIntoFixedBlocks(cleanText, 2, 1);
      notify("parallel-extract-start", { chars: cleanText.length, blocks: blocks.length, overlapPages: 1, lanes: ["foundation", "result"], version: targetVersion });

      const internalController = new AbortController();
      if (signal) {
        if (signal.aborted) {
          internalController.abort(signal.reason);
        } else {
          signal.addEventListener("abort", () => {
            internalController.abort(signal.reason);
          }, { once: true });
        }
      }
      const effectiveSignal = internalController.signal;

      const perBlockLanes = blocks.map(() => ({ foundation: [], result: [] }));
      const totalCalls = blocks.length * 2;
      let completedCalls = 0;

      const callTasks = [];

      blocks.forEach((blockText, blockIndex) => {
        const blockPageRange = pageRangeOf(blockText);
        const rangeLabel = blockPageRange ? ` (pages ${blockPageRange.first}–${blockPageRange.last})` : "";

        for (const lane of ["foundation", "result"]) {
          const prompt = v14LanePrompt({
            lane,
            fileName: cleanFileName,
            pageCount: numPages,
            text: blockText,
            pageRange: blocks.length > 1 ? blockPageRange : null,
            blockIndex,
            totalBlocks: blocks.length,
            boundedFoundation: targetVersion === EXTRACTION_MODULE_VERSION_V1_5_2 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_1,
          });

          const task = async () => {
            try {
              const cacheKey = `${blockIndex}:${lane}`;
              if (targetVersion === EXTRACTION_MODULE_VERSION_V1_6 && Array.isArray(laneCache?.[cacheKey])) {
                perBlockLanes[blockIndex][lane] = cloneJson(laneCache[cacheKey]);
                completedCalls += 1;
                notify("parallel-extract-lane-cache-hit", {
                  block: blockIndex + 1, lane, totalBlocks: blocks.length,
                  extractedCount: perBlockLanes[blockIndex][lane].length,
                  doneCalls: completedCalls, totalCalls,
                });
                return perBlockLanes[blockIndex][lane];
              }
              const callStartedAt = performance.now();
              let responseContent = "";
              let responseStatus = 200;
              let finishReason = null;
              let usage = null;

              if (typeof chatImpl === "function") {
                const response = await chatImpl({
                  stage: "extract",
                  lane,
                  chunkIndex: blockIndex,
                  blockIndex,
                  totalChunks: blocks.length,
                  totalBlocks: blocks.length,
                  messages: [{ role: "user", content: prompt }],
                  reasoningEffort,
                  ...(targetVersion === EXTRACTION_MODULE_VERSION_V1_6 ? {} : { maxTokens: tokenBudget?.normal ?? 10000 }),
                  signal: effectiveSignal,
                });
                responseContent = response.content ?? "";
                responseStatus = response.status ?? 200;
                finishReason = response.finishReason ?? null;
                usage = response.usage ?? null;
              } else if (endpoint && apiKey) {
                const payload = {
                  model,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0,
                  ...(targetVersion === EXTRACTION_MODULE_VERSION_V1_6 ? {} : { max_tokens: tokenBudget?.normal ?? 10000 }),
                  ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
                };
                const res = await fetchImpl(`${endpoint.replace(/\/+$/u, "")}/chat/completions`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify(payload),
                  signal: effectiveSignal,
                });
                responseStatus = res.status;
                if (!res.ok) {
                  const errText = await res.text();
                  throw new Error(`HTTP ${res.status} block ${blockIndex + 1} ${lane} lane extraction failed: ${errText.slice(0, 300)}`);
                }
                const json = await res.json();
                responseContent = json.choices?.[0]?.message?.content ?? "";
                finishReason = json.choices?.[0]?.finish_reason ?? null;
                usage = json.usage ?? null;
              } else {
                throw new Error("extractParallelRawEntryPool requires either chatImpl or (endpoint and apiKey)");
              }

              const callDurationMs = Math.round(performance.now() - callStartedAt);
              const callRecord = {
                stage: "extract",
                lane,
                chunkIndex: blockIndex,
                blockIndex,
                durationMs: callDurationMs,
                status: responseStatus,
                finishReason,
                usage,
                repaired: false,
                repairCount: 0,
              };
              calls.push(callRecord);

              let parsed;
              const laneDiagnostics = { repaired: false, repairCount: 0 };
              try {
                parsed = parseModelJson(responseContent, { diagnostics: laneDiagnostics });
              } catch (err) {
                throw new Error(`Block ${blockIndex + 1} ${lane} lane${rangeLabel} parse failure: ${err.message}`);
              }

              callRecord.repaired = laneDiagnostics.repaired;
              callRecord.repairCount = laneDiagnostics.repairCount;

              if (laneDiagnostics.repaired) {
                notify("parallel-extract-json-repair", {
                  block: blockIndex + 1,
                  lane,
                  repairs: laneDiagnostics.repairCount,
                });
              }

              const entriesRaw = Array.isArray(parsed)
                ? parsed
                : (isObject(parsed) && Array.isArray(parsed.entries) ? parsed.entries : null);

              if (!entriesRaw) {
                throw new Error(`Block ${blockIndex + 1} ${lane} lane${rangeLabel} response missing valid entries array`);
              }

              const validEntriesRaw = entriesRaw.filter(isObject);
              const parsedEntries = validEntriesRaw.map((entry) => ({
                ...cleanEntryFields(entry),
                _provenance: {
                  chunkIndex: blockIndex,
                  blockIndex,
                  pageRange: blockPageRange,
                  lane,
                  version: targetVersion,
                },
              }));

              perBlockLanes[blockIndex][lane] = parsedEntries;
              if (targetVersion === EXTRACTION_MODULE_VERSION_V1_6 && typeof onLaneComplete === "function") {
                await onLaneComplete({
                  cacheKey, blockIndex, lane, pageRange: blockPageRange,
                  entries: cloneJson(parsedEntries),
                });
              }
              completedCalls += 1;
              notify("parallel-extract-lane", {
                block: blockIndex + 1,
                lane,
                totalBlocks: blocks.length,
                extractedCount: parsedEntries.length,
                doneCalls: completedCalls,
                totalCalls,
                repaired: laneDiagnostics.repaired,
                repairCount: laneDiagnostics.repairCount,
              });
              return parsedEntries;
            } catch (err) {
              if (targetVersion !== EXTRACTION_MODULE_VERSION_V1_6) internalController.abort(err);
              throw err;
            }
          };

          callTasks.push(task);
        }
      });

      try {
        if (targetVersion === EXTRACTION_MODULE_VERSION_V1_6 || targetVersion === EXTRACTION_MODULE_VERSION_V1_5_2) {
          let nextTask = 0;
          const taskErrors = [];
          const workers = Array.from({ length: Math.min(3, callTasks.length) }, async () => {
            while (nextTask < callTasks.length && !effectiveSignal.aborted) {
              const taskIndex = nextTask;
              nextTask += 1;
              if (targetVersion === EXTRACTION_MODULE_VERSION_V1_6) {
                try { await callTasks[taskIndex](); } catch (error) { taskErrors.push(error); }
              } else {
                await callTasks[taskIndex]();
              }
            }
          });
          await Promise.all(workers);
          if (taskErrors.length) throw taskErrors[0];
        } else {
          await Promise.all(callTasks.map((task) => task()));
        }
      } catch (err) {
        internalController.abort(err);
        if (!err.diagnostics) {
          err.diagnostics = {
            durationMs: Math.round(performance.now() - executionStartedAt),
            stages,
            calls,
          };
        }
        throw err;
      }

      const blocksData = blocks.map((blockText, index) => {
        const blockEntries = [
          ...(perBlockLanes[index].foundation || []),
          ...(perBlockLanes[index].result || []),
        ];
        return {
          chunkIndex: index,
          pageRange: pageRangeOf(blockText),
          characterCount: blockText.length,
          text: blockText,
          rawEntries: blockEntries,
        };
      });

      const allRawEntries = blocksData.flatMap((b) => b.rawEntries);
      notify("parallel-extract-done", { totalRawEntries: allRawEntries.length, blocks: blocks.length, version: targetVersion });

      const totalJsonRepairs = calls.reduce((sum, c) => sum + (c.repairCount || 0), 0);
      const repairedChunkCount = calls.filter((c) => c.repaired).length;

      const rawPool = createRawEntryPool({
        schema: RAW_ENTRY_POOL_SCHEMA,
        extractionModuleVersion: targetVersion,
        source: {
          fileName: cleanFileName,
          pageCount: numPages,
          characters: cleanText.length,
          sourceText: cleanText,
        },
        chunks: blocksData,
        rawEntries: allRawEntries,
        diagnostics: {
          durationMs: Math.round(performance.now() - executionStartedAt),
          stages,
          calls,
          chunkCount: blocks.length,
          rawEntryCount: allRawEntries.length,
          jsonRepairCount: totalJsonRepairs,
          repairSummary: {
            totalJsonRepairs,
            repairedChunkCount,
          },
          modelCallMetadata: {
            model,
            provider: providerLabel,
            reasoningEffort,
          },
          moduleIdentity: {
            name: targetVersion,
            schema: RAW_ENTRY_POOL_SCHEMA,
          },
        },
      });

      return rawPool;
    }

    // Historical v1.3 behavior
    const chunkBudget = forceChunks
      ? Math.max(1, maxChunks)
      : Math.max(1, Math.min(maxChunks, Math.ceil(cleanText.length / charsPerChunk)));
    const chunks = splitTextIntoChunks(cleanText, chunkBudget, 2);

    notify("parallel-extract-start", { chars: cleanText.length, chunks: chunks.length, overlapPages: 2 });

    const perChunk = new Array(chunks.length).fill(null);
    let completedChunks = 0;

    const chunkPromises = chunks.map(async (chunkText, index) => {
      const chunkPageRange = pageRangeOf(chunkText);
      const prompt = entriesPrompt({
        fileName: cleanFileName,
        pageCount: numPages,
        text: chunkText,
        pageRange: chunks.length > 1 ? chunkPageRange : null,
      });

      const callStartedAt = performance.now();
      let responseContent = "";
      let responseStatus = 200;
      let finishReason = null;
      let usage = null;

      if (typeof chatImpl === "function") {
        const response = await chatImpl({
          stage: "extract",
          chunkIndex: index,
          totalChunks: chunks.length,
          messages: [{ role: "user", content: prompt }],
          reasoningEffort,
          maxTokens: tokenBudget?.normal ?? 10000,
          signal,
        });
        responseContent = response.content ?? "";
        responseStatus = response.status ?? 200;
        finishReason = response.finishReason ?? null;
        usage = response.usage ?? null;
      } else if (endpoint && apiKey) {
        const payload = {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: tokenBudget?.normal ?? 10000,
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        };
        const res = await fetchImpl(`${endpoint.replace(/\/+$/u, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal,
        });
        responseStatus = res.status;
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status} chunk ${index + 1} extraction failed: ${errText.slice(0, 300)}`);
        }
        const json = await res.json();
        responseContent = json.choices?.[0]?.message?.content ?? "";
        finishReason = json.choices?.[0]?.finish_reason ?? null;
        usage = json.usage ?? null;
      } else {
        throw new Error("extractParallelRawEntryPool requires either chatImpl or (endpoint and apiKey)");
      }

      const callDurationMs = Math.round(performance.now() - callStartedAt);
      const callRecord = {
        stage: "extract",
        chunkIndex: index,
        durationMs: callDurationMs,
        status: responseStatus,
        finishReason,
        usage,
        repaired: false,
        repairCount: 0,
      };
      calls.push(callRecord);

      const rangeLabel = chunkPageRange ? ` (pages ${chunkPageRange.first}–${chunkPageRange.last})` : "";

      let parsed;
      const chunkDiagnostics = { repaired: false, repairCount: 0 };
      try {
        parsed = parseModelJson(responseContent, { diagnostics: chunkDiagnostics });
      } catch (err) {
        throw new Error(`Chunk ${index + 1}${rangeLabel} parse failure: ${err.message}`);
      }

      callRecord.repaired = chunkDiagnostics.repaired;
      callRecord.repairCount = chunkDiagnostics.repairCount;

      if (chunkDiagnostics.repaired) {
        notify("parallel-extract-json-repair", {
          chunk: index + 1,
          repairs: chunkDiagnostics.repairCount,
        });
      }

      const entriesRaw = Array.isArray(parsed)
        ? parsed
        : (isObject(parsed) && Array.isArray(parsed.entries) ? parsed.entries : null);

      if (!entriesRaw) {
        throw new Error(`Chunk ${index + 1}${rangeLabel} response missing valid entries array`);
      }

      const validEntriesRaw = entriesRaw.filter(isObject);
      if (validEntriesRaw.length === 0) {
        throw new Error(`Chunk ${index + 1}${rangeLabel} response contains no valid entries (empty entries array)`);
      }

      const parsedEntries = validEntriesRaw.map((entry) => ({
        ...cleanEntryFields(entry),
        _provenance: {
          chunkIndex: index,
          pageRange: chunkPageRange,
        },
      }));

      perChunk[index] = parsedEntries;
      completedChunks += 1;
      notify("parallel-extract-chunk", { chunk: index + 1, total: chunks.length, extractedCount: parsedEntries.length, done: completedChunks, repaired: chunkDiagnostics.repaired, repairCount: chunkDiagnostics.repairCount });
      return parsedEntries;
    });

    try {
      await Promise.all(chunkPromises);
    } catch (err) {
      if (!err.diagnostics) {
        err.diagnostics = {
          durationMs: Math.round(performance.now() - executionStartedAt),
          stages,
          calls,
        };
      }
      throw err;
    }

    const allRawEntries = perChunk.flat();
    notify("parallel-extract-done", { totalRawEntries: allRawEntries.length });

    const totalJsonRepairs = calls.reduce((sum, c) => sum + (c.repairCount || 0), 0);
    const repairedChunkCount = calls.filter((c) => c.repaired).length;

    const chunksData = chunks.map((chunkText, index) => ({
      chunkIndex: index,
      pageRange: pageRangeOf(chunkText),
      characterCount: chunkText.length,
      text: chunkText,
      rawEntries: perChunk[index] || [],
    }));

    const rawPool = createRawEntryPool({
      schema: RAW_ENTRY_POOL_SCHEMA,
      extractionModuleVersion: targetVersion,
      source: {
        fileName: cleanFileName,
        pageCount: numPages,
        characters: cleanText.length,
        sourceText: cleanText,
      },
      chunks: chunksData,
      rawEntries: allRawEntries,
      diagnostics: {
        durationMs: Math.round(performance.now() - executionStartedAt),
        stages,
        calls,
        chunkCount: chunks.length,
        rawEntryCount: allRawEntries.length,
        jsonRepairCount: totalJsonRepairs,
        repairSummary: {
          totalJsonRepairs,
          repairedChunkCount,
        },
        modelCallMetadata: {
          model,
          provider: providerLabel,
          reasoningEffort,
        },
        moduleIdentity: {
          name: targetVersion,
          schema: RAW_ENTRY_POOL_SCHEMA,
        },
      },
    });

    return rawPool;
  }

  function resolveRunnerExecutionConfig(mode = "off-compact") {
    if (mode === "off-compact") {
      return {
        reasoningEffort: "none",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (mode === "low-compact") {
      return {
        reasoningEffort: "low",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (mode === "medium-compact") {
      return {
        reasoningEffort: "medium",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (mode === "high-compact") {
      return {
        reasoningEffort: "high",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (mode === "high-generous") {
      return {
        reasoningEffort: "high",
        tokenBudget: { normal: 32000, retry: 64000 },
      };
    }
    throw new Error(`unknown mode: ${mode}`);
  }

  return Object.freeze({
    RAW_ENTRY_POOL_SCHEMA,
    EXTRACTION_MODULE_VERSION,
    EXTRACTION_MODULE_VERSION_V1_4,
    EXTRACTION_MODULE_VERSION_V1_5,
    EXTRACTION_MODULE_VERSION_V1_5_1,
    EXTRACTION_MODULE_VERSION_V1_5_2,
    EXTRACTION_MODULE_VERSION_V1_6,
    EXTRACTION_MODULE_VERSION_V1_7,
    EXTRACTION_MODULE_VERSION_V1_8,
    EXTRACTION_MODULE_VERSION_V1_9,
    EXTRACTION_MODULE_VERSION_V1_10,
    EXTRACTION_MODULE_VERSION_V1_11,
    EXTRACTION_MODULE_VERSION_V1_12,
    EXTRACTION_MODULE_VERSION_V1_13,
    EXTRACTION_MODULE_VERSION_V1_14,
    EXTRACTION_MODULE_VERSION_V1_15,
    EXTRACTION_MODULE_VERSION_V1_16,
    VALID_EXTRACTION_MODULE_VERSIONS,
    CONSOLIDATION_MODULE_VERSION,
    validateRawEntryPool,
    normalizeRawEntryPool,
    createRawEntryPool,
    freezeRawEntryPool,
    extractParallelRawEntryPool,
    resolveRunnerExecutionConfig,
    splitTextIntoChunks,
    splitTextIntoFixedBlocks,
    splitTextIntoWindows,
    pageRangeOf,
    entriesPrompt,
    v14FoundationPrompt,
    v14ResultPrompt,
    v14LanePrompt,
    v17DualOutputPrompt,
    v18DualOutputPrompt,
    v19DualOutputPrompt,
    v110DualOutputPrompt,
    v111DualOutputPrompt,
    v112DualOutputPrompt,
    v113DualOutputPrompt,
    v114DualOutputPrompt,
    v115DualOutputPrompt,
    v116DualOutputPrompt,
    parseModelJson,
    repairJsonStringEscapes,
    hasBalancedMathDelimiters,
    validateMathDelimiters,
    stripControlCharacters,
  });
});
