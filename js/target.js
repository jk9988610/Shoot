import { CELL_SIZE } from './editor/apply.js';
import { buildTargetCrossSectionGrid, spawnTargetParticles } from './target-cross-section.js';

/**
 * 箭靶 — 透镜形纵剖面（格对齐色块）
 *
 * 靶面朝向弓箭（-X），玩家见靶体竖切剖面：迎箭面 → 草填层 → 木芯 → 背板。
 */
export class Target {
  constructor(system, x, groundY) {
    this.system = system;
    this.groundY = groundY;
    this.particles = [];
    this.hitParticles = new Set();
    this.cellSize = CELL_SIZE;

    this.faceX = x;
    this.centerY = groundY - 100;
    this.grid = buildTargetCrossSectionGrid({
      halfHeightCells: 26,
      maxThicknessCells: 9,
      postWidthCells: 2,
    });
    this.halfHeight = this.grid.halfHeightCells * this.cellSize;
    this.thickness = this.grid.maxThicknessCells * this.cellSize;
    this.centerX = this.faceX + this.thickness * 0.45;

    this._build(system);
  }

  _build(system) {
    this.particles = spawnTargetParticles(system, this.faceX, this.centerY, this.grid);
  }

  _heightRatio(tipY) {
    return (tipY - this.centerY) / this.halfHeight;
  }

  _maxDepthAtHeight(tipY) {
    const t = this._heightRatio(tipY);
    if (Math.abs(t) > 1) return 0;
    return this.thickness * Math.sqrt(Math.max(0, 1 - t * t));
  }

  _tipInside(tip) {
    if (tip.x < this.faceX - this.cellSize || tip.x > this.faceX + this.thickness + this.cellSize * 3) {
      return false;
    }
    const dy = tip.y - this.centerY;
    if (Math.abs(dy) > this.halfHeight + this.cellSize) return false;
    return tip.x <= this.faceX + this._maxDepthAtHeight(tip.y) + this.cellSize;
  }

  checkArrowHit(arrow) {
    if (arrow.state !== 'flying') return null;
    const tip = arrow.getTipPosition();
    if (!this._tipInside(tip)) return null;
    return this._calculateScore(tip);
  }

  _calculateScore(tip) {
    const h = Math.abs(this._heightRatio(tip.y));
    if (h < 0.1) return 100;
    if (h < 0.24) return 80;
    if (h < 0.42) return 60;
    if (h < 0.58) return 40;
    if (h < 0.76) return 20;
    return 10;
  }

  onHit(arrow, score) {
    arrow.embed();
    const tip = arrow.getTipPosition();

    for (const p of this.particles) {
      const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
      if (dist < this.cellSize * 3.5) {
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
