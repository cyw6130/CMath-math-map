# V5.1 的 V3 数学语义与档案合同分开采用

日期：2026-08-31 · 状态：Accepted

## 背景

`math-graph-semantics-v3`、`entry-model-v1`、`inference-model-v1` 与 `paper-import-workflow-v2` 被同步进同一份能力清单。既有采用声明没有记录使用作用域，因此同批分发容易被误读为当前 V5.1 的同一组生产语义依赖。

这些合同并不等价：Math State v3 把 `calculation` 定义为 Fact，Inference 只允许 `proof | organization`；两个 v1 档案合同仍把 `calculation` 定义为 Claim，并保留 `calculation` Inference。当前默认 V5.1 直接以 `math-graph-semantics-v3` 校验最终 Math State，并不调用两个 v1 档案合同。

## 决定

1. `math-graph-semantics-v3` 是当前 V5.1 严格数学状态的唯一生产语义权威。
2. `entry-model-v1`、`inference-model-v1` 与 `paper-import-workflow-v2` 继续作为质量系统和历史兼容路径的已采用能力，但不得表述为 V5.1 的生产语义依赖。
3. `capabilities/adoption.json` 的每项采用必须声明 `usageScopes`，取值只允许 `production | quality | compatibility`。
4. Tests 在同步能力的公开 Interface 上验证作用域：V3 必须属于生产作用域，三个旧合同只能属于质量与兼容作用域。
5. 不直接修改同步进入本仓库的 v1 能力副本。若产品需要生命周期丰富的 Entry/Inference 档案，必须在能力权威仓发布与 V3 对齐的新主版本，并提供显式 Adapter 将档案投影为严格 Math State；不能原地改变 v1 合同。

## 后果

- 能力分发、质量依赖、兼容依赖和生产采用不再混称。
- 同一次能力同步不再构成语义兼容证据；测试会阻止旧合同重新进入 V5.1 生产作用域。
- v1 合同及依赖它们的 Benchmark、兼容流程保持可运行。
- 新档案模型与 Adapter 是后续版本化迁移，不阻塞当前 V5.1，也不能绕过能力权威仓在消费者副本中实现。

## 实施状态

- 能力权威仓已发布 `entry-model-v2`、`inference-model-v2` 与 `archive-math-state-adapter-v1`；本项目通过正式同步资产采用，不修改消费者副本。
- Product Runtime 只通过 `runtime.mapRuntime.projectArchiveToMathState()` 暴露档案投影，调用方不直接组合三个底层包。
- V5.1 默认路径已经直接生成严格 V3 Math State，因此继续直接执行 V3 校验；只有生命周期档案输入才经过 Adapter。
- 新能力快照进入生成 Prompt 的能力合同后，冻结 Prompt 身份推进为 `canonical-map-v5.1-zh-default-fidelity-with-complete-dependencies-r2`，防止旧 checkpoint 冒充新合同。
