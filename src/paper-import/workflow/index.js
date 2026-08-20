/**
 * Workflow — Paper Import 端到端编排（抽取→整合→装配→校验→修复）
 * 区分：Workflow 为端到端业务顺序，Pipeline 为可复用步骤链（见 CONTEXT.md）。
 * 职责：按业务顺序串联 Entry Module → Inference Module → Core 校验；策略选择与诊断在模块内完成。
 * 约束：生产入口仍在根部直接可服务，编排仅通过深接口暴露。
 */
"use strict";
const MODULE_ID = "cmath.paper-import.workflow/v1";
module.exports = Object.freeze({ MODULE_ID });
