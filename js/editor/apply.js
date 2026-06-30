/**
 * 应用层 — 网格数据 ↔ 游戏 CUSTOM_BOW_DATA 转换（模拟逻辑）
 */
import { GridModel } from './grid-model.js';

export const CELL_SIZE = 2;

/** 绘制网格 → 游戏粒子数据 */
export function toApplyData(model) {
  const { anchor } = model;
  const particles = [...model.cells.values()]
    .sort((a, b) => a.gy - b.gy || a.gx - b.gx)
    .map((c) => ({
      dx: (c.gx - anchor.gx) * CELL_SIZE,
      dy: (c.gy - anchor.gy) * CELL_SIZE,
      color: c.color,
      ...(c.pinned ? { pinned: true } : {}),
    }));

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
    version: 1,
    stringOffsetX,
    nockTop,
    nockBottom,
    particles,
  };
}

/** 游戏粒子数据 → 绘制网格 */
export function fromApplyData(data) {
  const model = new GridModel();

  for (const p of data.particles) {
    const gx = Math.round(p.dx / CELL_SIZE);
    const gy = Math.round(p.dy / CELL_SIZE);
    model.setCell(gx, gy, { color: p.color, pinned: !!p.pinned });
  }

  if (data.nockTop) {
    model.nockTop = {
      gx: Math.round(data.nockTop.dx / CELL_SIZE),
      gy: Math.round(data.nockTop.dy / CELL_SIZE),
    };
  }
  if (data.nockBottom) {
    model.nockBottom = {
      gx: Math.round(data.nockBottom.dx / CELL_SIZE),
      gy: Math.round(data.nockBottom.dy / CELL_SIZE),
    };
  }
  if (data.nockTop && data.stringOffsetX !== undefined) {
    model.stringGx = model.nockTop.gx + Math.round(data.stringOffsetX / CELL_SIZE);
  }

  return model;
}

export function generateExportCode(model) {
  const data = toApplyData(model);
  const lines = data.particles.map((p) => {
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
 * 由弓身绘制工具导出 — ${new Date().toISOString()}
 * 绘制层(网格) → 应用层(游戏坐标)，1格 = ${CELL_SIZE}px
 */
export const CUSTOM_BOW_DATA = {
  version: 1,
  stringOffsetX: ${data.stringOffsetX},
  nockTop: ${nockTopStr},
  nockBottom: ${nockBottomStr},
  particles: [
${lines.join('\n')}
  ],
};
`;
}
