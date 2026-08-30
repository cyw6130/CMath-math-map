# CMath Math Map

以交互式数学地图呈现结构化数学知识，并通过论文导入工作流将 PDF 论文转化为可渲染的地图数据。

## Language

### 产品架构

**Product Runtime（产品运行时）**: 承载用户操作并消费数学地图的生产产品边界，上位包含 Workbench、Capability Runtime、Map Integration、Map Library 与 Graph。它调用 Paper Import Workflow，但不包含 Workflow 的生成规则或 Quality System 的评测证据。
_Avoid_: Frontend（泛指整个产品运行边界时）、网页层、把 Workflow 或 Quality System 归入前端

**Workbench（前端工作台）**: 用户运行 Paper Import、查看过程状态并消费数学地图的交互产品层。它呈现输入、配置、进度、错误与结果，但不定义 Workflow 的业务阶段、恢复规则或数学语义。
_Avoid_: Frontend（泛指所有浏览器代码时）、Workflow UI、把页面状态称为工作流状态

**Paper Import Workbench（论文导入工作台）**: Workbench 中覆盖论文导入完整用户旅程的产品切片，包含 PDF 选择、模型访问配置与授权、阶段进度、失败或成功反馈，以及将生成地图交给 Map Library。它不重新实现 Paper Import 或决定 Workflow 阶段。
_Avoid_: Paper Import、导入按钮、Workflow 实现

**Quality System（质量系统）**: 对 Paper Import 与 Workbench 提供独立质量证据的体系，上位包含 Benchmark 与 Tests，但不进入生产运行路径。
_Avoid_: Benchmark（泛指全部质量检查时）、测试系统（混称 Benchmark 与 Tests 时）

**Tests**: 对模块 Interface、确定性业务合同和生产装配行为执行的自动化回归检查。Tests 不使用 Gold 判断模型生成内容的数学质量，也不决定 Frozen Workflow 晋级。
_Avoid_: Benchmark、模型评测、Gold 评分

**Capability Runtime（能力运行时）**: 生产环境中已验证身份并完成装配的能力集合，向 Workbench 与 Workflow 提供稳定的高层 Interface，同时隐藏运行时资产名称、加载顺序与宿主差异。
_Avoid_: 浏览器全局对象集合、脚本清单、能力包副本

**Capability Runtime Interface（能力运行时接口）**: `createCapabilityRuntime({ root })` 是生产装配的唯一入口，向调用方提供 `paperImport`、`mapRuntime` 与 `mapLibrary` 三组高层能力。它只负责身份校验、装配、兼容与生产环境 fail-close，不承载 Workflow 业务规则、数据翻译或存储策略。
_Avoid_: 新业务层、通用依赖注入框架、把兼容装配写回各调用方

**Capability Distribution（能力分发）**: 将权威能力的指定版本与身份同步为当前项目可加载资产的状态。分发只说明能力可用，不表示生产路径已经使用它。
_Avoid_: Capability Adoption、安装完成即视为采用

**Capability Adoption（能力采用）**: 生产路径通过能力的正式 Interface 执行其行为，并把准确能力身份纳入运行合同的状态。仅在 manifest 中声明、只在 Tests 中加载或只完成 Capability Distribution 均不算采用。
_Avoid_: Capability Distribution、版本声明、测试可加载

**Capability Usage Scope（能力使用作用域）**: 每项 Capability Adoption 必须声明其真实使用位置：`production` 表示当前产品运行路径，`quality` 表示 Benchmark 或 Tests，`compatibility` 表示非默认历史路径。同一同步批次不表示同一语义合同，非 `production` 能力不得冒充当前生产依赖。
_Avoid_: 把可分发能力全部称为生产依赖、把质量依赖与默认 Workflow 混为一谈

**Archive Math State Projection（档案到数学状态投影）**: `runtime.mapRuntime.projectArchiveToMathState()` 是 v2 Entry/Inference 生命周期档案进入严格 `cmath.math-map-state/v3` 的唯一生产边界；它排除非 active 记录、返回审计问题并强制执行 V3 校验。已经是严格 V3 Math State 的 V5.1 结果直接校验，不做无意义的档案往返。
_Avoid_: 调用方自行翻译档案、绕过 V3、把严格 Math State 反包装为档案再投影

**Paper Import Result Handoff（论文导入结果交接）**: Paper Import Workbench 在成功后先通过 `runtime.mapLibrary` 保存 Project View，再以 `onMapReady` 通知外层应用打开该地图。Workbench 不直接操作地图渲染器或持久化适配器；外层应用只负责导航与展示。
_Avoid_: Workbench 直接写 IndexedDB、Workflow 决定页面跳转、保存前先打开临时地图

**Workbench Mount（工作台挂载）**: `mountPaperImportWorkbench({ root, runtime, onMapReady })` 将行为附着到页面已有 HTML 宿主，不引入模板系统或前端框架。每个 `root` 同时只有一个实例；重复挂载返回同一 controller，controller 通过 `dispose()` 释放监听与实例关联。
_Avoid_: 模块生成整页 HTML、重复绑定事件、无生命周期的全局单例

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

**Laboratory Workflow（实验室工作流）**: 在 Benchmark 实验中选定、以部署到公开网站为目的的完整 Paper Import 工作流；它是生产发布的来源，不是只供展示或比较的参考样例。
_Avoid_: 实验样例、离线特例、仅指某个模型输出 JSON

**Production Reproduction（生产复现）**: 网站从相同语义输入出发，执行与 Laboratory Workflow 相同的步骤、版本与运行合同，并达到实验室水平的数学覆盖、主证明链与地图连通质量；不要求随机模型输出逐字或逐 ID 相同。
_Avoid_: 页面能跑、JSON 格式通过、与单张 Gold 自比

**Production Paper Import Pipeline（生产论文导入链路）**: 公开网站执行的完整步骤链：`PDF → MinerU marked Markdown → Entry v1.31 → deterministic consolidation → W7.1 verify → W8 B0 backfill → Inference v3.45 → Project View`。MinerU 之后的模型阶段由浏览器编排，并把每个阶段产物保存为本地 checkpoint，以便刷新后从最近完成阶段继续。
_Avoid_: 仅指网页端 PDF.js 抽取、只含 Entry/Inference 两层的简化链路

**User-provided Model Access（用户自带模型访问）**: 网站不提供或补贴 Entry、W7/W8、Inference 所需的模型服务；用户沿用现有模型选择与 API 配置提交本次 Paper Import 所需的 provider、model 与凭证。网站只提供 MinerU 文档预处理能力。
_Avoid_: 网站模型、免费推理、把 MinerU Token 与模型 API Key 混称

**MinerU Token**: MinerU 精准解析 API 用于 `Authorization: Bearer <token>` 的站点凭证；它在安全角色上就是 MinerU API Key，不是解析任务返回的 `task_id`。
_Avoid_: 模型 API Key、MinerU 任务 ID、公开配置项

**MinerU Credential Gateway（MinerU 凭证网关）**: 公开网站通过轻量 Cloudflare Worker 调用 MinerU 精准解析 API；站点 MinerU Token 仅保存在 Worker Secret 中，不进入前端代码。Worker 只承担凭证保护与 MinerU 请求转发，不提供模型服务，不保存论文或工作流产物；PDF 使用 MinerU 签名上传地址从浏览器直传 MinerU。
_Avoid_: 传统应用后端、模型代理、把站点 Token 嵌入 GitHub Pages、由用户提供 MinerU Token

**Frozen Workflow（冻结工作流）**: 从 Laboratory Workflow 冻结发布的完整可复现合同，包含源文档预处理、Entry/Inference 组合、补全与校验步骤及其版本身份；完整生产复现的当前身份为 `V4.1-production-reproduction`。冻结后若改变其中任一生成行为，必须产生新的版本身份，不能继续借用原标签。
_Avoid_: 新后端、最新算法、与前端工作台版本混称（如「v5 工作流」——工作台 Paper Grotesque v5 是界面 Edition，不随 Frozen Workflow 递进）

**V4 / V4.1**: 历史 Entry/Inference 组合标签。V4 = Entry `v1.14` + Inference `v3.45` 系；V4.1 = Entry `v1.31` + Inference `v4`。完整网站生成行为使用 `V4.1-production-reproduction`，并额外冻结 MinerU、整合、W7.1、W8 与 Project View 身份。标签到运行时实现的映射由 `FROZEN_WORKFLOW` 维护。
_Avoid_: V4.1（指代单层模块时）、v4（与标签混写的运行时串）

**Map Integration**: 将 Project View 接入数学地图的消费侧能力，含适配、闭包派生、渲染与存储。
_Avoid_: 工作流（与 Benchmark 混称时）、接入逻辑（泛称）

**Map Library（地图库）**: 用户持久保存、整理、恢复数学地图的产品能力。其生命周期同时包含地图记录、永久编号账本、文件夹归属、文件夹内排序、折叠状态以及整库备份的校验与合并；IndexedDB、会话缓存和本地文件系统只是该能力的存储适配器，不定义这些业务规则。
_Avoid_: 仅指地图库抽屉界面、仅指某一种存储后端、把备份恢复视为独立于地图身份与组织状态的功能
