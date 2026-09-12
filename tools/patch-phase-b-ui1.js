const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, t) { fs.writeFileSync(path.join(root, rel), t, 'utf8'); console.log('wrote', rel); }

// 1) core-stores: add kugouLiteLoginStatus
{
  const rel = 'public/js/modules/00-state/00-core-stores.js';
  let t = read(rel);
  if (!t.includes('kugouLiteLoginStatus')) {
    t = t.replace(
      "var kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: false, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false };",
      "var kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: false, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false };\nvar kugouLiteLoginStatus = { provider: 'kugou-lite', loggedIn: false, preview: false, nickname: '酷狗概念版', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false, platform: 'lite' };"
    );
    write(rel, t);
  } else console.log('skip core-stores');
}

// 2) login-modal-utils: dual provider keys + meta + status
{
  const rel = 'public/js/modules/08-account/01-login-modal-utils.js';
  let t = read(rel);
  if (!t.includes("'kugou-lite'")) {
    t = t.replace(
      "var ACCOUNT_PROVIDER_KEYS = ['netease', 'qq', 'kugou', 'qishui', 'spotify'];",
      "var ACCOUNT_PROVIDER_KEYS = ['netease', 'qq', 'kugou', 'kugou-lite', 'qishui', 'spotify'];"
    );
    t = t.replace(
      "function normalizeAccountProviderKey(provider) {\n  return provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : (provider === 'qishui' ? 'qishui' : (provider === 'spotify' ? 'spotify' : 'netease')));\n}",
      "function normalizeAccountProviderKey(provider) {\n  if (provider === 'qq') return 'qq';\n  if (provider === 'kugou-lite') return 'kugou-lite';\n  if (provider === 'kugou') return 'kugou';\n  if (provider === 'qishui') return 'qishui';\n  if (provider === 'spotify') return 'spotify';\n  return 'netease';\n}"
    );
    t = t.replace(
      "  if (provider === 'kugou') return { key: 'kugou', short: 'KG', label: '酷狗音乐', app: '酷狗音乐 App', dot: 'kugou' };\n  if (provider === 'qishui')",
      "  if (provider === 'kugou') return { key: 'kugou', short: 'KG', label: '酷狗音乐', app: '酷狗音乐 App', dot: 'kugou' };\n  if (provider === 'kugou-lite') return { key: 'kugou-lite', short: '概念', label: '酷狗概念版', app: '酷狗概念版 App', dot: 'kugou' };\n  if (provider === 'qishui')"
    );
    t = t.replace(
      "  if (provider === 'kugou') return kugouLoginStatus;\n  return provider === 'qq' ? qqLoginStatus : loginStatus;",
      "  if (provider === 'kugou-lite') return kugouLiteLoginStatus;\n  if (provider === 'kugou') return kugouLoginStatus;\n  return provider === 'qq' ? qqLoginStatus : loginStatus;"
    );
    t = t.replace(
      "  return hasPlatformLogin('netease') || hasPlatformLogin('qq') || hasPlatformLogin('kugou') || hasPlatformLogin('qishui') || hasPlatformLogin('spotify');",
      "  return hasPlatformLogin('netease') || hasPlatformLogin('qq') || hasPlatformLogin('kugou') || hasPlatformLogin('kugou-lite') || hasPlatformLogin('qishui') || hasPlatformLogin('spotify');"
    );
    t = t.replace(
      "  var fill = provider === 'qq' ? '#bfd66b' : (provider === 'kugou' ? '#56e0ff' : (provider === 'qishui' ? '#45d68f' : (provider === 'spotify' ? '#1ed760' : '#d95b67')));\n  var bg = provider === 'qq' ? '#11150b' : (provider === 'kugou' ? '#071722' : (provider === 'qishui' ? '#071a12' : (provider === 'spotify' ? '#06140a' : '#180b0f')));",
      "  var fill = provider === 'qq' ? '#bfd66b' : ((provider === 'kugou' || provider === 'kugou-lite') ? '#56e0ff' : (provider === 'qishui' ? '#45d68f' : (provider === 'spotify' ? '#1ed760' : '#d95b67')));\n  var bg = provider === 'qq' ? '#11150b' : ((provider === 'kugou' || provider === 'kugou-lite') ? '#071722' : (provider === 'qishui' ? '#071a12' : (provider === 'spotify' ? '#06140a' : '#180b0f')));"
    );
    write(rel, t);
  } else console.log('skip utils');
}

console.log('ui part1 done');
