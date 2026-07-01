/**
 * 从 version.js 源码文本解析 VERSION 常量（浏览器 / Node 通用）
 * @param {string} text
 * @returns {string | null}
 */
export function parseVersionFromSource(text) {
  const m = text.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
}

/** @param {string} a @param {string} b @returns {number} */
export function compareSemver(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 拉取线上 version.js（唯一权威版本，不受 URL ?v= 影响）
 * @returns {Promise<string>}
 */
export async function fetchLiveVersion() {
  const res = await fetch(`js/version.js?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`version.js HTTP ${res.status}`);
  const version = parseVersionFromSource(await res.text());
  if (!version) throw new Error('VERSION 未在 version.js 中找到');
  return version;
}
