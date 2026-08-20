# 按功能分文件夹并将 Inference 策略按版本号分文件，先拆 Inference

`paper-import-client.js` 曾将 `v3.43/v3.44/v3.45` 装配策略以内联 `if` 字符串挤在 1720 行单文件中，且 Entry 与 Inference 优化混在根目录平铺，导致新版本不可见。决定按功能分入 `src/paper-import/entry|inference|core|workflow`，并将 Inference 装配策略按版本号分档至 `src/paper-import/inference/strategies/`，由 `strategies/index.js` 按版本取段，根部保留回退。先拆 Inference 以最快让工作流版本可见，再逐步迁移 Entry 与核心校验。
