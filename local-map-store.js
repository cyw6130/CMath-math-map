const fs = require("fs");
const path = require("path");
const { sanitizeStageArtifact } = require("./src/paper-import/workflow/checkpoint-store.js");

const PROJECT_VIEW_SCHEMA = "cmath.project-view-model/v0.1";

function validateProjectView(data) {
  if (data?.schema !== PROJECT_VIEW_SCHEMA || !data.project || !Array.isArray(data.entries) || !Array.isArray(data.inferences)) {
    throw new TypeError("expected " + PROJECT_VIEW_SCHEMA + " with project, entries and inferences");
  }
  return data;
}

function safeMapFileName(id) {
  const value = String(id || "").trim();
  if (!value) throw new TypeError("map id is required");
  return Buffer.from(value).toString("base64url") + ".json";
}

function normalizeMapRecord(record) {
  const generatedResult = record?.generatedResult === undefined
    ? null
    : sanitizeStageArtifact("closure", record.generatedResult);
  if (record?.generatedResult !== undefined && generatedResult?.schema !== "cmath.paper-to-map-result/v1") {
    throw new TypeError("expected cmath.paper-to-map-result/v1 generatedResult");
  }
  const data = validateProjectView(generatedResult?.map ?? record?.data);
  const id = String(record?.id || "imported:" + (data.project.id || "map")).trim();
  const title = String(record?.title || data.project.title || id).trim();
  return {
    schema: "cmath.local-map-record/v1",
    id,
    title,
    boundaryLabel: String(record?.boundaryLabel || data.channelOptions?.boundaryLabel || "本地导入 · 数学地图").trim(),
    importedAt: Number.isFinite(record?.importedAt) ? record.importedAt : Date.now(),
    isImported: true,
    data,
    ...(generatedResult ? { generatedResult } : {}),
  };
}

function createLocalMapStore(directory) {
  function ensureDirectory() {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  function list() {
    ensureDirectory();
    return fs.readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .flatMap((name) => {
        try {
          return [normalizeMapRecord(JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")))];
        } catch {
          return [];
        }
      })
      .sort((a, b) => a.importedAt - b.importedAt || a.id.localeCompare(b.id));
  }

  function put(record) {
    ensureDirectory();
    const normalized = normalizeMapRecord(record);
    const target = path.join(directory, safeMapFileName(normalized.id));
    const temporary = target + "." + process.pid + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(normalized, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(temporary, target);
    fs.chmodSync(target, 0o600);
    return normalized;
  }

  function remove(id) {
    ensureDirectory();
    const target = path.join(directory, safeMapFileName(id));
    try {
      fs.unlinkSync(target);
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  return { directory, list, put, remove };
}

module.exports = { PROJECT_VIEW_SCHEMA, createLocalMapStore, normalizeMapRecord, safeMapFileName, validateProjectView };
