
'use strict';
const fs = require('fs');
const path = require('path');

const APP = process.argv[2] || 'D:\\MuHaoradio\\resources\\app';
const DESK = process.argv[3] || 'C:\\Users\\MUHAO\\Desktop';
const SRC = process.argv[4] || '';

function read(rel) {
  const p = path.join(APP, rel);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

function uniq(arr) {
  return [...new Set(arr)].sort();
}

function extractIpcMain(text) {
  const channels = [];
  const re = /ipcMain\.(handle|on|once)\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) channels.push({ kind: m[1], channel: m[2] });
  return channels;
}

function extractIpcInvoke(text) {
  const channels = [];
  const re = /ipcRenderer\.(invoke|send|sendSync)\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) channels.push(m[2]);
  return channels;
}

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walkJs(p, acc);
    else if (/\.(js|mjs|cjs)$/i.test(name)) acc.push(p);
  }
  return acc;
}

const mainHits = [];
const preloadHits = [];

for (const p of walkJs(path.join(APP, 'desktop'))) {
  const rel = path.relative(APP, p).replace(/\\/g, '/');
  const text = fs.readFileSync(p, 'utf8');
  for (const h of extractIpcMain(text)) mainHits.push({ ...h, file: rel });
  if (/preload|bridge/i.test(rel)) {
    for (const c of extractIpcInvoke(text)) preloadHits.push({ channel: c, file: rel });
  }
}

// also root main/preload if present
for (const rel of ['main.js', 'preload.js']) {
  const text = read(rel);
  if (!text) continue;
  for (const h of extractIpcMain(text)) mainHits.push({ ...h, file: rel });
  if (/preload/i.test(rel)) {
    for (const c of extractIpcInvoke(text)) preloadHits.push({ channel: c, file: rel });
  }
}

const mainChannels = uniq(mainHits.map((h) => h.channel));
const preloadChannels = uniq(preloadHits.map((h) => h.channel));
const onlyMain = mainChannels.filter((c) => !preloadChannels.includes(c));
const onlyPreload = preloadChannels.filter((c) => !mainChannels.includes(c));
const both = mainChannels.filter((c) => preloadChannels.includes(c));

const lines = [];
lines.push('# MuHaoradio IPC 清单（阶段 3）');
lines.push('');
lines.push('生成时间: ' + new Date().toISOString());
lines.push('扫描根目录: `' + APP + '`');
lines.push('');
lines.push('## 摘要');
lines.push('');
lines.push('- main 注册 (ipcMain.handle/on): **' + mainChannels.length + '**');
lines.push('- preload/桥 调用 (invoke/send): **' + preloadChannels.length + '**');
lines.push('- 两边都有: **' + both.length + '**');
lines.push('- 仅 main（可能未暴露或动态名）: **' + onlyMain.length + '**');
lines.push('- 仅 preload（可能缺 handler 或字符串拼出来）: **' + onlyPreload.length + '**');
lines.push('');
lines.push('## 两边对齐的通道');
lines.push('');
for (const c of both) lines.push('- `' + c + '`');
lines.push('');
lines.push('## 仅 main');
lines.push('');
for (const c of onlyMain) {
  const files = uniq(mainHits.filter((h) => h.channel === c).map((h) => h.file + ':' + h.kind));
  lines.push('- `' + c + '` — ' + files.join(', '));
}
lines.push('');
lines.push('## 仅 preload');
lines.push('');
for (const c of onlyPreload) {
  const files = uniq(preloadHits.filter((h) => h.channel === c).map((h) => h.file));
  lines.push('- `' + c + '` — ' + files.join(', '));
}
lines.push('');
lines.push('## 完整 main 注册明细');
lines.push('');
lines.push('| channel | kind | file |');
lines.push('|---|---|---|');
for (const h of mainHits.sort((a, b) => a.channel.localeCompare(b.channel))) {
  lines.push('| `' + h.channel + '` | ' + h.kind + ' | `' + h.file + '` |');
}
lines.push('');
lines.push('## 减债建议（下一步）');
lines.push('');
lines.push('1. 优先核对「仅 preload」通道：缺 handler 会导致 invoke 挂死。');
lines.push('2. 「仅 main」里若确认无调用，可标 deprecated，别急着删。');
lines.push('3. 新 IPC 一律：`desktop/*-ipc.js` 注册 + preload 白名单，不进 `main.js` 巨石。');
lines.push('4. ESM 试点：挑一个无循环依赖的 `desktop/*.js`（纯工具模块），不要动 renderer 全局脚本加载链。');
lines.push('');

const outDesk = path.join(DESK, 'MuHaoradio-IPC清单.md');
const bom = Buffer.from([0xef, 0xbb, 0xbf]);
const body = Buffer.from(lines.join('\r\n'), 'utf8');
fs.writeFileSync(outDesk, Buffer.concat([bom, body]));
console.log('WROTE', outDesk);

const outApp = path.join(APP, 'docs');
if (!fs.existsSync(outApp)) fs.mkdirSync(outApp, { recursive: true });
fs.writeFileSync(path.join(outApp, 'IPC-INVENTORY.md'), lines.join('\n'), 'utf8');
console.log('WROTE', path.join(outApp, 'IPC-INVENTORY.md'));

if (SRC && fs.existsSync(SRC)) {
  const d = path.join(SRC, 'docs');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'IPC-INVENTORY.md'), lines.join('\n'), 'utf8');
  console.log('SYNCED', path.join(d, 'IPC-INVENTORY.md'));
}

console.log(JSON.stringify({
  main: mainChannels.length,
  preload: preloadChannels.length,
  both: both.length,
  onlyMain: onlyMain.length,
  onlyPreload: onlyPreload.length
}, null, 2));
