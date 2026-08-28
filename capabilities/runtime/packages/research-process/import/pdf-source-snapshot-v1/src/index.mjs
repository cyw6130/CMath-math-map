/**
 * @cmath-provenance
 * @package pdf-source-snapshot-v1
 * @version v1
 * @canonicalSource packages/research-process/import/pdf-source-snapshot-v1/src/index.mjs
 * @contentHash sha256:2b99dadb150bd49c230e182ffe09f9435f2497cec9b8016f4c34f4451959d2e7
 * @syncAuthority CMath-capabilities/exports/canonical.json
 * @warning DO NOT EDIT DIRECTLY. Synchronize from CMath-capabilities.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PDF_SOURCE_SNAPSHOT_SCHEMA = "cmath.pdf-source-snapshot/v0.1";

export function validatePdfSourceSnapshot(snapshot) {
  if (snapshot?.schema !== PDF_SOURCE_SNAPSHOT_SCHEMA || snapshot.kind !== "pdf_source_snapshot") throw new Error("PDF source snapshot schema mismatch");
  if (!/^sha256:[a-f0-9]{64}$/u.test(snapshot.source?.pdf_sha256 ?? "")) throw new Error("snapshot PDF digest is invalid");
  if (!Number.isInteger(snapshot.page_count) || snapshot.page_count < 1 || snapshot.pages?.length !== snapshot.page_count) throw new Error("snapshot pages are incomplete");
  const ids = new Set();
  for (const [index, page] of snapshot.pages.entries()) {
    if (page.page !== index + 1 || !Array.isArray(page.blocks)) throw new Error(`snapshot page ${index + 1} is invalid`);
    for (const block of page.blocks) {
      if (ids.has(block.block_id)) throw new Error(`duplicate block id: ${block.block_id}`);
      ids.add(block.block_id);
      if (block.page !== page.page || block.pdf_sha256 !== snapshot.source.pdf_sha256) throw new Error(`invalid source anchor: ${block.block_id}`);
      if (!Array.isArray(block.bbox) || block.bbox.length !== 4 || block.coordinate_space !== "pdf-points-top-left") throw new Error(`invalid block geometry: ${block.block_id}`);
      for (const key of ["raw_text_digest", "normalized_text_digest", "render_digest"]) if (!/^sha256:[a-f0-9]{64}$/u.test(block[key] ?? "")) throw new Error(`invalid ${key}: ${block.block_id}`);
    }
  }
  if (!ids.size) throw new Error("OCR_REQUIRED: PDF contains no extractable text blocks");
  return true;
}

export function capturePdfSourceSnapshot({ pdfPath, outputDirectory, python = "python3", spawn = spawnSync }) {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), "extract_snapshot.py");
  const result = spawn(python, [script, resolve(pdfPath), resolve(outputDirectory)], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw new Error(`PDF snapshot extractor failed to start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`PDF snapshot extraction failed: ${String(result.stderr || result.stdout).trim()}`);
  const snapshot = JSON.parse(readFileSync(resolve(outputDirectory, "source-snapshot.json"), "utf8"));
  validatePdfSourceSnapshot(snapshot);
  return snapshot;
}
