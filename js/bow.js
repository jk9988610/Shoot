import { MATERIALS } from './particle.js';
import { CUSTOM_BOW_DATA } from './custom-bow-data.js';

/**
 * 弓 — 横屏剖面视角，支持自定义绘制数据
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
    this.maxDraw = 70;
    this.isDrawing = false;
    this.drawAmount = 0;
    this.stringOffsetX = CUSTOM_BOW_DATA.stringOffsetX;

    this._build();
  }

  _build() {
    this._buildFromCustom();
  }

  _buildFromCustom() {
    const cx = this.x;
    const cy = this.groundY - 52;
    const data = CUSTOM_BOW_DATA;
    const placed = [];
    const map = new Map();

    for (const pt of data.particles) {
      const pinned = !!pt.pinned || (pt.dy >= 0 && pt.dx >= -2 && pt.dx <= 0);
      const p = this.system.addParticle(cx + pt.dx, cy + pt.dy, MATERIALS.WOOD, {
        pinned,
        owner: 'bow',
        color: pt.color,
        radius: 1.2,
      });
      placed.push({ p, dx: pt.dx, dy: pt.dy });
      map.set(`${pt.dx},${pt.dy}`, p);
      this.particles.push(p);
      if (pinned) this.gripParticles.push(p);
    }

    this._linkAdjacentParticles(placed, map);

    this.nockTop = map.get(`${data.nockTop.dx},${data.nockTop.dy}`)
      || this._createNock(cx + data.nockTop.dx, cy + data.nockTop.dy);
    this.nockBottom = map.get(`${data.nockBottom.dx},${data.nockBottom.dy}`)
      || this._createNock(cx + data.nockBottom.dx, cy + data.nockBottom.dy);

    this._buildString();
  }

  _createNock(x, y) {
    const p = this.system.addParticle(x, y, MATERIALS.WOOD, {
      pinned: true,
      owner: 'bow',
      color: MATERIALS.WOOD.colors[0],
      radius: 1.2,
    });
    this.particles.push(p);
    return p;
  }

  _linkAdjacentParticles(placed, map) {
    const offsets = [
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [2, 2], [-2, 2], [2, -2], [-2, -2],
    ];
    const linked = new Set();

    for (const { p, dx, dy } of placed) {
      for (const [ox, oy] of offsets) {
        const neighbor = map.get(`${dx + ox},${dy + oy}`);
        if (!neighbor) continue;
        const id = p.id < neighbor.id ? `${p.id}-${neighbor.id}` : `${neighbor.id}-${p.id}`;
        if (linked.has(id)) continue;
        linked.add(id);
        this.system.addConstraint(p, neighbor, { stiffness: 0.85, type: 'rigid' });
      }
    }
  }

  _buildString() {
    const stringX = this.nockTop.x + this.stringOffsetX;
    const stringCount = 14;

    for (let i = 0; i <= stringCount; i++) {
      const t = i / stringCount;
      const py = this.nockTop.y + (this.nockBottom.y - this.nockTop.y) * t;
      const pinned = i === 0 || i === stringCount;
      const p = this.system.addParticle(stringX, py, MATERIALS.STRING, {
        pinned,
        owner: 'bow_string',
        color: MATERIALS.STRING.colors[i % MATERIALS.STRING.colors.length],
      });
      this.stringParticles.push(p);

      if (i > 0) {
        this.system.addConstraint(this.stringParticles[i - 1], p, {
          stiffness: MATERIALS.STRING.stiffness,
          type: 'spring',
        });
      }
    }

    this.system.addConstraint(this.nockTop, this.stringParticles[0], {
      stiffness: 0.85,
      type: 'spring',
    });
    this.system.addConstraint(this.nockBottom, this.stringParticles[stringCount], {
      stiffness: 0.85,
      type: 'spring',
    });

    this.stringCenter = this.stringParticles[Math.floor(stringCount / 2)];
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
    dy = Math.max(-15, Math.min(15, dy));

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
    const stringX = this.restCenterX;
    for (let i = 0; i < this.stringParticles.length; i++) {
      const p = this.stringParticles[i];
      if (p.pinned) continue;
      const t = i / (this.stringParticles.length - 1);
      p.x = stringX;
      p.y = this.nockTop.y + (this.nockBottom.y - this.nockTop.y) * t;
      p.prevX = p.x;
      p.prevY = p.y;
    }
    this.stringCenter.x = stringX;
    this.stringCenter.y = this.restCenterY;
    this.stringCenter.prevX = stringX;
    this.stringCenter.prevY = this.restCenterY;
  }

  isNearString(mx, my, threshold = 22) {
    const sc = this.stringCenter;
    return Math.hypot(mx - sc.x, my - sc.y) < threshold;
  }
}
