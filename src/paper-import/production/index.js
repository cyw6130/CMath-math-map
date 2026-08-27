/**
 * Production Paper Import facade.
 *
 * This is the single browser/Node boundary for the frozen production semantic
 * pipeline.  It composes the canonical Entry, Inference, Workflow, raw-pool,
 * and model-transport modules without re-implementing their internals.
 */
(function publishCMathPaperProductionFacade(root, factory) {
  "use strict";

  const load = (globalName, modulePath) => {
    const fromGlobal = root?.[globalName];
    if (fromGlobal) return fromGlobal;
    if (typeof require === "function") return require(modulePath);
    return null;
  };
  const entryModule = load("CMathPaperEntryModule", "../entry/index.js");
  const inferenceModule = load("CMathPaperInferenceModule", "../inference/index.js");
  const workflowModule = load("CMathPaperImportWorkflow", "../workflow/index.js");
  const rawPoolModule = load("CMathPaperRawEntryPoolV1", "../../../paper-raw-entry-pool-v1.js");
  const modelTransport = load("CMathPaperModelTransport", "../core/model-transport.js");
  const api = factory(root, entryModule, inferenceModule, workflowModule, rawPoolModule, modelTransport);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportProductionFacade = api;
})(typeof window !== "undefined" ? window : globalThis, function createCMathPaperProductionFacade(
  root,
  entryModule,
  inferenceModule,
  workflowModule,
  rawPoolModule,
  modelTransport,
) {
  "use strict";

  const MODULE_ID = "cmath.paper-import.production/v1";
  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const FROZEN_WORKFLOW = Object.freeze({
    label: "V4.1-production-reproduction",
    productionContractVersion: "production-paper-import/v1",
    mineruInputVersion: "cmath.paper-import.mineru/v1",
    entryExtractionVersion: "paper-entry-parallel-extraction-v1.31",
    entryConsolidationVersion: "paper-entry-consolidation-v1",
    entryVerificationVersion: "w7.1",
    b0BackfillVersion: "w8",
    inferenceRuntimeVersion: "v3.45",
    projectViewVersion: PROJECT_VIEW_SCHEMA,
  });
  const VNEXT_FROZEN_WORKFLOW = Object.freeze({
    ...FROZEN_WORKFLOW,
    label: "paper-to-map-vnext-tracer-1",
    productionContractVersion: "production-paper-import/v2",
    resultContractVersion: "cmath.paper-to-map-result/v1",
    capabilityAuthority: "../CMath-capabilities/exports/canonical.json",
    capabilitySyncIdentity: "sha256:3aae7108c3cb38ab0bc3ae85ea4d6e97055ba0733866d29493027089586b1a77",
    capabilityDependencies: Object.freeze([
      Object.freeze({ role: "math-map-semantics", capabilityId: "math-graph-semantics-v3", version: "v3", contractVersion: "cmath-gamma.math-map-semantics/v3" }),
      Object.freeze({ role: "entry-contract", capabilityId: "entry-model-v1", version: "v1", contractVersion: "cmath.entry/v0.2" }),
      Object.freeze({ role: "inference-contract", capabilityId: "inference-model-v1", version: "v1", contractVersion: "cmath.inference/v0.2" }),
      Object.freeze({ role: "format-normalization", capabilityId: "paper-import-workflow-v2", version: "v2.1", contractVersion: "cmath.paper-import-workflow-result/v0.2", guaranteeId: "deterministic-assembly-normalization" }),
    ]),
  });

  if (!entryModule
    || typeof entryModule.buildVerificationPrompt !== "function"
    || typeof entryModule.buildB0BackfillPrompt !== "function"
    || typeof entryModule.applyPatch !== "function"
    || typeof entryModule.runVerificationPipeline !== "function"
    || typeof entryModule.consolidateRawEntryPool !== "function"
    || typeof entryModule.validatePaperEntryArtifact !== "function") {
    throw new Error("Production Paper Import facade 缺少 Entry Module 能力");
  }
  if (!inferenceModule
    || typeof inferenceModule.assemblyPrompt !== "function"
    || typeof inferenceModule.paperProjectView !== "function"
    || typeof inferenceModule.findOpenClaims !== "function"
    || typeof inferenceModule.requestPaperInferenceFromEntryArtifact !== "function") {
    throw new Error("Production Paper Import facade 缺少 Inference Module 能力");
  }
  if (!workflowModule || typeof workflowModule.runProductionPaperImport !== "function") {
    throw new Error("Production Paper Import facade 缺少 Workflow 能力");
  }
  if (!rawPoolModule || typeof rawPoolModule.extractParallelRawEntryPool !== "function") {
    throw new Error("Production Paper Import facade 缺少 Raw Entry Pool 能力");
  }
  if (!modelTransport
    || typeof modelTransport.createModelTransport !== "function"
    || typeof modelTransport.isModelTransportError !== "function"
    || !modelTransport.ERROR_CODES
    || typeof modelTransport.ModelTransportError !== "function") {
    throw new Error("Production Paper Import facade 缺少 Model Transport 能力");
  }

  const paperProjectView = inferenceModule.paperProjectView;
  const findOpenClaims = inferenceModule.findOpenClaims;
  const requestPaperInferenceFromEntryArtifact = inferenceModule.requestPaperInferenceFromEntryArtifact;

  function nonEmpty(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
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

  function resolveEntryVerificationModule() {
    if (root?.CMathPaperEntryModule?.buildVerificationPrompt) return root.CMathPaperEntryModule;
    if (root?.CMathPaperEntryVerification?.buildVerificationPrompt) return root.CMathPaperEntryVerification;
    if (entryModule?.buildVerificationPrompt) return entryModule;
    if (typeof require === "function") {
      try {
        const module = require("../entry/index.js");
        if (module?.buildVerificationPrompt) return module;
      } catch {}
      try {
        const module = require("../entry/verification.js");
        if (module?.buildVerificationPrompt) return module;
      } catch {}
    }
    return null;
  }

  async function ensureEntryVerificationModule() {
    const loaded = resolveEntryVerificationModule();
    if (loaded) return loaded;
    // The static app historically loaded only the consolidation leaf. Keep
    // that page compatible by loading the verification leaf lazily if needed.
    if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
    const scriptSrc = "src/paper-import/entry/verification.js";
    await new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts ?? []).find((script) => String(script.src || "").includes(scriptSrc));
      if (existing) {
        if (resolveEntryVerificationModule()) { resolve(); return; }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Entry W7/W8 校验模块加载失败")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Entry W7/W8 校验模块加载失败"));
      (document.head || document.documentElement).appendChild(script);
    });
    return resolveEntryVerificationModule();
  }

  function resolveProductionWorkflowModule() {
    if (root?.CMathPaperImportWorkflow?.runProductionPaperImport) return root.CMathPaperImportWorkflow;
    if (workflowModule?.runProductionPaperImport) return workflowModule;
    return null;
  }

  function parseModelJson(content) {
    if (typeof content !== "string" || !content.trim()) throw new Error("模型服务没有返回 JSON 内容");
    const trimmed = content.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    try { return JSON.parse(trimmed); }
    catch (error) { throw new Error(`模型服务返回的内容不是有效 JSON：${error.message}`); }
  }

  function parsePatchJson(content, stage) {
    let parsed;
    try {
      parsed = parseModelJson(content);
    } catch (error) {
      // Keep parity with the laboratory CLI: tolerate a short explanatory
      // prefix/suffix around the JSON object, but never invent a patch.
      const match = typeof content === "string" ? content.match(/\{[\s\S]*\}/u) : null;
      if (!match) throw new Error(`${stage} 返回的内容不是有效 JSON：${error.message}`);
      try { parsed = JSON.parse(match[0]); }
      catch (nested) { throw new Error(`${stage} 返回的内容不是有效 JSON：${nested.message}`); }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${stage} 必须返回 JSON 对象`);
    }
    return parsed;
  }

  async function requestEntryVerificationPatch({
    stage,
    prompt,
    endpoint,
    apiKey,
    model,
    providerLabel,
    reasoningEffort,
    fetchImpl,
    chatImpl,
    signal,
  } = {}) {
    const serviceName = typeof providerLabel === "string" && providerLabel.trim() ? providerLabel.trim() : "模型服务";
    const modelName = nonEmpty(model, "模型名称");
    const key = nonEmpty(apiKey, "API Key");
    const messages = [{ role: "user", content: prompt }];
    const body = {
      model: modelName,
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    };
    const transport = modelTransport.createModelTransport({
      chatImpl,
      fetchImpl,
      endpoint: endpoint ? endpointUrl(endpoint) : endpoint,
      apiKey: key,
      model: modelName,
      providerLabel: serviceName,
      signal,
    });
    let content = "";
    try {
      const result = await transport.complete({
        stage,
        messages,
        model: modelName,
        providerLabel: serviceName,
        reasoningEffort,
        signal,
        body,
      });
      content = result.content;
    } catch (error) {
      if (modelTransport.isModelTransportError(error)) {
        const detail = error.code === modelTransport.ERROR_CODES.SERVICE
          ? String(error.details?.error?.message ?? error.details?.error ?? "").slice(0, 300)
          : error.reason === "invalid_json"
            ? String(error.cause?.message ?? error.message)
            : typeof error.body === "string"
              ? error.body.slice(0, 500)
              : error.message;
        const label = error.code === modelTransport.ERROR_CODES.HTTP
          ? `请求失败（HTTP ${error.status}）`
          : error.code === modelTransport.ERROR_CODES.SERVICE
            ? "服务端错误"
            : error.reason === "missing_message"
              ? "没有返回 JSON 内容"
              : "响应不是有效 JSON";
        const mapped = new modelTransport.ModelTransportError(
          error.code,
          `${serviceName} ${stage} ${label}${error.reason === "missing_message" ? "" : `：${detail}`}`,
          { ...(error.details || {}), cause: error },
        );
        mapped.transportError = error;
        throw mapped;
      }
      throw error;
    }
    if (typeof content !== "string" || !content.trim()) throw new Error(`${serviceName} ${stage} 没有返回 JSON 内容`);
    return parsePatchJson(content, stage);
  }

  async function requestPaperProjectView({ endpoint, apiKey, model, providerLabel = "模型服务", fileName, pageCount, text, markedMarkdown, fetchImpl = globalThis.fetch, chatImpl, signal, onStage, maxChunks = 5, reasoningEffort, productionSemanticPipeline = false, allowPartialSuccess = false, allowRefinementDegradation = false, allowInferenceDegradation = false, resumeArtifacts = null, onArtifact } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("当前浏览器不支持网络请求");
    const key = nonEmpty(apiKey, "API Key");
    const modelName = nonEmpty(model, "模型名称");
    const serviceName = nonEmpty(providerLabel, "模型服务名称");
    const targetUrl = endpointUrl(endpoint);
    const extractionEndpoint = String(endpoint).replace(/\/chat\/completions\/?$/u, "");
    const notify = (stage, info = {}) => { try { onStage?.(stage, info); } catch {} };
    const sourceMarkedText = [markedMarkdown, text]
      .find((candidate) => typeof candidate === "string" && candidate.trim()) ?? "";
    if (!sourceMarkedText.trim()) throw new Error("MinerU marked Markdown 不能为空");
    const runVerificationStages = productionSemanticPipeline === true;
    const resolvedPageCount = Number.isInteger(pageCount) && pageCount > 0
      ? pageCount
      : Math.max(1, ...[...sourceMarkedText.matchAll(/\[\[PAGE (\d+)\]\]/gu)].map((match) => Number(match[1])));

    // ── Frozen Workflow (ADR-0003)：网页与 Benchmark 共用 V4.1 管线 ──
    // Entry: paper-entry-parallel-extraction-v1.31 并行窗口抽取 → 确定性整合
    // Inference: v4（运行时 prompt 系 v3.45），失败显式抛错，无旧链路回退
    const frozenPool = root?.CMathPaperRawEntryPoolV1 ?? rawPoolModule;
    const frozenConsolidation = entryModule;
    const frozenArtifactApi = entryModule;
    if (!frozenPool?.extractParallelRawEntryPool) {
      throw new Error("冻结工作流模块没有加载：缺少 CMathPaperRawEntryPoolV1（检查 index.html 脚本顺序）");
    }
    if (!frozenConsolidation?.consolidateRawEntryPool) {
      throw new Error("冻结工作流模块没有加载：缺少 CMathPaperEntryConsolidationV1（检查 index.html 脚本顺序）");
    }
    const entryVerification = runVerificationStages ? await ensureEntryVerificationModule() : null;
    if (runVerificationStages && (!entryVerification?.buildVerificationPrompt || !entryVerification?.buildB0BackfillPrompt || !entryVerification?.applyPatch || !entryVerification?.runVerificationPipeline)) {
      throw new Error("生产论文导入链路没有加载 Entry W7/W8 校验模块（请先加载 src/paper-import/entry/verification.js）");
    }
    notify("frozen-workflow", {
      label: FROZEN_WORKFLOW.label,
      entryExtractionVersion: FROZEN_WORKFLOW.entryExtractionVersion,
      inferenceRuntimeVersion: FROZEN_WORKFLOW.inferenceRuntimeVersion,
    });
    let rawPool = resumeArtifacts?.entry ?? null;
    if (!rawPool) {
      notify("entry", {
        phase: "start",
        entryExtractionVersion: FROZEN_WORKFLOW.entryExtractionVersion,
      });
      rawPool = await frozenPool.extractParallelRawEntryPool({
        fileName,
        pageCount: resolvedPageCount,
        text: sourceMarkedText,
        endpoint: extractionEndpoint,
        apiKey: key,
        model: modelName,
        providerLabel: serviceName,
        reasoningEffort,
        fetchImpl,
        signal,
        maxChunks,
        chatImpl,
        chatDefaults: { model: modelName, providerLabel: serviceName, reasoningEffort },
        allowPartialSuccess,
        onStage: (stage, info = {}) => {
          // The raw pool has several progress labels; production exposes them
          // under one stable semantic stage while retaining the sub-stage.
          if (stage === "extract" || String(stage).startsWith("parallel-extract")) {
            notify("entry", { ...info, phase: stage });
          } else {
            notify(stage, info);
          }
        },
        extractionModuleVersion: FROZEN_WORKFLOW.entryExtractionVersion,
      });
    }

    notify("entry", {
      phase: "complete",
      entries: rawPool?.rawEntries?.length ?? rawPool?.chunks?.reduce((n, c) => n + (c.rawEntries?.length ?? 0), 0) ?? 0,
    });
    if (typeof onArtifact === "function" && !resumeArtifacts?.entry) {
      await onArtifact("entry", rawPool, { entries: rawPool?.rawEntries?.length ?? 0 });
    }

    let artifact = resumeArtifacts?.consolidate ?? null;
    if (!artifact) {
      notify("consolidate", {
        phase: "start",
        candidates: rawPool?.chunks?.reduce((n, c) => n + (c.rawEntries?.length ?? 0), 0) ?? rawPool?.rawEntries?.length ?? 0,
      });
      artifact = frozenConsolidation.consolidateRawEntryPool(rawPool, {
        allowPartialSuccess,
        strictMath: allowPartialSuccess,
      });
      if (frozenArtifactApi?.validatePaperEntryArtifact) {
        frozenArtifactApi.validatePaperEntryArtifact(artifact);
      }
      if (typeof onArtifact === "function") await onArtifact("consolidate", artifact);
      else notify("consolidate", { phase: "complete", entries: artifact.entries?.length ?? 0 });
    }

    // Production reproduction of Laboratory W7.1 → W8: no prompt changes,
    // no model/provider substitution, and no skipped intermediate artifact.
    const caseId = artifact.caseId || fileName || "paper";
    let backfilledArtifact;
    if (!runVerificationStages) {
      backfilledArtifact = artifact;
    } else if (resumeArtifacts?.["w8-b0"]) {
      backfilledArtifact = resumeArtifacts["w8-b0"];
    } else {
      const requestPatch = ({ stage, prompt }) => requestEntryVerificationPatch({
        stage,
        prompt,
        endpoint,
        apiKey: key,
        model: modelName,
        providerLabel: serviceName,
        reasoningEffort,
        fetchImpl,
        chatImpl,
        signal,
      });
      backfilledArtifact = await entryVerification.runVerificationPipeline({
        artifact: resumeArtifacts?.["w7-verify"] ?? artifact,
        sourceText: sourceMarkedText,
        caseId,
        requestPatch,
        validateArtifact: frozenArtifactApi?.validatePaperEntryArtifact,
        onStage: notify,
        onArtifact,
        startStage: resumeArtifacts?.["w7-verify"] ? "w8-b0" : "w7-verify",
        allowDegraded: allowRefinementDegradation,
      });
    }

    let view = resumeArtifacts?.inference ?? null;
    if (!view) {
      if (runVerificationStages) {
        notify("inference", {
          phase: "start",
          inferenceRuntimeVersion: FROZEN_WORKFLOW.inferenceRuntimeVersion,
          entries: backfilledArtifact.entries?.length ?? 0,
        });
      }
      view = await requestPaperInferenceFromEntryArtifact({
        artifact: backfilledArtifact,
        endpoint,
        apiKey,
        model: modelName,
        providerLabel: serviceName,
        fetchImpl,
        chatImpl,
        signal,
        onStage,
        reasoningEffort,
        workflowVersion: FROZEN_WORKFLOW.inferenceRuntimeVersion,
        chatDefaults: { model: modelName, providerLabel: serviceName, reasoningEffort },
        allowDegraded: allowInferenceDegradation,
      });
      if (typeof onArtifact === "function") {
        const degraded = allowInferenceDegradation && view?.diagnostics?.inferenceDegraded === true;
        await onArtifact("inference", view, degraded ? { status: "degraded" } : {});
      }
    }

    if (resumeArtifacts?.closure) return resumeArtifacts.closure;
    notify("closure", { phase: "start" });
    if (typeof onArtifact === "function") {
      await onArtifact("closure", view, { openClaims: findOpenClaims(view).map((entry) => entry.displayLabel) });
    } else {
      notify("closure", { phase: "complete", openClaims: findOpenClaims(view).map((entry) => entry.displayLabel) });
    }
    return view;
  }

  // Explicit production boundary. The legacy requestPaperProjectView call
  // remains available for existing callers; this entry point always enables
  // the W7.1 → W8 semantic stages and accepts MinerU's marked Markdown name.
  async function requestPaperProductionSemanticPipeline(options = {}) {
    const markedMarkdown = nonEmpty(options.markedMarkdown, "MinerU marked Markdown");
    return requestPaperProjectView({
      ...options,
      productionSemanticPipeline: true,
      markedMarkdown,
    });
  }

  // Single public orchestration boundary for PDF → MinerU → frozen semantic
  // stages. The existing semantic-only function above remains unchanged for
  // callers that already have marked Markdown.
  async function requestPaperProductionImport(options = {}) {
    const workflow = resolveProductionWorkflowModule();
    if (!workflow?.runProductionPaperImport) {
      throw new Error("Production Paper Import workflow 没有加载");
    }
    return workflow.runProductionPaperImport({
      ...options,
      frozenWorkflow: options.frozenWorkflow ?? FROZEN_WORKFLOW,
      semanticPipeline: options.semanticPipeline ?? requestPaperProductionSemanticPipeline,
    });
  }

  return Object.freeze({
    MODULE_ID,
    FROZEN_WORKFLOW,
    VNEXT_FROZEN_WORKFLOW,
    endpointUrl,
    requestPaperProjectView,
    requestPaperProductionSemanticPipeline,
    requestPaperProductionImport,
  });
});
