import { parseVersionFromSource } from './version-parse.js';

/**
 * 解析启动版本：URL ?v= 优先，否则拉取 js/version.js（唯一权威来源）
 * @returns {Promise<string>}
 */
export async function resolveBootVersion() {
  const fromUrl = new URLSearchParams(location.search).get('v');
  if (fromUrl) return fromUrl;

  const res = await fetch(`js/version.js?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`version.js HTTP ${res.status}`);
  const version = parseVersionFromSource(await res.text());
  if (!version) throw new Error('VERSION 未在 version.js 中找到');
  return version;
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
  const params = new URLSearchParams(location.search);
  const v = await resolveBootVersion();
  const bust = params.get('_') || Date.now();

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
