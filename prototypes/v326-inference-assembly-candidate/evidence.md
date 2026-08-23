# V3.26 Inference 模块实测证据与病灶分析

## 1. 数据来源与测试基线

本分析基于 `benchmarks/model-outputs/fixed-1.0/` 目录下 6 篇标准基准论文在 **V3.26 冻结版本**（BACKBONE=v3.26, 2026-08-18 运行）的模型生成产物与对应 Gold 审计报告（`*-json-gold-audit-v1.json`）。

所有测试均在固定输入（同一份 Entry Artifact / 论文全文）与相同硬件/模型配置下进行。

---

## 2. 6 大基准案例实测数据对比

| 案例 ID (Case) | 总 Entry 数量 | 生成 Inference 数量 | B0 数量 | 孤立 Entry 数量 (Claim / Fact) | Main Target 状态 | Format 分数 | 语义审计得分 | 审计状态 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`knot-hopf-rt`** | 44 | **4** | 9 | **29** (3 Claims, 26 Facts) | **未证明 (Open / Not established)** | 37 / 40 | 80 / 100 | below-target |
| **`kirby-2018-trisections`** | 32 | **0** | 6 | **26** (8 Claims, 18 Facts) | **未证明 (No proof graph)** | 34 / 40 | 74 / 100 | held-out-below-target |
| **`yasui-2019-4-manifolds`** | 28 | 11 | 6 | 6 (0 Claims, 6 Facts) | **选错定理 (选局部 Thm 2.3 非主 Thm 1.4)** | 40 / 40 | 84 / 100 | below-target |
| **`cornered-skein-lasagna`** | 29 | 10 | 4 | 12 (0 Claims, 12 Facts) | 已证明 (Established) | 40 / 40 | 91 / 100 | target-met |
| **`4-dim-skein-modules`** | 39 | 15 | 5 | 6 (0 Claims, 6 Facts) | 已证明 (Established) | 40 / 40 | 94 / 100 | target-met |
| **`hopf-degree-theorem`** | 37 | 21 | 8 | 4 (0 Claims, 4 Facts) | 已证明 (Established) | 40 / 40 | 94 / 100 | target-met |

---

## 3. 典型失败案例深度复盘

### 案例 A：`knot-hopf-rt`（Reshetikhin–Turaev 3-流形不变量）
- **现象**：全文提取了 44 个正式数学对象（包含大量的 Hopf 代数、Ribbon 范畴、Kirby calculus、colored-link 计算与模范畴构造），但 Assembly 最终仅输出了 **4 条 Inference**：
  1. `lemma:unit-braiding` 的证明（前言基础引理）；
  2. `lemma:yang-baxter` 的证明（前言基础引理）；
  3. `definition:dual-module` 的组织关系（Fact 组织）；
  4. `lemma:hopf-duality-linearity` 的证明（基础代数引理）。
- **严重后果**：
  - Paper Guide 中指定的最终核心主目标 `paper:theorem:6.3`（Reshetikhin–Turaev invariant 定理）**没有任何一条 proof 指向它**；
  - 核心主定理既未进 B0（被 `guide-core-boundary` 正确识别为内部自证而移出 B0），又缺乏证明，导致闭包推导中被判定为 **`open`（未建立）**；
  - 论文第 12–19 页的核心推导链（从 Ribbon 范畴表示到 Kirby 3-流形手术不变性、配分函数良定性与模数据）完全断裂；
  - 多达 **29 个 Entry 孤立**，Gold 审计扣分指出：*“No proof inference concludes the RT main target, so the central Gold dependency chain is absent. Only four proof inferences survive.”*

### 案例 B：`kirby-2018-trisections`（4-流形三分综述）
- **现象**：全文共 32 个 Entry，生成了 **0 条 Inference**。
- **严重后果**：
  - 整个数学地图无任何有向边，所有定理与定义彼此孤立；
  - 产生 26 个孤立 Entry，Gold 审计指出：*“The candidate contains zero inferences, so no narrative or proof dependency structure is represented.”*

### 案例 C：`yasui-2019-geometrically-simply-connected-4-manifolds`
- **现象**：Paper Guide 叙事主线是针对几何单连通正定 4-流形的全局分类主定理（Theorem 1.4），但 Assembly 选了局部技术支撑引理 Theorem 2.3（2-handle neighborhood 消失定理），且未能构建支撑定理通向主定理 1.4 的推导链。
- **严重后果**：Gold 审计指出：*“mainTarget is Theorem 2.3, not the Gold narrative target Theorem 1.4... centered on the wrong theorem.”*

---

## 4. 根因剖析（Root Cause Analysis）

检查 V3.26（在客户端实际继承 V3.14 提示逻辑）的 `assemblyPrompt`，发现导致上述主线丢失与推理收缩的三个核心机制缺陷：

1. **强负向数量压制条款**：
   - 提示词显式包含：`- Inference 总数建议在 30 条以内，只保留论文中明确存在的证明/组织关系。`
   - 这给大模型植入了强烈的“少输出为妙”预期，当面对复杂多分支论文时，模型在输出完前几页微小引理后便草草收场，主动截断后续主线分支。
2. **缺乏建设性的 Paper Guide 主线覆盖正向约束**：
   - 现有提示词中充斥着“防御性禁令”：*严禁将一般推导编码为 Inference*、*未证明的标记为 context_only 或保持 open*、*不要强行将每个 key_result 都塞入 mainTarget 证明中*；
   - **但是**，完全缺乏**正向覆盖指令**：没有明确要求模型必须以 Paper Guide 的 `main_target` 与 `key_result` 为主干，必须为内部主定理及各关键分支输出真实支持的 proof 链。
3. **主目标与内部自证 Claim 的 proof 闭包要求未被置顶**：
   - 模型误以为只要 mainTargetEntryId 填了该 ID 即可，忽略了“若无 proof 支撑，内部 Claim 将在闭包中沦为 open 导致主线全盘失败”的数学后果。
