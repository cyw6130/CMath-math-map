# V5 可作为一次性例外候选，但发布前必须预览并再次授权

日期：2026-08-30 · 状态：Accepted

`canonical-map-v5-fidelity-with-complete-dependencies` 是当前 Sol 与 Muse Spark 综合表现最好的已测候选，但没有满足常规 Benchmark Winner 的全部硬门槛。本次允许它作为一次性的 Exceptional Workflow Release 进入网站接入与验收，不追认其为 Benchmark Winner，也不永久降低后续版本必须经过 Winner、Canary 与用户最终授权的常规发布标准。

发布前用户进一步决定数学地图内容默认使用简体中文。由于该要求会改变模型生成行为，网站候选获得新的精确身份 `canonical-map-v5.1-zh-default-fidelity-with-complete-dependencies`；旧 V5 Benchmark 证据保持历史有效，但不冒充 V5.1 的完整 Benchmark 证据。V5.1 在同一份 V5 数学提取规则上增加一条集中维护的语言合同：`Entry.title`、`Entry.statement` 与 `Inference.argument` 使用准确、自然的简体中文，公式、符号、变量、标准专名和必要英文缩写按来源保留，翻译不得改变条件、量词、逻辑方向或术语含义。

接入前先从十篇现有 Benchmark 的 V5 Sol medium 生成结果中固定随机抽样，并用网站真实可视化层只读渲染给用户检查；这一步不调用模型、不切换默认值，也不代替 Canary。用户接受渲染方向后，候选才按实验室中经过测试的精确 V5 语义接入：正常路径一次生成 Canonical Math Map JSON，能力包校验失败时才以同一模型最多完整修复两次。网站默认使用现有 CMath Muse Spark 网关并保留用户自有 API 入口；Sol medium 仅作发布前来源准确性评价。发布候选随后必须用一篇真实、非 Benchmark 的短数学论文完成生成、标准 JSON 校验、网站前端渲染、保存、重新打开与刷新恢复，并通过无 fabrication、无 distortion、无主证明链破坏的来源验收。任何失败都会阻止发布；修复形成新的精确候选并重跑全部发布预览。

本地发布候选已用非 Benchmark 论文 *A note on simplicial cliques*（arXiv:2012.05287）完成 Canary：MinerU 解析 11 页，Muse Spark 生成 30 个 Entry 与 18 条 Inference；首轮和第一次修复分别被 v3 能力合同发现 organization cycle，第二次也是最后一次修复后通过。结果经本地地图库保存、页面刷新、重新打开与真实前端渲染成功。随后由 `gpt-5.6-sol` medium 做完整来源核对，48 个被检查对象全部为 supported，0 fabrication、0 distortion。该 Canary 的自引用 coverage 只用于来源对象核对，不宣称非 Benchmark 论文的完整覆盖率为 100%；覆盖门槛仍由十篇 Benchmark 证据承担。

Canary 同时发现线上 Muse 网关会把缺省推理档位强制写为 `reasoning.effort=none`，而当前上游模型不再接受该值。发布候选已改为缺省时完全省略 reasoning 字段，并保留显式 low/medium/high 的兼容路径；这项网关修复必须与网站候选一同发布。用户尚未给出最终“发布”授权，因此当前只完成本地候选与验收，不部署 Worker、不推送网站。

V5.1 中文默认版沿用同一篇非 Benchmark 论文重跑真实 Canary。首次运行得到 18 个 Entry 与 5 条 Inference，虽有 41/41 个文本字段为中文且 Sol medium 核对 23/23 个对象均为 supported，但暴露出首轮 JSON 语法错误时修复环节丢弃原始模型文本、从零重写导致覆盖压缩的问题。候选随后改为把首轮原始文本交给修复调用做定点 JSON 修复；回归测试固定该行为。第二次运行首轮即通过合同，得到 26 个 Entry、15 条 Inference，67/67 个文本字段含中文；Sol medium 对 41 个数学对象逐条核对，全部 supported，0 fabrication、0 distortion。该自引用 coverage 仍不等同于完整论文覆盖率，V5.1 的正式发布资格还须以其自身的 Benchmark 与最终授权为准。

发布预览随后还发现标准 JSON 的新前端适配器曾自行显示“定义 1 / 命题 1 / 证明 1”，绕过了 `math-map-naming-v2`。候选现已改为由正式命名能力分配 `<类型> · <正整数> · <数学短名>`，并把 `cmath-gamma.math-map-numbering-ledger/v1` 随本地地图、浏览器存储和地图库备份持久化；排序、刷新和后续新增对象不会重编号既有对象。原文标题开头的 `(4)`、`(3.1)`、`(7).1` 等来源定位号只从展示短名中移除，避免与正式编号重复，标准 JSON 中的原始 `title` 保持不变。该修正只改变展示身份与持久编号，不改写 Canonical Math Map JSON 的数学内容。

用户须先在网站真实界面看到发布预览，再单独明确说“发布”。授权与候选身份、测试证据、预览证据一并记录到 GitHub Issue 后才可推送 `main` 并切换默认工作流。上线后保留当前 V4.1 作为紧急回退版本；可复现硬故障、fabrication、distortion 或主证明链破坏触发立即回退，快捷回退至少保留到上线满 14 天且成功完成三篇真实非 Benchmark 导入。
