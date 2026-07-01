/**
 * 对称弓形网格 — 单一格填充方案
 *
 * 绘制原则（每格仅一层色块）：
 * - 弓身 (body) 与弓弦 (string) 各占不同列，禁止同格叠放
 * - 弦列在弓腹侧（更负 gx），梢位在弦右侧一格
 * - 先建弓身 → 镜像 → 再 carve 弦列（清掉该列弓身后填弦）
 */
export const BOW_GRID_REVISION = 4;

export function buildSymmetricBowGrid() {
  const cells = new Map();
  const NOCK_GX = -40;
  const STRING_GX = -43;

  function add(gx, gy, color, pinned = false, kind = 'body') {
    if (kind === 'body' && gx <= STRING_GX) return;
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned, kind });
  }

  function fillRect(gx0, gy0, gx1, gy1, colorFn, kind = 'body') {
    const x0 = Math.min(gx0, gx1);
    const x1 = Math.max(gx0, gx1);
    const y0 = Math.min(gy0, gy1);
    const y1 = Math.max(gy0, gy1);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        if (kind === 'body' && gx <= STRING_GX) continue;
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

  function carveStringColumn(gy0, gy1) {
    for (let gy = gy0; gy <= gy1; gy++) {
      cells.delete(`${STRING_GX},${gy}`);
      cells.set(`${STRING_GX},${gy}`, {
        gx: STRING_GX,
        gy,
        color: gy % 2 === 0 ? '#FFFFFF' : '#E8E8E8',
        pinned: gy === gy0 || gy === gy1,
        kind: 'string',
      });
    }
  }

  // 握把
  fillRect(-3, -16, 3, 0, (gx) => {
    if (gx === 0) return '#6B3A1F';
    if (Math.abs(gx) === 1) return '#8B4513';
    return '#7A4A2E';
  });

  const spine = [
    [0, -4], [0, -8], [-2, -12], [-4, -16], [-6, -20], [-8, -24], [-10, -28],
    [-12, -32], [-16, -34], [-20, -36], [-24, -37], [-28, -38], [-32, -39],
    [-36, -40], [NOCK_GX, -40],
  ];

  spine.forEach(([gx, gy], i) => {
    const core = i % 2 ? '#A0522D' : '#8B4513';
    add(gx, gy, core);
    add(gx - 1, gy, '#7A4A2E');
    add(gx - 2, gy, '#6B3A1F');
    if (i > 2) add(gx + 1, gy, '#6B3A1F');
  });

  fillRect(NOCK_GX - 1, -40, NOCK_GX + 1, -40, (gx) => {
    if (gx === NOCK_GX) return '#A0522D';
    if (gx === NOCK_GX - 1) return '#8B4513';
    return '#7A4A2E';
  });
  fillRect(NOCK_GX - 1, -39, NOCK_GX + 1, -39, () => '#6B3A1F');

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

  const nockTop = { gx: NOCK_GX, gy: -40 };
  const nockBottom = { gx: NOCK_GX, gy: 40 };
  carveStringColumn(-40, 40);

  return {
    cells,
    nockTop,
    nockBottom,
    stringGx: STRING_GX,
    anchor: { gx: 0, gy: 0 },
  };
}
