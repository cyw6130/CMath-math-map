import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const read = (fileName) => readFileSync(resolve(root, fileName), "utf8");

function waitForViewerUrl(child) {
  return new Promise((resolveUrl, reject) => {
    const timeout = setTimeout(() => reject(new Error("graph viewer did not report its URL")), 5000);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const url = output.match(/Pure Graph View → (http:\/\/[^\s]+)/u)?.[1];
      if (!url) return;
      clearTimeout(timeout);
      resolveUrl(url);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`graph viewer exited with ${code}`));
    });
  });
}

test("AI graph viewer command serves and rereads one explicit JSON file", async (t) => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["graph:view"], "node server.js --port 0 --graph");

  const directory = mkdtempSync(join(tmpdir(), "cmath-pure-graph-"));
  const inputPath = join(directory, "map.json");
  const first = { marker: "first" };
  const second = { marker: "second" };
  writeFileSync(inputPath, JSON.stringify(first));

  const child = spawn("npm", ["run", "graph:view", "--", inputPath], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    child.kill();
    rmSync(directory, { recursive: true, force: true });
  });

  const viewerUrl = await waitForViewerUrl(child);
  assert.match(viewerUrl, /^http:\/\/127\.0\.0\.1:\d+\/pure-graph-view\.html$/u);

  const inputUrl = new URL("/api/pure-graph-input", viewerUrl);
  assert.deepEqual(await (await fetch(inputUrl)).json(), first);
  writeFileSync(inputPath, JSON.stringify(second));
  assert.deepEqual(await (await fetch(inputUrl)).json(), second);

  const blocked = await fetch(new URL("/api/local-key", viewerUrl));
  assert.equal(blocked.status, 404);

  writeFileSync(inputPath, "not json");
  const invalid = await fetch(inputUrl);
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /invalid/u);
});

test("pure graph page exposes only the reader controls around the existing graph canvas", () => {
  const html = read("pure-graph-view.html");
  const css = read("pure-graph-view.css");

  assert.match(html, /id="pure-graph-canvas"[^>]*tabindex="0"/u);
  assert.match(html, /id="pure-graph-legend"/u);
  assert.match(html, /id="pure-graph-refresh"[^>]*aria-label="重新读取 JSON"/u);
  assert.match(html, /id="pure-graph-inspector"[^>]*hidden/u);
  assert.match(html, /id="pure-graph-file"[^>]*type="file"[^>]*hidden/u);
  assert.doesNotMatch(html, /id="[^"]*(?:workbench|math-understanding|map-library|search)/iu);
  assert.match(html, /<body class="math-map-lab-body">/u);
  assert.match(html, /href="math-map-lab\.css"/u);
  assert.match(css, /--board:\s*#181818;/u);
  assert.match(css, /background:\s*var\(--board\);/u);
  assert.match(css, /#pure-graph-canvas\s*\{[^}]*background:\s*var\(--board\)/u);
  assert.doesNotMatch(read("pure-graph-view.js"), /background:\s*"#000000"|claimOpenFill/u);
  assert.match(read("pure-graph-view.js"), /canvas\?\.restoreOverview\(\)/u);
  assert.match(read("pure-graph-view.js"), /cmath\.v521-paper-batch-result\/v1/u);
  assert.match(read("pure-graph-view.js"), /generatedMapView\(result\)/u);

  const graphContract = html.indexOf('src="graph-contract.js"');
  const graphCanvas = html.indexOf('src="graph-canvas.js"');
  const reader = html.indexOf('src="pure-graph-view.js"');
  assert.ok(graphContract >= 0 && graphContract < graphCanvas && graphCanvas < reader);
});
