import { Constraint } from './particle.js';

export class PhysicsWorld {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.gravity = 0.15;
    this.damping = 0.998;
    this.groundY = height - 60;
    this.substeps = 4;
  }

  step(system) {
    const dt = 1 / this.substeps;

    for (let s = 0; s < this.substeps; s++) {
      this._integrate(system, dt);
      this._solveConstraints(system);
      this._solveCohesion(system);
      this._handleBoundaries(system);
    }
  }

  _materialCohesion(p) {
    return p.material?.cohesion ?? 0;
  }

  _integrate(system, dt) {
    for (const p of system.getActiveParticles()) {
      if (p.pinned) continue;

      const vx = (p.x - p.prevX) * this.damping;
      const vy = (p.y - p.prevY) * this.damping;
      const cohesion = this._materialCohesion(p);
      const gravScale = p.material?.granular ? 1 : Math.max(0, 1 - cohesion);

      p.prevX = p.x;
      p.prevY = p.y;
      p.x += vx;
      p.y += vy + this.gravity * dt * gravScale;
      p.vx = vx;
      p.vy = vy;
    }
  }

  _solveConstraints(system) {
    const stiffIters = 4;
    const softIters = 2;

    for (let iter = 0; iter < stiffIters; iter++) {
      for (const c of system.constraints) {
        if (!c.p1.active || !c.p2.active) continue;
        if (c.stiffness < 0.9) continue;
        this._solveConstraint(c);
      }
    }

    for (let iter = 0; iter < softIters; iter++) {
      for (const c of system.constraints) {
        if (!c.p1.active || !c.p2.active) continue;
        if (c.stiffness >= 0.9) continue;
        this._solveConstraint(c);
      }
    }
  }

  _solveConstraint(c) {
    const dx = c.p2.x - c.p1.x;
    const dy = c.p2.y - c.p1.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const diff = (dist - c.restLength) / dist;
    const offset = diff * c.stiffness;

    const ox = dx * offset;
    const oy = dy * offset;

    if (c.type === 'rigid') {
      if (!c.p1.pinned && !c.p2.pinned) {
        c.p1.x += ox * 0.5;
        c.p1.y += oy * 0.5;
        c.p2.x -= ox * 0.5;
        c.p2.y -= oy * 0.5;
      } else if (c.p1.pinned) {
        c.p2.x -= ox;
        c.p2.y -= oy;
      } else {
        c.p1.x += ox;
        c.p1.y += oy;
      }
    } else {
      if (!c.p1.pinned) {
        c.p1.x += ox * 0.5;
        c.p1.y += oy * 0.5;
      }
      if (!c.p2.pinned) {
        c.p2.x -= ox * 0.5;
        c.p2.y -= oy * 0.5;
      }
    }
  }

  /** 内聚材质回归静止形态 — 木质粘性，非颗粒散落 */
  _solveCohesion(system) {
    for (const p of system.getActiveParticles()) {
      if (p.pinned || p.restX === null || p.restY === null) continue;

      const cohesion = this._materialCohesion(p);
      if (cohesion <= 0) continue;

      const pull = cohesion * 0.38;
      p.x += (p.restX - p.x) * pull;
      p.y += (p.restY - p.y) * pull;
      p.prevX += (p.restX - p.prevX) * pull * 0.5;
      p.prevY += (p.restY - p.prevY) * pull * 0.5;
    }
  }

  _handleBoundaries(system) {
    for (const p of system.getActiveParticles()) {
      if (p.pinned) continue;

      if (p.x < p.radius) {
        p.x = p.radius;
        p.prevX = p.x;
      }
      if (p.x > this.width - p.radius) {
        p.x = this.width - p.radius;
        p.prevX = p.x;
      }
      if (p.y > this.groundY - p.radius) {
        p.y = this.groundY - p.radius;
        const vy = p.y - p.prevY;
        p.prevY = p.y + vy * 0.3;
        p.vy *= -0.2;
      }
    }
  }

  checkCollision(p1, p2, threshold = 3) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.hypot(dx, dy) < threshold;
  }
}
