# AGENTS.md

Bob 插件「解释一下」：自定义 Prompt + OpenAI/Anthropic 兼容接口。

## 项目结构

- `src/main.ts` — 唯一插件源码（TypeScript），Bob 的 translate/supportLanguages 入口
- `scripts/` — node 构建辅助脚本（打包 zip、生成 info.json / appcast.json）
- `src/info.json` / `src/appcast.json` — 插件元信息与更新源，版本号来自 package.json，由 `npm run initInfo` 和 build 过程同步，**不要手改 version 字段**
- `CHANGELOG.md` — 手写，格式见下文
- 构建走 rollup + esbuild，产物为 `release/*.bobplugin`

## 代码约定

- 最小依赖原则：能删的依赖删，新需求先用 node 内置 / 已有依赖解决
- 简化的取舍用 `// ponytail:` 注释标注天花板和升级路径
- 提交信息用 conventional commits：`feat:` / `fix:` / `chore:` / `docs:` / `ci:`
- commit message 面向用户写：写「过滤 Markdown 标记」，不写「更新 main.ts」

## 验证

任何代码改动后、提交前：

```bash
npx tsc --noEmit   # 类型检查必须通过
npm run build      # 构建必须成功
```

## 发版流程（打 tag 即发版，CI 自动构建并创建 GitHub Release）

1. `CHANGELOG.md` 头部新增版本段落，格式：

   ```markdown
   ## {版本} - {YYYY-MM-DD}

   ### 新功能 / 修复 / 维护
   - 条目（用户视角）
   ```

2. **Changelog 只写用户关心的内容**：新增了什么功能、修复了什么问题、使用上有什么变化。
   - `git log <上个tag>..HEAD --oneline` 里只挑 `feat:` 和 `fix:`，改写成用户视角
   - chore / ci / docs / refactor 一律不进 changelog
   - 不用自动生成工具，手写
   - 段落结构与优先级（有才写，没有的段落省略）：

     ```markdown
     ### 破坏性变更   ← 有才写，放最前：行为变化、配置项增删、不再支持的东西
     ### 新功能
     ### 修复
     ### 升级须知     ← 需要用户动手时才写：重新填 Key、最低 Bob 版本变化等
     ```

   - 另外值得写的：安全修复、已知问题/常见坑。不写的：重构、性能优化（除非用户可感知）、CI 变化
   - 检验标准：用户读完能回答「该不该升级、升级要注意什么」

3. 版本号：有新功能 → minor（0.1.x → 0.2.0），纯修复 → patch。执行：

   ```bash
   npm version <patch|minor> --no-git-tag-version
   npm run initInfo                  # 同步 version 到 info.json
   node scripts/init-appcast.js      # 需要先 npm run build 生成包后执行才有正确 sha256
   ```

   （发版前跑一次 `npm run build` 再跑 init-appcast，保证 appcast 的 sha256 与包一致）

4. 提交 `CHANGELOG.md`、`package.json`、`package-lock.json`、`src/info.json`、`src/appcast.json`：

   ```bash
   git commit -m "chore: release v{版本}"
   git tag -a v{版本} -m "{changelog 该版本段落内容}"
   git push && git push origin v{版本}
   ```

5. 确认 Release workflow 跑绿、GitHub Release 挂上了 `.bobplugin` 包
   （https://github.com/ifyour/bobplugin-explain/actions）

## CI

- push 到 `main` → Build workflow：构建 + 上传 artifact
- push tag → Release workflow：构建 + 创建 GitHub Release
- workflow 需 `permissions: contents: write`，不要在 CI 里往 main 回推版本文件（本地发版时已提交）
