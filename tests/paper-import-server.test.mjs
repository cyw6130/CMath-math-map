import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createPaperImportServer, isAllowedOrigin, safePdfName } from "../tools/paper-import-server.mjs";

async function listeningServer(options = {}) {
  const server = createPaperImportServer(options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test("origin and filename policy stays narrow", () => {
  assert.equal(isAllowedOrigin("https://cyw6130.github.io"), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:8000"), true);
  assert.equal(isAllowedOrigin("https://attacker.example"), false);
  assert.equal(safePdfName(encodeURIComponent("../My Paper (v2).pdf")), "My-Paper-v2.pdf");
});

test("imports a PDF and returns only the candidate Project View", async (t) => {
  let observedPdf = null;
  const projectView = { schema: "cmath.project-view/v0.1", project: { id: "paper:test", title: "Test" }, candidateEntries: [], candidateInferences: [] };
  const { server, baseUrl } = await listeningServer({
    modelProjectRoot: "/tmp/model-project",
    runner: async ({ pdfPath }) => {
      observedPdf = pdfPath;
      return projectView;
    },
  });
  t.after(() => server.close());
  const response = await fetch(`${baseUrl}/v1/import-paper`, {
    method: "POST",
    headers: {
      Origin: "https://cyw6130.github.io",
      "Content-Type": "application/pdf",
      "X-CMath-Filename": encodeURIComponent("paper.pdf"),
    },
    body: Buffer.from("%PDF-1.7\nexample"),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://cyw6130.github.io");
  assert.deepEqual(await response.json(), { status: "completed", fileName: "candidate-project-view.json", projectView });
  assert.match(observedPdf, /cmath-paper-import-/u);
});

test("rejects foreign origins and non-PDF input", async (t) => {
  const { server, baseUrl } = await listeningServer({ runner: async () => ({}) });
  t.after(() => server.close());
  const forbidden = await fetch(`${baseUrl}/v1/import-paper`, {
    method: "POST",
    headers: { Origin: "https://attacker.example", "Content-Type": "application/pdf" },
    body: Buffer.from("%PDF-1.7"),
  });
  assert.equal(forbidden.status, 403);
  const invalid = await fetch(`${baseUrl}/v1/import-paper`, {
    method: "POST",
    headers: { Origin: "http://localhost:8000", "Content-Type": "application/pdf" },
    body: Buffer.from("not a pdf"),
  });
  assert.equal(invalid.status, 400);
});

test("rejects an invalid Project View returned by the Harness", async (t) => {
  const { server, baseUrl } = await listeningServer({ runner: async () => null });
  t.after(() => server.close());
  const response = await fetch(`${baseUrl}/v1/import-paper`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: Buffer.from("%PDF-1.7\nexample"),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Harness 没有返回有效的 Project View JSON 对象" });
});
