# DeepSeek V4 Flash historical calibration v1

This calibration applies the fixed 40-point structural and 60-point semantic rubric to the three completed historical `deepseek-v4-flash` artifacts that map unambiguously to canonical cases. It is not a substitute for the pending fresh six-case run.

| Case | Format / 40 | Semantic / 60 | Total / 100 |
|---|---:|---:|---:|
| Hopf degree theorem | 38 | 47 | 85 |
| 4D skein modules | 38 | 30 | 68 |
| Cornered skein lasagna | 38 | 36 | 74 |

The mean is 75.7, the minimum is 68, and the observed range is 17 points. This is enough separation to distinguish a strong proof map from maps with a wrong main target or a missing B0 boundary.

## Calibration findings

- Hopf is strongest: the main theorem and most of the proof spine are correct, but several external prerequisites and exact hypotheses are absent.
- 4D skein receives the lowest score because it promotes the 1-handle formula over the paper's gluing-isomorphism target and misses the four gold B0 dependencies.
- Cornered skein captures many objects and gluing results, but completely omits B0 and chooses the trisection invariant as the main target.
- Exact title or entry-ID matching is too brittle for official semantics. Equivalent mathematical formulations must be accepted by the Sol review.
- A single holistic score is too hard to reproduce. The six semantic dimensions expose why two superficially rich maps differ.

The machine-readable item-level scores and limitations are in `deepseek-v4-flash-historical-v1.json`.
