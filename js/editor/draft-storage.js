import { VERSION } from '../version.js';

const DRAFT_KEY = 'particle_archery_editor_draft';

/**
 * @typedef {object} EditorDraft
 * @property {number} savedAt
 * @property {string} editorVersion
 * @property {object} apply — toApplyData 格式
 * @property {{ offsetX: number, offsetY: number, zoom: number }} [viewport]
 */

/** @returns {EditorDraft | null} */
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.apply || typeof parsed.apply !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** @param {EditorDraft} draft */
export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...draft,
      savedAt: Date.now(),
      editorVersion: VERSION,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function formatDraftTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
