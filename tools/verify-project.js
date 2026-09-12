#!/usr/bin/env node
'use strict';
/*
 * MuHaoradio 验收闸门 —— 每次改动后跑这一条命令，判断「能不能提交」
 *
 *   node tools/verify-project.js            检查项目本体
 *   node tools/verify-project.js --install  额外对照运行副本
 *
 * 退出码：0 = 全部通过，1 = 有 FAIL（不可提交）
 *
 * 核心检查是 A2：按 index-loader 的顺序把 104 个模块拼成一个脚本再解析。
 * 这一项直接等价于「改完会不会卡 splash」，因为浏览器就是这么执行的。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT_DIR = __dirname;
/* 目标定位顺序：脚本在 tools/ 下（__dirname/..）→ 环境变量 → 已知路径 */
const CANDIDATES = [
  path.resolve(SCRIPT_DIR, '..'),
  process.env.MUHAORADIO_ROOT,
  'C:\\Users\\MUHAO\\Desktop\\新建文件夹\\muhaoradio',
  'D:\\MuHaoradio\\resources\\app'
].filter(Boolean);
const ROOT = CANDIDATES.find(p => fs.existsSync(path.join(p, 'server.js')) && fs.existsSync(path.join(p, 'public', 'js', 'index-loader.js')));
if (!ROOT) {
  console.error('找不到项目根目录（需要含 server.js 与 public/js/index-loader.js）。请用 MUHAORADIO_ROOT 指定。');
  process.exit(2);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'output', 'backups', 'tmp', '.playwright-cli']);
const SYNTAX_IGNORE = [/^vendor\//, /^source-images\//, /tsdown\.config\.js$/, /\.min\.js$/];

let FAIL = 0, WARN = 0, OK = 0;
const lines = [];
const say = (s) => { lines.push(s); console.log(s); };
const head = (t) => say('\n' + '─'.repeat(66) + '\n' + t + '\n' + '─'.repeat(66));
const pass = (m) => { OK++; say('  \x1b[32mPASS\x1b[0m  ' + m); };
const fail = (m) => { FAIL++; say('  \x1b[31mFAIL\x1b[0m  ' + m); };
const warn = (m) => { WARN++; say('  \x1b[33mKNOWN\x1b[0m ' + m); };
const info = (m) => say('        ' + m);

/* ---------- 工具 ---------- */
function walk(dir, rel, acc) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const e of ents) {
    const p = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) { if (SKIP_DIRS.has(e.name)) continue; walk(p, r, acc); }
    else if (e.isFile()) acc.push({ rel: r, abs: p });
  }
  return acc;
}
const read = (p) => fs.readFileSync(p, 'utf8');
const stripBOM = (s) => (s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s);

function loadOrder(root) {
  const p = path.join(root, 'public/js/index-loader.js');
  if (!fs.existsSync(p)) return null;
  const m = read(p).match(/const modulePaths\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return null;
  return m[1].split('\n').map(l => (l.match(/'([^']+)'/) || [])[1]).filter(Boolean);
}

const rootLabel = path.basename(ROOT) || ROOT;
say('\n\x1b[1mMuHaoradio 验收闸门\x1b[0m');
info('目标: ' + ROOT);

const files = walk(ROOT, '', []);
const jsFiles = files.filter(f => /\.(js|mjs|cjs)$/.test(f.rel));
const srcCache = new Map();
for (const f of jsFiles) { try { srcCache.set(f.rel, stripBOM(read(f.abs))); } catch (_) {} }

/* ================= A. 语法 ================= */
head('A. 语法检查');

/* A1 逐文件 */
const a1 = [];
for (const f of jsFiles) {
  if (SYNTAX_IGNORE.some(re => re.test(f.rel))) continue;
  const code = srcCache.get(f.rel) || '';
  try { new vm.Script(code, { filename: f.rel }); }
  catch (e) { a1.push({ file: f.rel, error: e.message }); }
}
if (a1.length === 0) pass('A1 逐文件解析 ' + jsFiles.length + ' 个 JS —— 0 错误');
else { fail('A1 逐文件解析发现 ' + a1.length + ' 处语法错误'); a1.forEach(x => info(x.file + ' → ' + x.error)); }

/* A2 拼接（关键） */
const order = loadOrder(ROOT);
if (!order) fail('A2 无法读取 index-loader.js 的 modulePaths');
else {
  const parts = [], missing = [];
  for (const rel of order) {
    const abs = path.join(ROOT, 'public', rel);
    if (!fs.existsSync(abs)) { missing.push(rel); continue; }
    parts.push('/* ==== ' + rel + ' ==== */\n' + read(abs));
  }
  if (missing.length) { fail('A2 清单中有 ' + missing.length + ' 个模块文件不存在'); missing.forEach(m => info('缺: ' + m)); }
  const bundle = ';(function(){\n' + parts.join('\n') + '\n})();';
  try {
    new vm.Script(bundle, { filename: 'mineradio-index-modules.js' });
    pass('A2 拼接 ' + order.length + ' 个模块（' + (bundle.length / 1e6).toFixed(2) + ' M 字符）→ 语法通过  ★核心项');
  } catch (e) {
    fail('A2 拼接后语法失败（实机会卡 splash）');
    info(e.message);
    const m = /mineradio-index-modules\.js:(\d+)/.exec(e.stack || '');
    if (m) {
      const arr = bundle.split('\n'), ln = +m[1];
      for (let i = Math.max(0, ln - 4); i < Math.min(arr.length, ln + 2); i++) info(String(i + 1).padStart(6) + ' | ' + arr[i]);
    }
  }

  /* A3 顶层 const/let 重名 */
  const decls = {};
  for (const rel of order) {
    const abs = path.join(ROOT, 'public', rel);
    if (!fs.existsSync(abs)) continue;
    for (const m of read(abs).matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm)) (decls[m[1]] = decls[m[1]] || []).push(rel);
  }
  const dup = Object.entries(decls).filter(([, w]) => w.length > 1);
  if (dup.length === 0) pass('A3 顶层 const/let 无重名');
  else { fail('A3 顶层 const/let 重名 ' + dup.length + ' 组（会导致 bundle SyntaxError）'); dup.slice(0, 10).forEach(([n, w]) => info(n + ' ← ' + w.join(' | '))); }
}

/* ================= B. 引用完整性 ================= */
head('B. 引用完整性');

if (order) {
  const missing = order.filter(rel => !fs.existsSync(path.join(ROOT, 'public', rel)));
  missing.length === 0 ? pass('B1 清单 ' + order.length + ' 个模块全部存在') : (fail('B1 ' + missing.length + ' 个模块缺失'), missing.forEach(m => info('缺: ' + m)));

  const onDisk = files.filter(f => f.rel.startsWith('public/js/modules/') && /\.js$/.test(f.rel))
    .map(f => f.rel.slice('public/'.length));
  const set = new Set(order);
  const orphan = onDisk.filter(r => !set.has(r));
  orphan.length === 0 ? pass('B2 public/js/modules/ 下无死文件（' + onDisk.length + ' 个全部被引用）')
    : warn('B2 有 ' + orphan.length + ' 个模块未被清单引用（死文件）' + (orphan.length ? '：' + orphan.join(', ') : ''));

  const dupEntry = order.filter((r, i) => order.indexOf(r) !== i);
  dupEntry.length === 0 ? pass('B3 清单无重复条目') : fail('B3 清单有 ' + dupEntry.length + ' 个重复条目: ' + dupEntry.join(', '));
}

const htmlPath = path.join(ROOT, 'public/index.html');
if (fs.existsSync(htmlPath)) {
  const html = read(htmlPath);
  const refs = [];
  const re = /<(script|link)\b[^>]*?(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[2].split('?')[0];
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) continue;
    refs.push({ raw, exists: fs.existsSync(path.join(ROOT, 'public', raw)) });
  }
  const miss = refs.filter(r => !r.exists);
  miss.length === 0 ? pass('B4 index.html 资源引用 ' + refs.length + '/' + refs.length + ' 存在')
    : (fail('B4 index.html 有 ' + miss.length + ' 个资源缺失'), miss.forEach(r => info('缺: ' + r.raw)));

  const ids = [...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map(x => x[1]);
  const cnt = {}; ids.forEach(i => cnt[i] = (cnt[i] || 0) + 1);
  const dupId = Object.entries(cnt).filter(([, c]) => c > 1);
  if (dupId.length === 0) {
    pass('B5 DOM id 无重复（共 ' + ids.length + ' 个）');
  } else {
    fail('B5 DOM id 重复 ' + dupId.length + ' 组');
    dupId.slice(0, 8).forEach(([i, c]) => info('#' + i + ' × ' + c));
  }
}

/* ================= C. 接口一致性 ================= */
head('C. 接口一致性');
const allSrc = [...srcCache.values()].join('\n');

const htmlForHandlers = fs.existsSync(htmlPath) ? read(htmlPath) : '';
const handlers = [...htmlForHandlers.matchAll(/on(?:click|change|input|submit|keydown|load|error|mouse\w+|touch\w+)\s*=\s*"([^"]*)"/gi)].map(x => x[1]);
const BUILTIN = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'typeof', 'catch', 'alert', 'confirm', 'prompt', 'parseInt', 'parseFloat', 'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'console', 'void', 'new', 'event']);
const used = new Set();
for (const h of handlers) {
  /* 只取「不是方法调用」的标识符：排除 x.foo( 这种点号前缀 */
  for (const m of h.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (!BUILTIN.has(m[1])) used.add(m[1]);
  }
}
const defined = new Set();
const defRe = /\b(?:function\s+([A-Za-z_$][\w$]*))|(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[^=])|(?:window\.([A-Za-z_$][\w$]*)\s*=\s*(?!=))/g;
let dm; while ((dm = defRe.exec(allSrc))) defined.add(dm[1] || dm[2] || dm[3]);
const unresolved = [...used].filter(n => !defined.has(n));
if (unresolved.length === 0) {
  pass('C1 index.html 内联 handler ' + used.size + ' 个函数名全部可解析');
} else {
  fail('C1 ' + unresolved.length + ' 个内联 handler 函数名找不到定义');
  unresolved.forEach(n => info('未定义: ' + n));
}

const svPath = path.join(ROOT, 'server.js');
if (fs.existsSync(svPath)) {
  const sv = read(svPath);
  const eps = new Set([...sv.matchAll(/['"`]\/api\/([A-Za-z0-9_\-\/]+)['"`]/g)].map(x => x[1].replace(/\/$/, '')));
  const calls = new Set();
  for (const [rel, code] of srcCache) if (rel.startsWith('public/js/')) for (const x of code.matchAll(/\/api\/([A-Za-z0-9_\-\/]+)/g)) calls.add(x[1].replace(/\/$/, ''));
  const notFound = [...calls].filter(c => ![...eps].some(e => e === c || e.startsWith(c + '/') || c.startsWith(e + '/')));
  if (notFound.length === 0) {
    pass('C2 前端 ' + calls.size + ' 个 /api 调用全部命中 server.js（' + eps.size + ' 端点）');
  } else {
    fail('C2 ' + notFound.length + ' 个前端调用在 server.js 找不到');
    notFound.forEach(c => info('未命中: /api/' + c));
  }
}

/* ================= D. 约定 ================= */
head('D. 命名约定');
if (order) {
  const dirs = {};
  order.forEach((rel, i) => {
    const seg = rel.split('/'); const dir = seg.slice(0, -1).join('/'); const file = seg[seg.length - 1];
    const m = file.match(/^(\d+)([a-z]?)/); if (!m) return;
    (dirs[dir] = dirs[dir] || []).push({ order: i + 1, num: +m[1], suf: m[2] || '', file });
  });
  /* 「NN + 可选小写字母」是合法约定：03 < 03a < 03b < 04。
     所以前缀比较必须带上字母后缀，只比数字会把 03a/03b 误判成重复前缀。 */
  const cmpPrefix = (a, b) => (a.num !== b.num ? a.num - b.num : (a.suf < b.suf ? -1 : a.suf > b.suf ? 1 : 0));
  let inv = 0; const invList = [];
  for (const [dir, arr] of Object.entries(dirs)) {
    let maxX = null;
    for (const x of arr) {
      if (maxX && cmpPrefix(x, maxX) < 0) {
        inv++;
        invList.push(dir + ': ' + x.file + '（前缀 ' + x.num + x.suf + '）排在前缀 ' + maxX.num + maxX.suf + ' 的 ' + maxX.file + ' 之后');
      }
      if (!maxX || cmpPrefix(x, maxX) > 0) maxX = x;
    }
  }
  if (inv === 0) {
    pass('D1 数字前缀与实际加载顺序一致');
  } else {
    fail('D1 ' + inv + ' 处前缀倒序（文件名前缀必须与实际加载顺序一致）');
    invList.slice(0, 6).forEach(x => info(x));
  }

  let dupGroup = 0; const dupList = [];
  for (const [dir, arr] of Object.entries(dirs)) {
    const g = {}; arr.forEach(x => { const k = x.num + x.suf; (g[k] = g[k] || []).push(x.file); });
    for (const [n, f] of Object.entries(g)) if (f.length > 1) { dupGroup++; dupList.push(dir + ' 前缀 ' + n + ' → ' + f.join(' , ')); }
  }
  if (dupGroup === 0) {
    pass('D2 同目录无重复数字前缀');
  } else {
    warn('D2 ' + dupGroup + ' 组重复前缀（已知存量，阶段 2 修复）');
    dupList.forEach(x => info(x));
  }

  const outOfScheme = order.filter(r => !/^js\/modules\/\d\d-[a-z]/.test(r));
  if (outOfScheme.length === 0) {
    pass('D3 全部模块都在 modules/<NN-分类>/ 下');
  } else {
    warn('D3 ' + outOfScheme.length + ' 个模块游离在分类体系外');
    outOfScheme.forEach(x => info(x));
  }
}

const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  let pkg = null;
  try { pkg = JSON.parse(read(pkgPath)); } catch (e) { fail('D4 package.json 不是合法 JSON: ' + e.message); }
  if (pkg) {
    const s = pkg.scripts || {};
    if (s.test && s.verify) {
      pass('D4 package.json 已有 test/verify 脚本');
    } else {
      warn('D4 package.json 缺少 ' + [!s.test && 'test', !s.verify && 'verify'].filter(Boolean).join(' / ') + ' 脚本（阶段 0 补）');
    }
  }
}

/* ---------- 汇总 ---------- */
head('汇总');
say('  PASS ' + OK + '   FAIL ' + FAIL + '   KNOWN(待修) ' + WARN);
say(FAIL === 0
  ? '\n  \x1b[32m→ 通过，可以提交\x1b[0m\n'
  : '\n  \x1b[31m→ 未通过，不可提交（先修 FAIL）\x1b[0m\n');
process.exit(FAIL === 0 ? 0 : 1);
