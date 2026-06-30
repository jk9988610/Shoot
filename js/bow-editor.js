import { CUSTOM_BOW_DATA } from './custom-bow-data.js';

const WOOD_COLORS = ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'];
const GRID = 2;
const CANVAS_W = 200;
const CANVAS_H = 260;

const state = {
  tool: 'brush',
  color: WOOD_COLORS[1],
  showGrid: true,
  anchorX: 100,
  anchorY: 220,
  particles: new Map(),
  nockTop: null,
  nockBottom: null,
  stringDx: null,
  lineStart: null,
  linePreview: null,
  anchorDragging: false,
  history: [],
};

const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const exportCode = document.getElementById('export-code');

function key(dx, dy) {
  return `${dx},${dy}`;
}

function snap(v) {
  return Math.round(v / GRID) * GRID;
}

function toRelative(x, y) {
  return { dx: x - state.anchorX, dy: y - state.anchorY };
}

function toAbsolute(dx, dy) {
  return { x: state.anchorX + dx, y: state.anchorY + dy };
}

function snapshot() {
  return {
    particles: new Map(state.particles),
    nockTop: state.nockTop ? { ...state.nockTop } : null,
    nockBottom: state.nockBottom ? { ...state.nockBottom } : null,
    stringDx: state.stringDx,
    anchorX: state.anchorX,
    anchorY: state.anchorY,
  };
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 50) state.history.shift();
}

function restore(snap) {
  state.particles = snap.particles;
  state.nockTop = snap.nockTop;
  state.nockBottom = snap.nockBottom;
  state.stringDx = snap.stringDx;
  state.anchorX = snap.anchorX;
  state.anchorY = snap.anchorY;
}

function undo() {
  const prev = state.history.pop();
  if (!prev) return;
  restore(prev);
  render();
  updateMeta();
  generateExport();
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: snap((clientX - rect.left) * (CANVAS_W / rect.width)),
    y: snap((clientY - rect.top) * (CANVAS_H / rect.height)),
  };
}

function placeParticle(dx, dy, options = {}) {
  const k = key(dx, dy);
  if (state.particles.has(k) && state.tool !== 'pin') return false;
  state.particles.set(k, {
    dx,
    dy,
    color: options.color ?? state.color,
    pinned: options.pinned ?? false,
  });
  return true;
}

function placeLine(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / GRID;
  if (steps === 0) {
    const rel = toRelative(x0, y0);
    placeParticle(rel.dx, rel.dy);
    return;
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = snap(x0 + dx * t);
    const y = snap(y0 + dy * t);
    const rel = toRelative(x, y);
    placeParticle(rel.dx, rel.dy);
  }
}

function shiftAnchor(newX, newY) {
  const oldX = state.anchorX;
  const oldY = state.anchorY;
  if (oldX === newX && oldY === newY) return false;

  const shiftRel = (pt) => {
    if (!pt) return null;
    return { dx: oldX + pt.dx - newX, dy: oldY + pt.dy - newY };
  };

  const next = new Map();
  for (const p of state.particles.values()) {
    const dx = oldX + p.dx - newX;
    const dy = oldY + p.dy - newY;
    const k = key(dx, dy);
    if (!next.has(k)) {
      next.set(k, { ...p, dx, dy });
    }
  }

  state.particles = next;
  state.nockTop = shiftRel(state.nockTop);
  state.nockBottom = shiftRel(state.nockBottom);
  if (state.stringDx !== null) {
    state.stringDx = oldX + state.stringDx - newX;
  }
  state.anchorX = newX;
  state.anchorY = newY;
  return true;
}

function applyClick(x, y) {
  const { dx, dy } = toRelative(x, y);

  if (state.tool === 'pin') {
    pushHistory();
    const k = key(dx, dy);
    if (state.particles.has(k)) {
      state.particles.get(k).pinned = !state.particles.get(k).pinned;
    } else {
      placeParticle(dx, dy, { pinned: true });
    }
    return;
  }

  if (state.tool === 'nockTop') {
    pushHistory();
    state.nockTop = { dx, dy };
    return;
  }

  if (state.tool === 'nockBottom') {
    pushHistory();
    state.nockBottom = { dx, dy };
    return;
  }

  if (state.tool === 'string') {
    pushHistory();
    state.stringDx = dx;
  }
}

function applyBrush(x, y) {
  const { dx, dy } = toRelative(x, y);
  if (state.tool === 'brush') {
    const k = key(dx, dy);
    if (!state.particles.has(k)) {
      placeParticle(dx, dy);
      return true;
    }
    return false;
  }
  if (state.tool === 'eraser') {
    const k = key(dx, dy);
    if (state.particles.has(k)) {
      state.particles.delete(k);
      return true;
    }
    return false;
  }
  return false;
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#5BA3D9');
  grad.addColorStop(1, '#B8D4E8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const groundY = CANVAS_H - 20;
  ctx.fillStyle = '#3D6B2E';
  ctx.fillRect(0, groundY, CANVAS_W, 20);
  ctx.fillStyle = '#356025';
  ctx.fillRect(0, groundY, CANVAS_W, 2);
}

function drawGrid() {
  if (!state.showGrid) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += GRID) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += GRID) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
}

function drawAnchor() {
  const { anchorX: ax, anchorY: ay } = state;
  const active = state.tool === 'anchor';
  const size = active ? 14 : 10;

  if (active) {
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ax, ay, 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = active ? 'rgba(255, 120, 80, 1)' : 'rgba(255, 80, 100, 0.8)';
  ctx.lineWidth = active ? 2 : 1;
  ctx.beginPath();
  ctx.moveTo(ax - size, ay);
  ctx.lineTo(ax + size, ay);
  ctx.moveTo(ax, ay - size);
  ctx.lineTo(ax, ay + size);
  ctx.stroke();

  ctx.fillStyle = active ? 'rgba(255, 200, 80, 1)' : 'rgba(255, 80, 100, 0.9)';
  ctx.font = '8px monospace';
  ctx.fillText(`锚点(0,0) [${ax},${ay}]`, ax + 8, ay - 8);
}

function drawParticles() {
  for (const p of state.particles.values()) {
    const { x, y } = toAbsolute(p.dx, p.dy);
    ctx.fillStyle = p.color;
    ctx.fillRect(x - 1, y - 1, GRID, GRID);
    if (p.pinned) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2, y - 2, GRID + 2, GRID + 2);
    }
  }
}

function drawMarker(dx, dy, color, label) {
  if (dx === null || dy === undefined || dy === null) return;
  const { x, y } = toAbsolute(dx, dy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.fillText(label, x + 6, y + 3);
}

function drawStringLine() {
  if (state.stringDx === null || !state.nockTop || !state.nockBottom) return;
  const x = state.anchorX + state.stringDx;
  const y1 = state.anchorY + state.nockTop.dy;
  const y2 = state.anchorY + state.nockBottom.dy;

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLinePreview() {
  if (!state.lineStart || !state.linePreview) return;
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(state.lineStart.x, state.lineStart.y);
  ctx.lineTo(state.linePreview.x, state.linePreview.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function render() {
  drawBackground();
  drawGrid();
  drawParticles();
  drawLinePreview();
  drawStringLine();
  drawMarker(state.nockTop?.dx, state.nockTop?.dy, '#4ecca3', '上梢');
  drawMarker(state.nockBottom?.dx, state.nockBottom?.dy, '#4ecca3', '下梢');
  drawAnchor();
}

function updateMeta() {
  document.getElementById('info-nock-top').textContent = state.nockTop
    ? `(${state.nockTop.dx}, ${state.nockTop.dy})` : '未设置';
  document.getElementById('info-nock-bottom').textContent = state.nockBottom
    ? `(${state.nockBottom.dx}, ${state.nockBottom.dy})` : '未设置';
  document.getElementById('info-string').textContent = state.stringDx ?? '未设置';
  document.getElementById('info-count').textContent = state.particles.size;
  document.getElementById('info-anchor').textContent =
    `画布(${state.anchorX}, ${state.anchorY}) → 导出(0,0)`;
}

function computeStringOffsetX() {
  if (state.stringDx === null) return 0;
  if (!state.nockTop) return state.stringDx;
  return state.stringDx - state.nockTop.dx;
}

function generateExport() {
  const particles = [...state.particles.values()].sort((a, b) => a.dy - b.dy || a.dx - b.dx);
  const lines = particles.map((p) => {
    const pin = p.pinned ? ', pinned: true' : '';
    return `    { dx: ${p.dx}, dy: ${p.dy}, color: '${p.color}'${pin} },`;
  });

  const nockTopStr = state.nockTop
    ? `{ dx: ${state.nockTop.dx}, dy: ${state.nockTop.dy} }`
    : 'null /* 请设置上弓梢 */';
  const nockBottomStr = state.nockBottom
    ? `{ dx: ${state.nockBottom.dx}, dy: ${state.nockBottom.dy} }`
    : 'null /* 请设置下弓梢 */';

  const code = `/**
 * 自定义弓身数据
 * 由弓身绘制工具导出 — ${new Date().toISOString()}
 *
 * 用法：将此文件全部内容发给我，我会集成到 bow.js
 * 坐标说明：dx/dy 相对于握把锚点 (0,0)，dy 向上为负
 */
export const CUSTOM_BOW_DATA = {
  version: 1,
  stringOffsetX: ${computeStringOffsetX()},
  nockTop: ${nockTopStr},
  nockBottom: ${nockBottomStr},
  particles: [
${lines.join('\n')}
  ],
};
`;

  exportCode.value = code;
  return code;
}

function initPalette() {
  const palette = document.getElementById('color-palette');
  WOOD_COLORS.forEach((color, i) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = `color-swatch${i === 1 ? ' active' : ''}`;
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      state.color = color;
      palette.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.tool = 'brush';
      document.querySelectorAll('.tool-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.tool === 'brush');
      });
    });
    palette.appendChild(swatch);
  });
}

function bindTools() {
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.tool;
      state.lineStart = null;
      state.linePreview = null;
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      canvas.style.cursor = state.tool === 'anchor' ? 'move' : 'crosshair';
      render();
    });
  });

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('确定清空全部绘制？')) return;
    pushHistory();
    state.particles.clear();
    state.nockTop = null;
    state.nockBottom = null;
    state.stringDx = null;
    render();
    updateMeta();
    generateExport();
  });

  document.getElementById('btn-grid').addEventListener('click', (e) => {
    state.showGrid = !state.showGrid;
    e.target.textContent = `网格: ${state.showGrid ? '开' : '关'}`;
    render();
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    generateExport();
    updateMeta();
  });

  document.getElementById('btn-copy').addEventListener('click', async () => {
    const code = generateExport();
    try {
      await navigator.clipboard.writeText(code);
      alert('代码已复制到剪贴板');
    } catch {
      exportCode.select();
      document.execCommand('copy');
      alert('代码已复制');
    }
  });

  document.getElementById('btn-download').addEventListener('click', () => {
    const code = generateExport();
    const blob = new Blob([code], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'custom-bow-data.js';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

let isDrawing = false;
let brushHistoryPushed = false;

function bindCanvas() {
  const start = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (state.tool === 'anchor') {
      pushHistory();
      state.anchorDragging = true;
      isDrawing = true;
      shiftAnchor(pos.x, pos.y);
      render();
      updateMeta();
      generateExport();
      return;
    }

    if (state.tool === 'line') {
      state.lineStart = pos;
      state.linePreview = pos;
      isDrawing = true;
      render();
      return;
    }

    if (['pin', 'nockTop', 'nockBottom', 'string'].includes(state.tool)) {
      applyClick(pos.x, pos.y);
      render();
      updateMeta();
      generateExport();
      return;
    }

    if (state.tool === 'brush' || state.tool === 'eraser') {
      isDrawing = true;
      brushHistoryPushed = false;
      if (applyBrush(pos.x, pos.y)) {
        pushHistory();
        brushHistoryPushed = true;
      }
      render();
      updateMeta();
      generateExport();
    }
  };

  const move = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (state.tool === 'anchor' && state.anchorDragging) {
      shiftAnchor(pos.x, pos.y);
      render();
      updateMeta();
      generateExport();
      return;
    }

    if (state.tool === 'line') {
      state.linePreview = pos;
      render();
      return;
    }

    if (state.tool === 'brush' || state.tool === 'eraser') {
      if (applyBrush(pos.x, pos.y)) {
        if (!brushHistoryPushed) {
          pushHistory();
          brushHistoryPushed = true;
        }
        render();
        updateMeta();
        generateExport();
      }
    }
  };

  const end = () => {
    if (!isDrawing) return;

    if (state.tool === 'line' && state.lineStart && state.linePreview) {
      pushHistory();
      placeLine(
        state.lineStart.x, state.lineStart.y,
        state.linePreview.x, state.linePreview.y
      );
      state.lineStart = null;
      state.linePreview = null;
      render();
      updateMeta();
      generateExport();
    }

    isDrawing = false;
    state.anchorDragging = false;
    brushHistoryPushed = false;
  };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
}

function loadFromGameData() {
  const data = CUSTOM_BOW_DATA;
  data.particles.forEach((p) => {
    state.particles.set(key(p.dx, p.dy), { ...p });
  });
  state.nockTop = { ...data.nockTop };
  state.nockBottom = { ...data.nockBottom };
  state.stringDx = data.nockTop.dx + data.stringOffsetX;
}

initPalette();
bindTools();
bindCanvas();
loadFromGameData();
render();
updateMeta();
generateExport();
