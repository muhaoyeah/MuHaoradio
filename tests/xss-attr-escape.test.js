// XSS 属性上下文修复（T-07）验证：escapeAttr 转义引号；高危拼接点不再把 escHtml 用于属性值
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// 在 Node 侧复现 escapeAttr / safeMediaUrl 的定义（与 00-api-quality-output.js 保持一致）
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

test('escapeAttr 转义全部属性闭合所需字符', () => {
  assert.strictEqual(escapeAttr('a"b'), 'a&quot;b');
  assert.strictEqual(escapeAttr("a'b"), 'a&#39;b');
  assert.strictEqual(escapeAttr('<img>'), '&lt;img&gt;');
  assert.strictEqual(escapeAttr('a&b'), 'a&amp;b');
  assert.strictEqual(escapeAttr(null), '');
  // 攻击载荷：含引号闭合 + 事件处理器注入
  const evil = '"><script>alert(1)</script>';
  const out = escapeAttr(evil);
  assert.ok(!out.includes('"') && !out.includes('<') && !out.includes('>'), '输出不应含可闭合字符');
});

test('源文件中 escapeAttr / safeMediaUrl 已定义', () => {
  const src = read('public/js/modules/05-playback/00-api-quality-output.js');
  assert.ok(/function escapeAttr\(/.test(src));
  assert.ok(/function safeMediaUrl\(/.test(src));
});

test('搜索历史 data-history-query 属性走 escapeAttr', () => {
  const src = read('public/js/modules/05-playback/07-search.js');
  assert.ok(src.includes('data-history-query="\' + escapeAttr(q)'), '搜索历史属性未转义引号');
});

test('searchThumbHtml 对 src 做协议白名单 + escapeAttr', () => {
  const src = read('public/js/modules/05-playback/07-search.js');
  const fn = src.match(/function searchThumbHtml\(src\) \{[\s\S]*?\n\}/)[0];
  assert.ok(fn.includes('safeMediaUrl'), '缺少协议校验');
  assert.ok(fn.includes('escapeAttr(safe)'), '缺少属性转义');
});

test('歌单详情封面/属性点走 escapeAttr', () => {
  const src = read('public/js/modules/06-lyrics/02-playlist-detail.js');
  assert.ok(src.includes('data-playlist-title="\' + escapeAttr('), '歌单标题属性未转义');
  assert.ok(src.includes('safeMediaUrl(pl && pl.cover'), '歌单封面缺少协议校验');
  assert.ok(src.includes('data-podcast-title="\' + escapeAttr('), '播客标题属性未转义');
});

test('用户存档重命名 input value/title 走 escapeAttr', () => {
  const src = read('public/js/modules/07-fx/00-preset-archive-data.js');
  assert.ok(src.includes('value="\' + escapeAttr(slot.name)'), '存档名 value 未转义');
  assert.ok(src.includes('title="\' + escapeAttr(slot.name)'), '存档名 title 未转义');
});

test('凭证导出在主进程要求可信来源 + 原生确认框', () => {
  const src = read('desktop/main.js');
  const handler = src.match(/ipcMain\.handle\('mineradio-export-login-cookie'[\s\S]*?\n\}\);/)[0];
  assert.ok(handler.includes('isTrustedMainWindowIpc'), '缺可信来源校验');
  assert.ok(handler.includes('dialog.showMessageBox'), '缺主进程原生确认框');
});
