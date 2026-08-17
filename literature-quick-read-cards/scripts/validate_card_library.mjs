#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];

function read(file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    errors.push(`缺少文件：${file}`);
    return '';
  }
  return fs.readFileSync(target, 'utf8');
}

function checkJavaScript(file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return;
  const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`${file} 语法错误：${(result.stderr || result.stdout).trim()}`);
}

const index = read('index.html');
const cardJs = read('card.js');
const cardData = read('card-data.js');

if (index && !index.includes('card.js')) errors.push('index.html 未引用 card.js');
if (cardJs && !cardJs.includes('CARD_FILES')) errors.push('card.js 未找到 CARD_FILES 映射');
if (cardData && !cardData.includes('CARD_DATA')) errors.push('card-data.js 未找到 CARD_DATA 数据');

const mapMatch = cardJs.match(/const\s+CARD_FILES\s*=\s*\{([\s\S]*?)\n\};/);
if (mapMatch) {
  const entries = [...mapMatch[1].matchAll(/^\s*([A-Za-z0-9_$]+)\s*:\s*['"]([^'"]+\.html)['"]\s*,?$/gm)];
  if (!entries.length) errors.push('CARD_FILES 映射为空或格式无法识别');
  for (const [, id, file] of entries) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) {
      errors.push(`CARD_FILES.${id} 指向不存在的文件：${file}`);
      continue;
    }
    const html = fs.readFileSync(target, 'utf8');
    if (!new RegExp(`data-card=["']${id}["']`).test(html)) {
      errors.push(`${file} 缺少匹配的 data-card="${id}"`);
    }
  }
}

checkJavaScript('card.js');
checkJavaScript('card-data.js');

if (errors.length) {
  console.error('文献卡库校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`文献卡库校验通过：${root}`);
