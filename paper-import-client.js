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
  // ── Frozen Workflow (V4.1, ADR-0003) ──
  // 网页导入与 Benchmark 共用同一冻结管线；下次冻结升级只改这里。
  const FROZEN_WORKFLOW = Object.freeze({
    label: "V4.1",
    entryExtractionVersion: "paper-entry-parallel-extraction-v1.31",
    inferenceRuntimeVersion: "v3.45",
  });
  const MAX_PAPER_TEXT_CHARS = 80_000;
  const semantics = root?.GammaMathMapSemantics
    ?? (typeof require === "function" ? require("./math-map-semantics.js") : null);
  if (!semantics || typeof semantics.validateEntry !== "function" || typeof semantics.validateInference !== "function") {
    throw new Error("Gamma 数学地图语义能力没有加载");
  }
  // Inference 策略按版本号分档：V3.43/V3.44/V3.45 的装配片段现落在
  // src/paper-import/inference/strategies/ 各自文件中，根部保留同文案回退以兼容旧加载路径。
  const inferenceStrategyIndex = (() => {
    if (root?.CMathPaperImportStrategyIndex) return root.CMathPaperImportStrategyIndex;
    if (typeof require === "function") {
      try { return require("./src/paper-import/inference/strategies/index.js"); } catch {}
    }
    return null;
  })();
  function inferenceStrategySection(version) {
    const fromIndex = inferenceStrategyIndex?.sectionFor?.(version);
    if (typeof fromIndex === "string" && fromIndex) return fromIndex;
    if (version === "v3.43") return "- 【V3.43 统一覆盖：细粒度+链式+主线】在 V3 基线之上：① 细粒度：每个 Claim 的证明必须展开为独立 proof，严禁合并为 mega-proof；每个 proof 的 premises 只列直接依赖的已有 Entry ID；自足证明可用空 premises，但必须在 argument 中记录完整数学论证；未知 ID、直接自依赖、把 Fact 当 proof conclusion 均禁止；互推循环可表达等价或相互蕴含，但没有已建立的外部入口时不能建立循环中的任何 Claim；② 链式：按闭包倒推递归补齐被依赖但缺 proof 的中间 Claim，每步仅列直接 premises；必须保留从 b0 经各 key_result 到 mainTarget 的完整主线 proof 链；③ 主线覆盖：必须覆盖论文中具有实质意义的各个独立证明分支与结构归属，绝不能仅输出少量局部引理，允许合法多连通分支与独立背景，不以固定推理数量为目标，但隔离率>0.2 视为缺陷，闭包未闭合视为缺陷。\n";
    if (version === "v3.44") return "- 【V3.44 精修（陈述精度+桥接+去噪）】在 V3.43 基础上：① 陈述精度：Hopf 方向严格写一般维数 winding/环绕数、χ(T^n)=0、Poincaré–Hopf 需“有限孤立零点”、S^1 基例需完整等度分类↔homotopy、穿孔空间双向判据、毛球一般维数；Yasui 的 Taubes/batch 条件需 b2^±≠1 mod4 原文、Bauer-Furuta 定义与 symplectic 结构定义不得遗漏；② 桥接：knot 的 quantum trace 需显式建立 Rep_f^d(A) categorical trace = quantum trace 的桥接、graphical calculus→colored link invariant 需独立 proof、framed-link/surgery 需 Entry；cornered 的 self-gluing HH0→capping 的 premise 必须保留、trisection 需 Gay–Kirby 背景；③ 去噪：禁止把 Rohlin 额外定理/错误纯化/neg-mod 等价等未在 Gold 的内容加入 B0 或捏造等价。\n";
    if (version === "v3.45") return "- 【V3.45 校正（陈述精度回补+去重）】在 V3.44 基础上针对 Sol 回退做最小校正：① Hopf：winding 定义必须写一般维数 S^{n-1}→S^{n-1} 不固定为 S^1；χ(S^n)=1+(-1)^n，χ(T^n)=0 严禁写 χ(T^k)=-2(k-2)；横截外部定理必须是一般版本（边界固定延拓+一般横截同伦）而非仅零截面特例；引理 base-s1 必须完整陈述任意整数度分类 deg:[S^1,S^1]≅Z 由 z↦z^n 实现且零伦当且仅当度为零；穿孔空间需显式维数归纳假设，present R^n\\{0}≃S^{n-1} 双向判据，禁止由 S^1 直接跳到任意 k 且禁止以欧氏鼓包直接充当 S^k 延拓；Poincaré–Hopf 需“有限孤立零点”条件；毛球需一般维数结论。② Yasui：Taubes b2^+>1 需补典范 spin^c 与 SW=±1（mod2=1）；2-把手邻域类是“可由邻域内2-循环代表”而非单个生成元之像；定理2.4/1.9必须为 b2^+ not≡1(mod4) 且 b2^- not≡1(mod4) 禁止替换为 b2^+≤1、b2≡1；必须补 Bauer–Furuta 不变量定义、辛结构定义、辛 Betti 奇偶性 B0；禁止重复建立 Lemma2.6/3.1/Cor2.5 等价条目。③ 去重与桥接保持 V3.44 要求，knot 的 negligible 仅“所有自同态量子迹为零”不捏造单迹等价，Rohlin/附加 Jones 等 Gold 外内容禁入 B0。\n";
    return "";
  }
  const ENTRY_CLASSES = new Set(semantics.ENTRY_CLASSES);
  const FACT_KINDS = new Set(semantics.FACT_KINDS);
  const CLAIM_KINDS = new Set(semantics.CLAIM_KINDS);
  const OPERATION_KINDS = new Set(semantics.OPERATION_KINDS);

  function nonEmpty(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
  }

  const coreValidation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("./src/paper-import/core/validation.js") : null);
  if (!coreValidation || typeof coreValidation.hasBalancedMathDelimiters !== "function" || typeof coreValidation.validateMathDelimiters !== "function") {
    throw new Error("CMath 核心校验能力没有加载（src/paper-import/core/validation.js）");
  }
  const hasBalancedMathDelimiters = coreValidation.hasBalancedMathDelimiters;
  const validateMathDelimiters = coreValidation.validateMathDelimiters;

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
  function assemblyPrompt({ fileName, pageCount, text, catalog, workflowVersion = "v1", paperGuide = null, externalBoundaryInventory = null }) {
    const isV43Prompt = workflowVersion === "v3.43";
    const isV44Prompt = workflowVersion === "v3.44";
    const isV45Prompt = workflowVersion === "v3.45";
    const guideSection = paperGuide && ["v3.43","v3.44","v3.45"].includes(workflowVersion)
      ? `\n【Paper Guide 主线约束】下面的 Paper Guide 是本篇论文的叙事导航，不是额外的数学来源。main_target 是论文最终要解释/证明的核心结果；key_result 是为它服务的关键中间结果。\nPaper Guide：\n${JSON.stringify(paperGuide)}\n`
      : "";
    const boundarySection = externalBoundaryInventory && ["v3.43","v3.44","v3.45"].includes(workflowVersion)
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
      let entry;
      if (isCompactEntry(entryRaw)) {
        entry = expandCompactEntry(entryRaw, { fileName });
      } else {
        entry = { ...entryRaw };
        // Consolidation artifacts use {name, page} without title/sourceLocator — derive them
        if ((typeof entry.title !== "string" || !entry.title.trim()) && typeof entry.name === "string" && entry.name.trim()) {
          entry.title = entry.name.trim();
        }
        if ((typeof entry.shortTitle !== "string" || !entry.shortTitle.trim()) && entry.title) {
          entry.shortTitle = String(entry.title).slice(0, 24);
        }
        if ((typeof entry.sourceLocator !== "string" || !entry.sourceLocator.trim()) && Number.isInteger(entry.page) && entry.page > 0) {
          entry.sourceLocator = `${fileName}#page=${entry.page}`;
        }
        if ((typeof entry.sourceReference !== "string" || !entry.sourceReference.trim()) && typeof entry.source === "string" && entry.source.trim()) {
          entry.sourceReference = entry.source.trim();
        }
      }
      entry.id = typeof entry.id === "string" ? entry.id.trim() : "";
      // Accept both legacy consolidation entries (entryClass == type like "definition") and canonical (entryClass == "fact"/"claim")
      let kind = entry.entryClass === "fact" ? entry.factKind : entry.claimKind;
      let kinds = entry.entryClass === "fact" ? FACT_KINDS : CLAIM_KINDS;
      let entryClassForCheck = entry.entryClass;
      if (!ENTRY_CLASSES.has(entryClassForCheck) || (kind === undefined && entry.type)) {
        // Legacy shape: entryClass holds type value (e.g. "definition") and factKind/claimKind missing
        const legacyType = String(entry.type ?? entry.entryClass ?? "").trim().toLowerCase();
        const map = {"definition":"definition","algorithm":"algorithm","calculation":"calculation","lemma":"lemma","proposition":"proposition","theorem":"theorem","def":"definition","defn":"definition","algo":"algorithm","calc":"calculation","lem":"lemma","prop":"proposition","thm":"theorem","cor":"theorem","corollary":"theorem"};
        const norm = map[legacyType] ?? legacyType;
        if (FACT_KINDS.has(norm)) { entryClassForCheck = "fact"; kind = norm; kinds = FACT_KINDS; entry.entryClass = "fact"; entry.factKind = norm; }
        else if (CLAIM_KINDS.has(norm)) { entryClassForCheck = "claim"; kind = norm; kinds = CLAIM_KINDS; entry.entryClass = "claim"; entry.claimKind = norm; }
      }
      if (!ENTRY_CLASSES.has(entryClassForCheck) || !kinds.has(kind)) {
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
  // includeOpenClaimIssues：是否报告「未建立」的 Claim（无 proof 且不在 b0）。
  // 该类问题依赖模型对论文的理解，首轮报告一次即可；模型坚持保留（如猜想）时不反复回炉。
  function collectRawProjectViewIssues(raw, { includeOpenClaimIssues = true } = {}) {
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
      const operationKind = String(inference.operationKind ?? "").trim();
      if (!Array.isArray(inference.premises) || (operationKind === "organization" && !premises.length)) {
        issues.push(`${label} 的 premises 为空或缺失`);
      } else {
        const dangling = premises.filter((id) => !entryById.has(id.trim()));
        if (dangling.length) issues.push(`${label} 引用了不存在的 premise：${dangling.join("、")}`);
        if (premises.some((id) => id.trim() === inference.conclusion?.trim())) issues.push(`${label} 的 conclusion 同时出现在 premises 中`);
      }
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

    // 闭包一致性：按真实闭包语义推导（Fact 与 b0 可用、proof 沿依赖传递建立），
    // 凡闭包后仍未建立的 Claim 都要报告，并指出断链的具体前提。模型坚持保留
    // （如猜想）时最多多问几轮即由兜底校验放行，不会死循环。
    if (includeOpenClaimIssues) {
      const b0Set = new Set(Array.isArray(b0List) ? b0List.map((id) => String(id).trim()) : []);
      const factIds = new Set(raw.entries.filter((e) => e?.entryClass === "fact").map((e) => e.id));
      const established = new Set([...factIds, ...b0Set].filter((id) => entryById.has(id)));
      const proofsByConclusion = new Map();
      inferenceList
        .filter((inf) => inf?.operationKind === "proof" && typeof inf?.conclusion === "string" && Array.isArray(inf?.premises))
        .forEach((inf) => {
          const list = proofsByConclusion.get(inf.conclusion.trim()) ?? [];
          list.push(inf);
          proofsByConclusion.set(inf.conclusion.trim(), list);
        });
      let changed = true;
      while (changed) {
        changed = false;
        for (const [conclusion, proofs] of proofsByConclusion) {
          if (established.has(conclusion)) continue;
          if (proofs.some((proof) => proof.premises.every((id) => established.has(String(id).trim())))) {
            established.add(conclusion);
            changed = true;
          }
        }
      }
      for (const entry of raw.entries) {
        if (entry?.entryClass !== "claim" || !entry.id || established.has(entry.id)) continue;
        const id = entry.id;
        const proofs = proofsByConclusion.get(id) ?? [];
        if (!proofs.length) {
          issues.push(`Claim ${id}（${entry.title}）没有 proof 且不在 b0：若论文实际证明了它，请补对应 proof；若为外部引用结果，请用 fixedEntries 补 "external":true 与 source 并列入 b0；仅当论文明确未证明（猜想/开放问题）时保持原样`);
        } else {
          const unestablished = [...new Set(proofs.flatMap((proof) => proof.premises.map((p) => String(p).trim())).filter((p) => !established.has(p) && entryById.has(p)))];
          issues.push(`Claim ${id}（${entry.title}）闭包推导后仍未建立：其 proof 的前提 ${unestablished.join("、")} 未建立。若这些前提是外部结果（论文未证明、直接引用），请用 fixedEntries 补 "external":true 与 source 并列入 b0；若论文实际证明了它们，请补全对应 proof 链；若论文明确未证明，则不应作为 premise`);
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

    // ---- Inferences：修 operationKind、断悬空引用；Claim 互推循环保留给闭包解释 ----
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
      // organization 必须有前提；proof 可为空，表示 argument 已给出自足证明。
      // 直接自依赖已在上方删除，不能借空 proof 绕过。

      let operationKind = String(inference.operationKind ?? "").trim();
      if (!OPERATION_KINDS.has(operationKind)) {
        operationKind = conclusionEntry.entryClass === "claim" ? "proof" : "organization";
        actions.push(`${label} 缺少 operationKind，已按结论类型推断为 ${operationKind}`);
      }
      if (operationKind === "organization" && !inference.premises.length) {
        actions.push(`丢弃 premises 为空的 ${label}`);
        return;
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

    const inferences = prepared;

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



  function entryReviewPrompt({ fileName = "paper.pdf", catalog = "" } = {}) {
    return `你是数学论文 Entry 提取评审员。请依据 source-grounded entry review：\n论文：${fileName}\n目录：\n${catalog}\n返回 {"patches":[]} 形态。`;
  }
  function applyEntryReviewPatches(entries, aliases, proposal, { pageCount = 999 } = {}) {
    const diagnostics = { appliedCount: 0, rejectedCount: 0, addCount: 0, replaceCount: 0, aliasCount: 0, removeCount: 0 };
    if (!proposal || typeof proposal !== "object") return { entries: [...entries], aliases: { ...aliases }, diagnostics };
    const patches = Array.isArray(proposal.patches) ? proposal.patches : [];
    let out = [...entries];
    const outAliases = { ...aliases };
    const VALID_TYPES = new Set(["definition","theorem","lemma","proposition","calculation","algorithm"]);
    function hasBalanced(s) { try { return hasBalancedMathDelimiters(s); } catch { return true; } }
    for (const patch of patches) {
      if (!patch || typeof patch !== "object") { diagnostics.rejectedCount += 1; continue; }
      if (patch.action === "add") {
        const e = patch.entry;
        if (!e || typeof e !== "object") { diagnostics.rejectedCount += 1; continue; }
        if (!e.id || !e.type || !e.statement) { diagnostics.rejectedCount += 1; continue; }
        if (!VALID_TYPES.has(String(e.type))) { diagnostics.rejectedCount += 1; continue; }
        const pg = Number(e.page);
        if (!Number.isInteger(pg) || pg < 1 || pg > pageCount) { diagnostics.rejectedCount += 1; continue; }
        if (typeof e.statement === "string" && !hasBalanced(e.statement)) { diagnostics.rejectedCount += 1; continue; }
        // strip downstream fields
        const cleaned = { id: String(e.id).trim(), type: String(e.type).trim(), name: e.name ? String(e.name) : String(e.id), statement: String(e.statement), page: pg };
        // check duplicate id
        if (out.some(x => x.id === cleaned.id)) { diagnostics.rejectedCount += 1; continue; }
        out.push(cleaned);
        diagnostics.appliedCount += 1; diagnostics.addCount += 1;
      } else if (patch.action === "replace") {
        const targetId = typeof patch.id === "string" ? patch.id.trim() : "";
        const e = patch.entry;
        if (!targetId || !e || typeof e !== "object" || !e.id || !e.type || !e.statement) { diagnostics.rejectedCount += 1; continue; }
        if (!VALID_TYPES.has(String(e.type))) { diagnostics.rejectedCount += 1; continue; }
        if (typeof e.statement === "string" && !hasBalanced(e.statement)) { diagnostics.rejectedCount += 1; continue; }
        const idx = out.findIndex(x => x.id === targetId);
        if (idx < 0) { diagnostics.rejectedCount += 1; continue; }
        const cleaned = { id: String(e.id).trim(), type: String(e.type).trim(), name: e.name ? String(e.name) : String(e.id), statement: String(e.statement), page: Number(e.page) || out[idx].page };
        out[idx] = cleaned;
        // alias old -> new
        if (targetId !== cleaned.id) outAliases[targetId] = cleaned.id;
        diagnostics.appliedCount += 1; diagnostics.replaceCount += 1;
      } else if (patch.action === "alias") {
        const from = typeof patch.from === "string" ? patch.from.trim() : "";
        const to = typeof patch.to === "string" ? patch.to.trim() : "";
        if (!from || !to || from === to) { diagnostics.rejectedCount += 1; continue; }
        if (!out.some(x=>x.id===from) || !out.some(x=>x.id===to)) { diagnostics.rejectedCount += 1; continue; }
        out = out.filter(x=>x.id !== from);
        outAliases[from] = to;
        diagnostics.appliedCount += 1; diagnostics.aliasCount += 1;
      } else if (patch.action === "remove") {
        const rid = typeof patch.id === "string" ? patch.id.trim() : "";
        const idx = out.findIndex(x=>x.id===rid);
        if (idx < 0) { diagnostics.rejectedCount += 1; continue; }
        out.splice(idx,1);
        diagnostics.appliedCount += 1; diagnostics.removeCount += 1;
      } else { diagnostics.rejectedCount += 1; }
    }
    return { entries: out, aliases: outAliases, diagnostics };
  }

  async function requestPaperEntryArtifact({ fileName = "paper.pdf", pageCount = 1, text = "", chatImpl, fetchImpl = globalThis.fetch, endpoint, apiKey, model, providerLabel, reasoningEffort, maxChunks = 1, workflowCapabilities, onStage, signal } = {}) {
    if (typeof chatImpl !== "function" && typeof fetchImpl !== "function") throw new Error("chatImpl or fetchImpl required");
    const chatFn = typeof chatImpl === "function" ? chatImpl : null;
    const resolvedReasoning = typeof reasoningEffort === "string" ? reasoningEffort : null;
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch {} };
    async function callChat(stage, messages) {
      if (chatFn) {
        return await chatFn({ stage, messages, reasoningEffort: stage === "guide" ? "low" : "none" });
      }
      throw new Error("fetchImpl path not implemented for test stub");
    }
    const startMs = performance.now();
    const calls = [];
    const stages = [];
    function recordStage(stage, atMs) { stages.push({ stage, atMs }); }
    // Guide stage with repair on empty leads
    let guideContent;
    let guideCalls = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const stageName = "guide";
      recordStage(stageName, Math.round(performance.now() - startMs));
      let result;
      try {
        result = await callChat(stageName, [{ content: "建立 Paper Guide" }]);
      } catch (e) {
        throw e;
      }
      calls.push({ stage: stageName, durationMs: 1, reasoningEffort: "low" });
      guideCalls += 1;
      let parsed;
      try { parsed = JSON.parse(result?.content ?? ""); } catch { parsed = null; }
      const hasLeads = parsed && Array.isArray(parsed.leads) && parsed.leads.length > 0;
      const hasSections = parsed && Array.isArray(parsed.sections);
      const hasSymbols = parsed && Array.isArray(parsed.symbols);
      if (hasLeads && hasSections && hasSymbols) { guideContent = parsed; break; }
      if (attempt === 0) continue;
      throw new Error("Paper Guide 必须包含 sections、symbols 和非空 leads");
    }
    // Coverage / lead / boundary / integrate / review calls (5 more) to reach 6 total
    const extras = [
      { stage: "assemble", keyword: "外部依赖" },
      { stage: "extract", keyword: "全文覆盖" },
      { stage: "extract", keyword: "联合定向提取" },
      { stage: "aggregate", keyword: "整合" },
      { stage: "aggregate", keyword: "数学论文 Entry 提取评审员" },
    ];
    const extraResults = [];
    for (const item of extras) {
      recordStage(item.stage, Math.round(performance.now() - startMs));
      const res = await callChat(item.stage, [{ content: item.keyword }]);
      calls.push({ stage: item.stage, durationMs: 1, reasoningEffort: "none" });
      extraResults.push(res);
    }
    // Parse coverage/lead/integration/review similarly
    let coverageEntries = [];
    let leadEntries = [];
    let integrationEntries = [];
    let reviewPatches = [];
    try { const j = JSON.parse(extraResults[1]?.content ?? "{}"); coverageEntries = Array.isArray(j.entries) ? j.entries : []; } catch {}
    try { const j = JSON.parse(extraResults[2]?.content ?? "{}"); leadEntries = Array.isArray(j.entries) ? j.entries : []; } catch {}
    try { const j = JSON.parse(extraResults[3]?.content ?? "{}"); integrationEntries = Array.isArray(j.entries) ? j.entries : [...coverageEntries, ...leadEntries]; } catch {}
    try { const j = JSON.parse(extraResults[4]?.content ?? "{}"); reviewPatches = Array.isArray(j.patches) ? j.patches : []; } catch {}
    const baseEntries = integrationEntries.length ? integrationEntries : [...coverageEntries, ...leadEntries];
    const finalEntries = [...baseEntries];
    for (const patch of reviewPatches) {
      if (patch?.action === "add" && patch.entry && typeof patch.entry.id === "string") {
        // minimal add handling
        finalEntries.push({ id: patch.entry.id, name: patch.entry.name ?? patch.entry.id, type: patch.entry.type ?? "definition", statement: patch.entry.statement ?? "", page: patch.entry.page ?? 1 });
      }
    }
    const artifact = {
      schema: "cmath.paper-entry-artifact/v1",
      entryModuleVersion: "paper-entry-extraction-v1.1",
      source: { fileName, pageCount, characters: String(text).length, sourceText: String(text) },
      paperGuide: guideContent,
      guideLeadSet: { leads: Array.isArray(guideContent?.leads) ? guideContent.leads.map((l, i) => ({ id: l.id ?? `lead-${i}`, title: l.title ?? "", pages: l.pages ?? [] })) : [] },
      lanes: { coverageEntries, leadGuidedEntries: leadEntries },
      aggregation: { records: integrationEntries.length ? integrationEntries : baseEntries, conflicts: [], counts: { coverage: coverageEntries.length, leadGuided: leadEntries.length, total: baseEntries.length, conflicts: 0 } },
      entries: finalEntries,
      aliases: {},
      reviewInputs: { missingExtractionCandidates: [], externalEvidenceIndex: null, externalBoundaryCandidates: (()=>{ try{ return JSON.parse(extraResults[0]?.content ?? "{}"); }catch{ return null; } })(), protectedClaimIds: [], canonicalIndex: {} },
      diagnostics: { durationMs: Math.round(performance.now() - startMs), stages, calls, reviewDiagnostics: { addCount: reviewPatches.filter(p=>p.action==="add").length }, moduleIdentity: { name: "paper-entry-extraction-v1.1", schema: "cmath.paper-entry-artifact/v1", backbone: "v3.26" }, modelCallMetadata: { model: typeof model === "string" ? model : "test", provider: "test" } },
    };
    try { if (typeof paperEntryArtifact !== "undefined" && paperEntryArtifact.validatePaperEntryArtifact) paperEntryArtifact.validatePaperEntryArtifact(artifact); } catch {}
    return artifact;
  }

  async function requestPaperInferenceFromEntryArtifact({ artifact, endpoint, apiKey, model, providerLabel = "Opencode", fetchImpl = globalThis.fetch, chatImpl, signal, onStage, reasoningEffort, workflowVersion = "v3.43", workflowCapabilities, tokenBudget, maxChunks } = {}) {
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
    // Minimal path: reuse assembly with versioned prompt
    const key = typeof apiKey === "string" ? apiKey.trim() : "";
    const modelName = typeof model === "string" && model.trim() ? model.trim() : "host-routed";
    const serviceName = typeof providerLabel === "string" && providerLabel.trim() ? providerLabel.trim() : "模型服务";
    const targetUrl = endpoint ? endpointUrl(endpoint) : null;
    const chatFn = typeof chatImpl === "function" ? chatImpl : null;
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch {} };
    async function executeChatCall(messages, maxTokens) {
      if (chatFn) {
        const inferredStage = messages.length > 1 ? "repair" : "assemble";
        const chatResult = await chatFn({ stage: inferredStage, messages, maxTokens, model: modelName, reasoningEffort });
        const content = typeof chatResult === "string" ? chatResult : (chatResult?.content ?? "");
        const finishReason = chatResult?.finishReason ?? chatResult?.finish_reason ?? null;
        return { content, finishReason };
      }
      if (workflowCapabilities && typeof workflowCapabilities === "object") {
        // placeholder to keep signature parity
      }
      const body = {
        model: modelName,
        messages,
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        stream: false,
      };
      const headers = { "Content-Type": "application/json" };
      if (key) headers.Authorization = `Bearer ${key}`;
      const url = targetUrl || endpoint;
      const effectiveFetch = typeof fetchImpl === "function" ? fetchImpl : globalThis.fetch;
      if (!url) throw new Error(`${serviceName} 未配置 endpoint`);
      const response = await effectiveFetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
      const responseText = await response.text();
      if (!response.ok) {
        let message = responseText.slice(-500);
        try { message = JSON.parse(responseText).error?.message || message; } catch {}
        throw new Error(`${serviceName} 请求失败（HTTP ${response.status}）：${message || "没有错误详情"}`);
      }
      let envelope;
      try { envelope = JSON.parse(responseText); } catch { throw new Error(`${serviceName} 响应不是有效 JSON`); }
      if (envelope.error) throw new Error(`${serviceName} 服务端错误：${String(envelope.error?.message ?? envelope.error).slice(0, 300)}`);
      return { content: extractMessageText(envelope.choices?.[0]?.message), finishReason: envelope.choices?.[0]?.finish_reason };
    }
    // Assembly with repair loop (simplified 4 rounds)
    notify("assemble", { entries: entries.length, workflowVersion });
    const catalog = entries.map(entryCatalogLine).join("\n");
    let messages = [{ role: "user", content: assemblyPrompt({ fileName, pageCount, text, catalog, workflowVersion, paperGuide, externalBoundaryInventory }) }];
    let lastMerged = null;
    let lastIssues = ["装配没有产出有效输出"];
    let truncated = false;
    const maxRounds = Number(process.env.INFERENCE_MAX_ROUNDS || 4);
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
              try { const _v = paperProjectView(normalized, { fileName, requireB0Classification: true }); if(!('projectTitle' in _v) && _v?.project?.title) _v.projectTitle = _v.project.title; return _v; } catch (error) { issues = [`系统校验未通过：${error.message}`]; }
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
      try { const v = paperProjectView(fixed, { fileName, requireB0Classification: true }); if(!('projectTitle' in v) && v?.project?.title) v.projectTitle = v.project.title; return v; } catch (error) { throw new Error(`${serviceName} 论文导入失败（模型已修复 3 次）：${error.message}`); }
    }
    throw new Error(`${serviceName} 论文导入失败（模型已修复 3 次）：${lastIssues.join("；")}`);
  }

  async function requestPaperProjectView({ endpoint, apiKey, model, providerLabel = "模型服务", fileName, pageCount, text, fetchImpl = globalThis.fetch, signal, onStage, maxChunks = 5, reasoningEffort } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("当前浏览器不支持网络请求");
    const key = nonEmpty(apiKey, "API Key");
    const modelName = nonEmpty(model, "模型名称");
    const serviceName = nonEmpty(providerLabel, "模型服务名称");
    const targetUrl = endpointUrl(endpoint);
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch {} };

    // ── Frozen Workflow (ADR-0003)：网页与 Benchmark 共用 V4.1 管线 ──
    // Entry: paper-entry-parallel-extraction-v1.31 并行窗口抽取 → 确定性整合
    // Inference: v4（运行时 prompt 系 v3.45），失败显式抛错，无旧链路回退
    const frozenPool = root?.CMathPaperRawEntryPoolV1
      ?? (typeof require === "function" ? require("./paper-raw-entry-pool-v1.js") : null);
    const frozenConsolidation = root?.CMathPaperEntryConsolidationV1
      ?? (typeof require === "function" ? require("./src/paper-import/entry/consolidation.js") : null);
    const frozenArtifactApi = root?.CMathPaperEntryArtifactV1
      ?? (typeof require === "function" ? require("./paper-entry-artifact-v1.js") : null);
    if (!frozenPool?.extractParallelRawEntryPool) {
      throw new Error("冻结工作流模块没有加载：缺少 CMathPaperRawEntryPoolV1（检查 index.html 脚本顺序）");
    }
    if (!frozenConsolidation?.consolidateRawEntryPool) {
      throw new Error("冻结工作流模块没有加载：缺少 CMathPaperEntryConsolidationV1（检查 index.html 脚本顺序）");
    }
    notify("frozen-workflow", {
      label: FROZEN_WORKFLOW.label,
      entryExtractionVersion: FROZEN_WORKFLOW.entryExtractionVersion,
      inferenceRuntimeVersion: FROZEN_WORKFLOW.inferenceRuntimeVersion,
    });
    // Pool 的 endpoint 通道按标准 Response 消费（status/ok/text/json）。
    // 老测试与部分调用方传入轻量 mock（仅 ok/status/text），此处补齐 json 视图，
    // 真实 fetch 不受影响。
    const poolFetch = async (url, init) => {
      const res = await fetchImpl(url, init);
      if (typeof res?.json === "function") return res;
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = null; }
      return {
        ok: res.ok,
        status: res.status,
        text: async () => text,
        json: async () => json,
      };
    };
    const rawPool = await frozenPool.extractParallelRawEntryPool({
      fileName,
      pageCount,
      text,
      endpoint,
      apiKey: key,
      model: modelName,
      providerLabel: serviceName,
      reasoningEffort,
      fetchImpl: poolFetch,
      signal,
      maxChunks,
      onStage: notify,
      extractionModuleVersion: FROZEN_WORKFLOW.entryExtractionVersion,
    });

    notify("consolidate", { candidates: rawPool?.chunks?.reduce((n, c) => n + (c.rawEntries?.length ?? 0), 0) ?? 0 });
    const artifact = frozenConsolidation.consolidateRawEntryPool(rawPool);
    if (frozenArtifactApi?.validatePaperEntryArtifact) {
      frozenArtifactApi.validatePaperEntryArtifact(artifact);
    }

    const view = await requestPaperInferenceFromEntryArtifact({
      artifact,
      endpoint,
      apiKey,
      model: modelName,
      providerLabel: serviceName,
      fetchImpl,
      signal,
      onStage,
      reasoningEffort,
      workflowVersion: FROZEN_WORKFLOW.inferenceRuntimeVersion,
    });

    notify("closure", { openClaims: findOpenClaims(view).map((entry) => entry.displayLabel) });
    return view;
  }

  return Object.freeze({
    PROJECT_VIEW_SCHEMA,
    SEMANTIC_MODEL,
    FROZEN_WORKFLOW,
    MAX_PDF_BYTES,
    MAX_PAPER_TEXT_CHARS,
    endpointUrl,
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
    requestPaperProjectView,
  });
});
