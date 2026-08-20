/**
 * @deprecated 薄转发 — 已迁至 src/paper-import/entry/consolidation.js
 * 保留根部路径以兼容旧引入，内部调用请改为 require('./src/paper-import/entry/consolidation.js')
 */
"use strict";
module.exports = require("./src/paper-import/entry/consolidation.js");
if (typeof window !== "undefined" && window.CMathPaperEntryConsolidationV1 === undefined) {
  try { window.CMathPaperEntryConsolidationV1 = module.exports; } catch {}
}
