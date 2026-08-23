/**
 * V3.26 Inference Module Prototype with Repair Candidate
 * 
 * 封装并演示如何在不改变 V3.26 原有 Artifact 契约与 format 40分制评估标准下，
 * 接入 Candidate Repair Prompt 与主线缺口上下文。
 */

(function publishCandidateInferenceModule(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathV326InferenceCandidateModule = api;
})(typeof window !== "undefined" ? window : globalThis, function createCandidateInferenceModule(root) {
  "use strict";

  const v326Modules = root?.CMathPaperImportModulesV326
    ?? (typeof require === "function" ? require("../../paper-import-modules-v3.26.js") : null);
  const candidatePromptApi = root?.CMathV326InferenceRepairCandidate
    ?? (typeof require === "function" ? require("./candidate-repair-prompt.js") : null);

  function cloneJson(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /**
   * 安全应用增量修复补丁（严格保护已有 Entry 的数学内容不被重写）
   */
  function applyCandidateRepairPatch(baseCandidate, patch = {}) {
    if (!baseCandidate || typeof baseCandidate !== "object") return baseCandidate;
    const result = cloneJson(baseCandidate);
    if (!Array.isArray(result.entries)) result.entries = [];
    if (!Array.isArray(result.inferences)) result.inferences = [];

    const entryById = new Map(result.entries.map((e) => [e.id, e]));

    // 1. 处理 idAliases
    const aliases = patch.idAliases && typeof patch.idAliases === "object" ? patch.idAliases : {};
    const resolveId = (id) => (typeof id === "string" && aliases[id]) ? aliases[id] : id;

    // 2. 处理 fixedEntries（仅允许补充新条目或为外部 Claim 补充来源元数据，严禁重写已有内部数学 statement）
    if (Array.isArray(patch.fixedEntries)) {
      for (const fe of patch.fixedEntries) {
        if (!fe || typeof fe !== "object" || !fe.id) continue;
        const targetId = resolveId(fe.id);
        const existing = entryById.get(targetId);
        if (!existing) {
          // 补充新缺失条目
          const newEntry = { ...fe, id: targetId };
          result.entries.push(newEntry);
          entryById.set(targetId, newEntry);
        } else if (existing.entryClass === "claim" && fe.external === true) {
          // 仅允许补充外部来源元数据
          if (fe.sourceReference) existing.sourceReference = fe.sourceReference;
          if (fe.source) existing.source = fe.source;
          existing.external = true;
        }
      }
    }

    // 3. 处理 b0ToAdd
    const b0Key = Array.isArray(result.b0ClaimEntryIds) ? "b0ClaimEntryIds" : (Array.isArray(result.b0) ? "b0" : "b0ClaimEntryIds");
    if (!Array.isArray(result[b0Key])) result[b0Key] = [];
    const b0Set = new Set(result[b0Key].map((id) => resolveId(String(id).trim())));

    if (Array.isArray(patch.b0ToAdd)) {
      for (const id of patch.b0ToAdd) {
        const canonical = resolveId(String(id).trim());
        const entry = entryById.get(canonical);
        // Fail-closed 约束：只有实际存在的 Claim 且未被本地证明覆盖时允许进入 B0
        if (canonical && entry && entry.entryClass === "claim") {
          b0Set.add(canonical);
        }
      }
      result[b0Key] = [...b0Set];
    }

    // 4. 处理 inferencesToAdd（加入主线证明边）
    if (Array.isArray(patch.inferencesToAdd)) {
      const existingInfSignatures = new Set(result.inferences.map((inf) => {
        const conc = resolveId(inf.conclusion);
        const prems = (Array.isArray(inf.premises) ? inf.premises : []).map(resolveId).sort().join(",");
        return `${inf.operationKind || inf.type}:${prems}->${conc}`;
      }));

      for (const inf of patch.inferencesToAdd) {
        if (!inf || typeof inf !== "object") continue;
        const opKind = inf.operationKind || inf.type || "proof";
        const conc = resolveId(inf.conclusion);
        const rawPremises = Array.isArray(inf.premises) ? inf.premises : (Array.isArray(inf.premiseEntryIds) ? inf.premiseEntryIds : []);
        const prems = rawPremises.map(resolveId).filter((id) => typeof id === "string" && entryById.has(id));

        if (!conc || !entryById.has(conc) || prems.length === 0) continue;

        // 类型安全检查：proof 必须结论为 Claim；organization 必须连接 Fact
        const concEntry = entryById.get(conc);
        if (opKind === "proof" && concEntry.entryClass !== "claim") continue;
        if (opKind === "organization" && (concEntry.entryClass !== "fact" || prems.some((p) => entryById.get(p)?.entryClass !== "fact"))) continue;

        const signature = `${opKind}:${[...prems].sort().join(",")}->${conc}`;
        if (!existingInfSignatures.has(signature)) {
          const newInf = {
            id: inf.id || `inference:candidate-repair:${result.inferences.length + 1}`,
            operationKind: opKind,
            title: inf.title || `证明 · ${concEntry.title || conc}`,
            shortTitle: inf.shortTitle || concEntry.shortTitle || concEntry.title || "",
            statement: inf.statement || `通过 ${prems.join(", ")} 推导 ${conc}`,
            argument: inf.argument || `由前提结合正文论述得出 ${concEntry.title || conc}。`,
            premises: prems,
            conclusion: conc,
            ...(inf.page ? { page: inf.page } : (concEntry.page ? { page: concEntry.page } : {})),
            sourcePath: inf.sourcePath || concEntry.sourcePath || "",
          };
          result.inferences.push(newInf);
          existingInfSignatures.add(signature);
        }
      }
    }

    return result;
  }

  return Object.freeze({
    ...candidatePromptApi,
    applyCandidateRepairPatch,
  });
});
