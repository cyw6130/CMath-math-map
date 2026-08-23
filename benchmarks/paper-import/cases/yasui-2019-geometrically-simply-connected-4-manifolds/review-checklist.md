# Mathematical review checklist

- [x] The main theorem statement matches the source paper.
- [x] Every source page and external dependency is checked.
- [x] Every proof inference has the correct direction.
- [x] Possible hallucinations and unsupported strengthening are recorded.
- [x] Two Sol audit passes are recorded in `audit-pass-1.md` and `audit-pass-2.md`.

## Reviewer packet

Review the source PDF and `/tmp/cmath-pdftext/yasui.txt` together. Check the hypotheses and logical separation of the two headline conclusions:

- Theorem 1.4 is the stable-cohomotopy Seiberg–Witten vanishing result; do not insert “no symplectic structure” into that theorem statement.
- The symplectic obstruction is a separate downstream theorem/claim (Theorem 1.9 and the orientation-specific chain).
- Check Lemma 2.6, Theorem 2.8, Theorem 2.3, and Theorem 2.4 in that order, including the doubled manifold, sphere self-intersection, `b_2^+ > 1`, orientation, and 2-handle-class hypotheses.
- Check that Lemma 3.1 supplies the 2-handle representatives needed to derive Theorems 1.4 and 1.9 for geometrically simply connected manifolds.
- Verify the exact external B0 statements for Bauer, Frøyshov, Taubes, and the Betti-parity result; do not silently strengthen them.

Record whether every premise is necessary, whether any premise is missing, and whether the parity convention is written consistently with the paper.
