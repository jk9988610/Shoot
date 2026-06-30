/**
 * 对称弓形网格生成器 — 绘制层数据源
 * 仅构建上半（gy ≤ 0），再严格 Y 镜像，避免握把占位导致不对称
 */
export function buildSymmetricBowGrid() {
  const cells = new Map();

  function add(gx, gy, color, pinned = false) {
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned });
  }

  function mirrorY() {
    for (const c of [...cells.values()]) {
      if (c.gy === 0) continue;
      const gy2 = -c.gy;
      const k = `${c.gx},${gy2}`;
      if (!cells.has(k)) {
        cells.set(k, { gx: c.gx, gy: gy2, color: c.color, pinned: c.pinned });
      }
    }
  }

  // 握把上半（镜像后得完整对称握把）
  for (let gy = -5; gy <= 0; gy++) {
    for (const gx of [-1, 0, 1]) {
      add(gx, gy, gx === 0 ? '#6B3A1F' : '#8B4513');
    }
  }

  // 上弓臂脊柱曲线（gy < 0）
  const spine = [
    [0, -4], [0, -6], [-1, -8], [-2, -10], [-3, -12], [-4, -14], [-5, -16], [-6, -18],
    [-8, -20], [-10, -22], [-12, -23], [-14, -24], [-16, -24], [-18, -24], [-20, -24], [-22, -24],
  ];
  spine.forEach(([gx, gy], i) => {
    add(gx, gy, i % 2 ? '#A0522D' : '#8B4513');
    add(gx - 1, gy, '#7A4A2E');
    if (i > 4) add(gx + 1, gy, '#6B3A1F');
  });

  // 梢端加厚
  add(-22, -24, '#A0522D');
  add(-23, -24, '#8B4513');
  add(-24, -24, '#7A4A2E');

  mirrorY();

  // 下半握把固定（与游戏逻辑一致：dy ≥ 0 区域）
  for (const c of cells.values()) {
    if (c.gy > 0 && c.gy <= 5 && c.gx >= -1 && c.gx <= 1) {
      c.pinned = true;
    }
  }

  return {
    cells,
    nockTop: { gx: -22, gy: -24 },
    nockBottom: { gx: -22, gy: 24 },
    stringGx: -24,
    anchor: { gx: 0, gy: 0 },
  };
}
