/**
 * @deprecated 薄转发 — 已迁至 src/paper-import/entry/consolidation.js
 * 保留兼容入口，内部调用请改为 require('./entry/consolidation.js')
 */
"use strict";
module.exports = require("./entry/consolidation.js");
if (typeof window !== "undefined" && window.CMathPaperEntryConsolidationV1 === undefined) {
  try { window.CMathPaperEntryConsolidationV1 = module.exports; } catch {}
}
