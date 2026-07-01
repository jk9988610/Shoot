/**
 * 离线优先 — 仅用户开启且在线时使用云端
 * 与 Card-World 共用 opt-in 键，便于跨项目一致体验
 */

const LS_CLOUD_OPT_IN = 'cardworld_cloud_opt_in';

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isCloudOptIn() {
  try {
    return localStorage.getItem(LS_CLOUD_OPT_IN) === '1';
  } catch {
    return false;
  }
}

export function setCloudOptIn(enabled) {
  try {
    localStorage.setItem(LS_CLOUD_OPT_IN, enabled ? '1' : '0');
  } catch { /* ignore */ }
}

export function shouldUseCloud() {
  return isCloudOptIn() && isBrowserOnline();
}

export function ensureCloudForUpload() {
  if (!isBrowserOnline()) return false;
  setCloudOptIn(true);
  return true;
}
