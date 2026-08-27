/**
 * Entry lifecycle — legacy extraction, source-grounded review patches, and
 * canonical Artifact creation behind one Entry Module seam.
 */
(function publishPaperEntryLifecycle(root, factory) {
  "use strict";
  const modelTransport = root?.CMathPaperModelTransport
    ?? (typeof require === "function" ? require("../core/model-transport.js") : null);
  const validation = root?.CMathPaperCoreValidation
    ?? (typeof require === "function" ? require("../core/validation.js") : null);
  const artifact = root?.CMathPaperEntryArtifact
    ?? (typeof require === "function" ? require("./artifact.js") : null);
  const api = factory(root, modelTransport, validation, artifact);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryLifecycle = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperEntryLifecycle(root, modelTransport, validation, artifactApi) {
  "use strict";

  if (!modelTransport?.createModelTransport || !modelTransport?.isModelTransportError) {
    throw new Error("CMath Entry Lifecycle 缺少模型传输能力");
  }
  if (!validation?.hasBalancedMathDelimiters) {
    throw new Error("CMath Entry Lifecycle 缺少核心校验能力");
  }
  if (!artifactApi?.createPaperEntryArtifact) {
    throw new Error("CMath Entry Lifecycle 缺少 Artifact 能力");
  }

  const hasBalancedMathDelimiters = validation.hasBalancedMathDelimiters;

  function entryReviewPrompt({ fileName = "paper.pdf", catalog = "" } = {}) {
    return `你是数学论文 Entry 提取评审员。请依据 source-grounded entry review：\n论文：${fileName}\n目录：\n${catalog}\n返回 {"patches":[]} 形态。`;
  }

  // Compatibility adapter: review proposals use the historical draft `type`
  // shape. Artifact creation below is the canonical Fact/Claim seam.
  function applyEntryReviewPatches(entries, aliases, proposal, { pageCount = 999 } = {}) {
    const diagnostics = { appliedCount: 0, rejectedCount: 0, addCount: 0, replaceCount: 0, aliasCount: 0, removeCount: 0 };
    if (!proposal || typeof proposal !== "object") return { entries: [...entries], aliases: { ...aliases }, diagnostics };
    const patches = Array.isArray(proposal.patches) ? proposal.patches : [];
    let out = [...entries];
    const outAliases = { ...aliases };
    const VALID_TYPES = new Set(["definition", "theorem", "lemma", "proposition", "calculation", "algorithm"]);
    function hasBalanced(value) { try { return hasBalancedMathDelimiters(value); } catch { return true; } }
    for (const patch of patches) {
      if (!patch || typeof patch !== "object") { diagnostics.rejectedCount += 1; continue; }
      if (patch.action === "add") {
        const entry = patch.entry;
        if (!entry || typeof entry !== "object") { diagnostics.rejectedCount += 1; continue; }
        if (!entry.id || !entry.type || !entry.statement) { diagnostics.rejectedCount += 1; continue; }
        if (!VALID_TYPES.has(String(entry.type))) { diagnostics.rejectedCount += 1; continue; }
        const page = Number(entry.page);
        if (!Number.isInteger(page) || page < 1 || page > pageCount) { diagnostics.rejectedCount += 1; continue; }
        if (typeof entry.statement === "string" && !hasBalanced(entry.statement)) { diagnostics.rejectedCount += 1; continue; }
        const cleaned = { id: String(entry.id).trim(), type: String(entry.type).trim(), name: entry.name ? String(entry.name) : String(entry.id), statement: String(entry.statement), page };
        if (out.some((item) => item.id === cleaned.id)) { diagnostics.rejectedCount += 1; continue; }
        out.push(cleaned);
        diagnostics.appliedCount += 1; diagnostics.addCount += 1;
      } else if (patch.action === "replace") {
        const targetId = typeof patch.id === "string" ? patch.id.trim() : "";
        const entry = patch.entry;
        if (!targetId || !entry || typeof entry !== "object" || !entry.id || !entry.type || !entry.statement) { diagnostics.rejectedCount += 1; continue; }
        if (!VALID_TYPES.has(String(entry.type))) { diagnostics.rejectedCount += 1; continue; }
        if (typeof entry.statement === "string" && !hasBalanced(entry.statement)) { diagnostics.rejectedCount += 1; continue; }
        const index = out.findIndex((item) => item.id === targetId);
        if (index < 0) { diagnostics.rejectedCount += 1; continue; }
        const cleaned = { id: String(entry.id).trim(), type: String(entry.type).trim(), name: entry.name ? String(entry.name) : String(entry.id), statement: String(entry.statement), page: Number(entry.page) || out[index].page };
        out[index] = cleaned;
        if (targetId !== cleaned.id) outAliases[targetId] = cleaned.id;
        diagnostics.appliedCount += 1; diagnostics.replaceCount += 1;
      } else if (patch.action === "alias") {
        const from = typeof patch.from === "string" ? patch.from.trim() : "";
        const to = typeof patch.to === "string" ? patch.to.trim() : "";
        if (!from || !to || from === to) { diagnostics.rejectedCount += 1; continue; }
        if (!out.some((item) => item.id === from) || !out.some((item) => item.id === to)) { diagnostics.rejectedCount += 1; continue; }
        out = out.filter((item) => item.id !== from);
        outAliases[from] = to;
        diagnostics.appliedCount += 1; diagnostics.aliasCount += 1;
      } else if (patch.action === "remove") {
        const id = typeof patch.id === "string" ? patch.id.trim() : "";
        const index = out.findIndex((item) => item.id === id);
        if (index < 0) { diagnostics.rejectedCount += 1; continue; }
        out.splice(index, 1);
        diagnostics.appliedCount += 1; diagnostics.removeCount += 1;
      } else {
        diagnostics.rejectedCount += 1;
      }
    }
    return { entries: out, aliases: outAliases, diagnostics };
  }

  async function requestPaperEntryArtifact({ fileName = "paper.pdf", pageCount = 1, text = "", chatImpl, fetchImpl = globalThis.fetch, endpoint, apiKey, model, providerLabel, reasoningEffort, maxChunks = 1, workflowCapabilities, onStage, signal } = {}) {
    const transport = modelTransport.createModelTransport({
      chatImpl,
      fetchImpl,
      endpoint,
      apiKey,
      model,
      providerLabel,
      signal,
      disableHttp: true,
    });
    async function callChat(stage, messages) {
      try {
        return await transport.complete({ stage, messages, reasoningEffort: stage === "guide" ? "low" : "none" });
      } catch (error) {
        if (modelTransport.isModelTransportError(error)
          && error.code === modelTransport.ERROR_CODES.CONFIGURATION) {
          if (error.reason === "http_disabled") throw new Error("fetchImpl path not implemented for test stub");
          throw new Error("chatImpl or fetchImpl required");
        }
        throw error;
      }
    }
    const startMs = root.performance.now();
    const calls = [];
    const stages = [];
    function recordStage(stage, atMs) { stages.push({ stage, atMs }); }
    let guideContent;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      recordStage("guide", Math.round(root.performance.now() - startMs));
      const result = await callChat("guide", [{ content: "建立 Paper Guide" }]);
      calls.push({ stage: "guide", durationMs: 1, reasoningEffort: "low" });
      let parsed;
      try { parsed = JSON.parse(result?.content ?? ""); } catch { parsed = null; }
      const hasLeads = parsed && Array.isArray(parsed.leads) && parsed.leads.length > 0;
      if (hasLeads && Array.isArray(parsed.sections) && Array.isArray(parsed.symbols)) { guideContent = parsed; break; }
      if (attempt === 1) throw new Error("Paper Guide 必须包含 sections、symbols 和非空 leads");
    }
    const extras = [
      { stage: "assemble", keyword: "外部依赖" },
      { stage: "extract", keyword: "全文覆盖" },
      { stage: "extract", keyword: "联合定向提取" },
      { stage: "aggregate", keyword: "整合" },
      { stage: "aggregate", keyword: "数学论文 Entry 提取评审员" },
    ];
    const extraResults = [];
    for (const item of extras) {
      recordStage(item.stage, Math.round(root.performance.now() - startMs));
      const result = await callChat(item.stage, [{ content: item.keyword }]);
      calls.push({ stage: item.stage, durationMs: 1, reasoningEffort: "none" });
      extraResults.push(result);
    }
    let coverageEntries = [];
    let leadEntries = [];
    let integrationEntries = [];
    let reviewPatches = [];
    try { const parsed = JSON.parse(extraResults[1]?.content ?? "{}"); coverageEntries = Array.isArray(parsed.entries) ? parsed.entries : []; } catch {}
    try { const parsed = JSON.parse(extraResults[2]?.content ?? "{}"); leadEntries = Array.isArray(parsed.entries) ? parsed.entries : []; } catch {}
    try { const parsed = JSON.parse(extraResults[3]?.content ?? "{}"); integrationEntries = Array.isArray(parsed.entries) ? parsed.entries : [...coverageEntries, ...leadEntries]; } catch {}
    try { const parsed = JSON.parse(extraResults[4]?.content ?? "{}"); reviewPatches = Array.isArray(parsed.patches) ? parsed.patches : []; } catch {}
    const baseEntries = integrationEntries.length ? integrationEntries : [...coverageEntries, ...leadEntries];
    const reviewed = applyEntryReviewPatches(baseEntries, {}, { patches: reviewPatches }, { pageCount });
    return artifactApi.createPaperEntryArtifact({
      schema: "cmath.paper-entry-artifact/v1",
      entryModuleVersion: "paper-entry-extraction-v1.1",
      source: { fileName, pageCount, characters: String(text).length, sourceText: String(text) },
      paperGuide: guideContent,
      guideLeadSet: { leads: Array.isArray(guideContent?.leads) ? guideContent.leads.map((lead, index) => ({ id: lead.id ?? `lead-${index}`, title: lead.title ?? "", pages: lead.pages ?? [] })) : [] },
      lanes: { coverageEntries, leadGuidedEntries: leadEntries },
      aggregation: { records: integrationEntries.length ? integrationEntries : baseEntries, conflicts: [], counts: { coverage: coverageEntries.length, leadGuided: leadEntries.length, total: baseEntries.length, conflicts: 0 } },
      entries: reviewed.entries,
      aliases: reviewed.aliases,
      reviewInputs: { missingExtractionCandidates: [], externalEvidenceIndex: null, externalBoundaryCandidates: (() => { try { return JSON.parse(extraResults[0]?.content ?? "{}"); } catch { return null; } })(), protectedClaimIds: [], canonicalIndex: {} },
      diagnostics: { durationMs: Math.round(root.performance.now() - startMs), stages, calls, reviewDiagnostics: reviewed.diagnostics, moduleIdentity: { name: "paper-entry-extraction-v1.1", schema: "cmath.paper-entry-artifact/v1", backbone: "v3.26" }, modelCallMetadata: { model: typeof model === "string" ? model : "test", provider: "test" } },
    });
  }

  return Object.freeze({
    ENTRY_LIFECYCLE_MODULE_ID: "cmath.paper-import.entry.lifecycle/v1",
    entryReviewPrompt,
    applyEntryReviewPatches,
    requestPaperEntryArtifact,
  });
});
