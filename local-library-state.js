const fs = require("fs");
const path = require("path");
const {
  BACKUP_SCHEMA,
  LIBRARY_STATE_SCHEMA,
  mergeLibraryBackup,
  normalizeAssignments,
  normalizeCollapsed,
  normalizeCustomFolders,
  normalizeLibraryState,
  normalizeOrders,
  validateBackupPayload,
} = require("./src/map-library/core.js");

function createLocalLibraryStateStore(filePath) {
  function ensureDirectory() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  }

  function read() {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return normalizeLibraryState(parsed);
      }
    } catch {
      // Malformed or unreadable file returns default clean state
    }
    return normalizeLibraryState({});
  }

  function write(state) {
    ensureDirectory();
    const normalized = normalizeLibraryState(state);
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, filePath);
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Ignore chmod error if platform restricts
    }
    return normalized;
  }

  return { filePath, read, write };
}

module.exports = {
  BACKUP_SCHEMA,
  LIBRARY_STATE_SCHEMA,
  createLocalLibraryStateStore,
  mergeLibraryBackup,
  normalizeAssignments,
  normalizeCollapsed,
  normalizeCustomFolders,
  normalizeLibraryState,
  normalizeOrders,
  validateBackupPayload,
};
