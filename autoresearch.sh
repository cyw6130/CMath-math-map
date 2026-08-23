#!/usr/bin/env bash
set -euo pipefail
# Shim for pi-autoresearch: run entry→inference→score on the 5 active cases.
# Usage:
#   ./autoresearch.sh entry <caseId>            # produce entry artifact via frozen v1.7
#   ./autoresearch.sh inference <caseId> <version>  # run inference from entry artifact
#   ./autoresearch.sh score <caseId> <candidatePath>
#   ./autoresearch.sh sweep <version>           # inference+score for all 5
ROOT="$(cd "$(dirname "$0")" && pwd)"
ENTRY_DIR="$ROOT/benchmarks/model-outputs/entry-module"
OUT_DIR="$ROOT/benchmarks/model-outputs/autoresearch"

case "${1:-}" in
  entry)
    CASE="${2:?caseId}"; VER="${3:-paper-entry-parallel-extraction-v1.7}"
    PDF="$(python3 -c "import json; d=json.load(open('$ROOT/benchmarks/paper-import/fixed-test-workflow.json')); print(next(c['sourcePdf'] for c in d['cases'] if c['caseId']=='$CASE'))")"
    POOL="$ENTRY_DIR/${CASE}-v17.raw-pool.json"
    ART="$ENTRY_DIR/${CASE}-v17.entry.json"
    echo "[entry] $CASE -> $POOL"
    node scripts/run-paper-entry-raw-extraction.mjs "$PDF" "$POOL" gpt-5.6-luna off-compact "$VER" --provider=luna
    echo "[entry] consolidate $POOL -> $ART"
    node scripts/run-paper-entry-consolidation.mjs "$POOL" "$ART"
    python3 -c "import json; d=json.load(open('$ART')); print('entries', len(d['entries']))"
    ;;
  inference)
    CASE="${2:?caseId}"; VER="${3:?workflowVersion}"
    ART="$ENTRY_DIR/${CASE}-v17.entry.json"
    [ -f "$ART" ] || { echo "missing $ART (run entry first)" >&2; exit 2; }
    OUT="$OUT_DIR/${CASE}-${VER}.json"
    mkdir -p "$OUT_DIR"
    echo "[inference] $CASE $VER"
    node scripts/run-paper-inference-from-entry-artifact.mjs "$ART" "$OUT" gpt-5.6-luna off-compact "$VER"
    echo "wrote $OUT"
    ;;
  score)
    CASE="${2:?caseId}"; CAND="${3:?candidatePath}"
    node scripts/score-paper-import-with-sol.mjs --case "$CASE" --candidate "$CAND" --gold-revision v2
    ;;
  sweep)
    VER="${2:?workflowVersion}"
    for CASE in hopf-degree-theorem knot-hopf-rt 4-dim-skein-modules-handles-tangles cornered-skein-lasagna-theory yasui-2019-geometrically-simply-connected-4-manifolds; do
      "$0" inference "$CASE" "$VER"
      CAND="$OUT_DIR/${CASE}-${VER}.json"
      echo "[score] $CASE"
      node scripts/score-paper-import-with-sol.mjs --case "$CASE" --candidate "$CAND" --gold-revision v2 || true
      echo "---"
    done
    python3 - "$OUT_DIR" "$VER" << 'PY'
import json, glob, pathlib
import sys
out_dir, ver = sys.argv[1], sys.argv[2]
# collect inferences.score from just-scored files (best effort via glob)
import os
scores={}
for p in glob.glob(os.path.join(out_dir, f"*-{ver}-sol-score-v3.json")):
    try:
        d=json.load(open(p)); scores[d["caseId"]]=d["inferences"]["score"]
    except: pass
# fallback: look under candidate-adjacent
for p in glob.glob(os.path.join(out_dir, f"*-{ver}.json")):
    s=p.replace(".json","-sol-score-v3.json")
    if os.path.exists(s):
        try:
            d=json.load(open(s)); scores[d["caseId"]]=d["inferences"]["score"]
        except: pass
print(scores)
if len(scores)==5:
    print("mean inferences", sum(scores.values())/5)
PY
    ;;
  *)
    echo "usage: $0 {entry|inference|score|sweep} ..." >&2; exit 1;;
esac
