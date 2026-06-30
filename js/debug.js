import { VERSION, BUILD_LABEL } from './version.js';

const TAG = 'ParticleArchery';
const DEBUG = new URLSearchParams(location.search).get('debug') !== '0';
const MAX_LINES = 500;

let logEl = null;
let logs = [];
let panelVisible = false;

function formatArg(arg) {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function formatArgs(args) {
  return args.map(formatArg).join(' ');
}

function timestamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function renderLine(category, text) {
  if (!logEl) return;
  const line = document.createElement('div');
  line.className = `debug-line debug-${category}`;
  line.textContent = text;
  logEl.appendChild(line);

  while (logEl.childElementCount > MAX_LINES) {
    logEl.removeChild(logEl.firstChild);
    logs.shift();
  }

  logEl.scrollTop = logEl.scrollHeight;
}

function appendLog(category, ...args) {
  const line = `[${timestamp()}] [${category}] ${formatArgs(args)}`;
  logs.push(line);
  renderLine(category, line);

  if (DEBUG) {
    console.log(`[${TAG}:${category}]`, ...args);
  }
}

export function isDebugEnabled() {
  return DEBUG;
}

export function debug(category, ...args) {
  appendLog(category, ...args);
}

export function debugGroup(label, fn) {
  appendLog('group', `── ${label} ──`);
  if (DEBUG) console.groupCollapsed(`[${TAG}] ${label}`);
  try {
    fn?.();
  } finally {
    if (DEBUG) console.groupEnd();
  }
}

export function clearLogs() {
  logs = [];
  if (logEl) logEl.innerHTML = '';
  appendLog('system', '日志已清空');
}

export async function copyLogs() {
  const text = logs.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    appendLog('system', `已复制 ${logs.length} 行到剪贴板`);
  } catch {
    appendLog('system', '复制失败，请检查浏览器权限');
  }
}

export function toggleDebugPanel() {
  panelVisible = !panelVisible;
  const panel = document.getElementById('debug-panel');
  const btn = document.getElementById('debug-toggle-btn');
  if (panel) panel.classList.toggle('hidden', !panelVisible);
  if (btn) {
    btn.classList.toggle('active', panelVisible);
    btn.textContent = panelVisible ? '隐藏调试' : '调试';
  }
}

export function initDebugPanel() {
  logEl = document.getElementById('debug-log');
  const toggleBtn = document.getElementById('debug-toggle-btn');
  const clearBtn = document.getElementById('debug-clear-btn');
  const copyBtn = document.getElementById('debug-copy-btn');

  toggleBtn?.addEventListener('click', toggleDebugPanel);
  clearBtn?.addEventListener('click', clearLogs);
  copyBtn?.addEventListener('click', copyLogs);

  appendLog('version', `粒子弓箭世界 v${VERSION} (${BUILD_LABEL})`);
}

export function logBoot() {
  if (DEBUG) {
    console.log(
      `%c⬛ 粒子弓箭世界 v${VERSION} (${BUILD_LABEL})`,
      'color:#e94560;font-weight:bold;font-family:monospace'
    );
  }
  debug('boot', '调试面板已就绪，点击顶栏「调试」按钮显示/隐藏');
}
