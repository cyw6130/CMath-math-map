/**
 * Map Integration Adapter — Project View → 可渲染模型
 * 契约：Benchmark 产出 Project View（schema cmath.project-view-model/v0.1），Map Integration 消费并适配
 * 薄封装：根部 math-map-project-adapter.js 为生产实现，此文件为功能目录契约入口，负责文档与未来迁移
 * 演示：Benchmark 挑选出的成品 Project View 进入地图后的版本化产物链路（见 CONTEXT.md Project View）
 */
"use strict";
let rootAdapter = null;
try { rootAdapter = require("../../capabilities/browser/math-map-project-adapter.js"); } catch {}
const ADAPTER_ID = rootAdapter?.CAPABILITY_ID ?? "cmath.math-map.adapter/v0.1";
const SCHEMA_ID = "cmath.project-view-model/v0.1";
module.exports = Object.freeze({ ADAPTER_ID, SCHEMA_ID, rootAdapter });
