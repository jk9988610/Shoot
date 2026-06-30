export class InputHandler {
  constructor(canvas, bow, game) {
    this.canvas = canvas;
    this.bow = bow;
    this.game = game;
    this.isDragging = false;
    this.mouseX = 0;
    this.mouseY = 0;

    this._bindEvents();
  }

  _getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  _bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this._onDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMove(e));
    window.addEventListener('mouseup', (e) => this._onUp(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._onDown(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._onMove(e);
    }, { passive: false });
    window.addEventListener('touchend', (e) => this._onUp(e));
  }

  _onDown(e) {
    const pos = this._getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.bow.isNearString(pos.x, pos.y)) {
      this.isDragging = true;
      this.game.onDrawStart();
    }
  }

  _onMove(e) {
    const pos = this._getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isDragging) {
      this.bow.pullString(pos.x, pos.y);
      this.game.onDrawing();
    }
  }

  _onUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.game.onRelease();
    }
  }

  getMousePos() {
    return { x: this.mouseX, y: this.mouseY };
  }
}
