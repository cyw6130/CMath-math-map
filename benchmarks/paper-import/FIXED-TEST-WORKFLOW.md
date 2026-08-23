# Fixed paper-import benchmark workflow

这是“测试工作流”，与被测的论文导入工作流版本独立。以后升级 `v3.x` 时，不修改本协议。所有 benchmark，包括 Hopf 和 Knot–Hopf–RT，都直接以其 canonical PDF 作为输入。

固定协议同时支持两个显式 subject：

- `luna`：`luna-gateway / gpt-5.6-luna / reasoningEffort=none / off-compact`；
- `deepseek-flash`：`opencode-go / deepseek-v4-flash / reasoningEffort=none / off-compact`。

每个 subject、案例和被测版本组合只运行一次；导入流程内部允许 repair，但同一组合失败后不得原样重跑。原始成功或失败 artifact、manifest 都必须保留。provider 是结果身份的一部分，不能把不同 provider 上同名模型的结果合并。

运行：

```bash
node scripts/run-fixed-paper-benchmark.mjs --subject luna --case cornered-skein-lasagna-theory --workflow v3.41
node scripts/run-fixed-paper-benchmark.mjs --subject deepseek-flash --case cornered-skein-lasagna-theory --workflow v3.41
```

运行器先执行 `pdfinfo` 和单页 `pdftotext` 预检；无效 PDF 标记为 `input-invalid`，不调用 Luna，也不计入模型成功率。有效输入再自动保存：

- Luna 原始 JSON（或 `.failed.json`）；
- 固定测试 manifest；
- 模型调用、耗时和 repair 诊断（在原始 JSON 中）。

评分：

1. 先检查运行是否完成、是否一次通过、耗时是否 ≤300 秒；
2. 运行器自动调用 `scripts/score-paper-import-with-sol.mjs`，由 `gpt-5.6-sol` 基于 `sol-score-prompt-v3` 在隔离环境中仅依据固定 Gold JSON、候选 JSON 与图结构描述指标（`graph-metrics.json`）评分（严格隔离输入，不访问原始论文 PDF、spec、conventions 或审计文件）；
3. `solScore` 是唯一正式分数。固定测试工作流不调用机器 evaluator，也不生成 machineScore；
4. Gold JSON、Gold revision、Prompt 模板版本（`sol-score-prompt-v3`）和本协议均不可因某次模型输出而修改。

也可以对已有产物单独补 Sol 评分：

```bash
node scripts/score-paper-import-with-sol.mjs --case knot-hopf-rt --candidate benchmarks/model-outputs/fixed-1.0/knot-hopf-rt-v3.17-20260818T061626Z.json
```

Sol 必须基于 prompt 模板 `sol-score-prompt-v3` 在严格的 Gold+candidate-only 隔离边界下对照固定 Gold JSON 与图结构指标独立评判 format（10分）、entries（45分）与 inferences（45分），不得访问原始论文或辅助文件。没有 `solScore` 的运行不算 benchmark 完成。300 秒目标只计算论文导入阶段的 `generationDurationMs`，Sol 评分耗时单列为 `scoringDurationMs`。

Kirby 的 Gold、候选 JSON 和历史评分继续保留，但已从固定协议的 active scoring 集退休；以后默认批量评分不再运行 `kirby-2018-trisections`。加入双 subject 后固定协议仍为 `1.3`，Gold revision 保持 `v2`；旧结果只保留为历史记录，不与新协议结果直接混合。
