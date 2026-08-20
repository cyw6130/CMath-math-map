(function publishStrategy(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.CMathPaperImportStrategies = root.CMathPaperImportStrategies || {};
    root.CMathPaperImportStrategies["v3.45"] = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createStrategy() {
  "use strict";
  return "- 【V3.45 校正（陈述精度回补+去重）】在 V3.44 基础上针对 Sol 回退做最小校正：① Hopf：winding 定义必须写一般维数 S^{n-1}→S^{n-1} 不固定为 S^1；χ(S^n)=1+(-1)^n，χ(T^n)=0 严禁写 χ(T^k)=-2(k-2)；横截外部定理必须是一般版本（边界固定延拓+一般横截同伦）而非仅零截面特例；引理 base-s1 必须完整陈述任意整数度分类 deg:[S^1,S^1]≅Z 由 z↦z^n 实现且零伦当且仅当度为零；穿孔空间需显式维数归纳假设，present R^n\\{0}≃S^{n-1} 双向判据，禁止由 S^1 直接跳到任意 k 且禁止以欧氏鼓包直接充当 S^k 延拓；Poincaré–Hopf 需“有限孤立零点”条件；毛球需一般维数结论。② Yasui：Taubes b2^+>1 需补典范 spin^c 与 SW=±1（mod2=1）；2-把手邻域类是“可由邻域内2-循环代表”而非单个生成元之像；定理2.4/1.9必须为 b2^+ not≡1(mod4) 且 b2^- not≡1(mod4) 禁止替换为 b2^+≤1、b2≡1；必须补 Bauer–Furuta 不变量定义、辛结构定义、辛 Betti 奇偶性 B0；禁止重复建立 Lemma2.6/3.1/Cor2.5 等价条目。③ 去重与桥接保持 V3.44 要求，knot 的 negligible 仅“所有自同态量子迹为零”不捏造单迹等价，Rohlin/附加 Jones 等 Gold 外内容禁入 B0。\n";
});
