/**
 * Core — 论文导入核心校验与修复收口（Closure/B0/主目标校验）
 * 边界：对应 CONTEXT.md Closure/B0，主责校验 proof 结论只能是 Claim、Fact 不可作 conclusion 等。
 * 职责：Inference 装配后的结构校验、闭包一致性检查、fixedEntries 补齐；细节在模块内部收口，外部仅通过深接口消费。
 * 约束：#4 后核心校验不再散落在根部条件分支，统一由 core 承接；Project View schema 与消费者契约不变。
 * 迁入：#10 将 validation 抽至 ./validation.js，根部 paper-import-client.js 保留薄转发
 */
"use strict";
const validation = require("./validation.js");
const MODULE_ID = "cmath.paper-import.core/v1";
module.exports = Object.freeze({ MODULE_ID, ...validation });
