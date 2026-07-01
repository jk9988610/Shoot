/**
 * 绘制层 — 网格数据模型（表现逻辑）
 * 一格 = 一个粒子，与游戏物理无关
 */
export class GridModel {
  constructor() {
    this.cells = new Map();
    this.anchor = { gx: 0, gy: 0 };
    this.nockTop = null;
    this.nockBottom = null;
    this.stringGx = null;
  }

  static key(gx, gy) {
    return `${gx},${gy}`;
  }

  getCell(gx, gy) {
    return this.cells.get(GridModel.key(gx, gy));
  }

  setCell(gx, gy, data) {
    this.cells.set(GridModel.key(gx, gy), {
      gx,
      gy,
      kind: 'body',
      pinned: false,
      ...data,
    });
  }

  removeCell(gx, gy) {
    this.cells.delete(GridModel.key(gx, gy));
  }

  togglePin(gx, gy, color) {
    const c = this.getCell(gx, gy);
    if (c) {
      c.pinned = !c.pinned;
    } else {
      this.setCell(gx, gy, { color, pinned: true, kind: 'body' });
    }
  }

  shiftAnchor(newGx, newGy) {
    const { gx: ox, gy: oy } = this.anchor;
    if (ox === newGx && oy === newGy) return false;

    const shift = (pt) => pt ? { gx: pt.gx - newGx + ox, gy: pt.gy - newGy + oy } : null;

    const next = new Map();
    for (const c of this.cells.values()) {
      const ngx = c.gx - newGx + ox;
      const ngy = c.gy - newGy + oy;
      next.set(GridModel.key(ngx, ngy), { ...c, gx: ngx, gy: ngy });
    }

    this.cells = next;
    this.anchor = { gx: newGx, gy: newGy };
    this.nockTop = shift(this.nockTop);
    this.nockBottom = shift(this.nockBottom);
    if (this.stringGx !== null) this.stringGx = this.stringGx - newGx + ox;
    return true;
  }

  snapshot() {
    const cells = new Map();
    for (const [k, c] of this.cells) {
      cells.set(k, { ...c });
    }
    return {
      cells,
      anchor: { ...this.anchor },
      nockTop: this.nockTop ? { ...this.nockTop } : null,
      nockBottom: this.nockBottom ? { ...this.nockBottom } : null,
      stringGx: this.stringGx,
    };
  }

  restore(snap) {
    this.cells = new Map();
    for (const [k, c] of snap.cells) {
      this.cells.set(k, { ...c });
    }
    this.anchor = { ...snap.anchor };
    this.nockTop = snap.nockTop ? { ...snap.nockTop } : null;
    this.nockBottom = snap.nockBottom ? { ...snap.nockBottom } : null;
    this.stringGx = snap.stringGx;
  }
}
