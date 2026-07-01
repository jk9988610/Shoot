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
    if (p.owner === 'bow' || p.owner === 'bow_string' || p.owner === 'platform'
      || p.owner === 'target' || p.owner === 'target_face') {
      return this.blockSize;
    }
    return this.pixelSize;
  }

  drawBlockParticle(p) {
    const size = this._blockSizeFor(p);
    const x = p.cellSize ? p.x : Math.floor(p.x / size) * size;
    const y = p.cellSize ? p.y : Math.floor(p.y / size) * size;
    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(x, y, size, size);
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

  /** @deprecated 已弃用 — 统一格填充，不再叠绘纤维线 */
  drawWoodBonds(_constraints) {}

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
