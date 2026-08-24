# 公开网站复现实验室 Paper Import 工作流

日期：2026-08-25 · 状态：Accepted

## 背景

ADR-0003 把网页切到 Entry v1.31 与 Inference v3.45，却明确把 MinerU、W7.1 与 W8 留在网页之外。结果是实验室与公开网站虽然都显示 V4.1，实际输入和步骤不同：实验室消费 MinerU marked Markdown 并在 Inference 前完成校验补漏，网页则消费 PDF.js 文本并跳过 W7.1/W8。相同标签因此产生不同质量的地图。

本次工作是把已经验证的 Laboratory Workflow 搬到生产网站，不重新设计提示词、补丁语义或数学阶段。

## 决定

1. 公开网站的唯一论文导入入口固定执行：`PDF → MinerU marked Markdown → Entry v1.31 → deterministic consolidation → W7.1 → W8 → Inference v3.45 → Project View/Closure`。
2. MinerU 使用官方精准解析 API。站点凭证只存在 Cloudflare Worker Secret；Worker 只代理受限的上传能力与结果查询，PDF 通过签名地址由浏览器直传 MinerU。
3. Entry、W7.1、W8 与 Inference 继续使用用户在现有界面选择的同一 provider、model、endpoint 与 reasoning 配置；网站不提供或代理模型服务。
4. W7.1/W8 复用实验室脚本的共享 runner、prompt 与 patch 语义。浏览器适配只增加 Canonical Entry 字段、阶段恢复和模型传输接缝。
5. 浏览器按 PDF 内容指纹与完整 Frozen Workflow 身份，把每个阶段的非敏感产物保存到 IndexedDB。只恢复连续完成的阶段前缀；模型 API Key、MinerU Token、Authorization、签名 URL 与模型调用记录不得持久化。
6. 旧的 V4.1 标签不再代表生产生成行为。完整搬迁使用 `V4.1-production-reproduction`，其身份同时包含 MinerU、Entry、整合、W7.1、W8、Inference 与 Project View 版本。
7. 任一阶段失败都显式停止并保留最近安全 checkpoint，不下载伪成功 JSON，也不回退到 PDF.js 或旧简化链路。

## 取舍

- 不保留 PDF.js 作为静默回退，因为它会重新引入与实验室不同的语义输入。
- 不把 MinerU Token 写入静态站点；轻量 Credential Gateway 是无传统后端部署约束下的最小凭证边界。
- 不要求随机模型输出逐字一致；验收对象是步骤、输入合同、版本身份、结构校验与地图可消费性。

## 后果

- 公开网站与实验室首次共享完整生产链，而不只是 Entry/Inference 子集。
- 用户刷新后可恢复任务，但模型阶段恢复时仍需本次会话中的用户凭证。
- 网站发布依赖一个已配置 Secret 与允许来源的 Cloudflare Worker；Worker 未部署时界面必须明确报告 MinerU 服务尚未配置。
- ADR-0003 被本决定取代；ADR-0004 的 Canonical Entry 约束继续有效。
