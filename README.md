# Gamma 数学地图（Math Map Lab）

一个纯静态的数学知识地图可视化页面：把一份 **Gamma-native Project View JSON** 渲染成可交互的
Fact / Claim / Inference 图（开放 Claim、已建立 Claim、推导关系、Loop 进展一目了然）。

**在线使用**：打开 <https://cyw6130.github.io/gamma-math-map/>，可以载入本地 Project View JSON，
也可以在浏览器中把带文本层的数学论文 PDF 整理成 Project View JSON。

页面左上角的项目下拉也内置了几份示例地图（群论、谱定理、介值定理、微积分基本定理、三维流形等），
可以直接切换查看。

## 本地运行

```bash
cd gamma-math-map
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000/ （会自动跳到 generic-math-map-lab.html?preview=1）
```

注意：`?preview=1` 参数控制「导入 Project View JSON」面板的显示，直接双击 html 文件
（file:// 协议）会丢失该参数，请用上面的本地服务方式打开。

## 从论文导出 JSON

在「模型 API 配置」中临时输入 DeepSeek API Key，然后点击「上传数学论文 PDF」。浏览器使用
内置的 `pdfjs-dist@6.2.108` 提取逐页文本，直接请求配置的 DeepSeek 兼容端点，校验模型输出并下载
`paper-project-view.json`。API Key 只用于本次导入，不写入本地存储或导出的 JSON，请求结束后
输入框会被清空。

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
只有用户明确执行 PDF 导出时，提取出的论文内容才会发送到配置的 DeepSeek 兼容端点。
API Key 不会写入本地存储、导出的 JSON 或本仓库。
