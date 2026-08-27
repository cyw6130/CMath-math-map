/**
 * Core Project View — 论文导入输出的规范化、诊断与机械修复。
 *
 * 该模块承接 paper-import-client 中既有的 Raw Project View 处理逻辑。
 * 这里的处理只保持现有行为：不引入新的语义推断，也不改变修复顺序。
 * UMD/CommonJS 是有意的：静态站点以 plain script 加载，Node 通过 CommonJS 加载。
 */
(function publishCMathPaperProjectView(root, factory) {
  "use strict";
  const semantics = root?.GammaMathMapSemantics
    ?? (typeof require === "function" ? require("../../../math-map-semantics.js") : null);
  const validation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("./validation.js") : null);
  const api = factory(root, semantics, validation);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperProjectView = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createCMathPaperProjectView(root, semantics, validation) {
  "use strict";

  if (!semantics || !Array.isArray(semantics.ENTRY_CLASSES)
    || !Array.isArray(semantics.FACT_KINDS)
    || !Array.isArray(semantics.CLAIM_KINDS)
    || !Array.isArray(semantics.OPERATION_KINDS)) {
    throw new Error("CMath Project View 能力没有加载数学地图语义模块");
  }
  if (!validation || typeof validation.hasBalancedMathDelimiters !== "function") {
    throw new Error("CMath Project View 能力没有加载核心校验模块");
  }

  const ENTRY_CLASSES = new Set(semantics.ENTRY_CLASSES);
  const FACT_KINDS = new Set(semantics.FACT_KINDS);
  const CLAIM_KINDS = new Set(semantics.CLAIM_KINDS);
  const OPERATION_KINDS = new Set(semantics.OPERATION_KINDS);
  const hasBalancedMathDelimiters = validation.hasBalancedMathDelimiters;

  const ENTRY_LABELS = Object.freeze({
    definition: "定义",
    algorithm: "算法",
    calculation: "计算",
    lemma: "引理",
    proposition: "命题",
    theorem: "定理",
  });
  const REF_LABEL_NAME = /^(lemma|proposition|theorem|corollary|conjecture|definition|claim|remark|example|定理|引理|命题|推论|猜想|定义|备注|例)\s*[\d.]+$/iu;

  function isReferenceLabelName(value) {
    return typeof value === "string" && REF_LABEL_NAME.test(value.trim());
  }

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

  // 校验并应用整合阶段给出的别名与保守改名；语义不明确或不合法的建议一律忽略。
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
      if (!id || !name || name.length > 60 || isReferenceLabelName(name) || !keptIndexById.has(id)) continue;
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
      } else if (isReferenceLabelName(entry.title)) {
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
        actions.push(`丢弃 conclusion 出现在 premises 中的 ${label}`);
        return;
      }
      inference.premises = deduped;
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
        if (operationKind === "proof") {
          actions.push(`丢弃缺少 argument 的 proof ${label}`);
          return;
        }
        inference.argument = "（组织关系说明从略，详见原文对应页码。）";
        actions.push(`${label} 缺少 argument，已补组织关系说明`);
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

  return Object.freeze({
    PROJECT_VIEW_MODULE_ID: "cmath.paper-import.core.project-view/v1",
    isReferenceLabelName,
    normalizeRawProjectView,
    collectRawProjectViewIssues,
    sanitizeRawProjectView,
    applyIntegration,
  });
});
