const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, t) { fs.writeFileSync(path.join(root, rel), t, 'utf8'); console.log('wrote', rel); }

// --- 02-login-status.js ---
{
  const rel = 'public/js/modules/08-account/02-login-status.js';
  let t = read(rel);
  if (!t.includes('refreshKugouLiteLoginStatus')) {
    const block = `
function normalizeKugouLiteLoginStatus(info) {
  var fallback = { provider: 'kugou-lite', loggedIn: false, preview: false, nickname: '酷狗概念版', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false, platform: 'lite' };
  if (!info || !info.loggedIn) return Object.assign({}, fallback, info || {}, { provider: 'kugou-lite', loggedIn: false, platform: 'lite' });
  return Object.assign({}, fallback, info || {}, {
    provider: 'kugou-lite',
    loggedIn: true,
    platform: 'lite',
    userId: String(info.userId || info.userid || ''),
    nickname: info.nickname || '酷狗概念版',
    avatar: info.avatar || '',
    message: info.message || ''
  });
}
async function refreshKugouLiteLoginStatus() {
  try {
    var info = await apiJson('/api/kugou-lite/login/status?t=' + Date.now());
    kugouLiteLoginStatus = normalizeKugouLiteLoginStatus(info);
    if (!hasPlatformLogin(activeAccountProvider)) activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    return kugouLiteLoginStatus;
  } catch (e) {
    console.warn('Kugou lite login status failed:', e);
    kugouLiteLoginStatus = normalizeKugouLiteLoginStatus(null);
    renderUserBtn();
    return kugouLiteLoginStatus;
  }
}
`;
    t = t.replace('async function refreshKugouLoginStatus() {', block + 'async function refreshKugouLoginStatus() {');
    write(rel, t);
  } else console.log('skip status');
}

// --- 04-user-modal-logout.js ---
{
  const rel = 'public/js/modules/08-account/04-user-modal-logout.js';
  let t = read(rel);
  if (!t.includes("activeAccountProvider === 'kugou-lite'")) {
    const block = `  if (activeAccountProvider === 'kugou-lite') {
    try { await apiJson('/api/kugou-lite/logout'); } catch (e) { }
    kugouLiteLoginStatus = { provider: 'kugou-lite', loggedIn: false, preview: false, nickname: '酷狗概念版', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false, platform: 'lite' };
    dualAccountMode = false;
    activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    if (hasAnyPlatformLogin()) updateUserModalUi();
    else closeUserModal();
    showToast('已退出酷狗概念版');
    return;
  }
`;
    t = t.replace("  if (activeAccountProvider === 'kugou') {", block + "  if (activeAccountProvider === 'kugou') {");
    // also clear on logout-all if present
    if (t.includes("apiJson('/api/kugou/logout')") && !t.includes("apiJson('/api/kugou-lite/logout')")) {
      t = t.replace("apiJson('/api/kugou/logout'),", "apiJson('/api/kugou/logout'),\n      apiJson('/api/kugou-lite/logout'),");
    }
    if (t.includes("kugouLoginStatus = { provider: 'kugou'") && !t.includes("kugouLiteLoginStatus = { provider: 'kugou-lite'")) {
      // in clear-all path
      t = t.replace(
        "kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: false, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false };",
        "kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: false, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false };\n  kugouLiteLoginStatus = { provider: 'kugou-lite', loggedIn: false, preview: false, nickname: '酷狗概念版', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, playbackKeyReady: false, platform: 'lite' };"
      );
    }
    write(rel, t);
  } else console.log('skip logout');
}

console.log('status/logout done');
