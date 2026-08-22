# Autoresearch — Inference 38/45 (kirby excluded)

## Objective
Push `inferences.score` (sol-score-prompt-v3: 45 = correctness 25 + completeness 20, `benchmarks/paper-import/sol-score-prompt-v3.md:1`) to **≥38 mean** over 5 active cases in `benchmarks/paper-import/fixed-test-workflow.json:36` (hopf-degree-theorem, knot-hopf-rt, 4-dim-skein-modules-handles-tangles, cornered-skein-lasagna-theory, yasui). `kirby-2018-trisections` is retired (`fixed-test-workflow.json:43`) and excluded from mean.

Scorer: `scripts/score-paper-import-with-sol.mjs:17` (`SCORER_MODEL=gpt-5.6-sol`, `PROMPT_VERSION=sol-score-prompt-v3`, isolated Gold+candidate+graph-metrics).

## Architecture
- **Entry** frozen: `benchmarks/paper-import/entry-module/frozen-entry-module.json:4` → `paper-entry-parallel-extraction-v1.7` (det. consolidation `paper-entry-consolidation-v1.js:1`, artifact `paper-entry-artifact-v1.js:15` SCHEMA `cmath.paper-entry-artifact/v1`). Do NOT modify entry.
- **Inference** iterated only: `scripts/run-paper-inference-from-entry-artifact.mjs:1` → `paper-import-client.js:273` assemblyPrompt. Variants in `benchmarks/paper-import/runner-config.json:42`: `v3.26-inference-v3` (current best), `v3.26-inference-v5-repair-coverage`, `v6-repair-chain`, `v7-repair-queue`, `v3.41`. Entry→Inference isolation via `paper-entry-artifact-v1.js:171 validatePaperEntryArtifact` + `paper-import-modules-v3.26.js:27` modular wrapper.

## Baseline (fixed-1.0 v3.26)
From `benchmarks/model-outputs/fixed-1.0/*-sol-score-v2.json:1`:
- hopf 40, 4-dim 44, cornered 41, yasui 42, knot 21 → mean **37.6**
- Bottleneck: `knot-hopf-rt` (21). Best single-case variant `knot-hopf-rt-v3.26-inference-v3-20260819T-retest-sol-score-v3.json:1` = **32** → mean **39.8** if adopted.

## Loop Protocol (pi-autoresearch shim)
`init_experiment`/`run_experiment`/`log_experiment` not installed; shim via this doc + `autoresearch.sh` + `autoresearch.jsonl`.
Each iteration:
1. Pick one `workflowVersion` delta (only repair prompt/context in `paper-import-client.js:4020 focusedAssemblyRepairPrompt`).
2. Run `scripts/run-paper-inference-from-entry-artifact.mjs <entryArtifact> <out> gpt-5.6-luna off-compact <version>` (luna subject per `fixed-test-workflow.json:7`).
3. Score `scripts/score-paper-import-with-sol.mjs --case <id> --candidate <out> --gold-revision v2`.
4. Log to `autoresearch.jsonl`, keep if mean improves, discard otherwise.

## Generation order
- A: Complete 5 entry artifacts (hopf/knot exist, need 4-dim/cornered/yasui via `scripts/run-paper-entry-raw-extraction.mjs:14` v1.7 + `scripts/run-paper-entry-consolidation.mjs:1`).
- B: Iterate inference on knot (fast feedback), then sweep 5-case mean.

## History
- 2026-08-20 baseline recorded.

## Entry Campaign Log (2026-08-21/22, Spark judge era)

Scoring protocol change (user directive): **single-run scoring only; no more averaging**. Judge: muse-spark-1.2 (opencode-go) for iteration; gpt-5.6-sol reserved for final promotion.

### Baselines
- v1.31 + deterministic consolidation + Gold v3/v4 (source-faithful): 5-case mean **34.1** single-run band (Yasui 37.3, Hopf 32.7, Skein1 33.3, Cornered 34.0, RT 33.0 — mixed single/median runs). Sol-equivalent ~36.2.
- V4 end-to-end reference: 83.8 mean (Entry v1.14 + Inference v3.45, Sol judge).

### Experiments
| Version | Variable | Result | Verdict |
|---|---|---|---|
| W7 | +Spark verify-and-patch stage | RT 27.0→28.7 (+1.7), 2 entries added | positive, iterate |
| W7.1 | broaden substantive-property threshold | RT 29.3 (+2.3), 4 entries added incl. handle-slide property | best of line, below promotion bar |
| W7.2 | explicit Hopf structural correspondences | RT 28.3 (−1.0 vs W7.1) | discard |
| W7 full sweep (W7.1) | all 5 cases | Yasui 37.3 / Hopf 32.7 / Skein1 33.3 / Cornered 34.0 / RT 33.0 → mean 34.1 | kept as V4.1 Entry layer |
| v1.31.1 | domain-generic rule (remove topology examples) | Skein1 −4.6, RT −3.3 (B0 external theorems missed) | **discard & rollback to v1.31** |

### Lessons
1. Pure-abstract rules lose the operational anchor for "which external theorem deserves standalone entry" → B0 leakage. Domain-specific examples anchor behavior but overfit.
2. Prompt-level iteration is saturated at v1.31; further gains must come from workflow stages with source-text access (verify layer can be domain-aware safely since it sees the source).
3. Gold source-faithful audit (v1→v4) contributed ~+1.0–1.4 mean at zero model cost.

### Next (W8)
Verify-layer B0-targeted backfill: extend scripts/verify-and-patch-with-spark.mjs with a B0-focused pass that scans source text for cited external results ([n]/author-year/due-to) missing from the consolidated artifact and adds them as standalone external entries. Probe on Skein1+RT.
