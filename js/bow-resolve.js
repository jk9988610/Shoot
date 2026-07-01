/**
 * 弓身数据解析 — 游戏与编辑器统一入口
 *
 * 优先级：内存缓存 → 云端 active → localStorage 推送 → 内置 CUSTOM_BOW_DATA
 */
import { CUSTOM_BOW_DATA } from './custom-bow-data.js';
import { resolveBowData } from './update-channel.js';
import { shouldUseCloud } from './net-policy.js';
import { loadActiveBowFromCloud, loadBowDraftFromCloud } from './bow-cloud.js';
import { bowSceneToApply, gridToBowScene, BOW_SCENE_KIND } from './bow-scene.js';

/** @type {object | null} */
let runtimeBowApply = null;
/** @type {{ source: string, meta?: object } | null} */
let runtimeMeta = null;

export function primeBowCache(applyData, meta = {}) {
  runtimeBowApply = applyData;
  runtimeMeta = meta;
}

export function getRuntimeBowData() {
  if (runtimeBowApply) return runtimeBowApply;
  return resolveBowData(CUSTOM_BOW_DATA).data;
}

export function getRuntimeBowSource() {
  if (runtimeMeta) return runtimeMeta;
  return resolveBowData(CUSTOM_BOW_DATA);
}

/**
 * 游戏启动前异步解析弓身
 * @returns {Promise<{ data: object, source: string, meta?: object }>}
 */
export async function resolveBowForRuntime() {
  const builtin = resolveBowData(CUSTOM_BOW_DATA);

  if (shouldUseCloud()) {
    try {
      const cloud = await loadActiveBowFromCloud();
      if (cloud?.apply?.particles?.length) {
        const builtinVer = CUSTOM_BOW_DATA.version ?? 0;
        const cloudVer = cloud.apply.version ?? 0;
        if (cloudVer >= builtinVer || cloud.kind === 'active') {
          const result = { data: cloud.apply, source: 'cloud', meta: cloud };
          primeBowCache(cloud.apply, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('[bow-resolve] cloud load failed', e);
    }
  }

  if (builtin.source === 'local' && builtin.data?.particles?.length) {
    primeBowCache(builtin.data, builtin);
    return builtin;
  }

  primeBowCache(builtin.data, builtin);
  return builtin;
}

/** 编辑器：本地草稿 vs 云端草稿，取较新者 */
export async function resolveEditorBowScene({ localDraft }) {
  const localScene = localDraft?.apply
    ? { kind: BOW_SCENE_KIND, ...localDraft.apply }
    : null;
  const localTime = localDraft?.savedAt ?? 0;

  if (!shouldUseCloud()) {
    return { scene: localScene, viewport: localDraft?.viewport, source: localScene ? 'local' : 'empty' };
  }

  try {
    const cloud = await loadBowDraftFromCloud();
    if (cloud?.bow) {
      const cloudTime = cloud.savedAt ? new Date(cloud.savedAt).getTime() : 0;
      if (cloudTime >= localTime) {
        return { scene: cloud.bow, viewport: cloud.viewport, source: 'cloud', meta: cloud };
      }
    }
  } catch (e) {
    console.warn('[bow-resolve] cloud draft', e);
  }

  return {
    scene: localScene,
    viewport: localDraft?.viewport,
    source: localScene ? 'local' : 'empty',
  };
}

export { gridToBowScene, bowSceneToApply, CUSTOM_BOW_DATA };
