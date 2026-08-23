# 4-Dimensional Skein Modules, Handle Attachments, and Tangles

## 基准信息
- **源文件**: `4-DIMENSIONAL SKEIN MODULES, HANDLE ATTACHMENTS, AND TANGLES.pdf`
- **作者**: Gage Martin, Mary Stelow, Mira Wattal
- **年份**: 2026 (arXiv:2602.17825v1)
- **总页数**: 10 页
- **基准目标**: `paper:thm:gluing-isomorphism` (定理 4.1：一般双模张量积粘合定理)

## 范围与语义切片
本基准提炼了论文关于 4 维流形在边界带有特征 3-流形时的 Skein Lasagna 模扩展理论：
1. **核心定义 (Facts)**:
   - 函子性链环同调理论 $\mathcal{H}_*$ 的公理化假设 (第 2 页)
   - 参数化三元组 $(X; (Y, \phi); T)$ 的 Skein Lasagna 模 $\mathcal{S}_*(X; Y; T)$ (定义 3.1，第 2 页)
   - 3-流形 $Y$ 与边界点集 $P$ 伴随的代数 $\mathcal{S}_*(Y; P)$ 及垂直乘法 (定义 3.3，第 2 页)
   - 双模粘合同态 $\Psi: \mathcal{S}_*(X_1; Y; T_1) \otimes_{\mathcal{S}_*(Y; P)} \mathcal{S}_*(X_2; Y; T_2) \to \mathcal{S}_*(X; T_1 \cup_P T_2)$ (第 6 节，第 6 页)
2. **外部前置依赖 (B0 Claims)**:
   - Morrison–Walker–Wedrich 4-流形 Skein Lasagna 模定义 (MWW 2022)
   - 3-流形代数与 4-球模的评估同构 (Lemma 3.6 / MWW 2022)
   - Khovanov 缠结双模复形函子 (Khovanov 2002)
   - Ren–Willis 余维 0 边界子流形满同态粘合映射 (Ren–Willis 2025)
3. **推导主干定理 (Derived Claims)**:
   - 引理 3.6: 3-流形代数评估同构与双模结构
   - 引理 3.9: 缠结 Skein 模与 Khovanov 缠结不变量的同构
   - 定理 4.1 / 1.4: 一般双模张量积粘合定理 (General Gluing Isomorphism)
   - 定理 1.1 / 示例 5.1: 1-Handle 附加公式 ($HH_0$ 刻画)
   - 定理 1.2 / 示例 5.2: 2-Handle 附加公式 (线缆化与子代数作用)
   - 定理 1.3 / 示例 5.3: 3-Handle 附加公式 (商模刻画)

## 尚未纳入基准的细化内容
- 具体投影图计算下的高阶拓扑形变详细步骤。
- 更多一般非连通边界配景与复杂多把手分解链的精细代数刻画。
