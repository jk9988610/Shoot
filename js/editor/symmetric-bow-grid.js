/**
 * 对称弓形网格生成器 — 弓身长度 2×（梢到梢 80 格 = 320px）
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

  // 握把上半（加高以配合 2× 弓臂）
  fillRect(-3, -16, 3, 0, (gx) => {
    if (gx === 0) return '#6B3A1F';
    if (Math.abs(gx) === 1) return '#8B4513';
    if (Math.abs(gx) === 2) return '#7A4A2E';
    return '#8B4513';
  });

  // 上弓臂脊柱 — 反曲弧，梢端 gy=-40
  const spine = [
    [0, -4], [0, -8], [-2, -12], [-4, -16], [-6, -20], [-8, -24], [-10, -28],
    [-12, -32], [-16, -34], [-20, -36], [-24, -37], [-28, -38], [-32, -39],
    [-36, -40], [-40, -40],
  ];

  spine.forEach(([gx, gy], i) => {
    const core = i % 2 ? '#A0522D' : '#8B4513';
    add(gx, gy, core);
    add(gx - 1, gy, '#7A4A2E');
    add(gx - 2, gy, '#6B3A1F');
    if (i > 2) add(gx + 1, gy, '#6B3A1F');
    if (i > 6) add(gx - 3, gy, '#7A4A2E');
  });

  // 梢端实心加厚
  fillRect(-42, -40, -38, -40, (gx) => {
    if (gx === -40) return '#A0522D';
    if (gx === -39) return '#8B4513';
    return '#7A4A2E';
  });
  fillRect(-41, -39, -38, -39, () => '#6B3A1F');
  fillRect(-40, -38, -38, -38, () => '#8B4513');

  // 弓臂过渡加厚
  fillRect(-3, -1, 2, -1, (gx) => (gx === 0 ? '#6B3A1F' : '#8B4513'));
  fillRect(-6, -6, -3, -5, () => '#7A4A2E');
  fillRect(-10, -12, -5, -10, () => '#7A4A2E');
  fillRect(-16, -20, -10, -18, () => '#7A4A2E');
  fillRect(-24, -28, -16, -26, () => '#7A4A2E');
  fillRect(-32, -36, -24, -34, () => '#7A4A2E');

  mirrorY();

  for (const c of cells.values()) {
    if (c.kind !== 'body') continue;
    if (c.gy > 0 && c.gy <= 16 && c.gx >= -3 && c.gx <= 3) {
      c.pinned = true;
    }
  }

  const nockTop = { gx: -40, gy: -40 };
  const nockBottom = { gx: -40, gy: 40 };
  const stringGx = -42;

  for (let gy = -40; gy <= 40; gy++) {
    const k = `${stringGx},${gy}`;
    if (!cells.has(k)) {
      add(
        stringGx,
        gy,
        gy % 2 === 0 ? '#FFFFFF' : '#E8E8E8',
        gy === -40 || gy === 40,
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
