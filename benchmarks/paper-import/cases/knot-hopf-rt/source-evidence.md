# Source Evidence — Knot–Hopf–RT

**Case:** `knot-hopf-rt`
**Paper:** "Knot, Hopf Algebra and Quantum Invariants"
**Authors:** Chen Yuwen (2025)
**Source:** `paper.pdf` / `paper_v2.tex` / `main.md`

## Source boundary (B0) evidence

| ID | External source | Paper reference |
|----|----------------|-----------------|
| `rt:entry:lickorish-wallace` | Lickorish (1962) / Wallace (1960) | §2, Surgery 存在性 |
| `rt:entry:kirby-calculus` | Kirby (1978) | §2, Kirby 等价 |
| `rt:entry:turaev-ribbon-graph-functor` | Turaev (1992) | §3, Ribbon 范畴函子 |
| `rt:entry:turaev-purification-theorem` | Turaev (1992) | §3, 净化定理 |

## Proof structure evidence

The paper constructs the RT invariant through:
1. Ribbon category axioms (braiding, twist, duality)
2. Ribbon graph functor (Turaev, B0)
3. Kirby move invariance (uses Kirby calculus B0)
4. Lickorish–Wallace (B0) for surgery presentation existence
5. RT invariant well-defined

## Status rationale

**accepted-gold / gold-v2:** Structural tests and two Sol audit passes confirm the RT construction, B0 boundary, proof backbone, and source attribution. The objective profile fixes the closed oriented 3-manifold/framed-link setting, finite-rank left-module convention, Turaev universal-twist convention, modular nondegeneracy assumptions, and the exact τ normalization boundary. No external theorem is misrepresented as local.
