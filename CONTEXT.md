# CMath Math Map

以交互式数学地图呈现结构化数学知识，并通过论文导入工作流将 PDF 论文转化为可渲染的地图数据。

## Language

### 地图模型

**Entry**: 论文中最小且语义自足的数学单元，仅分为 Fact 与 Claim。资格只看内容三要件——原文可追溯的命名（含以标准数学术语命名的原文构造）、清晰的数学内容、在论文的定义、论证、结论或数学应用中承担明确角色——与出现位置和图中是否有后继无关。Entry 忠实记录论文表达的数学内容，即使原文存在数学错误也不静默改写；不是任意说明性文字或段落拆解。
_Avoid_: 论点、条目（泛指任意文本片段时）、随便一句话的摘录、以段落位置或出度否定条目资格

**Fact**: Entry 的一种，仅含 `definition | algorithm | calculation`。`definition` 引入概念、记号、对象或操作规则；`algorithm` 给出有限、可执行、可复现的构造或计算流程；`calculation` 对指定对象执行定义或算法后得到具体值或表达式。概念、记号与操作性定义属于 Fact（如鼓包函数、泰勒展开），无论在原文中是独立小节还是行内给出。
_Avoid_: 公理、常识（泛称）、把定义性工具误判为非条目、把一般性存在或性质命题归为 calculation

**Claim**: Entry 的一种，仅含 `lemma | proposition | theorem`。Claim 断言一般性的存在性、唯一性、等价性或性质并承担证明责任，可为论文已证明或明确提出但未证明的正式陈述；如“某类函数存在泰勒展开”属于 Claim，而非 definition。
_Avoid_: 猜想、草稿（作为独立类型时）、与 definition 或 calculation 的数学功能混淆

**Inference**: Entry 之间的直接数学论证，仅含 `proof | organization`。`proof` 保存论文从若干直接前提 Entry 推出唯一 Claim 的数学论证；同一 proof 的多个前提是 AND，同一 Claim 的多个 proof 是 OR。允许正文自足证明使用空前提，但 `argument` 必须完整记录论证；空前提 proof 不是 B0。Claim 间的 proof 循环表示互推或等价，不足以建立循环内任一 Claim；只有循环外的已建立入口才能使其进入 Closure。中间结果若被命名、编号、后续复用，或本身可独立陈述且承担关键桥接作用，必须成为 Claim 并拆成直接 proof 链；仅属当前证明内部的代换、计算、选取或局部变形则留在该 proof 的 `argument`。`organization` 仅连 Fact 到 Fact，其进一步语义暂不收紧。
_Avoid_: 裸依赖边、把传递祖先重复列为直接前提、以循环自证、mega-proof、按每句话机械拆节点、将空前提 proof 当作外部公理

**B0**: Claim 集合中的外部前提子集：论文直接调用且未在正文证明的外部 Claim。外部 Claim 若被正文重新证明则不属于 B0；论文内部提出但未证明的 Claim 也不属于 B0，而在 Closure 中保持 open。Fact 无论来自正文还是外部标准定义都不进入 B0。
_Avoid_: 独立 Entry 类型、外部结果（未指明 B0 语义时）、引用列表、把 Fact 塞入 B0

**Closure**: 计算 Claim 的 `established | open` 状态。所有 Fact 与 B0 Claim 天然可用；对每个非 B0 Claim，只要存在至少一个 proof 且该 proof 的全部 premises 已可用，该 Claim 即 established，否则为 open。Closure 沿直接 proof 依赖传递计算。
_Avoid_: 闭合检查（泛指任意校验时）、要求 proof 建立 Fact、把 organization 纳入证明闭包

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
