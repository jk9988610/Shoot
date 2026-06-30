import { MATERIALS } from './particle.js';

/**
 * 箭靶 — 剖面视角可见的粒子靶体
 * 外层草垛 + 内层木芯 + 同心靶环
 */
export class Target {
  constructor(system, x, groundY) {
    this.system = system;
    this.x = x;
    this.groundY = groundY;
    this.particles = [];
    this.constraints = [];
    this.centerX = x;
    this.centerY = groundY - 80;
    this.radius = 55;
    this.hitParticles = new Set();

    this._build();
  }

  _build() {
    const cx = this.centerX;
    const cy = this.centerY;

    // 支撑柱 — 木质粒子
    for (let y = this.groundY; y > cy; y -= 3) {
      const p = this.system.addParticle(cx, y, MATERIALS.TARGET_WOOD, {
        pinned: y >= this.groundY - 3,
        owner: 'target',
      });
      this.particles.push(p);
    }

    // 靶体 — 同心圆粒子环
    const rings = [
      { r: 55, material: MATERIALS.STRAW, density: 3 },
      { r: 45, material: MATERIALS.TARGET_WOOD, density: 3 },
      { r: 35, material: MATERIALS.TARGET_RED, density: 2.5 },
      { r: 25, material: MATERIALS.STRAW, density: 2.5 },
      { r: 15, material: MATERIALS.TARGET_RED, density: 2 },
      { r: 8, material: MATERIALS.TARGET_WOOD, density: 2 },
    ];

    for (const ring of rings) {
      const count = Math.floor(ring.r * 0.8);
      const prevRing = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = cx + Math.cos(angle) * ring.r;
        const py = cy + Math.sin(angle) * ring.r;

        const p = this.system.addParticle(px, py, ring.material, {
          owner: 'target',
          pinned: true,
        });
        this.particles.push(p);
        prevRing.push(p);
      }

      // 环内填充粒子（剖面可见）
      const fillCount = Math.floor(ring.r * 0.4);
      for (let i = 0; i < fillCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * ring.r * 0.85;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;

        const p = this.system.addParticle(px, py, ring.material, {
          owner: 'target',
          pinned: true,
          color: ring.material.colors[Math.floor(Math.random() * ring.material.colors.length)],
        });
        this.particles.push(p);
      }

      for (let i = 0; i < prevRing.length; i++) {
        const c = this.system.addConstraint(
          prevRing[i], prevRing[(i + 1) % prevRing.length],
          { stiffness: 0.6, type: 'spring' }
        );
        this.constraints.push(c);
      }
    }
  }

  checkArrowHit(arrow) {
    if (arrow.state !== 'flying') return null;

    const tip = arrow.getTipPosition();
    let closest = null;
    let closestDist = Infinity;

    for (const p of this.particles) {
      if (!p.active || p.pinned === false) continue;
      const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
      if (dist < 8 && dist < closestDist) {
        closest = p;
        closestDist = dist;
      }
    }

    if (closest) {
      return this._calculateScore(tip);
    }
    return null;
  }

  _calculateScore(tip) {
    const dist = Math.hypot(tip.x - this.centerX, tip.y - this.centerY);
    if (dist < 8) return 100;
    if (dist < 15) return 80;
    if (dist < 25) return 60;
    if (dist < 35) return 40;
    if (dist < 45) return 20;
    return 10;
  }

  onHit(arrow, score) {
    arrow.embed();

    // 靶粒子脱落效果
    const tip = arrow.getTipPosition();
    for (const p of this.particles) {
      const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
      if (dist < 15) {
        p.pinned = false;
        p.prevX = p.x + (Math.random() - 0.5) * 2;
        p.prevY = p.y + (Math.random() - 0.5) * 2;
        this.hitParticles.add(p);
      }
    }

    return score;
  }
}
