# Review Checklist — Hopf Degree Theorem

## Reviewer packet

**Case:** `hopf-degree-theorem`
**Paper:** "The Hopf Degree Theorem: Homotopy Groups and Vector Fields" (Cameron Krulewski & Jenny Walsh, 2017)
**Canonical status:** `accepted-gold`

### Structural checks (✅ = verified by test suite)
- [x] All 6 Facts present with correct factKind and sourcePath
- [x] All 7 B0 Claims present with sourceReference and sourcePath
- [x] All 16 derived Claims present with sourcePath
- [x] All 16 proof inferences present; conclusion/premises match spec
- [x] B0 set exactly matches boundaryB0Invariants.exactB0ClaimIds
- [x] Proof DAG is acyclic (tested)
- [x] Claim closure: 23/23 claims established, 0 open
- [x] mainTargetEntryId points to paper:thm:hopf (Claim, not B0)
- [x] projectTitle field present
- [x] No alpha legacy fields

### Two-pass audit items (gold-v2 objective profile)

- [x] Ambient category, orientation, regular-value convention, and free/based homotopy distinction are explicit in `objective-conventions.md` and `benchmark-spec.json`.
- [x] Theorem statements faithfully represent paper wording
- [x] B0 sourceReference citations are accurate (GP 2010 §§)
- [x] Proof dependency edges reflect actual proof structure
- [x] No external theorem misrepresented as locally proved
- [x] Closure algorithm output matches paper's logical flow

**Accepted-gold basis:** authored and audited twice by `gpt-5.6-sol`; user accepted this objective standard on 2026-08-16.
