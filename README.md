# Gamma 数学地图（Math Map Lab）

一个纯静态的数学知识地图可视化页面：把一份 **Gamma-native Project View JSON** 渲染成可交互的
Fact / Claim / Inference 图（开放 Claim、已建立 Claim、推导关系、Loop 进展一目了然）。

**在线使用**：打开 <https://cyw6130.github.io/gamma-math-map/>，点「选择文件」载入本地的
Project View JSON 即可。文件只在你自己的浏览器里读取，不上传、不写入任何项目。

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

## 文件来源

可视化代码拷贝自 CMath_gamma 项目 `frontend/` 目录，仅三处部署版专有改动：
新增 `index.html` 跳转页与本 README；`generic-math-map-bootstrap.js` 的载入失败提示
会显示具体错误信息（ upstream 只显示固定文案）。force-graph 依赖见其 `vendor/force-graph/LICENSE`。

## 隐私

上传的 JSON 只经浏览器 File API（`file.text()`）在内存中校验、投影、渲染，
代码中没有任何会把文件内容发出页面的网络调用（全仓库唯一的 `fetch` 只用于加载
页面自带的内置示例数据，同源静态文件）。托管方 GitHub Pages 是纯静态托管，
页面不含任何服务端逻辑。可用浏览器开发者工具的 Network 面板自行验证：载入文件时不会产生新的网络请求。
