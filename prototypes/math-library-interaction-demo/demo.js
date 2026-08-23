/* ============================================================================
   CMath Math Map · Library & Fast Switcher Interaction Prototype
   Runtime Logic & State Engine (Paper Grotesque Edition)
   ============================================================================ */

(() => {
  "use strict";

  // Local Storage Keys
  const STORAGE_ORDER_KEY = "cmath_demo_library_order_v1";
  const STORAGE_IMPORTED_KEY = "cmath_demo_imported_status_v1";
  const STORAGE_RENAMES_KEY = "cmath_demo_renamed_titles_v1";

  /* --------------------------------------------------------------------------
     1. Inline SVG Icons Registry (No Emojis)
     -------------------------------------------------------------------------- */
  const ICONS = {
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    warning: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    error: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    reorder: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="7 11 12 6 17 11"></polyline><polyline points="17 13 12 18 7 13"></polyline></svg>`,
    bolt: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    search: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    reset: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`
  };

  /* --------------------------------------------------------------------------
     2. Unified Math Maps Catalog / Registry
     -------------------------------------------------------------------------- */
  const MAPS_REGISTRY = {
    // 1. Curated Demos (Fixed 3)
    "spectral-theorem": {
      id: "spectral-theorem",
      title: "从特征值到谱定理",
      boundary: "高等代数示例 · 数学地图与 Loop 进展",
      source: "demo",
      sourceLabel: "DEMO",
      section: "curated",
      stats: "15 节点 · 5 步证明推演",
      accent: "#0E7C66",
      nodes: [
        { id: "def:1", kind: "def", badge: "定义 1", title: "实内积空间 (V, ⟨·,·⟩)", math: "⟨u, v⟩ = ⟨v, u⟩, ⟨u, u⟩ > 0 (u ≠ 0)", x: 120, y: 140, deps: [] },
        { id: "def:2", kind: "def", badge: "定义 2", title: "线性算子与伴随算子", math: "⟨T(u), v⟩ = ⟨u, T*(v)⟩", x: 120, y: 320, deps: [] },
        { id: "def:3", kind: "def", badge: "定义 3", title: "自伴算子 (Self-Adjoint)", math: "T = T*, 即 ⟨Tu, v⟩ = ⟨u, Tv⟩", x: 380, y: 140, deps: ["def:1", "def:2"] },
        { id: "lem:1", kind: "lem", badge: "引理 1", title: "特征值的实数性", math: "λ ∈ ℝ (若 T = T*)", x: 380, y: 320, deps: ["def:3"] },
        { id: "lem:2", kind: "lem", badge: "引理 2", title: "正交补的不变子空间", math: "T(W) ⊆ W ⟹ T(W^⊥) ⊆ W^⊥", x: 640, y: 140, deps: ["def:3"] },
        { id: "proof:1", kind: "proof", badge: "推演", title: "归纳降维构造", math: "dim(W^⊥) = dim(V) - 1", x: 640, y: 320, deps: ["lem:1", "lem:2"] },
        { id: "thm:1", kind: "thm", badge: "定理 1", title: "有限维谱定理", math: "V = ⊕ E(λ_i), 存在正交规范特征基", x: 900, y: 230, deps: ["proof:1"] },
        { id: "claim:1", kind: "claim", badge: "开放 Claim", title: "无穷维紧自伴推广", math: "Hilbert-Schmidt 紧算子谱分解", x: 1140, y: 230, deps: ["thm:1"] },
      ],
      edges: [
        { from: "def:1", to: "def:3", label: "结构依赖" },
        { from: "def:2", to: "def:3", label: "前置定义" },
        { from: "def:3", to: "lem:1", label: "自伴性" },
        { from: "def:3", to: "lem:2", label: "保内积" },
        { from: "lem:1", to: "proof:1", label: "构造基底" },
        { from: "lem:2", to: "proof:1", label: "不变分解" },
        { from: "proof:1", to: "thm:1", label: "正交完备化" },
        { from: "thm:1", to: "claim:1", label: "泛函延伸" },
      ]
    },

    "intermediate-value-theorem": {
      id: "intermediate-value-theorem",
      title: "从闭区间套到介值定理",
      boundary: "数学分析示例 · 数学地图与 Loop 进展",
      source: "demo",
      sourceLabel: "DEMO",
      section: "curated",
      stats: "12 节点 · 4 步证明推演",
      accent: "#2B3A67",
      nodes: [
        { id: "def:ivt1", kind: "def", badge: "定义 1", title: "实数完备性公理", math: "确界原理 / 戴德金分割", x: 140, y: 160, deps: [] },
        { id: "lem:ivt1", kind: "lem", badge: "引理 1", title: "闭区间套定理 (Cantor)", math: "⋂ [a_n, b_n] = {ξ}", x: 400, y: 160, deps: ["def:ivt1"] },
        { id: "def:ivt2", kind: "def", badge: "定义 2", title: "函数连续性 (ε-δ)", math: "lim_{x→c} f(x) = f(c)", x: 140, y: 320, deps: [] },
        { id: "proof:ivt1", kind: "proof", badge: "推演", title: "二分法区间收缩构造", math: "c_n = (a_n + b_n)/2, f(a_n)f(b_n) < 0", x: 400, y: 320, deps: ["lem:ivt1", "def:ivt2"] },
        { id: "thm:ivt1", kind: "thm", badge: "定理 1", title: "零点存在定理", math: "∃ c ∈ (a, b), f(c) = 0", x: 680, y: 240, deps: ["proof:ivt1"] },
        { id: "thm:ivt2", kind: "thm", badge: "定理 2", title: "介值定理 (Intermediate Value)", math: "∀ η ∈ (f(a), f(b)), ∃ ξ, f(ξ) = η", x: 960, y: 240, deps: ["thm:ivt1"] },
      ],
      edges: [
        { from: "def:ivt1", to: "lem:ivt1", label: "极限推演" },
        { from: "lem:ivt1", to: "proof:ivt1", label: "区间二分" },
        { from: "def:ivt2", to: "proof:ivt1", label: "保号性" },
        { from: "proof:ivt1", to: "thm:ivt1", label: "收敛至零点" },
        { from: "thm:ivt1", to: "thm:ivt2", label: "平移映射 g(x)=f(x)-η" },
      ]
    },

    "fundamental-theorem-calculus": {
      id: "fundamental-theorem-calculus",
      title: "从积分累积函数到微积分基本定理",
      boundary: "微积分示例 · 数学地图与 Loop 进展",
      source: "demo",
      sourceLabel: "DEMO",
      section: "curated",
      stats: "16 节点 · 6 步证明推演",
      accent: "#6D5BD0",
      nodes: [
        { id: "def:ftc1", kind: "def", badge: "定义 1", title: "Riemann 积分和与可积性", math: "∫_a^b f(x) dx = lim ∑ f(ξ_i)Δx_i", x: 140, y: 160, deps: [] },
        { id: "def:ftc2", kind: "def", badge: "定义 2", title: "变上限积分累积函数", math: "F(x) = ∫_a^x f(t) dt", x: 400, y: 160, deps: ["def:ftc1"] },
        { id: "lem:ftc1", kind: "lem", badge: "引理 1", title: "积分中值定理", math: "∫_u^v f(t) dt = f(c)(v - u)", x: 140, y: 320, deps: ["def:ftc1"] },
        { id: "proof:ftc1", kind: "proof", badge: "推演", title: "差商极限定理证明", math: "(F(x+h)-F(x))/h = f(c_h) → f(x)", x: 400, y: 320, deps: ["def:ftc2", "lem:ftc1"] },
        { id: "thm:ftc1", kind: "thm", badge: "定理 1", title: "微积分第一基本定理", math: "F'(x) = f(x) (原函数存在性)", x: 700, y: 240, deps: ["proof:ftc1"] },
        { id: "thm:ftc2", kind: "thm", badge: "定理 2", title: "Newton-Leibniz 公式", math: "∫_a^b f(x) dx = G(b) - G(a)", x: 980, y: 240, deps: ["thm:ftc1"] },
      ],
      edges: [
        { from: "def:ftc1", to: "def:ftc2", label: "累积定义" },
        { from: "def:ftc1", to: "lem:ftc1", label: "中值估计" },
        { from: "def:ftc2", to: "proof:ftc1", label: "差商分析" },
        { from: "lem:ftc1", to: "proof:ftc1", label: "连续性逼近" },
        { from: "proof:ftc1", to: "thm:ftc1", label: "导数成立" },
        { from: "thm:ftc1", to: "thm:ftc2", label: "常数差代入" },
      ]
    },

    // 2. Built-in Maps (Representative 4)
    "group-theory": {
      id: "group-theory",
      title: "群、陪集与 Lagrange 定理",
      boundary: "一般数学内容 · Gamma-native 只读地图",
      source: "builtin",
      sourceLabel: "内置",
      section: "builtin",
      stats: "18 节点 · 8 步推演",
      accent: "#B07C1F",
      nodes: [
        { id: "def:grp1", kind: "def", badge: "定义 1", title: "群与子群结构 (G, ·)", math: "结合律、单位元、逆元", x: 140, y: 160, deps: [] },
        { id: "def:grp2", kind: "def", badge: "定义 2", title: "子群 H 的左陪集 aH", math: "aH = {ah | h ∈ H}", x: 420, y: 160, deps: ["def:grp1"] },
        { id: "lem:grp1", kind: "lem", badge: "引理 1", title: "陪集等势与等价划分", math: "|aH| = |H|, aH ∩ bH = ∅ 或相等", x: 420, y: 320, deps: ["def:grp2"] },
        { id: "thm:grp1", kind: "thm", badge: "定理 1", title: "Lagrange 定理", math: "|G| = [G : H] · |H|", x: 720, y: 240, deps: ["lem:grp1"] },
        { id: "thm:grp2", kind: "thm", badge: "推论 1", title: "元素的阶整除群的阶", math: "ord(a) | |G|, a^{|G|} = e", x: 990, y: 240, deps: ["thm:grp1"] }
      ],
      edges: [
        { from: "def:grp1", to: "def:grp2", label: "陪集构造" },
        { from: "def:grp2", to: "lem:grp1", label: "双射映射" },
        { from: "lem:grp1", to: "thm:grp1", label: "有限划分计数" },
        { from: "thm:grp1", to: "thm:grp2", label: "循环子群应用" }
      ]
    },

    "three-manifolds-finite-covers": {
      id: "three-manifolds-finite-covers",
      title: "三维流形中的曲面、有限覆盖与可分性",
      boundary: "以三维流形中的嵌入曲面为主线，群、图与立方复形作为有限覆盖工具",
      source: "builtin",
      sourceLabel: "内置",
      section: "builtin",
      stats: "24 节点 · 11 步推演",
      accent: "#0E7C66",
      nodes: [
        { id: "def:3m1", kind: "def", badge: "定义 1", title: "不可压缩曲面 Σ ↪ M", math: "π_1(Σ) 注入 π_1(M)", x: 140, y: 160, deps: [] },
        { id: "def:3m2", kind: "def", badge: "定义 2", title: "残余有限群与子群可分性", math: "LERF: 几何子群是闭子群", x: 420, y: 160, deps: ["def:3m1"] },
        { id: "thm:3m1", kind: "thm", badge: "定理 1", title: "嵌入曲面的有限覆盖提升", math: "∃ 有限覆盖 M' → M, Σ 提升为嵌入曲面", x: 740, y: 240, deps: ["def:3m2"] }
      ],
      edges: [
        { from: "def:3m1", to: "def:3m2", label: "基本群注入" },
        { from: "def:3m2", to: "thm:3m1", label: "子群拓扑提升" }
      ]
    },

    "three-manifolds-topological-finite-cover": {
      id: "three-manifolds-topological-finite-cover",
      title: "三维流形中的曲面与有限覆盖",
      boundary: "以三维流形中的不可压缩曲面和 virtually Haken 为主线",
      source: "builtin",
      sourceLabel: "内置",
      section: "builtin",
      stats: "20 节点 · 9 步推演",
      accent: "#2B3A67",
      nodes: [
        { id: "def:hkn1", kind: "def", badge: "定义 1", title: "Haken 流形与多面体分解", math: "阶梯不可压缩分解序列", x: 140, y: 180, deps: [] },
        { id: "thm:hkn1", kind: "thm", badge: "定理 1", title: "Virtually Haken 猜想 (Agol)", math: "紧致不可约三维流形有限覆盖是 Haken 的", x: 620, y: 180, deps: ["def:hkn1"] }
      ],
      edges: [
        { from: "def:hkn1", to: "thm:hkn1", label: "Sageev 立方复形" }
      ]
    },

    "jsj-decomposition": {
      id: "jsj-decomposition",
      title: "JSJ 分解、Seifert 块与双曲块",
      boundary: "一般数学内容 · 拓扑分解只读地图",
      source: "builtin",
      sourceLabel: "内置",
      section: "builtin",
      stats: "21 节点 · 10 步推演",
      accent: "#B07C1F",
      nodes: [
        { id: "def:jsj1", kind: "def", badge: "定义 1", title: "本质环面族 T ⊂ M", math: "不可压缩且非周边环面", x: 140, y: 180, deps: [] },
        { id: "thm:jsj1", kind: "thm", badge: "定理 1", title: "Jaco-Shalen-Johannson 分解", math: "M \\ T 为 Seifert 纤维空间或双曲流形", x: 660, y: 180, deps: ["def:jsj1"] }
      ],
      edges: [
        { from: "def:jsj1", to: "thm:jsj1", label: "特征环面极小性" }
      ]
    },

    // 3. User / Batch Imported Maps
    "homology-exact-sequences": {
      id: "homology-exact-sequences",
      title: "奇异同调与正合序列",
      boundary: "代数拓扑 · 链复形与 Mayer-Vietoris 序列",
      source: "imported",
      sourceLabel: "本地导入",
      section: "my-maps",
      stats: "14 节点 · 18 步推演",
      accent: "#0E7C66",
      nodes: [
        { id: "def:hom1", kind: "def", badge: "定义 1", title: "奇异链群 C_n(X) 与边缘算子 ∂", math: "∂_n ∘ ∂_{n+1} = 0", x: 140, y: 160, deps: [] },
        { id: "def:hom2", kind: "def", badge: "定义 2", title: "同调群 H_n(X) = Ker(∂_n) / Im(∂_{n+1})", math: "闭链模边缘链的 Abel 群", x: 420, y: 160, deps: ["def:hom1"] },
        { id: "lem:hom1", kind: "lem", badge: "蛇引理", title: "短正合序列到长正合序列", math: "0 → A → B → C → 0 ⟹ ... → H_n → ...", x: 420, y: 320, deps: ["def:hom2"] },
        { id: "thm:hom1", kind: "thm", badge: "定理 1", title: "Mayer-Vietoris 正合序列", math: "⋯ → H_n(A ∩ B) → H_n(A) ⊕ H_n(B) → H_n(X) → ⋯", x: 780, y: 240, deps: ["lem:hom1"] }
      ],
      edges: [
        { from: "def:hom1", to: "def:hom2", label: "商群构造" },
        { from: "def:hom2", to: "lem:hom1", label: "连接同态 δ" },
        { from: "lem:hom1", to: "thm:hom1", label: "包含映射分解" }
      ]
    },

    "riemann-surface-uniformization": {
      id: "riemann-surface-uniformization",
      title: "单值化定理与共形度量几何",
      boundary: "微分几何 · 黎曼面覆盖与曲率推导",
      source: "imported",
      sourceLabel: "本地导入",
      section: "my-maps",
      stats: "22 节点 · 29 步推演",
      accent: "#2B3A67",
      nodes: [
        { id: "def:uni1", kind: "def", badge: "定义 1", title: "一维复流形与全纯转移函数", math: "z_α = φ_{αβ}(z_β), ∂_{\\bar{z}}φ = 0", x: 140, y: 160, deps: [] },
        { id: "lem:uni1", kind: "lem", badge: "引理 1", title: "单连通黎曼面的三类共形等价", math: "ℂ̂ (球面), ℂ (平面), 𝔻 (双曲圆盘)", x: 460, y: 160, deps: ["def:uni1"] },
        { id: "thm:uni1", kind: "thm", badge: "定理 1", title: "Poincaré-Koebe 单值化定理", math: "任意单连通黎曼面共形全纯等价于 ℂ̂, ℂ 或 𝔻", x: 820, y: 240, deps: ["lem:uni1"] }
      ],
      edges: [
        { from: "def:uni1", to: "lem:uni1", label: "调和函数极值" },
        { from: "lem:uni1", to: "thm:uni1", label: "万有覆盖空间分类" }
      ]
    }
  };

  /* --------------------------------------------------------------------------
     3. Batch Import Test Candidates (2 valid + 1 duplicate + 1 invalid)
     -------------------------------------------------------------------------- */
  const PRESET_BATCH_FILES = [
    {
      fileName: "homology-exact-sequences.json",
      mapId: "homology-exact-sequences",
      title: "奇异同调与正合序列",
      status: "valid",
      statusText: "有效地图 · 包含 14 个节点与 18 条推演边 · 格式完整",
      badgeText: "有效地图",
      badgeClass: "badge-valid",
      iconType: "check",
      size: "48.2 KB",
      valid: true
    },
    {
      fileName: "riemann-surface-uniformization.json",
      mapId: "riemann-surface-uniformization",
      title: "单值化定理与共形度量几何",
      status: "valid",
      statusText: "有效地图 · 包含 22 个节点与 29 条推演边 · 格式完整",
      badgeText: "有效地图",
      badgeClass: "badge-valid",
      iconType: "check",
      size: "64.7 KB",
      valid: true
    },
    {
      fileName: "spectral-theorem-v2.json",
      mapId: "spectral-theorem",
      title: "从特征值到谱定理 (副本)",
      status: "warning",
      statusText: "重名冲突 · 库中已存在同名项目 (ID: cmath:project:spectral-theorem)，导入将追加为副本",
      badgeText: "重名冲突",
      badgeClass: "badge-warning",
      iconType: "warning",
      size: "52.1 KB",
      valid: false
    },
    {
      fileName: "system-config-backup.json",
      mapId: null,
      title: "系统参数配置文件",
      status: "error",
      statusText: "格式无效 · 缺少 project.title 与 numberingLedger 结构，非 Project View JSON",
      badgeText: "格式无效",
      badgeClass: "badge-error",
      iconType: "error",
      size: "12.4 KB",
      valid: false
    }
  ];

  /* --------------------------------------------------------------------------
     4. State Management
     -------------------------------------------------------------------------- */
  const state = {
    view: "workbench", // 'workbench' | 'map'
    activeDrawer: null, // null | 'import' | 'library' | 'pdf'
    activeModal: null, // null | 'rename'
    activeMapId: "spectral-theorem",
    recentMapIds: ["intermediate-value-theorem", "group-theory"],
    hasImported: false,
    importedMapIds: [],
    customOrder: {
      curated: ["spectral-theorem", "intermediate-value-theorem", "fundamental-theorem-calculus"],
      myMaps: [],
      builtin: ["group-theory", "three-manifolds-finite-covers", "three-manifolds-topological-finite-cover", "jsj-decomposition"]
    },
    renamedTitles: {},
    batchStatus: "idle", // 'idle' | 'staged' | 'importing' | 'imported'
    searchQuery: "",
    activeLens: "global",
    selectedNodeId: null,
    canvasZoom: 1,
    canvasPan: { x: 0, y: 0 },
    renameTargetId: null,
    lastFocusedElement: null
  };

  /* Initialize Local Storage Persistence */
  function loadPersistedData() {
    try {
      const savedOrder = JSON.parse(localStorage.getItem(STORAGE_ORDER_KEY) || "null");
      if (savedOrder && typeof savedOrder === "object") {
        if (Array.isArray(savedOrder.myMaps)) state.customOrder.myMaps = savedOrder.myMaps;
        if (Array.isArray(savedOrder.builtin)) state.customOrder.builtin = savedOrder.builtin;
      }

      const importedFlag = localStorage.getItem(STORAGE_IMPORTED_KEY);
      if (importedFlag === "true") {
        state.hasImported = true;
        state.importedMapIds = ["homology-exact-sequences", "riemann-surface-uniformization"];
        if (!state.customOrder.myMaps.length) {
          state.customOrder.myMaps = ["homology-exact-sequences", "riemann-surface-uniformization"];
        }
      }

      const savedRenames = JSON.parse(localStorage.getItem(STORAGE_RENAMES_KEY) || "{}");
      if (savedRenames && typeof savedRenames === "object") {
        state.renamedTitles = savedRenames;
        Object.entries(savedRenames).forEach(([id, title]) => {
          if (MAPS_REGISTRY[id]) MAPS_REGISTRY[id].title = title;
        });
      }
    } catch {
      // Fallback gracefully
    }
  }

  function saveOrder() {
    try {
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify({
        myMaps: state.customOrder.myMaps,
        builtin: state.customOrder.builtin
      }));
    } catch { /* ignore */ }
  }

  function saveImportedFlag(imported) {
    try {
      localStorage.setItem(STORAGE_IMPORTED_KEY, imported ? "true" : "false");
    } catch { /* ignore */ }
  }

  function saveRename(id, newTitle) {
    state.renamedTitles[id] = newTitle;
    if (MAPS_REGISTRY[id]) MAPS_REGISTRY[id].title = newTitle;
    try {
      localStorage.setItem(STORAGE_RENAMES_KEY, JSON.stringify(state.renamedTitles));
    } catch { /* ignore */ }
  }

  /* --------------------------------------------------------------------------
     5. DOM Elements Cache
     -------------------------------------------------------------------------- */
  const els = {
    body: document.body,
    workbenchView: document.getElementById("workbench-view"),
    mathMapView: document.getElementById("math-map-view"),
    
    // Topbar & Badges
    topbarMapCount: document.getElementById("topbar-map-count"),
    btnTopbarImport: document.getElementById("btn-topbar-import"),
    btnTopbarLibrary: document.getElementById("btn-topbar-library"),
    btnProtoInfo: document.getElementById("btn-proto-info"),
    
    // Entrance Cards
    cardUploadPaper: document.getElementById("card-upload-paper"),
    cardImportJson: document.getElementById("card-import-json"),
    cardOpenLibrary: document.getElementById("card-open-library"),

    // Map View Controls
    btnReturnWorkbench: document.getElementById("btn-return-workbench"),
    btnMapTitleSwitcher: document.getElementById("btn-map-title-switcher"),
    mapActiveSourceBadge: document.getElementById("map-active-source-badge"),
    mapActiveTitle: document.getElementById("map-active-title"),
    mapBoundaryTag: document.getElementById("map-boundary-tag"),
    btnMapQuickImport: document.getElementById("btn-map-quick-import"),
    btnMapQuickLibrary: document.getElementById("btn-map-quick-library"),
    simulatedMapCanvas: document.getElementById("simulated-map-canvas"),
    mapLoadingOverlay: document.getElementById("map-loading-overlay"),
    loadingMapText: document.getElementById("loading-map-text"),
    inmapNodeSearch: document.getElementById("inmap-node-search"),
    mapSectionFilter: document.getElementById("map-section-filter"),
    btnZoomIn: document.getElementById("btn-zoom-in"),
    btnZoomOut: document.getElementById("btn-zoom-out"),
    btnZoomReset: document.getElementById("btn-zoom-reset"),
    nodeInspectorPanel: document.getElementById("node-inspector-panel"),
    inspBadge: document.getElementById("insp-badge"),
    inspTitle: document.getElementById("insp-title"),
    inspStatement: document.getElementById("insp-statement"),
    inspDeps: document.getElementById("insp-deps"),
    btnCloseInspector: document.getElementById("btn-close-inspector"),
    lensTabs: document.querySelectorAll(".lens-tab"),

    // Import Drawer
    importDrawerBackdrop: document.getElementById("import-drawer-backdrop"),
    importDrawer: document.getElementById("import-drawer"),
    btnCloseImportDrawer: document.getElementById("btn-close-import-drawer"),
    importDropZone: document.getElementById("import-drop-zone"),
    btnChooseJsonFiles: document.getElementById("btn-choose-json-files"),
    btnLoadPresetBatch: document.getElementById("btn-load-preset-batch"),
    prototypeFileInput: document.getElementById("prototype-file-input"),
    batchValidationSection: document.getElementById("batch-validation-section"),
    batchTotalCount: document.getElementById("batch-total-count"),
    batchStatusSummary: document.getElementById("batch-status-summary"),
    batchFilesList: document.getElementById("batch-files-list"),
    importProgressWrap: document.getElementById("import-progress-wrap"),
    importProgressFill: document.getElementById("import-progress-fill"),
    progressStateText: document.getElementById("progress-state-text"),
    progressPercentText: document.getElementById("progress-percent-text"),
    importSuccessBox: document.getElementById("import-success-box"),
    importedCountDisplay: document.getElementById("imported-count-display"),
    btnSuccessOpenFirst: document.getElementById("btn-success-open-first"),
    btnSuccessViewLibrary: document.getElementById("btn-success-view-library"),
    btnResetImport: document.getElementById("btn-reset-import"),
    btnStartBatchImport: document.getElementById("btn-start-batch-import"),
    footerValidHint: document.getElementById("footer-valid-hint"),

    // Library Drawer
    libraryDrawerBackdrop: document.getElementById("library-drawer-backdrop"),
    libraryDrawer: document.getElementById("library-drawer"),
    btnCloseLibraryDrawer: document.getElementById("btn-close-library-drawer"),
    librarySearchInput: document.getElementById("library-search-input"),
    btnClearLibrarySearch: document.getElementById("btn-clear-library-search"),
    btnLibraryGoImport: document.getElementById("btn-library-go-import"),
    libraryRecentShelf: document.getElementById("library-recent-shelf"),
    recentChipsList: document.getElementById("recent-chips-list"),
    listCuratedDemos: document.getElementById("list-curated-demos"),
    listMyMaps: document.getElementById("list-my-maps"),
    listBuiltinMaps: document.getElementById("list-builtin-maps"),
    countCurated: document.getElementById("count-curated"),
    countMyMaps: document.getElementById("count-my-maps"),
    countBuiltin: document.getElementById("count-builtin"),
    searchEmptyState: document.getElementById("search-empty-state"),
    btnResetSearchState: document.getElementById("btn-reset-search-state"),

    // PDF Drawer
    pdfDrawerBackdrop: document.getElementById("pdf-drawer-backdrop"),
    btnClosePdfDrawer: document.getElementById("btn-close-pdf-drawer"),
    btnSimExtractToImport: document.getElementById("btn-sim-extract-to-import"),

    // Rename Dialog
    renameModalBackdrop: document.getElementById("rename-modal-backdrop"),
    renameInputField: document.getElementById("rename-input-field"),
    btnCloseRenameModal: document.getElementById("btn-close-rename-modal"),
    btnCancelRename: document.getElementById("btn-cancel-rename"),
    btnConfirmRename: document.getElementById("btn-confirm-rename"),

    // Toast
    toastContainer: document.getElementById("toast-container")
  };

  /* --------------------------------------------------------------------------
     6. Toast Notification System (Using Accessible Inline SVGs)
     -------------------------------------------------------------------------- */
  function showToast(message, type = "check") {
    const toast = document.createElement("div");
    toast.className = "proto-toast";
    toast.setAttribute("role", "status");
    
    const iconWrapper = document.createElement("span");
    iconWrapper.style.display = "inline-flex";
    iconWrapper.style.alignItems = "center";
    iconWrapper.innerHTML = ICONS[type] || ICONS.check;
    
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    
    toast.appendChild(iconWrapper);
    toast.appendChild(textSpan);
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  /* --------------------------------------------------------------------------
     7. View & Drawer Open / Close Engine
     -------------------------------------------------------------------------- */
  function setView(viewName) {
    state.view = viewName;
    els.body.setAttribute("data-view", viewName);
    if (viewName === "map") {
      els.workbenchView.hidden = true;
      els.mathMapView.hidden = false;
      closeAllDrawers();
      renderCurrentMap();
    } else {
      els.workbenchView.hidden = false;
      els.mathMapView.hidden = true;
      closeAllDrawers();
    }
  }

  function openDrawer(drawerName) {
    state.lastFocusedElement = document.activeElement;
    closeAllDrawers();
    state.activeDrawer = drawerName;

    if (drawerName === "import") {
      els.importDrawerBackdrop.hidden = false;
      setTimeout(() => els.btnChooseJsonFiles.focus(), 50);
    } else if (drawerName === "library") {
      renderLibraryView();
      els.libraryDrawerBackdrop.hidden = false;
      if (state.view === "map") {
        els.btnMapTitleSwitcher.setAttribute("aria-expanded", "true");
      }
      setTimeout(() => els.librarySearchInput.focus(), 50);
    } else if (drawerName === "pdf") {
      els.pdfDrawerBackdrop.hidden = false;
      setTimeout(() => els.btnClosePdfDrawer.focus(), 50);
    }
  }

  function closeAllDrawers() {
    state.activeDrawer = null;
    els.importDrawerBackdrop.hidden = true;
    els.libraryDrawerBackdrop.hidden = true;
    els.pdfDrawerBackdrop.hidden = true;
    els.renameModalBackdrop.hidden = true;
    els.btnMapTitleSwitcher.setAttribute("aria-expanded", "false");

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    }
  }

  /* --------------------------------------------------------------------------
     8. Batch Import Simulation Engine
     -------------------------------------------------------------------------- */
  function stageBatchCandidates(customFiles = null) {
    state.batchStatus = "staged";
    els.batchValidationSection.hidden = false;
    els.importProgressWrap.hidden = true;
    els.importSuccessBox.hidden = true;
    els.batchFilesList.innerHTML = "";

    const candidates = customFiles || PRESET_BATCH_FILES;
    let validCount = 0;
    let warnCount = 0;
    let errorCount = 0;

    candidates.forEach((item) => {
      if (item.status === "valid") validCount++;
      else if (item.status === "warning") warnCount++;
      else if (item.status === "error") errorCount++;

      const row = document.createElement("div");
      row.className = `batch-file-row status-${item.status}`;
      row.setAttribute("role", "listitem");

      const mainCol = document.createElement("div");
      mainCol.className = "row-main-col";

      const nameEl = document.createElement("div");
      nameEl.className = "row-file-name";
      nameEl.textContent = item.fileName + (item.size ? ` (${item.size})` : "");

      const titleEl = document.createElement("div");
      titleEl.className = "row-map-title";
      titleEl.textContent = item.title;

      const statusEl = document.createElement("div");
      statusEl.className = "row-status-text";
      statusEl.textContent = item.statusText;

      mainCol.appendChild(nameEl);
      mainCol.appendChild(titleEl);
      mainCol.appendChild(statusEl);

      const badgeCol = document.createElement("div");
      badgeCol.className = "row-badge-col";

      const badge = document.createElement("span");
      badge.className = `status-badge ${item.badgeClass}`;
      
      const iconSvg = item.status === "valid" ? ICONS.check : (item.status === "warning" ? ICONS.warning : ICONS.error);
      badge.innerHTML = `${iconSvg}<span>${escapeHtml(item.badgeText)}</span>`;
      badgeCol.appendChild(badge);

      row.appendChild(mainCol);
      row.appendChild(badgeCol);
      els.batchFilesList.appendChild(row);
    });

    els.batchTotalCount.textContent = String(candidates.length);
    els.batchStatusSummary.textContent = `${validCount} 个有效 · ${warnCount} 个冲突 · ${errorCount} 个错误`;

    if (validCount > 0) {
      els.btnStartBatchImport.disabled = false;
      els.btnStartBatchImport.textContent = `导入 ${validCount} 张有效地图`;
      els.footerValidHint.textContent = `已自动排除 ${errorCount + warnCount} 个异常项，点击右侧按钮导入`;
    } else {
      els.btnStartBatchImport.disabled = true;
      els.btnStartBatchImport.textContent = "未检测到有效地图";
      els.footerValidHint.textContent = "请检查 JSON 数据结构";
    }
  }

  function executeBatchImport() {
    state.batchStatus = "importing";
    els.btnStartBatchImport.disabled = true;
    els.btnResetImport.disabled = true;
    els.importProgressWrap.hidden = false;
    els.importProgressFill.style.width = "10%";
    els.progressStateText.textContent = "正在校验拓扑与编号账本...";
    els.progressPercentText.textContent = "25%";

    setTimeout(() => {
      els.importProgressFill.style.width = "60%";
      els.progressStateText.textContent = "正在生成图内推演节点索引...";
      els.progressPercentText.textContent = "65%";
    }, 250);

    setTimeout(() => {
      els.importProgressFill.style.width = "100%";
      els.progressStateText.textContent = "写入完成！";
      els.progressPercentText.textContent = "100%";

      state.hasImported = true;
      state.importedMapIds = ["homology-exact-sequences", "riemann-surface-uniformization"];
      state.customOrder.myMaps = ["homology-exact-sequences", "riemann-surface-uniformization"];
      saveImportedFlag(true);
      saveOrder();
      updateTotalMapCountBadge();

      els.importProgressWrap.hidden = true;
      els.batchValidationSection.hidden = true;
      els.importSuccessBox.hidden = false;
      els.importedCountDisplay.textContent = "2";
      els.btnResetImport.disabled = false;
      els.footerValidHint.textContent = "导入完成，已收录至「我的地图」";

      showToast("成功导入 2 张数学地图！", "check");
    }, 600);
  }

  function resetImportDrawer() {
    state.batchStatus = "idle";
    els.batchValidationSection.hidden = true;
    els.importProgressWrap.hidden = true;
    els.importSuccessBox.hidden = true;
    els.btnStartBatchImport.disabled = true;
    els.btnStartBatchImport.textContent = "导入 2 张有效地图";
    els.footerValidHint.textContent = "请选择或载入示例文件";
  }

  /* --------------------------------------------------------------------------
     9. Unified Library Render Engine
     -------------------------------------------------------------------------- */
  function updateTotalMapCountBadge() {
    const totalCount = 3 + (state.hasImported ? state.importedMapIds.length : 0) + 4;
    els.topbarMapCount.textContent = String(totalCount);
  }

  function renderLibraryView() {
    updateTotalMapCountBadge();
    const query = state.searchQuery.trim().toLowerCase();

    // Render Recent Shelf (only when recent exists)
    if (state.recentMapIds.length > 0) {
      els.libraryRecentShelf.hidden = false;
      els.recentChipsList.innerHTML = "";
      state.recentMapIds.forEach((mapId) => {
        const item = MAPS_REGISTRY[mapId];
        if (!item) return;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "recent-chip-btn";
        chip.innerHTML = `<span class="recent-dot" aria-hidden="true"></span><span>${escapeHtml(item.title)}</span>`;
        chip.onclick = () => selectMap(mapId);
        els.recentChipsList.appendChild(chip);
      });
    } else {
      els.libraryRecentShelf.hidden = true;
    }

    let matchTotal = 0;

    // 1. Curated Demos
    const curatedMatches = filterMaps(state.customOrder.curated, query);
    renderCardsList(els.listCuratedDemos, curatedMatches, "curated", false);
    els.countCurated.textContent = String(curatedMatches.length);
    matchTotal += curatedMatches.length;

    // 2. My Maps (Local Imported)
    if (!state.hasImported || state.importedMapIds.length === 0) {
      els.listMyMaps.innerHTML = `
        <div class="empty-my-maps-box">
          <p>暂无本地导入地图，支持导入单个或批量 Project View JSON 数据包。</p>
          <button class="btn-preset-batch" id="btn-empty-quick-load" type="button">
            ${ICONS.bolt}
            <span>一键载入示例导入批次</span>
          </button>
        </div>
      `;
      const quickLoadBtn = document.getElementById("btn-empty-quick-load");
      if (quickLoadBtn) {
        quickLoadBtn.onclick = () => {
          openDrawer("import");
          stageBatchCandidates();
        };
      }
      els.countMyMaps.textContent = "0";
    } else {
      const myMapMatches = filterMaps(state.customOrder.myMaps, query);
      renderCardsList(els.listMyMaps, myMapMatches, "myMaps", true);
      els.countMyMaps.textContent = String(myMapMatches.length);
      matchTotal += myMapMatches.length;
    }

    // 3. Builtin Maps
    const builtinMatches = filterMaps(state.customOrder.builtin, query);
    renderCardsList(els.listBuiltinMaps, builtinMatches, "builtin", true);
    els.countBuiltin.textContent = String(builtinMatches.length);
    matchTotal += builtinMatches.length;

    // Empty search state
    if (query && matchTotal === 0) {
      els.searchEmptyState.hidden = false;
    } else {
      els.searchEmptyState.hidden = true;
    }
  }

  function filterMaps(idList, query) {
    return idList
      .map((id) => MAPS_REGISTRY[id])
      .filter((item) => {
        if (!item) return false;
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.boundary.toLowerCase().includes(query) ||
          item.stats.toLowerCase().includes(query)
        );
      });
  }

  function renderCardsList(container, itemsList, sectionKey, allowReorder) {
    container.innerHTML = "";
    itemsList.forEach((item, index) => {
      const isCurrentActive = state.view === "map" && state.activeMapId === item.id;
      const card = document.createElement("div");
      card.className = `map-item-card ${isCurrentActive ? "is-active-map" : ""}`;
      card.setAttribute("role", "listitem");

      // Left Column
      const leftCol = document.createElement("div");
      leftCol.className = "map-card-left";
      leftCol.onclick = () => selectMap(item.id);

      const metaRow = document.createElement("div");
      metaRow.className = "map-card-meta-row";

      const sourceBadge = document.createElement("span");
      sourceBadge.className = `map-source-badge source-${item.source}`;
      sourceBadge.textContent = item.sourceLabel;
      metaRow.appendChild(sourceBadge);

      if (isCurrentActive) {
        const activePill = document.createElement("span");
        activePill.className = "map-active-pill";
        activePill.textContent = "当前浏览中";
        metaRow.appendChild(activePill);
      }

      const titleEl = document.createElement("h5");
      titleEl.className = "map-card-title";
      titleEl.textContent = item.title;

      const descEl = document.createElement("p");
      descEl.className = "map-card-desc";
      descEl.textContent = `${item.boundary} · ${item.stats}`;

      leftCol.appendChild(metaRow);
      leftCol.appendChild(titleEl);
      leftCol.appendChild(descEl);

      // Right Column
      const rightCol = document.createElement("div");
      rightCol.className = "map-card-right-actions";

      // Reorder buttons (▲ / ▼)
      if (allowReorder && !state.searchQuery) {
        const reorderGroup = document.createElement("div");
        reorderGroup.className = "reorder-btn-group";

        const btnUp = document.createElement("button");
        btnUp.type = "button";
        btnUp.className = "btn-reorder";
        btnUp.setAttribute("aria-label", `将「${item.title}」上移`);
        btnUp.textContent = "▲";
        btnUp.disabled = index === 0;
        btnUp.onclick = (e) => {
          e.stopPropagation();
          moveMapOrder(sectionKey, index, -1);
        };

        const btnDown = document.createElement("button");
        btnDown.type = "button";
        btnDown.className = "btn-reorder";
        btnDown.setAttribute("aria-label", `将「${item.title}」下移`);
        btnDown.textContent = "▼";
        btnDown.disabled = index === itemsList.length - 1;
        btnDown.onclick = (e) => {
          e.stopPropagation();
          moveMapOrder(sectionKey, index, 1);
        };

        reorderGroup.appendChild(btnUp);
        reorderGroup.appendChild(btnDown);
        rightCol.appendChild(reorderGroup);
      }

      // Overflow Menu for Imported Maps
      if (item.source === "imported") {
        const overflowWrap = document.createElement("div");
        overflowWrap.className = "overflow-wrap";

        const overflowBtn = document.createElement("button");
        overflowBtn.type = "button";
        overflowBtn.className = "btn-overflow-trigger";
        overflowBtn.setAttribute("aria-label", "更多选项");
        overflowBtn.textContent = "•••";

        const dropdown = document.createElement("div");
        dropdown.className = "overflow-dropdown";
        dropdown.hidden = true;

        const renameOpt = document.createElement("button");
        renameOpt.type = "button";
        renameOpt.className = "overflow-dropdown-item";
        renameOpt.innerHTML = `${ICONS.edit}<span>重命名</span>`;
        renameOpt.onclick = (e) => {
          e.stopPropagation();
          dropdown.hidden = true;
          openRenameModal(item.id, item.title);
        };

        const exportOpt = document.createElement("button");
        exportOpt.type = "button";
        exportOpt.className = "overflow-dropdown-item";
        exportOpt.innerHTML = `${ICONS.download}<span>导出 JSON</span>`;
        exportOpt.onclick = (e) => {
          e.stopPropagation();
          dropdown.hidden = true;
          showToast(`已将「${item.title}」导出为 JSON 文件`, "download");
        };

        const removeOpt = document.createElement("button");
        removeOpt.type = "button";
        removeOpt.className = "overflow-dropdown-item is-danger";
        removeOpt.innerHTML = `${ICONS.trash}<span>移出地图库</span>`;
        removeOpt.onclick = (e) => {
          e.stopPropagation();
          dropdown.hidden = true;
          removeImportedMap(item.id);
        };

        dropdown.appendChild(renameOpt);
        dropdown.appendChild(exportOpt);
        dropdown.appendChild(removeOpt);

        overflowBtn.onclick = (e) => {
          e.stopPropagation();
          const isHidden = dropdown.hidden;
          document.querySelectorAll(".overflow-dropdown").forEach((d) => (d.hidden = true));
          dropdown.hidden = !isHidden;
        };

        overflowWrap.appendChild(overflowBtn);
        overflowWrap.appendChild(dropdown);
        rightCol.appendChild(overflowWrap);
      }

      // Open Map Button
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn-open-map-card";
      openBtn.textContent = isCurrentActive ? "浏览中" : "打开地图 →";
      openBtn.onclick = (e) => {
        e.stopPropagation();
        selectMap(item.id);
      };
      rightCol.appendChild(openBtn);

      card.appendChild(leftCol);
      card.appendChild(rightCol);
      container.appendChild(card);
    });
  }

  function moveMapOrder(sectionKey, index, direction) {
    const list = state.customOrder[sectionKey];
    if (!list) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const item = list.splice(index, 1)[0];
    list.splice(targetIdx, 0, item);
    saveOrder();
    renderLibraryView();
    showToast(`已更新「${MAPS_REGISTRY[item].title}」排序`, "reorder");
  }

  function removeImportedMap(mapId) {
    const title = MAPS_REGISTRY[mapId]?.title || mapId;
    state.importedMapIds = state.importedMapIds.filter((id) => id !== mapId);
    state.customOrder.myMaps = state.customOrder.myMaps.filter((id) => id !== mapId);
    if (state.activeMapId === mapId) {
      state.activeMapId = "spectral-theorem";
    }
    saveOrder();
    renderLibraryView();
    showToast(`已将「${title}」移出本地地图库`, "trash");
  }

  function openRenameModal(mapId, currentTitle) {
    state.renameTargetId = mapId;
    els.renameInputField.value = currentTitle;
    els.renameModalBackdrop.hidden = false;
    setTimeout(() => {
      els.renameInputField.focus();
      els.renameInputField.select();
    }, 50);
  }

  function saveRenamedMapTitle() {
    if (!state.renameTargetId) return;
    const newTitle = els.renameInputField.value.trim();
    if (newTitle) {
      saveRename(state.renameTargetId, newTitle);
      renderLibraryView();
      if (state.view === "map" && state.activeMapId === state.renameTargetId) {
        els.mapActiveTitle.textContent = newTitle;
      }
      showToast(`已重命名为「${newTitle}」`, "check");
    }
    els.renameModalBackdrop.hidden = true;
    state.renameTargetId = null;
  }

  /* --------------------------------------------------------------------------
     10. Simulated Map View & In-Map Switching
     -------------------------------------------------------------------------- */
  function selectMap(mapId) {
    if (!MAPS_REGISTRY[mapId]) return;

    // If already in map view, show smooth loading feedback
    if (state.view === "map") {
      els.mapLoadingOverlay.hidden = false;
      els.loadingMapText.textContent = `正在载入「${MAPS_REGISTRY[mapId].title}」...`;

      // Update recent maps
      if (!state.recentMapIds.includes(state.activeMapId) && state.activeMapId !== mapId) {
        state.recentMapIds.unshift(state.activeMapId);
        if (state.recentMapIds.length > 4) state.recentMapIds.pop();
      }

      setTimeout(() => {
        state.activeMapId = mapId;
        renderCurrentMap();
        els.mapLoadingOverlay.hidden = true;
        closeAllDrawers();
        showToast(`已切换至「${MAPS_REGISTRY[mapId].title}」`, "check");
      }, 200);
    } else {
      // Transition from workbench
      state.activeMapId = mapId;
      setView("map");
      showToast(`已打开「${MAPS_REGISTRY[mapId].title}」`, "check");
    }
  }

  function renderCurrentMap() {
    const mapData = MAPS_REGISTRY[state.activeMapId];
    if (!mapData) return;

    // Update Topbar
    els.mapActiveSourceBadge.textContent = mapData.sourceLabel;
    els.mapActiveTitle.textContent = mapData.title;
    els.mapBoundaryTag.textContent = mapData.boundary;
    els.btnMapTitleSwitcher.setAttribute("aria-label", `切换数学地图：${mapData.title}`);

    // Render Canvas SVG Graph
    renderSvgMathGraph(mapData);
    els.nodeInspectorPanel.hidden = true;
  }

  function renderSvgMathGraph(mapData) {
    const container = els.simulatedMapCanvas;
    container.innerHTML = "";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "map-canvas-svg");
    svg.setAttribute("viewBox", "0 0 1300 600");

    // Defs: Marker Arrow
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--line-strong)" />
      </marker>
      <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--teal)" />
      </marker>
    `;
    svg.appendChild(defs);

    // Grid Pattern background
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", "grid-dot");
    pattern.setAttribute("width", "24");
    pattern.setAttribute("height", "24");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.innerHTML = `<circle cx="12" cy="12" r="1" fill="var(--line-strong)" opacity="0.35"/>`;
    defs.appendChild(pattern);

    const gridRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    gridRect.setAttribute("width", "100%");
    gridRect.setAttribute("height", "100%");
    gridRect.setAttribute("fill", "url(#grid-dot)");
    svg.appendChild(gridRect);

    // Node lookup map
    const nodeMap = {};
    mapData.nodes.forEach((n) => (nodeMap[n.id] = n));

    // Render Edges
    const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgesGroup.setAttribute("class", "map-edges-layer");

    mapData.edges.forEach((edge) => {
      const source = nodeMap[edge.from];
      const target = nodeMap[edge.to];
      if (!source || !target) return;

      const sx = source.x + 90;
      const sy = source.y + 40;
      const tx = target.x - 10;
      const ty = target.y + 40;
      const mx = (sx + tx) / 2;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`);
      path.setAttribute("class", "map-edge-path");
      path.setAttribute("marker-end", "url(#arrow)");
      edgesGroup.appendChild(path);

      if (edge.label) {
        const lx = mx;
        const ly = (sy + ty) / 2 - 8;
        
        const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        labelBg.setAttribute("x", String(lx - 24));
        labelBg.setAttribute("y", String(ly - 8));
        labelBg.setAttribute("width", "48");
        labelBg.setAttribute("height", "16");
        labelBg.setAttribute("class", "map-edge-label-bg");

        const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelText.setAttribute("x", String(lx));
        labelText.setAttribute("y", String(ly));
        labelText.setAttribute("class", "map-edge-label-text");
        labelText.textContent = edge.label;

        edgesGroup.appendChild(labelBg);
        edgesGroup.appendChild(labelText);
      }
    });
    svg.appendChild(edgesGroup);

    // Render Nodes
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("class", "map-nodes-layer");

    mapData.nodes.forEach((node) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "graph-node-group");
      g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
      g.setAttribute("data-node-id", node.id);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "180");
      rect.setAttribute("height", "80");
      rect.setAttribute("class", `graph-node-box node-${node.kind}`);

      const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeText.setAttribute("x", "12");
      badgeText.setAttribute("y", "20");
      badgeText.setAttribute("class", "node-badge-text");
      badgeText.setAttribute("fill", node.kind === "thm" ? "var(--teal-deep)" : "var(--muted)");
      badgeText.textContent = node.badge;

      const titleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      titleText.setAttribute("x", "12");
      titleText.setAttribute("y", "40");
      titleText.setAttribute("class", "node-title-text");
      titleText.textContent = truncateText(node.title, 14);

      const mathText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      mathText.setAttribute("x", "12");
      mathText.setAttribute("y", "62");
      mathText.setAttribute("class", "node-math-text");
      mathText.textContent = truncateText(node.math, 20);

      g.appendChild(rect);
      g.appendChild(badgeText);
      g.appendChild(titleText);
      g.appendChild(mathText);

      g.onclick = (e) => {
        e.stopPropagation();
        inspectNode(node, g);
      };

      nodesGroup.appendChild(g);
    });

    svg.appendChild(nodesGroup);
    container.appendChild(svg);
  }

  function inspectNode(node, nodeGroup) {
    document.querySelectorAll(".graph-node-group").forEach((g) => g.classList.remove("is-selected"));
    if (nodeGroup) nodeGroup.classList.add("is-selected");

    els.inspBadge.textContent = node.badge;
    els.inspTitle.textContent = node.title;
    els.inspStatement.textContent = node.math;
    els.inspDeps.innerHTML = "";

    if (node.deps && node.deps.length > 0) {
      node.deps.forEach((depId) => {
        const tag = document.createElement("span");
        tag.className = "insp-tag";
        tag.textContent = `依赖: ${depId}`;
        els.inspDeps.appendChild(tag);
      });
    } else {
      const tag = document.createElement("span");
      tag.className = "insp-tag";
      tag.textContent = "无前置依赖 (公理/基底定义)";
      els.inspDeps.appendChild(tag);
    }

    els.nodeInspectorPanel.hidden = false;
  }

  function truncateText(text, maxLen) {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* --------------------------------------------------------------------------
     11. Event Listeners & Interactions Wiring
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // 1. Entrance Cards on Workbench
    els.cardUploadPaper.onclick = () => openDrawer("pdf");
    els.cardUploadPaper.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer("pdf"); } };

    els.cardImportJson.onclick = () => openDrawer("import");
    els.cardImportJson.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer("import"); } };

    els.cardOpenLibrary.onclick = () => openDrawer("library");
    els.cardOpenLibrary.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer("library"); } };

    // 2. Topbar Actions
    els.btnTopbarImport.onclick = () => openDrawer("import");
    els.btnTopbarLibrary.onclick = () => openDrawer("library");

    // 3. Map View Controls
    els.btnReturnWorkbench.onclick = () => setView("workbench");
    els.btnMapTitleSwitcher.onclick = () => openDrawer("library");
    els.btnMapQuickLibrary.onclick = () => openDrawer("library");
    els.btnMapQuickImport.onclick = () => openDrawer("import");
    els.btnCloseInspector.onclick = () => { els.nodeInspectorPanel.hidden = true; };

    // 4. Import Drawer Buttons
    els.btnCloseImportDrawer.onclick = () => closeAllDrawers();
    els.btnChooseJsonFiles.onclick = () => els.prototypeFileInput.click();
    els.btnLoadPresetBatch.onclick = () => stageBatchCandidates();
    els.btnStartBatchImport.onclick = () => executeBatchImport();
    els.btnResetImport.onclick = () => resetImportDrawer();

    els.btnSuccessOpenFirst.onclick = () => {
      closeAllDrawers();
      selectMap("homology-exact-sequences");
    };
    els.btnSuccessViewLibrary.onclick = () => openDrawer("library");

    // Real Native File Input (Safe textContent display only)
    els.prototypeFileInput.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const customBatch = files.map((file, i) => {
        const isJson = file.name.toLowerCase().endsWith(".json");
        return {
          fileName: file.name,
          mapId: `custom-map-${i}`,
          title: `本地上传: ${file.name.replace(/\.json$/i, "")}`,
          status: isJson ? "valid" : "error",
          statusText: isJson ? "待导入 · 结构校验通过 (模拟)" : "错误 · 非 JSON 格式",
          badgeText: isJson ? "有效地图" : "格式无效",
          badgeClass: isJson ? "badge-valid" : "badge-error",
          iconType: isJson ? "check" : "error",
          size: `${(file.size / 1024).toFixed(1)} KB`,
          valid: isJson
        };
      });
      stageBatchCandidates(customBatch);
    };

    // 5. Library Drawer Search & Actions
    els.btnCloseLibraryDrawer.onclick = () => closeAllDrawers();
    els.btnLibraryGoImport.onclick = () => openDrawer("import");
    els.librarySearchInput.oninput = (e) => {
      state.searchQuery = e.target.value;
      els.btnClearLibrarySearch.hidden = !state.searchQuery;
      renderLibraryView();
    };
    els.btnClearLibrarySearch.onclick = () => {
      state.searchQuery = "";
      els.librarySearchInput.value = "";
      els.btnClearLibrarySearch.hidden = true;
      renderLibraryView();
    };
    els.btnResetSearchState.onclick = () => {
      state.searchQuery = "";
      els.librarySearchInput.value = "";
      els.btnClearLibrarySearch.hidden = true;
      renderLibraryView();
    };

    // 6. PDF Drawer
    els.btnClosePdfDrawer.onclick = () => closeAllDrawers();
    els.btnSimExtractToImport.onclick = () => {
      openDrawer("import");
      stageBatchCandidates();
    };

    // 7. Rename Modal
    els.btnCloseRenameModal.onclick = () => { els.renameModalBackdrop.hidden = true; };
    els.btnCancelRename.onclick = () => { els.renameModalBackdrop.hidden = true; };
    els.btnConfirmRename.onclick = () => saveRenamedMapTitle();
    els.renameInputField.onkeydown = (e) => {
      if (e.key === "Enter") saveRenamedMapTitle();
      else if (e.key === "Escape") els.renameModalBackdrop.hidden = true;
    };

    // 8. Backdrop Click Closures
    els.importDrawerBackdrop.onclick = (e) => {
      if (e.target === els.importDrawerBackdrop) closeAllDrawers();
    };
    els.libraryDrawerBackdrop.onclick = (e) => {
      if (e.target === els.libraryDrawerBackdrop) closeAllDrawers();
    };
    els.pdfDrawerBackdrop.onclick = (e) => {
      if (e.target === els.pdfDrawerBackdrop) closeAllDrawers();
    };
    els.renameModalBackdrop.onclick = (e) => {
      if (e.target === els.renameModalBackdrop) els.renameModalBackdrop.hidden = true;
    };

    // Close any open overflow dropdown on document click
    document.addEventListener("click", () => {
      document.querySelectorAll(".overflow-dropdown").forEach((d) => (d.hidden = true));
    });

    // 9. Global Escape Listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!els.renameModalBackdrop.hidden) {
          els.renameModalBackdrop.hidden = true;
        } else if (state.activeDrawer) {
          closeAllDrawers();
        } else if (!els.nodeInspectorPanel.hidden) {
          els.nodeInspectorPanel.hidden = true;
        }
      }
    });

    // 10. Lens Tabs in Map
    els.lensTabs.forEach((tab) => {
      tab.onclick = () => {
        els.lensTabs.forEach((t) => {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        state.activeLens = tab.getAttribute("data-lens");
        showToast(state.activeLens === "global" ? "已切换至全图模式" : "已切换至推演链聚焦模式", "info");
      };
    });

    // 11. Proto Info Badge
    els.btnProtoInfo.onclick = () => {
      showToast("这是 CMath 数学地图库与多图切换的独立交互原型", "info");
    };

    // 12. Zoom Buttons
    els.btnZoomIn.onclick = () => showToast("画布缩放: 120%", "search");
    els.btnZoomOut.onclick = () => showToast("画布缩放: 80%", "search");
    els.btnZoomReset.onclick = () => showToast("画布视角已重置居中", "reset");
  }

  /* --------------------------------------------------------------------------
     12. Initialize
     -------------------------------------------------------------------------- */
  function init() {
    loadPersistedData();
    setView("workbench");
    closeAllDrawers();
    setupEventListeners();
    updateTotalMapCountBadge();
  }

  init();
})();
