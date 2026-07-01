import { MATERIALS } from './particle.js';
import { CELL_SIZE } from './editor/apply.js';

/**
 * 平台 — 色块粒子搭建的地面与弓座
 */
export class Platform {
  constructor(system, groundY, width, options = {}) {
    this.system = system;
    this.particles = [];
    this.cellSize = options.cellSize ?? CELL_SIZE;
    this.groundY = groundY;
    this._build(width, options.bowX ?? 160);
  }

  _addBlock(x, y, color) {
    const cs = this.cellSize;
    const p = this.system.addParticle(x, y, MATERIALS.GROUND, {
      owner: 'platform',
      pinned: true,
      color,
      cellSize: cs,
    });
    this.particles.push(p);
    return p;
  }

  _build(width, bowX) {
    const cs = this.cellSize;
    const colors = MATERIALS.GROUND.colors;
    const cols = Math.ceil(width / cs);
    const surfaceY = Math.floor(this.groundY / cs) * cs - cs;

    for (let layer = 0; layer < 3; layer++) {
      const y = surfaceY + layer * cs;
      for (let col = 0; col < cols; col++) {
        const x = col * cs;
        this._addBlock(x, y, colors[(col + layer) % colors.length]);
      }
    }

    const pedestalY = surfaceY - cs;
    const pedCols = 5;
    const startCol = Math.floor((bowX - (pedCols * cs) / 2) / cs);
    for (let i = 0; i < pedCols; i++) {
      const x = (startCol + i) * cs;
      if (x < 0) continue;
      this._addBlock(x, pedestalY, '#4a4a5e');
    }
  }
}
