/**
 * 应用层 — 网格数据 ↔ 游戏 CUSTOM_BOW_DATA 转换（模拟逻辑）
 */
import { GridModel } from './grid-model.js';

export const CELL_SIZE = 4;

function cellToParticle(c, anchor) {
  return {
    dx: (c.gx - anchor.gx) * CELL_SIZE,
    dy: (c.gy - anchor.gy) * CELL_SIZE,
    color: c.color,
    ...(c.pinned ? { pinned: true } : {}),
  };
}

/** dx/dy = 格子左上角相对锚点格 (0,0) 的像素偏移 */

/** 绘制网格 → 游戏粒子数据 */
export function toApplyData(model) {
  const { anchor } = model;
  const particles = [];
  const stringParticles = [];

  for (const c of [...model.cells.values()].sort((a, b) => a.gy - b.gy || a.gx - b.gx)) {
    const pt = cellToParticle(c, anchor);
    if (c.kind === 'string') stringParticles.push(pt);
    else particles.push(pt);
  }

  const nockTop = model.nockTop
    ? { dx: (model.nockTop.gx - anchor.gx) * CELL_SIZE, dy: (model.nockTop.gy - anchor.gy) * CELL_SIZE }
    : null;
  const nockBottom = model.nockBottom
    ? { dx: (model.nockBottom.gx - anchor.gx) * CELL_SIZE, dy: (model.nockBottom.gy - anchor.gy) * CELL_SIZE }
    : null;

  let stringOffsetX = 0;
  if (model.stringGx !== null && model.nockTop) {
    stringOffsetX = (model.stringGx - model.nockTop.gx) * CELL_SIZE;
  }

  return {
    version: 4,
    cellSize: CELL_SIZE,
    stringOffsetX,
    nockTop,
    nockBottom,
    particles,
    stringParticles,
  };
}

/** 游戏粒子数据 → 绘制网格 */
export function fromApplyData(data) {
  const cell = data.cellSize ?? CELL_SIZE;
  const model = new GridModel();

  for (const p of data.particles) {
    const gx = Math.round(p.dx / cell);
    const gy = Math.round(p.dy / cell);
    model.setCell(gx, gy, { color: p.color, pinned: !!p.pinned, kind: 'body' });
  }

  for (const p of data.stringParticles ?? []) {
    const gx = Math.round(p.dx / cell);
    const gy = Math.round(p.dy / cell);
    model.setCell(gx, gy, { color: p.color, pinned: !!p.pinned, kind: 'string' });
  }

  if (data.nockTop) {
    model.nockTop = {
      gx: Math.round(data.nockTop.dx / cell),
      gy: Math.round(data.nockTop.dy / cell),
    };
  }
  if (data.nockBottom) {
    model.nockBottom = {
      gx: Math.round(data.nockBottom.dx / cell),
      gy: Math.round(data.nockBottom.dy / cell),
    };
  }
  if (data.nockTop && data.stringOffsetX !== undefined) {
    model.stringGx = model.nockTop.gx + Math.round(data.stringOffsetX / cell);
  }

  return model;
}

export function generateExportCode(model) {
  const data = toApplyData(model);
  const bodyLines = data.particles.map((p) => {
    const pin = p.pinned ? ', pinned: true' : '';
    return `    { dx: ${p.dx}, dy: ${p.dy}, color: '${p.color}'${pin} },`;
  });
  const stringLines = data.stringParticles.map((p) => {
    const pin = p.pinned ? ', pinned: true' : '';
    return `    { dx: ${p.dx}, dy: ${p.dy}, color: '${p.color}'${pin} },`;
  });

  const nockTopStr = data.nockTop
    ? `{ dx: ${data.nockTop.dx}, dy: ${data.nockTop.dy} }`
    : 'null';
  const nockBottomStr = data.nockBottom
    ? `{ dx: ${data.nockBottom.dx}, dy: ${data.nockBottom.dy} }`
    : 'null';

  return `/**
 * 自定义弓身数据
 * 网格系统 · 1格=1粒子 · 实心色块 · ${CELL_SIZE}px/格
 * 弓身 + 弓弦分色块导出
 */
export const CUSTOM_BOW_DATA = {
  version: 4,
  cellSize: ${CELL_SIZE},
  stringOffsetX: ${data.stringOffsetX},
  nockTop: ${nockTopStr},
  nockBottom: ${nockBottomStr},
  particles: [
${bodyLines.join('\n')}
  ],
  stringParticles: [
${stringLines.join('\n')}
  ],
};
`;
}
