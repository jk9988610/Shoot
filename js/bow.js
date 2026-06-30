import { MATERIALS } from './particle.js';

/**
 * 弓 — 由棕色木质粒子构成弓身，白色粒子构成弓弦
 * 固定握把于地面，弓臂呈弧形剖面排列
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
    this.maxDraw = 80;
    this.isDrawing = false;
    this.drawAmount = 0;

    this._build();
  }

  _build() {
    const cx = this.x;
    const cy = this.groundY - 50;
    const bowHeight = 100;
    const bowWidth = 30;

    // 握把 — 加粗棕色粒子簇，固定于地面
    for (let i = -3; i <= 3; i++) {
      for (let j = 0; j < 4; j++) {
        const p = this.system.addParticle(
          cx + i * 2,
          cy + j * 2,
          MATERIALS.WOOD,
          { pinned: j >= 2, owner: 'bow', radius: 1.5 }
        );
        this.gripParticles.push(p);
        this.particles.push(p);
      }
    }

    // 上弓臂 — 弧形棕色粒子
    const upperCount = 18;
    for (let i = 0; i < upperCount; i++) {
      const t = i / (upperCount - 1);
      const angle = -Math.PI / 2 - t * (Math.PI * 0.55);
      const px = cx + Math.cos(angle) * bowWidth * (0.5 + t * 0.8);
      const py = cy - Math.sin(angle) * bowHeight * 0.5 * (0.3 + t * 0.7);

      const p = this.system.addParticle(px, py, MATERIALS.WOOD, {
        pinned: i === 0,
        owner: 'bow',
        color: MATERIALS.WOOD.colors[i % MATERIALS.WOOD.colors.length],
      });
      this.limbParticles.upper.push(p);
      this.particles.push(p);

      if (i > 0) {
        this.system.addConstraint(
          this.limbParticles.upper[i - 1], p,
          { stiffness: 0.9, type: 'rigid' }
        );
      }
      if (i === 0) {
        this.system.addConstraint(
          this.gripParticles[3], p,
          { stiffness: 0.95, type: 'rigid' }
        );
      }
    }

    // 下弓臂
    const lowerCount = 18;
    for (let i = 0; i < lowerCount; i++) {
      const t = i / (lowerCount - 1);
      const angle = Math.PI / 2 + t * (Math.PI * 0.55);
      const px = cx + Math.cos(angle) * bowWidth * (0.5 + t * 0.8);
      const py = cy - Math.sin(angle) * bowHeight * 0.5 * (0.3 + t * 0.7);

      const p = this.system.addParticle(px, py, MATERIALS.WOOD, {
        pinned: i === 0,
        owner: 'bow',
        color: MATERIALS.WOOD.colors[i % MATERIALS.WOOD.colors.length],
      });
      this.limbParticles.lower.push(p);
      this.particles.push(p);

      if (i > 0) {
        this.system.addConstraint(
          this.limbParticles.lower[i - 1], p,
          { stiffness: 0.9, type: 'rigid' }
        );
      }
      if (i === 0) {
        this.system.addConstraint(
          this.gripParticles[9], p,
          { stiffness: 0.95, type: 'rigid' }
        );
      }
    }

    this.nockTop = this.limbParticles.upper[upperCount - 1];
    this.nockBottom = this.limbParticles.lower[lowerCount - 1];

    // 弓弦 — 白色粒子链
    const stringCount = 12;
    for (let i = 0; i <= stringCount; i++) {
      const t = i / stringCount;
      const px = this.nockTop.x + (this.nockBottom.x - this.nockTop.x) * t;
      const py = this.nockTop.y + (this.nockBottom.y - this.nockTop.y) * t;

      const pinned = i === 0 || i === stringCount;
      const p = this.system.addParticle(px, py, MATERIALS.STRING, {
        pinned,
        owner: 'bow_string',
        color: MATERIALS.STRING.colors[i % MATERIALS.STRING.colors.length],
      });
      this.stringParticles.push(p);

      if (i > 0) {
        this.system.addConstraint(
          this.stringParticles[i - 1], p,
          { stiffness: MATERIALS.STRING.stiffness, type: 'spring' }
        );
      }
    }

    // 弦端锚定到弓梢
    this.system.addConstraint(this.nockTop, this.stringParticles[0],
      { stiffness: 0.8, type: 'spring' });
    this.system.addConstraint(this.nockBottom, this.stringParticles[stringCount],
      { stiffness: 0.8, type: 'spring' });

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
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxDraw) {
      dx = (dx / dist) * this.maxDraw;
      dy = (dy / dist) * this.maxDraw;
    }

    this.stringCenter.x = cx + dx;
    this.stringCenter.y = cy + dy;
    this.stringCenter.prevX = this.stringCenter.x;
    this.stringCenter.prevY = this.stringCenter.y;

    // 传播到相邻弦粒子
    const centerIdx = Math.floor(this.stringParticles.length / 2);
    for (let i = 0; i < this.stringParticles.length; i++) {
      const p = this.stringParticles[i];
      if (p.pinned) continue;
      const t = Math.abs(i - centerIdx) / centerIdx;
      const falloff = 1 - t * 0.7;
      p.x = p.prevX + dx * falloff * 0.3;
      p.y = p.prevY + dy * falloff * 0.3;
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
      vx: -draw.x * 0.15 * (0.5 + tension),
      vy: -draw.y * 0.15 * (0.5 + tension),
    };
  }

  resetString() {
    for (const p of this.stringParticles) {
      if (p.pinned) continue;
      const idx = this.stringParticles.indexOf(p);
      const t = idx / (this.stringParticles.length - 1);
      p.x = this.nockTop.x + (this.nockBottom.x - this.nockTop.x) * t;
      p.y = this.nockTop.y + (this.nockBottom.y - this.nockTop.y) * t;
      p.prevX = p.x;
      p.prevY = p.y;
    }
  }

  isNearString(mx, my, threshold = 20) {
    const sc = this.stringCenter;
    return Math.hypot(mx - sc.x, my - sc.y) < threshold;
  }
}
