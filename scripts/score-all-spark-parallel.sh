#!/bin/zsh
set -euo pipefail
ROOT=/Users/chenyuwen/Desktop/Projects/CMath-math-map
CASES=(knot-hopf-rt hopf-degree-theorem 4-dim-skein-modules-handles-tangles cornered-skein-lasagna-theory kirby-2018-trisections yasui-2019-geometrically-simply-connected-4-manifolds)
# parallel with 6 workers — each xhigh ~60-90s, wall ~90s vs sequential ~420s
pids=()
for c in $CASES; do
  gold="$ROOT/benchmarks/paper-import/cases/$c/gold-project-view.json"
  cand="/tmp/cmath-spark-baseline-v17/$c.entry.json"
  out="/tmp/cmath-spark-baseline-v17/$c.spark.sol-entry-score.json"
  node "$ROOT/scripts/score-paper-entry-extraction-with-sol.mjs" "$gold" "$cand" "$out" --scorer=muse-spark-1.2-contributor > /tmp/spark-$c.log 2>&1 &
  pids+=($!)
  echo "started $c pid $!"
done
echo "waiting ${#pids} scorers..."
for pid in $pids; do wait $pid; echo "pid $pid done exit:$?"; done
echo "=== SUMMARY ==="
python3 <<'PY'
import json, glob
outs=sorted(glob.glob("/tmp/cmath-spark-baseline-v17/*.spark.sol-entry-score.json"))
tot=0
for p in outs:
  d=json.load(open(p))
  print(f"{d['caseId']:55s} {d['correctness']:2d}+{d['completeness']:2d}={d['solEntryScore']:2d} {d['verdict']:10s}")
  tot+=d['solEntryScore']
print(f"\nmean {tot/len(outs):.2f} total {tot}/{len(outs)*45}")
PY
