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

可视化代码原样拷贝自 CMath_gamma 项目 `frontend/` 目录（未做任何修改），
仅新增本 `index.html` 跳转页与 README。force-graph 依赖见其 `vendor/force-graph/LICENSE`。
