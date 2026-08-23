/**
 * Core Validation — 论文导入核心校验（数学定界符配对）
 * 单一权威实现：hasBalancedMathDelimiters 跟踪 $ / $$ / \( \) / \[ \] 四种状态，
 * 全仓库（client、pool、artifact、两份 consolidation）统一引用本模块，禁止再复制副本。
 * UMD 双通道：Node 走 module.exports；浏览器由 <script> 预加载发布 root.CMathPaperCoreValidation。
 */
(function publishCMathPaperCoreValidation(root, factory) {
	"use strict";
	const api = factory(root);
	if (typeof module === "object" && module.exports) module.exports = api;
	if (root) root.CMathPaperCoreValidation = api;
})(typeof window !== "undefined" ? window : globalThis, function createCMathPaperCoreValidationModule() {
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

	function validateMathDelimiters(value, label) {
		if (typeof value !== "string") return;
		if (!hasBalancedMathDelimiters(value)) {
			throw new Error(`${label} 包含未配对的数学公式定界符 $ 或 $$（请确保成对闭合或使用 \\$ 转义）`);
		}
	}

	return Object.freeze({ hasBalancedMathDelimiters, validateMathDelimiters });
});
