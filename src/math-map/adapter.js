/**
 * Map Integration Adapter — Project View → 可渲染模型
 * 薄封装：根部 math-map-project-adapter.js 为生产适配实现，此处为功能目录的契约入口，负责文档与未来迁移。
 * 供 Benchmark 挑选出的 Project View 进入地图后的版本化产物链路演示。
 */
"use strict";
const ADAPTER_ID = "cmath.math-map.adapter/v0.1";
module.exports = Object.freeze({ ADAPTER_ID });
