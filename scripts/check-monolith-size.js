#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASELINES = {
  "public/css/index.css": {
    "lines": 18113,
    "bytes": 426268,
    "softCapBytes": 439057,
    "redCapBytes": 502997,
    "softCapLines": 18657,
    "redCapLines": 21374
  },
  "server.js": {
    "lines": 7468,
    "bytes": 305697,
    "softCapBytes": 314868,
    "redCapBytes": 360723,
    "softCapLines": 7693,
    "redCapLines": 8813
  },
  "desktop/kugou-lite-media.js": {
    "lines": 1359,
    "bytes": 50579,
    "softCapBytes": 52097,
    "redCapBytes": 59684,
    "softCapLines": 1400,
    "redCapLines": 1604
  },
  "public/js/modules/05-playback/03a-home-dashboard.js": {
    "lines": 1350,
    "bytes": 62020,
    "softCapBytes": 63881,
    "redCapBytes": 73184,
    "softCapLines": 1391,
    "redCapLines": 1593
  },
  "public/js/modules/05-playback/04-home-empty-wallpaper.js": {
    "lines": 490,
    "bytes": 18679,
    "softCapBytes": 19240,
    "redCapBytes": 22042,
    "softCapLines": 505,
    "redCapLines": 579
  },
  "public/css/muhao-home-hero.css": {
    "lines": 26,
    "bytes": 3881,
    "softCapBytes": 3998,
    "redCapBytes": 4580,
    "softCapLines": 27,
    "redCapLines": 31
  }
};
function measure(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return { rel, missing: true, lines: 0, bytes: 0, kb: 0 };
  const buf = fs.readFileSync(abs);
  const text = buf.toString('utf8');
  const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
  return { rel, missing: false, lines, bytes: buf.length, kb: +(buf.length / 1024).toFixed(1) };
}
function statusFor(m, b) {
  if (m.missing) return 'FAIL';
  if (!b) return 'OK';
  if (m.bytes > b.redCapBytes || m.lines > b.redCapLines) return 'FAIL';
  if (
    m.bytes > b.softCapBytes ||
    m.lines > b.softCapLines ||
    m.bytes > Math.ceil(b.bytes * 1.02) ||
    m.lines > Math.ceil(b.lines * 1.02)
  ) return 'WARN';
  return 'OK';
}
const rows = [];
let worst = 'OK';
for (const rel of Object.keys(BASELINES)) {
  const m = measure(rel);
  const st = statusFor(m, BASELINES[rel]);
  if (st === 'FAIL') worst = 'FAIL';
  else if (st === 'WARN' && worst === 'OK') worst = 'WARN';
  rows.push(Object.assign({}, m, { status: st, baselineLines: BASELINES[rel].lines, baselineKb: +(BASELINES[rel].bytes / 1024).toFixed(1) }));
}
const col = (s, n) => String(s).padEnd(n).slice(0, n);
console.log('check-monolith-size');
console.log(col('FILE', 56) + col('LINES', 8) + col('KB', 8) + col('BASE_L', 8) + col('BASE_KB', 8) + 'STATUS');
console.log('-'.repeat(96));
for (const r of rows) {
  console.log(col(r.rel, 56) + col(r.missing ? 'MISSING' : r.lines, 8) + col(r.missing ? '-' : r.kb, 8) + col(r.baselineLines, 8) + col(r.baselineKb, 8) + r.status);
}
console.log('-'.repeat(96));
console.log('RESULT:', worst, worst === 'FAIL' ? '(exit 1)' : '(exit 0)');
process.exit(worst === 'FAIL' ? 1 : 0);
