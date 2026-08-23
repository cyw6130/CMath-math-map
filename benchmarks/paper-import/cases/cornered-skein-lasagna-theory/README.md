# Cornered Skein Lasagna Theory

## 基准信息
- **源文件**: `CORNERED SKEIN LASAGNA THEORY.pdf`
- **作者**: Sarah Blackwell, Vyacheslav Krushkal, Yangxiao Luo
- **年份**: 2024 (arXiv:2404.02058)
- **总页数**: 20 页
- **基准目标**: `paper:thm:gluing-bimodules` (定理 3.8：带角 4-流形双模张量积粘合定理)

## 范围与语义切片
本基准构建了带角 4-流形、自粘合与三截面表示的完整范畴化骨架：
1. **核心定义 (Facts)**:
   - 带边 3-流形范畴 $\mathcal{S}(Y, P)$ (定义 2.4，第 4 页)
   - 带角 4-流形双模 $\mathcal{F}_{X, P}$ (定义 3.1，第 5 页)
   - 双模张量积 $\mathcal{F}_{X_1, P} \otimes_{\mathcal{S}(Y_2, P)} \mathcal{F}_{X_2, P}$ (定义 3.6，第 6 页)
   - 自粘合零阶 Hochschild 同调 $HH_0(\mathcal{F}_{X, P})$ (定义 3.12，第 11 页)
   - 4-流形三截面与三截面图 $(\Sigma_g; \alpha, \beta, \gamma)$ (定义 3.17 & 3.18，第 13-14 页)
   - 闭曲面 2-范畴 $\mathcal{S}(\Sigma)$ (定义 4.1，第 14-15 页)
2. **外部前置依赖 (B0 Claims)**:
   - Morrison–Walker–Wedrich 4-流形 Skein Lasagna 模基础 (MWW 2022)
   - Ren–Willis 满同态填充粘合映射 $\hat{\tau}$ (RW 2024)
   - Banyaga 微分同胚群局部化分割引理 (Banyaga 1997)
   - Gay–Kirby 4-流形三截面存在与稳定唯一性定理 (Gay–Kirby 2016)
3. **推导主干定理 (Derived Claims)**:
   - 引理 3.7: 填充粘合同构引理 (奇异事件分解与等痕无关性)
   - 定理 3.8: 带角 4-流形双模张量积粘合定理 $\mathcal{F}_{X_1, P} \otimes_{\mathcal{S}(Y_2, P)} \mathcal{F}_{X_2, P} \cong \mathcal{F}_{X_1 \cup_{Y_2} X_2, P}$
   - 定理 3.14: 4-流形自粘合定理 ($HH_0$ 刻画 $\bar{X}_0$)
   - 定理 3.15: 填补中心曲面邻域与 $\sim_3$ 恢复闭流形 Skein 模
   - 推论 3.19: 三截面闭 4-流形的 Skein Lasagna 模张量积与 $HH_0$ 计算框架
   - 定理 4.7: 2 维扩张 3-流形范畴粘合定理 $\mathcal{S}_Y \cong \mathcal{S}_{Y_1} \otimes_{\mathcal{S}(\Sigma)} \mathcal{S}_{Y_2}$

## 尚未纳入基准的细化内容
- 具体三截面图下高亏格曲面的代数显式表示与矩阵元分解。
- 高维 2-范畴相干同构的详细图演算化简细节。
