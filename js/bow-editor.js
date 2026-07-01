import { CUSTOM_BOW_DATA } from './custom-bow-data.js';
import { GridModel } from './editor/grid-model.js';
import { fromApplyData, generateExportCode, toApplyData, CELL_SIZE } from './editor/apply.js';
import { Viewport } from './editor/viewport.js';
import { GridRenderer } from './editor/grid-renderer.js';
import { pushBowToGame } from './update-channel.js';
import { VERSION } from './version.js';

const WOOD_COLORS = ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'];

const model = fromApplyData(CUSTOM_BOW_DATA);
const viewport = new Viewport();
const canvas = document.getElementById('editor-canvas');
const renderer = new GridRenderer(canvas);
const exportCode = document.getElementById('export-code');

const state = {
  interactionMode: 'draw',
  tool: 'brush',
  color: WOOD_COLORS[1],
  history: [],
  lineStart: null,
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
  refresh();
}

function refresh() {
  renderer.render(model, viewport, {
    interactionMode: state.interactionMode,
    tool: state.tool,
    highlightAnchor: state.tool === 'anchor',
  });
  updateMeta();
  exportCode.value = generateExportCode(model);
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
  const t = e.touches ? e.touches[0] : e;
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
  const dx = gx1 - gx0;
  const dy = gy1 - gy0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    model.setCell(gx0, gy0, { color: state.color, pinned: false });
    return;
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const gx = Math.round(gx0 + dx * t);
    const gy = Math.round(gy0 + dy * t);
    model.setCell(gx, gy, { color: state.color, pinned: false });
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
    isPointerDown = true;
    e.preventDefault();
    return;
  }

  if (['anchor', 'pin', 'nockTop', 'nockBottom', 'string'].includes(state.tool)) {
    pushHistory();
    applyDrawTool(gx, gy);
    refresh();
    e.preventDefault();
    return;
  }

  if (state.tool === 'brush' || state.tool === 'eraser') {
    isPointerDown = true;
    brushPushed = false;
    ensureStrokeHistory();
    applyDrawTool(gx, gy);
    refresh();
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
    refresh();
    const { gx, gy } = getGrid(e);
    const ctx = canvas.getContext('2d');
    const p0 = viewport.gridToScreen(state.lineStart.gx, state.lineStart.gy, canvas.width, canvas.height);
    const p1 = viewport.gridToScreen(gx, gy, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,200,80,0.8)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.setLineDash([]);
    e.preventDefault();
    return;
  }

  if (state.tool === 'brush' || state.tool === 'eraser') {
    const { gx, gy } = getGrid(e);
    ensureStrokeHistory();
    applyDrawTool(gx, gy);
    refresh();
    e.preventDefault();
  }
}

function onPointerUp(e) {
  if (state.interactionMode === 'pan') {
    panStart = null;
    pinchStart = null;
    isPointerDown = false;
    return;
  }

  if (state.tool === 'line' && state.lineStart) {
    const { gx, gy } = getGrid(e);
    pushHistory();
    placeLine(state.lineStart.gx, state.lineStart.gy, gx, gy);
    state.lineStart = null;
    refresh();
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
}

function setInteractionMode(mode) {
  state.interactionMode = mode;
  state.lineStart = null;
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
  });
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('清空全部网格？')) return;
    pushHistory();
    model.cells.clear();
    model.nockTop = null;
    model.nockBottom = null;
    model.stringGx = null;
    refresh();
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

  document.getElementById('btn-push-game').addEventListener('click', () => {
    const apply = toApplyData(model);
    if (!apply.nockTop || !apply.nockBottom) {
      alert('请先设置上梢和下梢');
      return;
    }
    if (apply.particles.length === 0) {
      alert('请至少绘制一个弓身粒子');
      return;
    }
    const payload = pushBowToGame(apply);
    exportCode.value = generateExportCode(model);
    const status = document.getElementById('push-status');
    const total = apply.particles.length + (apply.stringParticles?.length ?? 0);
    if (status) {
      status.textContent = `已推送 弓身${apply.particles.length}+弦${apply.stringParticles?.length ?? 0}=${total}格 → 游戏待更新`;
      status.className = 'push-status ok';
    }
    const open = confirm(
      `弓身已推送到游戏（弓身 ${apply.particles.length} + 弦 ${apply.stringParticles?.length ?? 0} 格）。\n\n确定：打开游戏并自动更新\n取消：稍后手动在游戏页点「更新」`
    );
    if (open) {
      const url = new URL('index.html', location.href);
      url.searchParams.set('v', VERSION);
      url.searchParams.set('_', String(Date.now()));
      location.href = url.toString();
    }
  });
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

initPalette();
bindUI();
bindCanvas();
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
setInteractionMode('draw');
