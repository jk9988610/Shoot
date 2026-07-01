/**
 * 绘制层渲染 — 纯网格，无游戏场景
 */
export class GridRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#0e1220';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(model, viewport, options = {}) {
    const { ctx, canvas } = this;
    const { width: W, height: H } = canvas;
    const cs = viewport.cellSize;
    const origin = viewport.gridToScreen(0, 0, W, H);

    this.clear();

    ctx.save();
    this._drawGrid(viewport, W, H, origin, cs);

    for (const c of model.cells.values()) {
      const { x, y } = viewport.gridToScreen(c.gx, c.gy, W, H);
      ctx.fillStyle = c.color;
      ctx.fillRect(x - cs / 2, y - cs / 2, cs, cs);
      if (c.pinned) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - cs / 2, y - cs / 2, cs, cs);
      }
    }

    if (model.stringGx !== null && model.nockTop && model.nockBottom) {
      const sx = viewport.gridToScreen(model.stringGx, 0, W, H).x;
      const y1 = viewport.gridToScreen(0, model.nockTop.gy, W, H).y;
      const y2 = viewport.gridToScreen(0, model.nockBottom.gy, W, H).y;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, y1);
      ctx.lineTo(sx, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this._drawMarker(model.nockTop, viewport, W, H, '#4ecca3', '上梢');
    this._drawMarker(model.nockBottom, viewport, W, H, '#4ecca3', '下梢');

    const ax = origin.x;
    const ay = origin.y;
    const hl = options.highlightAnchor;
    ctx.strokeStyle = hl ? '#ff8866' : '#ff4466';
    ctx.lineWidth = hl ? 2 : 1;
    const arm = hl ? 12 : 8;
    ctx.beginPath();
    ctx.moveTo(ax - arm, ay);
    ctx.lineTo(ax + arm, ay);
    ctx.moveTo(ax, ay - arm);
    ctx.lineTo(ax, ay + arm);
    ctx.stroke();
    ctx.fillStyle = hl ? '#ffaa88' : '#ff6688';
    ctx.font = `${Math.max(9, cs * 0.45)}px monospace`;
    ctx.fillText('锚点(0,0)', ax + 8, ay - 6);

    ctx.restore();

    this._drawModeBadge(options.interactionMode, options.tool);
  }

  _drawGrid(viewport, W, H, origin, cs) {
    const { ctx } = this;
    const gxMin = Math.floor((0 - origin.x) / cs) - 1;
    const gxMax = Math.ceil((W - origin.x) / cs) + 1;
    const gyMin = Math.floor((origin.y - H) / cs) - 1;
    const gyMax = Math.ceil(origin.y / cs) + 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let gx = gxMin; gx <= gxMax; gx++) {
      const x = origin.x + gx * cs;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const y = origin.y - gy * cs;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(W, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, H);
    ctx.stroke();
  }

  _drawMarker(pt, viewport, W, H, color, label) {
    if (!pt) return;
    const { ctx } = this;
    const { x, y } = viewport.gridToScreen(pt.gx, pt.gy, W, H);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.fillText(label, x + 7, y + 3);
  }

  _drawModeBadge(mode, tool) {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(22,33,62,0.9)';
    ctx.fillRect(8, 8, 120, 22);
    ctx.fillStyle = mode === 'pan' ? '#ffd700' : '#4ecca3';
    ctx.font = '9px monospace';
    const label = mode === 'pan' ? '拖动 · 单指移 · 双指缩放' : `绘制 · ${tool}`;
    ctx.fillText(label, 14, 22);
  }
}
