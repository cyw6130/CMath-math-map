# 02: Inference Module `v3.44` 策略建立

**What to build:** `src/paper-import/inference/strategies/v3.44.js` 基于 `v3.43` 修改 prompt，明确 `proof` 空前提+完整 `argument`、Claim 循环、B0 边界。`Project View` 的 `Inference` 符合 `CONTEXT.md`。

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `v3.44.js` prompt 明确 `proof` 空前提需完整 `argument`
- [x] `v3.44.js` prompt 明确 Claim 循环 `proof` 保留，`Closure` 中无外部入口时保持 `open`
- [x] `v3.44.js` prompt 明确 `B0` 仅含外部未证明 Claim，Fact 永不进 B0
- [x] `tests/paper-import-client.test.mjs` 验证 `v3.44` prompt 新约束
- [x] 全量测试 `node --test tests/paper-import-client.test.mjs` 绿
