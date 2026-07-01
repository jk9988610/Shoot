import { VERSION } from './version.js';

const BOW_KEY = 'particle_archery_bow_override';
const PENDING_KEY = 'particle_archery_pending_bow';

/** 编辑器推送弓身应用层数据到本地通道 */
export function pushBowToGame(data) {
  const payload = {
    data,
    pushedAt: Date.now(),
    editorVersion: VERSION,
    particleCount: (data.particles?.length ?? 0) + (data.stringParticles?.length ?? 0),
  };
  localStorage.setItem(BOW_KEY, JSON.stringify(payload));
  localStorage.setItem(PENDING_KEY, '1');
  return payload;
}

/** 游戏读取弓身：内置版本新于本地推送时丢弃过时缓存 */
export function resolveBowData(builtin) {
  try {
    const raw = localStorage.getItem(BOW_KEY);
    if (!raw) return { data: builtin, source: 'builtin' };
    const parsed = JSON.parse(raw);
    const local = parsed?.data;
    if (!local?.particles?.length) return { data: builtin, source: 'builtin' };
    const builtinVer = builtin.version ?? 0;
    const localVer = local.version ?? 0;
    if (localVer < builtinVer) {
      clearBowOverride();
      return { data: builtin, source: 'builtin', stale: true };
    }
    return { data: local, source: 'local', meta: parsed };
  } catch { /* ignore */ }
  return { data: builtin, source: 'builtin' };
}

export function hasPendingBowUpdate() {
  return localStorage.getItem(PENDING_KEY) === '1';
}

export function clearPendingBowUpdate() {
  localStorage.removeItem(PENDING_KEY);
}

export function clearBowOverride() {
  localStorage.removeItem(BOW_KEY);
  localStorage.removeItem(PENDING_KEY);
}

/** 拉取线上 version.js 解析版本号 */
export async function fetchRemoteVersion() {
  try {
    const res = await fetch(`js/version.js?_=${Date.now()}`, { cache: 'no-store' });
    const text = await res.text();
    const m = text.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** 带缓存破坏的页面重载 */
export function hardReload() {
  const url = new URL(location.href);
  url.searchParams.set('_', String(Date.now()));
  location.replace(url.toString());
}
