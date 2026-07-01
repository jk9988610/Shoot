import { MATERIALS } from './particle.js';
import { CELL_SIZE } from './editor/apply.js';

/**
 * 箭靶剖面网格 — 透镜形纵剖
 *
 * 剖面理解：
 * - 玩家看的是靶体沿竖直方向切开的剖面（非正面圆盘）
 * - 迎箭面在 -X（左侧），箭从弓飞来撞击左缘
 * - 中部最厚（草垛压实），上下渐薄呈透镜形
 * - 靶环在剖面中表现为水平条带（红心/红环/草色/木芯）
 * - 深度方向 +X：迎箭面皮 → 草填层 → 木芯 → 背板
 */
export function buildTargetCrossSectionGrid(options = {}) {
  const {
    halfHeightCells = 26,
    maxThicknessCells = 9,
    postWidthCells = 2,
  } = options;

  const cellMap = new Map();

  function setCell(dx, dy, color, owner) {
    cellMap.set(`${dx},${dy}`, { dx, dy, color, owner });
  }

  function lensDepthAt(gy) {
    const t = gy / halfHeightCells;
    if (Math.abs(t) > 1) return 0;
    return maxThicknessCells * Math.sqrt(Math.max(0, 1 - t * t));
  }

  /** 剖面高度 → 靶环带（水平条带） */
  function ringAtHeight(gy) {
    const h = Math.abs(gy / halfHeightCells);
    if (h < 0.1) return 'heart';
    if (h < 0.24) return 'red';
    if (h < 0.42) return 'straw';
    if (h < 0.58) return 'red';
    if (h < 0.76) return 'wood';
    return 'straw';
  }

  /** 剖面深度 → 材质层（由迎箭面向背板） */
  function layerAtDepth(depthRatio, ring) {
    if (depthRatio < 0.12) {
      if (ring === 'heart' || ring === 'red') return 'face_red';
      return 'face_straw';
    }
    if (depthRatio < 0.55) return 'straw';
    if (depthRatio < 0.88) return 'wood';
    return 'back';
  }

  function colorFor(layer, ring, gx, gy) {
    switch (layer) {
      case 'face_red':
        return ring === 'heart' ? '#AA2222' : '#CC3333';
      case 'face_straw':
        return '#C4A35A';
      case 'straw':
        return (gy + gx) % 2 === 0 ? '#D4B86A' : '#C4A35A';
      case 'wood':
        return (Math.abs(gy) + Math.floor(gx / 2)) % 2 === 0 ? '#5C3A1E' : '#6B4226';
      case 'back':
        return '#4A2C17';
      default:
        return '#8B4513';
    }
  }

  for (let gy = -halfHeightCells; gy <= halfHeightCells; gy++) {
    const maxD = lensDepthAt(gy);
    if (maxD < 0.5) continue;
    const depthLimit = Math.ceil(maxD);
    const ring = ringAtHeight(gy);

    for (let dx = 0; dx < depthLimit; dx++) {
      const depthRatio = depthLimit > 0 ? dx / depthLimit : 0;
      const layer = layerAtDepth(depthRatio, ring);
      setCell(dx, gy, colorFor(layer, ring, dx, gy), dx === 0 ? 'target_face' : 'target');
    }
  }

  // 背板立柱（剖面最右侧）
  for (let gy = -halfHeightCells; gy <= halfHeightCells; gy++) {
    const maxD = lensDepthAt(gy);
    if (maxD < 1) continue;
    const postDx = Math.ceil(maxD) + 1;
    for (let i = 0; i < postWidthCells; i++) {
      setCell(postDx + i, gy, i === 0 ? '#4A2C17' : '#3D2814', 'target');
    }
  }

  // 迎箭面轮廓强调（左缘）
  for (let gy = -halfHeightCells; gy <= halfHeightCells; gy++) {
    if (lensDepthAt(gy) < 0.5) continue;
    setCell(0, gy, '#991111', 'target_face');
  }

  return {
    cells: [...cellMap.values()],
    halfHeightCells,
    maxThicknessCells,
    cellSize: CELL_SIZE,
  };
}

export function spawnTargetParticles(system, faceX, centerY, grid) {
  const cs = grid.cellSize;
  const particles = [];

  for (const c of grid.cells) {
    const px = faceX + c.dx * cs;
    const py = centerY + c.dy * cs;
    const material = c.owner === 'target_face' ? MATERIALS.TARGET_RED : MATERIALS.STRAW;
    const p = system.addParticle(px, py, material, {
      owner: c.owner,
      pinned: true,
      color: c.color,
      cellSize: cs,
    });
    particles.push(p);
  }

  return particles;
}
