# Paper-import benchmark protocol

The fixed benchmark supports two named subjects with reasoning disabled: `luna` (`luna-gateway / gpt-5.6-luna`) and `deepseek-flash` (`opencode-go / deepseek-v4-flash`). Luna remains the default when `--subject` is omitted. The official result is the `solScore` produced by `gpt-5.6-sol` from the fixed Gold and candidate JSON in an isolated scoring environment; deterministic graph metrics are supporting evidence rather than a second score. Every artifact and manifest records subject, provider, and model so routes are never conflated.

The six cases under `cases/` are fixed benchmark fixtures for importing a paper into a project view. Each standard answer was authored by `gpt-5.6-sol`, audited twice, and fixed as `accepted-gold`. A model export is evidence to inspect and never becomes mathematical gold automatically. Each case has a separate `review-status.json`, two audit records, and a `review-checklist.md`.
Kirby is a normal scoring and promotion case under fixed protocol `1.2` / Gold revision `v2`; its Gold directly maps the mathematical content of the four-page article and is not held out.

Status progression is intentionally coarse:

`structural-draft` → `semantic-reviewed` → `mathematically-reviewed` → `accepted-gold`

`accepted-gold` is a gated state. It requires a named human reviewer, review date, source-page and theorem evidence, dependency/proof-direction checks, and a checklist with `allPassed: true`.
