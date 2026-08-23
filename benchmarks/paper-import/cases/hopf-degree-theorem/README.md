# Hopf Degree Theorem — Benchmark Case README

**Case ID:** `hopf-degree-theorem`
**Benchmark ID:** `benchmark:hopf-degree-theorem:pdf-import-gold:v1` (objective profile `gold-v2`)
**Reference status:** `accepted-gold`
**Canonical path:** `benchmarks/paper-import/cases/hopf-degree-theorem/`

## Paper

"The Hopf Degree Theorem: Homotopy Groups and Vector Fields"
Cameron Krulewski, Jenny Walsh (2017), 13 pages.

## What this case benchmarks

Tests the model's ability to:
1. Identify the correct B0 boundary (7 external results from Guillemin & Pollack)
2. Reconstruct the 9-step proof backbone leading to the Hopf Degree Theorem
3. Reconstruct the 4-step vector field application (hairy ball)
4. Correctly classify Facts vs. Claims and avoid Facts in B0

## Reference files

| File | Purpose |
|------|---------|
| `benchmark-spec.json` | Required objects, B0 invariants, closure expectations |
| `gold-project-view.json` | Fixed canonical standard answer (`accepted-gold`) |
| `review-status.json` | Current status and evidence |
| `review-checklist.md` | Human reviewer checklist |
| `source-evidence.md` | B0 citations and proof structure evidence |

## Legacy compatibility

This directory is the sole canonical authority; no compatibility fixture copy is maintained. Tests consume this canonical path via the updated audit script.

## Scoring

Self-comparison yields near-100 format and semantic scores.
See `scripts/evaluate-benchmark.mjs --case hopf-degree-theorem`.
