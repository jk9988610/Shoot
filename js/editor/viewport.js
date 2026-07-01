/**
 * 视口 — 平移与缩放
 * 格坐标 (gx, gy)：一格一方块，色块落在格子内部（非网格线交叉点）
 * gy 向下为正（与画布 Y 轴一致）
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

  /** 屏幕坐标 → 所在格子索引 */
  screenToGrid(sx, sy, canvasW, canvasH) {
    const cx = canvasW / 2 + this.offsetX;
    const cy = canvasH / 2 + this.offsetY;
    const cs = this.cellSize;
    const gx = Math.floor((sx - cx) / cs);
    const gy = Math.floor((sy - cy) / cs);
    return { gx, gy };
  }

  /** 格子左上角屏幕坐标 */
  gridCellTopLeft(gx, gy, canvasW, canvasH) {
    const cx = canvasW / 2 + this.offsetX;
    const cy = canvasH / 2 + this.offsetY;
    const cs = this.cellSize;
    return {
      x: cx + gx * cs,
      y: cy + gy * cs,
    };
  }

  /** 格子中心屏幕坐标（标记用） */
  gridCellCenter(gx, gy, canvasW, canvasH) {
    const cs = this.cellSize;
    const { x, y } = this.gridCellTopLeft(gx, gy, canvasW, canvasH);
    return { x: x + cs / 2, y: y + cs / 2 };
  }

  /** @deprecated 使用 gridCellTopLeft / gridCellCenter */
  gridToScreen(gx, gy, canvasW, canvasH) {
    return this.gridCellCenter(gx, gy, canvasW, canvasH);
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
