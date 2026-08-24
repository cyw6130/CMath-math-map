/**
 * Entry verification (W7.1) and cited-external backfill (W8).
 *
 * The prompts in this module are the production copy of the Laboratory
 * Workflow prompts.  The only contract adaptation is the Entry representation:
 * `entryClass` plus `factKind`/`claimKind` replaces the old `type` field.
 *
 * UMD/CommonJS is intentional: the CLI imports this module through CommonJS,
 * while the browser can load it as a plain script before the import client.
 */
(function publishPaperEntryVerification(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryVerification = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperEntryVerificationModule() {
  "use strict";

  const FACT_KINDS = new Set(["definition", "algorithm", "calculation"]);
  const CLAIM_KINDS = new Set(["lemma", "proposition", "theorem"]);

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizedKind(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
  }

  function canonicalEntryClassAndKind(entry, fallback = {}) {
    const rawClass = typeof entry?.entryClass === "string" ? entry.entryClass.trim().toLowerCase() : "";
    const rawType = normalizedKind(
      entry?.type
        ?? (rawClass !== "fact" && rawClass !== "claim" ? rawClass : ""),
    );
    const rawFactKind = normalizedKind(entry?.factKind ?? fallback.factKind);
    const rawClaimKind = normalizedKind(entry?.claimKind ?? fallback.claimKind);

    if (rawClass === "fact" || (!rawClass && FACT_KINDS.has(rawFactKind)) || FACT_KINDS.has(rawType)) {
      const factKind = rawClass === "fact" ? (rawFactKind || rawType) : (rawFactKind || rawType);
      if (FACT_KINDS.has(factKind)) return { entryClass: "fact", factKind };
    }
    if (rawClass === "claim" || (!rawClass && CLAIM_KINDS.has(rawClaimKind)) || CLAIM_KINDS.has(rawType)) {
      const claimKind = rawClass === "claim" ? (rawClaimKind || rawType) : (rawClaimKind || rawType);
      if (CLAIM_KINDS.has(claimKind)) return { entryClass: "claim", claimKind };
    }
    return null;
  }

  /**
   * Convert both old Laboratory patches (`type`) and Canonical patches to the
   * single artifact contract.  Unknown model fields are retained deliberately:
   * W7 corrections are allowed to repair metadata, while type/kind aliases are
   * removed so a patched artifact cannot regress to the legacy contract.
   */
  function canonicalizeEntry(entry, existing = null) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const merged = existing ? { ...existing, ...entry } : { ...entry };
    // A legacy correction that explicitly supplies `type` is a requested type
    // change, even when the existing entry already has a canonical class/kind.
    // Canonical corrections (entryClass/factKind/claimKind) remain authoritative
    // over any stale legacy alias carried alongside them.
    const hasCanonicalClass = entry.entryClass === "fact" || entry.entryClass === "claim";
    const hasLegacyType = typeof entry.type === "string";
    const classAndKind = (!hasCanonicalClass && hasLegacyType)
      ? canonicalEntryClassAndKind(entry)
      : canonicalEntryClassAndKind(merged, canonicalEntryClassAndKind(existing || {}, {}) || {});
    if (!classAndKind) return null;

    const result = { ...merged, ...classAndKind };
    delete result.type;
    if (result.entryClass === "fact") delete result.claimKind;
    else delete result.factKind;

    if (typeof result.id === "string") result.id = result.id.trim();
    if (typeof result.name === "string") result.name = result.name.trim();
    if (typeof result.title === "string") result.title = result.title.trim();
    if (typeof result.shortTitle === "string") result.shortTitle = result.shortTitle.trim();
    if (typeof result.statement === "string") result.statement = result.statement.trim();
    return result;
  }

  function promptText({ consolidatedText = "", sourceText = "", caseId = "" } = {}, b0 = false) {
    if (!b0) {
      return `你是数学论文产物校验专家。输入为初版 Entry 产物（JSON）与源文本（MinerU 提取的 Markdown，含 [[PAGE N]] 标记）。请忠实比对，不补造论文没有的内容。

【任务】
1. 前提条件清单与实质性数学性质/对应关系独立提取：源文本中以清单或条件形式列出、并作为后续论证长期前提的技术条件（如对输入理论/结构的公理或最小条件约束），若初版产物中缺失，必须补一条 definition；源文本中以独立句子或表格形式陈述的实质性数学性质/命题/对应关系（包括代数结构与范畴结构的对应如余积→张量积、对极→对偶、R-矩阵→辫结构、扭元→扭结构，以及某构造的不变性、等价性、函子性、有限性、非退化性等关键属性），若初版产物中缺失且该内容在后续论证中被实际使用，必须补一条 lemma/proposition/definition。
2. 平衡张量积与作用代数记号逐字保真：涉及双模张量积、Hochschild 同调作用、代数关联缠结等公式时，平衡代数与作用代数的名称与下标必须按源文本逐字转录（如 $\\otimes_{S}$ 的下标），弱化的记号必须订正。
3. 严禁增补原文没有的条件：不得为定义或定理增补"平凡代数交""额外边界匹配"等源文本没有的条件；此类幻觉条目必须标记删除。

输出 JSON（只输出 JSON）：
{"addEntries":[{"id":"paper:def:...","entryClass":"fact","factKind":"definition","name":"...","statement":"...","page":2}],"corrections":[{"id":"paper:thm:...","statement":"..."}],"removeIds":["paper:def:hallucinated"]}

规则：entryClass 只能是 fact|claim；Fact 的 factKind 只能是 definition|algorithm|calculation，Claim 的 claimKind 只能是 lemma|proposition|theorem。id 用英文小写 slug；statement 最多 300 字符并保留假设、量词和公式；page 取源文本中的整数页码；数学公式用成对的 $...$ 或 $$...$$。严禁输出 type、B0、mainTarget、Review。

初版产物（待校验）：
\`\`\`json
${String(consolidatedText).slice(0, 80000)}
\`\`\`

源文本（以此为准）：
${String(sourceText).slice(0, 120000)}

案例：${caseId}
`;
    }
    return `你是数学论文产物校验专家。当前任务：B0 外部定理定向补漏。

【任务】
1. 扫描源文本中带引用标记的外部数学结果（引用标记如 [12]、作者年份、due to / by 等表述，且非本文证明）；
2. 与初版产物比对：凡源文本中作为独立陈述出现、但初版产物中没有对应条目的外部结果，必须补一条独立 Entry；
3. 补录条目规范：entryClass 取 claim；claimKind 取 lemma|proposition|theorem；external: true；sourceReference 填写可见的引用标记或作者名；statement 完整转录其数学断言与全部前提；
4. 已存在于初版产物中的外部结果不要重复添加。

输出 JSON（只输出 JSON）：
{"addEntries":[{"id":"paper:ext:...","entryClass":"claim","claimKind":"theorem","name":"...","statement":"...","page":3,"external":true,"sourceReference":"[12]"}],"corrections":[],"removeIds":[]}

规则：id 使用英文小写 slug（建议 paper:ext: 前缀）；statement 最多 300 字符并保留假设、量词和公式；page 取 [[PAGE N]] 整数页码。严禁增补源文本没有的结果。

初版产物（待比对）：
\`\`\`json
${String(consolidatedText).slice(0, 80000)}
\`\`\`

源文本（以此为准）：
${String(sourceText).slice(0, 120000)}

案例：${caseId}
`;
  }

  function buildVerificationPrompt(args) {
    return promptText(args, false);
  }

  function buildB0BackfillPrompt(args) {
    return promptText(args, true);
  }

  /**
   * Apply a W7/W8 patch without changing ordering or any surrounding artifact
   * metadata.  Existing IDs win over additions, remove happens after
   * corrections, and all operations are deterministic and idempotent.
   */
  function applyPatch(consolidated, patch = {}) {
    const result = cloneJson(consolidated || {});
    const originalEntries = Array.isArray(result.entries) ? result.entries : [];
    const byId = new Map();
    for (const entry of originalEntries) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id.trim()) continue;
      const canonical = canonicalizeEntry({ ...entry, id: entry.id.trim() });
      byId.set(entry.id.trim(), canonical ?? { ...entry, id: entry.id.trim() });
    }

    for (const correction of Array.isArray(patch.corrections) ? patch.corrections : []) {
      const id = typeof correction?.id === "string" ? correction.id.trim() : "";
      if (!id || !byId.has(id)) continue;
      const canonical = canonicalizeEntry(correction, byId.get(id));
      byId.set(id, canonical ?? { ...byId.get(id), ...cloneJson(correction), id });
    }

    for (const idValue of Array.isArray(patch.removeIds) ? patch.removeIds : []) {
      const id = typeof idValue === "string" ? idValue.trim() : "";
      if (id) byId.delete(id);
    }

    for (const addition of Array.isArray(patch.addEntries) ? patch.addEntries : []) {
      const canonical = canonicalizeEntry(addition);
      const fallback = addition && typeof addition === "object" && !Array.isArray(addition) ? cloneJson(addition) : null;
      const candidate = canonical ?? fallback;
      const id = typeof candidate?.id === "string" ? candidate.id.trim() : "";
      if (id && !byId.has(id)) byId.set(id, { ...candidate, id });
    }

    result.entries = [...byId.values()];
    return result;
  }

  /**
   * Run the frozen W7.1 → W8 sequence with the model transport injected by
   * the caller.  Keeping transport out of this module makes the exact same
   * runner usable from Node, the browser, and deterministic tests.
   *
   * `requestPatch` receives `{ stage, pass, prompt, artifact, sourceText,
   * caseId }` and returns a patch object (or `{ patch }`).  The returned value
   * is the patched artifact; the input artifact is never mutated.
   */
  async function runVerificationPipeline({
    artifact,
    sourceText = "",
    caseId = "",
    requestPatch,
    validateArtifact,
    onStage,
    onArtifact,
    includeB0 = true,
    startStage = "w7-verify",
  } = {}) {
    if (typeof requestPatch !== "function") throw new Error("W7/W8 校验链需要 requestPatch 回调");
    let current = cloneJson(artifact);
    if (!current || typeof current !== "object" || !Array.isArray(current.entries)) {
      throw new Error("W7/W8 校验链需要包含 entries 的 Entry artifact");
    }
    const allPasses = [
      { stage: "w7-verify", pass: "w7.1", buildPrompt: buildVerificationPrompt },
      ...(includeB0 ? [{ stage: "w8-b0", pass: "w8", buildPrompt: buildB0BackfillPrompt }] : []),
    ];
    if (!allPasses.some((pass) => pass.stage === startStage)) {
      throw new Error(`W7/W8 校验链不支持从 ${startStage} 开始`);
    }
    const passes = allPasses.slice(allPasses.findIndex((pass) => pass.stage === startStage));
    for (const pass of passes) {
      const prompt = pass.buildPrompt({
        consolidatedText: JSON.stringify(current, null, 2),
        sourceText,
        caseId,
      });
      try { onStage?.(pass.stage, { phase: "start", entries: current.entries.length, pass: pass.pass }); } catch {}
      const response = await requestPatch({
        stage: pass.stage,
        pass: pass.pass,
        prompt,
        artifact: current,
        sourceText,
        caseId,
      });
      const patch = response?.patch && typeof response.patch === "object" ? response.patch : response;
      current = applyPatch(current, patch);
      if (typeof validateArtifact === "function") validateArtifact(current);
      const completion = {
        entries: current.entries.length,
        pass: pass.pass,
        added: Array.isArray(patch?.addEntries) ? patch.addEntries.length : 0,
        corrected: Array.isArray(patch?.corrections) ? patch.corrections.length : 0,
        removed: Array.isArray(patch?.removeIds) ? patch.removeIds.length : 0,
      };
      if (typeof onArtifact === "function") await onArtifact(pass.stage, current, completion);
      else {
        try { onStage?.(pass.stage, { phase: "complete", ...completion }); } catch {}
      }
    }
    return current;
  }

  return Object.freeze({
    FACT_KINDS: Object.freeze([...FACT_KINDS]),
    CLAIM_KINDS: Object.freeze([...CLAIM_KINDS]),
    buildVerificationPrompt,
    buildB0BackfillPrompt,
    applyPatch,
    runVerificationPipeline,
  });
});
