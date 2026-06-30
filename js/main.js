import { ParticleSystem } from './particle.js';
import { PhysicsWorld } from './physics.js';
import { Renderer } from './renderer.js';
import { Bow } from './bow.js';
import { Arrow } from './arrow.js';
import { Target } from './target.js';
import { InputHandler } from './input.js';
import { VERSION, BUILD_LABEL } from './version.js';
import { debug, debugGroup, initDebugPanel, initPageGuards, logBoot } from './debug.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.physics = new PhysicsWorld(this.canvas.width, this.canvas.height);
    this.system = new ParticleSystem();

    const groundY = this.physics.groundY;
    const bowX = 180;

    this.bow = new Bow(this.system, bowX, groundY);
    this.target = new Target(this.system, 720, groundY);

    const sc = this.bow.getStringCenter();
    this.arrow = new Arrow(this.system, sc.x, sc.y);
    this.arrow.nockTo(sc.x, sc.y, 0);

    this.input = new InputHandler(this.canvas, this.bow, this);
    this.score = 0;
    this.state = 'ready'; // ready | drawing | flying | resetting
    this.resetTimer = 0;
    this.scorePopupTimer = 0;
    this._frame = 0;

    this._bindUI();
    this._logInit();
    this._loop();
  }

  _setState(next, detail = {}) {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    debug('state', `${prev} → ${next}`, detail);
  }

  _logInit() {
    logBoot();
    debugGroup('初始化', () => {
      debug('init', `画布 ${this.canvas.width}×${this.canvas.height}`);
      debug('init', `地面 Y=${this.physics.groundY}`);
      debug('init', `弓位置 x=${this.bow.x}, 弦心`, this.bow.getStringCenter());
      debug('init', `靶迎箭面 faceX=${this.target.faceX}, 中心`, {
        x: this.target.centerX,
        y: this.target.centerY,
      });
      debug('init', `粒子总数 ${this.system.particles.length}`);
    });
  }

  _bindUI() {
    this.ui = {
      tension: document.getElementById('tension-value'),
      tensionBar: document.getElementById('tension-bar'),
      score: document.getElementById('score-value'),
      arrowCount: document.getElementById('arrow-count'),
      scorePopup: document.getElementById('score-popup'),
      version: document.getElementById('version-badge'),
    };
    if (this.ui.version) {
      this.ui.version.textContent = `v${VERSION}`;
    }
  }

  onDrawStart() {
    if (this.state !== 'ready') return;
    this._setState('drawing');
    const sc = this.bow.getStringCenter();
    const aim = this.target.getAimPoint();
    const angle = Math.atan2(aim.y - sc.y, aim.x - sc.x);
    this.arrow.nockTo(sc.x, sc.y, angle);
    debug('input', '开始拉弓', { string: { x: sc.x, y: sc.y }, aim, angle: angle.toFixed(3) });
  }

  onDrawing() {
    if (this.state !== 'drawing') return;

    const sc = this.bow.getStringCenter();
    const aim = this.target.getAimPoint();
    const angle = Math.atan2(aim.y - sc.y, aim.x - sc.x);
    this.arrow.followNock(sc.x, sc.y, angle);

    const tension = this.bow.getTension();
    this.ui.tension.textContent = `${Math.round(tension * 100)}%`;
    this.ui.tensionBar.style.width = `${tension * 100}%`;
  }

  onRelease() {
    if (this.state !== 'drawing') return;

    const sc = this.bow.getStringCenter();
    const aim = this.target.getAimPoint();
    const angle = Math.atan2(aim.y - sc.y, aim.x - sc.x);
    const launch = this.bow.release();

    const speed = 8 + launch.tension * 18;
    const vx = Math.cos(angle) * speed + launch.vx;
    const vy = Math.sin(angle) * speed + launch.vy;

    this.arrow.launch(vx, vy);
    this._setState('flying');

    debug('launch', '射箭', {
      tension: launch.tension.toFixed(2),
      speed: speed.toFixed(2),
      velocity: { vx: vx.toFixed(2), vy: vy.toFixed(2) },
      angle: angle.toFixed(3),
    });

    this.ui.tension.textContent = '0%';
    this.ui.tensionBar.style.width = '0%';
  }

  _showScorePopup(score) {
    this.ui.scorePopup.textContent = `+${score}`;
    this.ui.scorePopup.classList.add('show');
    this.scorePopupTimer = 120;
  }

  _update() {
    if (this.state === 'flying') {
      this.arrow.update();

      const hitScore = this.target.checkArrowHit(this.arrow);
      if (hitScore !== null) {
        const finalScore = this.target.onHit(this.arrow, hitScore);
        this.score += finalScore;
        this.ui.score.textContent = this.score;
        this._showScorePopup(finalScore);
        this._setState('resetting', { reason: 'hit', score: finalScore });
        this.resetTimer = 90;
        debug('hit', `命中 +${finalScore}`, {
          tip: this.arrow.getTipPosition(),
          totalScore: this.score,
        });
      }

      const tip = this.arrow.getTipPosition();
      if (
        tip.x > this.canvas.width + 50 ||
        tip.y > this.physics.groundY ||
        tip.x < -50
      ) {
        this._setState('resetting', { reason: 'miss' });
        this.resetTimer = 60;
        debug('miss', '箭矢脱靶', { tip });
      }
    }

    if (this.state === 'resetting') {
      this.resetTimer--;
      if (this.resetTimer <= 0) {
        this._resetRound();
      }
    }

    if (this.scorePopupTimer > 0) {
      this.scorePopupTimer--;
      if (this.scorePopupTimer <= 0) {
        this.ui.scorePopup.classList.remove('show');
      }
    }

    this.physics.step(this.system);
  }

  _resetRound() {
    this.bow.resetString();
    const sc = this.bow.getStringCenter();
    this.arrow.reset(sc.x, sc.y);
    this.arrow.nockTo(sc.x, sc.y, 0);
    this._setState('ready');
    debug('reset', '回合重置', { string: { x: sc.x, y: sc.y } });
  }

  _render() {
    const r = this.renderer;
    r.clear();
    r.drawGround(this.physics.groundY);

    r.drawCrossSectionMarker(this.bow.x, this.physics.groundY, '弓剖面', 'right');
    r.drawCrossSectionMarker(this.target.faceX, this.physics.groundY, '靶剖面', 'right');
    r.drawTargetFacing(this.target.faceX, this.target.centerY, this.target.halfHeight);

    r.drawBowAnchor(this.bow.x, this.physics.groundY);

    if (this.state === 'drawing') {
      const sc = this.bow.getStringCenter();
      const aim = this.target.getAimPoint();
      r.drawAimGuide(sc.x, sc.y, aim.x, aim.y, 0.25);
    }

    r.drawParticles(this.system.getActiveParticles());
  }

  _loop() {
    this._frame++;
    this._update();
    this._render();

    if (this._frame % 300 === 0) {
      debug('tick', `frame=${this._frame}`, {
        state: this.state,
        particles: this.system.getActiveParticles().length,
        score: this.score,
      });
    }

    requestAnimationFrame(() => this._loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initPageGuards();
  initDebugPanel();
  new Game();
});
