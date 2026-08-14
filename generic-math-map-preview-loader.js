/* Browser-local Project View preview loader.
 * Preview data is validated and projected in memory; it never writes canonical
 * content, the central manifest, or generated frontend assets.
 */
(function publishGenericMathMapPreviewLoader(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaGenericMathMapPreviewLoader = api;
})(typeof window !== "undefined" ? window : globalThis, function createPreviewLoaderApi() {
  "use strict";

  function requireApi(api, method, label) {
    if (!api || typeof api[method] !== "function") {
      throw new Error(`${label}.${method} is required`);
    }
    return api;
  }

  function previewDefinition(data, fileName = "") {
    const projectId = String(data?.project?.id ?? "").trim();
    const title = String(data?.project?.title ?? "").trim()
      || String(fileName).replace(/\.json$/iu, "").trim()
      || "本地数学内容";
    const boundaryLabel = String(data?.channelOptions?.boundaryLabel ?? "").trim()
      || "本地预览 · 不写入项目";
    return Object.freeze({
      id: `preview:${projectId}`,
      title,
      projectId,
      boundaryLabel,
      source: "browser-local-file",
    });
  }

  function prepare(data, options = {}) {
    const loader = requireApi(options.loader, "validateProjectView", "GammaMathMapContentLoader");
    const adapter = requireApi(options.adapter, "create", "GammaMathMapProjectAdapter");
    const projectId = String(data?.project?.id ?? "").trim();
    loader.validateProjectView(data, projectId);
    const model = adapter.create(data, data.channelOptions?.adapterOptions ?? {});
    return Object.freeze({
      data,
      model,
      definition: previewDefinition(data, options.fileName),
    });
  }

  function parse(text, fileName = "Project View JSON") {
    if (typeof text !== "string") throw new TypeError("Project View file contents must be text");
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new SyntaxError(`无法解析 ${fileName}：${error.message}`);
    }
  }

  async function loadFile(file, options = {}) {
    if (!file || typeof file.text !== "function") {
      throw new TypeError("请选择一份 Project View JSON 文件");
    }
    const fileName = String(file.name ?? "Project View JSON");
    return prepare(parse(await file.text(), fileName), { ...options, fileName });
  }

  return Object.freeze({ loadFile, parse, prepare, previewDefinition });
});
