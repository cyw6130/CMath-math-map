/**
 * Math Map — 数学地图模型与存储
 * 边界：Map Integration 消费 Project View（见 CONTEXT.md Project View / Map Integration）。
 * 职责：承接 Benchmark 产出的 Project View（B0/mainTarget/Entry/Inference），派生闭包、适配渲染与存储。
 * 约束：版本迭代归属 Benchmark，挑选出的成品 Project View 进入地图后成为版本化产物；此处不触 Benchmark 评分逻辑。
 */
"use strict";
const MODULE_ID = "cmath.math-map/v1";
const CAPABILITY_ID = "cmath.math-map/v1";
module.exports = Object.freeze({ MODULE_ID, CAPABILITY_ID });
