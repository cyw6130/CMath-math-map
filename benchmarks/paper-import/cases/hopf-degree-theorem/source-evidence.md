# Source Evidence — Hopf Degree Theorem

**Case:** `hopf-degree-theorem`
**Paper:** "The Hopf Degree Theorem: Homotopy Groups and Vector Fields"
**Authors:** Cameron Krulewski, Jenny Walsh (2017)
**Source PDF:** `hopf map.pdf` (13 pages)

## Source boundary (B0) evidence

| ID | External source | Paper reference |
|----|----------------|-----------------|
| `paper:b0:isotopy` | Guillemin & Pollack, §1 | p.2 direct cite |
| `paper:b0:linear-isotopy` | Guillemin & Pollack, §1 | p.4 direct cite |
| `paper:b0:sard` | Guillemin & Pollack, §1 | p.6 direct cite |
| `paper:b0:transversality-extension` | Guillemin & Pollack, §3 | p.8 direct cite |
| `paper:b0:transversality-homotopy` | Guillemin & Pollack, §4 | p.10 direct cite |
| `paper:b0:epsilon-nbhd` | Guillemin & Pollack, §2 | p.7 direct cite |
| `paper:b0:poincare-hopf` | Guillemin & Pollack, §4 | p.10 direct cite |

## Proof structure evidence

The paper proves the Hopf Degree Theorem via a 9-step backbone:
degree definition → winding sum → remove-origin → degree-zero-null → extend-rk1 → extension theorem → Hopf theorem.

The vector field application (hairy ball) uses a 4-step backbone:
finite-zeros → localize → vf-euler → hairy-ball.

## Status rationale

**accepted-gold / gold-v2:** The canonical test suite (44 tests) and two Sol audit passes validate structural and mathematical integrity. The objective profile fixes the degree ambient category, regular-value independence, the free/based homotopy distinction, and the compact boundaryless hypothesis for the vector-field application. All B0 citations trace to Guillemin & Pollack (2010); no external theorem is misrepresented as locally proved.
