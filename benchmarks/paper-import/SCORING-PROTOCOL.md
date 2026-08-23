# Math Map benchmark scoring protocol

## Decision

Use an auditable 100-point score evaluated by `gpt-5.6-sol`. The official score is computed by comparing candidate JSON with fixed Gold JSON under prompt `sol-score-prompt-v3` and schema `cmath.paper-import-sol-score/v3`.

Deterministically computed graph descriptors (`graph-metrics.json`) for Gold and candidate Project Views are provided as auditable evidence (`graphComparison`) to assist semantic comparison without introducing hard thresholds or mechanical penalty formulas.

The score has exactly three independent sections:

### 1. JSON 格式 (JSON format) — 10 points

- `jsonValidity` (4): JSON 和 Project View 可以解析，必要顶层字段存在。
- `referenceIntegrity` (6): Entry、B₀、mainTarget 和 inference 的 ID 引用有效，结构没有明显自相矛盾。
- `format.score = jsonValidity + referenceIntegrity` (max 10).

### 2. Entry 提取 (Entry extraction) — 45 points

- `correctness` (25): 提取的数学对象、定义、假设、命题/定理及其陈述正确；B₀ 与 mainTarget 的角色正确；没有明显伪造或错误合并。
- `completeness` (20): Gold 中对表达论文核心内容必要的 Entry 已被覆盖。无关细节不要求穷尽。
- `entries.score = correctness + completeness` (max 45).

### 3. Inference 提取 (Inference extraction) — 45 points

- `correctness` (25): premises 到 conclusion 的逻辑方向和数学作用正确，没有伪造、反向或不成立的关系。
- `completeness` (20): Gold 中表达论文主要证明与组织逻辑所需的 inference 已被覆盖。候选只保留少量局部关系、却遗漏论文主要逻辑时，应明显扣分。
- `inferences.score = correctness + completeness` (max 45).

### Aggregation and Verdict

- Direct sum: `solScore = format.score + entries.score + inferences.score` (0..100).
- Score brackets:
  - `mature`: 90+
  - `promising`: 85–89
  - `needs-revision`: 50–84
  - `invalid`: < 50
- Evidence and comparison fields:
  - `graphComparison` (`gold` and `candidate` deterministic graph descriptors)
  - `matchedEntries`, `missingEntries`, `incorrectEntries`
  - `matchedInferences`, `missingInferences`, `incorrectInferences`
  - `summary`, `verdict`

## Reviewer and Execution

The only official benchmark score is `solScore`, produced by `gpt-5.6-sol` through `scripts/score-paper-import-with-sol.mjs` using prompt template `sol-score-prompt-v3`. The official workflow does not run or report a deterministic machine score. `scripts/evaluate-benchmark.mjs` may be invoked manually for offline debugging, but its output is never a benchmark result and must not be copied into a manifest as `solScore`.

## JSON Gold-audit benchmark layer

For workflow iteration, every completed model artifact receives a `solScore`. This is a strict Gold+candidate-only comparison with no access to the original paper PDF, source evidence, audit records, benchmark spec, or conventions: Sol compares candidate entries and inferences solely against the frozen Gold JSON and deterministically computed graph metrics, with Gold serving as the complete authoritative compressed representation.

ID and wording differences are allowed; as long as mathematical objects, statements, and logical roles are equivalent, they are considered matched. Compact but mathematically equivalent representations can receive full points. Entry, inference, or graph metric counts are only used to provide structural evidence during semantic comparison and are never used as a mechanical scoring formula.

## Versioning

Every run records model, workflow version, prompt version (`sol-score-prompt-v3`), schema (`cmath.paper-import-sol-score/v3`), case source hash, gold revision, timestamp, raw artifact path, and completion status. A partial or rate-limited run is not scored as a completed run.
