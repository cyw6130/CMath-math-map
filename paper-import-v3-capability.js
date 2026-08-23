/**
 * @cmath-provenance
 * @package paper-dossier-extractor-v2
 * @version v2.1
 * @canonicalSource packages/research-process/import/paper-dossier-extractor-v2/browser-assets/paper-import-v3.js
 * @contentHash sha256:0e7c646b02a7a8c51fe76ce906faaf1b2ceb7d86016a3ea2eaca6374ac5da782
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Run npm run sync-capabilities.
 */
(function publishPaperDossierExtractorV2(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperDossierExtractorV2 = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperDossierExtractorV2() {
  "use strict";

  const PAPER_GUIDE_SCHEMA = "cmath.paper-guide/v0.1";
  const EXTRACTION_SCHEMA = "cmath.paper-entry-extraction/v0.3";
  const NARRATIVE_ROLES = new Set(["main_target", "key_result", "supporting_result"]);
  const ENTRY_TYPES = new Set(["definition", "algorithm", "calculation", "lemma", "proposition", "theorem"]);

  function requiredText(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
  }
  function sourceContext({ fileName, pageCount, text }) {
    return `论文文件：${requiredText(fileName, "fileName")}\n页数：${Number(pageCount) || 0}\n\n论文文本：\n${requiredText(text, "text")}`;
  }
  function buildPaperGuidePromptFromText(input) {
    return `你是数学论文结构编辑器。先为单篇、文本层清晰的 PDF 建立 Paper Guide。它是复杂 Corpus Guide 的 PDF 专用补充，只负责抓住这篇论文的叙事主线，不替代多文件语料导航。\n\n`
      + `只输出 JSON，不要 Markdown。schema 必须是 ${PAPER_GUIDE_SCHEMA}，kind 必须是 paper_guide。\n`
      + `输出 sections、symbols、leads。每条 lead 必须包含 id、title、statement、narrative_role、related_lead_ids、expansion_needs、pages；narrative_role 只能是 main_target、key_result、supporting_result。\n`
      + `main_target 是论文最终目标，key_result 是主线所需关键中间结果，supporting_result 是重要支撑结果。related_lead_ids 只表示叙事关联，绝不是证明边。expansion_needs 明确记录后续提取应展开的定义、引理、假设、外部结果或证明段落。\n`
      + `sections 与 symbols 都应保留 pages。不要评价真伪，不要补造论文没有的数学，不要创建正式 Entry、Inference 或状态修改。\n\n`
      + `JSON 形状：{"schema":"${PAPER_GUIDE_SCHEMA}","kind":"paper_guide","sections":[{"id":"section:intro","title":"引言","pages":[1]}],"symbols":[{"id":"symbol:x","name":"$X$","meaning":"……","pages":[2]}],"leads":[{"id":"lead:main","title":"……","statement":"……","narrative_role":"main_target","related_lead_ids":[],"expansion_needs":["……"],"pages":[3]}]}\n\n`
      + sourceContext(input);
  }
  function entryRules() {
    return `type 只能是 definition|algorithm|calculation|lemma|proposition|theorem；前三者是 Fact，后三者是 Claim。name 与 statement 使用简体中文，数学公式保留成对的 $...$ 或 $$...$$。完整保留假设、量词与局部约定。论文未证明而直接调用的外部 Claim 标记 external:true，并填写可由论文确认的 source。不要输出 Inference，不要把 related_lead_ids 当作证明边。每条 Entry 必须填写实际 page。`;
  }
  function buildCoverageEntriesPrompt({ fileName, pageCount, text, paperGuide, pageRange = null }) {
    const guide = parsePaperGuideResponse(paperGuide);
    const range = pageRange ? `本段覆盖第 ${pageRange.first}–${pageRange.last} 页；相邻段可能重叠，下游会合并。` : `本次覆盖全文。`;
    return `你是数学论文结构编辑器。沿全文覆盖通道提取数学对象；Paper Guide 只帮助定位，不能让你跳过非主线但明确编号、命名或被证明实际使用的对象。${range}\n\n`
      + `只输出 JSON，不要 Markdown。schema 为 ${EXTRACTION_SCHEMA}，lane 为 coverage，形状为 {"schema":"${EXTRACTION_SCHEMA}","lane":"coverage","entries":[{"id":"paper:thm:main","type":"theorem","name":"……","statement":"……","page":3}]}。\n`
      + `${entryRules()}\n\nPAPER GUIDE：\n${JSON.stringify(guide)}\n\n` + sourceContext({ fileName, pageCount, text });
  }
  function buildLeadGuidedEntriesPrompt({ fileName, pageCount, text, paperGuide, lead }) {
    const guide = parsePaperGuideResponse(paperGuide);
    const selected = guide.leads.find((item) => item.id === lead?.id);
    if (!selected) throw new Error(`Paper Guide 中不存在 lead：${lead?.id ?? ""}`);
    return `你是数学论文结构编辑器。沿叙事主线定向提取：围绕选定 lead 展开其结论、直接需要的定义/引理/外部结果、论文实际给出的证明，以及 expansion_needs 指向的内容。它是全文覆盖通道的补充，不是证明关系的自动生成器。\n\n`
      + `只输出 JSON，不要 Markdown。schema 为 ${EXTRACTION_SCHEMA}，lane 为 lead-guided，形状为 {"schema":"${EXTRACTION_SCHEMA}","lane":"lead-guided","lead_id":"${selected.id}","entries":[{"id":"paper:thm:main","type":"theorem","name":"……","statement":"……","page":3}]}。\n`
      + `${entryRules()} 不要因为主线需要就发明正文中没有的前提。\n\nSELECTED LEAD：\n${JSON.stringify(selected)}\n\nPAPER GUIDE：\n${JSON.stringify(guide)}\n\n` + sourceContext({ fileName, pageCount, text });
  }
  function buildLeadSetGuidedEntriesPrompt({ fileName, pageCount, text, paperGuide, leads }) {
    const guide = parsePaperGuideResponse(paperGuide);
    if (!Array.isArray(leads) || !leads.length) throw new Error("主线集合不能为空");
    const selected = leads.map((lead) => {
      const found = guide.leads.find((item) => item.id === lead?.id);
      if (!found) throw new Error(`Paper Guide 中不存在 lead：${lead?.id ?? ""}`);
      return found;
    });
    return `你是数学论文结构编辑器。沿叙事主线集合进行一次联合定向提取：同时围绕所有选定 lead 展开其结论、直接需要的定义/引理/外部结果、论文实际给出的证明，以及 expansion_needs 指向的内容。识别主线之间共享的对象和依赖，避免为每条主线重复输出同一 Entry。它是全文覆盖通道的补充，不是证明关系的自动生成器。\n\n`
      + `只输出 JSON，不要 Markdown。schema 为 ${EXTRACTION_SCHEMA}，lane 为 lead-guided，形状为 {"schema":"${EXTRACTION_SCHEMA}","lane":"lead-guided","lead_ids":["lead:main"],"entries":[{"id":"paper:thm:main","type":"theorem","name":"……","statement":"……","page":3}]}。\n`
      + `${entryRules()} 不要因为主线需要就发明正文中没有的前提。\n\nSELECTED LEADS：\n${JSON.stringify(selected)}\n\nPAPER GUIDE：\n${JSON.stringify(guide)}\n\n` + sourceContext({ fileName, pageCount, text });
  }
  function parsePaperGuideResponse(value) {
    const guide = typeof value === "string" ? JSON.parse(value) : value;
    if (!guide || typeof guide !== "object" || guide.schema !== PAPER_GUIDE_SCHEMA || guide.kind !== "paper_guide") throw new Error("Paper Guide schema 不匹配");
    if (!Array.isArray(guide.sections) || !Array.isArray(guide.symbols) || !Array.isArray(guide.leads) || !guide.leads.length) throw new Error("Paper Guide 必须包含 sections、symbols 和非空 leads");
    const ids = new Set();
    for (const lead of guide.leads) {
      requiredText(lead?.id, "lead.id"); requiredText(lead?.title, `lead ${lead?.id} title`); requiredText(lead?.statement, `lead ${lead?.id} statement`);
      if (ids.has(lead.id)) throw new Error(`Paper Guide lead id 重复：${lead.id}`);
      ids.add(lead.id);
      if (!NARRATIVE_ROLES.has(lead.narrative_role)) throw new Error(`Paper Guide narrative_role 无效：${lead.id}`);
      if (!Array.isArray(lead.related_lead_ids) || !Array.isArray(lead.expansion_needs) || !Array.isArray(lead.pages)) throw new Error(`Paper Guide lead 字段不完整：${lead.id}`);
    }
    // Narrative relations are optional navigation hints, not proof edges. Model
    // output occasionally contains a stale/nearby lead id; keeping that hint
    // must not abort an otherwise source-anchored extraction run.
    for (const lead of guide.leads) lead.related_lead_ids = lead.related_lead_ids.filter((related) => ids.has(related) && related !== lead.id);
    return guide;
  }
  function parseExtractionEntriesResponse(value, lane, { normalizeGenericClaims = false, genericClaimFallback = null } = {}) {
    const proposal = typeof value === "string" ? JSON.parse(value) : value;
    if (!proposal || typeof proposal !== "object" || !Array.isArray(proposal.entries)) throw new Error(`${lane} 提取结果必须包含 entries`);
    if (proposal.schema && proposal.schema !== EXTRACTION_SCHEMA) throw new Error(`${lane} 提取 schema 不匹配`);
    if (proposal.lane && proposal.lane !== lane) throw new Error(`${lane} 提取 lane 不匹配`);
    return proposal.entries.map((entry) => {
      // Models occasionally echo a qualified identifier (for example
      // `paper:theorem:self-gluing`) in the type field or emit generic `claim`.
      // Normalize only the known mathematical kinds; never infer an invalid kind.
      const rawType = typeof entry?.type === "string" ? entry.type.trim().toLowerCase() : "";
      const rawId = typeof entry?.id === "string" ? entry.id.trim().toLowerCase() : "";
      const rawName = typeof entry?.name === "string" ? entry.name.trim().toLowerCase() : "";
      const rawStatement = typeof entry?.statement === "string" ? entry.statement.trim().toLowerCase() : "";

      if (rawType === "corollary" || rawType.includes("proposition") || rawType.includes("corollary")) {
        entry.type = "proposition";
      } else if (rawType.includes("theorem")) {
        entry.type = "theorem";
      } else if (rawType.includes("lemma")) {
        entry.type = "lemma";
      } else if (rawType.includes("definition")) {
        entry.type = "definition";
      } else if (rawType.includes("algorithm")) {
        entry.type = "algorithm";
      } else if (rawType.includes("calculation")) {
        entry.type = "calculation";
      } else if (rawId.includes(":calculation:")) {
        entry.type = "calculation";
      } else if (rawId.includes(":definition:")) {
        entry.type = "definition";
      } else if (rawId.includes(":algorithm:")) {
        entry.type = "algorithm";
      } else if (rawId.includes(":proposition:") || rawId.includes(":corollary:")) {
        entry.type = "proposition";
      } else if (rawId.includes(":theorem:")) {
        entry.type = "theorem";
      } else if (rawId.includes(":lemma:")) {
        entry.type = "lemma";
      } else if (normalizeGenericClaims && (rawType === "claim" || rawType.includes("claim") || rawId.includes(":claim:"))) {
        if (rawName.includes("引理") || rawStatement.includes("引理") || rawName.includes("lemma") || rawStatement.includes("lemma")) {
          entry.type = "lemma";
        } else if (rawName.includes("定理") || rawStatement.includes("定理") || rawName.includes("theorem") || rawStatement.includes("theorem")) {
          entry.type = "theorem";
        } else if (rawName.includes("命题") || rawStatement.includes("命题") || rawName.includes("推论") || rawStatement.includes("推论") || rawName.includes("proposition") || rawStatement.includes("proposition") || rawName.includes("corollary") || rawStatement.includes("corollary")) {
          entry.type = "proposition";
        } else if (genericClaimFallback === "lemma") {
          // V3.19-only caller contract: retain an otherwise untyped local
          // Claim as a proof obligation instead of failing at parsing.
          entry.type = "lemma";
        }
      }

      requiredText(entry?.id, `${lane} entry.id`); requiredText(entry?.name, `${lane} entry.name`); requiredText(entry?.statement, `${lane} entry.statement`);
      if (!ENTRY_TYPES.has(entry.type)) throw new Error(`${lane} Entry type 无效：${entry.id}`);
      if (!Number.isInteger(entry.page) || entry.page < 1) throw new Error(`${lane} Entry page 无效：${entry.id}`);
      return entry;
    });
  }
  return Object.freeze({ PAPER_GUIDE_SCHEMA, EXTRACTION_SCHEMA, buildPaperGuidePromptFromText, buildCoverageEntriesPrompt, buildLeadGuidedEntriesPrompt, buildLeadSetGuidedEntriesPrompt, parsePaperGuideResponse, parseExtractionEntriesResponse });
});
