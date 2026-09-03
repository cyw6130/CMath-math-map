# 将 CMath 提供的模型切换到 Muse Spark 1.3

日期：2026-09-03 · 状态：Accepted

## 背景

OpenCode Go 已提供 Muse Spark 1.3 Contributor。CMath 当前受保护模型网关仍固定使用 Muse Spark 1.2 Contributor。

## 决定

1. CMath 提供的固定模型切换为 Muse Spark 1.3 Contributor，准确模型 ID 为 `muse-spark-1.3-contributor`。
2. 上游继续使用 OpenCode Go Responses API；网关请求合同、来源限制、Secret、安全边界和故障降级保持不变。
3. Contributor 训练用途披露与主动同意保持不变。

## 后果

- 本决定只取代 ADR-0008 中 Muse Spark 1.2 的模型版本和模型 ID；ADR-0008 的其余决定继续有效。
- 回退只需同时恢复网关固定模型、前端展示与对应测试，不得静默切换。
