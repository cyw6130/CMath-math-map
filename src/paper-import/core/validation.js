/**
 * Core Validation — 论文导入核心校验（数学定界符、Fact/Claim 边界等）
 * 抽取自 paper-import-client 与 entry consolidation 的共用校验，确保 Closure/B0 一致性
 * 此文件为 #10 迁入，根部保留薄转发
 */
"use strict";
function hasBalancedMathDelimiters(text) {
  if (typeof text !== "string") return true;
  let inDollarInline = false, inDollarDisplay = false, inParenInline = false, inBracketDisplay = false;
  let i = 0, len = text.length;
  while (i < len) {
    let backslashCount = 0, j = i - 1;
    while (j >= 0 && text[j] === "\\") { backslashCount += 1; j -= 1; }
    const isEscaped = backslashCount % 2 === 1;
    if (!isEscaped && text[i] === "$") {
      const isDouble = i + 1 < len && text[i + 1] === "$";
      if (inDollarDisplay) { if (isDouble) { inDollarDisplay = false; i += 2; continue; } }
      else if (inDollarInline) { if (!isDouble) { inDollarInline = false; i += 1; continue; } else return false; }
      else { if (isDouble) { inDollarDisplay = true; i += 2; continue; } else { inDollarInline = true; i += 1; continue; } }
    } else if (!isEscaped && text[i] === "\\" && i + 1 < len) {
      const next = text[i + 1];
      if (next === "(") { if (inParenInline) return false; inParenInline = true; i += 2; continue; }
      if (next === ")") { if (!inParenInline) return false; inParenInline = false; i += 2; continue; }
      if (next === "[") { if (inBracketDisplay) return false; inBracketDisplay = true; i += 2; continue; }
      if (next === "]") { if (!inBracketDisplay) return false; inBracketDisplay = false; i += 2; continue; }
    }
    i += 1;
  }
  return !inDollarInline && !inDollarDisplay && !inParenInline && !inBracketDisplay;
}
module.exports = Object.freeze({ hasBalancedMathDelimiters });
