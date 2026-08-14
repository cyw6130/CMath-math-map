# Gamma 数学地图（Math Map Lab）

一个纯静态的数学知识地图可视化页面：把一份 **Gamma-native Project View JSON** 渲染成可交互的
Fact / Claim / Inference 图（开放 Claim、已建立 Claim、推导关系、Loop 进展一目了然）。

**在线使用**：打开 <https://cyw6130.github.io/gamma-math-map/>，可以载入本地 Project View JSON，
也可以在浏览器中把带文本层的数学论文 PDF 整理成 Project View JSON。

页面左上角的项目下拉也内置了几份示例地图（群论、谱定理、介值定理、微积分基本定理、三维流形等），
可以直接切换查看。

## 本地运行

**桌面版（推荐）**：双击桌面上的 `Gamma Math Map.app`，会启动本机服务并打开地图页面。
所有功能与在线版一致，额外支持把各服务商的 API Key 记住在本机。

**手动运行**：

```bash
cd gamma-math-map
node server.js            # 或 npm run dev -- --port 7100
# 打开 http://127.0.0.1:7100/
```

注意：`?preview=1` 参数控制「导入 Project View JSON」面板的显示，直接双击 html 文件
（file:// 协议）会丢失该参数，请用上面的本地服务方式打开。

## 从论文导出 JSON

在「模型 API 配置」中选择 DeepSeek、Kimi 或其他兼容服务，临时输入对应 API Key，然后点击
「上传数学论文 PDF」。Kimi 预设使用 Moonshot 端点 `https://api.moonshot.cn/v1` 和可编辑的
`kimi-k3` 模型名称。浏览器使用内置的 `pdfjs-dist@6.2.108` 提取逐页文本，直接请求配置的
OpenAI-compatible 端点，校验模型输出并下载
`paper-project-view.json`。

API Key 的保存分两种环境：

- **GitHub Pages 在线版**：Key 只用于本次导入，不写入本地存储或导出的 JSON，请求结束后
  输入框会被清空（隐私默认）。
- **桌面版（`node server.js` / `Gamma Math Map.app`）**：本地服务器提供
  `GET/PUT /api/local-key` 环回端点，Key 只保存在
  `~/.gamma-math-map/keys.json`（权限 0600，仅本机可读）。勾选「记住 Key 到本地」后，
  下次打开自动填入当前服务商的 Key；取消勾选则恢复"用后即清"。在线版不会显示该选项，
  也不存在任何本地端点。

当前版本只支持带文本层且不超过 25 MB 的 PDF，提取文本上限为 180,000 字符，不支持扫描版 OCR。
该流程生成带正式 `entries` / `inferences` 的 Gamma-native 本地预览。没有 proof 的 Claim 仍在地图中，
由既有闭包能力派生为开放 Claim（空心圆）；具备可用 proof 的 Claim 派生为已建立 Claim（实心圆）。
浏览器预览不会把结果写入 Gamma registry，也不执行 Admission 或正式证明提交。

## 文件来源

可视化代码拷贝自 CMath_gamma 项目 `frontend/` 目录，仅三处部署版专有改动：
新增 `index.html` 跳转页与本 README；`generic-math-map-bootstrap.js` 的载入失败提示
会显示具体错误信息（ upstream 只显示固定文案）。force-graph 依赖见其 `vendor/force-graph/LICENSE`。

## 隐私

打开本地 JSON 时，文件只经浏览器 File API 在内存中校验、投影和渲染，不发生上传。
只有用户明确执行 PDF 导出时，提取出的论文内容才会发送到当前配置的模型服务端点。
API Key 不会写入本地存储、导出的 JSON 或本仓库。
