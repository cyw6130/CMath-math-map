# 01: Entry Module `v1.31` prompt 适配新格式

**What to build:** `paper-raw-entry-pool-v1.js` 的 `v1.31` prompt 输出 `entryClass + factKind/claimKind`，不再提 `type`。`artifact.entries` 与新格式一致。

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `v1.31` prompt 中所有 `type` 替换为 `entryClass + factKind/claimKind`
- [x] `paper-raw-entry-pool-v1.js` 的 `extract` 函数输出新格式
- [x] `tests/paper-entry-extraction.test.mjs` 验证 `v1.31` prompt 新格式
- [x] 全量测试 `node --test tests/paper-entry-extraction.test.mjs` 绿
