import { fetchLiveVersion } from './version-parse.js';

/**
 * 解析启动版本 — 始终以线上 version.js 为准，URL ?v= 仅作同步目标（不锁定旧版）
 * @returns {Promise<string>}
 */
export async function resolveBootVersion() {
  return fetchLiveVersion();
}

/** 将地址栏 ?v= 同步为当前线上版本，避免旧链接永久显示老版本 */
export function syncUrlVersion(version) {
  const url = new URL(location.href);
  if (url.searchParams.get('v') === version) return;
  url.searchParams.set('v', version);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

/**
 * @param {object} opts
 * @param {string} [opts.css] 样式表路径
 * @param {string} [opts.cssId] link 元素 id
 * @param {string} opts.module 入口模块路径（相对当前页）
 * @param {(v: string) => string} [opts.title]
 * @param {string} [opts.badge] 版本角标元素 id
 * @param {Array<{ id: string, href: (v: string, bust: number) => string }>} [opts.links]
 */
export async function bootPage(opts) {
  const v = await resolveBootVersion();
  syncUrlVersion(v);
  window.__APP_VERSION__ = v;

  const bust = Date.now();

  if (opts.title) document.title = opts.title(v);
  if (opts.cssId && opts.css) {
    document.getElementById(opts.cssId).href = `${opts.css}?v=${v}&_=${bust}`;
  }
  if (opts.badge) {
    const el = document.getElementById(opts.badge);
    if (el) el.textContent = `v${v}`;
  }
  for (const { id, href } of opts.links ?? []) {
    const el = document.getElementById(id);
    if (el) el.href = href(v, bust);
  }

  await import(`${opts.module}?v=${v}&_=${bust}`);
}

/** 显示启动失败提示 */
export function showBootError(err) {
  console.error('[boot]', err);
  const msg = document.createElement('p');
  msg.style.cssText = 'color:#e94560;padding:12px 16px;font-family:monospace';
  msg.textContent = '版本/资源加载失败，请硬刷新 (Ctrl+Shift+R)';
  document.body.appendChild(msg);
}
