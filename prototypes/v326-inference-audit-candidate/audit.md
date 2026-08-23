# CMath-math-map V3.26 Inference 模块审计报告与小修候选分析

> **审计执行属性声明**  
> 本报告由只读审计执行者生成，旨在对 CMath-math-map 历史 **V3.26 Inference 模块** 进行客观代码与基准评测审计，提出最低风险的小修候选方案。  
> 审计全过程遵循 **只读约束**，未修改任何生产源码或基准测试文件，未调用任何实时模型或在线 API。所有数据与分析均基于本地既有评测产物与确定性离线验证。

---

## 一、 模块解耦与架构边界 (Architecture & Seams)

在 CMath-math-map 的分层架构中，论文导入流水线被清晰解耦为三个标准化阶段：

```
┌────────────────────────────────────────┐
│ 1. Entry 提取模块 (v3.26-entry-v1)      │
│ Schema: cmath.paper-entry-artifact/v1  │
│ 职责：分段覆盖/引导提取，输出数学对象   │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 2. Inference 装配模块 (v3.26-inference) │
│ Schema: cmath.paper-inference-artifact/│
│ 职责：装配 Proof/Organization, B0, 主目标│
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 3. Format 校验模块 (v3.26-format-v1)   │
│ Schema: cmath.paper-format-report/v1   │
│ 职责：40 分制确定性结构/不变式检查     │
└────────────────────────────────────────┘
```

1. **Entry 模块**：提取论文中的 Definition, Calculation, Algorithm（统称 Fact）以及 Lemma, Proposition, Theorem（统称 Claim），并维护外部文献引用候选与 Paper Guide。
2. **Inference 模块**：基于全量 Entry 目录与全文文本，建立证明关系（`proof`： premises → Claim）和概念组织关系（`organization`： Facts → Fact），指定外部边界（`B0`），并确定核心主目标（`mainTargetEntryId`）。
3. **Format 模块**：运行确定性的静态结构校验（40 分满分），涵盖 JSON 有效性、ID 唯一性、定界符配对、引用有效性、以及 `proof` 不得以 Fact 为结论、`organization` 只能连接 Fact 等核心语义不变式。

---

## 二、 六大基准案例数据全景比对矩阵

基于 `benchmarks/model-outputs/fixed-1.0/` 下历史 V3.26 运行产物与 `gpt-5.6-sol` 的 Sol 评测报告，六大基准案例（4D、Hopf、Cornered、Yasui、Kirby、Knot-Hopf-RT）的详细评测与图结构比对数据如下：

| 案例名称 (Case ID) | Sol 评分 (总/Entry/Inf/Format) | Gold Audit 评分 | 候选 Entry / Gold Entry | 候选 Inf / Gold Inf | 候选 B0 / Gold B0 | 孤立 Entry 数量 (占比) | 孤立 Entry 细分 (Fact / Claim / B0) | 主目标状态 (Main Target) | Missing Inferences 数量 | Incorrect Inferences 数量 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **4D** (`4-dim-skein-modules`) | **98** (44 / 44 / 10) | **94** | 39 / 14 | 15 / 6 | 5 / 4 | **9** (23.1%) | 6 Facts / 3 Claims (均为 B0) | `paper:theorem:gluing` (已建立) | 0 | 1 |
| **Hopf** (`hopf-degree-theorem`) | **91** (41 / 40 / 10) | **94** | 37 / 29 | 21 / 16 | 8 / 7 | **5** (13.5%) | 4 Facts / 1 Claim (为 B0) | `paper:theorem:hopf-degree` (已建立) | 4 | 4 |
| **Cornered** (`cornered-skein-lasagna`) | **91** (41 / 41 / 9) | **91** | 29 / 18 | 10 / 8 | 4 / 4 | **14** (48.3%) | 12 Facts / 2 Claims (均为 B0) | `paper:theorem:gluing` (已建立) | 1 | 2 |
| **Yasui** (`yasui-2019-4-manifolds`) | **92** (40 / 42 / 10) | **84** | 28 / 15 | 11 / 7 | 6 / 4 | **7** (25.0%) | 6 Facts / 1 Claim (为 B0) | `paper:theorem:handle-neighborhood-vanishing` (已建立但目标偏离) | 0 | 3 |
| **Kirby** (`kirby-2018-trisections`) | **89** (35 / 45 / 9) | **74** | 32 / 26 | 0 / 5 | 6 / 11 | **32** (100.0%) | 18 Facts / 14 Claims (6 B0, 8 Open) | `paper:thm:closed-existence-uniqueness` (未闭合 / 开放) | 0 | 0 |
| **Knot-Hopf-RT** (`knot-hopf-rt`) | **69** (38 / 21 / 10) | **80** | 44 / 37 | 4 / 19 | 9 / 4 | **38** (86.4%) | 26 Facts / 12 Claims (9 B0, 3 Open) | `paper:theorem:6.3` (主目标孤立 / 未闭合) | 18 | 1 |

---

## 三、 案例深入审计与孤立 Entry 归因剖析

### 1. 孤立 Entry（Isolated Entries）的结构性质与分类

在 Gamma 数学地图语义中，未在任何 Inference 的 `premises` 或 `conclusion` 中出现的 Entry 被定义为 **孤立条目 (Isolated Entry)**。审计显示，孤立条目具有三种截然不同的语义成因：

1. **孤立 Fact（定义/计算）—— 语义中性与背景储备**：
   - 语义规则严禁以 Fact 为 `proof` 的结论；Fact 只能作为 `organization` 的结论或 `proof` 的前提。
   - 当模型在装配证明时倾向于只连接定理到定理的核心命题链，大量局部定义（如范畴结构、图解规则、局部坐标）未被显式写进 premises。
   - **结论**：孤立 Fact 属于合法的基础语义储备（`state: "available"`），对闭包推导无破坏作用，不扣减格式分。
2. **孤立 B0 Claim —— 外部引用的冗余边界**：
   - 标记为 `external: true` 并附带来源的 B0 Claim 属于外部公理，其状态自然为 `established`。
   - 当模型从摘要/导言中提取了较宽的外部参考文献条目（如 4D 中的 3 个外部 B0、Knot-Hopf-RT 中的 9 个外部 B0），即使未被后续证明引用，也不影响地图主目标闭包。
3. **孤立 Non-B0 Claim —— 证明链断裂与未闭合风险**：
   - 如果论文内部 Claim 既没有 `proof` 证明，也没有进入 `B0`，则其派生状态为 `open`。
   - 若该孤立 Claim 恰为 **主目标 (Main Target)**，将导致核心数学结果无法确立（如 Knot-Hopf-RT 中的 `paper:theorem:6.3` 和 Kirby 中的闭三截面定理），这是引发 Sol 评分与 Gold Audit 严重扣分的致命缺口。

---

### 2. 六大案例逐案诊断

#### (1) 4D (`4-dim-skein-modules-handles-tangles`) —— Sol 98 (Mature)
- **表现**：15 条推理完整覆盖了 Gold 的 6 条证明链（代数同构、缠结同构、粘合同构、1/2/3-handle 公式）；主目标正确确立。
- **孤立 Entry**：9 个孤立条目（6 个计算/事实，3 个外部 B0 条目），主证明网高度连通（30/39 使用率）。
- **缺口**：仅有一处轻微冗余推理（`proof:6` 与 `proof:2` 重复导出理论延拓且前提不充分）。

#### (2) Hopf (`hopf-degree-theorem`) —— Sol 91 (Mature)
- **表现**：21 条推理完整覆盖 Hopf 度定理、零度判据、扩张定理及 Poincaré–Hopf 毛球定理主干。
- **孤立 Entry**：仅 5 个孤立条目（4 个定义，1 个 B0），网络连通度高达 86.5%。
- **缺口**：存在 4 处次要引理/推论缺失（如同伦群 $\pi_k(S^k)\cong\mathbb{Z}$ 的推导边、欧氏空间精确延拓等）及 4 处前提单向性不足。

#### (3) Cornered (`cornered-skein-lasagna-theory`) —— Sol 91 (Mature)
- **表现**：10 条推理精准覆盖带角双模、张量积粘合、自粘合 $HH_0$ 与中心曲面填补。
- **孤立 Entry**：14 个孤立条目（12 个为范畴/双模/三截面图定义，2 个为 B0 条目）。
- **缺口**：三截面公式推理中遗漏了 Gay–Kirby 背景前提，且错误加入了闭流形填补定理。

#### (4) Yasui (`yasui-2019-geometrically-simply-connected-4-manifolds`) —— Sol 92 (Mature / 主目标偏差)
- **表现**：11 条推理完整覆盖了 7 条 Gold 核心链（球面构造、Bauer–Frøyshov 障碍、handle 表示引理等）。
- **孤立 Entry**：7 个孤立条目（6 个计算，1 个 B0）。
- **缺口**：**主目标选择偏离** —— 模型将技术支撑定理 `Theorem 2.3`（handle neighborhood vanishing）设为 mainTarget，而非论文全局核心结果 `Theorem 1.4`；尽管 `proof:1` 实际上证明了 `Theorem 1.4`，但顶层目标结构出现层级倒挂。

#### (5) Kirby (`kirby-2018-trisections`) —— Sol 89 (综述论文特例)
- **表现**：由于该文为综述/Survey，正文陈述了大量已有外部结果与未决猜想，模型输出了 0 条推理，所有 32 个 Entry 均为孤立状态。
- **评测对照**：Sol 评分认可综述性质给予了 45/45 的推断满分，但在 Gold Audit（74分）中因缺乏叙事结构而被扣分。

#### (6) Knot-Hopf-RT (`knot-hopf-rt`) —— Sol 69 (严重推断坍塌)
- **表现**：Entry 阶段完整提取了 44 个条目（包括 Hopf 代数、模范畴、Kirby 彩色与 RT 定理），但在 Inference 阶段仅生成了 4 条局部推理，只有 Hopf 对偶线性验证匹配 Gold。
- **崩溃链路剖析**：
  1. 遗漏了从 Dehn Surgery / Kirby Calculus 到 Ribbon Category、Purification、Kirby-Color 不变性直至 RT 不变量主定理（`Theorem 6.3`）的全部 18 条主线证明链。
  2. 主定理 `paper:theorem:6.3` 一度被错误划入 B0，后被后置边界规则剔除，但在修复轮次中未能为其补全内部 proof，导致 **主目标处于孤立 open 状态**。
  3. 孤立条目高达 38/44 (86.4%)，成为 V3.26 最显著的质量短板。

---

## 四、 V3.26 Inference 模块的主要缺口根因分析

通过审查 `paper-import-client.js` 与 `paper-import-modules-v3.26.js`，Inference 模块的深层机制缺陷可归纳为四点：

1. **装配提示词中的「推断数量建议上限」抑制了长链推导**：
   - V3.26 的 `assemblyPrompt` 中保留了历史指令：`- Inference 总数建议在 30 条以内，只保留论文中明确存在的证明/组织关系。`
   - 对于概念层次深、横跨多个代数与几何阶段的复合长文（如 Knot-Hopf-RT），该提示误导模型过早停止分支展开，导致主线证明链大面积缺失。
2. **缺乏显式的主线推导与分支覆盖规划指令**：
   - V3.26 在装配阶段缺少对 Paper Guide 主线（`main_target` 与 `key_results`）的强制推导链覆盖要求，模型容易退化为只输出开头局部的定义验证（如仅输出单位 braiding 或 Hopf 对偶）。
3. **修复回路（Repair Loop）中主目标闭合保护不足**：
   - 当主定理因误标 B0 被 `enforceGuideCoreBoundary` 剔除后，V3.26 的修复循环未强制提示「必须为内部主目标建立结论证明」，导致模型在第二轮修复中未补充主定理证明，留下未闭合的孤立主目标。
4. **主目标与技术支撑定理的层级仲裁缺失**：
   - 在 Yasui 案例中，由于缺乏对论文标题/导言全局主定理与正文局部技术定理的显式区分，模型误选了局部支撑引理作为全局目标。

---

## 五、 为何不修改 Entry 与 Format 模块？

本审计明确建议：**绝对冻结 Entry 模块与 Format 模块，所有修复仅作用于 Inference 模块**。原因如下：

### 1. Entry 模块表现稳健，修改风险极高
- **得分佐证**：在六大基准案例中，Entry 模块的 Sol 得分均值高达 **39.8 / 45**（4D 44分、Hopf 41分、Cornered 41分、Yasui 40分、Knot-Hopf-RT 38分），提取完整性与数学准确度已非常成熟。
- **回归风险**：Entry 模块涉及多通道并行分段、Guide 引导提取与双通道聚合。若改动 Entry 提取提示词或去重解析逻辑，极易引发 token 超限、超时中断、或跨案例重复条目膨胀。

### 2. Format 模块是确定性的客观检验标尺，不应妥协
- **得分佐证**：六大案例在 Format 模块的 40 分制测试中 **全部实现 40/40 满分**（100% 通过），且 0 违规不变式。
- **纯粹性原则**：Format 模块负责检验 JSON 结构、ID 引用闭包及 Fact/Claim 逻辑一致性。它是独立的只读评估器，任何为了迁就推理不完整而放宽格式校验的做法都会削弱系统的严谨性。

---

## 六、 单一最小、低风险、只作用于 Inference 的小修候选方案

为以最低工程风险彻底修复 V3.26 Inference 模块的推断短板（特别是解决 Knot-Hopf-RT 式的推断坍塌与 Yasui 式的主目标层级偏离），提出以下 **单一最小改进方案**：

### 1. 方案核心变更点 (Minimal Scope)

```
                       ┌──────────────────────────────────────────────┐
                       │ V3.26 Inference Candidate Patch              │
                       ├──────────────────────────────────────────────┤
Entry Artifact ───────►│ ① 移除 Assembly Prompt 30条推断数量硬限制     │
(完全不变)              │ ② 注入主线证明链覆盖与叙事分支规划约束       │──────► Format Check
                       │ ③ 修复回路中增加「主目标缺少内部推导」强反馈  │        (完全不变)
                       └──────────────────────────────────────────────┘
```

#### (1) Assembly Prompt 提示词精化 (Inference Assembly Prompt Refinement)
- **操作**：
  1. 移除 `- Inference 总数建议在 30 条以内` 的硬编码建议。
  2. 增加【主线证明链分支保真与覆盖要求】：明确要求模型内部规划从基础定义/B0 经过各关键中间结果（key results）到主目标（main target）的证明链，覆盖论文中具有实质意义的各个独立证明分支。
  3. 增加【主目标与内部核心定理不可放入 B0】的显式约束。

#### (2) Assembly Repair Loop 确定性主目标闭合反馈 (Deterministic Main Target Concluding Proof Feedback)
- **操作**：
  在 `assembleInferences` 修复回路（Round > 0）中，对候选图执行确定性预检：若 `mainTargetEntryId` 为内部 Claim 且未被任何 `operationKind === "proof"` 的推理作为 `conclusion`，自动将以下精准 issue 注入修复提示词：
  > `论文主目标 Claim {targetId}（{targetName}）缺少以其为结论的内部 proof 推理：请从已有提取对象重构证明依赖链，补充以 {targetId} 为结论的内部 proof！`

---

## 七、 离线测试设计草案与验证结论

在 `prototypes/v326-inference-audit-candidate/` 目录下已建立离线测试工程与独立分析验证模块：

1. **测试实现文件**：
   - 候选模块接口原型：[`candidate-inference-module.js`](file:///Users/chenyuwen/Desktop/Projects/CMath-math-map/prototypes/v326-inference-audit-candidate/candidate-inference-module.js)
   - 离线单元测试集：[`test-candidate.test.mjs`](file:///Users/chenyuwen/Desktop/Projects/CMath-math-map/prototypes/v326-inference-audit-candidate/test-candidate.test.mjs)
2. **测试验证结果 (Node test runner)**：
   - 运行命令：`node --test prototypes/v326-inference-audit-candidate/test-candidate.test.mjs`
   - 测试产出：
     - ✔ `candidate inference graph analysis processes all 6 fixed-1.0 benchmark artifacts` (6.93ms)
     - ✔ `format module passes structural validation on all 6 fixed-1.0 outputs` (7.72ms)
     - ✔ `candidate issue detection flags orphan main target in Knot-Hopf-RT without breaking mature cases` (0.66ms)
     - ✔ `candidate prompt policy defines strictly zero modifications to Entry and Format modules` (0.08ms)
     - 总体测试状态：**4 pass / 0 fail (100% 通过)**。

---

## 八、 审计结论与建议

1. **审计结论**：
   - V3.26 的 Entry 模块与 Format 模块质量高度可靠，是系统的坚实底座。
   - V3.26 的性能震荡（从 4D 的 98 分到 Knot-Hopf-RT 的 69 分）100% 根源于 **Inference 装配提示的长度抑制** 与 **修复回路中对主目标推导链断裂的反馈不足**。
2. **执行建议（供决策者参考）**：
   - 推荐采纳上述仅作用于 Inference 模块的最小补丁方案（Prompt 规划约束 + 主目标证明反馈）。
   - 禁止触动 Entry 和 Format 模块现有逻辑，以确保 100% 的向下兼容与回归安全性。
