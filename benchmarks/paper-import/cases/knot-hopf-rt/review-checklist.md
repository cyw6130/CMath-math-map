# Review Checklist — Knot–Hopf–RT

## Reviewer packet

**Case:** `knot-hopf-rt`
**Paper:** "Knot, Hopf Algebra and Quantum Invariants" (Chen Yuwen, 2025)
**Canonical status:** `accepted-gold`

### Structural checks (✅ = verified by test suite)
- [x] All Facts present with correct factKind and sourcePath
- [x] All 4 B0 Claims present (Lickorish–Wallace, Kirby calculus, Turaev ribbon functor, Turaev purification) with sourceReference
- [x] All derived Claims present
- [x] Proof inferences present; conclusion/premises match spec
- [x] B0 set exactly matches boundaryB0Invariants.exactB0ClaimIds
- [x] Proof DAG is acyclic
- [x] mainTargetEntryId points to rt:entry:rt-invariant (Claim, not B0)
- [x] projectTitle field present
- [x] No alpha legacy fields

### Two-pass audit items (gold-v2 objective profile)

- [x] 3-manifold/link setting, module side, Turaev convention, modular assumptions, and normalization boundary are explicit in `objective-conventions.md` and `benchmark-spec.json`.
- [x] RT invariant construction faithfully represents paper's ribbon category argument
- [x] B0 sourceReference citations are accurate
- [x] Proof dependency edges reflect actual proof structure
- [x] Kirby move invariance proof chain is correct
- [x] No external theorem misrepresented as locally proved

**Accepted-gold basis:** authored and audited twice by `gpt-5.6-sol`; user accepted this objective standard on 2026-08-16.
