# CMath Math Map

以交互式数学地图呈现结构化数学知识，并通过论文导入工作流将 PDF 论文转化为可渲染的地图数据。

## Language

### 地图模型

**Entry**: 论文中明确编号或命名的清晰数学命题，具备完整假设、量词与关键依赖。不是任意说明性文字或段落拆解。
_Avoid_: 论点、条目（泛指任意文本片段时）、随便一句话的摘录

**Fact**: 属于 Entry 的一种，类型仅为 `definition | algorithm | calculation`。
_Avoid_: 公理、常识（泛称）

**Claim**: 属于 Entry 的一种，类型仅为 `lemma | proposition | theorem`，可为已证明或论文明确提出但未证明的正式陈述。
_Avoid_: 猜想、草稿（作为独立类型时）

**Inference**: Entry 之间的推理关系，`proof` 从若干 Fact/Claim 证一个 Claim，`organization` 仅连 Fact 到 Fact。
_Avoid_: 推导、关系（泛指非证明/组织关系时）

**Project View**: 供前端渲染与存储的规范化地图包，含 Entry、Inference、B0、主目标等完整结构；也是 Benchmark 中挑选出的满意版本的成品包，进入 Map Integration 后成为数学地图中的版本化产物。
_Avoid_: 地图 JSON、视图对象（泛称）

**B0**: 外部前提清单，论文直接调用但未自行证明的外部 Claim 集合。
_Avoid_: 外部结果（未指明 B0 语义时）、引用列表

**Closure**: 依 Fact 与 B0 可用、proof 沿依赖传递建立的闭包判定，用于派生 Claim 的 established/open 状态。
_Avoid_: 闭合检查（泛指任意校验时）

### 论文导入

**Paper Import**: 将 PDF 文本转化为 Project View 的端到端工作流能力。
_Avoid_: 导入工具（泛称）、Workflow（与 Paper Import 混称时）

**Entry Module**: 论文导入中负责提取与规整 Entry 的子能力，对应 `src/paper-import/entry/`。
_Avoid_: Entry 策略（与 Inference 策略混称时）

**Inference Module**: 论文导入中负责装配 Inference、B0 与主目标的子能力，对应 `src/paper-import/inference/`。
_Avoid_: 推理模块（泛称）

**Inference Strategy**: Inference Module 内按版本号区分的装配策略，如 `v3.43 / v3.44 / v3.45`，对应 `src/paper-import/inference/strategies/`。
_Avoid_: 版本分支（指代内联 if 字符串时）、Prompt 版本（泛称）

**Workflow**: Paper Import 内端到端编排的业务顺序（抽取→整合→装配→校验→修复）。
_Avoid_: Pipeline（与 Workflow 混称时）

**Pipeline**: Workflow 中可复用的步骤链实现。
_Avoid_: Workflow（泛指任意编排时）

**Benchmark**: 以固定 Gold 与 Sol 评分为准的论文导入评测体系，含 Entry/Inference 版本迭代（如 `v1.14 / v3.45`），产出 Project View。
_Avoid_: 版本优化（泛指任意迭代时）

**Map Integration**: 将 Project View 接入数学地图的消费侧能力，含适配、闭包派生、渲染与存储。
_Avoid_: 工作流（与 Benchmark 混称时）、接入逻辑（泛称）
