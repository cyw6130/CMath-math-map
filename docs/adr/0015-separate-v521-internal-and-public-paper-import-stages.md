# V5.2.1 分离 Paper Import 内部操作与公共阶段

日期：2026-08-31 · 状态：Accepted

## 背景

V5.2 的第二次模型调用把内部操作名 `audited-patch-repair` 直接传给网站模型网关；网关只接受稳定公共阶段 `repair`，因此在模型收到提示词前以 `unsupported Paper Import stage` 失败。Workbench 也独立硬编码了旧 V5.1 阶段与次数，并静默忽略未知阶段。

## 决定

1. V5.2.1 保持提示词和恰好两次模型调用不变。
2. Canonical Workflow 分别记录内部 `operation`、公共 `publicStage` 与网关 `transportStage`；正常审修和恢复审修都以公共阶段 `repair`、传输阶段 `repair` 执行。
3. Production Facade 发布唯一的 V5.2.1 公共进度表：MinerU → 生成 → 统一审修 → 最终校验。Workbench 只消费该进度表，不再自行定义版本和业务阶段。
4. Workbench 对未知公共阶段显式失败，不再静默忽略。
5. 正常审修与恢复审修都必须通过真实模型网关适配的回归测试。

## 后果

内部审修策略可以继续演化，而不会改变网关安全合同或前端阶段标识。网站模型调用稳定为 `assemble → repair`；提示词身份仍为 `canonical-map-v5.2-zh-default-atomic-repair-v28-disposition-receipt`，生产合同提升为 `production-canonical-paper-import/v1.1`。
