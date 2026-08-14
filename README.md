# Gamma 数学地图（Math Map Lab）

一个纯静态的数学知识地图可视化页面：把一份 **Gamma-native Project View JSON** 渲染成可交互的
Fact / Claim / Inference 图（开放 Claim、已建立 Claim、推导关系、Loop 进展一目了然）。

**在线使用**：打开 <https://cyw6130.github.io/gamma-math-map/>，可以载入本地 Project View JSON，
也可以连接本机 CMath 服务，把带文本层的数学论文 PDF 整理成候选 Project View JSON。

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

PDF 提取依赖 CMath Harness、Python `pdfplumber`、Poppler 以及已配置的模型执行器，不能在
GitHub Pages 的浏览器沙箱中独立运行。后端服务可运行在服务器或开发环境中：

```bash
cd gamma-math-map
export CMATH_HARNESS_ROOT=/absolute/path/to/CMath-harness
export CMATH_MODEL_PROJECT_ROOT=/absolute/path/to/model-configured-project
export HOST=0.0.0.0
export PORT=4317
node tools/paper-import-server.mjs
```

`CMATH_HARNESS_ROOT` 需要包含支持自动模型执行的 `cmath import-paper`（最低实现提交
`abef5dd`）。`CMATH_MODEL_PROJECT_ROOT/research/model-routing.json` 至少配置 `reasoner` 和
`reviewer`；模型凭证仅由本机 Harness 从环境读取。服务地址默认为
`http://127.0.0.1:4317`；部署时通过 `window.CMATH_PAPER_IMPORT_ENDPOINT` 把原按钮指向后端的
`/v1/import-paper`。公开部署应放在带身份验证和请求配额的反向代理之后，避免公开消耗模型额度。

然后在主页点击「上传数学论文 PDF」。处理完成后浏览器会下载
`candidate-project-view.json`；该流程只生成候选地图，不执行 Admission、正式证明提交或 OCR。

## 文件来源

可视化代码拷贝自 CMath_gamma 项目 `frontend/` 目录，仅三处部署版专有改动：
新增 `index.html` 跳转页与本 README；`generic-math-map-bootstrap.js` 的载入失败提示
会显示具体错误信息（ upstream 只显示固定文案）。force-graph 依赖见其 `vendor/force-graph/LICENSE`。

## 隐私

打开本地 JSON 时，文件只经浏览器 File API 在内存中校验、投影和渲染，不发生上传。
只有用户明确执行 PDF 导出时，论文才会发送到配置的论文导入后端；服务拒绝其他网页来源，
在临时目录中运行 Harness，并在响应后删除 PDF 和中间产物。模型密钥
不会发送给 GitHub Pages，也不会写入本仓库。
