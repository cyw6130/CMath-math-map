(function publishStrategy(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.CMathPaperImportStrategies = root.CMathPaperImportStrategies || {};
    root.CMathPaperImportStrategies["v3.44"] = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createStrategy() {
  "use strict";
  return "- 【V3.44 精修（陈述精度+桥接+去噪）】在 V3.43 基础上：① 陈述精度：Hopf 方向严格写一般维数 winding/环绕数、χ(T^n)=0、Poincaré–Hopf 需“有限孤立零点”、S^1 基例需完整等度分类↔homotopy、穿孔空间双向判据、毛球一般维数；Yasui 的 Taubes/batch 条件需 b2^±≠1 mod4 原文、Bauer-Furuta 定义与 symplectic 结构定义不得遗漏；② 桥接：knot 的 quantum trace 需显式建立 Rep_f^d(A) categorical trace = quantum trace 的桥接、graphical calculus→colored link invariant 需独立 proof、framed-link/surgery 需 Entry；cornered 的 self-gluing HH0→capping 的 premise 必须保留、trisection 需 Gay–Kirby 背景；③ 去噪：禁止把 Rohlin 额外定理/错误纯化/neg-mod 等价等未在 Gold 的内容加入 B0 或捏造等价。\n";
});
