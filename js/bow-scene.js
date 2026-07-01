/**
 * 弓身场景数据 — 绘制工具与游戏场景的唯一共享格式
 *
 * 基于应用层粒子坐标（与 CUSTOM_BOW_DATA 同构），外加 kind 标记版本。
 * 编辑器 GridModel ↔ bowScene ↔ 游戏 Bow 物理，均经此文件转换。
 */
import { fromApplyData, toApplyData, CELL_SIZE, generateExportCode } from './editor/apply.js';

export const BOW_SCENE_KIND = 'particle-archery/bow-scene/v1';

/** @typedef {import('./editor/apply.js').BowApplyData} BowApplyData */

/**
 * @typedef {BowApplyData & { kind?: string }} BowSceneData
 */

/**
 * 绘制网格 → 弓身场景
 * @param {import('./editor/grid-model.js').GridModel} model
 * @returns {BowSceneData}
 */
export function gridToBowScene(model) {
  return { kind: BOW_SCENE_KIND, ...toApplyData(model) };
}

/**
 * 弓身场景 → 绘制网格
 * @param {BowSceneData} scene
 */
export function bowSceneToGrid(scene) {
  const { kind: _k, ...apply } = scene ?? {};
  return fromApplyData(apply);
}

/** 剥离 kind，供游戏物理使用 */
export function bowSceneToApply(scene) {
  if (!scene) return null;
  const { kind: _k, ...apply } = scene;
  return apply;
}

/** @param {BowSceneData} scene */
export function validateBowScene(scene) {
  const apply = bowSceneToApply(scene);
  if (!apply) return { ok: false, reason: '数据为空' };
  if (!apply.nockTop || !apply.nockBottom) return { ok: false, reason: '缺少上梢或下梢' };
  if (!apply.particles?.length) return { ok: false, reason: '弓身粒子为空' };
  return { ok: true };
}

/** @param {BowSceneData} scene */
export function isBowSceneEmpty(scene) {
  const apply = bowSceneToApply(scene);
  return !apply?.particles?.length;
}

/** @param {import('./editor/grid-model.js').GridModel} model */
export function exportBowSceneCode(model) {
  return generateExportCode(model);
}

export { CELL_SIZE };
