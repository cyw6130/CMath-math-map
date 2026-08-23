# V3.26 Inference 模块 Assembly 提示词改进候选 (Prototype)

## 1. 概述与定位

本目录为 **CMath-math-map** 论文导入系统中 **V3.26 Inference 模块** 的最小 Assembly 提示词改进候选原型。

- **角色定位**：本提案由执行者角色整理，仅提出候选方案、提供数据证据与风险评估，**不自行决定落地**，等待决策者评估。
- **改动范围**：严格限制在 `prototypes/v326-inference-assembly-candidate/` 目录内，**禁止且未修改任何生产文件、V3.26 原分支、Entry 模块、Format 模块、Gold 审计基准、Sol 评分协议或 package.json**。
- **优化原则**：
  1. **零新增模型调用**：不引入额外的 Review、多轮迭代或辅助通道，保持单次 Assembly 调用的经济性与低延迟；
  2. **零 Entry 变更**：完全复用冻结的 `cmath.paper-entry-artifact/v1` 输入；
  3. **最小聚焦**：仅针对 Assembly 提示词进行精准微调，重点解决 Paper Guide 主线分支覆盖不足、主目标无 proof 悬空与孤立 Entry 问题。

## 2. 目录文件清单

| 文件 | 说明 |
| :--- | :--- |
| `candidate.md` | 最小 Assembly 提示词改进候选的完整技术方案与 Prompt 逐行对比 |
| `candidate.patch` | 面向 `paper-import-client.js` 的标准 Git Diff 补丁原型 |
| `evidence.md` | 基于 V3.26 实测 6 大基准案例输出的孤立 Entry、证明缺失与 Gold 审计扣分证据分析 |
| `risks-and-mitigations.md` | 针对 Token 预算、证明幻觉、循环依赖及后置修复的风险评估与应对策略 |
| `verify-candidate.mjs` | 可独立运行的回归与格式兼容性自动化验证脚本（不写生产文件） |

## 3. 运行验证命令

```bash
# 运行候选原型独立验证脚本
node prototypes/v326-inference-assembly-candidate/verify-candidate.mjs

# 运行生产模块化回归（确保无任何生产破坏）
node --test tests/paper-import-modules-v3.26.test.mjs
```
