# AI Agent 工作流

本项目由 AI 全权维护，无需人工合并 PR。

## 分支与 PR

1. 从 `main` 创建功能分支，命名格式：`cursor/<描述>-e126`
2. 提交代码并推送到远程
3. 创建 PR 到 `main`（可为 Draft，工作流会自动标记为 Ready）
4. **无需手动合并** — `Auto Merge AI PRs` 工作流会在校验通过后自动 squash 合并
5. 合并后分支会自动删除（仓库已开启 `delete_branch_on_merge`）

## 自动合并条件

- 分支名以 `cursor/` 开头
- PR 目标分支为 `main`
- 基础文件校验通过（`index.html`、`bow-editor.html`、`js/main.js`、`js/version.js` 存在）

## 仓库设置建议

在 GitHub Settings → General → Pull Requests 中：

- ✅ **Automatically delete head branches**（已开启）
- 可选：**Allow auto-merge**（工作流直接合并，不依赖此选项）
- 可选：**Always suggest updating pull request branches**
