# Workflow Optimization Loop — Sol-only VNext

This replaces the historical Luna/Spark inference-only loop. The old loop used stale Entry `v1.7` paths, optimized one inference subscore, omitted generalization, and tolerated incomplete scoring. It no longer has authority.

## Frozen order

1. Audit canonical source assets and run optimization tests.
2. Prepare one experiment with exactly one changed stage: `Entry`, `W7.1`, `W8`, or `Inference`.
3. Run Quick on the five regression papers.
4. A surviving candidate runs Candidate on all five regression and four cross-domain generalization papers.
5. Only Final has promotion authority. Final reruns both suites with full-source assessment and the promotion gate.

Every generation role and both scorer roles are fixed to `codex-chatgpt-login / gpt-5.6-sol / medium`. A result that lacks this binding, omits a prepared case, changes multiple stages, or loses a suite identity cannot be completed.

## Commands

```bash
./autoresearch.sh audit
./autoresearch.sh plan quick
./autoresearch.sh prepare quick Inference <baseline-workflow-id> <candidate-module-id> <run.json>
./autoresearch.sh generate <case-id> <candidate.json>
./autoresearch.sh score <regression-case-id> <candidate.json> <score.json>
./autoresearch.sh complete <run.json> <case-results.json> <completed-run.json>
```

`generate` consumes frozen MinerU marked Markdown, verifies its digest, and executes the complete production semantic chain: Entry → consolidation → W7.1 → W8 → Inference → Closure. It invokes Codex CLI with the cached ChatGPT login; run `codex login status` (or the npm-exec equivalent) before an experiment.

Quick results are exploratory and cannot promote. Candidate and Final additionally require automatic source assessments for the generalization suite. No new manual Gold is introduced.

## Current suites

- Regression: five immutable historical papers from `source-manifest.json`.
- Generalization v1: one versioned source each from algebra, analysis, number theory, and combinatorics.

Case changes require a new generalization-suite version; released `v1` is immutable.
