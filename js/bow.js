import { MATERIALS } from './particle.js';
import { CUSTOM_BOW_DATA } from './custom-bow-data.js';
import { resolveBowData } from './update-channel.js';
import { CELL_SIZE as DEFAULT_CELL_SIZE } from './editor/apply.js';

function getBowData() {
  return resolveBowData(CUSTOM_BOW_DATA).data;
}

function getCellSize() {
  return getBowData().cellSize ?? DEFAULT_CELL_SIZE;
}

/**
 * 弓 — 横屏剖面视角，弓身/弓弦均为格对齐色块粒子
 */
export class Bow {
  constructor(system, x, groundY) {
    this.system = system;
    this.x = x;
    this.groundY = groundY;
    this.particles = [];
    this.stringParticles = [];
    this.gripParticles = [];
    this.nockTop = null;
    this.nockBottom = null;
    this.stringCenter = null;
    this.maxDraw = 120;
    this.isDrawing = false;
    this.drawAmount = 0;
    this.stringOffsetX = getBowData().stringOffsetX;
    this.bodyConstraints = [];
    this.stringConstraints = [];

    this._build();
  }

  static getDataSource() {
    return resolveBowData(CUSTOM_BOW_DATA);
  }

  _build() {
    this._buildFromCustom();
  }

  _bowAnchorY(data, cell) {
    const extent = Math.max(
      0,
      ...data.particles.map((p) => Math.abs(p.dy)),
      ...(data.stringParticles ?? []).map((p) => Math.abs(p.dy)),
    );
    return this.groundY - extent - cell * 2;
  }

  _buildFromCustom() {
    const data = getBowData();
    const cell = getCellSize();
    const cx = this.x;
    const cy = this._bowAnchorY(data, cell);
    const placed = [];
    const map = new Map();
    const occupied = new Set();

    for (const pt of data.particles) {
      const px = cx + pt.dx;
      const py = cy + pt.dy;
      const key = `${pt.dx},${pt.dy}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      const pinned = !!pt.pinned || (pt.dy >= 0 && pt.dx >= -cell * 2 && pt.dx <= cell * 2);
      const p = this.system.addParticle(px, py, MATERIALS.WOOD, {
        pinned,
        owner: 'bow',
        color: pt.color,
        radius: cell / 2,
        restX: px,
        restY: py,
        cellSize: cell,
      });
      placed.push({ p, dx: pt.dx, dy: pt.dy });
      map.set(`${pt.dx},${pt.dy}`, p);
      this.particles.push(p);
      if (pinned) this.gripParticles.push(p);
    }

    this._linkAdjacentParticles(placed, map, cell);
    this._linkSpineParticles(placed, cell);

    this.nockTop = map.get(`${data.nockTop.dx},${data.nockTop.dy}`)
      || this._createNock(cx + data.nockTop.dx, cy + data.nockTop.dy, cell);
    this.nockBottom = map.get(`${data.nockBottom.dx},${data.nockBottom.dy}`)
      || this._createNock(cx + data.nockBottom.dx, cy + data.nockBottom.dy, cell);

    this._buildString(cx, cy, data, cell, occupied);
  }

  _createNock(x, y, cell) {
    const p = this.system.addParticle(x, y, MATERIALS.WOOD, {
      pinned: true,
      owner: 'bow',
      color: MATERIALS.WOOD.colors[0],
      radius: cell / 2,
      restX: x,
      restY: y,
      cellSize: cell,
    });
    this.particles.push(p);
    return p;
  }

  _addBodyConstraint(p1, p2, options = {}) {
    const c = this.system.addConstraint(p1, p2, {
      stiffness: MATERIALS.WOOD.stiffness,
      type: 'rigid',
      ...options,
    });
    this.bodyConstraints.push(c);
    return c;
  }

  _linkAdjacentParticles(placed, map, cell) {
    const offsets = [
      [cell, 0], [-cell, 0], [0, cell], [0, -cell],
      [cell, cell], [-cell, cell], [cell, -cell], [-cell, -cell],
    ];
    const linked = new Set();

    for (const { p, dx, dy } of placed) {
      for (const [ox, oy] of offsets) {
        const neighbor = map.get(`${dx + ox},${dy + oy}`);
        if (!neighbor) continue;
        const id = p.id < neighbor.id ? `${p.id}-${neighbor.id}` : `${neighbor.id}-${p.id}`;
        if (linked.has(id)) continue;
        linked.add(id);
        this._addBodyConstraint(p, neighbor);
      }
    }
  }

  _linkSpineParticles(placed, cell) {
    const byDy = new Map();
    for (const item of placed) {
      if (item.dy >= -cell * 2) continue;
      if (!byDy.has(item.dy)) byDy.set(item.dy, []);
      byDy.get(item.dy).push(item);
    }

    const dys = [...byDy.keys()].sort((a, b) => a - b);
    let prev = null;
    for (const dy of dys) {
      const row = byDy.get(dy).sort((a, b) => a.dx - b.dx);
      const spine = row.reduce((best, cur) => (cur.dx > best.dx ? cur : best));
      if (prev) {
        this._addBodyConstraint(prev.p, spine.p, { stiffness: 0.98 });
      }
      prev = spine;
    }
  }

  _buildString(cx, cy, data, cell, occupied = new Set()) {
    const pts = data.stringParticles ?? [];
    if (pts.length === 0) {
      this._buildStringFallback(cell);
      return;
    }

    const sorted = [...pts].sort((a, b) => a.dy - b.dy);
    for (const pt of sorted) {
      const key = `${pt.dx},${pt.dy}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      const px = cx + pt.dx;
      const py = cy + pt.dy;
      const pinned = !!pt.pinned;
      const p = this.system.addParticle(px, py, MATERIALS.STRING, {
        pinned,
        owner: 'bow_string',
        color: pt.color,
        cellSize: cell,
        restX: px,
        restY: py,
      });
      this.stringParticles.push(p);
    }

    for (let i = 1; i < this.stringParticles.length; i++) {
      const c = this.system.addConstraint(this.stringParticles[i - 1], this.stringParticles[i], {
        stiffness: MATERIALS.STRING.stiffness,
        type: 'spring',
      });
      this.stringConstraints.push(c);
    }

    this.system.addConstraint(this.nockTop, this.stringParticles[0], {
      stiffness: 0.85,
      type: 'spring',
    });
    this.system.addConstraint(
      this.nockBottom,
      this.stringParticles[this.stringParticles.length - 1],
      { stiffness: 0.85, type: 'spring' },
    );

    this.stringCenter = this.stringParticles[Math.floor(this.stringParticles.length / 2)];
    this.restCenterX = this.stringCenter.x;
    this.restCenterY = this.stringCenter.y;
  }

  _buildStringFallback(cell) {
    const stringX = this.nockTop.x + this.stringOffsetX;
    const steps = Math.round((this.nockBottom.y - this.nockTop.y) / cell);
    for (let i = 0; i <= steps; i++) {
      const py = this.nockTop.y + i * cell;
      const pinned = i === 0 || i === steps;
      const p = this.system.addParticle(stringX, py, MATERIALS.STRING, {
        pinned,
        owner: 'bow_string',
        color: MATERIALS.STRING.colors[i % MATERIALS.STRING.colors.length],
        cellSize: cell,
        restX: stringX,
        restY: py,
      });
      this.stringParticles.push(p);
      if (i > 0) {
        this.system.addConstraint(this.stringParticles[i - 1], p, {
          stiffness: MATERIALS.STRING.stiffness,
          type: 'spring',
        });
      }
    }
    this.stringCenter = this.stringParticles[Math.floor(this.stringParticles.length / 2)];
    this.restCenterX = this.stringCenter.x;
    this.restCenterY = this.stringCenter.y;
  }

  getStringCenter() {
    return this.stringCenter;
  }

  getDrawVector() {
    return {
      x: this.stringCenter.x - this.restCenterX,
      y: this.stringCenter.y - this.restCenterY,
    };
  }

  getTension() {
    const draw = this.getDrawVector();
    const dist = Math.hypot(draw.x, draw.y);
    return Math.min(dist / this.maxDraw, 1);
  }

  pullString(targetX, targetY) {
    const cx = this.restCenterX;
    const cy = this.restCenterY;
    let dx = targetX - cx;
    let dy = targetY - cy;

    if (dx > 0) dx *= 0.15;
    dy = Math.max(-20, Math.min(20, dy));

    const dist = Math.hypot(dx, dy);
    if (dist > this.maxDraw) {
      dx = (dx / dist) * this.maxDraw;
      dy = (dy / dist) * this.maxDraw;
    }

    this.stringCenter.x = cx + dx;
    this.stringCenter.y = cy + dy;
    this.stringCenter.prevX = this.stringCenter.x;
    this.stringCenter.prevY = this.stringCenter.y;

    const centerIdx = Math.floor(this.stringParticles.length / 2);
    const count = this.stringParticles.length - 1;
    for (let i = 0; i < this.stringParticles.length; i++) {
      const p = this.stringParticles[i];
      if (p.pinned) continue;
      const t = Math.abs(i - centerIdx) / centerIdx;
      const falloff = 1 - t * 0.65;
      const baseY = this.nockTop.y + (this.nockBottom.y - this.nockTop.y) * (i / count);
      p.x = cx + dx * falloff;
      p.y = baseY + dy * falloff * 0.2;
      p.prevX = p.x;
      p.prevY = p.y;
    }

    this.isDrawing = true;
    this.drawAmount = Math.hypot(dx, dy);
  }

  release() {
    this.isDrawing = false;
    const tension = this.getTension();
    const draw = this.getDrawVector();
    this.drawAmount = 0;
    return {
      tension,
      vx: -draw.x * 0.18 * (0.5 + tension),
      vy: -draw.y * 0.08 * (0.5 + tension),
    };
  }

  resetString() {
    for (const p of this.stringParticles) {
      if (p.pinned) continue;
      p.x = p.restX;
      p.y = p.restY;
      p.prevX = p.restX;
      p.prevY = p.restY;
    }
    this.stringCenter.x = this.restCenterX;
    this.stringCenter.y = this.restCenterY;
    this.stringCenter.prevX = this.restCenterX;
    this.stringCenter.prevY = this.restCenterY;
  }

  isNearString(mx, my, threshold = 32) {
    const sc = this.stringCenter;
    return Math.hypot(mx - sc.x, my - sc.y) < threshold;
  }
}
