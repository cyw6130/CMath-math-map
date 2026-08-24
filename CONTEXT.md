# CMath Math Map

以交互式数学地图呈现结构化数学知识，并通过论文导入工作流将 PDF 论文转化为可渲染的地图数据。

## Language

### 地图模型

**Entry**: 论文中明确编号或命名的清晰数学命题，具备完整假设、量词与关键依赖。资格只看内容三要件——原文可追溯的命名（含以标准数学术语命名的原文构造）、清晰的数学内容、承重依赖——与出现的段落位置无关；背景小节里的正经定义同样入选。不是任意说明性文字或段落拆解。
_Avoid_: 论点、条目（泛指任意文本片段时）、随便一句话的摘录、以段落位置否定条目资格

**Fact**: 属于 Entry 的一种，类型仅为 `definition | algorithm | calculation`。概念、记号与操作性定义属于此类（如鼓包函数、泰勒展开），无论其在原文中是独立小节还是行内给出。
_Avoid_: 公理、常识（泛称）、把定义性工具误判为非条目

**Claim**: 属于 Entry 的一种，类型仅为 `lemma | proposition | theorem`，可为已证明或论文明确提出但未证明的正式陈述。关于存在性或性质的命题性陈述（如"某类函数存在泰勒展开"）属于此类，而非 definition。
_Avoid_: 猜想、草稿（作为独立类型时）、与 definition 的形态混淆

**Inference**: Entry 之间的推理关系，`proof` 从若干 Fact/Claim 证一个 Claim，`organization` 仅连 Fact 到 Fact。
_Avoid_: 推导、关系（泛指非证明/组织关系时）

**B0**: 外部前提清单，论文直接调用但未自行证明的外部 Claim 集合。仅收命题形外部结果；定义性工具按其自身立为 Fact，不入 B0。
_Avoid_: 外部结果（未指明 B0 语义时）、引用列表、把定义性工具塞入 B0

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

**Frozen Workflow（冻结工作流）**: Benchmark 侧冻结发布的 Entry/Inference 组合版本，当前为 V4.1：Entry `paper-entry-parallel-extraction-v1.31` + Inference `v4`。是 Paper Import 的权威生产版本，网页与评测共用同一实现。
_Avoid_: 新后端、最新算法、与前端工作台版本混称（如「v5 工作流」——工作台 Paper Grotesque v5 是界面 Edition，不随 Frozen Workflow 递进）

**V4 / V4.1**: Frozen Workflow 的组合标签。V4 = Entry `v1.14` + Inference `v3.45` 系；V4.1 = Entry `v1.31` + Inference `v4`。标签到运行时 prompt 的映射由实现层常量维护。
_Avoid_: V4.1（指代单层模块时）、v4（与标签混写的运行时串）

**Map Integration**: 将 Project View 接入数学地图的消费侧能力，含适配、闭包派生、渲染与存储。
_Avoid_: 工作流（与 Benchmark 混称时）、接入逻辑（泛称）
