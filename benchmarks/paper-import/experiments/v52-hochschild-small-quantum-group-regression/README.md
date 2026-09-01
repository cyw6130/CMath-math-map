# Hochschild cohomology of the small quantum group — diagnostic regression

**Case ID:** `hochschild-small-quantum-group`
**Status:** `diagnostic-regression`
**Scoring eligible:** no — a curated Gold has not been authored or audited

## Paper

Nicolas Hemelsoet and Rik Voorhaar, “On certain Hochschild cohomology groups for the small quantum group,” arXiv:2104.05113, 25 pages.

Source: <https://arxiv.org/abs/2104.05113>

## Why this case exists

The local V5.2.1 Paper Import run produced a contract-valid map whose mathematical closure is visibly incomplete:

- 53 Entries, including 48 Claims;
- 25 Inferences;
- 35 Open Claims (72.9%);
- 15 isolated Entries (28.3%).

Comparison with the paper shows that only Conjectures 2.7–2.10 should remain Open. Ten source-supported results were emitted without the B0, proof, or calculation provenance needed to establish them. Several are upstream hubs, so the omissions propagate to 21 otherwise supported downstream Claims.

This case is intentionally kept outside `cases/` and the fixed scoring set until a two-pass audited Gold exists. It is a red-capable regression packet for developing the next workflow, not scoring authority.

## Files

| File | Purpose |
|---|---|
| `baseline-import-result.json` | Exact local V5.2.1 failure artifact |
| `benchmark-spec.json` | Machine-readable baseline, legitimate Open set, and source-supported blocker classification |
| `diagnosis.md` | Paper comparison and workflow root-cause analysis |
| `review-checklist.md` | Promotion checklist for a future curated Gold |
| `evaluate-baseline.mjs` | Gold-independent reproduction of the baseline and counterfactual Closure diagnostic |

Run the diagnostic with:

```bash
node benchmarks/paper-import/experiments/v52-hochschild-small-quantum-group-regression/evaluate-baseline.mjs
```

## Current acceptance target

A future candidate should:

1. preserve Conjectures 2.7–2.10 as Open;
2. leave no other Claim Open unless a source review explicitly justifies it;
3. distinguish external B0, local proof, and algorithmic calculation provenance;
4. report and source-review unexplained isolated Entries;
5. identify and close the paper's main result branches rather than validating schema alone.
