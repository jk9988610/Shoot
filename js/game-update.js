import { VERSION } from './version.js';
import {
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

  const pending = hasPendingBowUpdate();
  const remoteVer = await fetchRemoteVersion();

  if (pending) {
    setStatus('应用编辑器弓身…', 'pending');
    setTimeout(hardReload, 300);
    return;
  }

  if (remoteVer && remoteVer !== VERSION) {
    setStatus(`发现 v${remoteVer}，刷新中…`, 'ok');
    setTimeout(hardReload, 400);
    return;
  }

  setStatus('刷新缓存…');
  setTimeout(hardReload, 200);
}

export function initUpdateButton() {
  if (!btn) return;
  btn.addEventListener('click', runGameUpdate);
  flashPending();
}

export function logBowSource() {
  return import('./bow.js').then(({ Bow }) => Bow.getDataSource());
}
