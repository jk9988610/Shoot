import { VERSION } from './version.js';
import {
  clearPendingBowUpdate,
  fetchRemoteVersion,
  hardReload,
  hasPendingBowUpdate,
} from './update-channel.js';

const btn = document.getElementById('update-btn');
const statusEl = document.getElementById('update-status');

function setStatus(text, type = '') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `update-status${type ? ` ${type}` : ''}`;
}

function flashPending() {
  if (hasPendingBowUpdate() && btn) {
    btn.classList.add('has-pending');
    setStatus('编辑器弓身待应用', 'pending');
  }
}

export async function runGameUpdate() {
  if (!btn) return;
  btn.disabled = true;
  setStatus('检查更新…');

  try {
    const pending = hasPendingBowUpdate();
    const remoteVer = await fetchRemoteVersion();

    if (pending) {
      clearPendingBowUpdate();
      setStatus('应用编辑器弓身…', 'pending');
      hardReload(VERSION);
      return;
    }

    if (remoteVer && remoteVer !== VERSION) {
      setStatus(`正在更新到 v${remoteVer}…`, 'ok');
      hardReload(remoteVer);
      return;
    }

    setStatus('刷新缓存…', 'ok');
    hardReload(VERSION);
  } catch {
    setStatus('更新失败，请重试', 'error');
    btn.disabled = false;
  }
}

export function initUpdateButton() {
  if (!btn) return;
  btn.addEventListener('click', runGameUpdate);
  flashPending();
}

export function logBowSource() {
  return import('./bow.js').then(({ Bow }) => Bow.getDataSource());
}
