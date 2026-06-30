/**
 * 视口 — 平移与缩放
 */
export class Viewport {
  constructor() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.cellPx = 20;
    this.minZoom = 0.25;
    this.maxZoom = 4;
  }

  get cellSize() {
    return this.cellPx * this.zoom;
  }

  screenToGrid(sx, sy, canvasW, canvasH) {
    const cx = canvasW / 2 + this.offsetX;
    const cy = canvasH / 2 + this.offsetY;
    const gx = Math.round((sx - cx) / this.cellSize);
    const gy = Math.round((cy - sy) / this.cellSize);
    return { gx, gy };
  }

  gridToScreen(gx, gy, canvasW, canvasH) {
    const cx = canvasW / 2 + this.offsetX;
    const cy = canvasH / 2 + this.offsetY;
    return {
      x: cx + gx * this.cellSize,
      y: cy - gy * this.cellSize,
    };
  }

  pan(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  zoomAt(factor, sx, sy, canvasW, canvasH) {
    const before = this.screenToGrid(sx, sy, canvasW, canvasH);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const after = this.screenToGrid(sx, sy, canvasW, canvasH);
    this.offsetX += (after.gx - before.gx) * this.cellSize;
    this.offsetY += (after.gy - before.gy) * this.cellSize;
  }

  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
  }
}
