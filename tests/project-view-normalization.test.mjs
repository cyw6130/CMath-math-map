import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import client from "../paper-import-client.js";
import coreIndex from "../src/paper-import/core/index.js";
import projectViewCore from "../src/paper-import/core/project-view.js";

test("Project View normalization, diagnostics, sanitizer, and integration use the core module", () => {
  assert.equal(projectViewCore.isReferenceLabelName("Theorem 3.5"), true);
  assert.equal(projectViewCore.isReferenceLabelName("Radford 同构的等变性"), false);
  for (const name of [
    "normalizeRawProjectView",
    "collectRawProjectViewIssues",
    "sanitizeRawProjectView",
    "applyIntegration",
  ]) {
    assert.equal(typeof projectViewCore[name], "function");
    assert.equal(client[name], projectViewCore[name]);
    assert.equal(coreIndex[name], projectViewCore[name]);
  }
});

test("browser pages load Project View core before the client", () => {
  for (const page of ["index.html", "index-v5.html"]) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    const coreAt = html.indexOf('<script src="src/paper-import/core/project-view.js');
    const clientAt = html.indexOf('<script src="paper-import-client.js');
    assert.ok(coreAt >= 0, `${page} loads project-view core`);
    assert.ok(clientAt >= 0, `${page} loads paper-import-client.js`);
    assert.ok(coreAt < clientAt, `${page} loads Project View core before client`);
  }
});
