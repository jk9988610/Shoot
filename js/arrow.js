import { MATERIALS } from './particle.js';

/**
 * 箭 — 棕色箭杆 + 灰色箭头 + 白色箭羽，全部由粒子构成
 */
export class Arrow {
  constructor(system, x, y) {
    this.system = system;
    this.particles = [];
    this.constraints = [];
    this.shaftParticles = [];
    this.headParticles = [];
    this.fletchingParticles = [];
    this.tip = null;
    this.tail = null;
    this.state = 'idle'; // idle | nocked | flying | embedded
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    this._build(x, y);
  }

  _build(x, y) {
    const shaftLen = 14;
    for (let i = 0; i < shaftLen; i++) {
      const p = this.system.addParticle(
        x - i * 2.5, y,
        MATERIALS.WOOD,
        { owner: 'arrow', pinned: true, color: MATERIALS.WOOD.colors[i % 2] }
      );
      this.shaftParticles.push(p);
      this.particles.push(p);
      if (i > 0) {
        const c = this.system.addConstraint(
          this.shaftParticles[i - 1], p,
          { stiffness: 0.95, type: 'rigid' }
        );
        this.constraints.push(c);
      }
    }

    // 箭头 — 灰色金属粒子
    const tipX = x + 3;
    for (let i = 0; i < 4; i++) {
      const p = this.system.addParticle(
        tipX + i * 1.5, y + (i < 2 ? -0.5 : 0.5) * (i % 2),
        MATERIALS.METAL,
        { owner: 'arrow', pinned: true }
      );
      this.headParticles.push(p);
      this.particles.push(p);
      this.system.addConstraint(this.shaftParticles[0], p,
        { stiffness: 0.9, type: 'rigid' });
    }

    // 箭羽 — 白色/米色羽毛粒子
    const tailX = x - (shaftLen - 1) * 2.5 - 2;
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 1.5;
      const p = this.system.addParticle(
        tailX, y + spread,
        MATERIALS.FEATHER,
        { owner: 'arrow', pinned: true }
      );
      this.fletchingParticles.push(p);
      this.particles.push(p);
      this.system.addConstraint(
        this.shaftParticles[shaftLen - 1], p,
        { stiffness: 0.5, type: 'spring' }
      );
    }

    this.tip = this.headParticles[0];
    this.tail = this.shaftParticles[shaftLen - 1];
    this.nockPoint = this.shaftParticles[Math.floor(shaftLen / 2)];
  }

  nockTo(x, y, angle) {
    this.state = 'nocked';
    this.angle = angle;
    this._setPosition(x, y, angle);
    for (const p of this.particles) {
      p.pinned = true;
    }
  }

  followNock(x, y, angle) {
    if (this.state !== 'nocked') return;
    this.angle = angle;
    this._setPosition(x, y, angle);
  }

  _setPosition(cx, cy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const allParts = [
      { parts: this.shaftParticles, start: 0, spacing: 2.5 },
      { parts: this.headParticles, start: 3, spacing: 1.5 },
      { parts: this.fletchingParticles, start: -(this.shaftParticles.length - 1) * 2.5 - 2, spacing: 0 },
    ];

    for (let i = 0; i < this.shaftParticles.length; i++) {
      const offset = i * 2.5;
      this.shaftParticles[i].x = cx - offset * cos;
      this.shaftParticles[i].y = cy - offset * sin;
      this.shaftParticles[i].prevX = this.shaftParticles[i].x;
      this.shaftParticles[i].prevY = this.shaftParticles[i].y;
    }

    for (let i = 0; i < this.headParticles.length; i++) {
      const offset = -3 - i * 1.5;
      this.headParticles[i].x = cx - offset * cos;
      this.headParticles[i].y = cy - offset * sin + (i < 2 ? -0.5 : 0.5) * (i % 2);
      this.headParticles[i].prevX = this.headParticles[i].x;
      this.headParticles[i].prevY = this.headParticles[i].y;
    }

    const tailBase = this.shaftParticles[this.shaftParticles.length - 1];
    for (let i = 0; i < this.fletchingParticles.length; i++) {
      const spread = (i - 2) * 1.5;
      this.fletchingParticles[i].x = tailBase.x - spread * sin;
      this.fletchingParticles[i].y = tailBase.y + spread * cos;
      this.fletchingParticles[i].prevX = this.fletchingParticles[i].x;
      this.fletchingParticles[i].prevY = this.fletchingParticles[i].y;
    }
  }

  launch(vx, vy) {
    this.state = 'flying';
    this.vx = vx;
    this.vy = vy;
    for (const p of this.particles) {
      p.pinned = false;
      p.prevX = p.x - vx;
      p.prevY = p.y - vy;
    }
  }

  update() {
    // 飞行状态由物理引擎 Verlet 积分驱动
  }

  embed() {
    this.state = 'embedded';
    for (const p of this.particles) {
      p.pinned = true;
    }
  }

  getTipPosition() {
    return { x: this.tip.x, y: this.tip.y };
  }

  reset(x, y) {
    this.state = 'idle';
    this.vx = 0;
    this.vy = 0;
    for (const p of this.particles) {
      p.pinned = true;
      p.active = true;
    }
    this._setPosition(x, y, 0);
  }
}
