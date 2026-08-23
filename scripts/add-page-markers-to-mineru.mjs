import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function addPageMarkers(pdfPath, mdPath, outputPath) {
  const pageCount = Number(execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" }).match(/Pages:\s+(\d+)/u)?.[1] ?? 0);
  const rawPdftotext = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rawPages = rawPdftotext.split("\f");
  const mdContent = fs.readFileSync(mdPath, "utf8");

  // Extract landmark phrases from the start of each pdftotext page (skipping headers)
  const landmarks = [];
  for (let p = 0; p < pageCount; p++) {
    const lines = (rawPages[p] || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 15 && !l.includes("Geometry & Topology") && !l.includes("ISSN"));
    landmarks.push(lines.slice(0, 3));
  }

  // If pageCount is small (<= 20), we can also divide by sections or interpolate
  // For standard 5-page window parallel extraction, [[PAGE N]] markers every page or block are needed.
  // Simple heuristic: search for landmarks in MD text and insert [[PAGE N]]
  let markedMd = mdContent;
  
  // Clean, deterministic page insertion based on known page-start snippets
  // If landmarks cannot be found, evenly distribute or split by page
  const mdLines = mdContent.split("\n");
  const markedLines = [];
  markedLines.push(`[[PAGE 1]]`);

  let currentPage = 1;
  for (let i = 0; i < mdLines.length; i++) {
    const line = mdLines[i];
    
    // Check if next page landmark appears
    if (currentPage < pageCount) {
      const nextLandmarks = landmarks[currentPage];
      const match = nextLandmarks.some((lm) => lm && line.includes(lm.slice(0, 20)));
      if (match) {
        currentPage += 1;
        markedLines.push(`\n[[PAGE ${currentPage}]]`);
      }
    }
    markedLines.push(line);
  }

  // Ensure all pages are marked if some landmarks were missed
  let finalContent = markedLines.join("\n");
  for (let p = 2; p <= pageCount; p++) {
    if (!finalContent.includes(`[[PAGE ${p}]]`)) {
      // Find a reasonable insertion point
      const fraction = (p - 1) / pageCount;
      const targetIdx = Math.floor(finalContent.length * fraction);
      const nextNewline = finalContent.indexOf("\n\n", targetIdx);
      if (nextNewline !== -1) {
        finalContent = finalContent.slice(0, nextNewline) + `\n\n[[PAGE ${p}]]\n\n` + finalContent.slice(nextNewline + 2);
      }
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, finalContent);
  console.log(`Saved marked Markdown (${pageCount} pages) to: ${outputPath}`);
}

const [pdfPath, mdPath, outputPath] = process.argv.slice(2);
if (!pdfPath || !mdPath || !outputPath) {
  console.error("Usage: node add-page-markers-to-mineru.mjs <pdfPath> <mdPath> <outputPath>");
  process.exit(1);
}
addPageMarkers(pdfPath, mdPath, outputPath);
