/**
 * Entry Module — 负责提取与规整 Entry（Fact/Claim）
 * 边界：对应 CONTEXT.md Entry Module，对应 src/paper-import/entry/
 * 职责：论文 → Entry 目录（definition|algorithm|calculation / lemma|proposition|theorem）
 * 约束：与 Inference Module 分离，两条优化链独立迭代；#4 收口后此模块为 Entry 唯一入口。
 * 薄转发：根部 paper-entry-*.js 保留为 deprecated re-export，内部调用方已迁至此。
 */
"use strict";
const MODULE_ID = "cmath.paper-import.entry/v1";
module.exports = Object.freeze({ MODULE_ID });
