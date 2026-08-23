# V3.26 模块化拆分

V3.26 现在按三个可独立冻结、替换和测试的模块组织。这里是对历史 V3.26 的适配层，不是新的论文导入工作流；历史分支、Gold 和评分协议保持不变。

## Luna V3.26 Entry 历史基线

`benchmarks/paper-import/entry-module/luna-v3.26-entry-baseline.json` 登记了六个已有的 Luna V3.26 完整工作流结果，并只取其 `view.entries` 做 Entry 对比。评分来自既有 Sol Entry 评分 artifact；不重新读取 PDF，不修改 Gold，也不把 Inference 计入 Entry 分数。

| 案例 | Entry 数 | Sol Entry Score |
|---|---:|---:|
| Knot–Hopf–RT | 44 | 38/45 |
| Hopf 度定理 | 37 | 41/45 |
| 4D Skein Modules | 39 | 44/45 |
| Cornered Skein Lasagna | 29 | 41/45 |
| Yasui 2019 | 28 | 40/45 |
| Kirby Trisections | 32 | 35/45 |

这个基线用于后续 Entry 优化的横向参照；生产默认仍是本文件下方冻结的 `paper-entry-parallel-extraction-v1.7`。V3.26 的完整工作流 artifact 与独立 Entry artifact 不混合比较。

```text
冻结的全文/Entry artifact
        │
        ├── Entry Module      → entry-artifact.json
        │                         （论文对象、类型、陈述、页码）
        │
        ├── Inference Module  → inference-artifact.json
        │                         （B0、mainTarget、Inference、证明依赖）
        │
        └── Format Module     → format-report.json
                                  （确定性结构门槛）
```

## 三个模块的边界

### Entry

复用 `cmath.paper-entry-artifact/v1` 和既有双通道提取/整合结果。该模块只负责把 PDF 中的数学对象提取为可追溯的 Entry，并带上 `moduleMetadata` 以便冻结和复用。

后续只建议做小修：

- 修正同一对象跨页重复时的合并和别名；
- 保留真实页码、来源和公式，不在 Entry 阶段生成 Inference；
- 用已有 Entry artifact 重复测试 Inference，避免每轮重新读 PDF。

### Inference

复用 `scripts/run-paper-inference-from-entry-artifact.mjs`。它只读取冻结的 Entry artifact，生成 `B0`、`mainTargetEntryId` 和 Inference。

这是目前最值得优化的模块。V3.26 结果显示，主要损失来自孤立 Entry 和缺失的主线证明边，而不是 Entry 数量本身。后续小修优先级为：

1. Assembly 提示中更清楚地区分“论文主线”与背景对象；
2. 保留 Paper Guide 指出的每条关键分支，不只围绕单一 main target 收敛；
3. repair 只补缺失的关系和 proof closure，不重写已经正确的 Entry；
4. 以冻结 Entry artifact 做复用实验，单独比较 Inference 变化。

不在此模块中重新提取 Entry，也不加入事后 Review。

### Format

`paper-import-modules-v3.26.js` 中的 `validateFormatArtifact` 是纯确定性检查，不调用模型。它检查 JSON、Entry 唯一性和必要字段、公式定界符、Inference 引用、`mainTarget`、`B0`，以及两条关系不变量：

- `proof` 的 conclusion 必须是 Claim；
- `organization` 只能连接 Fact。

Format 报告保持历史 `40/40` 诊断尺度；关系不变量是零权重的硬门槛诊断，不改变 Sol 语义分数。

## 命令

```bash
# 只检查已有 JSON 的结构
npm run paper:format -- input.json format-report.json [caseId]

# 从冻结的 Entry artifact 复用 Inference，再生成 Format 报告
npm run paper:modular -- entry-artifact.json output-dir [model] [mode]

# 仅运行模块回归
node --test tests/paper-import-modules-v3.26.test.mjs
```

模块化运行会写出：`entry-artifact.json`、`inference-artifact.json`、`format-report.json` 和 `run-manifest.json`。每个产物都保留模块版本和 V3.26 backbone，便于后续只替换一个模块。
