#!/usr/bin/env node
/**
 * 校验版本单一来源：仅 js/version.js 定义 VERSION，HTML 不得硬编码 __BOOT_VERSION__
 */
import { readFileSync } from 'fs';
import { parseVersionFromSource } from '../js/version-parse.js';

const versionText = readFileSync('js/version.js', 'utf8');
const version = parseVersionFromSource(versionText);

if (!version) {
  console.error('FAIL: js/version.js 中未找到 VERSION 常量');
  process.exit(1);
}

const semver = /^\d+\.\d+\.\d+$/;
if (!semver.test(version)) {
  console.error(`FAIL: VERSION 格式无效: ${version}`);
  process.exit(1);
}

let failed = false;
for (const file of ['index.html', 'bow-editor.html']) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('__BOOT_VERSION__')) {
    console.error(`FAIL: ${file} 仍含硬编码 __BOOT_VERSION__，应改用 js/boot.js`);
    failed = true;
  }
  const hardcoded = html.match(/window\.__BOOT_VERSION__\s*=\s*['"]([^'"]+)['"]/);
  if (hardcoded) {
    console.error(`FAIL: ${file} 硬编码版本 ${hardcoded[1]}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(`OK: 版本单一来源 js/version.js → v${version}`);
