import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { repairJsonStringEscapes, parseModelJson } = require("../src/paper-import/paper-raw-entry-pool-v1.js");

test("repairJsonStringEscapes preserves LaTeX macros like \\bigoplus, \\bar, \\to, \\frac", () => {
  const jsonWithUnescapedLatex = `{"statement": "F = \\bigoplus_P \\mathcal{S}(\\bar{X}) \\to \\frac{A}{B} \\neq 0 \\times \\rho"}`;
  const { text: repaired, repairs } = repairJsonStringEscapes(jsonWithUnescapedLatex);
  
  assert.ok(repairs > 0, "should perform repairs");
  const parsed = JSON.parse(repaired);
  assert.match(parsed.statement, /\\bigoplus/);
  assert.match(parsed.statement, /\\bar/);
  assert.match(parsed.statement, /\\to/);
  assert.match(parsed.statement, /\\frac/);
  assert.match(parsed.statement, /\\neq/);
  assert.match(parsed.statement, /\\times/);
  assert.match(parsed.statement, /\\rho/);
});

test("parseModelJson correctly parses LaTeX without mangling \\bigoplus into igoplus", () => {
  const raw = `{"foundationEntries": [{"id": "paper:def:test", "type": "definition", "name": "测试", "statement": "\\\\bigoplus_{T} \\\\bar{X} \\\\to Y", "page": 1}], "resultEntries": [], "inferenceHints": []}`;
  const parsed = parseModelJson(raw);
  assert.equal(parsed.foundationEntries[0].statement, "\\bigoplus_{T} \\bar{X} \\to Y");
});
