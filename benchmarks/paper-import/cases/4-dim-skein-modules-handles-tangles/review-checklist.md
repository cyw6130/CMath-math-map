# Mathematical review checklist

- [x] The main theorem statement matches the source paper.
- [x] Every source page and external dependency is checked.
- [x] Every proof inference has the correct direction.
- [x] Possible hallucinations and unsupported strengthening are recorded.
- [x] Two Sol audit passes are recorded in `audit-pass-1.md` and `audit-pass-2.md`.

## Reviewer packet

Review the source PDF and `/tmp/cmath-pdftext/skein1.txt` together. Confirm each statement against the cited page, then check that B0 contains only externally adopted results. In particular:

- Confirm that MWW evaluation, Khovanov tangle functoriality, and Ren–Willis surjectivity are external inputs, while Lemmas 3.6/3.9 and Theorem 4.1 are attributed to this paper.
- Confirm that Examples 5.1–5.3 are the paper's handle-attachment formulas, not external theorems.
- Check the direction of every proof edge: definitions/B0 → Lemma 3.6 → Lemma 3.9 or Theorem 4.1 → handle examples.
- Check orientation/sign conventions in the bimodule tensor product and the 1-, 2-, and 3-handle formulas; record any convention-dependent wording change.
- Check that the main target is Theorem 4.1 and that no introduction-only claim is silently promoted to a local proof.

The reviewer must record name, date, source pages, dependency decision, proof-direction decision, and any rejected strengthening in `review-status.json`.
