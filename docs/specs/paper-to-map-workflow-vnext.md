# 规格：轻量论文到数学地图工作流演进

状态：已完成需求澄清与拆票；首个实现票 #40 等待 #38 解除阻塞
基线：`V4.1-production-reproduction`

## 目标

在保留当前生产阶段骨架的前提下，把论文内容自动转换为可直接辅助阅读的数学地图。工作流优先产出尽可能完整的 Entry 与 Inference；局部内容失败时保留合法结果和失败信息，不用人工审核阻断用户。

完成标准：同一 PDF 经公开生产入口运行后，要么返回包含至少一个合法 Entry 的 Generated Map，要么返回可定位的 Hard Workflow Failure；任何无法进入地图的来源内容都可见且可重试，不被静默丢弃。

## 当前基线

当前唯一生产链为：

```text
PDF
  → MinerU marked Markdown
  → Entry v1.31
  → deterministic consolidation
  → W7.1
  → W8
  → Inference v3.45
  → Closure / Project View
```

权威实现身份由 `paper-import-client.js` 中的 `FROZEN_WORKFLOW` 给出，阶段顺序由 `src/paper-import/workflow/checkpoint-store.js` 给出。`docs/adr/0005-production-paper-import-reproduces-laboratory-workflow.md` 解释该基线为何取代旧的简化链路。

现有基线已经具备：

- PDF 内容指纹；
- 七阶段固定编排；
- W7.1/W8 自动补丁；
- Inference 多轮修复；
- 按完整 Frozen Workflow 身份恢复连续 checkpoint；
- 凭证与签名 URL 不进入 checkpoint；
- 最终 Project View 保存到本地资料库。

现有基线尚未具备：

- Entry、Inference、格式规范化与数学地图定义的完整能力包依赖身份；
- `Unresolved Item` 产物；
- 内容级失败后的部分成功；
- 独立但轻量的来源注释；
- 对保义修复与语义改写的明确执行边界。

## 已确认的设计

### 1. 保留阶段骨架

MinerU、Entry、deterministic consolidation、W7.1、W8、Inference、Closure / Project View 的顺序保持不变。本轮在既有接缝上升级合同、修复和输出行为，不恢复旧的 PDF.js、Paper Guide、双通道候选地图或人工 Review 链路。

完成标准：公开入口仍只有一条生产链；阶段顺序回归测试保持七阶段有序执行。

### 2. 能力权威分离

工作流必须区分并显式绑定以下能力角色：

1. 数学地图定义与状态语义；
2. Entry 定义及记录合同；
3. Inference 定义及记录合同；
4. 将模型或历史输出规范成上述合同的格式规范化能力。

每个发布的 Frozen Workflow 必须记录实际采用的 capability ID、合同版本和同步身份。消费者代码不得以本地旧副本静默替代缺失或不兼容的能力合同。能力项目中正在升级的 Entry / Inference 与数学地图定义，在发布前由其各自权威包完成；本项目只绑定和消费，不重新定义其数学含义。

完成标准：运行身份可以枚举全部能力依赖；任一必需依赖缺失、版本不兼容或同步校验失败时，生产入口在模型调用前返回 Hard Workflow Failure。

### 3. 自动运行，不设人工准入

用户上传 PDF 后，工作流自动完成提取、完善、装配、格式校验、保义修复和地图生成。Generated Map 不带 Candidate、Reviewed、Accepted Gold 或数学真值认证状态。

历史 Benchmark Gold 和既有人工审查记录可以继续作为固定测试材料；新论文、新版本和用户生成结果不要求新增人工验收。运行时校验只判断合同合法性与结构可消费性，不判断论文数学内容为真。

完成标准：生产路径、发布门槛和恢复路径均不等待人工操作；自动测试可以在无人介入时完成验收。

### 4. 自动完善与保义修复

W7.1 与 W8 保留为 Automatic Refinement Stage：

- W7.1 对照来源，自动补充、订正或移除 Entry；
- W8 自动补充正文直接调用的外部 Claim；
- 每次补丁后都通过确定性能力合同校验。

自动修复只允许：

- 规范字段与类型名称；
- 补齐可由现有内容唯一确定的字段；
- 修复确定性的引用与公式格式；
- 重新切分或重新提取受影响的来源片段；
- 删除不能形成合法地图对象的候选，同时把原候选转入 Unresolved Item。

自动修复不得猜测来源没有明确支持的前提、结论、论证关系、B0 身份或主目标。不能仅凭结论类型推断 `operationKind`，不能用通用占位文字伪造 `argument`，不能用条目名称冒充来源引用。

完成标准：每一种自动修复动作都可归入允许列表；超出列表的内容进入 Unresolved Item，不进入严格地图。

### 5. 轻量来源注释

来源信息服务于用户快速回到论文，不建立重型审计系统。默认优先保留模型提取过程中自然获得的页码、章节位置或可见引用标记；更细的 source block、bbox、digest 和长证据包不是每个 Entry / Inference 的硬要求。

严格地图继续只保存合同规定的数学结构与轻量来源定位。上下文摘录、符号说明、自动解释、置信信息和 Unresolved Item 放在 Source Annotation Layer，不扩张 Entry / Inference 的核心数学定义。

完成标准：用户可从具备定位信息的地图对象返回论文相应位置；缺少精确来源定位本身不使一个来源忠实且合同合法的对象失效。

### 6. 部分成功与最小可用地图

Generated Map 的最低要求是一组合法、来源忠实的 Entry。以下情况仍可返回部分地图：

- 部分 Entry 候选无法规范化；
- W7.1 或 W8 最终失败；
- Inference 最终失败或只形成部分合法关系；
- 主目标未识别；
- 主证明链不完整；
- 存在开放 Claim、孤立 Entry 或 Unresolved Item。

工作流优先使用最近一个合同合法的阶段产物继续。W7.1、W8 或 Inference 失败时，不回滚或覆盖更早的合法 Entry Artifact；最终可以形成 Entry-only 地图。降级结果明确记录未完成阶段和缺失内容，以后可以从安全 checkpoint 重试。

只有以下情况属于 Hard Workflow Failure：

- PDF 或规范来源无法解析；
- 必需基础设施不可用，且没有已完成的安全来源 checkpoint；
- 能力包缺失或不兼容；
- Entry 阶段最终没有产生任何合法 Entry；
- 最终结果连最小地图合同也无法满足。

完成标准：内容级失败测试返回部分 Generated Map；系统级失败测试返回明确错误；两者不会互相混淆。

### 7. Unresolved Item

每个不能进入严格地图的内容记录为 Unresolved Item，至少包含：

- 来源阶段；
- 可用的轻量来源位置；
- 原始候选或安全摘要；
- 失败类别；
- 最后一次确定性校验错误；
- 是否可以从 checkpoint 重试。

Unresolved Item 不伪装成 Entry、Inference、开放 Claim 或自动修复后的合法对象。它与 Generated Map 一同保存，但不参与 Closure。

完成标准：consolidation、W7.1、W8、Inference 和最终合同校验中的每个内容级丢弃点，都能在输出中找到对应 Unresolved Item；无静默丢弃路径。

### 8. 输出与诊断

一次运行对用户表现为一个论文转换结果，内部至少包含：

- 严格数学地图；
- Source Annotation Layer；
- Unresolved Items；
- Frozen Workflow 与能力依赖身份；
- 各阶段完成、降级或失败状态；
- 主目标识别、开放 Claim、主证明链覆盖和缺失阶段等轻量诊断。

除最小地图合同外，覆盖率和完整性指标用于解释结果，不成为新的自动审核准入层。

完成标准：完整运行、Entry-only 降级运行和恢复运行都返回同一顶层结果合同；消费者不需要猜测本次结果属于哪种路径。

### 9. Checkpoint 与隐私

沿用 PDF 内容指纹与 Frozen Workflow 身份匹配。只恢复连续完成且身份完全一致的阶段前缀。能力依赖身份变化时不混接旧中间产物；已有 Generated Map 保留为独立结果。

Checkpoint 继续采用字段白名单，不保存模型 API Key、MinerU Token、Authorization、签名 URL 或模型调用传输记录。新增的 Unresolved Item 与诊断也必须经过同样的脱敏和字段白名单处理。

完成标准：身份不匹配测试从新工作流开始；恢复测试不重复已完成阶段；序列化 checkpoint 中不存在已知秘密字段。

### 10. 模型配置

默认沿用同一 provider、model、endpoint 与 reasoning 配置执行 Entry、W7.1、W8 和 Inference。阶段合同允许以后为不同阶段选择不同模型，但阶段选择必须成为 Frozen Workflow 运行身份的一部分，不能在恢复过程中静默变化。

完成标准：默认路径仍只需一组模型配置；使用阶段覆盖时，checkpoint 身份能够区分不同组合。

## 非目标

- 本轮不优化前端视觉展示；
- 本轮不建设独立的论文理解能力包；
- 本轮不加入人工审核、人工准入或数学真值认证；
- 本轮不实现 Markdown、LaTeX、网页等新来源适配器；
- 本轮不重新设计 Entry / Inference 的数学定义；
- 本轮不以 Entry-only 降级替代完整 Inference 的长期质量优化。

## 验收场景

1. **完整成功**：七阶段完成，返回含 Entry、Inference、Closure、轻量来源和零个或多个诊断项的 Generated Map。
2. **局部 Entry 失败**：至少一个窗口产生合法 Entry，其他窗口失败；返回部分地图，并为失败窗口或候选生成 Unresolved Item。
3. **自动完善失败**：W7.1 或 W8 调用失败；沿用最近合法 Entry Artifact 继续，结果标记对应阶段未完成。
4. **Inference 失败**：多轮保义修复仍不能形成合法 Inference；返回 Entry-only 地图并保留失败诊断。
5. **非法关系**：悬空引用、缺失 argument 或无法确定的 operation kind 不进入地图，并生成 Unresolved Item。
6. **能力不兼容**：必要 capability 版本不满足合同；模型调用前硬失败，不使用本地旧定义。
7. **断点恢复**：刷新后只恢复身份一致的连续阶段前缀；缺失阶段可重新运行。
8. **隐私**：checkpoint 与最终诊断不包含凭证、签名 URL 或模型传输记录。
9. **无人工路径**：所有验收场景均可由自动测试完成。

完成标准：上述每个场景至少有一个外部行为测试；现有生产工作流、语义链、网页冻结身份和 checkpoint 测试继续通过。

## 实施票据与阻塞关系

- #39：本规格的父级工作票；
- #40：能力身份与统一结果合同，阻塞于 #38；
- #41：Entry 部分成功，阻塞于 #40；
- #42：W7.1 / W8 自动完善降级，阻塞于 #40；
- #43：Inference 部分成功与保义自动修复，阻塞于 #40；
- #44：集成、兼容与新 Frozen Workflow 冻结，阻塞于 #41、#42、#43。

实现严格按 blocker-first 推进。每张子票在独立实现上下文中执行 TDD，并在提交前完成 Standards 与 Spec 双轴 code review；不得从父票直接跳过阻塞边施工。

## 版本与迁移

该改造改变失败语义、结果合同和能力身份，必须发布新的 Frozen Workflow 身份，不能继续使用 `V4.1-production-reproduction`。现有 V4.1 Generated Map 与 checkpoint 不被覆盖；新版本可以复用同一 PDF，但中间产物只在新身份下生成和恢复。

完成标准：新旧运行身份可同时被资料库识别；同一 PDF 的旧结果仍可打开，新运行不会把旧 checkpoint 当作可恢复前缀。
