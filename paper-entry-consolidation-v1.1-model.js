/**
 * @file paper-entry-consolidation-v1.1-model.js
 * Model-assisted consolidation runner for converting a Raw Entry Pool artifact
 * into an independently scorable and valid Paper Entry artifact.
 * Schema: cmath.paper-entry-artifact/v1
 * ConsolidationModuleVersion: paper-entry-consolidation-v1.1-model
 */
(function publishPaperEntryConsolidationV11Model(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryConsolidationV11Model = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createPaperEntryConsolidationV11ModelModule(root) {
  "use strict";

  const ENTRY_ARTIFACT_SCHEMA = "cmath.paper-entry-artifact/v1";
  const CONSOLIDATION_MODULE_VERSION = "paper-entry-consolidation-v1.1-model";
  const RAW_ENTRY_POOL_SCHEMA = "cmath.paper-raw-entry-pool/v1";

  const VALID_FACT_TYPES = new Set(["definition", "algorithm", "calculation"]);
  const VALID_CLAIM_TYPES = new Set(["lemma", "proposition", "theorem"]);

  function stripControlCharacters(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/gu, "");
  }

  function isObject(val) {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  function cloneJson(val) {
    if (val === undefined) return undefined;
    return JSON.parse(JSON.stringify(val));
  }

  const { hasBalancedMathDelimiters, validateMathDelimiters } = require("./src/paper-import/core/validation.js");

  function normalizeEntryType(rawType) {
    if (typeof rawType !== "string") return null;
    const lower = rawType.trim().toLowerCase();
    if (lower === "def" || lower === "defn" || lower === "definition") return "definition";
    if (lower === "algo" || lower === "algorithm") return "algorithm";
    if (lower === "calc" || lower === "calculation") return "calculation";
    if (lower === "lem" || lower === "lemma") return "lemma";
    if (lower === "prop" || lower === "proposition") return "proposition";
    if (lower === "thm" || lower === "theorem" || lower === "corollary" || lower === "cor") return "theorem";
    if (VALID_FACT_TYPES.has(lower) || VALID_CLAIM_TYPES.has(lower)) return lower;
    return null;
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
            const hex = jsonStr.slice(i + 2, i + 6);
            if (hex.length === 4 && /^[0-9a-fA-F]{4}$/u.test(hex)) {
              result += "\\u" + hex;
              i += 6;
            } else {
              result += "\\\\";
              repairs += 1;
              i += 1;
            }
          } else {
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

        try {
          return JSON.parse(candidate);
        } catch (_) {
          // Fall through to conservative repair
        }
      }

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

      if (matchedSlice) {
        JSON.parse(candidate);
      }
      throw rawParseErr;
    }
  }

  function resolveRunnerExecutionConfig(mode = "off-compact") {
    const m = String(mode || "off-compact").toLowerCase().trim();
    if (m === "off" || m === "off-compact") {
      return {
        reasoningEffort: "none",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (m === "low" || m === "low-compact") {
      return {
        reasoningEffort: "low",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (m === "medium" || m === "medium-compact") {
      return {
        reasoningEffort: "medium",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (m === "high" || m === "high-compact") {
      return {
        reasoningEffort: "high",
        tokenBudget: { normal: 10000, retry: 16000 },
      };
    }
    if (m === "high-generous") {
      return {
        reasoningEffort: "high",
        tokenBudget: { normal: 32000, retry: 64000 },
      };
    }
    throw new Error(`unknown mode: ${mode}`);
  }

  function consolidationPrompt({ fileName, pageCount, sourceText, candidates = [] }) {
    const candidateJson = JSON.stringify(candidates, null, 2);
    return `你是数学论文 Entry 语义合并与定界规范化编辑器（Model-Assisted Entry Consolidation v1.1）。\n\n`
      + `【任务目标】\n`
      + `你将收到论文的全文文本（含 [[PAGE N]] 页码标记）以及由前端并行通道提取的初始候选对象清单（Pre-canonical Candidates）。\n`
      + `你的唯一任务是对候选对象清单进行语义去重（Deduplication）、定界（Delimitation）与规范化合并，输出一份忠实、紧凑且独立的最终数学对象（Entry）清单。\n\n`
      + `【严格禁止事项（Forbidden Stages）】\n`
      + `- 严禁推导/证明合成（Inference / proof synthesis）：严禁生成任何推导关系、证明过程或依赖链条（如 inference 字段）。\n`
      + `- 严禁下游决策与标记：严禁生成 B0 清单、mainTarget 标记、Paper Guide、评审意见（Review）或全局装配决策。\n`
      + `- 严禁脱离候选清单独立重读全文：候选清单是提议的对象清单，论文全文仅供你校验陈述、验证页码与修复公式破损，不要脱离候选清单凭空重提取全文。\n`
      + `- 严禁臆造或强化数学：绝对不能凭空捏造论文没有的数学结果；严禁强化命题（例如绝对不能把论文中的充分条件或必要条件改写为等价条件/充要条件）。\n\n`
      + `【合并与定界规则（Transformation Rules）】\n`
      + `1. 语义去重与通道合并（Semantic Deduplication）：\n`
      + `   - 合并来自不同分块重叠页或基础通道（Foundation）与结果通道（Result）中的重复、同义候选对象，保留一个规范的 id、统一的数学短名（name）与最精确的数学陈述。\n`
      + `2. 合理定界与原子性（Delimitation & Atomicity）：\n`
      + `   - 将仅仅属于某个定义/定理的属性片段、符号声明、局部中间计算步骤合并进其所属的主条目中，避免过度碎片化。\n`
      + `   - 保持具有独立数学角色的定义、构造算法、显式计算公式、引理、命题、定理的原子性，不要将多个独立定理或独立定义笼统混为一个大条目。\n`
      + `3. 严格范围排除（Scope Filtering）：\n`
      + `   - 排除：章节标题（Headings）、表格行（Table rows）、无独立数学角色的例子（Examples）、历史介绍与评论（Historical remarks）、一般性解释性叙述、以及无法作为独立数学对象的孤立记号声明。\n`
      + `   - 保留：必要的数学概念/空间/代数定义（definition）、独立构造/归一化公式（algorithm/calculation）、论文显式陈述的引理（lemma）、命题（proposition）、定理（theorem）。\n`
      + `4. 破损与占位符识别修复（Corruption Catching & Recovery）：\n`
      + `   - 检查候选对象中是否存在破损占位符、截断文本或控制符（如 "...", "[TODO]", "[corrupted]", 未闭合公式等）。\n`
      + `   - 仅当论文原文（sourceText）中有确切完整的对应陈述时予以修复恢复；若原文不支持或候选已严重损坏不可靠，直接剔除该破损候选。\n`
      + `5. 外部结果（External Attribution）：\n`
      + `   - 论文直接调用但未自行证明的外部经典定理/引理/命题，保留 "external":true 并填写非空 source（所引文献或作者）。严禁臆造页码。\n`
      + `6. 格式与语言规范：\n`
      + `   - type 只能是: definition | algorithm | calculation | lemma | proposition | theorem。\n`
      + `   - name 与 statement 一律使用简体中文撰写，数学符号保留 $...$ / $$...$$ 且必须严格成对闭合。\n`
      + `   - page 必须是对象在正文中实际出现的整数页码（1 到 ${pageCount}），严格依据 [[PAGE N]] 标记。\n`
      + `   - num 填写原论文中的显式正整数编号（如定理 3 填 3），若无或含小数点则省略。\n`
      + `   - id 使用英文小写 slug（如 "paper:def:knot"、"paper:thm:linking-number"）。\n\n`
      + `【输出格式】\n`
      + `直接输出紧凑的 JSON 对象，严禁 Markdown 代码块包裹：\n`
      + `{"entries":[{"id":"paper:def:hopf-map","type":"definition","num":1,"name":"Hopf 映射","statement":"设 $S^3 \\to S^2$ 为 Hopf 纤维丛映射。","page":1}]}\n\n`
      + `论文文件：${fileName}（共 ${pageCount} 页）\n\n`
      + `论文全文文本：\n${sourceText}\n\n`
      + `初始候选对象清单（${candidates.length} 个候选）：\n${candidateJson}`;
  }

  function getDeterministicConsolidator() {
    if (typeof require === "function") {
      try {
        return require("./paper-entry-consolidation-v1.js");
      } catch (_) {}
    }
    return root?.CMathPaperEntryConsolidationV1 ?? null;
  }

  function getPaperEntryArtifactModule() {
    if (typeof require === "function") {
      try {
        return require("./paper-entry-artifact-v1.js");
      } catch (_) {}
    }
    return root?.CMathPaperEntryArtifactV1 ?? null;
  }

  /**
   * Model-Assisted Consolidation Runner:
   * Consolidates a Raw Entry Pool into a canonical Paper Entry artifact using exactly one model call.
   * Schema: cmath.paper-entry-artifact/v1
   * EntryModuleVersion: paper-entry-consolidation-v1.1-model
   */
  async function consolidatePaperEntryPoolWithModel({
    rawPool,
    chatImpl,
    fetchImpl = globalThis.fetch,
    endpoint,
    apiKey,
    model = "gpt-5.6-luna",
    providerLabel = "Luna Gateway",
    reasoningEffort = "none",
    tokenBudget,
    signal,
    onStage,
  } = {}) {
    const startedAt = performance.now();
    const stages = [];
    const calls = [];

    const notify = (stage, info = {}) => {
      stages.push({ stage, ...info, atMs: Math.round(performance.now() - startedAt) });
      if (typeof onStage === "function") {
        try { onStage(stage, info); } catch (_) {}
      }
    };

    try {
      if (!isObject(rawPool)) {
        throw new Error("rawPool 必须是非空对象");
      }

      const source = rawPool.source || {};
      const fileName = stripControlCharacters(String(source.fileName || "paper.pdf").trim());
      const pageCount = Number(source.pageCount || 1);
      const sourceText = stripControlCharacters(String(source.sourceText || ""));
      if (!sourceText.trim()) {
        throw new Error("rawPool.source.sourceText 必须是非空字符串");
      }

      const rawEntries = Array.isArray(rawPool.rawEntries)
        ? rawPool.rawEntries
        : (Array.isArray(rawPool.entries) ? rawPool.entries : (Array.isArray(rawPool.chunks) ? rawPool.chunks.flatMap((c) => c.rawEntries || []) : []));

      const rawEntryCount = rawEntries.length;
      if (rawEntryCount === 0) {
        throw new Error("rawPool 必须包含至少一个候选 rawEntry");
      }

      // Step 1: Deterministic pre-canonicalization
      const v1Module = getDeterministicConsolidator();
      if (!v1Module || typeof v1Module.consolidateRawEntryPool !== "function") {
        throw new Error("无法加载确定性预规范化模块 paper-entry-consolidation-v1");
      }

      const preCanonicalArtifact = v1Module.consolidateRawEntryPool(rawPool, { strictMath: false });
      const preCanonicalEntries = preCanonicalArtifact.entries || [];
      const preCanonicalCount = preCanonicalEntries.length;
      if (preCanonicalCount === 0) {
        throw new Error("确定性预规范化后候选条目列表为空");
      }

      // Step 2: Build prompt
      const prompt = consolidationPrompt({
        fileName,
        pageCount,
        sourceText,
        candidates: preCanonicalEntries,
      });

      notify("consolidate-start", { rawEntryCount, preCanonicalCount, model, reasoningEffort });

      // Step 3: Exactly one model call
      const callStartedAt = performance.now();
      let responseContent = "";
      let responseStatus = 200;
      let finishReason = null;
      let usage = null;

      if (typeof chatImpl === "function") {
        const response = await chatImpl({
          stage: "consolidate",
          messages: [{ role: "user", content: prompt }],
          reasoningEffort,
          maxTokens: tokenBudget?.normal ?? 12000,
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
          max_tokens: tokenBudget?.normal ?? 12000,
          ...(reasoningEffort && reasoningEffort !== "none" ? { reasoning_effort: reasoningEffort } : {}),
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
          throw new Error(`HTTP ${res.status} model consolidation failed: ${errText.slice(0, 300)}`);
        }
        const json = await res.json();
        responseContent = json.choices?.[0]?.message?.content ?? "";
        finishReason = json.choices?.[0]?.finish_reason ?? null;
        usage = json.usage ?? null;
      } else {
        throw new Error("consolidatePaperEntryPoolWithModel requires either chatImpl or (endpoint and apiKey)");
      }

      const callDurationMs = Math.round(performance.now() - callStartedAt);
      const callRecord = {
        stage: "consolidate",
        durationMs: callDurationMs,
        status: responseStatus,
        finishReason,
        usage,
        repaired: false,
        repairCount: 0,
      };
      calls.push(callRecord);

      // Step 4: Parse model response
      const parseDiagnostics = { repaired: false, repairCount: 0 };
      let parsed;
      try {
        parsed = parseModelJson(responseContent, { diagnostics: parseDiagnostics });
      } catch (err) {
        throw new Error(`模型整合输出 JSON 解析失败: ${err.message}`);
      }

      callRecord.repaired = parseDiagnostics.repaired;
      callRecord.repairCount = parseDiagnostics.repairCount;

      const rawOutputEntries = Array.isArray(parsed)
        ? parsed
        : (isObject(parsed) && Array.isArray(parsed.entries) ? parsed.entries : null);

      if (!rawOutputEntries || rawOutputEntries.length === 0) {
        throw new Error("模型整合输出为空或未包含有效的 entries 数组");
      }

      // Step 5: Validate and transform entries
      const finalEntries = [];
      const seenIds = new Set();

      for (let i = 0; i < rawOutputEntries.length; i += 1) {
        const raw = rawOutputEntries[i];
        if (!isObject(raw)) {
          throw new Error(`entries[${i}] 必须是对象`);
        }

        const rawId = raw.id;
        if (typeof rawId !== "string" || !rawId.trim()) {
          throw new Error(`entries[${i}] 缺少非空 id`);
        }
        const id = stripControlCharacters(rawId.trim());
        if (seenIds.has(id)) {
          throw new Error(`entries 包含重复的 entry ID: "${id}"`);
        }
        seenIds.add(id);

        const rawType = raw.type || raw.kind || raw.claimKind || raw.factKind || raw.entryClass;
        const normalizedType = normalizeEntryType(rawType);
        if (!normalizedType) {
          throw new Error(`Entry "${id}" 包含无效的 entry 类型/分类: ${rawType}`);
        }

        const rawStatement = raw.statement ?? raw.description ?? raw.content ?? "";
        if (typeof rawStatement !== "string" || !rawStatement.trim()) {
          throw new Error(`Entry "${id}" 缺少非空数学陈述 (statement)`);
        }
        const statement = stripControlCharacters(rawStatement.trim());

        if (!hasBalancedMathDelimiters(statement)) {
          throw new Error(`Entry "${id}".statement 包含未配对的数学公式定界符 $ 或 $$`);
        }

        if (/\[corrupted\]|\[TODO\]|\[placeholder\]/iu.test(statement)) {
          throw new Error(`Entry "${id}".statement 包含未修复的破损占位符`);
        }

        const rawName = raw.name || raw.title || raw.shortTitle || id;
        const name = stripControlCharacters(String(rawName).trim());
        if (!hasBalancedMathDelimiters(name)) {
          throw new Error(`Entry "${id}".name 包含未配对的数学公式定界符`);
        }

        const pageNum = Number(raw.page);
        if (!Number.isInteger(pageNum) || pageNum < 1 || (pageCount ? pageNum > pageCount : false)) {
          throw new Error(`Entry "${id}" 页码无效: ${raw.page} (全文共 ${pageCount} 页)`);
        }

        let num = undefined;
        if (Number.isInteger(raw.num) && raw.num > 0) {
          num = raw.num;
        }

        let external = undefined;
        let sourceRef = undefined;
        if (raw.external === true) {
          external = true;
          if (typeof raw.source === "string" && raw.source.trim()) {
            sourceRef = stripControlCharacters(raw.source.trim());
          } else if (typeof raw.sourceReference === "string" && raw.sourceReference.trim()) {
            sourceRef = stripControlCharacters(raw.sourceReference.trim());
          }
        } else if (typeof raw.source === "string" && raw.source.trim()) {
          sourceRef = stripControlCharacters(raw.source.trim());
        }

        finalEntries.push({
          id,
          type: normalizedType,
          entryClass: normalizedType,
          name,
          statement,
          page: pageNum,
          ...(num !== undefined ? { num } : {}),
          ...(external === true ? { external: true } : {}),
          ...(sourceRef !== undefined ? { source: sourceRef } : {}),
        });
      }

      if (finalEntries.length === 0) {
        throw new Error("模型整合后有效 Entry 列表为空");
      }

      // Deterministic sort: page, then num, then id
      finalEntries.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        if (a.num !== undefined && b.num !== undefined) return a.num - b.num;
        return a.id.localeCompare(b.id);
      });

      const aliases = Object.fromEntries(finalEntries.map((e) => [e.id, e.id]));
      if (isObject(parsed.aliases)) {
        for (const [k, v] of Object.entries(parsed.aliases)) {
          if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
            aliases[k.trim()] = v.trim();
          }
        }
      }

      const totalDurationMs = Math.round(performance.now() - startedAt);
      notify("consolidate-done", { outputEntryCount: finalEntries.length });

      // Step 6: Construct canonical artifact
      const artifact = {
        schema: ENTRY_ARTIFACT_SCHEMA,
        entryModuleVersion: CONSOLIDATION_MODULE_VERSION,
        source: {
          fileName,
          pageCount,
          characters: sourceText.length,
          sourceText,
        },
        paperGuide: { title: "", leads: [] },
        guideLeadSet: { leads: [] },
        lanes: {
          coverageEntries: cloneJson(finalEntries),
          leadGuidedEntries: [],
        },
        aggregation: {
          records: cloneJson(finalEntries),
          conflicts: [],
          counts: {
            coverage: finalEntries.length,
            leadGuided: 0,
            total: finalEntries.length,
            conflicts: 0,
          },
        },
        entries: cloneJson(finalEntries),
        aliases,
        reviewInputs: {
          missingExtractionCandidates: [],
          externalEvidenceIndex: null,
          externalBoundaryCandidates: null,
          protectedClaimIds: [],
          canonicalIndex: { ...aliases },
        },
        diagnostics: {
          durationMs: totalDurationMs,
          stages,
          calls,
          consolidationSummary: {
            rawPoolSchema: rawPool.schema ?? RAW_ENTRY_POOL_SCHEMA,
            rawEntryCount,
            preCanonicalCount,
            outputEntryCount: finalEntries.length,
            modelCalls: 1,
          },
          modelCallMetadata: {
            model,
            provider: providerLabel,
            reasoningEffort,
          },
          moduleIdentity: {
            name: CONSOLIDATION_MODULE_VERSION,
            schema: ENTRY_ARTIFACT_SCHEMA,
          },
        },
      };

      const artifactModule = getPaperEntryArtifactModule();
      if (artifactModule && typeof artifactModule.validatePaperEntryArtifact === "function") {
        artifactModule.validatePaperEntryArtifact(artifact);
      }

      if (artifactModule && typeof artifactModule.freezePaperEntryArtifact === "function") {
        return artifactModule.freezePaperEntryArtifact(artifact);
      }

      return Object.freeze(artifact);
    } catch (err) {
      if (!err.diagnostics) {
        err.diagnostics = {
          durationMs: Math.round(performance.now() - startedAt),
          stages,
          calls,
        };
      }
      throw err;
    }
  }

  return Object.freeze({
    ENTRY_ARTIFACT_SCHEMA,
    CONSOLIDATION_MODULE_VERSION,
    RAW_ENTRY_POOL_SCHEMA,
    consolidationPrompt,
    consolidatePaperEntryPoolWithModel,
    resolveRunnerExecutionConfig,
    normalizeEntryType,
    hasBalancedMathDelimiters,
    validateMathDelimiters,
    stripControlCharacters,
    parseModelJson,
    repairJsonStringEscapes,
  });
});
