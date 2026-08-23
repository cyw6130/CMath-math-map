/**
 * V3.26 Inference Repair Prompt & Context Builder Candidate
 * 
 * 目标：在不增加 LLM 调用次数（保持单轮 Repair）、不重写已有正确 Entry 数学字段的前提下，
 * 增强一次 Repair 的提示词与确定性上下文，引导模型补足主线定理的推导证明与关键孤立 Claim 关系，
 * 同时严格维持 fail-closed（开放猜想不捏造证明、无文献依据不外置 B0）。
 */

(function publishCandidate(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathV326InferenceRepairCandidate = api;
})(typeof window !== "undefined" ? window : globalThis, function createCandidate(root) {
  "use strict";

  /**
   * 确定性提取主线与核心 Claim 的推导缺口上下文（0 次额外网络调用，毫秒级执行）
   * 
   * 分析 candidate 中：
   * 1. mainTarget 与 Paper Guide key results / protected claims 是否缺少入向 proof
   * 2. 哪些内部正式 Claim 处于完全孤立状态（既无前提推导他人，亦无他人证明之）
   * 3. 提取候选图中可用的基础 Fact / Lemma 索引作为推荐 premise 候选池
   */
  function deriveV326MainlineRepairContextCandidate(candidate, {
    paperGuide = null,
    protectedClaimIds = [],
    entries = [],
    externalEvidenceIndex = null,
  } = {}) {
    if (!candidate || typeof candidate !== "object") return "";
    const entryList = Array.isArray(candidate.entries) && candidate.entries.length
      ? candidate.entries
      : (Array.isArray(entries) ? entries : []);
    if (!entryList.length) return "";

    const entryById = new Map();
    for (const e of entryList) {
      if (e && typeof e.id === "string" && e.id.trim()) {
        entryById.set(e.id.trim(), e);
      }
    }

    const inferences = Array.isArray(candidate.inferences) ? candidate.inferences : [];
    const b0List = candidate.b0ClaimEntryIds ?? candidate.b0 ?? candidate.derivedResearchState?.mathematicalState?.b0ClaimEntryIds;
    const b0Set = new Set(Array.isArray(b0List) ? b0List.map((id) => String(id).trim()) : []);

    const isProof = (inf) => inf && (inf.operationKind === "proof" || inf.type === "proof") && typeof inf.conclusion === "string";
    const proofs = inferences.filter(isProof);

    // 统计各 Entry 的入向与出向证明边
    const inboundProofsByConclusion = new Map();
    const outboundUsageInProofs = new Map();

    for (const p of proofs) {
      const conc = p.conclusion.trim();
      const inList = inboundProofsByConclusion.get(conc) ?? [];
      inList.push(p);
      inboundProofsByConclusion.set(conc, inList);

      const premises = Array.isArray(p.premises) ? p.premises : (Array.isArray(p.premiseEntryIds) ? p.premiseEntryIds : []);
      for (const prem of premises) {
        if (typeof prem === "string" && prem.trim()) {
          const outList = outboundUsageInProofs.get(prem.trim()) ?? [];
          outList.push(p);
          outboundUsageInProofs.set(prem.trim(), outList);
        }
      }
    }

    // 核心主线目标收集
    const coreTargets = [];
    const coreIdSet = new Set();

    // 1. mainTargetEntryId
    const mainTargetId = typeof candidate.mainTargetEntryId === "string" ? candidate.mainTargetEntryId.trim() : "";
    if (mainTargetId && entryById.has(mainTargetId)) {
      coreTargets.push({ id: mainTargetId, role: "main_target", entry: entryById.get(mainTargetId) });
      coreIdSet.add(mainTargetId);
    }

    // 2. Paper Guide leads (main_target / key_result)
    const guideLeads = Array.isArray(paperGuide?.leads) ? paperGuide.leads : [];
    for (const lead of guideLeads) {
      const role = lead?.narrative_role;
      if (role === "main_target" || role === "key_result") {
        for (const possibleId of [lead.id, lead.target_claim_id, lead.claim_id]) {
          if (typeof possibleId === "string" && possibleId.trim() && entryById.has(possibleId.trim()) && !coreIdSet.has(possibleId.trim())) {
            coreTargets.push({ id: possibleId.trim(), role: role || "key_result", entry: entryById.get(possibleId.trim()) });
            coreIdSet.add(possibleId.trim());
          }
        }
      }
    }

    // 3. protectedClaimIds
    for (const id of (Array.isArray(protectedClaimIds) ? protectedClaimIds : [])) {
      if (typeof id === "string" && id.trim() && entryById.has(id.trim()) && !coreIdSet.has(id.trim())) {
        coreTargets.push({ id: id.trim(), role: "protected_core", entry: entryById.get(id.trim()) });
        coreIdSet.add(id.trim());
      }
    }

    // 检查核心目标是否有内部证明入向
    const unprovenCoreTargets = [];
    for (const target of coreTargets) {
      const id = target.id;
      const isExternalB0 = b0Set.has(id);
      const inProofs = inboundProofsByConclusion.get(id) ?? [];
      if (!isExternalB0 && inProofs.length === 0) {
        unprovenCoreTargets.push(target);
      }
    }

    // 检查完全孤立的正式 Claim（既无 inbound proof，也未被任何 proof 作为 premise，且不在 b0）
    const isolatedFormalClaims = [];
    for (const e of entryList) {
      if (!e || (e.entryClass !== "claim" && !["theorem", "lemma", "proposition", "corollary"].includes(e.type))) continue;
      const id = e.id;
      if (b0Set.has(id)) continue;
      const inProofs = inboundProofsByConclusion.get(id) ?? [];
      const outProofs = outboundUsageInProofs.get(id) ?? [];
      if (inProofs.length === 0 && outProofs.length === 0) {
        if (!coreIdSet.has(id)) {
          isolatedFormalClaims.push(e);
        }
      }
    }

    // 汇总可作为 premise 的基础条目（按页码排序，提供紧凑参考清单）
    const candidatePremises = [];
    for (const e of entryList) {
      const isFact = e.entryClass === "fact" || ["definition", "axiom", "notation", "algorithm", "calculation"].includes(e.type);
      const isEstablishedClaim = (e.entryClass === "claim" || ["theorem", "lemma", "proposition"].includes(e.type)) && (b0Set.has(e.id) || (inboundProofsByConclusion.get(e.id)?.length ?? 0) > 0);
      if (isFact || isEstablishedClaim) {
        candidatePremises.push({
          id: e.id,
          name: e.title ?? e.name ?? e.shortTitle ?? "",
          type: e.type ?? e.factKind ?? e.claimKind ?? (isFact ? "fact" : "claim"),
          page: e.page ?? (Number(String(e.sourceLocator ?? e.sourcePath ?? "").match(/page=(\d+)/u)?.[1] ?? 0)),
          tag: b0Set.has(e.id) ? "[B0外部]" : (isFact ? "[Fact定义/计算]" : "[已证Claim]"),
        });
      }
    }
    candidatePremises.sort((a, b) => (a.page - b.page) || a.id.localeCompare(b.id));

    // 构建紧凑 Context 文本
    const lines = [];

    if (unprovenCoreTargets.length > 0) {
      lines.push("【核心主线目标缺失 Proof 清单 (Unproven Core Mainline Targets)】：");
      lines.push("以下核心条目（含论文主目标及关键成果）目前缺少内部推导证明，请核对全文并在 inferencesToAdd 中补充真实证明边：");
      for (const t of unprovenCoreTargets) {
        const name = t.entry.title ?? t.entry.name ?? t.entry.shortTitle ?? "";
        const page = t.entry.page ?? (Number(String(t.entry.sourceLocator ?? t.entry.sourcePath ?? "").match(/page=(\d+)/u)?.[1] ?? 0));
        const stmt = (t.entry.statement ?? "").slice(0, 100);
        lines.push(`- [${t.role}] ${t.id}（${name}，第 ${page || "?"} 页）：${stmt}${stmt.length >= 100 ? "..." : ""}`);
      }
    }

    if (isolatedFormalClaims.length > 0) {
      lines.push("\n【孤立正式 Claim 条目 (Isolated Formal Claims)】：");
      lines.push("以下正式定理/引理未参与任何推导。若论文实际包含其证明或将其用于后续推导，请补充对应 proof；若为明确猜想请保持 open：");
      for (const c of isolatedFormalClaims.slice(0, 8)) {
        const name = c.title ?? c.name ?? c.shortTitle ?? "";
        const page = c.page ?? (Number(String(c.sourceLocator ?? c.sourcePath ?? "").match(/page=(\d+)/u)?.[1] ?? 0));
        lines.push(`- ${c.id}（${c.type || "claim"} · ${name}，第 ${page || "?"} 页）`);
      }
      if (isolatedFormalClaims.length > 8) {
        lines.push(`  * (另有 ${isolatedFormalClaims.length - 8} 个孤立 Claim 条目已省略)`);
      }
    }

    if (candidatePremises.length > 0 && unprovenCoreTargets.length > 0) {
      lines.push("\n【可作为 proof.premises 的有效前置条目索引 (Available Premise Catalog)】：");
      const sample = candidatePremises.slice(0, 15);
      for (const p of sample) {
        lines.push(`- ${p.id} ${p.tag} (${p.type} · ${p.name}${p.page ? `，p.${p.page}` : ""})`);
      }
      if (candidatePremises.length > 15) {
        lines.push(`  * (共 ${candidatePremises.length} 个可用前提条目)`);
      }
    }

    return lines.join("\n");
  }

  /**
   * V3.26 定向修复提示词候选生成器
   * 
   * 特点：
   * 1. 结构完全兼容 V3.26 的增量 JSON 输出格式（inferencesToAdd, b0ToAdd, idAliases, fixedEntries）
   * 2. 注入针对性的主线推导闭包引导，消除主定理孤立与 open 状态
   * 3. 严格执行 fail-closed 纪律，禁止为猜想伪造证明，禁止重写已有 Entry 数学陈述
   */
  function v326FocusedAssemblyRepairPromptCandidate(issues, {
    requirePage = true,
    canonicalIndex = null,
    missingIds = [],
    missingCandidates = [],
    externalEvidenceIndex = null,
    cycleIssues = [],
    candidate = null,
    paperGuide = null,
    protectedClaimIds = [],
  } = {}) {
    const missingSection = Array.isArray(missingIds) && missingIds.length
      ? `\n【缺失 ID 清单】（请在 idAliases 中映射到已有 ID 或确认是否确实为遗漏外部结果）：\n${missingIds.map((id) => `- ${id}`).join("\n")}\n`
      : "";
    const indexSection = canonicalIndex ? `\n【Canonical Entry ID 索引】：\n${canonicalIndex}\n` : "";

    const formatMissingChecklist = (list) => {
      if (!Array.isArray(list) || !list.length) return "";
      return list.map((item) => `- [${item.kind || item.type || "entry"}] ${item.id || item.name} (page ${item.page || "?"})：${(item.statement || item.title || "").slice(0, 80)}`).join("\n");
    };

    const completenessSection = Array.isArray(missingCandidates) && missingCandidates.length
      ? `\n【遗漏数学对象预检清单】（若确为遗漏正式对象，请在 fixedEntries 中补充并在 inferencesToAdd/b0ToAdd 中声明对应关系）：\n${formatMissingChecklist(missingCandidates)}\n`
      : "";

    const formatEvidence = (ev) => {
      if (!ev) return "";
      if (typeof ev === "string") return ev;
      const items = Array.isArray(ev.items) ? ev.items : [];
      return items.map((it) => `- ${it.canonicalId || it.id} (page ${it.page || "?"}): source="${it.source || ""}"`).join("\n");
    };

    const evidenceFormatted = externalEvidenceIndex ? formatEvidence(externalEvidenceIndex) : "";
    const evidenceSection = evidenceFormatted ? `\n【外部引用证据索引 (Cited External Evidence)】：\n${evidenceFormatted}\n` : "";

    const cycleList = Array.isArray(cycleIssues) && cycleIssues.length ? cycleIssues : [];
    const cycleSection = cycleList.length
      ? `\n【循环依赖紧急修复指令】（最高优先级）：\n检测到以下循环证明依赖：\n${cycleList.map((c) => `- ${typeof c === "string" ? c : (c.pathString || c.text)}`).join("\n")}\n证明图必须是有向无环图（DAG）。必须通过在 inferencesToAdd 中调整或移除导致回环的错误 premise / inference 依赖来打破循环；严禁为循环中的节点伪造证明、严禁将内部定理放入 B0、严禁重写数学内容！保持单向推导。\n`
      : "";

    // 提取增强的确定性主线推导与缺口上下文
    const mainlineContext = candidate
      ? deriveV326MainlineRepairContextCandidate(candidate, { paperGuide, protectedClaimIds, externalEvidenceIndex })
      : "";
    const mainlineSection = mainlineContext ? `\n${mainlineContext}\n` : "";

    return `这是 V3.26 定向装配修复。上一次候选存在以下待解决问题（已做 root-first 排序与循环优先隔离）：\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}\n`
      + cycleSection
      + mainlineSection
      + missingSection
      + indexSection
      + completenessSection
      + evidenceSection
      + `\n请结合原论文全文、Canonical Entry ID 索引与上述核心主线推导缺口进行【最小定向修复】：\n`
      + `1. 【主线证明闭包优先 (Mainline Proof Closure)】：\n`
      + `   - 若主定理（mainTarget）或 Paper Guide 核心定理在论文中有证明，必须在 inferencesToAdd 中补充以该定理为 conclusion 的有效 proof 推理；\n`
      + `   - 内部 proof 的 premises 必须包含至少一个真实存在的前置 Canonical ID（如关键 definition/lemma/calculation），严禁 premises 为空 []，严禁引用不存在的虚构 ID；\n`
      + `   - 严禁将论文自行证明的核心定理外部化放入 b0ToAdd！\n`
      + `2. 【严守 Fail-Closed 与不臆造原则 (Strict Fail-Closed)】：\n`
      + `   - 若某 Claim 在论文中明确为未证明猜想（conjecture）或开放问题（open question），必须保持无 proof 且不入 b0，严禁为其捏造虚假证明；\n`
      + `   - 证明中的技术推演细节必须写在 argument 字段中，不得凭空新建虚假 Lemma/Theorem 条目；\n`
      + `   - 仅当正文有明确外部文献引用标注（如在外部引用证据索引中列出）且本文未证时，才允许列入 b0ToAdd 并用 fixedEntries 补 external:true 与 source。\n`
      + `3. 【类型安全与边合法性】：\n`
      + `   - proof 的 conclusion 必须是 Claim；organization 必须是 Fact 到 Fact。\n`
      + `   - 若上轮使用了错误拼写或非规范 ID，在 idAliases 中声明别名映射（如 {"old_id":"canonical_id"}），严禁重写已有 Entry 数学 statement 字段！\n\n`
      + `【安全增量输出规范】只输出增量修复 JSON，不要 Markdown：\n`
      + `{"inferencesToAdd":[{"type":"proof","premises":["paper:def:...","paper:lemma:..."],"conclusion":"paper:thm:...","argument":"详细论证说明...","page":5}],"b0ToAdd":["..."],"idAliases":{...},"fixedEntries":[...]}\n`
      + `- 已有正确的 proof、B0、Entry 数学字段完整保留，无需重复输出，更不得改动。\n`
      + `- fixedEntries 仅用于补充确属遗漏的外部引用结果或预检清单中的正式对象。\n`
      + (requirePage ? `- 每个新增 inference 与 fixedEntry 必须提供真实 page（正整数）。\n` : "");
  }

  return Object.freeze({
    deriveV326MainlineRepairContextCandidate,
    v326FocusedAssemblyRepairPromptCandidate,
  });
});
