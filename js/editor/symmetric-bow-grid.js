/**
 * 对称弓形网格生成器 — 绘制层数据源
 * 1格 = 1粒子 = 4px（实心色块填满格子）
 * 仅构建上半（gy ≤ 0），再严格 Y 镜像
 */
export function buildSymmetricBowGrid() {
  const cells = new Map();

  function add(gx, gy, color, pinned = false) {
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned });
  }

  function fillRect(gx0, gy0, gx1, gy1, colorFn) {
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const k = `${gx},${gy}`;
        if (!cells.has(k)) add(gx, gy, colorFn(gx, gy));
      }
    }
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

  // 握把上半 — 3×4 实心色块
  fillRect(-1, -3, 1, 0, (gx) => (gx === 0 ? '#6B3A1F' : '#8B4513'));

  // 上弓臂 — 脊柱曲线 + 每层填满剖面宽度
  const spine = [
    [0, -1], [0, -2], [-1, -3], [-1, -4], [-2, -5], [-3, -6], [-4, -7],
    [-5, -8], [-6, -9], [-7, -10], [-8, -11], [-9, -12], [-10, -12], [-11, -12],
  ];

  spine.forEach(([gx, gy], i) => {
    const core = i % 2 ? '#A0522D' : '#8B4513';
    add(gx, gy, core);
    add(gx - 1, gy, '#7A4A2E');
    if (i > 1) add(gx + 1, gy, '#6B3A1F');
  });

  // 梢端 — 实心横条填满格子
  fillRect(-12, -12, -8, -12, (gx) => {
    if (gx === -10) return '#A0522D';
    if (gx === -9) return '#8B4513';
    return '#7A4A2E';
  });
  fillRect(-10, -11, -8, -11, () => '#6B3A1F');

  // 弓臂过渡加厚 — 避免握把到弓臂之间留空
  add(-1, -1, '#8B4513');
  add(0, -1, '#6B3A1F');
  add(-2, -4, '#7A4A2E');
  add(-3, -7, '#7A4A2E');
  add(-4, -8, '#8B4513');

  mirrorY();

  for (const c of cells.values()) {
    if (c.gy > 0 && c.gy <= 3 && c.gx >= -1 && c.gx <= 1) {
      c.pinned = true;
    }
  }

  return {
    cells,
    nockTop: { gx: -11, gy: -12 },
    nockBottom: { gx: -11, gy: 12 },
    stringGx: -12,
    anchor: { gx: 0, gy: 0 },
  };
}
