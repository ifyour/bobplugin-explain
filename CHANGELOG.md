## [0.1.2](https://github.com/ifyour/bobplugin-explain/compare/v0.1.1...v0.1.2) (2026-09-23)


### Features

* 过滤 Markdown 标记并紧凑排版 ([8d9f8ff](https://github.com/ifyour/bobplugin-explain/commit/8d9f8ff611aca9cb6139f5d62688e92b7ccd6b49))



# 更新日志

## 0.1.2 - 2026-09-23

### 新功能
- 过滤大模型返回的 Markdown 标记，排版紧凑只保留换行

## 0.1.1 - 2026-09-23

### 维护
- push 到 main 自动构建（CI）
- 精简 tsconfig 配置
- 精简依赖：移除 babel 链、fs-extra、rimraf、cross-env、querystring、polyfill，改用 npm lockfile

## 0.1.0

- 首个版本
- 自定义 Prompt（`$text` / `$to` 占位符）
- 支持 OpenAI 兼容接口与 Anthropic 兼容接口
- 支持流式（SSE）响应解析，兼容仅支持流式输出的本地服务
- 选中文本输入 `test` / `测试` 可触发连接测试
