/**
 * 绘制层渲染 — 纯网格，色块填满格子内部
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
    const cx = W / 2 + viewport.offsetX;
    const cy = H / 2 + viewport.offsetY;

    this.clear();

    ctx.save();
    this._drawGrid(cx, cy, cs, W, H);

    if (options.linePreview?.length) {
      for (const { gx, gy } of options.linePreview) {
        const { x, y } = viewport.gridCellTopLeft(gx, gy, W, H);
        ctx.fillStyle = 'rgba(255, 200, 80, 0.35)';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    for (const c of model.cells.values()) {
      const { x, y } = viewport.gridCellTopLeft(c.gx, c.gy, W, H);
      ctx.fillStyle = c.color;
      ctx.fillRect(x, y, cs, cs);
      if (c.kind === 'string') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cs, cs);
      }
      if (c.pinned) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cs, cs);
      }
    }

    if (model.stringGx !== null && model.nockTop && model.nockBottom) {
      const sx = viewport.gridCellCenter(model.stringGx, 0, W, H).x;
      const y1 = viewport.gridCellCenter(0, model.nockTop.gy, W, H).y;
      const y2 = viewport.gridCellCenter(0, model.nockBottom.gy, W, H).y;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, y1);
      ctx.lineTo(sx, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this._drawMarker(model.nockTop, viewport, W, H, '#4ecca3', '上梢');
    this._drawMarker(model.nockBottom, viewport, W, H, '#4ecca3', '下梢');

    ctx.strokeStyle = options.highlightAnchor ? '#ff8866' : '#ff4466';
    ctx.lineWidth = options.highlightAnchor ? 2 : 1;
    const arm = options.highlightAnchor ? 12 : 8;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy);
    ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm);
    ctx.lineTo(cx, cy + arm);
    ctx.stroke();
    ctx.fillStyle = options.highlightAnchor ? '#ffaa88' : '#ff6688';
    ctx.font = `${Math.max(9, cs * 0.45)}px monospace`;
    ctx.fillText('锚点(0,0)', cx + 8, cy - 6);

    ctx.restore();

    this._drawModeBadge(options.interactionMode, options.tool);
  }

  _drawGrid(cx, cy, cs, W, H) {
    const { ctx } = this;
    const gxMin = Math.floor((0 - cx) / cs) - 1;
    const gxMax = Math.ceil((W - cx) / cs) + 1;
    const gyMin = Math.floor((0 - cy) / cs) - 1;
    const gyMax = Math.ceil((H - cy) / cs) + 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let gx = gxMin; gx <= gxMax; gx++) {
      const x = cx + gx * cs;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const y = cy + gy * cs;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }

  _drawMarker(pt, viewport, W, H, color, label) {
    if (!pt) return;
    const { ctx } = this;
    const { x, y } = viewport.gridCellCenter(pt.gx, pt.gy, W, H);
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
