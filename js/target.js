import { MATERIALS } from './particle.js';

/**
 * 箭靶 — 横截面视角
 *
 * 靶面朝向弓箭（-X，面向左侧弓手），玩家看到的是靶体的纵向剖切面。
 * 剖面呈透镜形：中部厚、上下渐薄，可见草垛/木芯/靶环等材质分层。
 */
export class Target {
  constructor(system, x, groundY) {
    this.system = system;
    this.groundY = groundY;
    this.particles = [];
    this.constraints = [];
    this.hitParticles = new Set();

    this.faceX = x;
    this.thickness = 16;
    this.halfHeight = 52;
    this.centerY = groundY - 82;
    this.centerX = this.faceX + this.thickness * 0.45;

    this._build();
  }

  /** 根据剖面深度与高度选取材质（靶环在剖面中呈水平条带） */
  _materialAt(depthRatio, heightRatio) {
    const h = Math.abs(heightRatio);
    if (h < 0.12) return MATERIALS.TARGET_WOOD;
    if (h < 0.28) return MATERIALS.TARGET_RED;
    if (h < 0.45) return MATERIALS.STRAW;
    if (h < 0.62) return MATERIALS.TARGET_RED;
    if (h < 0.78) return MATERIALS.TARGET_WOOD;
    return MATERIALS.STRAW;
  }

  _depthColor(material, depthRatio) {
    const colors = material.colors;
    const idx = Math.min(colors.length - 1, Math.floor(depthRatio * colors.length));
    return colors[idx];
  }

  _build() {
    const postX = this.faceX + this.thickness + 4;

    for (let y = this.groundY; y > this.centerY; y -= 3) {
      const p = this.system.addParticle(postX, y, MATERIALS.TARGET_WOOD, {
        pinned: y >= this.groundY - 3,
        owner: 'target',
        color: MATERIALS.TARGET_WOOD.colors[1],
      });
      this.particles.push(p);
    }

    const step = 2;
    for (let dy = -this.halfHeight; dy <= this.halfHeight; dy += step) {
      const y = this.centerY + dy;
      const heightRatio = dy / this.halfHeight;
      const edge = Math.sqrt(Math.max(0, 1 - heightRatio * heightRatio));
      const maxDepth = this.thickness * edge;

      for (let dx = 0; dx <= maxDepth; dx += step * 0.5) {
        const x = this.faceX + dx;
        const depthRatio = maxDepth > 0 ? dx / maxDepth : 0;
        const material = this._materialAt(depthRatio, heightRatio);

        const p = this.system.addParticle(x, y, material, {
          owner: 'target',
          pinned: true,
          color: this._depthColor(material, depthRatio),
          radius: 1,
        });
        this.particles.push(p);
      }
    }

    this._addFaceOutline();
  }

  /** 靶面（迎箭面）轮廓粒子，强调朝向弓的一侧 */
  _addFaceOutline() {
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = -Math.PI / 2 + t * Math.PI;
      const dy = Math.sin(angle) * this.halfHeight;
      const y = this.centerY + dy;
      const heightRatio = dy / this.halfHeight;
      const edge = Math.sqrt(Math.max(0, 1 - heightRatio * heightRatio));
      if (edge < 0.05) continue;

      const p = this.system.addParticle(this.faceX, y, MATERIALS.TARGET_RED, {
        owner: 'target_face',
        pinned: true,
        color: '#AA2222',
      });
      this.particles.push(p);
    }
  }

  /** 箭尖是否进入靶体剖面体积 */
  _tipInside(tip) {
    if (tip.x < this.faceX - 2 || tip.x > this.faceX + this.thickness + 2) {
      return false;
    }
    const dy = tip.y - this.centerY;
    if (Math.abs(dy) > this.halfHeight) return false;
    const heightRatio = dy / this.halfHeight;
    const maxDepth = this.thickness * Math.sqrt(Math.max(0, 1 - heightRatio * heightRatio));
    return tip.x <= this.faceX + maxDepth + 3;
  }

  checkArrowHit(arrow) {
    if (arrow.state !== 'flying') return null;
    const tip = arrow.getTipPosition();
    if (!this._tipInside(tip)) return null;
    return this._calculateScore(tip);
  }

  _calculateScore(tip) {
    const h = Math.abs(tip.y - this.centerY) / this.halfHeight;
    if (h < 0.12) return 100;
    if (h < 0.28) return 80;
    if (h < 0.45) return 60;
    if (h < 0.62) return 40;
    if (h < 0.78) return 20;
    return 10;
  }

  onHit(arrow, score) {
    arrow.embed();
    const tip = arrow.getTipPosition();

    for (const p of this.particles) {
      const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
      if (dist < 14) {
        p.pinned = false;
        p.prevX = p.x + (Math.random() - 0.5) * 3;
        p.prevY = p.y + (Math.random() - 0.5) * 3;
        this.hitParticles.add(p);
      }
    }

    return score;
  }

  getAimPoint() {
    return { x: this.faceX, y: this.centerY };
  }
}
