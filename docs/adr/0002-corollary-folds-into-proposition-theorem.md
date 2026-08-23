# Corollary 不作为独立 Entry 类型，折叠进 lemma/proposition/theorem

日期：2026-08-24 · 状态：Accepted

## 背景

`v1.25` Entry Module 实验曾把 `type: "corollary"` 设为独立类型（`paper-entry-parallel-extraction-v1.25`，见 `tests/entry-v125-corollary-type.test.mjs`），并出现模型拼写变体 `collary`。这违反唯一能力权威 `CMath-capabilities → math-graph-semantics-v2` 的语义契约（`math-map-project-adapter.js`：`CLAIM_KINDS = lemma|proposition|theorem`），导致候选 Project View 与 Gold 在契约校验处失败，且触发了一次越界的 Gold 修复。

## 决定

1. **Claim.claimKind 永远只有 6 类型中的 3 个**：`lemma | proposition | theorem`；Fact 侧仍为 `definition | algorithm | calculation`。
2. **推论身份靠命名承载**：原文标注为 Corollary/推论 的陈述，提取为 `proposition` 或 `theorem`，并在 `title/displayLabel/shortTitle` 中保留 "Corollary/推论" 字样与原编号（如 "推论 1.5 (Corollary 1.5)"）。
3. **不新增类型枚举**：任何 prompt 实验（v1.36+、Inference Strategy 新版本）不得引入第 7 种类型；需要新类型时先改 `CMath-capabilities` 上游契约，经 `npm run sync-capabilities` 同步后方可使用。
4. **v1.25 永久封禁**：从 `VALID_EXTRACTION_MODULE_VERSIONS` 白名单剔除，入口对 `-v1.25` 请求直接抛错（`tests/entry-v125-blocked.test.mjs` 为守卫测试）；函数体仅作历史保留并标注 DEPRECATED。
5. **评分容错**：Sol 评分按标题中的 Corollary 字样识别推论身份等价性，不要求候选复现独立类型字段。

## 后果

- 正面：Gold 与候选共享同一可校验类型空间，契约校验不再因推论类条目误报；拼写变体（collary/corollay）由归一化层吸收为 proposition/theorem。
- 负面：地图上无法在数据层面区分"推论"与"命题"，只能靠显示名。若未来确需结构化推论标记，应走上游能力包新增可选元数据字段（如 `derivedFrom`），而非类型枚举。
