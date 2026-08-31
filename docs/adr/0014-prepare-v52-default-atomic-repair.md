# 冻结 V5.2 默认原子审修候选并准备网站发布

日期：2026-08-31 · 状态：Accepted（Exceptional release authorized）

## 决定

网站候选冻结为 `canonical-map-v5.2-zh-default-atomic-repair-v28-disposition-receipt`。公开流程保持两段式架构，但固定恰好两次同模型调用：第一次生成完整 Canonical Math Map；第二次逐对象审查能力合同、来源忠实性、数学语义和 LaTeX 格式，并只提交有来源证据的原子修改。

可寻址初稿无论合同是否已通过都进入第二次调用。不可寻址的初稿在同一次末次调用中先恢复为 `recoveredMap`，再返回原子修改；不增加第三次调用。每个现有 Entry 与 Inference 必须各有一条 `clean | finding` 处置回执。合法原图在补丁无效或造成回归时保留原图；非法原图若一次审修后仍不合法则显式失败。

生成提示词增加通用 LaTeX 定界规则。审修不得参考 Benchmark Gold、评分结果、已知测试错误或论文特例；不得整图重写、润色或顺手修改无关对象。

## 证据与发布边界

冻结实验 Candidate 053 的三篇配对测试均合同合法且格式干净，0 fabrication、0 提示词泄露；相对 Candidate 052，失真对象从 6 降至 5，平均语义准确率从 0.948419797257 升至 0.956171735241。该证据不是新的完整端到端十篇测试，4-dim-skein 的一个已知失真仍未修复，恢复分支也没有 Benchmark 实测证据。

本 ADR 只授权将冻结行为移植成网站发布候选并运行本地发布检查，不授权推送、部署或切换线上默认版本。实际发布仍需遵守 ADR-0009 的预览与最终单独授权。

## 上线前固定集结果

补齐此前未测的七篇后，十篇合并证据为：10/10 合同合法、10/10 格式干净、0 fabrication、未检出提示词泄露，但只有 2/10 source-clean，共 24 个失真对象，平均语义准确率 0.9446741097971。Keevash 单篇有 8 个失真；Frick–Wellner 成功实测了同次恢复与原子修复分支。完整摘要见 `benchmarks/paper-import/experiments/v52-predeploy-ten-case-summary.json`。

因此该候选没有通过原定内容门槛。用户随后在本地 Product Runtime 中逐张查看了七篇真正由 V5.2 端到端生成的地图；预览卡片明确标记为 `V5.2`，七张均通过前端结构校验。用户在知悉上述内容风险后，于 2026-08-31 明确授权将该候选作为例外版本上线。该授权不把 V5.2 追认为 Benchmark Winner，也不改变 Keevash 等已记录问题；上线后仍按 ADR-0009 的回退规则处理可复现的硬故障、fabrication、distortion 或主证明链破坏。
