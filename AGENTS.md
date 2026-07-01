# AI Agent 工作流

本项目由 AI 全权维护，无需人工合并 PR。

## 认证配置

Cloud Agent 需在 [Cursor Secrets](https://cursor.com/dashboard/cloud-agents) 中配置：

| Secret 名称 | 用途 |
|-------------|------|
| `GITHUB_ADMIN_PAT` | AI 沙箱内 `gh`/`git` 高权限令牌（创建 PR、合并、推送） |

环境启动时会通过 `.cursor/environment.json` 自动执行 `gh auth login`。

## 分支与 PR

1. 从 `main` 创建功能分支，命名格式：`cursor/<描述>-e126`
2. 提交代码并推送到远程
3. 创建 PR 到 `main`（可为 Draft，工作流会自动标记为 Ready）
4. **无需手动合并** — `Auto Merge AI PRs` 工作流会在校验通过后自动 squash 合并
5. 合并后自动触发 GitHub Pages 部署
6. 合并后分支会自动删除

## 自动合并条件

- 分支名以 `cursor/` 开头
- PR 目标分支为 `main`
- 基础文件校验通过（`index.html`、`bow-editor.html`、`js/main.js`、`js/version.js` 存在）

## GitHub Actions Secret

在仓库 Settings → Secrets → Actions 中配置：

| Secret 名称 | 用途 |
|-------------|------|
| `GH_PAT` | 工作流合并 PR 时使用（PAT 合并可触发后续 workflow；与 `GITHUB_ADMIN_PAT` 可用同一 token） |
