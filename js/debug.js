import { VERSION, BUILD_LABEL } from './version.js';

const TAG = 'ParticleArchery';
const DEBUG = new URLSearchParams(location.search).get('debug') !== '0';

export function isDebugEnabled() {
  return DEBUG;
}

export function debug(category, ...args) {
  if (!DEBUG) return;
  console.log(`[${TAG}:${category}]`, ...args);
}

export function debugGroup(label, fn) {
  if (!DEBUG) return fn?.();
  console.groupCollapsed(`[${TAG}] ${label}`);
  try {
    fn?.();
  } finally {
    console.groupEnd();
  }
}

export function logBoot() {
  console.log(
    `%c⬛ 粒子弓箭世界 v${VERSION} (${BUILD_LABEL})`,
    'color:#e94560;font-weight:bold;font-family:monospace'
  );
  debug('boot', '调试模式已开启，关闭请访问 ?debug=0');
}
