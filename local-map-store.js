const fs = require("fs");
const path = require("path");
const {
  PROJECT_VIEW_SCHEMA,
  isCanonicalMathMap,
  normalizeMapRecord,
  validateCanonicalMathMap,
  validateProjectView,
  validateSupportedMap,
} = require("./src/map-library/core.js");

function safeMapFileName(id) {
  const value = String(id || "").trim();
  if (!value) throw new TypeError("map id is required");
  return Buffer.from(value).toString("base64url") + ".json";
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

module.exports = {
  PROJECT_VIEW_SCHEMA,
  createLocalMapStore,
  isCanonicalMathMap,
  normalizeMapRecord,
  safeMapFileName,
  validateCanonicalMathMap,
  validateProjectView,
  validateSupportedMap,
};
