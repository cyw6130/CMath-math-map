# CMath 数学地图（Math Map Lab）

CMath 数学地图是一个纯静态的数学命题与推演关系地图可视化工作台：将结构化的 **Project View JSON** 渲染为高可读、可交互的数学图网络（Fact / Claim / Inference），清晰呈现数学命题状态（开放 Claim、已建立 Claim）、推导依赖链以及研究 Loop 进展。

在线访问：<https://cyw6130.github.io/CMath-math-map/>

## 从哪里开始

| 要做什么 | 位置 |
| --- | --- |
| 本地运行 | `npm run dev` |
| 修改工作台页面 | `index.html`、`app-v5.js`、`app-v5.css` |
| 修改论文导入、地图库等业务功能 | `src/` |
| 查看能力依赖与同步信息 | `capabilities/` |
| 修改内置示例 | `examples/`；`generated-math-content/` 是生成结果 |
| 查设计决定、运行测试、使用开发工具 | `docs/`、`tests/`、`scripts/`、`tools/` |

根目录的 HTML、JS、CSS 与在用 Logo 共用现有静态发布路径；移动前需同步网页、桌面入口和能力分发配置。旧实验、备用图片、施工票据与临时备份保存在仓库外，不作为当前源码入口。

---

## 目录

1. [项目与产品定位](#项目与产品定位)
2. [部署架构与根目录设计](#部署架构与根目录设计)
3. [当前入口与文件生命周期划分](#当前入口与文件生命周期划分)
4. [仓库目录导航](#仓库目录导航)
5. [能力权威与同步机制](#能力权威与同步机制)
6. [论文解析工作流与隐私说明](#论文解析工作流与隐私说明)
7. [基准测试与模型评估](#基准测试与模型评估)
8. [本地开发与测试命令](#本地开发与测试命令)
9. [历史版本归档](#历史版本归档)

---

## 项目与产品定位

CMath 数学地图专注于为数学研究与论文研读提供结构化的知识图谱交互：
- **概念与命题网络**：直观区分公理/已知事实（Fact）、待证/已证命题（Claim）及逻辑推演关系（Inference）。
- **推演闭包计算**：基于基础事实与前置定理（$B_0$ 集合）实时计算推导闭包，自动派生已建立（Established，实心圆）与开放（Open，空心圆）命题状态。
- **研究 Loop 进展回放**：支持按研究步序（Loop）增量回放数学地图演化脉络。
- **论文解析导入器**：内置基于大语言模型的 PDF 论文结构化解析流水线，将无结构论文快速整理为符合规范的 Project View 数据包。

---

## 部署架构与根目录设计

本仓库同时作为 **GitHub Pages 静态托管根目录（Static Deployment Root）**。

为了确保 GitHub Pages 在纯静态环境下实现零构建、零重定向的直接服务，本仓库采取**生产入口与运行时资源驻留根目录**的设计原则：
- 生产入口 HTML（`index.html`、`index-v5.html`）、核心交互脚本（`app-v5.js`）、样式表（`app-v5.css`、`styles.css`、`math-map-lab.css`）、底层通用渲染模块以及 `vendor/` 静态依赖均直接位于仓库根目录。
- 保持这种扁平的静态运行时布局，使得本地静态服务、桌面封装应用（`CMath Math Map.app`）与线上 GitHub Pages 共享完全一致的相对路径解析体系。

---

## 当前入口与文件生命周期划分

项目内的代码与页面按当前用途划分（部分边界尚存歧义的实验性资产有意保留在根目录）：

### 1. 当前生产主线（Current Production）
- `index.html`：Paper Grotesque Edition 工作台与全屏数学地图的唯一可编辑生产入口。
- `index-v5.html`：由生产发布清单生成的兼容镜像，保留既有网址，不得手工编辑。
- `app-v5.js` / `app-v5.css`：当前主线交互逻辑与界面样式，支持论文解析抽屉、模型端点配置、本地 JSON 载入及地图画布交互。
- `paper-import-client.js`：浏览器端多阶段论文文本提取与结构化解析客户端。
- `server.js`：本地桌面/开发环回服务（支持本地 API Key 安全存储）。
- `local-map-store.js`：本地数学地图库持久化；地图保存在 `~/.cmath-math-map/maps/`，供不同浏览器会话共同读取。

### 2. 实验与通用辅助页面（Experimental & Generic Pages）
- `generic-math-map-lab.html` / `generic-math-map-lab-redesign.html`：通用数学地图实验室页面与重构预览。
- `math-map-system-case.html`：系统集成案例展示页。
- `app.js` / `app.css` / `lab-experiments.js`：通用实验脚手架与探索性交互脚本（暂予原位保留）。

### 3. 已归档历史版本（Archived Historical Snapshots）
- 旧版页面、实验原型和 Agent 施工记录已移到仓库外保存，不随网站发布。历史代码仍可通过 Git 历史查阅。

---

## 仓库目录导航

```
CMath-math-map/
├── index.html                   # 生产主入口（Paper Grotesque v5.0）
├── index-v5.html                # v5.0 版本入口镜像
├── app-v5.js / app-v5.css       # v5.0 主交互逻辑与设计系统样式
├── paper-import-client.js       # 论文解析客户端（分段提取/整合/装配/修复）
├── server.js                    # 本地开发与桌面端环回服务
├── styles.css / math-map-lab.css# 基础布局与数学地图工作区样式
│
├── capabilities/                # 能力消费元数据
│   └── consumer-manifest.json   # 从 CMath-capabilities 同步的消费清单
│
├── generated-math-content/      # 内置预置数学地图数据包
│   ├── registry.js              # 案例注册表
│   ├── spectral-theorem-*.js    # 谱定理案例
│   ├── intermediate-value-*.js  # 介值定理案例
│   └── fundamental-theorem-*.js # 微积分基本定理案例等
│
├── tests/                       # 自动化测试套件
│   ├── capabilities-consumer.test.mjs # 能力消费完整性与哈希一致性测试
│   ├── paper-import-client.test.mjs   # 论文解析客户端单元测试
│   └── fixtures/                # 测试基准 Golden 参考与规范
│
├── scripts/                     # 运维脚本
│   ├── evaluate-output.mjs      # 模型输出质量单体体检脚本
│   ├── bench-models.mjs         # 多模型基准批量跑分脚本
│   └── local-launch.sh          # 本地启动辅助脚本
│
├── vendor/                      # 纯静态第三方依赖库
│   ├── katex/                   # 数学公式排版引擎与字体
│   ├── force-graph/             # 力导向图渲染引擎
│   ├── pdfjs/                   # PDF 文本解析引擎 (pdfjs-dist)
│   └── fonts/                   # 界面字体文件
│
└── _config.yml                 # GitHub Pages 发布排除项
```

---

## 能力权威与同步机制

### 1. CMath-capabilities 唯一能力权威
本项目所使用的数学地图核心逻辑严格遵循上游仓库 `CMath-capabilities` 的统一标准。`CMath-capabilities` 是 CMath 生态中**唯一的全局能力权威（Sole Capability Authority）**。

本项目消费并集成的规范能力包括：
- `math-graph-semantics-v2`：数学图对象定义（Fact/Claim/Inference）与 Claim 闭包计算。
- `math-map-naming-v2`：永久编号生命周期与显示标签规范。
- `research-loop-progress-v1`：研究 Loop 历史与切片增量。
- `math-map-visual-semantics-v1`：数学对象视觉分类与图例映射。
- `graph-core-v1`：力导向图画布状态与连续性交互契约。
- `math-map-workspace-v3`：工作区视图组合与单目标 Focus，不推断或切换 Route。
- `math-rendering-v1`：KaTeX 公式渲染与降级保护。
- `alpha-project-adapter-v0.2`：只读项目数据适配器。

### 2. 根目录能力副本与同步规则（DO NOT EDIT DIRECTLY）
根目录下的下列能力分发运行时文件均为**自动同步生成的消费者副本（Consumer Copies）**：
- `math-map-semantics.js`
- `math-map-naming.js`
- `research-loop-progress.js`
- `math-map-visual-semantics.js`
- `graph-contract.js`
- `graph-canvas.js`
- `math-map-model.js`
- `math-map-lab.js`
- `math-text.js`
- `math-rendering-loader.js`
- `math-map-project-adapter.js`

> [!WARNING]
> 这些文件头部均带有 `@cmath-provenance` 溯源注释与内容校验哈希。**严禁在本项目中直接就地编辑修改这些运行时文件**。任何能力改进必须在 `CMath-capabilities` 对应 package 中完成，然后通过 `npm run sync-capabilities` 同步至本项目。

### 3. 同步命令与清单
通过运行以下命令从上游自动拉取最新能力定义并更新 `capabilities/consumer-manifest.json`：
```bash
npm run sync-capabilities
npm run test:capabilities
```

---

## 论文解析工作流与隐私说明

### 1. 解析流水线
在工作台选择或配置模型后，上传带文本层的数学论文 PDF。当前保留 v1/v2 实验，并新增可独立优化的 v3：

`Prepare → Paper Guide → Target → Extract（全文覆盖 + 主线定向）→ Aggregate → Compile Candidate Map`

其中 Paper Guide 先识别论文主目标、关键中间结果和支撑结果；全文覆盖通道保证完整性，主线定向通道围绕关键结果展开定义、引理、外部结果与证明。`related_lead_ids` 只用于叙事导航，不会自动生成证明边。聚合阶段合并两路条目并复用既有跨段整合，最后复用既有逻辑装配与定点修复。标准流程只生成候选地图，不执行准入、数学状态修改或存储写入；Source-Fidelity Review 保留为可选事后审计。

Paper Guide、双通道提取的 prompt/schema 由 `CMath-capabilities/packages/research-process/import/paper-dossier-extractor-v2` 唯一维护，并通过 `npm run sync-capabilities` 同步到本项目。DSH 插件只负责阶段路由、模型调用与返回结果，不持有业务提示词。

### 2. 模型默认推荐
- 公开网站默认展示 **CMath 提供 · Muse Spark 1.3 Contributor**，无需访问者配置 API Key；该路径只有在独立模型网关完成部署后才可用。
- 使用自己的 API 时，默认推荐 **OpenCode Go** 的 **DeepSeek V4 Flash**。该模型兼具高推理速度与结构准确率。在进行大输出量提取任务时，默认配置 `reasoning_effort: "none"`，防止思维链过长耗尽 Token 预算导致截断。
- 亦全面支持 DeepSeek V4 Pro、Kimi K3（Moonshot 端点）、GLM、MiniMax、Qwen 等 OpenAI 兼容端点。

### 3. 隐私与数据安全
- **明确的数据路径**：本地 JSON 只在浏览器中解析和渲染；PDF 会按已披露的生产流程提交 MinerU 解析。选择 CMath 提供的 Muse Spark 时，论文内容和模型输出会经受保护网关发送至 OpenCode Go，首次提交前必须主动同意其 Contributor 训练用途说明。
- **API Key 隐私保护**：
  - CMath 提供的模型：共享 Key 只存在 `cmath-model-gateway` 的 `OPENCODE_GO_API_KEY` Worker Secret 中，不进入前端、浏览器存储、日志或地图结果。
  - 在线版（GitHub Pages）：API Key 仅存于当前会话内存中发起推理请求，用完即清，不落盘、不存入 LocalStorage。
  - 本地桌面版（`node server.js`）：提供本地环回配置（`~/.gamma-math-map/keys.json`，权限 `0600`，仅限本机读写）。

模型网关使用独立配置 `wrangler.model-gateway.jsonc`。部署前必须先确认 OpenCode Go 条款允许公开网站的第三方转发使用，再通过 Wrangler Secret 配置 `OPENCODE_GO_API_KEY`；部署成功后把 `index.html` 与 `index-v5.html` 的 `data-model-gateway-url` 指向 `/api/model` 公共地址。真实 Key 不得写入配置文件或仓库。

---

## 基准测试与模型评估

论文导入 Gold、冻结来源、模型输出、评分器和回归测试统一归属同级
[`CMath-Benchmark`](../CMath-Benchmark/) 项目。本项目只保留生产流水线、能力合同和不依赖大样本的单元测试。

---

## 本地开发与测试命令

### 安装与运行
```bash
# 启动本地开发服务（默认端口 7100）
npm run dev

# 或直接指定端口运行
node server.js --port 7100
```

本地服务还提供 `GET /api/maps` 与 `POST /api/maps`。在工作台导入的 Project View JSON 会写入 `~/.cmath-math-map/maps/`；重新打开或刷新 `127.0.0.1:7100` 后，“我的 JSON 地图”会自动从后端恢复。在线静态部署继续使用浏览器会话存储。

### 完整测试套件
```bash
# 1. 运行能力消费完整性与哈希一致性检查
npm run test:capabilities

# 2. 运行论文解析客户端与语义基准测试套件
npm test

# 2a. 修改生产页面或运行时清单后，同步并校验两个静态入口
npm run sync:production-entry
npm run check:production-entry

# 3. 运行论文导入 benchmark
cd ../CMath-Benchmark
npm run test:paper-import
npm run audit:paper-import
```

---

## 历史版本归档

旧版页面、未合并实验原型与 Agent 施工票据已迁出公开仓库，并在本机仓库外归档。Git 历史保留此前提交；当前功能以根目录 `index.html` 为准。

GitHub Pages 通过 `_config.yml` 排除工程文档、测试、脚本与实验资料，仅发布产品页面及运行所需资源。排除网站发布不会隐藏公开仓库里的文件或历史提交。
