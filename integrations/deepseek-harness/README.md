# Math Map for DeepSeek Harness

一个可安装 Bundle，组合四个 Cordis 插件：Core Service、Paper Import Tool、Stage Router 和 UI Plugin。UI Plugin 直接托管并嵌入本仓库现有的 v5 Math Map 工作台，不维护第二套 Viewer。当前针对 DeepSeek Harness `0.1.0-rc.6`。

```bash
dsh plugin --profile math-map add @deepseek-ai/dsh-web-app @cmath/dsh-math-map
dsh --profile math-map --dump-config
dsh --profile math-map
```

本地开发 checkout 可将第二个包名换成 `./integrations/deepseek-harness`。Bundle 与 Profile 是两层：本目录负责贡献四个插件，`dsh plugin` 负责创建并维护名为 `math-map` 的应用 Profile。

工具 `cmath_import_paper` 接受带 `[[PAGE N]]` 标记的论文文本；PDF 文本提取仍由现有 Math Map 浏览器负责。所有模型请求统一经过 `ctx.llm`，并按 extract / integrate / assemble / repair 阶段路由。
默认路由使用 rc.6 内置的 `deepseek-official`，四个阶段都走 `deepseek-v4-flash`；可在 Profile patch 中逐阶段覆盖。

## 模型切换

本 Bundle 同时注册两个可选模型：

- 正式 Benchmark 和默认导入路由：`deepseek-official / deepseek-v4-flash`；
- 私有 OpenAI-compatible 路由：`luna-gateway / gpt-5.6-luna`。

Luna 的地址和模型元数据写在 `cordis.patch.yml`，密钥不写入项目，而是使用 Harness 凭证引用 `LUNA_API_KEY`。首次配置时，将密钥保存到 `$DSH_HOME/.credentials.yaml`（文件权限应为 `0600`），然后重启或重新加载 Harness。不要把密钥写入 `.env`、项目文件、实验产物或日志。

两种切换彼此独立：

1. 在 Harness 的模型选择器中选择 `luna-gateway / gpt-5.6-luna`，只切换普通 Agent 对话的模型；
2. 若要切换 `cmath_import_paper`，使用仓库内的平行 overlay：

   ```bash
   dsh --profile math-map --patch ./integrations/deepseek-harness/luna.paper-import.patch.yml
   ```

   Overlay 会把四个阶段一致地切换为：

   ```yaml
   extract: { provider: luna-gateway, model: gpt-5.6-luna, reasoningEffort: high, maxTokens: 65536 }
   integrate: { provider: luna-gateway, model: gpt-5.6-luna, reasoningEffort: high, maxTokens: 65536 }
   assemble: { provider: luna-gateway, model: gpt-5.6-luna, reasoningEffort: high, maxTokens: 65536 }
   repair: { provider: luna-gateway, model: gpt-5.6-luna, reasoningEffort: high, maxTokens: 65536 }
   ```

   这只创建 Luna 实验配置；不带 overlay 启动时仍是 DeepSeek 配置。正式 Benchmark 必须显式使用 DeepSeek Flash，不能跟随 UI 当前选择自动漂移。Luna overlay 与当前 DeepSeek `high-generous` 条件保持相同提示词、分块、并发、校验、修复和 16k/32k/64k 预算，唯一实验变量是 provider/model。

用 `dsh --profile math-map --dump-config` 验收时，应能看到 `luna-gateway`、`gpt-5.6-luna`、`baseURL` 和 `apiKeyEnv: LUNA_API_KEY`，但绝不会看到密钥值。
