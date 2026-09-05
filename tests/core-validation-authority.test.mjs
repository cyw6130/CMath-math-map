import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const authority = require("../src/paper-import/core/validation.js");
const pool = require("../src/paper-import/paper-raw-entry-pool-v1.js");
const artifact = require("../src/paper-import/paper-entry-artifact-v1.js");
const consolidationV11 = require("../src/paper-import/paper-entry-consolidation-v1.1-model.js");
const consolidation = require("../src/paper-import/entry/consolidation.js");
const client = require("../src/paper-import/paper-import-client.js");

test("authority tracks all four math delimiter states", () => {
  const balanced = [
    "Let $x \\in X$ and $y \\in Y$.",
    "Equation: $$\\sum_{i=1}^n x_i = 0$$",
    "Inline \\( a^2 + b^2 = c^2 \\) and display \\[ E = mc^2 \\]",
    "Escaped dollar costs \\$5 and $x$ stays balanced",
    "",
  ];
  for (const text of balanced) {
    assert.equal(authority.hasBalancedMathDelimiters(text), true, JSON.stringify(text));
  }

  const unbalanced = [
    "Unbalanced dollar: Let $x \\in X",
    "Unbalanced double dollar: $$\\int_0^1 f(x) dx",
    "Unbalanced paren: \\( a + b = c",
    "Unbalanced bracket: \\[ a + b = c",
    "$inline$ then $$display$$ mixed wrong: $$x$",
  ];
  for (const text of unbalanced) {
    assert.equal(authority.hasBalancedMathDelimiters(text), false, JSON.stringify(text));
  }

  assert.throws(
    () => authority.validateMathDelimiters("Bad $formula", "statement"),
    /未配对的数学公式定界符/,
  );
  assert.doesNotThrow(() => authority.validateMathDelimiters("Good $x$ formula", "statement"));
});

test("every consumer delegates to the single authority implementation", () => {
  const consumers = [
    ["paper-raw-entry-pool-v1", pool],
    ["paper-entry-artifact-v1", artifact],
    ["paper-entry-consolidation-v1.1-model", consolidationV11],
    ["src/paper-import/entry/consolidation", consolidation],
    ["paper-import-client", client],
  ];
  for (const [name, mod] of consumers) {
    assert.equal(mod.hasBalancedMathDelimiters, authority.hasBalancedMathDelimiters, `${name}.hasBalancedMathDelimiters must be the authority function`);
    assert.equal(mod.validateMathDelimiters, authority.validateMathDelimiters, `${name}.validateMathDelimiters must be the authority function`);
  }
});
