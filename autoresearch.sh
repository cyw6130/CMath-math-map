#!/usr/bin/env bash
set -euo pipefail

# Sol-only optimization control surface. Historical Luna/Spark sweep commands
# were removed because they bypassed suite identities and the VNext gate.
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

case "${1:-}" in
  audit)
    node scripts/freeze-generalization-source.mjs audit
    npm run test:optimization
    ;;
  plan)
    node scripts/workflow-optimization.mjs plan --tier "${2:-quick}"
    ;;
  prepare)
    TIER="${2:?tier}"; STAGE="${3:?changedStage}"; BASELINE="${4:?baselineWorkflowIdentity}"; CANDIDATE="${5:?candidateModuleIdentity}"; OUTPUT="${6:?outputPath}"
    node scripts/workflow-optimization.mjs prepare --tier "$TIER" --changed-stage "$STAGE" --baseline "$BASELINE" --candidate "$CANDIDATE" --output "$OUTPUT"
    ;;
  generate)
    CASE="${2:?caseId}"; OUTPUT="${3:?outputPath}"
    node scripts/run-sol-paper-import-source.mjs --case "$CASE" --output "$OUTPUT"
    ;;
  score)
    CASE="${2:?caseId}"; CANDIDATE="${3:?candidatePath}"; OUTPUT="${4:?outputPath}"
    node scripts/score-paper-import-with-sol.mjs --case "$CASE" --candidate "$CANDIDATE" --output "$OUTPUT" --gold-revision v2 --scorer gpt-5.6-sol --codex-bin scripts/codex-chatgpt-cli.sh
    ;;
  complete)
    RUN="${2:?preparedRun}"; RESULTS="${3:?caseResults}"; OUTPUT="${4:?outputPath}"
    node scripts/workflow-optimization.mjs complete --run "$RUN" --results "$RESULTS" --output "$OUTPUT"
    ;;
  *)
    echo "usage: $0 {audit|plan|prepare|generate|score|complete} ..." >&2
    exit 1
    ;;
esac
