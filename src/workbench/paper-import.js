/** Paper Import user journey mounted onto the existing static workbench HTML. */
(function publishPaperImportWorkbench(hostRoot, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (hostRoot) hostRoot.CMathPaperImportWorkbench = api;
})(typeof window !== "undefined" ? window : globalThis, function createPaperImportWorkbenchModule() {
  "use strict";

  const instances = new WeakMap();
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  const MODEL_ACCESS_PREF_KEY = "cmath.math-map.model-access-mode-v1";
  const SAVED_MODEL_CONFIG_KEY = "cmath.math-map.saved-model-config-v1";
  const MODEL_CONSENT_KEY = "cmath.math-map.muse-consent-v1";
  const MODEL_CONSENT_VERSION = "muse-spark-contributor-training-v1";
  const SESSION_KEYS_KEY = "cmath.math-map.session-keys";
  const CMATH_PROVIDED_MODEL = "muse-spark-1.2-contributor";
  const PROVIDER_LABELS = Object.freeze({
    custom: "自定义模型服务",
    deepseek: "DeepSeek",
    kimi: "Kimi",
    opencode: "OpenCode Go",
  });
  const EXTRACT_STEPS = Object.freeze([
    Object.freeze({ id: "mineru", label: "MinerU 精准解析" }),
    Object.freeze({ id: "generate", label: "V5.1 生成中文标准数学地图" }),
    Object.freeze({ id: "validate", label: "能力合同校验" }),
    Object.freeze({ id: "repair", label: "按需修复（最多 2 次）" }),
    Object.freeze({ id: "save", label: "保存标准 JSON" }),
  ]);

  function mountPaperImportWorkbench({ root, runtime, onMapReady } = {}) {
    if (!root || typeof root.querySelector !== "function") throw new TypeError("Paper Import Workbench 需要 DOM root");
    if (instances.has(root)) return instances.get(root);
    if (typeof runtime?.paperImport?.endpointUrl !== "function"
      || typeof runtime?.paperImport?.fetch !== "function"
      || typeof runtime?.paperImport?.requestPaperProductionImport !== "function") {
      throw new Error("Paper Import Workbench 缺少 runtime.paperImport");
    }
    if (typeof runtime?.mapLibrary?.saveMap !== "function"
      || typeof runtime?.mapLibrary?.sanitizeGeneratedResult !== "function"
      || typeof runtime?.mapLibrary?.generatedMapView !== "function"
      || typeof runtime?.mapLibrary?.isCanonicalMathMap !== "function") {
      throw new Error("Paper Import Workbench 缺少 runtime.mapLibrary");
    }
    if (typeof onMapReady !== "function") throw new TypeError("Paper Import Workbench 需要 onMapReady");

    const view = root.defaultView ?? globalThis;
    const storage = view.localStorage;
    const session = view.sessionStorage;
    const paperDrawer = root.querySelector("#paper-drawer");
    const pdfDropZone = paperDrawer?.querySelector(".pdf-drop-zone");
    const dropMain = pdfDropZone?.querySelector(".drop-main");
    const dropSub = pdfDropZone?.querySelector(".drop-sub");
    const startButton = root.querySelector("#btn-start-extract");
    if (!paperDrawer || !pdfDropZone || !startButton) {
      throw new Error("Paper Import Workbench 找不到生产 HTML 宿主");
    }
    const defaultDropMain = dropMain?.textContent ?? "";
    const defaultDropSub = dropSub?.textContent ?? "";
    const pdfInput = root.createElement("input");
    pdfInput.type = "file";
    pdfInput.accept = ".pdf,application/pdf";
    pdfInput.hidden = true;
    paperDrawer.appendChild(pdfInput);
    const status = root.createElement("div");
    status.className = "extract-status";
    status.hidden = true;
    startButton.parentElement?.before(status);

    const cleanups = [];
    let selectedPdf = null;
    let stepEls = new Map();
    let activeStage = "mineru";
    let consentResolver = null;
    let activeAbortController = null;
    let disposed = false;

    function listen(target, type, handler, options) {
      target?.addEventListener?.(type, handler, options);
      cleanups.push(() => target?.removeEventListener?.(type, handler, options));
    }

    function readJson(store, key, fallback) {
      try { return JSON.parse(store?.getItem(key) || "null") ?? fallback; }
      catch { return fallback; }
    }

    function savedAccessMode() {
      try { return storage?.getItem(MODEL_ACCESS_PREF_KEY) === "own" ? "own" : "cmath"; }
      catch { return "cmath"; }
    }

    function savedModelConfig() {
      const value = readJson(storage, SAVED_MODEL_CONFIG_KEY, null);
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    }

    function sessionKeyFor(provider) {
      return readJson(session, SESSION_KEYS_KEY, {})?.[provider] || "";
    }

    function showOwnModelSettings() {
      root.querySelector("#btn-topbar-settings")?.click?.();
      const own = root.querySelector('input[name="model-access-mode"][value="own"]');
      if (!own || own.checked) return;
      own.checked = true;
      const EventConstructor = view.Event ?? globalThis.Event;
      own.dispatchEvent?.(new EventConstructor("change", { bubbles: true }));
    }

    function closePanels() {
      root.querySelector("#btn-close-paper-drawer")?.click?.();
    }

    function openLibrary() {
      root.querySelector("#card-curated-demos")?.click?.();
    }

    function resetStatus() {
      status.hidden = true;
      status.innerHTML = "";
      status.classList.remove("is-error", "is-success");
    }

    function clearSelectedPdf() {
      selectedPdf = null;
      pdfInput.value = "";
      pdfDropZone.classList.remove("has-file");
      if (dropMain) dropMain.textContent = defaultDropMain;
      if (dropSub) dropSub.textContent = defaultDropSub;
    }

    function selectPdf(file) {
      if (!file) return;
      if (!String(file.name || "").toLowerCase().endsWith(".pdf")
        || file.size <= 0
        || file.size > 200 * 1024 * 1024) {
        clearSelectedPdf();
        showError("请选择一份不超过 200 MB 的 PDF 论文。");
        return;
      }
      selectedPdf = file;
      resetStatus();
      pdfDropZone.classList.add("has-file");
      pdfDropZone.setAttribute("aria-label", `已选择 ${file.name}`);
      if (dropMain) dropMain.textContent = file.name;
      if (dropSub) {
        const mb = file.size / 1048576;
        dropSub.textContent = `${mb >= 0.1 ? mb.toFixed(1) : "<0.1"} MB · 点击或拖拽可重新选择`;
      }
    }

    function showSteps() {
      status.hidden = false;
      status.classList.remove("is-error", "is-success");
      status.innerHTML = `<ol class="extract-steps">${EXTRACT_STEPS.map((step) => (
        `<li data-step="${step.id}"><span class="step-dot"></span><span class="step-label">${step.label}</span><span class="step-detail"></span></li>`
      )).join("")}</ol>`;
      stepEls = new Map([...status.querySelectorAll("li")].map((item) => [item.dataset.step, item]));
      activeStage = "mineru";
    }

    function setStep(id, state, detail) {
      const item = stepEls.get(id);
      if (!item) return;
      item.classList.remove("is-active", "is-done");
      if (state) item.classList.add(state === "active" ? "is-active" : "is-done");
      if (detail !== undefined) item.querySelector(".step-detail").textContent = detail;
    }

    function completePriorSteps(id) {
      const activeIndex = EXTRACT_STEPS.findIndex((step) => step.id === id);
      if (activeIndex <= 0) return;
      EXTRACT_STEPS.slice(0, activeIndex).forEach((step) => {
        const item = stepEls.get(step.id);
        if (!item || item.classList.contains("is-done")) return;
        setStep(step.id, "done", item.querySelector(".step-detail")?.textContent || "完成");
      });
    }

    function handleImportStage(stage, info = {}) {
      if (!stepEls.has(stage)) return;
      if (info.phase === "resume") {
        completePriorSteps(stage);
        setStep(stage, "done", "已从本地 checkpoint 恢复");
      } else if (info.phase === "start") {
        completePriorSteps(stage);
        activeStage = stage;
        setStep(stage, "active", stage === "mineru" ? "正在提交并解析 PDF" : "运行中…");
      } else if (info.phase === "progress") {
        activeStage = stage;
        const states = {
          "waiting-file": "等待 PDF 上传",
          pending: "等待 MinerU 调度",
          running: "MinerU 正在解析",
          converting: "正在生成 Markdown",
          done: "解析完成",
        };
        setStep(stage, "active", states[info.state] ?? "处理中…");
      } else if (info.phase === "complete") {
        completePriorSteps(stage);
        setStep(stage, "done", stage === "mineru"
          ? `${info.pageCount ?? "?"} 页 marked Markdown`
          : (Number.isInteger(info.entries) ? `${info.entries} 个对象` : "完成"));
      } else if (info.phase === "degraded") {
        completePriorSteps(stage);
        setStep(stage, "done", "部分完成，可稍后重试");
      } else if (info.phase === "fail") {
        completePriorSteps(stage);
        activeStage = stage;
        setStep(stage, "done", `失败：${info.message ?? "请重试"}`);
      }
    }

    function finishSteps(result) {
      const map = runtime.mapLibrary.generatedMapView(result);
      if (runtime.mapLibrary.isCanonicalMathMap(map)) {
        setStep("generate", "done", `${map.entries.length} 个对象 · ${map.inferences.length} 条推理`);
        setStep("validate", "done", "标准 JSON 合法");
        const repairs = Number(result?.diagnostics?.runReport?.repairAttempts ?? 0);
        setStep("repair", "done", repairs ? `已修复 ${repairs} 次` : "无需修复");
        return;
      }
      const entries = map?.entries?.length ?? 0;
      const inferences = map?.inferences?.length ?? 0;
      setStep("generate", "done", `${entries} 个对象 · ${inferences} 条推理 · 部分完成`);
      setStep("validate", "done", "合法部分结果");
      setStep("repair", "done", "未猜测缺失语义");
    }

    function mapRecord(result, fileName) {
      const cleanResult = runtime.mapLibrary.sanitizeGeneratedResult(result);
      const projectView = cleanResult?.map ?? result;
      const title = (projectView?.project?.title
        || cleanResult?.sourceAnnotations?.source?.fileName?.replace(/\.pdf$/iu, "")
        || fileName.replace(/\.pdf$/iu, "")
        || "论文解析结果").trim();
      const boundaryLabel = projectView?.channelOptions?.boundaryLabel || `论文解析结果 · ${fileName}`;
      const rawId = projectView?.project?.id || cleanResult?.identity?.contentFingerprint || title || fileName;
      const workflowIdentity = cleanResult
        ? `${cleanResult.identity?.contentFingerprint ?? "content"}-${cleanResult.identity?.frozenWorkflow?.promptVersion ?? cleanResult.identity?.frozenWorkflow?.capabilitySyncIdentity ?? "capability"}-${cleanResult.identity?.frozenWorkflow?.productionContractVersion ?? "contract"}`
        : "";
      const slug = String(workflowIdentity ? `${rawId}-${workflowIdentity}` : rawId)
        .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/gu, "-")
        .replace(/^-+|-+$/gu, "")
        .toLowerCase() || "paper-map";
      return {
        id: `imported:${slug}`,
        title,
        boundaryLabel,
        data: projectView,
        importedAt: Date.now(),
        isImported: true,
        ...(cleanResult ? { generatedResult: cleanResult } : {}),
      };
    }

    function showError(message) {
      status.hidden = false;
      status.classList.add("is-error");
      status.classList.remove("is-success");
      const stepsHtml = status.querySelector(".extract-steps")?.outerHTML ?? "";
      status.innerHTML = `${stepsHtml}<p class="extract-error-text"></p>`;
      status.querySelector(".extract-error-text").textContent = message;
    }

    function showSuccess(ready) {
      const missingCount = ready.result?.diagnostics?.missingStages?.length ?? 0;
      const unresolvedCount = ready.result?.unresolvedItems?.length ?? 0;
      status.hidden = false;
      status.classList.add("is-success");
      status.classList.remove("is-error");
      const stepsHtml = status.querySelector(".extract-steps")?.outerHTML ?? "";
      status.innerHTML = `${stepsHtml}
        <p class="extract-success-title">✓ 解析完成</p>
        <p class="extract-success-sub">已自动保存到「我的 JSON 地图」${missingCount || unresolvedCount ? ` · ${missingCount} 个阶段待完善 · ${unresolvedCount} 个未解决项` : ""}</p>
        <div class="extract-success-actions">
          <button type="button" class="extract-open-map">立即在地图中打开</button>
          <button type="button" class="extract-open-library">打开地图库</button>
          <button type="button" class="extract-dismiss">关闭</button>
        </div>`;
      status.querySelector(".extract-open-map")?.addEventListener("click", () => {
        Promise.resolve(onMapReady({ ...ready, open: true })).catch((error) => showError(error.message));
      }, { once: true });
      status.querySelector(".extract-open-library")?.addEventListener("click", openLibrary, { once: true });
      status.querySelector(".extract-dismiss")?.addEventListener("click", closePanels, { once: true });
    }

    function hasProvidedConsent() {
      try { return storage?.getItem(MODEL_CONSENT_KEY) === MODEL_CONSENT_VERSION; }
      catch { return false; }
    }

    function finishConsent(accepted) {
      const resolve = consentResolver;
      if (!resolve) return;
      const card = root.querySelector("#model-consent-card");
      if (card) card.hidden = true;
      startButton.disabled = false;
      consentResolver = null;
      resolve(accepted);
    }

    function requestConsent() {
      if (hasProvidedConsent()) return Promise.resolve(true);
      const card = root.querySelector("#model-consent-card");
      if (!card) return Promise.resolve(false);
      card.hidden = false;
      startButton.disabled = true;
      root.querySelector("#btn-accept-model-consent")?.focus?.();
      return new Promise((resolve) => { consentResolver = resolve; });
    }

    function gatewayUrls() {
      return {
        mineru: String(view.CMATH_MINERU_GATEWAY_URL ?? root.documentElement?.dataset?.mineruGatewayUrl ?? "").trim(),
        model: String(view.CMATH_MODEL_GATEWAY_URL ?? root.documentElement?.dataset?.modelGatewayUrl ?? "").trim().replace(/\/+$/u, ""),
      };
    }

    function createProvidedChat(modelGatewayUrl) {
      return async ({ stage = "model", messages = [], maxTokens, responseFormat, reasoningEffort, signal } = {}) => {
        let response;
        try {
          response = await view.fetch(`${modelGatewayUrl}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ stage, messages, maxTokens, responseFormat, reasoningEffort }),
            signal,
          });
        } catch (cause) {
          const error = new Error("暂时无法连接 CMath 提供的模型服务。");
          error.code = "CMATH_MODEL_UNAVAILABLE";
          error.cause = cause;
          throw error;
        }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.content !== "string") {
          const messagesByStatus = {
            403: "当前地区或来源暂时无法使用 CMath 提供的模型。",
            429: "当前请求较多，CMath 提供的模型暂时繁忙。",
            503: "CMath 提供的模型正在维护或已临时停用。",
          };
          const error = new Error(messagesByStatus[response.status] || payload.error || "CMath 提供的模型暂时不可用。");
          error.code = "CMATH_MODEL_UNAVAILABLE";
          error.status = response.status;
          throw error;
        }
        return payload;
      };
    }

    function showProvidedFailure(message) {
      showError(message);
      const actions = root.createElement("div");
      actions.className = "extract-error-actions";
      actions.innerHTML = '<button type="button" class="extract-retry-provided">稍后重试</button><button type="button" class="extract-use-own">使用自己的 API</button>';
      status.appendChild(actions);
      actions.querySelector(".extract-retry-provided")?.addEventListener("click", () => startButton.click(), { once: true });
      actions.querySelector(".extract-use-own")?.addEventListener("click", showOwnModelSettings, { once: true });
    }

    async function persistLocalConfig(provider, { apiKey, endpoint, model }) {
      if (!LOCAL_HOSTS.has(String(view.location?.hostname ?? ""))) return;
      try {
        await view.fetch("/api/local-key", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey, endpoint, model }),
        });
      } catch { /* key persistence must never break import */ }
    }

    async function startImport() {
      if (!selectedPdf) {
        pdfInput.click();
        return;
      }
      const useProvidedModel = savedAccessMode() === "cmath";
      if (useProvidedModel && !(await requestConsent())) return;
      const urls = gatewayUrls();
      if (useProvidedModel && !urls.model) {
        showProvidedFailure("CMath 提供的模型服务尚未完成部署，请稍后重试或使用自己的 API。");
        return;
      }
      const saved = savedModelConfig();
      const provider = useProvidedModel ? "cmath" : (saved?.provider || "opencode");
      const apiKeyInput = root.querySelector("#api-key-input");
      const endpointInput = root.querySelector("#api-endpoint-input");
      const rememberKeyInput = root.querySelector("#remember-key-input");
      const modelSelect = root.querySelector("#model-select");
      const customModelInput = root.querySelector("#custom-model-input");
      const currentModel = modelSelect?.value === "custom" ? customModelInput?.value.trim() : modelSelect?.value;
      const apiKey = useProvidedModel
        ? "server-managed-credential"
        : (sessionKeyFor(provider) || apiKeyInput?.value.trim() || "");
      if (!useProvidedModel && !apiKey) {
        showError(`请先在“设置 → 使用自己的 API”中填写 ${PROVIDER_LABELS[provider] || "模型服务"} API Key。`);
        showOwnModelSettings();
        return;
      }
      const model = useProvidedModel ? CMATH_PROVIDED_MODEL : (saved?.model || currentModel);
      const endpoint = useProvidedModel ? urls.model : (saved?.endpoint || endpointInput?.value || "");
      const providerLabel = useProvidedModel ? "CMath 提供 · Muse Spark" : (PROVIDER_LABELS[provider] || "模型服务");
      if (!urls.mineru) {
        showError("MinerU 精准解析服务尚未配置，请稍后重试。");
        return;
      }
      if (!view.fflate?.unzipSync) {
        showError("MinerU ZIP 解包组件没有加载，请刷新后重试。");
        return;
      }

      const originalLabel = startButton.textContent;
      startButton.disabled = true;
      startButton.textContent = "解析中…";
      showSteps();
      setStep("mineru", "active", "正在计算 PDF 指纹");
      activeAbortController = new (view.AbortController ?? globalThis.AbortController)();
      try {
        const result = await runtime.paperImport.requestPaperProductionImport({
          pdf: selectedPdf,
          gatewayUrl: urls.mineru,
          unzip: (bytes) => view.fflate.unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
          mineruFetchImpl: view.fetch.bind(view),
          endpoint,
          apiKey,
          model,
          providerLabel,
          fetchImpl: runtime.paperImport.fetch,
          chatImpl: useProvidedModel ? createProvidedChat(urls.model) : undefined,
          onStage: handleImportStage,
          reasoningEffort: !useProvidedModel && model === "deepseek-v4-flash" ? "none" : undefined,
          signal: activeAbortController.signal,
        });
        const record = mapRecord(result, selectedPdf.name);
        const savedRecord = await runtime.mapLibrary.saveMap(record) ?? record;
        setStep("save", "done", "已保存到我的 JSON 地图");
        finishSteps(result);
        const ready = Object.freeze({
          fileName: selectedPdf.name,
          projectView: savedRecord.data,
          record: savedRecord,
          result,
        });
        await onMapReady({ ...ready, open: false });
        showSuccess(ready);
      } catch (error) {
        if (error?.name === "AbortError" && disposed) return;
        const message = error instanceof TypeError
          ? (activeStage === "mineru"
            ? "浏览器无法连接 MinerU 精准解析服务，请检查网络后重试。"
            : `浏览器无法直接连接 ${providerLabel}。请检查网络、API 服务地址以及服务端的跨域请求设置。`)
          : error.message;
        if (useProvidedModel && (error?.code === "CMATH_MODEL_UNAVAILABLE" || activeStage !== "mineru")) {
          showProvidedFailure(message);
        } else {
          showError(message);
        }
      } finally {
        activeAbortController = null;
        if (!useProvidedModel && apiKeyInput) {
          const local = LOCAL_HOSTS.has(String(view.location?.hostname ?? ""));
          if (local) {
            if (rememberKeyInput?.checked && apiKey.trim()) {
              await persistLocalConfig(provider, { apiKey, endpoint, model });
            } else if (!rememberKeyInput?.checked) {
              apiKeyInput.value = "";
            }
          } else {
            if (apiKey.trim()) {
              const keys = readJson(session, SESSION_KEYS_KEY, {});
              keys[provider] = apiKey;
              try { session?.setItem(SESSION_KEYS_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
            }
            apiKeyInput.value = "";
          }
        }
        if (!disposed) {
          startButton.disabled = false;
          startButton.textContent = originalLabel;
        }
      }
    }

    listen(pdfDropZone, "click", () => pdfInput.click());
    listen(pdfInput, "change", (event) => selectPdf(event.target.files?.[0]));
    listen(pdfDropZone, "dragover", (event) => event.preventDefault());
    listen(pdfDropZone, "drop", (event) => {
      event.preventDefault();
      selectPdf(event.dataTransfer?.files?.[0]);
    });
    listen(startButton, "click", () => { void startImport(); });
    listen(root.querySelector("#btn-accept-model-consent"), "click", () => {
      try { storage?.setItem(MODEL_CONSENT_KEY, MODEL_CONSENT_VERSION); } catch { /* consent applies to this run */ }
      finishConsent(true);
    });
    listen(root.querySelector("#btn-use-own-model"), "click", () => {
      finishConsent(false);
      showOwnModelSettings();
    });

    const controller = Object.freeze({
      cancelConsent() { finishConsent(false); },
      reset: resetStatus,
      dispose() {
        if (disposed) return;
        disposed = true;
        activeAbortController?.abort();
        finishConsent(false);
        cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
        pdfInput.remove();
        status.remove();
        instances.delete(root);
      },
    });
    instances.set(root, controller);
    return controller;
  }

  return Object.freeze({ mountPaperImportWorkbench });
});
