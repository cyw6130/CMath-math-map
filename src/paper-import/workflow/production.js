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

  const STAGES = Object.freeze([
    "mineru",
    "entry",
    "consolidate",
    "w7-verify",
    "w8-b0",
    "inference",
    "closure",
  ]);
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

  async function runProductionPaperImport(options = {}) {
    if (!checkpointStore) throw new Error("Paper Import checkpoint store 没有加载");
    const pdf = options.pdf;
    if (!pdf) throw new Error("生产论文导入需要 pdf");
    const fingerprint = await computePdfFingerprint(pdf, { hashImpl: options.hashImpl });
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

    const semanticPipeline = options.semanticPipeline;
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
      // Custom semantic seams may not expose a closure artifact; preserving the
      // returned Project View still makes the final stage resumable.
      if (!completedArtifact(checkpoint, "closure")) await markComplete("closure", view);
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
