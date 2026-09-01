# Failure diagnosis

## Observed failure

The V5.2.1 run is structurally legal and renders successfully, but its mathematical state is not source-complete. It contains 35 Open Claims out of 48 and 15 isolated Entries out of 53.

The defect is not in Closure calculation. Closure correctly propagates unavailable premises. The source comparison shows that the graph omitted the provenance required to establish ten results; the resulting upstream gaps then keep 21 additional Claims Open.

## Paper-level diagnosis

Four Open Claims are correct: `C08-conj-DC`, `C09-conj-DC-W`, `C10-conj-sl-inv`, and `C11-conj-dimdiv` correspond to Conjectures 2.7–2.10.

The remaining root gaps are source-supported results:

| Baseline Claim | Source status | Missing map representation |
|---|---|---|
| `C06-eq-decomp` | Equation (1), attributed to LQ16/LQ17 | B0 or an equivalent cited established result |
| `C14-cor-BGGop` | Corollary 2.13, derived immediately before its statement | proof Inference |
| `C18-cor-wedgepsi` | Corollary 2.17 from exterior powers of Lemma 2.16 | proof Inference |
| `C20-lem-pstruct` | Lemma 2.19 with an explicit construction proof | proof Inference |
| `C22-rem-split` | Remark 2.21 from an equivariant retract and split exact sequence | proof or equivalent established representation |
| `C23-lem-rootweight` | Lemma 3.1 with an explicit inequality/dot-action proof | proof Inference |
| `C46-cor-subalg` | Corollary 6.3 from the sl2 action and Poisson degree | proof Inference |
| `C48-prop-Pn136` | Proposition 6.5 obtained by the paper's computer algorithm | calculation provenance |
| `C49-lem-Symwedge` | Lemma 6.6 proved by the Littlewood–Richardson rule | proof Inference |
| `C51-prop-P3P4` | Proposition 6.8 obtained by algorithm and sl2 symmetry | calculation provenance |

A counterfactual Closure calculation that makes only these ten source-supported roots available establishes 44 of 48 Claims. The only remaining Open Claims are the four genuine conjectures.

## Why this paper amplified the weakness

This paper combines several epistemic modes in one 25-page source:

- externally cited theorems and formulas;
- locally proved lemmas and propositions;
- short “it follows” corollaries;
- algorithmic tables and representation calculations;
- genuine conjectures;
- several result branches rather than one dominant theorem chain.

The generated graph is also larger than the current fixed Gold cases: 53 Entries and 25 Inferences. Missing a local edge in a single-chain paper may affect one result; here `C20`, `C23`, and `C06` are shared upstream hubs and respectively block 13, 11, and 10 downstream Claims, with overlap.

## Workflow-level root causes

### 1. Contract validity is not source-complete closure

`validateMap()` accepts any state that satisfies strict graph semantics. A legal Open Claim is not a validation error, so an Open ratio of 72.9% cannot stop the production result.

### 2. Review receives a conflicting signal

The repair prompt correctly forbids changing objects merely to alter a derived state. That prevents fabricated proofs, but it also tells the reviewer that `open` is not a repair target. The missing distinction is:

> Never fabricate a proof to close an Open Claim; nevertheless, every non-conjectural Open Claim must be used as a source-review queue.

### 3. One review call owns too many concerns

The second and final model call must review all Entries, all Inferences, B0, source fidelity, mathematical semantics, and LaTeX. In this run it repaired 31 deterministic title-format findings and returned no semantic finding for the missing provenance. There is no later closure-focused pass.

### 4. Main proof-chain review is not enforceable

The strict V5 state has only `entries`, `inferences`, `negationPairs`, and `b0ClaimEntryIds`. Production currently reports `mainTargetIdentified: false` and `mainProofChainComplete: null`, so the prompt's instruction to inspect the main proof chain has no corresponding acceptance datum.

### 5. Benchmark coverage differs from this failure mode

Many automated Tests verify prompt identity, transport stages, patch legality, adapters, and known Gold fixtures. They prove that the workflow runs as designed; they do not reread an unseen paper and prove that every source-supported result has provenance.

The fixed Gold cases contain 14–37 Entries and 6–19 Inferences. This case adds a larger, multi-branch computational representation-theory paper whose main risk is not Entry omission but provenance omission and cascading Closure failure.

V5.2's predeployment evidence already documented that only 2 of 10 cases were source-clean. It was released as an explicitly authorized exception, not as a Benchmark Winner. This regression makes that known content risk concrete and machine-checkable.

## Optimization targets

Future workflow experiments should be evaluated against the following behavior, without requiring the candidate to reuse baseline IDs:

1. classify explicit conjectures before using Open state as a diagnostic;
2. source-review every other Open Claim;
3. distinguish `external-b0`, `local-proof`, and `algorithmic-calculation` provenance;
4. compute Closure and graph metrics before accepting the final result;
5. require a source-grounded disposition for each unexplained isolated Entry;
6. review result branches or strongly connected proof regions separately when a single main target is inadequate;
7. keep formatting repair from consuming the only semantic review opportunity.

## Non-conclusions

- A published paper may legitimately contain conjectures; “published” does not imply zero Open Claims.
- Isolated definitions or background results are not automatically defects.
- The target is source-faithful closure, not minimizing Open or isolated counts by inventing edges.
