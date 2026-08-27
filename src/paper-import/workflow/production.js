/**
 * Production Paper Import orchestration.
 *
 * This is the runtime boundary between the browser's PDF/MinerU input and the
 * already-frozen Entry/W7/W8/Inference semantic pipeline.  It owns recovery
 * and persistence only; prompts and semantic stage behavior remain in their
 * existing modules.
 */
(function publishProductionWorkflow(root, factory) {
  "use strict";
  const checkpointStore = root?.CMathPaperImportCheckpointStore
    ?? (typeof require === "function" ? require("./checkpoint-store.js") : null);
  const mineruModule = root?.CMathPaperImportMineru
    ?? (typeof require === "function" ? require("../mineru/index.js") : null);
  const api = factory(root, checkpointStore, mineruModule);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperImportProduction = api;
})(typeof window !== "undefined" ? window : globalThis, function createProductionWorkflow(root, checkpointStore, mineruModule) {
  "use strict";

  const STAGES = checkpointStore?.WORKFLOW_STAGES ?? checkpointStore?.STAGE_NAMES;
  const SEMANTIC_STAGES = STAGES.slice(1);
  const CHECKPOINT_SCHEMA = checkpointStore?.CHECKPOINT_SCHEMA ?? "cmath.paper-import.checkpoint/v1";

  function cloneJson(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function nonEmpty(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空文本`);
    return value.trim();
  }

  function stableValue(value) {
    if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function sameIdentity(left, right) {
    return stableValue(left ?? {}) === stableValue(right ?? {});
  }

  function capabilityFailure(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function isVNextWorkflow(frozenWorkflow) {
    return frozenWorkflow.productionContractVersion === "production-paper-import/v2"
      || frozenWorkflow.resultContractVersion === "cmath.paper-to-map-result/v1"
      || Array.isArray(frozenWorkflow.capabilityDependencies);
  }

  function validateCapabilityRuntime(frozenWorkflow, runtime) {
    if (!isVNextWorkflow(frozenWorkflow)) return null;
    for (const field of ["resultContractVersion", "capabilityAuthority", "capabilitySyncIdentity"]) {
      if (typeof frozenWorkflow[field] !== "string" || !frozenWorkflow[field]) {
        throw capabilityFailure(
          "PAPER_TO_MAP_CAPABILITY_MISSING",
          "VNext Paper-to-Map 缺少完整的权威能力身份",
        );
      }
    }
    if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_MISSING",
        "VNext Paper-to-Map 缺少权威能力运行时",
      );
    }
    if (typeof runtime.semanticPipeline !== "function" || typeof runtime.validateMap !== "function") {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_MISSING",
        "VNext Paper-to-Map 能力运行时缺少语义执行器或地图校验器",
      );
    }
    const manifest = runtime.manifest;
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_MISSING",
        "VNext Paper-to-Map 缺少能力同步清单",
      );
    }
    const dependencies = Array.isArray(frozenWorkflow.capabilityDependencies)
      ? frozenWorkflow.capabilityDependencies
      : [];
    const packages = Array.isArray(manifest.canonicalPackages) ? manifest.canonicalPackages : [];
    const requiredRoles = [
      "math-map-semantics", "entry-contract", "inference-contract", "format-normalization",
    ];
    if (!dependencies.length || dependencies.some((dependency) => (
      !dependency?.role || !dependency?.capabilityId || !dependency?.version || !dependency?.contractVersion
    )) || requiredRoles.some((role) => dependencies.filter((dependency) => dependency.role === role).length !== 1)) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_MISSING",
        "VNext Paper-to-Map 缺少能力依赖声明",
      );
    }
    const missing = dependencies.find((dependency) => !packages.some((candidate) => (
      candidate?.capabilityId === dependency.capabilityId
    )));
    if (missing) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_MISSING",
        `VNext Paper-to-Map 缺少能力 ${missing.capabilityId}@${missing.version}`,
      );
    }
    const incompatible = dependencies.find((dependency) => !packages.some((candidate) => (
      candidate?.capabilityId === dependency.capabilityId
      && candidate?.version === dependency.version
      && candidate?.contractVersion === dependency.contractVersion
    )));
    if (incompatible) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_INCOMPATIBLE",
        `VNext Paper-to-Map 能力版本不兼容 ${incompatible.capabilityId}@${incompatible.version}`,
      );
    }
    if (
      manifest.schema !== "cmath.capability-consumer-manifest/v1"
      || manifest.authority !== frozenWorkflow.capabilityAuthority
      || manifest.syncIdentity !== frozenWorkflow.capabilitySyncIdentity
    ) {
      throw capabilityFailure(
        "PAPER_TO_MAP_CAPABILITY_INCOMPATIBLE",
        "VNext Paper-to-Map 能力同步身份不兼容",
      );
    }
    return runtime;
  }

  async function readPdfBytes(pdf) {
    if (pdf instanceof Uint8Array) return new Uint8Array(pdf);
    if (pdf instanceof ArrayBuffer) return new Uint8Array(pdf);
    if (pdf && typeof pdf.arrayBuffer === "function") return new Uint8Array(await pdf.arrayBuffer());
    if (pdf && pdf.bytes instanceof Uint8Array) return new Uint8Array(pdf.bytes);
    throw new Error("生产论文导入需要可读取的 PDF 文件");
  }

  function bytesToHex(bytes) {
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function defaultSha256(bytes) {
    const cryptoObject = root?.crypto
      ?? (typeof globalThis !== "undefined" ? globalThis.crypto : null);
    if (cryptoObject?.subtle && typeof cryptoObject.subtle.digest === "function") {
      return bytesToHex(new Uint8Array(await cryptoObject.subtle.digest("SHA-256", bytes)));
    }
    if (typeof require === "function") {
      try {
        const nodeCrypto = require("node:crypto");
        return nodeCrypto.createHash("sha256").update(bytes).digest("hex");
      } catch { /* browser or a restricted runtime */ }
    }
    throw new Error("当前环境没有 Web Crypto SHA-256 能力");
  }

  async function computePdfFingerprint(pdf, { hashImpl } = {}) {
    const bytes = await readPdfBytes(pdf);
    const digest = await (typeof hashImpl === "function" ? hashImpl(bytes) : defaultSha256(bytes));
    if (typeof digest === "string" && digest.trim()) return digest.trim();
    if (digest instanceof Uint8Array) return `sha256:${bytesToHex(digest)}`;
    if (digest instanceof ArrayBuffer) return `sha256:${bytesToHex(new Uint8Array(digest))}`;
    throw new Error("PDF hash seam 必须返回十六进制文本或字节数组");
  }

  function pageCountOf(markedMarkdown, fallback = 1) {
    const pages = [...String(markedMarkdown ?? "").matchAll(/\[\[PAGE\s+(\d+)\]\]/gu)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isInteger(value) && value > 0);
    return pages.length ? Math.max(...pages) : (Number.isInteger(fallback) && fallback > 0 ? fallback : 1);
  }

  function stageFor(rawStage) {
    if (STAGES.includes(rawStage)) return rawStage;
    const text = String(rawStage ?? "");
    if (text === "extract" || text.startsWith("parallel-extract")) return "entry";
    if (text === "assemble" || text === "response" || text === "repair" || text === "validate" || text === "autofix") return "inference";
    return null;
  }

  function errorRecord(error, sensitiveValues = []) {
    let message = String(error?.message ?? error ?? "生产论文导入失败");
    message = message
      .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
      .replace(/https?:\/\/[^\s"'<>]+/giu, "[redacted-url]");
    for (const value of sensitiveValues) {
      if (typeof value === "string" && value) message = message.split(value).join("[redacted]");
    }
    return {
      message: message.slice(0, 500),
      ...(typeof error?.code === "string" ? { code: error.code.slice(0, 80) } : {}),
    };
  }

  function completedArtifact(checkpoint, stage) {
    const record = checkpoint?.stages?.[stage];
    return record?.status === "complete" && record.artifact && typeof record.artifact === "object"
      ? record.artifact
      : null;
  }

  function checkpointKey(fingerprint) {
    return `production-paper-import:${fingerprint}`;
  }

  function getModelConfig(options) {
    return {
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      model: options.model,
      providerLabel: options.providerLabel,
      reasoningEffort: options.reasoningEffort,
    };
  }

  function paperToMapResult({ semanticResult, checkpoint, mineruArtifact, fingerprint, frozenWorkflow }) {
    const structured = semanticResult?.map && typeof semanticResult.map === "object"
      ? semanticResult
      : { map: semanticResult };
    const stages = {};
    for (const stage of STAGES) {
      const record = checkpoint.stages?.[stage];
      if (!record || typeof record !== "object") continue;
      stages[stage] = {
        status: record.status,
        attempt: Number(record.attempt ?? 0),
      };
    }
    return {
      schema: "cmath.paper-to-map-result/v1",
      status: "complete",
      map: structured.map,
      sourceAnnotations: {
        source: {
          fileName: mineruArtifact.fileName ?? "paper.pdf",
          pageCount: mineruArtifact.pageCount ?? 1,
        },
        items: Array.isArray(structured.sourceAnnotations?.items)
          ? cloneJson(structured.sourceAnnotations.items)
          : [],
      },
      unresolvedItems: Array.isArray(structured.unresolvedItems)
        ? cloneJson(structured.unresolvedItems)
        : [],
      diagnostics: {
        mainTargetIdentified: typeof structured.diagnostics?.mainTargetIdentified === "boolean"
          ? structured.diagnostics.mainTargetIdentified
          : Boolean(structured.map?.mainTargetEntryId),
        openClaimCount: Number.isInteger(structured.diagnostics?.openClaimCount)
          ? structured.diagnostics.openClaimCount
          : 0,
        mainProofChainComplete: typeof structured.diagnostics?.mainProofChainComplete === "boolean"
          ? structured.diagnostics.mainProofChainComplete
          : null,
        missingStages: [],
      },
      stages,
      identity: {
        contentFingerprint: fingerprint,
        frozenWorkflow,
      },
    };
  }

  function hasCompleteStages(stages) {
    return STAGES.every((stage) => stages?.[stage]?.status === "complete");
  }

  function isRestorablePaperToMapResult(result, fingerprint, frozenWorkflow) {
    return result?.schema === "cmath.paper-to-map-result/v1"
      && result.status === "complete"
      && result.map && Array.isArray(result.map.entries) && result.map.entries.length > 0
      && Array.isArray(result.map.inferences)
      && result.sourceAnnotations && Array.isArray(result.sourceAnnotations.items)
      && Array.isArray(result.unresolvedItems)
      && result.diagnostics && Array.isArray(result.diagnostics.missingStages)
      && hasCompleteStages(result.stages)
      && result.identity?.contentFingerprint === fingerprint
      && sameIdentity(result.identity?.frozenWorkflow, frozenWorkflow);
  }

  async function runProductionPaperImport(options = {}) {
    if (!checkpointStore) throw new Error("Paper Import checkpoint store 没有加载");
    const pdf = options.pdf;
    if (!pdf) throw new Error("生产论文导入需要 pdf");
    const frozenWorkflow = checkpointStore.sanitizeWorkflowIdentity
      ? checkpointStore.sanitizeWorkflowIdentity(options.frozenWorkflow ?? {})
      : cloneJson(options.frozenWorkflow ?? {});
    const requiredIdentityFields = [
      "label",
      "productionContractVersion",
      "mineruInputVersion",
      "entryExtractionVersion",
      "entryConsolidationVersion",
      "entryVerificationVersion",
      "b0BackfillVersion",
      "inferenceRuntimeVersion",
      "projectViewVersion",
    ];
    if (requiredIdentityFields.some((field) => !frozenWorkflow[field])) {
      throw new Error("生产论文导入需要完整的 Frozen Workflow 身份");
    }
    const capabilityRuntime = validateCapabilityRuntime(frozenWorkflow, options.capabilityRuntime);
    const fingerprint = await computePdfFingerprint(pdf, { hashImpl: options.hashImpl });
    const key = checkpointKey(fingerprint);
    const store = options.checkpointStore
      ?? checkpointStore.createDefaultCheckpointStore?.()
      ?? checkpointStore.createMemoryCheckpointStore();
    const loaded = await store.load(key);
    const reusable = loaded
      && loaded.schema === CHECKPOINT_SCHEMA
      && loaded.contentFingerprint === fingerprint
      && sameIdentity(loaded.frozenWorkflow, frozenWorkflow);
    const checkpoint = reusable
      ? loaded
      : {
        schema: CHECKPOINT_SCHEMA,
        key,
        contentFingerprint: fingerprint,
        input: {
          contentFingerprint: fingerprint,
          ...(typeof pdf?.name === "string" ? { fileName: pdf.name } : {}),
          ...(Number.isFinite(pdf?.size) ? { byteLength: Number(pdf.size) } : {}),
        },
        frozenWorkflow,
        stages: {},
        updatedAt: new Date().toISOString(),
      };
    checkpoint.key = key;
    checkpoint.contentFingerprint = fingerprint;
    checkpoint.frozenWorkflow = frozenWorkflow;
    checkpoint.input = {
      ...(checkpoint.input && typeof checkpoint.input === "object" ? checkpoint.input : {}),
      contentFingerprint: fingerprint,
      ...(typeof pdf?.name === "string" ? { fileName: pdf.name } : {}),
      ...(Number.isFinite(pdf?.size) ? { byteLength: Number(pdf.size) } : {}),
    };
    checkpoint.stages = checkpoint.stages && typeof checkpoint.stages === "object" ? checkpoint.stages : {};

    const onStage = typeof options.onStage === "function" ? options.onStage : null;
    function notify(stage, phase, info = {}) {
      try {
        onStage?.(stage, { phase, ...info });
      } catch { /* observers cannot change workflow state */ }
    }
    let pendingSave = Promise.resolve();
    function persist() {
      checkpoint.updatedAt = new Date().toISOString();
      const snapshot = checkpointStore.sanitizeCheckpoint
        ? checkpointStore.sanitizeCheckpoint(checkpoint, key)
        : cloneJson(checkpoint);
      if (!snapshot) throw new Error("无法生成安全的 Paper Import checkpoint");
      pendingSave = pendingSave.catch(() => {}).then(() => store.save(key, snapshot));
      return pendingSave;
    }
    async function markStarted(stage, info = {}) {
      const { phase: _ignoredPhase, ...details } = info;
      const previous = checkpoint.stages[stage];
      checkpoint.stages[stage] = {
        status: "running",
        attempt: Number(previous?.attempt ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      notify(stage, "start", details);
      await persist();
    }
    async function markComplete(stage, artifact, info = {}) {
      checkpoint.stages[stage] = {
        status: "complete",
        attempt: Number(checkpoint.stages[stage]?.attempt ?? 1),
        artifact,
        updatedAt: new Date().toISOString(),
      };
      await persist();
      notify(stage, "complete", info);
    }
    async function markFailed(stage, error) {
      const safeError = errorRecord(error, [options.apiKey]);
      checkpoint.stages[stage] = {
        status: "failed",
        attempt: Number(checkpoint.stages[stage]?.attempt ?? 1),
        error: safeError,
        updatedAt: new Date().toISOString(),
      };
      await persist();
      notify(stage, "fail", safeError);
    }
    function markResumed(stage) {
      notify(stage, "resume", { checkpointKey: key });
    }

    // MinerU is the only external call before the frozen semantic pipeline.
    let mineruArtifact = completedArtifact(checkpoint, "mineru");
    if (mineruArtifact) {
      markResumed("mineru");
    } else {
      try {
        await markStarted("mineru");
        const mineruClient = options.mineruClient
          ?? (typeof options.createMineruClient === "function"
            ? options.createMineruClient({ gatewayUrl: options.gatewayUrl, fetchImpl: options.mineruFetchImpl, unzip: options.unzip, unzipAdapter: options.unzipAdapter })
            : null)
          ?? (typeof mineruModule?.createMineruClient === "function"
            ? mineruModule.createMineruClient({
              gatewayUrl: options.gatewayUrl,
              fetchImpl: options.mineruFetchImpl,
              unzip: options.unzip,
              unzipAdapter: options.unzipAdapter,
              pollIntervalMs: options.pollIntervalMs,
            })
            : null);
        if (!mineruClient || typeof mineruClient.importPdf !== "function") {
          throw new Error("生产论文导入需要 MinerU client（gatewayUrl、unzip）");
        }
        const result = await mineruClient.importPdf(pdf, {
          signal: options.signal,
          timeoutMs: options.mineruTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          modelVersion: options.mineruModelVersion,
          onProgress: (progress) => notify("mineru", "progress", { state: progress?.state }),
        });
        const markedMarkdown = nonEmpty(result?.markedMarkdown, "MinerU marked Markdown");
        mineruArtifact = {
          markedMarkdown,
          pageCount: pageCountOf(markedMarkdown, options.pageCount),
          ...(typeof pdf?.name === "string" ? { fileName: pdf.name } : {}),
        };
        await markComplete("mineru", mineruArtifact, { pageCount: mineruArtifact.pageCount });
      } catch (error) {
        await markFailed("mineru", error);
        throw error;
      }
    }

    const semanticPipeline = capabilityRuntime?.semanticPipeline ?? options.semanticPipeline;
    if (typeof semanticPipeline !== "function") throw new Error("生产编排需要 frozen semantic pipeline");
    const resumeArtifacts = {};
    let contiguous = Boolean(mineruArtifact);
    for (const stage of SEMANTIC_STAGES) {
      const artifact = contiguous ? completedArtifact(checkpoint, stage) : null;
      if (artifact && contiguous) {
        resumeArtifacts[stage] = artifact;
        markResumed(stage);
      } else contiguous = false;
    }
    const restoredResult = completedArtifact(checkpoint, "closure");
    if (frozenWorkflow.resultContractVersion === "cmath.paper-to-map-result/v1" && restoredResult) {
      const cleanRestoredResult = checkpointStore.sanitizeStageArtifact
        ? checkpointStore.sanitizeStageArtifact("closure", restoredResult)
        : restoredResult;
      if (!isRestorablePaperToMapResult(cleanRestoredResult, fingerprint, frozenWorkflow)) {
        throw capabilityFailure(
          "PAPER_TO_MAP_RESULT_INVALID",
          "恢复的 Paper-to-Map 结果合同无效",
        );
      }
      if (await capabilityRuntime.validateMap(cleanRestoredResult.map) !== true) {
        throw capabilityFailure(
          "PAPER_TO_MAP_RESULT_INVALID",
          "恢复的 Paper-to-Map 地图未通过权威能力校验",
        );
      }
      return cleanRestoredResult;
    }
    let activeStage = null;
    const semanticOnStage = (rawStage, info = {}) => {
      const stage = stageFor(rawStage);
      if (!stage || stage === "mineru") return;
      if (info.phase === "start") {
        activeStage = stage;
        if (!completedArtifact(checkpoint, stage)) {
          void markStarted(stage, info).catch(() => {});
        }
      } else if (info.phase === "progress") {
        notify(stage, "progress", info);
      }
    };
    const semanticOnArtifact = async (rawStage, artifact, info = {}) => {
      const stage = stageFor(rawStage);
      if (!stage || stage === "mineru") return;
      activeStage = stage;
      if (stage === "closure" && capabilityRuntime) return;
      await markComplete(stage, artifact, info);
      activeStage = null;
    };

    const modelConfig = getModelConfig(options);
    const semanticOptions = {
      ...modelConfig,
      fileName: mineruArtifact.fileName ?? pdf?.name ?? "paper.pdf",
      pageCount: mineruArtifact.pageCount ?? pageCountOf(mineruArtifact.markedMarkdown, options.pageCount),
      markedMarkdown: mineruArtifact.markedMarkdown,
      fetchImpl: options.fetchImpl,
      chatImpl: options.chatImpl,
      signal: options.signal,
      maxChunks: options.maxChunks,
      onStage: semanticOnStage,
      onArtifact: semanticOnArtifact,
      resumeArtifacts,
      workflowVersion: frozenWorkflow.inferenceRuntimeVersion ?? "v3.45",
    };
    try {
      const view = await semanticPipeline(semanticOptions);
      if (capabilityRuntime) {
        const map = view?.map && typeof view.map === "object" ? view.map : view;
        if (await capabilityRuntime.validateMap(map) !== true) {
          throw capabilityFailure(
            "PAPER_TO_MAP_RESULT_INVALID",
            "Paper-to-Map 地图未通过权威能力校验",
          );
        }
        const unresolvedItems = Array.isArray(view?.unresolvedItems) ? view.unresolvedItems : [];
        const invalidUnresolved = unresolvedItems.some((item) => (
          !item || typeof item !== "object"
          || !["sourceStage", "candidateSummary", "failureCategory", "validationError"]
            .every((field) => typeof item[field] === "string" && item[field].trim())
          || typeof item.retryable !== "boolean"
        ));
        if (invalidUnresolved) {
          throw capabilityFailure(
            "PAPER_TO_MAP_RESULT_INVALID",
            "Paper-to-Map 结果包含无效的 Unresolved Item",
          );
        }
      }
      // Custom semantic seams may not expose a closure artifact; preserving the
      // returned Project View still makes the final stage resumable.
      if (!completedArtifact(checkpoint, "closure")) await markComplete("closure", view);
      if (frozenWorkflow.resultContractVersion === "cmath.paper-to-map-result/v1") {
        if (!hasCompleteStages(checkpoint.stages)) {
          throw capabilityFailure(
            "PAPER_TO_MAP_RESULT_INVALID",
            "Paper-to-Map 完整结果缺少已完成的阶段状态",
          );
        }
        const unsafeResult = paperToMapResult({
          semanticResult: view,
          checkpoint,
          mineruArtifact,
          fingerprint,
          frozenWorkflow,
        });
        const result = checkpointStore.sanitizeStageArtifact
          ? checkpointStore.sanitizeStageArtifact("closure", unsafeResult)
          : unsafeResult;
        if (!result?.map || !Array.isArray(result.map.entries) || result.map.entries.length === 0) {
          throw capabilityFailure("PAPER_TO_MAP_RESULT_INVALID", "Paper-to-Map 结果缺少合法地图");
        }
        await markComplete("closure", result);
        return result;
      }
      return view;
    } catch (error) {
      const failedStage = activeStage
        ?? SEMANTIC_STAGES.find((stage) => !completedArtifact(checkpoint, stage))
        ?? "closure";
      await markFailed(failedStage, error);
      throw error;
    }
  }

  return Object.freeze({
    STAGES,
    SEMANTIC_STAGES,
    computePdfFingerprint,
    runProductionPaperImport,
  });
});
