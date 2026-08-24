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
  return "- 【V3.44 精修（陈述精度+桥接+去噪）】在 V3.43 基础上：① 陈述精度：Hopf 方向严格写一般维数 winding/环绕数、χ(T^n)=0、Poincaré–Hopf 需“有限孤立零点”、S^1 基例需完整等度分类↔homotopy、穿孔空间双向判据、毛球一般维数；Yasui 的 Taubes/batch 条件需 b2^±≠1 mod4 原文、Bauer-Furuta 定义与 symplectic 结构定义不得遗漏；② 桥接：knot 的 quantum trace 需显式建立 Rep_f^d(A) categorical trace = quantum trace 的桥接、graphical calculus→colored link invariant 需独立 proof、framed-link/surgery 需 Entry；cornered 的 self-gluing HH0→capping 的 premise 必须保留、trisection 需 Gay–Kirby 背景；③ 去噪：禁止把 Rohlin 额外定理/错误纯化/neg-mod 等价等未在 Gold 的内容加入 B0 或捏造等价。\n"
    + "- 【V3.44 Canonical Inference 语义】① 自足 proof 允许 premises=[]，但 argument 必须记录完整数学论证；空前提 proof 不是 B0，不得当作外部公理。② Claim 间的循环 proof 必须保留，用于表达等价或互推；若循环没有外部已建立入口，其中各 Claim 在 Closure 中保持 open，严禁删除循环或以循环自证。③ B0 仅包含论文直接调用、且未在正文证明的外部 Claim；外部 Claim 若被正文重新证明、正文提出但未证明的 Claim、以及所有 Fact 都不得进入 B0，Fact 永不进入 B0。\n";
});
