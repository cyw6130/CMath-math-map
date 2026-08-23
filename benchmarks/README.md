# PDF → 数学地图：转化结果基准库

这里集中管理「论文 PDF → Project View JSON」转化结果的参考资料、权威基准用例与实验模型输出。

论文导入工作流是否晋级，以 `gpt-5.6-sol` 在隔离环境中对照固定 Gold JSON 产生的 `solScore` 为唯一正式分数。确定性图结构指标只作为评分辅助证据，不产生 `machineScore`。

## 1. 论文导入基准用例单一权威（`paper-import/cases/`）

`paper-import/cases/` 是以下 6 个论文导入固定标准答案（Accepted Gold）的**唯一权威归属（Sole Authority）**。上游 `CMath-capabilities` 仅保留可复用的通用能力与合同定义，不再维护具体论文用例：

| 用例目录 | 论文主题 | 核心结构特征 |
| --- | --- | --- |
| `4-dim-skein-modules-handles-tangles` | 4 维 Skein 模、Handle Attachment 与 Tangles | 14 entries / 6 inferences / 4 个 B0 |
| `cornered-skein-lasagna-theory` | 角化 Skein Lasagna 理论 | 18 entries / 8 inferences / 4 个 B0 |
| `kirby-2018-trisections` | Kirby 4-流形三截面 | 27 entries / 6 inferences / 11 个 B0；完整覆盖四页文章 |
| `yasui-2019-geometrically-simply-connected-4-manifolds` | Yasui 几何单连通 4-流形 | 15 entries / 7 inferences / 4 个 B0 |
| `hopf-degree-theorem` | Hopf 度定理 | 29 entries / 16 inferences / 7 个 B0 |
| `knot-hopf-rt` | Knot–Hopf–Reshetikhin–Turaev 推导链 | 37 entries / 19 inferences / 4 个 B0 |

### 状态与人工数学审核说明
- **当前状态**：六个用例当前统一为 **`accepted-gold`**，并进入固定协议的 scoring/promotion 集。
- **Kirby 用例**：直接按 Kirby 四页文章内容提取，不额外要求来源追溯或综述类型分类；它不再是 held-out。
- **审计命令**：运行 `npm run audit:benchmarks`（或 `node scripts/audit-paper-benchmarks.mjs`）可自动对照 `paper-import/source-manifest.json` 校验源 PDF、提取文本 SHA-256 指纹、B0 边界、推导图无环性与各用例元数据完整性。

## 2. 自动化测试基准参考（`paper-import/cases/`）

各基准用例直接由 `benchmarks/paper-import/cases/<caseId>/` 提供单一权威，包含：

**1. Hopf 度定理基准**，位于 `paper-import/cases/hopf-degree-theorem/`：
- `gold-project-view.json`：手工整理的参考地图（29 entries / 16 inferences / 7 个 B0 外部定理，闭包 23 established · 0 open）
- `benchmark-spec.json`：该基准的完整语义规范

验证方式：`tests/paper-import-benchmark.test.mjs` 的 `evaluateHopfPaperBenchmark()`。

**2. Knot–Hopf–RT 基准**，位于 `paper-import/cases/knot-hopf-rt/`：
- `gold-project-view.json`：校订而成的参考地图（37 entries / 19 inferences / 4 个 B0 外部定理，闭包 17 established · 0 open）
- `benchmark-spec.json`：该基准的完整语义规范

验证方式：`tests/knot-hopf-rt-benchmark.test.mjs` 的 `evaluateKnotHopfRtBenchmark()`。

## 3. 模型实验输出（`model-outputs/`）与评测策略

### 轻量评测元数据策略（Benchmark Metadata Policy）
- **默认测试模型**：基准测试默认使用 `luna-gateway / gpt-5.6-luna`，关闭思考，预算为 `8k / 16k / 32k`；DeepSeek Flash 结果保留为历史对照。
- **固定协议版本**：当前为 `workflowVersion: "1.2"`、`goldRevision: "v2"`，评分 prompt 为 `sol-score-prompt-v3`。
- **Gold 晋升机制**：`model-outputs/` 下的模型输出均为实验记录，绝不自动晋升为 Gold；只有经过人工数学审查确认语义与逻辑完备的用例，方可晋升为 Accepted Gold。

### 实验输出记录清单
`scripts/test-paper-import.mjs` 真实调用模型生成的转化记录，含耗时与阶段日志（`seconds` / `stages` / `view`）。
评估状态（2026-08-16 核对）：

| 文件 | 论文 | 模型 | 评估结果 |
| --- | --- | --- | --- |
| `output-hopf map-deepseek-v4-flash.json` | Hopf 度定理 | deepseek-v4-flash | 未通过 gold 基准（B0 缺横截延拓定理；条目数 18 vs 参考 29，明显欠提取） |
| `output-hopf map-deepseek-v4-pro.json` | Hopf 度定理 | deepseek-v4-pro | 未通过 gold 基准（同上） |
| `output-1912.08783v2-…` | 小量子群导出中心 (arXiv:1912.08783v2) | deepseek-v4-flash | 无基准；结构自洽（59 entries / 43 inferences / 0 open） |
| `output-4-DIMENSIONAL SKEIN…` | 4 维 skein 模 | deepseek-v4-flash | 无基准；1 条开放 Claim |
| `output-CORNERED SKEIN LASAGNA…` | 角化 skein lasagna 理论 | deepseek-v4-flash | 无基准；8 条开放 Claim |
| `output-gauge_notes-…` | gauge theory 讲义 | deepseek-v4-flash | 无基准；多条开放 Claim，含本地兜底修复记录 |

注意：「通过本地校验 ≠ 数学内容正确」。以上实验输出只保证结构合法，数学忠实度未经人工核对。

## 4. 评估与审计命令

```bash
# 运行论文导入基准用例结构与来源完整性审计
npm run audit:benchmarks

# 对单份输出做质量体检（规模/闭包/适配器诊断/条目清单）
node scripts/evaluate-output.mjs "benchmarks/model-outputs/output-hopf map-deepseek-v4-flash.json"

# 对 Hopf 输出做 gold 语义基准判定（在 Node 中调用）
#   import { evaluateHopfPaperBenchmark } from './tests/paper-import-benchmark.test.mjs'
#   evaluateHopfPaperBenchmark(view, { isCuratedGold: false })
```
