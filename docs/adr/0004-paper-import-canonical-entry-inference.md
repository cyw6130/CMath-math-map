# Paper Import 的 Entry 与 Inference 采用 Canonical 语义

日期：2026-08-24 · 状态：Accepted

## 背景

Paper Import 的底层语义已经以 `CONTEXT.md` 为权威，将 Entry 建模为 Fact 与 Claim 的判别联合：Fact 使用 `entryClass: "fact"` 与 `factKind`，Claim 使用 `entryClass: "claim"` 与 `claimKind`。但 Frozen Workflow V4.1 使用的 Entry Module v1.31 模型提示仍要求旧 `type` 字段，历史 Benchmark JSON 也混有旧格式；既有 Inference Strategy v3.44 则没有在版本策略段中完整陈述自足 proof、Claim 循环与 B0 的 Canonical 边界。

这种双轨状态要求下游归一化层持续猜测旧字段含义，也使模型生成协议、Benchmark Gold 与地图消费契约无法共享同一套词汇和校验规则。

## 决定

1. **Entry Module v1.31 直接生成 Canonical Entry**：
   - Fact 输出 `entryClass: "fact"`，并且只带 `factKind: definition | algorithm | calculation`。
   - Claim 输出 `entryClass: "claim"`，并且只带 `claimKind: lemma | proposition | theorem`。
   - v1.31 的共同规则与 JSON 示例不再输出旧 `type`；历史版本与兼容读取边界不因本决定被重写。
2. **Inference Strategy v3.44 显式承载 Canonical Inference 语义**：
   - 正文自足证明允许 `premises=[]`，但 `argument` 必须记录完整数学论证；空前提 proof 不是 B0，也不是外部公理。
   - Claim 间的循环 proof 必须保留，用来表达等价或互推；若没有循环外的已建立入口，循环中的 Claim 在 Closure 中保持 `open`，不得以循环自证。
   - B0 只包含论文直接调用、属于外部来源、且未在正文证明的 Claim。外部 Claim 若被正文重新证明、正文提出但未证明的 Claim，以及所有 Fact 都不得进入 B0。
   - `organization` 继续只连接 Fact 到 Fact，本决定不进一步收紧其语义。
3. **版本策略文件与根部 fallback 保持同文案**：`src/paper-import/inference/strategies/v3.44.js` 是权威分档位置；`paper-import-client.js` 继续按 ADR-0001 保留等价回退，避免旧加载路径产生不同语义。
4. **Benchmark Gold 一次性迁移**：使用 `scripts/migrate-benchmark-entries.mjs` 和 Entry canonicalization 能力，将 `benchmarks/` 中 78 个相关 JSON 文件从旧 `type` 迁移到 `entryClass + factKind/claimKind`。迁移不改变 Entry 的数学内容、ID、来源或 Inference 结构。
5. **不升级 Workflow 标签**：本次是模块契约适配，不改变 Workflow 结构。Frozen Workflow V4.1 仍为 Entry v1.31 + Inference v4（runtime prompt `v3.45`）；本决定另行修正既有 Inference Strategy v3.44，但不将 v3.44 纳入 V4.1 的生产组合。

## 验证

- Entry v1.31 Canonical prompt 与 extract 路径：commit `51e15f1`，GitHub #24。
- Inference v3.44 Canonical 语义：commit `284038d`，GitHub #25。
- `tests/benchmark-evaluator.test.mjs`：28/28 通过；`hopf-degree-theorem`、`knot-hopf-rt`、`4-dim-skein-modules-handles-tangles`、`cornered-skein-lasagna-theory`、`yasui-2019-geometrically-simply-connected` 自比均为 100/100/100，GitHub #23。
- 全量 `node --test tests/*.test.mjs`：281/281 通过。

## 后果

- 正面：模型提示、Raw Entry Pool、Entry Artifact、Benchmark Gold 与 Map Integration 使用一致的 Fact/Claim 判别字段；B0 与 Closure 的解释可直接追溯到 `CONTEXT.md`。
- 正面：空前提 proof 和 Claim 循环不再依赖隐含约定，模型生成与测试都能区分“自足证明”“外部前提”和“未建立循环”。
- 代价：历史产物和旧 Entry Module 版本仍可能含 `type`，兼容读取与 canonicalization 边界暂时保留；不能把兼容输入重新当作新的输出协议。
- 约束：若未来改变 Fact/Claim kind、B0 或 Closure 语义，必须先修改上游能力契约与 `CONTEXT.md`，再新增或升级相应模块版本，不能只修改 Benchmark Gold 或单个 prompt。
