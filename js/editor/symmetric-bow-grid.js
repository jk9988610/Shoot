/**
 * 对称弓形网格生成器 — 绘制层数据源
 * 1格 = 1粒子 = 4px · gy 向下为正 · 色块落在格内
 */
export function buildSymmetricBowGrid() {
  const cells = new Map();

  function add(gx, gy, color, pinned = false, kind = 'body') {
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned, kind });
  }

  function fillRect(gx0, gy0, gx1, gy1, colorFn, kind = 'body') {
    const x0 = Math.min(gx0, gx1);
    const x1 = Math.max(gx0, gx1);
    const y0 = Math.min(gy0, gy1);
    const y1 = Math.max(gy0, gy1);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const k = `${gx},${gy}`;
        if (!cells.has(k)) add(gx, gy, colorFn(gx, gy), false, kind);
      }
    }
  }

  function mirrorY() {
    for (const c of [...cells.values()]) {
      if (c.gy === 0) continue;
      const gy2 = -c.gy;
      const k = `${c.gx},${gy2}`;
      if (!cells.has(k)) {
        cells.set(k, { gx: c.gx, gy: gy2, color: c.color, pinned: c.pinned, kind: c.kind });
      }
    }
  }

  // 握把上半（gy ≤ 0）
  fillRect(-2, -8, 2, 0, (gx) => {
    if (gx === 0) return '#6B3A1F';
    if (Math.abs(gx) === 1) return '#8B4513';
    return '#7A4A2E';
  });

  // 上弓臂（gy 负方向 = 向上）
  const spine = [
    [0, -2], [0, -4], [-1, -6], [-2, -8], [-3, -10], [-4, -12], [-5, -14], [-6, -16],
    [-8, -17], [-10, -18], [-12, -19], [-14, -20], [-16, -20], [-18, -20], [-20, -20],
  ];

  spine.forEach(([gx, gy], i) => {
    const core = i % 2 ? '#A0522D' : '#8B4513';
    add(gx, gy, core);
    add(gx - 1, gy, '#7A4A2E');
    add(gx - 2, gy, '#6B3A1F');
    if (i > 2) add(gx + 1, gy, '#6B3A1F');
  });

  fillRect(-21, -20, -17, -20, (gx) => {
    if (gx === -19) return '#A0522D';
    if (gx === -18) return '#8B4513';
    return '#7A4A2E';
  });
  fillRect(-20, -19, -17, -19, () => '#6B3A1F');
  fillRect(-19, -18, -17, -18, () => '#8B4513');

  fillRect(-2, -1, 1, -1, (gx) => (gx === 0 ? '#6B3A1F' : '#8B4513'));
  fillRect(-4, -4, -2, -3, () => '#7A4A2E');
  fillRect(-6, -8, -3, -7, () => '#7A4A2E');
  fillRect(-10, -12, -6, -11, () => '#7A4A2E');
  fillRect(-14, -16, -10, -15, () => '#7A4A2E');

  mirrorY();

  for (const c of cells.values()) {
    if (c.kind !== 'body') continue;
    if (c.gy > 0 && c.gy <= 8 && c.gx >= -2 && c.gx <= 2) {
      c.pinned = true;
    }
  }

  const nockTop = { gx: -20, gy: -20 };
  const nockBottom = { gx: -20, gy: 20 };
  const stringGx = -22;

  for (let gy = -20; gy <= 20; gy++) {
    const k = `${stringGx},${gy}`;
    if (!cells.has(k)) {
      add(
        stringGx,
        gy,
        gy % 2 === 0 ? '#FFFFFF' : '#E8E8E8',
        gy === -20 || gy === 20,
        'string',
      );
    }
  }

  return {
    cells,
    nockTop,
    nockBottom,
    stringGx,
    anchor: { gx: 0, gy: 0 },
  };
}
