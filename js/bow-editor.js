import { GridModel } from './editor/grid-model.js';
import { fromApplyData, generateExportCode, toApplyData, CELL_SIZE } from './editor/apply.js';
import { gridToBowScene, bowSceneToGrid, exportBowSceneCode, validateBowScene } from './bow-scene.js';
import { lineCells } from './editor/grid-line.js';
import { Viewport } from './editor/viewport.js';
import { GridRenderer } from './editor/grid-renderer.js';
import {
  formatDraftTime,
  loadDraft,
  saveDraft,
} from './editor/draft-storage.js';
import { pushBowToGame } from './update-channel.js';
import { resolveEditorBowScene } from './bow-resolve.js';
import {
  publishBowToCloud,
  saveBowDraftToCloud,
  loadBowDraftFromCloud,
  loadCloudSession,
  saveCloudSession,
  listPublishedBows,
  downloadBowWork,
} from './bow-cloud.js';
import { isCloudOptIn, setCloudOptIn, shouldUseCloud } from './net-policy.js';
import { isCloudEnabled } from './cloud-config.js';
import { VERSION } from './version.js';

const WOOD_COLORS = ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'];

const viewport = new Viewport();
const canvas = document.getElementById('editor-canvas');
const renderer = new GridRenderer(canvas);
const exportCode = document.getElementById('export-code');
const draftStatusEl = document.getElementById('draft-status');

let model = new GridModel();
let draftSaveTimer = null;
let cloudSaveTimer = null;

const cloudStatusEl = document.getElementById('cloud-status');

const state = {
  interactionMode: 'draw',
  tool: 'brush',
  color: WOOD_COLORS[1],
  history: [],
  lineStart: null,
  linePreview: null,
};

let isPointerDown = false;
let panStart = null;
let pinchStart = null;
let brushPushed = false;

function ensureStrokeHistory() {
  if (!brushPushed) {
    pushHistory();
    brushPushed = true;
  }
}

function pushHistory() {
  state.history.push(model.snapshot());
  if (state.history.length > 50) state.history.shift();
}

function undo() {
  const snap = state.history.pop();
  if (!snap) return;
  model.restore(snap);
  refresh({ saveDraft: true });
}

function setDraftStatus(text, type = '') {
  if (!draftStatusEl) return;
  draftStatusEl.textContent = text;
  draftStatusEl.className = `draft-status${type ? ` ${type}` : ''}`;
}

function setCloudStatus(text, type = '') {
  if (!cloudStatusEl) return;
  cloudStatusEl.textContent = text;
  cloudStatusEl.className = `cloud-status${type ? ` ${type}` : ''}`;
}

function updateCloudToggleUi() {
  const btn = document.getElementById('btn-cloud-toggle');
  if (!btn) return;
  const on = isCloudOptIn();
  btn.textContent = on ? '☁ 云端开' : '☁ 云端关';
  btn.classList.toggle('active', on);
  setCloudStatus(on ? (isCloudEnabled() ? '云同步已开启' : '云端配置就绪') : '云同步关闭（仅本地草稿）', on ? 'on' : '');
}

function persistDraftNow() {
  const scene = gridToBowScene(model);
  const viewportData = {
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    zoom: viewport.zoom,
  };
  const ok = saveDraft({ apply: scene, viewport: viewportData });
  if (ok) {
    setDraftStatus(`草稿已保存 ${formatDraftTime(Date.now())}`, 'saved');
  } else {
    setDraftStatus('草稿保存失败（存储空间不足？）', 'error');
  }
  scheduleCloudDraftSave();
}

function scheduleCloudDraftSave() {
  if (!shouldUseCloud()) return;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    cloudSaveTimer = null;
    try {
      const scene = gridToBowScene(model);
      await saveBowDraftToCloud(scene, {
        viewport: {
          offsetX: viewport.offsetX,
          offsetY: viewport.offsetY,
          zoom: viewport.zoom,
        },
      });
      setCloudStatus(`云端草稿已同步 ${formatDraftTime(Date.now())}`, 'on');
    } catch (e) {
      setCloudStatus(`云端同步失败: ${e.message}`, 'error');
    }
  }, 1200);
}

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null;
    persistDraftNow();
  }, 600);
}

function refresh(options = {}) {
  const { saveDraft = false } = options;
  renderer.render(model, viewport, {
    interactionMode: state.interactionMode,
    tool: state.tool,
    highlightAnchor: state.tool === 'anchor',
    linePreview: state.linePreview,
  });
  updateMeta();
  exportCode.value = exportBowSceneCode(model);
  if (saveDraft) scheduleDraftSave();
}

function updateMeta() {
  const apply = toApplyData(model);
  document.getElementById('info-mode').textContent =
    state.interactionMode === 'pan' ? '拖动' : '绘制';
  document.getElementById('info-tool').textContent = state.tool;
  document.getElementById('info-zoom').textContent = `${Math.round(viewport.zoom * 100)}%`;
  document.getElementById('info-nock-top').textContent = model.nockTop
    ? `格(${model.nockTop.gx},${model.nockTop.gy})` : '未设置';
  document.getElementById('info-nock-bottom').textContent = model.nockBottom
    ? `格(${model.nockBottom.gx},${model.nockBottom.gy})` : '未设置';
  document.getElementById('info-string').textContent = model.stringGx ?? '未设置';
  document.getElementById('info-count').textContent =
    `${[...model.cells.values()].filter((c) => c.kind !== 'string').length}格 · 弦${[...model.cells.values()].filter((c) => c.kind === 'string').length}格`;
  document.getElementById('info-anchor').textContent =
    `格(${model.anchor.gx},${model.anchor.gy}) → 应用层(0,0)`;
  document.getElementById('info-apply-count').textContent = apply.particles.length;
  const cellEl = document.getElementById('info-cell-size');
  if (cellEl) cellEl.textContent = apply.cellSize ?? CELL_SIZE;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
  return {
    sx: (t.clientX - rect.left) * (canvas.width / rect.width),
    sy: (t.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getGrid(e) {
  const { sx, sy } = getPos(e);
  return { ...viewport.screenToGrid(sx, sy, canvas.width, canvas.height), sx, sy };
}

function placeLine(gx0, gy0, gx1, gy1) {
  const kind = state.tool === 'string' ? 'string' : 'body';
  const color = kind === 'string' ? '#E8E8E8' : state.color;
  for (const { gx, gy } of lineCells(gx0, gy0, gx1, gy1)) {
    model.setCell(gx, gy, { color, pinned: false, kind });
    if (kind === 'string') model.stringGx = gx;
  }
}

function applyDrawTool(gx, gy) {
  if (state.tool === 'brush') {
    if (!model.getCell(gx, gy)) {
      model.setCell(gx, gy, { color: state.color, pinned: false });
      return true;
    }
    return false;
  }
  if (state.tool === 'eraser') {
    if (model.getCell(gx, gy)) {
      model.removeCell(gx, gy);
      return true;
    }
    return false;
  }
  if (state.tool === 'anchor') {
    return model.shiftAnchor(gx, gy);
  }
  if (state.tool === 'pin') {
    model.togglePin(gx, gy, state.color);
    return true;
  }
  if (state.tool === 'nockTop') {
    model.nockTop = { gx, gy };
    return true;
  }
  if (state.tool === 'nockBottom') {
    model.nockBottom = { gx, gy };
    return true;
  }
  if (state.tool === 'string') {
    model.setCell(gx, gy, { color: '#E8E8E8', pinned: false, kind: 'string' });
    model.stringGx = gx;
    return true;
  }
  return false;
}

function onPointerDown(e) {
  if (state.interactionMode === 'pan') {
    if (e.touches?.length === 2) {
      const [a, b] = e.touches;
      pinchStart = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: viewport.zoom,
      };
    } else {
      const { sx, sy } = getPos(e);
      panStart = { sx, sy, ox: viewport.offsetX, oy: viewport.offsetY };
    }
    isPointerDown = true;
    e.preventDefault();
    return;
  }

  const { gx, gy } = getGrid(e);

  if (state.tool === 'line') {
    state.lineStart = { gx, gy };
    state.linePreview = [{ gx, gy }];
    isPointerDown = true;
    e.preventDefault();
    return;
  }

  if (['anchor', 'pin', 'nockTop', 'nockBottom', 'string'].includes(state.tool)) {
    pushHistory();
    applyDrawTool(gx, gy);
    refresh({ saveDraft: true });
    e.preventDefault();
    return;
  }

  if (state.tool === 'brush' || state.tool === 'eraser') {
    isPointerDown = true;
    brushPushed = false;
    ensureStrokeHistory();
    applyDrawTool(gx, gy);
    refresh({ saveDraft: true });
    e.preventDefault();
  }
}

function onPointerMove(e) {
  if (state.interactionMode === 'pan') {
    if (e.touches?.length === 2 && pinchStart) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const rect = canvas.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const factor = dist / pinchStart.dist;
      viewport.zoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, pinchStart.zoom * factor));
      refresh();
      e.preventDefault();
      return;
    }
    if (panStart && (e.touches?.length === 1 || !e.touches)) {
      const { sx, sy } = getPos(e);
      viewport.offsetX = panStart.ox + (sx - panStart.sx);
      viewport.offsetY = panStart.oy + (sy - panStart.sy);
      refresh();
      e.preventDefault();
    }
    return;
  }

  if (!isPointerDown) return;

  if (state.tool === 'line' && state.lineStart) {
    const { gx, gy } = getGrid(e);
    state.linePreview = lineCells(state.lineStart.gx, state.lineStart.gy, gx, gy);
    refresh();
    e.preventDefault();
    return;
  }

  if (state.tool === 'brush' || state.tool === 'eraser') {
    const { gx, gy } = getGrid(e);
    ensureStrokeHistory();
    applyDrawTool(gx, gy);
    refresh({ saveDraft: true });
    e.preventDefault();
  }
}

function onPointerUp(e) {
  if (state.interactionMode === 'pan') {
    panStart = null;
    pinchStart = null;
    isPointerDown = false;
    scheduleDraftSave();
    return;
  }

  if (state.tool === 'line' && state.lineStart) {
    const { gx, gy } = getGrid(e);
    pushHistory();
    placeLine(state.lineStart.gx, state.lineStart.gy, gx, gy);
    state.lineStart = null;
    state.linePreview = null;
    refresh({ saveDraft: true });
  }

  if (state.tool === 'brush' || state.tool === 'eraser') {
    persistDraftNow();
  }

  isPointerDown = false;
  brushPushed = false;
}

function onWheel(e) {
  if (state.interactionMode !== 'pan') return;
  e.preventDefault();
  const { sx, sy } = getPos(e);
  viewport.zoomAt(e.deltaY < 0 ? 1.1 : 0.9, sx, sy, canvas.width, canvas.height);
  refresh();
  scheduleDraftSave();
}

function setInteractionMode(mode) {
  state.interactionMode = mode;
  state.lineStart = null;
  state.linePreview = null;
  document.getElementById('btn-mode-draw').classList.toggle('active', mode === 'draw');
  document.getElementById('btn-mode-pan').classList.toggle('active', mode === 'pan');
  canvas.classList.toggle('mode-pan', mode === 'pan');
  canvas.classList.toggle('mode-draw', mode === 'draw');
  refresh();
}

function initPalette() {
  const palette = document.getElementById('color-palette');
  WOOD_COLORS.forEach((color, i) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = `color-swatch${i === 1 ? ' active' : ''}`;
    sw.style.background = color;
    sw.addEventListener('click', () => {
      state.color = color;
      palette.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      setInteractionMode('draw');
      state.tool = 'brush';
      document.querySelectorAll('[data-tool]').forEach((b) => {
        b.classList.toggle('active', b.dataset.tool === 'brush');
      });
    });
    palette.appendChild(sw);
  });
}

function bindUI() {
  document.getElementById('btn-mode-draw').addEventListener('click', () => setInteractionMode('draw'));
  document.getElementById('btn-mode-pan').addEventListener('click', () => setInteractionMode('pan'));

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setInteractionMode('draw');
      state.tool = btn.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      refresh();
    });
  });

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    viewport.reset();
    refresh();
    scheduleDraftSave();
  });
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('清空全部网格？草稿也会被清空。')) return;
    pushHistory();
    model.cells.clear();
    model.nockTop = null;
    model.nockBottom = null;
    model.stringGx = null;
    refresh({ saveDraft: true });
    persistDraftNow();
  });

  document.getElementById('btn-copy').addEventListener('click', async () => {
    const code = generateExportCode(model);
    try {
      await navigator.clipboard.writeText(code);
      alert('应用层代码已复制');
    } catch {
      exportCode.select();
      document.execCommand('copy');
    }
  });

  document.getElementById('btn-download').addEventListener('click', () => {
    const blob = new Blob([generateExportCode(model)], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'custom-bow-data.js';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('btn-push-game').addEventListener('click', async () => {
    const scene = gridToBowScene(model);
    const check = validateBowScene(scene);
    if (!check.ok) {
      alert(check.reason);
      return;
    }
    const apply = toApplyData(model);
    pushBowToGame(apply);
    exportCode.value = exportBowSceneCode(model);
    const status = document.getElementById('push-status');
    const total = apply.particles.length + (apply.stringParticles?.length ?? 0);
    if (status) {
      status.textContent = `已推送本地 弓身${apply.particles.length}+弦${apply.stringParticles?.length ?? 0}=${total}格`;
      status.className = 'push-status ok';
    }

    if (shouldUseCloud()) {
      try {
        const title = window.prompt('云端弓身标题', '我的弓') || '我的弓';
        const pub = await publishBowToCloud(scene, { title });
        if (status) {
          status.textContent += ` · 已发布云端 (${pub.title})`;
        }
        setCloudStatus(`已发布云端 v${pub.id.slice(0, 8)}…`, 'on');
      } catch (e) {
        setCloudStatus(`云端发布失败: ${e.message}`, 'error');
      }
    }

    const open = confirm(
      `弓身已推送（弓身 ${apply.particles.length} + 弦 ${apply.stringParticles?.length ?? 0} 格）。\n\n确定：打开游戏\n取消：继续编辑`
    );
    if (open) {
      const url = new URL('index.html', location.href);
      url.searchParams.set('v', VERSION);
      url.searchParams.set('_', String(Date.now()));
      location.href = url.toString();
    }
  });

  document.getElementById('btn-cloud-toggle')?.addEventListener('click', () => {
    setCloudOptIn(!isCloudOptIn());
    updateCloudToggleUi();
    if (isCloudOptIn()) scheduleCloudDraftSave();
  });

  document.getElementById('btn-cloud-load')?.addEventListener('click', async () => {
    try {
      const session = loadCloudSession();
      const author = session?.authorLabel || await ensureAuthorFromPrompt();
      if (!author) return;
      saveCloudSession({ authorLabel: author });
      const cloud = await loadBowDraftFromCloud(author);
      if (!cloud?.bow) {
        alert('云端没有该昵称的草稿');
        return;
      }
      pushHistory();
      model = bowSceneToGrid(cloud.bow);
      if (cloud.viewport) {
        viewport.offsetX = cloud.viewport.offsetX ?? 0;
        viewport.offsetY = cloud.viewport.offsetY ?? 0;
        viewport.zoom = cloud.viewport.zoom ?? 1;
      }
      refresh({ saveDraft: true });
      setCloudStatus(`已从云端加载草稿`, 'on');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btn-cloud-gallery')?.addEventListener('click', async () => {
    try {
      const items = await listPublishedBows(20);
      if (!items.length) {
        alert('云端暂无已发布弓身');
        return;
      }
      const lines = items.map((w, i) => `${i + 1}. ${w.title} — ${w.authorLabel} (${w.id.slice(0, 8)})`);
      const pick = window.prompt(`选择弓身编号:\n${lines.join('\n')}`, '1');
      const idx = Number(pick) - 1;
      if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) return;
      const work = await downloadBowWork(items[idx].id);
      pushHistory();
      model = bowSceneToGrid(work.bow);
      refresh({ saveDraft: true });
      setCloudStatus(`已加载: ${work.title || items[idx].title}`, 'on');
    } catch (e) {
      alert(e.message);
    }
  });
}

async function ensureAuthorFromPrompt() {
  const name = window.prompt('输入昵称', loadCloudSession()?.authorLabel || '');
  return name?.trim() || null;
}

function bindCanvas() {
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
}

function resizeCanvas() {
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  refresh();
}

async function initFromDraftCloudOrEmpty() {
  const localDraft = loadDraft();
  const resolved = await resolveEditorBowScene({ localDraft });

  if (resolved.scene) {
    const check = validateBowScene(resolved.scene);
    if (check.ok || resolved.source === 'cloud' || resolved.source === 'local') {
      model = bowSceneToGrid(resolved.scene);
      const vp = resolved.viewport ?? localDraft?.viewport;
      if (vp) {
        viewport.offsetX = vp.offsetX ?? 0;
        viewport.offsetY = vp.offsetY ?? 0;
        viewport.zoom = vp.zoom ?? 1;
      }
      const src = resolved.source === 'cloud' ? '云端' : '本地';
      setDraftStatus(`已恢复${src}草稿`, 'restored');
      return;
    }
  }

  model = new GridModel();
  setDraftStatus('空白画布 · 绘制后自动保存草稿');
}

function bindLifecycle() {
  window.addEventListener('beforeunload', () => {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    persistDraftNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistDraftNow();
  });
}

async function bootEditor() {
  updateCloudToggleUi();
  await initFromDraftCloudOrEmpty();
  initPalette();
  bindUI();
  bindCanvas();
  bindLifecycle();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setInteractionMode('draw');
}

bootEditor().catch((e) => {
  console.error('[bow-editor]', e);
  setDraftStatus('编辑器加载失败', 'error');
});
