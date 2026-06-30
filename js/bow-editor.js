const WOOD_COLORS = ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'];
const GRID = 2;
const CANVAS_W = 200;
const CANVAS_H = 260;
const ANCHOR_X = 100;
const ANCHOR_Y = 220;
const DISPLAY_SCALE = 2;

const state = {
  tool: 'brush',
  color: WOOD_COLORS[1],
  showGrid: true,
  particles: new Map(),
  nockTop: null,
  nockBottom: null,
  stringDx: null,
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
  return { dx: x - ANCHOR_X, dy: y - ANCHOR_Y };
}

function toAbsolute(dx, dy) {
  return { x: ANCHOR_X + dx, y: ANCHOR_Y + dy };
}

function pushHistory() {
  state.history.push({
    particles: new Map(state.particles),
    nockTop: state.nockTop ? { ...state.nockTop } : null,
    nockBottom: state.nockBottom ? { ...state.nockBottom } : null,
    stringDx: state.stringDx,
  });
  if (state.history.length > 50) state.history.shift();
}

function undo() {
  const prev = state.history.pop();
  if (!prev) return;
  state.particles = prev.particles;
  state.nockTop = prev.nockTop;
  state.nockBottom = prev.nockBottom;
  state.stringDx = prev.stringDx;
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

function applyTool(x, y) {
  const { dx, dy } = toRelative(x, y);

  if (state.tool === 'brush') {
    const k = key(dx, dy);
    if (!state.particles.has(k)) {
      pushHistory();
      state.particles.set(k, { dx, dy, color: state.color, pinned: false });
    }
    return;
  }

  if (state.tool === 'eraser') {
    const k = key(dx, dy);
    if (state.particles.has(k)) {
      pushHistory();
      state.particles.delete(k);
    }
    return;
  }

  if (state.tool === 'pin') {
    const k = key(dx, dy);
    pushHistory();
    if (state.particles.has(k)) {
      const p = state.particles.get(k);
      p.pinned = !p.pinned;
    } else {
      state.particles.set(k, { dx, dy, color: state.color, pinned: true });
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
  ctx.strokeStyle = 'rgba(255, 80, 100, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ANCHOR_X - 8, ANCHOR_Y);
  ctx.lineTo(ANCHOR_X + 8, ANCHOR_Y);
  ctx.moveTo(ANCHOR_X, ANCHOR_Y - 8);
  ctx.lineTo(ANCHOR_X, ANCHOR_Y + 8);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 80, 100, 0.7)';
  ctx.font = '8px monospace';
  ctx.fillText('锚点', ANCHOR_X + 6, ANCHOR_Y - 4);
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
  if (dx === null || dy === null) return;
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
  const x = ANCHOR_X + state.stringDx;
  const y1 = ANCHOR_Y + state.nockTop.dy;
  const y2 = ANCHOR_Y + state.nockBottom.dy;

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function render() {
  drawBackground();
  drawGrid();
  drawParticles();
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
  document.getElementById('info-string').textContent = state.stringDx ?? '-16 (默认)';
  document.getElementById('info-count').textContent = state.particles.size;
  document.getElementById('info-anchor').textContent = '(0, 0)';
}

function computeStringOffsetX() {
  if (state.stringDx === null) return -16;
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
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
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

function bindCanvas() {
  const start = (e) => {
    e.preventDefault();
    isDrawing = true;
    const pos = getCanvasPos(e);
    applyTool(pos.x, pos.y);
    render();
    updateMeta();
    generateExport();
  };

  const move = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    applyTool(pos.x, pos.y);
    render();
    updateMeta();
    generateExport();
  };

  const end = () => { isDrawing = false; };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
}

function loadTemplate() {
  const template = [
    { dx: -2, dy: 0, color: '#8B4513', pinned: true },
    { dx: 0, dy: 0, color: '#6B3A1F', pinned: true },
    { dx: 2, dy: 0, color: '#8B4513', pinned: true },
    { dx: -4, dy: -4, color: '#A0522D' },
    { dx: -2, dy: -6, color: '#8B4513' },
    { dx: 0, dy: -8, color: '#7A4A2E' },
    { dx: 2, dy: -6, color: '#8B4513' },
    { dx: 4, dy: -4, color: '#A0522D' },
    { dx: -6, dy: -12, color: '#8B4513' },
    { dx: -4, dy: -16, color: '#A0522D' },
    { dx: -2, dy: -20, color: '#8B4513' },
    { dx: 0, dy: -24, color: '#6B3A1F' },
    { dx: 2, dy: -28, color: '#8B4513' },
    { dx: 4, dy: -32, color: '#A0522D' },
    { dx: 8, dy: -40, color: '#8B4513' },
    { dx: 12, dy: -52, color: '#7A4A2E' },
    { dx: 18, dy: -64, color: '#8B4513' },
    { dx: 24, dy: -76, color: '#A0522D' },
    { dx: 28, dy: -88, color: '#8B4513' },
    { dx: 2, dy: 4, color: '#8B4513' },
    { dx: 4, dy: 8, color: '#A0522D' },
    { dx: 8, dy: 14, color: '#8B4513' },
    { dx: 14, dy: 22, color: '#7A4A2E' },
    { dx: 20, dy: 30, color: '#8B4513' },
    { dx: 24, dy: 36, color: '#A0522D' },
  ];
  template.forEach((p) => state.particles.set(key(p.dx, p.dy), { ...p }));
  state.nockTop = { dx: 28, dy: -88 };
  state.nockBottom = { dx: 24, dy: 36 };
  state.stringDx = 12;
}

initPalette();
bindTools();
bindCanvas();
loadTemplate();
render();
updateMeta();
generateExport();
