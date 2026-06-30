export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.scale = 1;
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
    for (const p of particles) {
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

  drawCrossSectionLine(x, groundY, height) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, groundY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.font = '8px "Press Start 2P"';
    this.ctx.fillText('剖面', x + 4, 16);
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
      this.ctx.fillRect(x - 2 + i, y, 1, 4 + i);
    }
    this.ctx.fillStyle = '#4a4a5e';
    this.ctx.fillRect(x - 4, y + 4, 8, 3);
  }
}
