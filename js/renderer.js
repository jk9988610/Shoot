export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.pixelSize = 2;
    this.blockSize = 4;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#5BA3D9');
    skyGrad.addColorStop(0.6, '#87CEEB');
    skyGrad.addColorStop(1, '#B8D4E8');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  _blockSizeFor(p) {
    if (p.cellSize) return p.cellSize;
    if (p.owner === 'bow' || p.owner === 'bow_string' || p.owner === 'platform') {
      return this.blockSize;
    }
    return this.pixelSize;
  }

  drawBlockParticle(p) {
    const size = this._blockSizeFor(p);
    const gx = Math.floor(p.x / size) * size;
    const gy = Math.floor(p.y / size) * size;
    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(gx, gy, size, size);
  }

  drawParticles(particles) {
    const sorted = [...particles].sort((a, b) => {
      const layerOrder = {
        platform: -1,
        target: 0,
        target_face: 1,
        bow: 2,
        bow_string: 3,
        arrow: 4,
      };
      const la = layerOrder[a.owner] ?? 2;
      const lb = layerOrder[b.owner] ?? 2;
      return la - lb;
    });

    for (const p of sorted) {
      if (!p.active) continue;
      this.drawBlockParticle(p);
    }
  }

  /** 木质内聚键 — 弓身粒子间的粘性纤维视觉 */
  drawWoodBonds(constraints) {
    this.ctx.strokeStyle = 'rgba(45, 24, 12, 0.28)';
    this.ctx.lineWidth = 1;
    for (const c of constraints) {
      if (!c.p1.active || !c.p2.active) continue;
      if (c.p1.owner !== 'bow' || c.p2.owner !== 'bow') continue;
      if ((c.p1.material?.cohesion ?? 0) < 0.5) continue;
      if (c.restLength > (c.p1.cellSize ?? 4) * 1.6) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.floor(c.p1.x), Math.floor(c.p1.y));
      this.ctx.lineTo(Math.floor(c.p2.x), Math.floor(c.p2.y));
      this.ctx.stroke();
    }
  }

  drawCrossSectionMarker(x, groundY, label, side = 'right') {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, 8);
    this.ctx.lineTo(x, groundY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.font = '7px "Press Start 2P"';
    const tx = side === 'left' ? x - 52 : x + 4;
    this.ctx.fillText(label, tx, 18);
  }

  drawTargetFacing(faceX, centerY, halfHeight) {
    this.ctx.fillStyle = 'rgba(255, 200, 80, 0.5)';
    this.ctx.font = '6px "Press Start 2P"';
    this.ctx.fillText('←迎箭面', faceX - 4, centerY - halfHeight - 8);

    this.ctx.strokeStyle = 'rgba(255, 200, 80, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(faceX - 14, centerY);
    this.ctx.lineTo(faceX, centerY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(faceX - 10, centerY - 4);
    this.ctx.lineTo(faceX - 14, centerY);
    this.ctx.lineTo(faceX - 10, centerY + 4);
    this.ctx.stroke();
  }

  drawAimGuide(fromX, fromY, toX, toY, alpha = 0.3) {
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
}
