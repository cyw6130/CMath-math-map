/* Gamma laboratory registry and local experiment workflow state.
 *
 * This is deliberately a browser-local registry. It records Gamma's current
 * experiment state, but it never pretends to be Alpha persistence or a
 * mathematical source of truth.
 */
(function publishLabExperiments(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GammaLabExperiments = api;
  if (root?.document) {
    let storage;
    try {
      storage = root.localStorage;
    } catch {
      storage = undefined;
    }
    api.mount(root.document, storage);
  }
})(typeof window !== "undefined" ? window : globalThis, function createLabExperimentsApi() {
  "use strict";

  const STORAGE_KEY = "cmath.gamma.lab-reviews/v1";
  const decisionLabels = Object.freeze({ pending: "待评价", accepted: "认可方案", rejected: "不认可" });
  const statusLabels = Object.freeze({
    pending: "待评价",
    accepted: "已认可",
    extracted: "已提取",
    adopted: "已采用",
    superseded: "已替代",
    rejected: "不认可（旧状态）",
  });
  const adoptionLabels = Object.freeze({ "not-adopted": "未采用", adopted: "已采用" });
  const experimentCategories = Object.freeze({
    content: Object.freeze({
      id: "content",
      label: "数学内容",
      description: "用具体数学主题验证 Entry、Inference、证明依赖和理解路线。",
      order: 10,
    }),
    mechanism: Object.freeze({
      id: "mechanism",
      label: "地图机制",
      description: "验证图画布、观察镜头、布局动作和工作区交互。",
      order: 20,
    }),
    semantics: Object.freeze({
      id: "semantics",
      label: "语义规范",
      description: "验证数学对象命名、状态语义、呈现规则和理解层级。",
      order: 30,
    }),
    integration: Object.freeze({
      id: "integration",
      label: "数据接入",
      description: "验证外部 Project View 到 Gamma 数学地图的只读接入。",
      order: 40,
    }),
  });
  const categoryLabels = Object.freeze(Object.fromEntries(
    Object.values(experimentCategories).map((category) => [category.id, category.label]),
  ));
  const capabilityLabels = Object.freeze({
    "math-rendering": "Math Rendering",
    "graph-core": "Graph Core",
    "math-map-workspace": "Math Map Workspace",
    "alpha-project-adapter": "Alpha Project Adapter",
  });

  // CAPABILITY MANIFEST REGISTRY:START
  function deepFreezeCapability(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreezeCapability);
    return Object.freeze(value);
  }

  const capabilityPackages = deepFreezeCapability({
    "math-rendering-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-rendering-v1",
      "version": "v1",
      "title": "数学公式渲染",
      "status": "stable",
      "active": true,
      "default": true,
      "supersedes": null,
      "displayOrder": 10,
      "summary": "统一渲染自然语言中的行内与独立数学公式，并为旧数据、Canvas 和失败场景保留可读文本。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · 全 Gamma 数学表面回归",
      "frozenDecisionSummary": "以一个安全、可降级的入口渲染 Gamma 全前端的数学文字。",
      "frozenDecisions": [
        "新数学数据使用显式行内或独立公式分隔符。",
        "已有裸 TeX 只通过保守兼容层显示，不回写数学数据。",
        "DOM 使用 KaTeX，Canvas、搜索和失败场景使用可读纯文本。"
      ],
      "provides": [
        "mixed mathematical text rendering",
        "plain-text mathematical fallback"
      ],
      "useCases": [
        "在网页详情中显示数学公式",
        "在 Canvas、搜索和失败场景中保留可读数学文本"
      ],
      "inputs": [
        "plain text with explicitly delimited LaTeX"
      ],
      "outputs": [
        "KaTeX-backed DOM or readable plain text"
      ],
      "dependencies": [],
      "entrypoints": [
        "frontend/math-text.js"
      ],
      "constraints": [
        "不判断数学语义",
        "不回写或规范化权威数学数据"
      ],
      "sourcePaths": [
        "contracts/GAMMA_MATH_RENDERING_CAPABILITY_V0.1.md",
        "frontend/math-rendering-loader.js",
        "frontend/math-text.js"
      ],
      "acceptanceTestIds": [
        "tests/math_rendering_capability.test.mjs"
      ],
      "presentation": {
        "slug": "math-rendering",
        "statusLabel": "Gamma 已采用 v1",
        "details": [
          {
            "label": "层级",
            "value": "基础能力"
          },
          {
            "label": "包含",
            "value": "KaTeX 装载 · 混合文本渲染 · 裸 TeX 兼容 · 纯文本回退"
          },
          {
            "label": "当前采用",
            "value": "所有 Gamma 数学地图与候选对象详情"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_RENDERING_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "mathematical-entry-inference-authoring-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "mathematical-entry-inference-authoring-v1",
      "version": "v1",
      "title": "Mathematical Entry / Inference Authoring",
      "status": "stable",
      "active": false,
      "default": false,
      "supersedes": null,
      "displayOrder": 20,
      "summary": "在生成数学地图前核对 Entry 与 Inference 的数学角色，并让轻量审核凭据绑定当前内容。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · JSJ 成熟数学内容负面试件",
      "frozenDecisionSummary": "新 Gamma-native 数学地图必须以轻量审核凭据证明每个 Entry / Inference 符合既有数学语义。",
      "frozenDecisions": [
        "数学正文保持权威，审查记录不替代 Entry 陈述或 Inference 推导。",
        "背景、路线和解释性总结不得仅靠合法枚举成为 Claim 或 proof。",
        "审查覆盖全部数学对象并绑定内容指纹；内容变化后旧凭据失效。",
        "能力面向成熟数学内容，不接受研究中的新命题或新推理。"
      ],
      "provides": [
        "reviewed mathematical object admission",
        "content-bound review receipts"
      ],
      "useCases": [
        "把成熟数学内容写入 Gamma-native 数学地图",
        "在构建前核对 Entry 与 Inference"
      ],
      "inputs": [
        "Gamma Project View with Entry and Inference objects",
        "mathematical content review receipt"
      ],
      "outputs": [
        "admitted mathematical content or fail-closed diagnostics"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v1",
          "version": "v1"
        }
      ],
      "entrypoints": [
        "frontend/math-content-admission.js"
      ],
      "constraints": [
        "不重新证明成熟定理",
        "不接受研究中的新命题",
        "不以句式规则代替数学审核"
      ],
      "sourcePaths": [
        "contracts/GAMMA_MATHEMATICAL_ENTRY_INFERENCE_AUTHORING_CAPABILITY_V0.1.md",
        "frontend/math-content-admission.js",
        "prompts/GENERIC_MATH_CONTENT_PROJECT_VIEW_PROMPT_V0.1.md",
        "tools/build-generic-math-map-assets.mjs"
      ],
      "acceptanceTestIds": [
        "tests/mathematical_entry_inference_authoring_capability.test.mjs"
      ],
      "presentation": {
        "slug": "mathematical-entry-inference-authoring",
        "statusLabel": "Gamma 已采用 v1",
        "details": [
          {
            "label": "包含",
            "value": "角色准入 · seed 来源 · 全对象审核覆盖 · 内容漂移阻断"
          },
          {
            "label": "边界",
            "value": "面向成熟数学内容；不重新证明定理，不接受研究新结论"
          },
          {
            "label": "当前采用",
            "value": "新 Gamma-native 数学地图；旧地图保留 legacy profile"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATHEMATICAL_ENTRY_INFERENCE_AUTHORING_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "mathematical-content-admission-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "mathematical-content-admission-v1",
      "version": "v1",
      "title": "数学内容准入",
      "status": "stable",
      "active": true,
      "default": true,
      "supersedes": "mathematical-entry-inference-authoring-v1",
      "displayOrder": 21,
      "summary": "让成熟数学内容在进入地图前通过全对象角色核对与内容绑定审核。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · 成熟数学内容准入",
      "frozenDecisionSummary": "原 Authoring 能力重命名并收窄为内容准入，不承担写作。",
      "frozenDecisions": [
        "审核覆盖全部 Entry 与 Inference。",
        "审核凭据绑定内容指纹。",
        "旧 capability ID 仅作为审核凭据兼容输入。",
        "不接受研究中的新结论。"
      ],
      "provides": [
        "reviewed mathematical content admission",
        "content-bound review receipts"
      ],
      "useCases": [
        "导入成熟数学主题",
        "在生成地图前阻断角色或依赖错误"
      ],
      "inputs": [
        "Gamma Project View",
        "mathematical content review receipt"
      ],
      "outputs": [
        "admitted content or fail-closed diagnostics"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        },
        {
          "id": "math-map-naming-v2",
          "version": "v2"
        }
      ],
      "entrypoints": [
        "frontend/math-content-admission.js"
      ],
      "constraints": [
        "不写数学正文",
        "不证明新结果"
      ],
      "sourcePaths": [
        "frontend/math-content-admission.js",
        "contracts/GAMMA_MATHEMATICAL_CONTENT_ADMISSION_CAPABILITY_V0.1.md",
        "tools/build-generic-math-map-assets.mjs"
      ],
      "acceptanceTestIds": [
        "tests/mathematical_entry_inference_authoring_capability.test.mjs",
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "mathematical-content-admission",
        "statusLabel": "Gamma 已采用 v1",
        "details": [
          {
            "label": "层级",
            "value": "数学地图核心"
          },
          {
            "label": "包含",
            "value": "角色核对 · 依赖核对 · 内容指纹"
          },
          {
            "label": "边界",
            "value": "准入，不负责写作或新证明"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATHEMATICAL_CONTENT_ADMISSION_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "graph-core-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "graph-core-v1",
      "version": "v1",
      "title": "图画布核心",
      "status": "candidate",
      "active": true,
      "default": false,
      "supersedes": null,
      "displayOrder": 30,
      "summary": "维持同一张图及其空间连续性，提供布局、拖动、聚焦、子图增量和返回全图。",
      "sourceExperimentIds": [
        "graph-actions-v1"
      ],
      "sourceExperiments": "EXP-GRAPH-001 · 图动作实验",
      "frozenDecisionSummary": "同一张图持续存在，观察镜头与图动作分离。",
      "frozenDecisions": [
        "全图、单点聚焦、子图聚焦、增量生长与返回全图是可切换的图动作。",
        "布局整理不替换图对象，拖动和聚焦保留当前上下文。"
      ],
      "provides": [
        "persistent interactive graph canvas",
        "focus and incremental graph actions"
      ],
      "useCases": [
        "构建可拖动和聚焦的关系图",
        "在同一图对象上展示增量子图"
      ],
      "inputs": [
        "graph nodes and edges satisfying graph-channel/v1"
      ],
      "outputs": [
        "interactive persistent graph canvas"
      ],
      "dependencies": [],
      "entrypoints": [
        "frontend/graph-canvas-v3.js"
      ],
      "constraints": [
        "不定义数学对象语义",
        "不拥有项目数据"
      ],
      "sourcePaths": [
        "frontend/graph-stage-lab.html",
        "frontend/graph-canvas-v3.js"
      ],
      "acceptanceTestIds": [
        "tests/graph_canvas_v3.test.mjs",
        "tests/graph_contract.test.mjs"
      ],
      "presentation": {
        "slug": "graph-core",
        "statusLabel": "候选 v1",
        "details": [
          {
            "label": "层级",
            "value": "基础能力"
          },
          {
            "label": "包含",
            "value": "持久渲染器 · 力导向整理 · 碰撞处理 · 图动作"
          },
          {
            "label": "来源实验",
            "value": "EXP-GRAPH-001 · 图动作实验"
          }
        ],
        "link": {
          "href": "laboratory.html?capability=graph-core",
          "label": "查看相关实验"
        }
      }
    },
    "math-graph-semantics-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-graph-semantics-v1",
      "version": "v1",
      "title": "数学图对象语义与呈现规范",
      "status": "stable",
      "active": false,
      "default": false,
      "supersedes": null,
      "displayOrder": 40,
      "summary": "统一 Entry、Inference、Fact、Claim、B₀、名称与研究时间截面的数学图语义。",
      "sourceExperimentIds": [],
      "sourceExperiments": "历史兼容包 · 已由 math-graph-semantics-v2 与 math-map-naming-v1 取代",
      "frozenDecisionSummary": "统一数学图对象语义、短/完整名称与 Loop 时间截面的呈现契约。",
      "frozenDecisions": [
        "Entry / Inference 是对象角色；Fact / Claim 是数学断言层级。",
        "B0（B₀）作为基准对象显式呈现，不与普通节点混淆。",
        "短名称用于图面密度控制，完整数学名称用于详情与核验。",
        "视觉语义表达对象角色和状态；Loop 时间截面表达研究过程中的局部视图。"
      ],
      "provides": [
        "mathematical graph object semantics",
        "stable Entry and Inference presentation contract"
      ],
      "useCases": [
        "把数学对象投影到统一图语义",
        "在详情与图面之间保持名称和状态一致"
      ],
      "inputs": [
        "Gamma-native or adapted mathematical objects"
      ],
      "outputs": [
        "Entry and Inference graph semantics"
      ],
      "dependencies": [],
      "entrypoints": [
        "frontend/math-map-project-adapter.js"
      ],
      "constraints": [
        "不建立数学真值",
        "不决定 Alpha 治理状态"
      ],
      "sourcePaths": [
        "frontend/math-map-project-adapter.js",
        "contracts/MATHEMATICAL_MAP_SEMANTICS_V0.1.md"
      ],
      "acceptanceTestIds": [
        "tests/knot_hopf_rt_demo.test.mjs",
        "tests/math_map_project_adapter.test.mjs"
      ],
      "presentation": {
        "slug": "math-graph-semantics",
        "statusLabel": "Gamma 已采用 v1",
        "details": [
          {
            "label": "包含",
            "value": "Entry / Inference · Fact / Claim · B₀ · 数学名称"
          },
          {
            "label": "边界",
            "value": "表达数学对象角色和状态，不判断数学真值"
          }
        ],
        "link": {
          "href": "../contracts/MATHEMATICAL_MAP_SEMANTICS_V0.1.md",
          "label": "查看语义合同"
        }
      }
    },
    "math-graph-semantics-v2": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-graph-semantics-v2",
      "version": "v2",
      "title": "数学地图语义",
      "status": "stable",
      "active": true,
      "default": true,
      "supersedes": "math-graph-semantics-v1",
      "displayOrder": 41,
      "summary": "定义 Fact、Claim、organization、proof 及 Claim 闭包，不混入命名、Loop 或路线。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · 数学地图语义拆分",
      "frozenDecisionSummary": "把数学对象与闭包规则从命名、视觉、Loop 和工作区中拆出。",
      "frozenDecisions": [
        "Entry 仅为 Fact 或 Claim。",
        "Inference 仅为 organization 或 proof。",
        "只有 B₀ Claim 或前提完备的 proof 能建立 Claim。",
        "B₀ 只包含无需图内证明而直接采用的 Claim；Fact 天然可用；C₀ = Fact ∪ B₀，且 C₀ 不形成节点身份。",
        "v2 不包含 plan 或路线语义。"
      ],
      "provides": [
        "mathematical map object semantics",
        "claim closure computation"
      ],
      "useCases": [
        "验证数学地图对象",
        "计算 Claim 开放或已建立状态"
      ],
      "inputs": [
        "Gamma Entry and Inference objects"
      ],
      "outputs": [
        "validated roles and Claim closure"
      ],
      "dependencies": [],
      "entrypoints": [
        "frontend/math-map-semantics.js"
      ],
      "constraints": [
        "不拥有命名、视觉、Loop、路线或工作区"
      ],
      "sourcePaths": [
        "frontend/math-map-semantics.js",
        "contracts/GAMMA_MATH_MAP_SEMANTICS_CAPABILITY_V0.2.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-semantics-v2",
        "statusLabel": "Gamma 已采用 v2",
        "details": [
          {
            "label": "层级",
            "value": "数学地图核心"
          },
          {
            "label": "对象",
            "value": "Fact · Claim · organization · proof"
          },
          {
            "label": "基础",
            "value": "B₀ 只含直接采用的 Claim"
          },
          {
            "label": "闭包入口",
            "value": "C₀ = Fact ∪ B₀"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_MAP_SEMANTICS_CAPABILITY_V0.2.md",
          "label": "查看能力合同"
        }
      }
    },
    "math-map-naming-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-map-naming-v1",
      "version": "v1",
      "title": "数学地图命名",
      "status": "stable",
      "active": false,
      "default": false,
      "supersedes": null,
      "displayOrder": 42,
      "summary": "统一数学地图 ID、类型编号、数学短名、完整名称和搜索别名。",
      "sourceExperimentIds": [],
      "sourceExperiments": "历史兼容包 · 已由 math-map-naming-v2 取代",
      "frozenDecisionSummary": "画布名称固定为类型、正整数编号与数学短名的复合身份。",
      "frozenDecisions": [
        "规范名称为 <类型> · <正整数> · <数学短名>。",
        "数学短名不可从画布身份中删除。",
        "完整名与旧名只作为详情和搜索别名。"
      ],
      "provides": [
        "canonical mathematical map names",
        "search aliases"
      ],
      "useCases": [
        "跨主题保持节点命名一致",
        "用短名、全名或 ID 搜索对象"
      ],
      "inputs": [
        "mathematical object role and titles"
      ],
      "outputs": [
        "canonical board name and aliases"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        }
      ],
      "entrypoints": [
        "frontend/math-map-naming.js"
      ],
      "constraints": [
        "不决定数学真值、视觉或 Loop 状态"
      ],
      "sourcePaths": [
        "frontend/math-map-naming.js",
        "contracts/GAMMA_MATH_MAP_NAMING_CAPABILITY_V0.1.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_capability_suite_v2.test.mjs",
        "tests/math_map_naming_contract.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-naming",
        "statusLabel": "历史兼容 v1",
        "details": [
          {
            "label": "层级",
            "value": "数学地图核心"
          },
          {
            "label": "规范",
            "value": "类型 · 编号 · 数学短名"
          },
          {
            "label": "检索",
            "value": "短名 · 全名 · 旧名 · ID"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_MAP_NAMING_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "math-map-naming-v2": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-map-naming-v2",
      "version": "v2",
      "title": "数学地图命名",
      "status": "stable",
      "active": true,
      "default": true,
      "supersedes": "math-map-naming-v1",
      "displayOrder": 43,
      "summary": "统一数学地图名称与永久编号生命周期：候选待编号，接受后领号，废弃或合并后不复用。",
      "sourceExperimentIds": [
        "rt-node-naming-v1"
      ],
      "sourceExperiments": "EXP-PRESENT-001 · 数学图对象命名实验；用户确认的永久编号升级",
      "frozenDecisionSummary": "显示名保持类型、编号与数学短名；正式编号由项目级账本永久分配。",
      "frozenDecisions": [
        "Candidate 显示待编号且不占正式编号。",
        "Acceptance 后按项目与显示类型领取下一个永久正整数。",
        "retired 或 merged 编号保留且永不复用。",
        "排序、筛选、Section 与 Loop 切片不改变编号。",
        "Admission 决定接受；Naming 只分配编号。"
      ],
      "provides": [
        "canonical mathematical map names",
        "durable type-local numbering ledger",
        "search aliases"
      ],
      "useCases": [
        "稳定展示正式与候选数学对象",
        "保持废弃或合并后的编号审计",
        "用短名、全名或 ID 搜索对象"
      ],
      "inputs": [
        "mathematical object roles and titles",
        "accepted object IDs from Admission",
        "persisted project numbering ledger"
      ],
      "outputs": [
        "canonical or pending board names",
        "updated durable numbering ledger"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        }
      ],
      "entrypoints": [
        "frontend/math-map-naming.js"
      ],
      "constraints": [
        "不决定数学真值或 Acceptance",
        "不拥有视觉、Loop 或路线状态"
      ],
      "sourcePaths": [
        "frontend/math-map-naming.js",
        "contracts/GAMMA_MATH_MAP_NAMING_CAPABILITY_V0.2.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_naming_v2.test.mjs",
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-naming-v2",
        "statusLabel": "Gamma 已采用 v2",
        "details": [
          {
            "label": "层级",
            "value": "数学地图核心"
          },
          {
            "label": "候选",
            "value": "待编号"
          },
          {
            "label": "正式",
            "value": "接受后永久领号"
          },
          {
            "label": "废弃",
            "value": "保留且不复用"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_MAP_NAMING_CAPABILITY_V0.2.md",
          "label": "查看能力合同"
        }
      }
    },
    "math-map-visual-semantics-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-map-visual-semantics-v1",
      "version": "v1",
      "title": "数学地图视觉语义",
      "status": "candidate",
      "active": true,
      "default": false,
      "supersedes": null,
      "displayOrder": 45,
      "summary": "把 Fact、Claim、Inference、B₀ Claim 与目标聚焦投影为稳定且可组合的数学地图视觉语言。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · 既有数学地图视觉语义",
      "frozenDecisionSummary": "抽取现有视觉约定，不改变数学对象、闭包、Loop 或路线语义。",
      "frozenDecisions": [
        "Fact 使用灰色填充圆；开放 Claim 使用粉色圆环；已建立 Claim 使用薄荷色填充圆。",
        "Inference 使用菱形；organization 为空心，proof 为实心。",
        "B₀ 外环只用于 B₀ Claim；当前目标蓝色光环可与之叠加，不替代对象本身状态。",
        "C₀ = Fact ∪ B₀ 是派生闭包集合，不显示节点徽标；悬停只显示完整数学标题。",
        "详情显示规范名称、完整标题、陈述、前提、后续和证据来源；Claim 状态与建立依据放在独立对象信息中。",
        "v1 不引入 plan 或多路线视觉语义。"
      ],
      "provides": [
        "mathematical node visual classification",
        "shared palette and legend projection"
      ],
      "useCases": [
        "统一数学地图图例",
        "在不同数学主题中复用节点视觉规则"
      ],
      "inputs": [
        "accepted Gamma mathematical map node fields",
        "CSS design tokens"
      ],
      "outputs": [
        "visual classification",
        "renderer palette",
        "legend items"
      ],
      "dependencies": [
        {
          "id": "graph-core-v1",
          "version": "v1"
        },
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        }
      ],
      "entrypoints": [
        "frontend/math-map-visual-semantics.js"
      ],
      "constraints": [
        "不决定数学真值或 Claim 闭包",
        "不拥有布局、Loop 或路线语义"
      ],
      "sourcePaths": [
        "frontend/math-map-visual-semantics.js",
        "frontend/math-map-lab.css",
        "contracts/GAMMA_MATH_MAP_VISUAL_SEMANTICS_CAPABILITY_V0.1.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_visual_semantics_capability.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-visual-semantics",
        "statusLabel": "候选能力",
        "details": [
          {
            "label": "层级",
            "value": "数学地图核心"
          },
          {
            "label": "节点",
            "value": "Fact · 开放/已建立 Claim · Inference"
          },
          {
            "label": "覆盖层",
            "value": "B₀ · 当前目标聚焦"
          },
          {
            "label": "闭包集合",
            "value": "C₀ 不作节点标识"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_MAP_VISUAL_SEMANTICS_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "math-map-workspace-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-map-workspace-v1",
      "version": "v1",
      "title": "Math Map Workspace",
      "status": "integration",
      "active": false,
      "default": false,
      "supersedes": null,
      "displayOrder": 50,
      "summary": "把数学语义投影到同一张可操作图中的全图、路线、进展、Section 和对象详情。",
      "sourceExperimentIds": [],
      "sourceExperiments": "历史兼容包 · 已由 math-map-workspace-v2 取代",
      "frozenDecisionSummary": "把数学对象、路线、进展与 Section 投影到同一张可操作图。",
      "frozenDecisions": [
        "全图、路线、进展与 Section 是同一数学图的观察镜头。",
        "Fact/Claim 与 T/M/p 证明层级保持在对象详情和路线中可追溯。"
      ],
      "provides": [
        "interactive mathematical map workspace",
        "section and route graph lenses"
      ],
      "useCases": [
        "构建可交互数学地图",
        "在同一数学图中查看路线、进展和 Section"
      ],
      "inputs": [
        "mathematical graph semantics",
        "graph-channel/v1 nodes and edges"
      ],
      "outputs": [
        "interactive mathematical map workspace"
      ],
      "dependencies": [
        {
          "id": "graph-core-v1",
          "version": "v1"
        },
        {
          "id": "math-rendering-v1",
          "version": "v1"
        },
        {
          "id": "math-graph-semantics-v1",
          "version": "v1"
        },
        {
          "id": "math-map-visual-semantics-v1",
          "version": "v1"
        }
      ],
      "entrypoints": [
        "frontend/math-map-lab.js"
      ],
      "constraints": [
        "不拥有数学内容",
        "不修改 Alpha 数据"
      ],
      "sourcePaths": [
        "frontend/math-map-lab.js",
        "frontend/math-map-model.js"
      ],
      "acceptanceTestIds": [
        "tests/math_map_lab.test.mjs",
        "tests/torus_bundle_stock_lab.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-workspace",
        "statusLabel": "集成验证中",
        "details": [
          {
            "label": "依赖",
            "value": "Graph Core · Math Rendering · Math Graph Semantics · Visual Semantics"
          },
          {
            "label": "包含",
            "value": "全图 · 路线 · 进展 · Section · 对象详情"
          }
        ],
        "link": {
          "href": "laboratory.html?capability=math-map-workspace",
          "label": "查看相关实验"
        }
      }
    },
    "research-loop-progress-v1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "research-loop-progress-v1",
      "version": "v1",
      "title": "研究 Loop 进展",
      "status": "candidate",
      "active": true,
      "default": false,
      "supersedes": null,
      "displayOrder": 51,
      "summary": "按 Loop 重放同一数学地图的正式增量，并复用既有目标、使用对象和新对象高亮。",
      "sourceExperimentIds": [],
      "sourceExperiments": "用户确认模块 · 既有 Loop 进展规则",
      "frozenDecisionSummary": "Loop 进展独立于路线；本版本不引入 plan 或多路线。",
      "frozenDecisions": [
        "completed Loop 可加入正式 delta。",
        "failed 或 aborted Loop 不增加数学节点。",
        "一个 delta 只归属一个 Loop。",
        "Review、Acceptance 后 Commit，Commit 最后。",
        "复用既有视觉覆盖层。"
      ],
      "provides": [
        "ordered Loop records",
        "incremental mathematical map slices"
      ],
      "useCases": [
        "展示研究每一轮改变了什么",
        "回放同一数学图的累积进展"
      ],
      "inputs": [
        "Loop records and committed delta ids"
      ],
      "outputs": [
        "normalized Loop records and cumulative slices"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        },
        {
          "id": "math-map-naming-v2",
          "version": "v2"
        }
      ],
      "entrypoints": [
        "frontend/research-loop-progress.js"
      ],
      "constraints": [
        "无 plan",
        "无多路线或路线切换",
        "不自定义视觉规则"
      ],
      "sourcePaths": [
        "frontend/research-loop-progress.js",
        "contracts/GAMMA_RESEARCH_LOOP_PROGRESS_CAPABILITY_V0.1.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "research-loop-progress",
        "statusLabel": "候选 v1",
        "details": [
          {
            "label": "层级",
            "value": "研究进展"
          },
          {
            "label": "进展",
            "value": "使用对象 · 目标 · 正式增量"
          },
          {
            "label": "暂缓",
            "value": "plan · 多路线 · 路线切换"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_RESEARCH_LOOP_PROGRESS_CAPABILITY_V0.1.md",
          "label": "查看能力合同"
        }
      }
    },
    "math-map-workspace-v2": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "math-map-workspace-v2",
      "version": "v2",
      "title": "数学地图工作区",
      "status": "integration",
      "active": true,
      "default": false,
      "supersedes": "math-map-workspace-v1",
      "displayOrder": 52,
      "summary": "组合全图、单目标上下文、Loop 进展、Section、搜索和对象详情；默认进入全图。",
      "sourceExperimentIds": [
        "math-map-workspace-v1",
        "torus-bundle-stock-map-v1"
      ],
      "sourceExperiments": "EXP-MATH-001 · 数学地图工作区；EXP-MATH-002 · 存量数学地图",
      "frozenDecisionSummary": "工作区只组合数学地图与 Loop 进展，不在 v2 定义路线模块。",
      "frozenDecisions": [
        "默认进入全图。",
        "本版本只考虑一个当前目标上下文。",
        "Loop 聚焦复用既有视觉规则。",
        "不引入 plan 或多路线切换。"
      ],
      "provides": [
        "interactive mathematical map workspace",
        "single-target Loop progress lens"
      ],
      "useCases": [
        "展示完整数学地图",
        "查看单目标研究进展和 Section"
      ],
      "inputs": [
        "graph channel",
        "map semantics, naming, visuals and Loop progress"
      ],
      "outputs": [
        "interactive mathematical map workspace"
      ],
      "dependencies": [
        {
          "id": "graph-core-v1",
          "version": "v1"
        },
        {
          "id": "math-rendering-v1",
          "version": "v1"
        },
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        },
        {
          "id": "math-map-naming-v2",
          "version": "v2"
        },
        {
          "id": "math-map-visual-semantics-v1",
          "version": "v1"
        },
        {
          "id": "research-loop-progress-v1",
          "version": "v1"
        }
      ],
      "entrypoints": [
        "frontend/math-map-lab.js"
      ],
      "constraints": [
        "不拥有数学内容或 Alpha 数据",
        "无 plan 或多路线切换"
      ],
      "sourcePaths": [
        "frontend/math-map-lab.js",
        "frontend/math-map-model.js",
        "contracts/GAMMA_MATH_MAP_WORKSPACE_CAPABILITY_V0.2.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_lab.test.mjs",
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "math-map-workspace-v2",
        "statusLabel": "集成验证中 v2",
        "details": [
          {
            "label": "层级",
            "value": "产品与接入"
          },
          {
            "label": "默认",
            "value": "全图"
          },
          {
            "label": "包含",
            "value": "单目标 · Loop 进展 · Section · 搜索 · 详情"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_MATH_MAP_WORKSPACE_CAPABILITY_V0.2.md",
          "label": "查看能力合同"
        }
      }
    },
    "alpha-project-adapter-v0.1": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "alpha-project-adapter-v0.1",
      "version": "v0.1",
      "title": "Alpha Project Adapter",
      "status": "experimental",
      "active": false,
      "default": false,
      "supersedes": null,
      "displayOrder": 60,
      "summary": "只读接收 Alpha Project View，把 Entry、Inference、Focus、Section 与 Loop 增量交给 Gamma 数学地图。",
      "sourceExperimentIds": [],
      "sourceExperiments": "历史兼容包 · 已由 alpha-project-adapter-v0.2 取代",
      "frozenDecisionSummary": "Alpha Project View 只读进入 Gamma 数学图，不回写研究数据。",
      "frozenDecisions": [
        "Focus、Section 和逐 Loop 增量由 Alpha 数据适配层提供。",
        "Gamma 只消费 Alpha Project View，不复制或修改 Alpha 原始数据。"
      ],
      "provides": [
        "read-only Alpha Project View adaptation",
        "Alpha-to-Gamma mathematical graph projection"
      ],
      "useCases": [
        "在 Gamma 中查看 Alpha 数学项目",
        "把 Alpha Focus、Section 和 Loop 增量投影到数学地图"
      ],
      "inputs": [
        "Alpha Project View Model"
      ],
      "outputs": [
        "Gamma mathematical map model"
      ],
      "dependencies": [
        {
          "id": "math-map-workspace-v1",
          "version": "v1"
        },
        {
          "id": "math-graph-semantics-v1",
          "version": "v1"
        }
      ],
      "entrypoints": [
        "frontend/math-map-project-adapter.js"
      ],
      "constraints": [
        "Alpha 到 Gamma 只读",
        "不复制或修改 Alpha 权威数据"
      ],
      "sourcePaths": [
        "frontend/math-map-project-adapter.js",
        "frontend/math-map-project-bridge.js"
      ],
      "acceptanceTestIds": [
        "tests/math_map_project_adapter.test.mjs",
        "tests/uqsl3_alpha_lab.test.mjs",
        "tests/uqsl3_alpha_interactions.test.mjs"
      ],
      "presentation": {
        "slug": "alpha-project-adapter",
        "statusLabel": "真实数据验证中 v0.1",
        "details": [
          {
            "label": "依赖",
            "value": "Math Map Workspace · Math Graph Semantics"
          },
          {
            "label": "边界",
            "value": "Alpha → Gamma 只读；Gamma 不回写研究数据"
          },
          {
            "label": "来源实验",
            "value": "EXP-ADAPTER-001 · EXP-ADAPTER-002"
          }
        ],
        "link": {
          "href": "laboratory.html?capability=alpha-project-adapter",
          "label": "查看相关实验"
        }
      }
    },
    "alpha-project-adapter-v0.2": {
      "schema": "cmath-gamma.capability-manifest/v1",
      "id": "alpha-project-adapter-v0.2",
      "version": "v0.2",
      "title": "Alpha 项目适配",
      "status": "experimental",
      "active": true,
      "default": false,
      "supersedes": "alpha-project-adapter-v0.1",
      "displayOrder": 61,
      "summary": "只读把 Alpha Project View 接到 Gamma 地图语义、命名和 Loop 进展，不拥有路线或工作区。",
      "sourceExperimentIds": [
        "alpha-torus-bundle-v2-v1",
        "uqsl3-alpha-channel-v1"
      ],
      "sourceExperiments": "EXP-ADAPTER-001 · torus bundle v2；EXP-ADAPTER-002 · uqsl3",
      "frozenDecisionSummary": "适配器只翻译项目对象；不复制 Alpha 数据，不生成多路线语义。",
      "frozenDecisions": [
        "Alpha 到 Gamma 只读。",
        "复用 Gamma 地图语义、命名与 Loop 进展。",
        "旧 route-shaped 输出仅保留兼容性。",
        "v0.2 不定义 plan 或多路线。"
      ],
      "provides": [
        "read-only Alpha Project View adaptation",
        "Alpha-to-Gamma semantic projection"
      ],
      "useCases": [
        "在 Gamma 查看 Alpha 数学项目",
        "复用 Alpha 的 Focus、Section 和 Loop 记录"
      ],
      "inputs": [
        "Alpha Project View Model"
      ],
      "outputs": [
        "Gamma mathematical map projection"
      ],
      "dependencies": [
        {
          "id": "math-graph-semantics-v2",
          "version": "v2"
        },
        {
          "id": "math-map-naming-v2",
          "version": "v2"
        },
        {
          "id": "research-loop-progress-v1",
          "version": "v1"
        }
      ],
      "entrypoints": [
        "frontend/math-map-project-adapter.js"
      ],
      "constraints": [
        "Alpha 到 Gamma 只读",
        "不拥有工作区、plan 或路线语义"
      ],
      "sourcePaths": [
        "frontend/math-map-project-adapter.js",
        "frontend/math-map-project-bridge.js",
        "contracts/GAMMA_ALPHA_PROJECT_ADAPTER_CAPABILITY_V0.2.md"
      ],
      "acceptanceTestIds": [
        "tests/math_map_project_adapter.test.mjs",
        "tests/math_map_capability_suite_v2.test.mjs"
      ],
      "presentation": {
        "slug": "alpha-project-adapter-v02",
        "statusLabel": "真实数据验证中 v0.2",
        "details": [
          {
            "label": "层级",
            "value": "产品与接入"
          },
          {
            "label": "复用",
            "value": "地图语义 · 地图命名 · Loop 进展"
          },
          {
            "label": "边界",
            "value": "只读；不拥有路线或工作区"
          }
        ],
        "link": {
          "href": "../contracts/GAMMA_ALPHA_PROJECT_ADAPTER_CAPABILITY_V0.2.md",
          "label": "查看能力合同"
        }
      }
    }
  });
  // CAPABILITY MANIFEST REGISTRY:END

  const experiments = Object.freeze([
    Object.freeze({
      id: "graph-actions-v1",
      code: "EXP-GRAPH-001",
      title: "图动作实验",
      category: "mechanism",
      capability: "graph-core",
      capabilityPackageId: "graph-core-v1",
      module: "Layout & Interaction",
      href: "graph-stage-lab.html",
      predecessorIds: Object.freeze([]),
      summary: "验证一张持久图上的全图、单点聚焦、子图聚焦、增量生长与返回全图。",
    }),
    Object.freeze({
      id: "math-map-workspace-v1",
      code: "EXP-MATH-001",
      title: "数学地图工作区",
      category: "mechanism",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-workspace-v2",
      module: "Integrated Workspace",
      href: "math-map-lab.html",
      predecessorIds: Object.freeze(["graph-actions-v1"]),
      summary: "验证全图、路线、进展与 Section 在同一张数学图上的组合。",
    }),
    Object.freeze({
      id: "generic-group-theory-map-v1",
      code: "EXP-MATH-003",
      title: "群、陪集与 Lagrange 定理",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: null,
      module: "Generic Mathematical Content",
      href: "pages/generic-math-map-lab.html?map=group-theory",
      contentMapId: "group-theory",
      predecessorIds: Object.freeze(["math-map-workspace-v1"]),
      summary: "验证一般数学内容无需伪造研究 Loop，也能按 Fact、Claim 与 proof Inference 进入现有 Gamma 数学地图。",
    }),
    Object.freeze({
      id: "spectral-theorem-map-loop-v1",
      code: "EXP-MATH-005",
      title: "从特征值到谱定理",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-workspace-v2",
      module: "Mathematical Map & Loop Progress",
      href: "pages/generic-math-map-lab.html?map=spectral-theorem",
      contentMapId: "spectral-theorem",
      predecessorIds: Object.freeze(["generic-group-theory-map-v1"]),
      summary: "用一个当前目标和五个顺序 Loop 展示谱定理数学地图；数据不引入 plan、路线切换或多路线对象。",
    }),
    Object.freeze({
      id: "intermediate-value-theorem-map-loop-v1",
      code: "EXP-MATH-006",
      title: "从闭区间套到介值定理",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-workspace-v2",
      module: "Mathematical Map & Loop Progress",
      href: "pages/generic-math-map-lab.html?map=intermediate-value-theorem",
      contentMapId: "intermediate-value-theorem",
      predecessorIds: Object.freeze(["spectral-theorem-map-loop-v1"]),
      summary: "用闭区间套定理作为 B₀ Claim，沿五个顺序 Loop 展示二分构造如何建立介值定理；不引入 plan 或多路线对象。",
    }),
    Object.freeze({
      id: "fundamental-theorem-calculus-map-loop-v1",
      code: "EXP-MATH-007",
      title: "从积分累积函数到微积分基本定理",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-workspace-v2",
      module: "Mathematical Map & Loop Progress",
      href: "pages/generic-math-map-lab.html?map=fundamental-theorem-calculus",
      contentMapId: "fundamental-theorem-calculus",
      predecessorIds: Object.freeze(["intermediate-value-theorem-map-loop-v1"]),
      summary: "以连续可积性、积分性质与中值定理作为 B₀ Claim，沿五个顺序 Loop 展示积分累积函数求导和 Newton–Leibniz 公式如何合并为微积分基本定理。",
    }),
    Object.freeze({
      id: "ai-chat-math-map-v1",
      code: "EXP-AI-001",
      title: "AI 对话生成数学地图",
      category: "integration",
      dataSource: "Sub2API",
      capability: "math-map-workspace",
      capabilityPackageId: null,
      module: "AI Answer Projection",
      href: "ai-math-map-lab.html",
      predecessorIds: Object.freeze(["math-map-workspace-v1", "generic-group-theory-map-v1"]),
      summary: "先与 AI 对话，再把一条回答转换为当前浏览器会话中的 Gamma 数学地图。",
    }),
    Object.freeze({
      id: "three-manifolds-finite-covers-map-v1",
      code: "EXP-MATH-004",
      title: "三维流形中的曲面、有限覆盖与可分性",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: null,
      module: "Generic Mathematical Content",
      href: "pages/generic-math-map-lab.html?map=three-manifolds-finite-covers",
      contentMapId: "three-manifolds-finite-covers",
      predecessorIds: Object.freeze(["generic-group-theory-map-v1"]),
      summary: "验证以三维拓扑为主线、群、图和立方复形作为工具的一般数学内容能进入现有 Gamma 数学地图。",
    }),
    Object.freeze({
      id: "rt-node-naming-v1",
      code: "EXP-PRESENT-001",
      title: "数学图对象语义与呈现规范",
      category: "semantics",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-naming-v2",
      module: "Object Semantics & Presentation",
      href: "knot-hopf-rt-naming-lab.html",
      predecessorIds: Object.freeze(["math-map-workspace-v1"]),
      summary: "统一 Entry/Inference、Fact/Claim、B0（B₀）、短名/完整名称、视觉语义与 Loop 时间截面的呈现规范。",
    }),
    Object.freeze({
      id: "rt-understanding-hierarchy-v1",
      code: "EXP-PRESENT-002",
      title: "RT 数学理解层级",
      category: "semantics",
      capability: "math-map-workspace",
      capabilityPackageId: null,
      module: "Progressive Mathematical Understanding",
      href: "knot-hopf-rt-understanding-lab.html",
      predecessorIds: Object.freeze(["rt-node-naming-v1"]),
      summary: "以联系和深入两种方式渐进展开同一组 RT Entry / Inference，验证从枢纽关系到单点证明结构的数学理解路径。",
    }),
    Object.freeze({
      id: "jsj-understanding-hierarchy-v1",
      code: "EXP-PRESENT-003",
      title: "JSJ 数学理解层级",
      category: "semantics",
      capability: "math-map-workspace",
      capabilityPackageId: null,
      module: "Progressive Mathematical Understanding",
      href: "generic-math-understanding-lab.html?map=jsj-decomposition",
      understandingMapId: "jsj-decomposition",
      predecessorIds: Object.freeze(["rt-understanding-hierarchy-v1", "three-manifolds-finite-covers-map-v1"]),
      summary: "把 JSJ、Seifert 与双曲化内容经标准通道送入同一套联系/深入交互，验证理解层级能否迁移到新的数学分支。",
    }),
    Object.freeze({
      id: "alpha-torus-bundle-v2-v1",
      code: "EXP-ADAPTER-001",
      title: "torus bundle v2 · Alpha 真实数据",
      category: "integration",
      dataSource: "Alpha 项目",
      capability: "alpha-project-adapter",
      capabilityPackageId: "alpha-project-adapter-v0.2",
      module: "Real Project View",
      href: "torus-bundle-v2-alpha-lab.html",
      predecessorIds: Object.freeze(["torus-bundle-stock-map-v1"]),
      summary: "直接只读加载 Alpha 的真实 Project View，验证 Focus、Section 与逐 Loop 数学增量在认可界面中的呈现。",
    }),
    Object.freeze({
      id: "uqsl3-alpha-channel-v1",
      code: "EXP-ADAPTER-002",
      title: "uqsl3 · Alpha 真实项目通道",
      category: "integration",
      dataSource: "Alpha 项目",
      capability: "alpha-project-adapter",
      capabilityPackageId: "alpha-project-adapter-v0.2",
      module: "Real Project View",
      href: "uqsl3-alpha-lab.html",
      predecessorIds: Object.freeze(["alpha-torus-bundle-v2-v1"]),
      summary: "直接只读加载 Alpha 中以 general-ell-sl2-gate 为专题包名的 uqsl3 Project View，验证基础、Section、路线与真实 Loop 进展。",
    }),
    Object.freeze({
      id: "torus-bundle-stock-map-v1",
      code: "EXP-MATH-002",
      title: "Funar torus bundles · 存量数学地图",
      category: "content",
      capability: "math-map-workspace",
      capabilityPackageId: "math-map-workspace-v2",
      module: "Native Project Baseline",
      href: "torus-bundle-v2-stock-lab.html",
      predecessorIds: Object.freeze(["math-map-workspace-v1"]),
      summary: "按 Fact/Claim 与 T/M/p 证明层级整理 trace-365 已完成路线和 trace-443 当前路线。",
    }),
  ]);

  const validAdoptionTargets = new Set(["gamma", "alpha"]);
  const validStatuses = new Set(Object.keys(statusLabels));

  function experimentFor(id) {
    return experiments.find((item) => item.id === id);
  }

  function lineageFor(id) {
    const experiment = experimentFor(id);
    if (!experiment) throw new TypeError(`unknown experiment: ${id}`);
    const predecessors = (experiment.predecessorIds ?? []).map((predecessorId) => {
      const predecessor = experimentFor(predecessorId);
      if (!predecessor) throw new Error(`unknown predecessor experiment: ${predecessorId}`);
      return predecessor;
    });
    const successors = experiments.filter((candidate) => (candidate.predecessorIds ?? []).includes(id));
    return Object.freeze({ predecessors: Object.freeze(predecessors), successors: Object.freeze(successors) });
  }

  function readRecords(storage) {
    try {
      const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed.records && typeof parsed.records === "object" && !Array.isArray(parsed.records)
          ? parsed.records
          : parsed;
      }
    } catch {
      // Browser-local state is optional; a malformed record falls back to the
      // clean pending state instead of blocking the laboratory page.
    }
    return {};
  }

  function readReviews(storage) {
    return readRecords(storage);
  }

  function defaultWorkflowState() {
    return {
      status: "pending",
      decision: "pending",
      decidedAt: null,
      statusChangedAt: null,
      capabilityPackageId: null,
      extractedAt: null,
      extractionReceipt: null,
      verification: { status: "unverified", verifiedAt: null, evidence: null },
      supersededAt: null,
      adoption: { gamma: "not-adopted", alpha: "not-adopted" },
    };
  }

  function decisionForStatus(status) {
    if (status === "rejected") return "rejected";
    if (status === "pending") return "pending";
    return "accepted";
  }

  function normalizeAdoption(adoption) {
    return {
      gamma: adoption?.gamma === "adopted" ? "adopted" : "not-adopted",
      alpha: adoption?.alpha === "adopted" ? "adopted" : "not-adopted",
    };
  }

  function normalizeWorkflow(id, record) {
    const fallback = defaultWorkflowState();
    const source = record && typeof record === "object" ? record : {};
    const legacyStatus = source.status ?? source.decision;
    const status = validStatuses.has(legacyStatus) ? legacyStatus : fallback.status;
    const experiment = experimentFor(id);
    const packageId = source.capabilityPackageId ?? experiment?.capabilityPackageId ?? null;
    return {
      status,
      decision: decisionForStatus(status),
      decidedAt: source.decidedAt ?? null,
      statusChangedAt: source.statusChangedAt ?? source.decidedAt ?? null,
      capabilityPackageId: capabilityPackages[packageId] ? packageId : null,
      extractedAt: source.extractedAt ?? null,
      extractionReceipt: source.extractionReceipt ?? null,
      verification: source.verification?.status === "verified"
        ? { status: "verified", verifiedAt: source.verification.verifiedAt ?? null, evidence: source.verification.evidence ?? null }
        : { status: "unverified", verifiedAt: null, evidence: null },
      supersededAt: source.supersededAt ?? null,
      adoption: normalizeAdoption(source.adoption),
    };
  }

  function workflowFor(id, storage) {
    if (!experimentFor(id)) throw new TypeError(`unknown experiment: ${id}`);
    return normalizeWorkflow(id, readRecords(storage)[id]);
  }

  function stateFor(id, storage) {
    return workflowFor(id, storage);
  }

  function reviewShape(state) {
    // Keep the v1 review API small and stable for old experiment pages/tests.
    return { decision: state.decision, decidedAt: state.decidedAt };
  }

  function reviewFor(id, storage) {
    return reviewShape(workflowFor(id, storage));
  }

  function persistWorkflow(id, state, storage) {
    const records = readRecords(storage);
    records[id] = state;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The UI remains usable in private/file contexts where storage is blocked.
    }
    return state;
  }

  function setReview(id, decision, storage, now = new Date()) {
    if (!experimentFor(id)) throw new TypeError(`unknown experiment: ${id}`);
    if (!decisionLabels[decision]) throw new TypeError(`unknown review decision: ${decision}`);
    const current = workflowFor(id, storage);
    const decidedAt = decision === "pending" ? null : now.toISOString();
    let next;
    if (decision === "pending") {
      next = { ...defaultWorkflowState(), decidedAt: null, statusChangedAt: now.toISOString() };
    } else {
      const advanced = ["extracted", "adopted", "superseded"].includes(current.status);
      next = {
        ...current,
        status: decision === "rejected" ? "rejected" : advanced ? current.status : "accepted",
        decision,
        decidedAt,
        statusChangedAt: now.toISOString(),
      };
    }
    persistWorkflow(id, next, storage);
    return reviewShape(next);
  }

  function canTransition(from, to) {
    if (from === to) return true;
    const transitions = {
      pending: ["accepted", "rejected"],
      accepted: ["extracted", "pending", "rejected"],
      extracted: ["adopted", "superseded", "pending", "rejected"],
      adopted: ["extracted", "superseded", "pending", "rejected"],
      superseded: ["pending", "accepted"],
      rejected: ["pending", "accepted"],
    };
    return transitions[from]?.includes(to) ?? false;
  }

  function capabilityPackageFor(id) {
    const experiment = experimentFor(id);
    return experiment ? capabilityPackages[experiment.capabilityPackageId] ?? null : null;
  }

  function packageManifestFor(id) {
    const packageInfo = capabilityPackageFor(id);
    return packageInfo ?? null;
  }

  function manifestFingerprint(manifest) {
    const input = JSON.stringify(manifest);
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function assertPackageIntegrity(id) {
    const packageInfo = capabilityPackageFor(id);
    if (!packageInfo) throw new RangeError(`experiment has no versioned capability package: ${id}`);
    const missingSources = packageInfo.sourceExperimentIds.filter((sourceId) => {
      const source = experimentFor(sourceId);
      return !source || source.capabilityPackageId !== packageInfo.id;
    });
    if (missingSources.length) throw new Error(`capability package source mismatch: ${missingSources.join(", ")}`);
    if (!packageInfo.sourcePaths.length || !packageInfo.acceptanceTestIds.length) {
      throw new Error(`capability package has no auditable source/test manifest: ${packageInfo.id}`);
    }
    return packageInfo;
  }

  function setStatus(id, status, storage, now = new Date()) {
    if (!experimentFor(id)) throw new TypeError(`unknown experiment: ${id}`);
    if (!validStatuses.has(status) || status === "rejected") {
      if (status === "rejected") return setReview(id, status, storage, now);
      throw new TypeError(`unknown workflow status: ${status}`);
    }
    const current = workflowFor(id, storage);
    if (!canTransition(current.status, status)) {
      throw new RangeError(`cannot transition ${current.status} to ${status}`);
    }
    if (["extracted", "adopted", "superseded"].includes(status) && !capabilityPackageFor(id)) {
      throw new RangeError(`experiment has no versioned capability package: ${id}`);
    }
    if (status === "pending") {
      const reset = { ...defaultWorkflowState(), statusChangedAt: now.toISOString() };
      persistWorkflow(id, reset, storage);
      return reset;
    }
    const next = {
      ...current,
      status,
      decision: decisionForStatus(status),
      statusChangedAt: now.toISOString(),
      capabilityPackageId: current.capabilityPackageId ?? experimentFor(id).capabilityPackageId,
      extractedAt: status === "extracted" && !current.extractedAt ? now.toISOString() : current.extractedAt,
      supersededAt: status === "superseded" && !current.supersededAt ? now.toISOString() : current.supersededAt,
    };
    persistWorkflow(id, next, storage);
    return next;
  }

  function extractCapability(id, storage, now = new Date()) {
    const current = workflowFor(id, storage);
    assertPackageIntegrity(id);
    if (["extracted", "adopted", "superseded"].includes(current.status)) return current;
    if (current.status !== "accepted") throw new RangeError("only an accepted experiment can be extracted");
    const extracted = setStatus(id, "extracted", storage, now);
    const manifest = packageManifestFor(id);
    const next = {
      ...extracted,
      extractionReceipt: Object.freeze({
        schema: "cmath.gamma.capability-extraction-receipt/v0.1",
        extractedAt: extracted.extractedAt,
        manifest,
        manifestFingerprint: manifestFingerprint(manifest),
      }),
      verification: { status: "unverified", verifiedAt: null, evidence: null },
    };
    persistWorkflow(id, next, storage);
    return next;
  }

  function verifyCapabilityExtraction(id, evidence, storage, now = new Date()) {
    const current = workflowFor(id, storage);
    const packageInfo = assertPackageIntegrity(id);
    if (!["extracted", "adopted"].includes(current.status) || !current.extractionReceipt) {
      throw new RangeError("extract the capability package before verification");
    }
    if (evidence?.schema !== "cmath.gamma.capability-verification/v0.1") {
      throw new TypeError("expected cmath.gamma.capability-verification/v0.1");
    }
    if (typeof evidence.sourceRevision !== "string" || !evidence.sourceRevision.trim()) {
      throw new TypeError("verification requires sourceRevision");
    }
    if (typeof evidence.testRunId !== "string" || !evidence.testRunId.trim()) {
      throw new TypeError("verification requires testRunId");
    }
    const passedTests = new Set(evidence.passedTestIds ?? []);
    const verifiedSources = new Set(evidence.verifiedSourceExperimentIds ?? []);
    const missingTests = packageInfo.acceptanceTestIds.filter((testId) => !passedTests.has(testId));
    const missingSources = packageInfo.sourceExperimentIds.filter((sourceId) => !verifiedSources.has(sourceId));
    if (missingTests.length) throw new Error(`verification is missing acceptance tests: ${missingTests.join(", ")}`);
    if (missingSources.length) throw new Error(`verification is missing source experiments: ${missingSources.join(", ")}`);
    const verifiedAt = now.toISOString();
    const next = {
      ...current,
      verification: {
        status: "verified",
        verifiedAt,
        evidence: {
          schema: evidence.schema,
          sourceRevision: evidence.sourceRevision.trim(),
          testRunId: evidence.testRunId.trim(),
          passedTestIds: [...packageInfo.acceptanceTestIds],
          verifiedSourceExperimentIds: [...packageInfo.sourceExperimentIds],
          manifestFingerprint: current.extractionReceipt.manifestFingerprint,
        },
      },
    };
    persistWorkflow(id, next, storage);
    return next;
  }

  function adoptCapability(id, target, storage, now = new Date()) {
    if (!validAdoptionTargets.has(target)) throw new TypeError(`unknown adoption target: ${target}`);
    const current = workflowFor(id, storage);
    if (!["extracted", "adopted"].includes(current.status)) {
      throw new RangeError("extract the capability package before adoption");
    }
    if (current.verification.status !== "verified") {
      throw new RangeError("verify the extracted capability package before adoption");
    }
    const next = {
      ...current,
      status: "adopted",
      decision: "accepted",
      statusChangedAt: now.toISOString(),
      adoption: { ...current.adoption, [target]: "adopted" },
    };
    persistWorkflow(id, next, storage);
    return next;
  }

  function setAdoption(id, target, adoptionStatus, storage, now = new Date()) {
    if (!validAdoptionTargets.has(target)) throw new TypeError(`unknown adoption target: ${target}`);
    if (!adoptionLabels[adoptionStatus]) throw new TypeError(`unknown adoption status: ${adoptionStatus}`);
    if (adoptionStatus === "adopted") return adoptCapability(id, target, storage, now);
    const current = workflowFor(id, storage);
    if (!["extracted", "adopted"].includes(current.status)) {
      throw new RangeError("extract the capability package before changing adoption");
    }
    const nextAdoption = { ...current.adoption, [target]: "not-adopted" };
    const hasAdoption = Object.values(nextAdoption).some((value) => value === "adopted");
    const next = {
      ...current,
      status: current.status === "adopted" && !hasAdoption ? "extracted" : current.status,
      decision: "accepted",
      statusChangedAt: now.toISOString(),
      adoption: nextAdoption,
    };
    persistWorkflow(id, next, storage);
    return next;
  }

  function supersedeExperiment(id, storage, now = new Date()) {
    return setStatus(id, "superseded", storage, now);
  }

  function element(document, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function reviewSelect(document, experiment, storage, onChange) {
    const select = element(document, "select", "experiment-review-select");
    select.setAttribute("aria-label", `评价实验：${experiment.title}`);
    Object.entries(decisionLabels).forEach(([value, label]) => {
      const option = element(document, "option", "", label);
      option.value = value;
      select.append(option);
    });
    select.value = reviewFor(experiment.id, storage).decision;
    select.addEventListener("change", () => {
      const review = setReview(experiment.id, select.value, storage);
      onChange?.(review);
    });
    return select;
  }

  function workflowMessage(state) {
    if (state.status === "pending") return "先完成评价，再决定是否提取能力包。";
    if (state.status === "accepted") return "已认可，但尚未提取；认可不会自动等于采用。";
    if (state.status === "extracted") return "能力包已提取；Gamma 与 Alpha 仍需分别显式采用。";
    if (state.status === "adopted") return "至少一个目标项目已采用；另一目标仍可单独处理。";
    if (state.status === "superseded") return "该版本已替代，保留记录且不会自动覆盖其他版本。";
    return "这是旧版不认可值；可重新评价。";
  }

  function statusBadge(document, state) {
    const badge = element(document, "span", "experiment-status-badge", statusLabels[state.status]);
    badge.dataset.status = state.status;
    return badge;
  }

  function actionButton(document, label, disabled, onClick) {
    const button = element(document, "button", "experiment-action", label);
    button.type = "button";
    button.disabled = Boolean(disabled);
    if (!disabled) button.addEventListener("click", onClick);
    return button;
  }

  function dataRow(document, label, value, className = "") {
    const row = element(document, "div", `experiment-data-row${className ? ` ${className}` : ""}`);
    row.append(element(document, "dt", "", label), element(document, "dd", "", value));
    return row;
  }

  function renderCapabilitySection(document, experiment, state, storage, rerender) {
    const section = element(document, "section", "experiment-stage experiment-capability-stage");
    section.setAttribute("aria-labelledby", `${experiment.id}-capability-heading`);
    const header = element(document, "header", "experiment-stage-header");
    header.append(
      element(document, "h3", "", "能力提取"),
      element(document, "span", "experiment-stage-kicker", state.capabilityPackageId ? "版本化能力包" : "未登记能力包"),
    );
    header.querySelector("h3")?.setAttribute("id", `${experiment.id}-capability-heading`);
    section.append(header);
    const packageInfo = capabilityPackageFor(experiment.id);
    if (!packageInfo) {
      section.append(element(document, "p", "experiment-stage-note", "该实验尚未登记版本化能力包；认可状态不会自动生成包。"));
      return section;
    }

    const packageTitle = element(document, "p", "experiment-package-title", packageInfo.id);
    packageTitle.append(element(document, "span", "experiment-package-version", ` · ${packageInfo.title}`));
    section.append(packageTitle);
    const details = element(document, "dl", "experiment-data-list");
    details.append(
      dataRow(document, "来源实验", packageInfo.sourceExperiments),
      dataRow(document, "当前 active", packageInfo.active ? "是" : "否"),
      dataRow(document, "当前默认", packageInfo.default ? "是" : "否"),
      dataRow(document, "supersedes", packageInfo.supersedes ?? "—"),
      dataRow(document, "实现来源", packageInfo.sourcePaths.join("；")),
      dataRow(document, "验收测试", packageInfo.acceptanceTestIds.join("；")),
      dataRow(document, "提取验证", state.verification.status === "verified" ? `已验证 · ${state.verification.evidence.sourceRevision}` : "尚未验证"),
    );
    section.append(details);

    const frozen = element(document, "div", "experiment-frozen-decisions");
    frozen.append(element(document, "strong", "", "冻结决策摘要"), element(document, "p", "", packageInfo.frozenDecisionSummary));
    const list = element(document, "ul", "experiment-decision-list");
    packageInfo.frozenDecisions.forEach((decision) => list.append(element(document, "li", "", decision)));
    frozen.append(list);
    section.append(frozen);

    const actions = element(document, "div", "experiment-stage-actions");
    if (state.status === "accepted") {
      actions.append(actionButton(document, "提取为能力包", false, () => {
        extractCapability(experiment.id, storage);
        rerender();
      }));
    } else if (state.status === "pending" || state.status === "rejected") {
      actions.append(actionButton(document, "先认可，再提取", true));
    } else {
      actions.append(element(document, "span", "experiment-action-state", `能力包${statusLabels[state.status]}`));
    }
    section.append(actions);
    return section;
  }

  function renderAdoptionSection(document, experiment, state, storage, rerender) {
    const section = element(document, "section", "experiment-stage experiment-adoption-stage");
    section.setAttribute("aria-labelledby", `${experiment.id}-adoption-heading`);
    const header = element(document, "header", "experiment-stage-header");
    const title = element(document, "h3", "", "采用状态");
    title.setAttribute("id", `${experiment.id}-adoption-heading`);
    header.append(title, element(document, "span", "experiment-stage-kicker", "Gamma / Alpha 分开记录"));
    section.append(header);
    const packageInfo = capabilityPackageFor(experiment.id);
    if (!packageInfo) {
      section.append(element(document, "p", "experiment-stage-note", "无版本化能力包，因此没有可记录的采用动作。"));
      return section;
    }

    const adoptionList = element(document, "dl", "experiment-adoption-list");
    ["gamma", "alpha"].forEach((target) => {
      const row = element(document, "div", "experiment-adoption-row");
      const label = target === "gamma" ? "Gamma" : "Alpha";
      row.append(element(document, "dt", "", label));
      const value = element(document, "dd", "", adoptionLabels[state.adoption[target]]);
      value.dataset.adoption = state.adoption[target];
      row.append(value);
      adoptionList.append(row);
    });
    section.append(adoptionList);

    const actions = element(document, "div", "experiment-stage-actions experiment-adoption-actions");
    if ((state.status === "extracted" || state.status === "adopted") && state.verification.status === "verified") {
      ["gamma", "alpha"].forEach((target) => {
        const label = target === "gamma" ? "Gamma" : "Alpha";
        const adopted = state.adoption[target] === "adopted";
        actions.append(actionButton(document, adopted ? `${label} 已采用` : `标记 ${label} 已采用`, adopted, () => {
          adoptCapability(experiment.id, target, storage);
          rerender();
        }));
      });
      actions.append(actionButton(document, "标记为已替代", false, () => {
        supersedeExperiment(experiment.id, storage);
        rerender();
      }));
    } else if (state.status === "extracted" || state.status === "adopted") {
      section.append(element(document, "p", "experiment-stage-note", "能力包尚无通过验收测试的验证回执，不能采用。"));
    } else if (state.status === "superseded") {
      actions.append(element(document, "span", "experiment-action-state", "已替代版本不可继续采用"));
    } else {
      actions.append(actionButton(document, "先提取能力包", true));
    }
    section.append(actions);
    return section;
  }

  function renderHubCard(document, experiment, storage, rerender) {
    const state = workflowFor(experiment.id, storage);
    const card = element(document, "article", "experiment-card");
    card.id = `experiment-${experiment.id}`;
    card.dataset.status = state.status;
    card.dataset.decision = state.decision;
    card.setAttribute("aria-labelledby", `${experiment.id}-title`);
    const meta = element(document, "div", "experiment-card-meta");
    meta.append(
      element(document, "span", "experiment-code", experiment.code),
      element(document, "span", "experiment-category", categoryLabels[experiment.category]),
    );
    const statusLine = element(document, "div", "experiment-card-status");
    statusLine.append(element(document, "span", "experiment-status-label", "实验状态"), statusBadge(document, state));
    const title = element(document, "h2", "", experiment.title);
    title.id = `${experiment.id}-title`;
    const summary = element(document, "p", "experiment-card-summary", experiment.summary);
    const tags = element(document, "div", "experiment-card-tags");
    if (experiment.dataSource) {
      tags.append(element(document, "span", "experiment-tag experiment-source-tag", `来源 · ${experiment.dataSource}`));
    }
    tags.append(element(document, "span", "experiment-tag experiment-capability-tag", capabilityLabels[experiment.capability]));
    const lineage = lineageFor(experiment.id);
    const lineageNav = element(document, "nav", "experiment-lineage");
    lineageNav.setAttribute("aria-label", `${experiment.title}的实验关系`);
    const appendLineage = (label, items) => {
      if (!items.length) return;
      const row = element(document, "div", "experiment-lineage-row");
      row.append(element(document, "span", "experiment-lineage-label", label));
      const links = element(document, "div", "experiment-lineage-links");
      items.forEach((item) => {
        const relationLink = element(document, "a", "experiment-lineage-link", item.title);
        relationLink.href = item.href;
        relationLink.title = `打开实验：${item.title}`;
        links.append(relationLink);
      });
      row.append(links);
      lineageNav.append(row);
    };
    appendLineage("来源实验", lineage.predecessors);
    appendLineage("后续实验", lineage.successors);
    const primaryActions = element(document, "div", "experiment-card-actions");
    const link = element(document, "a", "experiment-open", "打开实验");
    link.href = experiment.href;
    primaryActions.append(link);
    card.append(meta, statusLine, title, summary, tags);
    if (lineageNav.childElementCount) card.append(lineageNav);
    card.append(primaryActions);

    const evaluation = element(document, "section", "experiment-stage experiment-evaluation-stage");
    evaluation.setAttribute("aria-labelledby", `${experiment.id}-evaluation-heading`);
    const evaluationHeader = element(document, "header", "experiment-stage-header");
    const evaluationTitle = element(document, "h3", "", "实验评价");
    evaluationTitle.id = `${experiment.id}-evaluation-heading`;
    evaluationHeader.append(evaluationTitle, element(document, "span", "experiment-stage-kicker", decisionLabels[state.decision]));
    const evaluationNote = element(document, "p", "experiment-stage-note", workflowMessage(state));
    const evaluationActions = element(document, "div", "experiment-stage-actions");
    evaluationActions.append(reviewSelect(document, experiment, storage, rerender));
    evaluation.append(evaluationHeader, evaluationNote, evaluationActions);
    const record = element(document, "details", "experiment-record");
    record.append(element(document, "summary", "", "查看实验记录"));
    const recordBody = element(document, "div", "experiment-record-body");
    recordBody.append(
      evaluation,
      renderCapabilitySection(document, experiment, state, storage, rerender),
      renderAdoptionSection(document, experiment, state, storage, rerender),
    );
    record.append(recordBody);
    card.append(record);
    return card;
  }

  function groupExperimentsByCategory(items) {
    return Object.values(experimentCategories)
      .sort((left, right) => left.order - right.order)
      .map((category) => Object.freeze({
        ...category,
        experiments: Object.freeze(items.filter((item) => item.category === category.id)),
      }))
      .filter((group) => group.experiments.length > 0);
  }

  function renderExperimentIndexRow(document, experiment) {
    const link = element(document, "a", "experiment-index-row");
    link.href = experiment.href;
    link.append(
      element(document, "span", "experiment-index-name", experiment.title),
      element(document, "span", "experiment-index-arrow", "→"),
    );
    link.querySelector(".experiment-index-arrow")?.setAttribute("aria-hidden", "true");
    return link;
  }

  function renderCategoryGroup(document, group) {
    const section = element(document, "section", "experiment-category-group");
    section.dataset.category = group.id;
    section.setAttribute("aria-labelledby", `experiment-category-${group.id}`);
    const header = element(document, "header", "experiment-category-header");
    const title = element(document, "h2", "", group.label);
    title.id = `experiment-category-${group.id}`;
    header.append(title);
    const list = element(document, "nav", "experiment-category-list");
    list.setAttribute("aria-label", `${group.label}实验`);
    list.append(...group.experiments.map((item) => renderExperimentIndexRow(document, item)));
    section.append(header, list);
    return section;
  }

  function mountPageReview(document, storage) {
    const id = document.documentElement.dataset.experimentId;
    const experiment = experimentFor(id);
    const actions = document.querySelector(".topbar-actions");
    if (!experiment || !actions) return;
    const control = element(document, "label", "experiment-review");
    control.append(element(document, "span", "", "实验评价"));
    const note = element(document, "small", "", "仅记录在 Gamma 实验室");
    const select = reviewSelect(document, experiment, storage, (review) => {
      const state = workflowFor(experiment.id, storage);
      control.dataset.status = state.status;
      note.textContent = `${statusLabels[state.status]} · 仅记录在 Gamma 实验室`;
      control.dataset.decision = review.decision;
    });
    const state = workflowFor(experiment.id, storage);
    control.dataset.status = state.status;
    control.dataset.decision = select.value;
    note.textContent = `${statusLabels[state.status]} · 仅记录在 Gamma 实验室`;
    control.append(select, note);
    actions.prepend(control);
  }

  function mountHub(document, storage) {
    const grid = document.querySelector("#experiment-grid");
    if (!grid) return;
    const search = document.querySelector("#experiment-search");
    const category = document.querySelector("#experiment-category");
    if (category && category.options.length === 1) {
      Object.values(experimentCategories)
        .sort((left, right) => left.order - right.order)
        .forEach((item) => {
          const option = element(document, "option", "", item.label);
          option.value = item.id;
          category.append(option);
        });
    }
    const requestedCapability = new URLSearchParams(document.defaultView?.location?.search ?? "").get("capability");

    const render = () => {
      const query = search?.value.trim().toLocaleLowerCase() ?? "";
      const visible = experiments.filter((item) => {
        const searchable = `${item.title} ${categoryLabels[item.category]}`.toLocaleLowerCase();
        return (!query || searchable.includes(query))
          && (!category || category.value === "all" || item.category === category.value)
          && (!requestedCapability || item.capability === requestedCapability);
      });
      const groups = groupExperimentsByCategory(visible);
      if (groups.length) {
        grid.replaceChildren(...groups.map((group) => renderCategoryGroup(document, group)));
      } else {
        grid.replaceChildren(element(document, "p", "experiment-empty", "没有符合当前筛选条件的实验。"));
      }
    };
    [search, category].filter(Boolean).forEach((control) => control.addEventListener("input", render));
    [category].filter(Boolean).forEach((control) => control.addEventListener("change", render));
    render();
  }

  function mount(document, storage) {
    mountPageReview(document, storage);
    mountHub(document, storage);
  }

  return Object.freeze({
    STORAGE_KEY,
    experiments,
    experimentCategories,
    capabilityPackages,
    decisionLabels,
    statusLabels,
    adoptionLabels,
    categoryLabels,
    capabilityLabels,
    readReviews,
    workflowFor,
    stateFor,
    reviewFor,
    setReview,
    setStatus,
    extractCapability,
    verifyCapabilityExtraction,
    adoptCapability,
    setAdoption,
    supersedeExperiment,
    capabilityPackageFor,
    packageManifestFor,
    lineageFor,
    groupExperimentsByCategory,
    mount,
  });
});
