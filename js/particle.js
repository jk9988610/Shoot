/** 材质定义 — 世界中所有物品的基础粒子属性 */
export const MATERIALS = {
  WOOD: {
    name: 'wood',
    colors: ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'],
    stiffness: 0.95,
    density: 1.0,
    cohesion: 0.92,
    granular: false,
  },
  STRING: {
    name: 'string',
    colors: ['#FFFFFF', '#F0F0F0', '#E8E8E8', '#D8D8D8'],
    stiffness: 0.3,
    density: 0.2,
    cohesion: 0.2,
    granular: false,
  },
  METAL: {
    name: 'metal',
    colors: ['#888888', '#AAAAAA', '#999999', '#BBBBBB'],
    stiffness: 0.99,
    density: 2.5,
    cohesion: 0.98,
    granular: false,
  },
  FEATHER: {
    name: 'feather',
    colors: ['#F5F5DC', '#FFF8DC', '#FAF0E6', '#FFFAF0'],
    stiffness: 0.1,
    density: 0.15,
    cohesion: 0.15,
    granular: false,
  },
  STRAW: {
    name: 'straw',
    colors: ['#C4A35A', '#D4B86A', '#B89B4A', '#DAA520'],
    stiffness: 0.4,
    density: 0.5,
    cohesion: 0.12,
    granular: true,
  },
  TARGET_WOOD: {
    name: 'target_wood',
    colors: ['#5C3A1E', '#6B4226', '#4A2C17', '#7A4F2E'],
    stiffness: 0.6,
    density: 0.8,
    cohesion: 0.35,
    granular: false,
  },
  TARGET_RED: {
    name: 'target_red',
    colors: ['#CC2222', '#DD3333', '#BB1111', '#EE4444'],
    stiffness: 0.5,
    density: 0.6,
    cohesion: 0.2,
    granular: true,
  },
  GROUND: {
    name: 'ground',
    colors: ['#3D6B2E', '#4A7C38', '#356025', '#528C3E'],
    stiffness: 1.0,
    density: 2.0,
    cohesion: 1.0,
    granular: false,
  },
};

let _nextId = 0;

export class Particle {
  constructor(x, y, material, options = {}) {
    this.id = _nextId++;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.material = material;
    this.color = options.color || material.colors[Math.floor(Math.random() * material.colors.length)];
    this.pinned = options.pinned || false;
    this.mass = options.mass ?? material.density;
    this.radius = options.radius ?? 1;
    this.owner = options.owner || null;
    this.active = true;
    this.vx = 0;
    this.vy = 0;
    this.restX = options.restX ?? null;
    this.restY = options.restY ?? null;
    this.cellSize = options.cellSize ?? null;
  }

  pin(x, y) {
    this.pinned = true;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }

  unpin() {
    this.pinned = false;
  }
}

export class Constraint {
  constructor(p1, p2, options = {}) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLength = options.restLength ?? Math.hypot(p2.x - p1.x, p2.y - p1.y);
    this.stiffness = options.stiffness ?? 0.5;
    this.type = options.type || 'spring';
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.constraints = [];
  }

  addParticle(x, y, material, options = {}) {
    const p = new Particle(x, y, material, options);
    this.particles.push(p);
    return p;
  }

  addConstraint(p1, p2, options = {}) {
    const c = new Constraint(p1, p2, options);
    this.constraints.push(c);
    return c;
  }

  getActiveParticles() {
    return this.particles.filter(p => p.active);
  }

  removeParticle(p) {
    p.active = false;
    this.constraints = this.constraints.filter(c => c.p1 !== p && c.p2 !== p);
  }
}
