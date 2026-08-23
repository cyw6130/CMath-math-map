# Objective standard profile — gold-v2

This case has an objective standard relative to the declared Turaev-style convention; equivalent formulations are accepted only when they preserve these assumptions and normalization choices.

## Fixed ambient conventions

- All 3-manifolds are closed, connected, oriented; links are framed links in `S^3`.
- `Rep_fd(A)` means finite-rank left `A`-modules over the stated ground ring `K`; duality uses the selected antipode convention.
- The ribbon Hopf convention is Turaev-style: `v` is central and invertible, `θ_V=ρ_V(v)`, and `tr_q(f)=Tr_V(ρ_V(uv)∘f)`.
- The modular stage assumes finite simple colors, domination, dual closure, and invertible Hopf-link matrix.
- The displayed `τ_{V,D}` formula is the selected convention; any global rescaling must be declared rather than silently treated as identical.

## Semantic invariants

- Ribbon Hopf data induces a ribbon structure on `Rep_fd(A)`.
- Kirby-color summation is handle-slide invariant.
- Signature/rank normalization removes `±1` Kirby-move dependence.
- The resulting quantity depends only on the orientation-preserving homeomorphism class.
