/**
 * 从 version.js 源码文本解析 VERSION 常量（浏览器 / Node 通用）
 * @param {string} text
 * @returns {string | null}
 */
export function parseVersionFromSource(text) {
  const m = text.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
}
