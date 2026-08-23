# V3.26 Inference Repair 模块最小改进方案（Candidate Proposal）

> **状态**：原型设计与离线验证完成（等待决策者评审，未合并至生产分支）  
> **设计原则**：严格执行者视角；0 次额外网络/LLM 调用；不重写已有正确 Entry 数学陈述；严格 Fail-Closed（不臆造证明与 B0）；完全兼容 V3.26 模块化契约与 40 分制 Format 评分。

---

## 一、 背景与 V3.26 历史输出证据分析

在 CMath-math-map 的 V3.26 模块化架构中，Inference 模块从 Entry 阶段接收包含完整数学对象清单的 `entryArtifact`，经由 Assembly 阶段生成推理图拓扑，并在结构/闭包不满足时执行单轮定向修复（Repair）。

通过对 `benchmarks/model-outputs/fixed-1.0/*v3.26*` 现有输出及 Audit 报告的详细排查，发现了以下核心现象与瓶颈证据：

### 1. 典型缺陷证据（knot-hopf-rt, auditScore: 80 / below-target）
* **主定理未建立**：主目标 `paper:theorem:6.3`（Reshetikhin–Turaev 不变量定理）在装配阶段被 `guide-core-boundary` 判定为内部核心成果并移出 B0。
* **单轮修复输出不足**：在进入单轮 Repair 时，原 V3.26 提示词仅报告了通用的 `Claim paper:theorem:6.3 没有 proof 且不在 b0`，缺乏对论文主线成果与前置可用条目（如 ribbon-category, modular-category, unit-braiding 等）的直观引导，导致模型修复调用仅生成了 292 tokens，未能在 `inferencesToAdd` 中补全主定理的推导链。
* **残余孤立条目**：`Rohlin cobordism theorem`、`Reshetikhin–Turaev invariant` 与 `root-of-unity` 最终停留在 open 状态，推理边仅存 4 条。

### 2. 调查型与分支复杂案例证据（kirby-2018-trisections, yasui-2019）
* **kirby-2018-trisections** (auditScore: 74)：候选输出未生成有效推理边，大量引用条目处于孤立状态。
* **yasui-2019** (auditScore: 84)：主目标选择了局部引理（Theorem 2.3），未能将主定理（Theorem 1.4）与技术支撑定理建立贯通链条。

### 3. 稳定案例证据（hopf-degree-theorem: 94, 4-dim-skein: 94, cornered-skein: 91）
* 在主定理目标清晰且前置依赖已在初次装配中成链的情况下，V3.26 表现优异（Format 40/40，Audit > 90）。
* **核心瓶颈结论**：V3.26 的关键短板在于**单轮 Repair 中缺少对「主线定理断链/核心条目孤立」的确定性上下文提取与靶向引导**。

---

## 二、 最小改进设计（Minimal Candidate Design）

本候选方案保持 **0 额外 LLM 调用**，通过纯内存确定性计算（耗时 <3ms）在单轮 Repair 提示词中注入核心主线推导缺口与可用前提目录。

### 1. 确定性主线缺口上下文提取器 (`deriveV326MainlineRepairContextCandidate`)
在构建 Repair Prompt 时，无需额外调用模型，直接利用内存中已有的 `candidate`、`paperGuide`、`protectedClaimIds` 进行确定性图分析：
1. **Unproven Core Mainline Targets（核心主线目标缺失 Proof 清单）**：
   - 检查 `candidate.mainTargetEntryId` 及 `paperGuide.leads` 中角色为 `main_target` / `key_result` 的内部 Claim。
   - 过滤出当前既不在 B0、入向 `inferences` 中又缺少有效 `proof` 的核心节点。
2. **Isolated Formal Claims（孤立正式 Claim 清单）**：
   - 识别出入度均为 0 且不在 B0 的正式定理/引理，提示模型核对正文。
3. **Available Premise Catalog（可用前置条目索引）**：
   - 汇总候选图中已有且有效的 `Fact`（定义、计算）以及已证 `Claim`，按页码顺序输出紧凑 ID 目录，供模型直接作为 `inferencesToAdd[i].premises` 引用。

### 2. 针对性 Repair 提示词增强 (`v326FocusedAssemblyRepairPromptCandidate`)
在提示词中新增结构化指导：
* **【主线证明闭包优先】**：明确指示若主定理在论文中已获证明，必须在 `inferencesToAdd` 中补全以该定理为 conclusion 的有效 proof，并引用已有 Canonical Premise ID。
* **【严守 Fail-Closed 与不臆造原则】**：
  - 若条目确系论文未证猜想（conjecture）或开放问题，必须保持 open，**严禁捏造虚假 proof**。
  - **严禁重写已有 Entry 的数学 statement**。
  - 仅有明确文献证据且正文未证时才允许进入 B0。
* **【类型安全规范】**：`proof` 结论必须是 `claim`；`organization` 必须连接 `fact` 到 `fact`。

---

## 三、 候选实现文件清单

全部实现与测试代码均独立存放于 prototype 目录，未改动任何生产代码：

```
prototypes/v326-inference-repair-candidate/
├── candidate-repair-prompt.js       # 核心算法：确定性上下文提取器与增强提示词生成器
├── candidate-inference-module.js     # 模块封装：安全补丁合并与 Format 契约对接
├── tests/
│   └── v326-repair-candidate.test.mjs # 自动化测试套件（含真实 benchmark 验证）
└── DESIGN_PROPOSAL.md               # 本设计报告
```

---

## 四、 自动化测试与契约验证结果

在工作区执行测试套件：
```bash
node --test prototypes/v326-inference-repair-candidate/tests/v326-repair-candidate.test.mjs
```

### 测试结果概览：
```text
✔ deriveV326MainlineRepairContextCandidate deterministically identifies unproven core targets (0 API calls) (2.45ms)
✔ v326FocusedAssemblyRepairPromptCandidate generates complete fail-closed repair prompt (0.21ms)
✔ applyCandidateRepairPatch applies mainline inference without rewriting existing entry statements (1.20ms)
✔ Real benchmark evaluation: repairs knot-hopf-rt V3.26 missing mainline proof (16.58ms)
ℹ tests 4
ℹ pass 4
ℹ fail 0
ℹ duration_ms 136.04ms
```

### 契约兼容性检查：
1. **Format 评分兼容性**：经由 `paper-import-modules-v3.26.js` 中的 `validateFormatArtifact` 校验，修复后的视图获得 **40 / 40 满分**，所有结构校验项（`entries_present`, `entry_ids_unique`, `entry_fields`, `math_delimiters`, `inference_shape`, `inference_references`, `proof_conclusion_claim`, `organization_fact_link`, `main_target`, `b0_references`）全部通过。
2. **生产基线保护**：现有基线测试 `node --test tests/paper-import-modules-v3.26.test.mjs` 维持 100% 通过（4/4 pass），生产文件 `paper-import-client.js`、`paper-import-modules-v3.26.js`、`package.json` 零修改。

---

## 五、 风险与权衡评估（Risks & Trade-offs）

| 维度 | 潜在风险 | 应对与防护机制 |
| :--- | :--- | :--- |
| **调用预算与延迟** | 无新增网络调用，延迟影响 <5ms。 | 纯确定性图遍历计算，不增加 LLM 调用次数。 |
| **幻觉/臆造数学风险** | 模型在提示词引导下可能为开放问题编造假证明。 | **Fail-Closed 约束**：提示词明令猜想/开放问题保持 open；`candidate-inference-module` 强制校验 premises 必须存在于 Entry 目录。 |
| **数学内容破坏风险** | Repair 阶段试图篡改已提取的公式。 | **No-Rewrite 机制**：`applyCandidateRepairPatch` 严格锁定原有 Entry 的 `statement` 字段，禁止覆盖已有数学内容。 |
| **兼容性与回滚** | 接入生产时的潜在兼容风险。 | 当前方案以独立原型存在于 `prototypes/`，由决策者决定是否合流。 |
