import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("GammaMath.toPlainText keeps unmapped script characters in formulas", () => {
  const browserWindow = {};
  vm.runInNewContext(readFileSync(resolve(root, "math-text.js"), "utf8"), {
    window: browserWindow,
  });
  vm.runInNewContext(readFileSync(resolve(root, "math-rendering-consumer.js"), "utf8"), {
    window: browserWindow,
  });

  assert.equal(
    browserWindow.GammaMath.toPlainText("证明 · 2 · H_{n,k} 与 B^{4}"),
    "证明 · 2 · Hₙ,ₖ 与 B⁴",
  );
});
