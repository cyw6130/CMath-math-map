# Knot–Hopf–RT — Benchmark Case README

**Case ID:** `knot-hopf-rt`
**Benchmark ID:** `benchmark:knot-hopf-rt:pdf-import-gold:v1` (objective profile `gold-v2`)
**Reference status:** `accepted-gold`
**Canonical path:** `benchmarks/paper-import/cases/knot-hopf-rt/`

## Paper

"Knot, Hopf Algebra and Quantum Invariants"
Chen Yuwen (2025)

## What this case benchmarks

Tests the model's ability to:
1. Identify the correct B0 boundary (4 classical boundary theorems: Lickorish–Wallace, Kirby calculus, Turaev ribbon functor, Turaev purification)
2. Reconstruct the RT invariant construction proof chain
3. Correctly classify ribbon category definitions as Facts
4. Verify Kirby move invariance uses the correct B0 premises

## Reference files

| File | Purpose |
|------|---------|
| `benchmark-spec.json` | Required objects, B0 invariants, closure expectations |
| `gold-project-view.json` | Fixed canonical standard answer (`accepted-gold`) |
| `review-status.json` | Current status and evidence |
| `review-checklist.md` | Human reviewer checklist |
| `source-evidence.md` | B0 citations and proof structure evidence |

## Legacy compatibility

This directory is the sole canonical authority; no compatibility fixture copy is maintained.
