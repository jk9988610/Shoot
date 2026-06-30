/**
 * 对称弓形网格生成器 — 绘制层数据源
 * 上/下弓臂严格镜像，供 custom-bow-data.js 生成使用
 */
export function buildSymmetricBowGrid() {
  const cells = new Map();

  function add(gx, gy, color, pinned = false) {
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned });
  }

  function mirrorY() {
    for (const c of [...cells.values()]) {
      if (c.gy >= 0) continue;
      const gy2 = -c.gy;
      const k = `${c.gx},${gy2}`;
      if (!cells.has(k)) cells.set(k, { gx: c.gx, gy: gy2, color: c.color, pinned: c.pinned });
    }
  }

  for (let gy = -3; gy <= 5; gy++) {
    for (const gx of [-1, 0, 1]) {
      add(gx, gy, gx === 0 ? '#6B3A1F' : '#8B4513', gy >= 0);
    }
  }

  const spine = [
    [0, -4], [0, -6], [-1, -8], [-2, -10], [-3, -12], [-4, -14], [-5, -16], [-6, -18],
    [-8, -20], [-10, -22], [-12, -23], [-14, -24], [-16, -24], [-18, -24], [-20, -24], [-22, -24],
  ];
  spine.forEach(([gx, gy], i) => {
    add(gx, gy, i % 2 ? '#A0522D' : '#8B4513');
    add(gx - 1, gy, '#7A4A2E');
    if (i > 4) add(gx + 1, gy, '#6B3A1F');
  });

  add(-22, -24, '#A0522D');
  add(-23, -24, '#8B4513');
  add(-24, -24, '#7A4A2E');

  mirrorY();
  add(-23, 24, '#8B4513');
  add(-24, 24, '#7A4A2E');

  return {
    cells,
    nockTop: { gx: -22, gy: -24 },
    nockBottom: { gx: -22, gy: 24 },
    stringGx: -24,
    anchor: { gx: 0, gy: 0 },
  };
}
