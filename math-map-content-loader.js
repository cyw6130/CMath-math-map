/**
 * @cmath-provenance
 * @package generic-math-content-channel-v1
 * @version v1
 * @canonicalSource packages/math-map/import/generic-math-content-channel-v1/src/index.js
 * @contentHash sha256:8f6994abc94b1c2d0b9eb86bf692a2b2cf651b9795d6d5669086d526d7c5cd08
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
/* Manifest-driven loader for source-format-neutral mathematical content. */
(function publishMathMapContentLoader(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaMathMapContentLoader = api;
})(typeof window !== "undefined" ? window : globalThis, function createMathMapContentLoader(root) {
  "use strict";

  const MANIFEST_SCHEMA = "cmath-gamma.math-content-manifest/v0.1";
  const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";
  const CHANNEL_SCHEMA = "cmath-gamma.project-channel/v0.1";
  const SEMANTIC_MODEL = "cmath.fact-claim-operation/v0.1";
  const LATEX_DELIMITED_FORMAT = "cmath-gamma.math-text/latex-delimited-v1";
  const LEGACY_COMPATIBLE_FORMAT = "cmath-gamma.math-text/legacy-compatible-v0";
  const STRICT_ADMISSION_PROFILE = "mature-mathematics-lightweight-v1";
  const LEGACY_ADMISSION_PROFILE = "legacy-unreviewed-v0";
  const WORKSPACE_VIEWS = new Set(["global", "progress"]);
  const MATH_TEXT_FORMATS = new Set([LATEX_DELIMITED_FORMAT, LEGACY_COMPATIBLE_FORMAT]);
  const LEGACY_MAP_IDS = new Set([
    "group-theory",
    "three-manifolds-finite-covers",
    "three-manifolds-topological-finite-cover",
  ]);
  const MATH_TEXT_FIELDS = new Set([
    "title", "shortTitle", "statement", "description", "argument", "applicability",
    "boundaryLabel", "routeDescription", "nextActionDescription", "label",
  ]);
  const EXPLICIT_MATH = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+\$|\\\([\s\S]+?\\\))/gu;
  const BARE_TEX = /\\[A-Za-z]+|[_^](?:\{|[A-Za-z0-9\u0370-\u03ff])/u;

  function nonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
    return value.trim();
  }

  function validateManifest(manifest) {
    if (!manifest || typeof manifest !== "object" || manifest.schema !== MANIFEST_SCHEMA || !Array.isArray(manifest.maps)) {
      throw new TypeError(`expected ${MANIFEST_SCHEMA} with maps`);
    }
    const ids = new Set();
    manifest.maps.forEach((item, index) => {
      if (!item || typeof item !== "object") throw new TypeError(`manifest map ${index} must be an object`);
      const id = nonEmptyString(item.id, `manifest map ${index} id`);
      nonEmptyString(item.projectId, `manifest map ${id} projectId`);
      nonEmptyString(item.dataUrl, `manifest map ${id} dataUrl`);
      const workspaceViews = item.workspaceViews ?? ["global"];
      if (!Array.isArray(workspaceViews) || !workspaceViews.length
          || !workspaceViews.includes("global") || new Set(workspaceViews).size !== workspaceViews.length
          || workspaceViews.some((view) => !WORKSPACE_VIEWS.has(view))) {
        throw new Error(`manifest map ${id} workspaceViews must be unique global|progress values and include global`);
      }
      const mathTextFormat = nonEmptyString(item.mathTextFormat, `manifest map ${id} mathTextFormat`);
      if (!MATH_TEXT_FORMATS.has(mathTextFormat)) {
        throw new Error(`unsupported mathTextFormat for ${id}: ${mathTextFormat}`);
      }
      if (mathTextFormat === LEGACY_COMPATIBLE_FORMAT && !LEGACY_MAP_IDS.has(id)) {
        throw new Error(`new map ${id} must use ${LATEX_DELIMITED_FORMAT}`);
      }
      const admissionProfile = nonEmptyString(item.contentAdmissionProfile, `manifest map ${id} contentAdmissionProfile`);
      if (admissionProfile === LEGACY_ADMISSION_PROFILE) {
        if (!LEGACY_MAP_IDS.has(id)) throw new Error(`new map ${id} must use ${STRICT_ADMISSION_PROFILE}`);
        if (item.reviewUrl !== undefined) throw new Error(`legacy map ${id} must not declare reviewUrl`);
      } else if (admissionProfile === STRICT_ADMISSION_PROFILE) {
        nonEmptyString(item.reviewUrl, `manifest map ${id} reviewUrl`);
      } else {
        throw new Error(`unsupported contentAdmissionProfile for ${id}: ${admissionProfile}`);
      }
      if (ids.has(id)) throw new Error(`duplicate map id: ${id}`);
      ids.add(id);
    });
    return manifest;
  }

  function validateProjectView(data, expectedProjectId) {
    if (!data || typeof data !== "object" || data.schema !== PROJECT_VIEW_SCHEMA) {
      throw new TypeError(`expected ${PROJECT_VIEW_SCHEMA}`);
    }
    if (data.semanticModel !== SEMANTIC_MODEL && data.semanticModel?.id !== SEMANTIC_MODEL) {
      throw new Error(`expected semantic model ${SEMANTIC_MODEL}`);
    }
    const projectId = nonEmptyString(data.project?.id, "Project View project.id");
    if (projectId !== expectedProjectId) {
      throw new Error(`Project View identity mismatch: expected ${expectedProjectId}, received ${projectId}`);
    }
    if (!Array.isArray(data.entries) || !Array.isArray(data.inferences)) {
      throw new TypeError("Project View must provide entries and inferences");
    }
    const channel = data.channelOptions;
    if (!channel || channel.schema !== CHANNEL_SCHEMA) throw new Error(`expected ${CHANNEL_SCHEMA}`);
    if (channel.projectId !== projectId) throw new Error("project channel does not match Project View identity");
    return data;
  }

  function validateMathString(value, label, parseMath) {
    const formulas = [];
    const outsideMath = String(value).replace(EXPLICIT_MATH, (part) => {
      let math = part;
      if (part.startsWith("$$")) math = part.slice(2, -2);
      else if (part.startsWith("\\[") || part.startsWith("\\(")) math = part.slice(2, -2);
      else math = part.slice(1, -1);
      if (!math.trim()) throw new Error(`${label} contains an empty LaTeX expression`);
      formulas.push(math);
      return " ";
    });
    const delimiterRemainder = outsideMath.replace(/\\\$/gu, "");
    if (delimiterRemainder.includes("$") || /\\[\[\]()]/u.test(delimiterRemainder)) {
      throw new Error(`${label} contains unmatched LaTeX delimiters`);
    }
    if (BARE_TEX.test(outsideMath)) {
      throw new Error(`${label} contains bare TeX; wrap formulas in $...$ or $$...$$`);
    }
    if (typeof parseMath === "function") {
      formulas.forEach((math) => {
        try {
          parseMath(math);
        } catch (error) {
          throw new Error(`${label} contains invalid LaTeX: ${error.message}`);
        }
      });
    }
  }

  function validateMathTextContent(data, mathTextFormat, options = {}) {
    if (!MATH_TEXT_FORMATS.has(mathTextFormat)) {
      throw new Error(`unsupported mathTextFormat: ${mathTextFormat}`);
    }
    if (mathTextFormat === LEGACY_COMPATIBLE_FORMAT) return data;

    function visit(value, path, fieldName) {
      if (typeof value === "string") {
        if (MATH_TEXT_FIELDS.has(fieldName)) validateMathString(value, path, options.parseMath);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`, fieldName));
        return;
      }
      if (!value || typeof value !== "object") return;
      Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`, key));
    }

    visit(data, "ProjectView", "");
    return data;
  }

  function resolveDefinition(manifest, mapId) {
    validateManifest(manifest);
    const id = nonEmptyString(mapId, "mapId");
    const definition = manifest.maps.find((item) => item.id === id);
    if (!definition) throw new Error(`unknown mathematical map: ${id}`);
    return definition;
  }

  async function defaultFetchJson(url) {
    if (typeof root?.fetch !== "function") throw new Error("fetchJson is required when global fetch is unavailable");
    const response = await root.fetch(url);
    if (!response.ok) throw new Error(`failed to load ${url}: HTTP ${response.status}`);
    return response.json();
  }

  function resolveDataUrl(dataUrl, { manifestUrl, baseUrl } = {}) {
    const base = baseUrl ?? manifestUrl;
    if (!base) return dataUrl;
    return new URL(dataUrl, base).toString();
  }

  async function load(mapId, options = {}) {
    const fetchJson = options.fetchJson ?? defaultFetchJson;
    const manifest = options.manifest ?? await fetchJson(nonEmptyString(options.manifestUrl, "manifestUrl"));
    const definition = resolveDefinition(manifest, mapId);
    const dataUrl = resolveDataUrl(definition.dataUrl, options);
    const data = validateProjectView(await fetchJson(dataUrl), definition.projectId);
    validateMathTextContent(data, definition.mathTextFormat, { parseMath: options.parseMath });
    let admissionResult = null;
    if (definition.contentAdmissionProfile === STRICT_ADMISSION_PROFILE) {
      const admission = options.admission ?? root?.GammaMathContentAdmission;
      if (!admission || typeof admission.validateReview !== "function") {
        throw new Error("GammaMathContentAdmission.validateReview is required for reviewed mathematical content");
      }
      const reviewUrl = resolveDataUrl(definition.reviewUrl, options);
      admissionResult = admission.validateReview(data, definition, await fetchJson(reviewUrl));
    }
    const adapter = options.adapter ?? root?.GammaMathMapProjectAdapter;
    if (!adapter || typeof adapter.create !== "function") throw new Error("GammaMathMapProjectAdapter.create is required");
    const model = adapter.create(data, data.channelOptions.adapterOptions ?? {});
    return Object.freeze({ definition: Object.freeze({ ...definition }), data, model, admission: admissionResult });
  }

  return Object.freeze({
    MANIFEST_SCHEMA,
    PROJECT_VIEW_SCHEMA,
    CHANNEL_SCHEMA,
    SEMANTIC_MODEL,
    LATEX_DELIMITED_FORMAT,
    LEGACY_COMPATIBLE_FORMAT,
    STRICT_ADMISSION_PROFILE,
    LEGACY_ADMISSION_PROFILE,
    validateManifest,
    validateProjectView,
    validateMathTextContent,
    resolveDefinition,
    resolveDataUrl,
    load,
  });
});
