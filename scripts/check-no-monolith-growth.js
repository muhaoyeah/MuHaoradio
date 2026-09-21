#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const failures = [];
const notes = [];
function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}
{
  const css = read('public/css/index.css') || '';
  for (const marker of ['home-card-sheen', 'bindHomeCardPointerGloss']) {
    if (css.includes(marker)) {
      failures.push('index.css contains forbidden marker "' + marker + '" (entrance-only policy)');
    } else {
      notes.push('OK: index.css has no "' + marker + '"');
    }
  }
}
{
  const heroRel = 'public/css/muhao-home-hero.css';
  if (!fs.existsSync(path.join(ROOT, heroRel))) {
    failures.push('Missing public/css/muhao-home-hero.css');
  } else {
    notes.push('OK: muhao-home-hero.css exists');
    const html = read('public/index.html') || '';
    if (!/muhao-home-hero\.css/.test(html)) {
      failures.push('public/index.html does not link muhao-home-hero.css');
    } else {
      notes.push('OK: index.html links muhao-home-hero.css');
    }
  }
}
{
  const server = read('server.js') || '';
  if (!server.includes('kugou-lite/recommendations')) {
    failures.push('server.js: missing /api/kugou-lite/recommendations marker');
  } else if (!server.includes('handleLiteRecommendations')) {
    failures.push('server.js: recommendations must delegate to handleLiteRecommendations');
  } else {
    notes.push('OK: server.js references handleLiteRecommendations');
  }
}
console.log('check-no-monolith-growth');
for (const n of notes) console.log('  ' + n);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  FAIL: ' + f);
  process.exit(1);
}
console.log('RESULT: OK (exit 0)');
process.exit(0);
