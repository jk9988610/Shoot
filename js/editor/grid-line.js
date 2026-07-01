/**
 * 网格直线 — Bresenham 遍历经过的格子
 */
export function lineCells(gx0, gy0, gx1, gy1) {
  const cells = [];
  let x0 = gx0;
  let y0 = gy0;
  const x1 = gx1;
  const y1 = gy1;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    cells.push({ gx: x0, gy: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return cells;
}
