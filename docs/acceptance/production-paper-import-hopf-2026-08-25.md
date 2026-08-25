# Production Paper Import Hopf acceptance — 2026-08-25

Status: infrastructure and structural acceptance passed; laboratory-quality parity remains open.

## Frozen production identity

- Contract: `production-paper-import/v1`
- MinerU input: `cmath.paper-import.mineru/v1`
- Entry extraction: `paper-entry-parallel-extraction-v1.31`
- Consolidation: `paper-entry-consolidation-v1`
- Verification: `w7.1`
- B0 backfill: `w8`
- Inference: `v3.45`
- Project View: `cmath.project-view-model/v0.1`
- Runtime label: `V4.1-production-reproduction`

## Deployment and real-input evidence

- Cloudflare Worker: `cmath-mineru-gateway`
- Public gateway: `https://cmath-mineru-gateway.cmath-math-map.workers.dev/api/mineru`
- Deployment version used for acceptance: `11f7214d-a95a-4a97-93e1-941a3fab7b75`
- The MinerU token was supplied from a temporary runtime pipe to a Worker Secret. It was not written to the repository, build artifacts, acceptance output, or application logs.
- Input: local 2.9 MB Hopf PDF, 13 pages.
- Real MinerU upload, polling, ZIP download and marked-Markdown conversion passed.
- The marked Markdown contained 13 consecutive page anchors, from `[[PAGE 1]]` through `[[PAGE 13]]`.
- A real end-to-end run through the single public production entry point completed with the same `deepseek-chat` model for Entry, W7.1, W8 and Inference.
- Result summary: valid Project View schema, 39 entries, 14 inferences, existing main target, 14 open Claims.
- Full automated suite: 305 tests, 304 passed, 1 opt-in live MinerU test skipped by default, 0 failed. The opt-in live MinerU test passed separately.

No token, signed upload/download URL, PDF text, marked Markdown, or generated Project View body is stored in this record.

## Parity finding

The transport and runtime reproduction are working, but the model-quality target is not yet met:

- Laboratory Hopf map: 41 entries, 22 inferences, 0 open Claims.
- Current production acceptance with `deepseek-chat`: 39 entries, 14 inferences, 14 open Claims.
- Previously downloaded website result using DeepSeek V4 Flash: 48 entries, 14 inferences, 2 open Claims.

This evidence does not justify rewriting the workflow. The remaining work is to reproduce the laboratory model/provider call configuration (or demonstrate an equivalent website-selectable model) and rerun the same frozen workflow. Ticket 32 must remain open until that parity decision is resolved.
