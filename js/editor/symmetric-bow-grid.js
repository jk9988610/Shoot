/**
 * 对称弓形网格 — 等腰梯形弓身（无底边，弓弦代替底边）
 *
 * 剖面视角：弓弦为竖直短底，握把处弓腹为最宽顶边，上下梢对称收窄。
 * - 弓身 (body) 与弓弦 (string) 分列，禁止同格叠放
 * - 弦列在弓腹左侧（更负 gx），梢在弦列右侧
 */
export const BOW_GRID_REVISION = 5;

const WOOD = ['#6B3A1F', '#8B4513', '#A0522D', '#7A4A2E'];

export function buildSymmetricBowGrid() {
  const NOCK_Y = 40;
  const STRING_GX = -43;
  const NOCK_GX = -40;
  const INNER_GX = STRING_GX + 1;
  const GRIP_OUTER_GX = 3;
  const NOCK_OUTER_GX = NOCK_GX;

  const cells = new Map();

  function add(gx, gy, color, pinned = false, kind = 'body') {
    if (kind === 'body' && gx <= STRING_GX) return;
    cells.set(`${gx},${gy}`, { gx, gy, color, pinned, kind });
  }

  /** 等腰梯形外缘：梢部窄、握把宽，线性插值 */
  function outerGxAtY(gy) {
    const ay = Math.abs(gy);
    const t = 1 - ay / NOCK_Y;
    return Math.round(NOCK_OUTER_GX + t * (GRIP_OUTER_GX - NOCK_OUTER_GX));
  }

  function woodColor(gx, gy) {
    return WOOD[(Math.abs(gx * 3 + gy * 2)) % WOOD.length];
  }

  /** 填充一行弓身：内缘贴弦列右侧，外缘按梯形外插 */
  function fillRow(gy, pinGrip = false) {
    const outer = outerGxAtY(gy);
    for (let gx = INNER_GX; gx <= outer; gx++) {
      const pinned = pinGrip && gy > 0 && gy <= 16 && gx >= -3 && gx <= 3;
      add(gx, gy, woodColor(gx, gy), pinned);
    }
  }

  for (let gy = -NOCK_Y; gy <= NOCK_Y; gy++) {
    fillRow(gy, true);
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

  const nockTop = { gx: NOCK_GX, gy: -NOCK_Y };
  const nockBottom = { gx: NOCK_GX, gy: NOCK_Y };
  carveStringColumn(-NOCK_Y, NOCK_Y);

  return {
    cells,
    nockTop,
    nockBottom,
    stringGx: STRING_GX,
    anchor: { gx: 0, gy: 0 },
  };
}
