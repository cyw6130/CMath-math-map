# Mathematical review checklist

- [x] The main theorem statement matches the source paper.
- [x] Every source page and external dependency is checked.
- [x] Every proof inference has the correct direction.
- [x] Possible hallucinations and unsupported strengthening are recorded.
- [x] Two Sol audit passes are recorded in `audit-pass-1.md` and `audit-pass-2.md`.

## Reviewer packet

Review the source PDF and `/tmp/cmath-pdftext/skein2.txt` together. Confirm the exact hypotheses, quotient relations, and grading in the following order:

- Lemma 3.7 uses the Ren–Willis input and Banyaga background; it is the paper's own filling-gluing isomorphism.
- Lemma 3.13 must be checked as the intermediate self-gluing evaluation isomorphism used by Theorem 3.14.
- Theorem 3.14 must be checked as the `HH_0` statement for the punctured/self-glued manifold.
- Theorem 3.15 must be checked for the precise `~_3` quotient and the passage from the punctured to the closed invariant.
- Corollary 3.19 must preserve the three bimodule tensor factors and the final `HH_0` operation.
- Lemma 4.5 is required before Theorem 4.7; verify that isotopy tracks give isomorphic cut objects.
- Theorem 4.7 is a 3-manifold/category gluing result, not a 4-manifold theorem.

Confirm that MWW, Ren–Willis, Banyaga, and Gay–Kirby remain external B0 inputs. Record any missing hypothesis, relation, or convention issue before signing.
