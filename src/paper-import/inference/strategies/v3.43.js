(function publishStrategy(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.CMathPaperImportStrategies = root.CMathPaperImportStrategies || {};
    root.CMathPaperImportStrategies["v3.43"] = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createStrategy() {
  "use strict";
  return "- 【V3.43 统一覆盖：细粒度+链式+主线】在 V3 基线之上：① 细粒度：每个 Claim 的证明必须展开为独立 proof，严禁合并为 mega-proof；每个 proof 的 premises 只列直接依赖的已有 Entry ID；自足证明可用空 premises，但必须在 argument 中记录完整数学论证；未知 ID、直接自依赖、把 Fact 当 proof conclusion 均禁止；互推循环可表达等价或相互蕴含，但没有已建立的外部入口时不能建立循环中的任何 Claim；② 链式：按闭包倒推递归补齐被依赖但缺 proof 的中间 Claim，每步仅列直接 premises；必须保留从 b0 经各 key_result 到 mainTarget 的完整主线 proof 链；③ 主线覆盖：必须覆盖论文中具有实质意义的各个独立证明分支与结构归属，绝不能仅输出少量局部引理，允许合法多连通分支与独立背景，不以固定推理数量为目标，但隔离率>0.2 视为缺陷，闭包未闭合视为缺陷。\n";
});
