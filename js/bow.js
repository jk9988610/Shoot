import { MATERIALS } from './particle.js';

/**
 * 弓 — 横屏剖面视角
 *
 * 侧视可见木质弓臂截面：年轮状棕色粒子层沿弧向排列。
 * 弓弦（白色粒子）位于弓腹侧（背向靶标、朝向射手）。
 * 握把固定于地面。
 */
export class Bow {
  constructor(system, x, groundY) {
    this.system = system;
    this.x = x;
    this.groundY = groundY;
    this.particles = [];
    this.stringParticles = [];
    this.limbParticles = { upper: [], lower: [] };
    this.gripParticles = [];
    this.nockTop = null;
    this.nockBottom = null;
    this.stringCenter = null;
    this.maxDraw = 70;
    this.isDrawing = false;
    this.drawAmount = 0;
    this.stringOffsetX = -16;

    this._build();
  }

  _woodColor(layer, offset = 0) {
    const colors = MATERIALS.WOOD.colors;
    return colors[(layer + offset) % colors.length];
  }

  /** 在法线方向铺设木质年轮截面粒子 */
  _placeWoodGrain(cx, cy, nx, ny, layers, options = {}) {
    const placed = [];
    const half = (layers - 1) / 2;
    for (let i = 0; i < layers; i++) {
      const t = i - half;
      const px = cx + nx * t * 2;
      const py = cy + ny * t * 2;
      const p = this.system.addParticle(px, py, MATERIALS.WOOD, {
        pinned: options.pinned || false,
        owner: 'bow',
        color: this._woodColor(i, options.colorOffset || 0),
        radius: 1.2,
      });
      placed.push(p);
      this.particles.push(p);

      if (i > 0) {
        this.system.addConstraint(placed[i - 1], p, {
          stiffness: 0.92,
          type: 'rigid',
        });
      }
    }
    return placed;
  }

  _sampleLimb(x0, y0, cx, cy, x1, y1, segments) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      points.push({ x: px, y: py, t });
    }
    return points;
  }

  _buildGrip(cx, cy) {
    const w = 4;
    const h = 9;
    for (let row = 0; row < h; row++) {
      const rowParticles = [];
      for (let col = 0; col < w; col++) {
        const px = cx - (w - 1) + col * 2;
        const py = cy - (h - 1) * 1.5 + row * 3;
        const pinned = row >= h - 2;
        const p = this.system.addParticle(px, py, MATERIALS.WOOD, {
          pinned,
          owner: 'bow',
          color: this._woodColor(Math.min(col, row), row),
          radius: 1.5,
        });
        rowParticles.push(p);
        this.gripParticles.push(p);
        this.particles.push(p);
      }
      for (let col = 0; col < w - 1; col++) {
        this.system.addConstraint(rowParticles[col], rowParticles[col + 1], {
          stiffness: 0.98,
          type: 'rigid',
        });
      }
    }
  }

  _buildLimb(side, x0, y0, ctrlX, ctrlY, x1, y1) {
    const segments = 16;
    const layers = 5;
    const points = this._sampleLimb(x0, y0, ctrlX, ctrlY, x1, y1, segments);
    const limbList = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      let tx, ty;
      if (i === 0) {
        tx = points[1].x - pt.x;
        ty = points[1].y - pt.y;
      } else if (i === points.length - 1) {
        tx = pt.x - points[i - 1].x;
        ty = pt.y - points[i - 1].y;
      } else {
        tx = points[i + 1].x - points[i - 1].x;
        ty = points[i + 1].y - points[i - 1].y;
      }
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const nx = -ty;
      const ny = tx;

      const pinned = i === 0;
      const grain = this._placeWoodGrain(pt.x, pt.y, nx, ny, layers, {
        pinned,
        colorOffset: i,
      });
      const spine = grain[Math.floor(layers / 2)];
      limbList.push(spine);

      if (i > 0) {
        this.system.addConstraint(limbList[i - 1], spine, {
          stiffness: 0.9,
          type: 'rigid',
        });
      }
    }

    this.limbParticles[side] = limbList;
    return limbList;
  }

  _build() {
    const cx = this.x;
    const cy = this.groundY - 52;

    this._buildGrip(cx, cy);

    const gripTop = this.gripParticles[6];
    const gripBot = this.gripParticles[this.gripParticles.length - 3];

    const upperLimb = this._buildLimb(
      'upper',
      gripTop.x, gripTop.y - 2,
      cx + 42, cy - 58,
      cx + 30, cy - 108
    );

    const lowerLimb = this._buildLimb(
      'lower',
      gripBot.x, gripBot.y + 2,
      cx + 38, cy + 22,
      cx + 26, this.groundY - 8
    );

    this.nockTop = upperLimb[upperLimb.length - 1];
    this.nockBottom = lowerLimb[lowerLimb.length - 1];

    if (gripTop) {
      this.system.addConstraint(gripTop, upperLimb[0], { stiffness: 0.96, type: 'rigid' });
    }
    if (gripBot) {
      this.system.addConstraint(gripBot, lowerLimb[0], { stiffness: 0.96, type: 'rigid' });
    }

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
