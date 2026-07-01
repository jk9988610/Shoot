#!/usr/bin/env node
/**
 * 对比仓库 main 与线上 GitHub Pages 的版本与部署状态
 * 用法: node scripts/deploy-status.mjs
 */
import { readFileSync } from 'fs';
import { parseVersionFromSource } from '../js/version-parse.js';

const REPO = 'jk9988610/Shoot';
const LIVE_BASE = 'https://jk9988610.github.io/Shoot';

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  return { ok: res.ok, status: res.status, text: await res.text(), headers: res.headers };
}

function localVersion() {
  const text = readFileSync('js/version.js', 'utf8');
  return parseVersionFromSource(text);
}

async function liveVersion() {
  const bust = Date.now();
  const { ok, status, text, headers } = await fetchText(`${LIVE_BASE}/js/version.js?_=${bust}`);
  return {
    ok,
    status,
    version: parseVersionFromSource(text),
    lastModified: headers.get('last-modified'),
    cacheControl: headers.get('cache-control'),
  };
}

async function latestDeploy() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return null;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/deploy-pages.yml/runs?per_page=5`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.workflow_runs?.map((r) => ({
    id: r.id,
    event: r.event,
    status: r.status,
    conclusion: r.conclusion,
    created: r.created_at,
    updated: r.updated_at,
    url: r.html_url,
  }));
}

const local = localVersion();
const live = await liveVersion();
const deploys = await latestDeploy();

console.log('=== 版本对比 ===');
console.log(`本地 main (js/version.js):  v${local ?? '?'}`);
console.log(`线上 Pages:               v${live.version ?? '?'} (HTTP ${live.status})`);
if (live.lastModified) console.log(`线上 version.js 更新时间:  ${live.lastModified}`);
if (live.cacheControl) console.log(`CDN 缓存策略:             ${live.cacheControl}`);

if (local && live.version) {
  if (local === live.version) {
    console.log('\n✓ 版本一致');
  } else {
    console.log(`\n✗ 版本不一致 — 可能原因:`);
    console.log('  1. PR 已合并但 Pages 部署未完成（约 1–2 分钟）');
    console.log('  2. 部署工作流失败或被 cancel-in-progress 取消');
    console.log('  3. 浏览器/CDN 缓存了旧资源（硬刷新或加 ?_= 时间戳）');
  }
}

console.log('\n=== 部署流水线瓶颈 ===');
console.log('• 合并 → 触发部署: auto-merge 成功后 gh workflow run（约 12s）');
console.log('• 构建 + 发布: Deploy to GitHub Pages 作业（约 40s–90s）');
console.log('• CDN 边缘缓存: max-age=600（最长 10 分钟）');
console.log('• 重复触发: push main 与 workflow_dispatch 同时触发时，后者 cancel 前者（见 Actions 中 cancelled）');

if (deploys?.length) {
  console.log('\n=== 最近 5 次部署运行 ===');
  for (const r of deploys) {
    const icon = r.conclusion === 'success' ? '✓' : r.conclusion === 'cancelled' ? '⊘' : '✗';
    console.log(`${icon} ${r.conclusion?.padEnd(9)} ${r.event.padEnd(18)} ${r.created}  ${r.url}`);
  }
} else {
  console.log('\n(设置 GH_TOKEN 可显示 Actions 部署记录)');
  console.log(`Actions: https://github.com/${REPO}/actions/workflows/deploy-pages.yml`);
}

console.log('\n=== 自查命令 ===');
console.log(`curl -s "${LIVE_BASE}/js/version.js?_=$(Date.now())" | head -3`);
console.log('游戏内点「更新」或访问: ' + `${LIVE_BASE}/?v=${local}`);
