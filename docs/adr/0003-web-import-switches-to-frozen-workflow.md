# 网页论文导入接入冻结工作流（V4.1），删除旧简化链路

日期：2026-08-24 · 状态：Superseded by ADR-0005

## 背景

网页端"论文解析工作流"长期运行一条与 Benchmark 平行的旧链路：`paper-import-client.js` 内置的通用 `entriesPrompt` 分段抽取 → 一次轻量语义整合（`integrateEntries`）→ `workflowVersion: "v1"` 装配。该链路从未参与 Benchmark 迭代，质量远落后于冻结组合；同时它的存在使"Entry/Inference 分开优化 → 冻结 → 发布"的流程无法触达最终用户。

## 决定

1. **网页与 Benchmark 共用同一实现**：`requestPaperProjectView` 内部改为
   - Entry：`CMathPaperRawEntryPoolV1.extractParallelRawEntryPool`，`extractionModuleVersion = paper-entry-parallel-extraction-v1.31`
   - 整合：`CMathPaperEntryConsolidationV1.consolidateRawEntryPool`（确定性、零模型调用）
   - Inference：`requestPaperInferenceFromEntryArtifact`，`workflowVersion = v3.45`（冻结标签 `v4` 的运行时 prompt 系）
2. **版本收口**：组合标签到运行时串的映射集中在 `FROZEN_WORKFLOW` 常量（client 导出）。下次冻结升级只改该常量。
3. **失败显式抛错**：任何阶段失败直接终止并报错，不回退旧链路；旧管线代码（内联抽取/整合/装配 v1 副本）随之删除。
4. **模型不设白名单**：prompt 与模型解耦，用户照常自选 provider/model；质量差异由 Benchmark 度量。
5. **验证补全层（W7/W8 B0 backfill）不上网页**：它依赖服务端 Spark 代理与预处理文本，冻结定义亦只含两层；留待二期以服务端端点形态接入。
6. **进度适配为最小变更**：仅透出新阶段文案（frozen-workflow / parallel-extract-* / consolidate），布局与交互不变。

## 取舍

- 曾考虑渐进式双链路并存（新链路失败回退旧的）：被否决——静默降级产出低质量地图且双倍维护成本。
- 曾考虑把 verify 层一并搬上网页：被否决——输入依赖（marked 文本、服务端 key）在浏览器不可得，硬搬需重设计。
- 运行时串选 `v3.45` 而非 `v3.26` 基线或迭代变体 `v3.26-inference-v3`：83.8 分证据链对应 v3.45 系 prompt；迭代变体是单案调优，未进入冻结。

## 后果

- 正面：用户在网页直接获得 V4.1 质量；发布管道成型——benchmark 优化 → 冻结 → 改一行常量即上线。
- 负面：导入调用次数随窗口数增加（成本上升）；装配行为对弱模型更敏感（有修复循环兜底 + sanitize 兜底）；旧链路的容错路径消失，失败必须被用户看见。
