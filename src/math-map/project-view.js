/**
 * Project View — Benchmark 与 Map Integration 的契约缝
 * 定义：见 CONTEXT.md Project View，手选的满意版本成品包（含 Entry/Inference/B0/mainTarget）。
 * 归属：版本迭代 ∈ Benchmark，产出 Project View；Map Integration 负责消费 Project View（适配、闭包派生、渲染、存储）。
 * 文档与测试以此缝为边界，适配与渲染改动不误触 Benchmark 评分。
 */
"use strict";
const SCHEMA_ID = "cmath.project-view-model/v0.1";
const CAPABILITY_ID = "cmath.project-view/v0.1";
module.exports = Object.freeze({ SCHEMA_ID, CAPABILITY_ID });
