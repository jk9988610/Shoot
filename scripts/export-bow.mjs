#!/usr/bin/env node
/** 从 symmetric-bow-grid 导出 js/custom-bow-data.js */
import { writeFileSync } from 'fs';
import { buildSymmetricBowGrid } from '../js/editor/symmetric-bow-grid.js';
import { GridModel } from '../js/editor/grid-model.js';
import { generateExportCode, toApplyData } from '../js/editor/apply.js';

const g = buildSymmetricBowGrid();
const model = new GridModel();
model.anchor = { ...g.anchor };
model.nockTop = g.nockTop;
model.nockBottom = g.nockBottom;
model.stringGx = g.stringGx;
for (const c of g.cells.values()) {
  model.setCell(c.gx, c.gy, { color: c.color, pinned: !!c.pinned, kind: c.kind });
}

const apply = toApplyData(model);
const body = apply.particles.length;
const str = apply.stringParticles.length;
console.log(`弓身 ${body} 格 · 弓弦 ${str} 格 · 合计 ${body + str}`);

let code = generateExportCode(model);
writeFileSync(new URL('../js/custom-bow-data.js', import.meta.url), code);
console.log('已写入 js/custom-bow-data.js');
