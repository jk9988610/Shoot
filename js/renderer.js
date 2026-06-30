export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.pixelSize = 2;
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

  drawGround(groundY) {
    this.ctx.fillStyle = '#3D6B2E';
    this.ctx.fillRect(0, groundY, this.width, this.height - groundY);

    this.ctx.fillStyle = '#4A7C38';
    for (let x = 0; x < this.width; x += 4) {
      const h = 2 + Math.sin(x * 0.1) * 1;
      this.ctx.fillRect(x, groundY - h, 3, h);
    }

    this.ctx.fillStyle = '#356025';
    this.ctx.fillRect(0, groundY, this.width, 3);
  }

  drawParticles(particles) {
    const sorted = [...particles].sort((a, b) => {
      const layerOrder = { target: 0, target_face: 1, bow: 2, bow_string: 3, arrow: 4 };
      const la = layerOrder[a.owner] ?? 2;
      const lb = layerOrder[b.owner] ?? 2;
      return la - lb;
    });

    for (const p of sorted) {
      if (!p.active) continue;
      this.ctx.fillStyle = p.color;
      const size = this.pixelSize;
      this.ctx.fillRect(
        Math.floor(p.x) - size / 2,
        Math.floor(p.y) - size / 2,
        size,
        size
      );
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
      if (c.restLength > 3.1) continue;
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

  drawBowAnchor(x, y) {
    this.ctx.fillStyle = '#2a2a3e';
    for (let i = 0; i < 5; i++) {
      this.ctx.fillRect(x - 2 + i, y, 1, 4 + i);
    }
    this.ctx.fillStyle = '#4a4a5e';
    this.ctx.fillRect(x - 5, y + 3, 10, 3);
  }
}
