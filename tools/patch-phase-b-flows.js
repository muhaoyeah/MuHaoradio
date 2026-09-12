const fs = require('fs');
const path = require('path');
const root = process.cwd();
const rel = 'public/js/modules/08-account/03-login-modal-flows.js';
let t = fs.readFileSync(path.join(root, rel), 'utf8');

function mustReplace(oldStr, newStr, label) {
  if (!t.includes(oldStr)) throw new Error('missing anchor: ' + label);
  if (t.includes(newStr.slice(0, Math.min(48, newStr.length))) && label.startsWith('skip-if')) return;
  const n = t.split(oldStr).length - 1;
  if (n !== 1) throw new Error('anchor count ' + n + ' for ' + label);
  t = t.replace(oldStr, newStr);
  console.log('ok', label);
}

if (t.includes("provider === 'kugou-lite'") && t.includes('ensureKugouLiteProviderEntry') && t.includes('pollKugouLiteQr')) {
  console.log('flows already patched');
  process.exit(0);
}

mustReplace(
  "var LOGIN_WORKFLOW_PROVIDERS = ['netease', 'qq', 'kugou', 'qishui', 'spotify'];",
  "var LOGIN_WORKFLOW_PROVIDERS = ['netease', 'qq', 'kugou', 'kugou-lite', 'qishui', 'spotify'];\nvar kugouLiteQrPollGeneration = 0;\nvar kugouLiteQrPollBusy = false;",
  'workflow providers'
);

mustReplace(
  "function normalizeLoginProviderKey(provider) {\n  return provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : (provider === 'qishui' ? 'qishui' : (provider === 'spotify' ? 'spotify' : 'netease')));\n}",
  "function normalizeLoginProviderKey(provider) {\n  if (provider === 'qq') return 'qq';\n  if (provider === 'kugou-lite') return 'kugou-lite';\n  if (provider === 'kugou') return 'kugou';\n  if (provider === 'qishui') return 'qishui';\n  if (provider === 'spotify') return 'spotify';\n  return 'netease';\n}",
  'normalizeLoginProviderKey'
);

mustReplace(
  "  if (provider === 'kugou') return { title: '官网', sub: '弹出酷狗官方窗口' };\n  return { title: '扫码', sub: '连接后弹出官方窗口' };",
  "  if (provider === 'kugou') return { title: '官网', sub: '弹出酷狗官方窗口' };\n  if (provider === 'kugou-lite') return { title: '扫码', sub: '酷狗概念版 App 扫码' };\n  return { title: '扫码', sub: '连接后弹出官方窗口' };",
  'official mode text'
);

// inject helper near selectLoginProviderNode
if (!t.includes('function ensureKugouLiteProviderEntry')) {
  const helper = `
function ensureKugouLiteProviderEntry() {
  try {
    var tabs = document.getElementById('login-platform-tabs');
    if (!tabs || document.getElementById('login-provider-kugou-lite')) return;
    var kugouBtn = document.getElementById('login-provider-kugou');
    var btn = document.createElement('button');
    btn.id = 'login-provider-kugou-lite';
    btn.className = 'kugou workflow-node';
    btn.type = 'button';
    btn.setAttribute('data-login-provider', 'kugou-lite');
    btn.setAttribute('onclick', "selectLoginProviderNode('kugou-lite')");
    btn.innerHTML = '<span class="provider-logo">概念</span><b>酷狗概念版</b><small>扫码登录 / lite</small><span class="flow-port out" data-login-provider-output="kugou-lite" title="拖到 MR 接入口"></span>';
    if (kugouBtn && kugouBtn.parentNode === tabs) {
      if (kugouBtn.nextSibling) tabs.insertBefore(btn, kugouBtn.nextSibling);
      else tabs.appendChild(btn);
    } else {
      tabs.appendChild(btn);
    }
  } catch (e) { }
}
`;
  mustReplace(
    'function selectLoginProviderNode(provider) {',
    helper + 'function selectLoginProviderNode(provider) {',
    'ensure entry helper'
  );
}

// early-return UI block for kugou-lite inside updateLoginProviderUi, after isSpotify vars / before spotify early return is messy.
// Insert right after: var isKugou = loginProvider === 'kugou';
mustReplace(
  "  var isKugou = loginProvider === 'kugou';\n  var isQishui = loginProvider === 'qishui';",
  "  var isKugou = loginProvider === 'kugou';\n  var isKugouLite = loginProvider === 'kugou-lite';\n  var isQishui = loginProvider === 'qishui';",
  'isKugouLite flag'
);

// After spotify early return block ends with `return;\n  }\n  if (qqPanel) qqPanel.classList.remove('spotify-guide-panel');`
// Insert kugou-lite early return before the general path.
if (!t.includes("if (isKugouLite) {")) {
  const liteUi = `  if (isKugouLite) {
    ensureKugouLiteProviderEntry();
    var liteBtn = document.getElementById('login-provider-kugou-lite');
    if (neteaseBtn) neteaseBtn.classList.toggle('active', false);
    if (qqBtn) qqBtn.classList.toggle('active', false);
    if (kugouBtn) kugouBtn.classList.toggle('active', false);
    if (liteBtn) liteBtn.classList.toggle('active', true);
    if (qishuiBtn) qishuiBtn.classList.toggle('active', false);
    if (spotifyBtn) spotifyBtn.classList.toggle('active', false);
    if (title) title.textContent = '扫码登录酷狗概念版';
    if (desc) desc.innerHTML = '使用 <b>酷狗概念版 App</b> 扫描二维码并确认，会话仅保存在本机。';
    if (shell) {
      shell.classList.remove('web-login-preview', 'qq-preview', 'netease-preview');
    }
    if (qqPanel) qqPanel.classList.remove('show', 'spotify-guide-panel');
    if (qqCookieToggle) qqCookieToggle.classList.remove('show');
    if (qqCard) qqCard.style.display = 'none';
    if (st) {
      st.className = kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn ? 'preview' : '';
      st.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn)
        ? ('已登录酷狗概念版 · ' + (kugouLiteLoginStatus.nickname || ''))
        : '点击“刷新二维码”开始扫码登录';
    }
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn) ? '刷新状态' : '刷新二维码';
      refreshBtn.onclick = refreshQr;
    }
    updateLoginNodeGraphUi();
    return;
  }
`;
  mustReplace(
    "  if (qqPanel) qqPanel.classList.remove('spotify-guide-panel');\n  if (spotifyBtn) spotifyBtn.classList.toggle('active', false);",
    liteUi + "  if (qqPanel) qqPanel.classList.remove('spotify-guide-panel');\n  if (spotifyBtn) spotifyBtn.classList.toggle('active', false);",
    'lite ui early return'
  );
}

// Also mark lite btn inactive in general path
if (!t.includes("login-provider-kugou-lite')")) {
  // already have getElementById in early return; add inactive toggle in general path
  mustReplace(
    "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);",
    "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  var kugouLiteBtn = document.getElementById('login-provider-kugou-lite');\n  if (kugouLiteBtn) kugouLiteBtn.classList.toggle('active', false);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);",
    'deactivate lite in general'
  );
}

// refreshQr branch for kugou-lite (before kugou)
if (!t.includes("loginProvider === 'kugou-lite'")) {
  const refreshBranch = `  if (loginProvider === 'kugou-lite') {
    qrKey = null;
    var liteStatus = document.getElementById('qr-status');
    var liteImg = document.getElementById('qr-img');
    if (liteImg) liteImg.src = '';
    try {
      var keyRes = await apiJson('/api/kugou-lite/login/qr/key?t=' + Date.now());
      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;
      var liteKey = keyRes && (keyRes.key || keyRes.qrcode);
      if (!liteKey) throw new Error((keyRes && (keyRes.message || keyRes.error)) || '获取概念版二维码 key 失败');
      var createRes = await apiJson('/api/kugou-lite/login/qr/create?key=' + encodeURIComponent(liteKey) + '&qrimg=true&t=' + Date.now());
      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;
      var img = createRes && (createRes.img || createRes.base64);
      if (!img) throw new Error((createRes && (createRes.message || createRes.error)) || '生成概念版二维码失败');
      qrKey = liteKey;
      if (liteImg) {
        liteImg.src = img;
        liteImg.alt = '酷狗概念版登录二维码';
      }
      if (liteStatus) {
        liteStatus.textContent = '请使用酷狗概念版 App 扫码';
        liteStatus.className = '';
      }
      startQrPoll();
    } catch (e) {
      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;
      if (liteStatus) {
        liteStatus.textContent = '出错: ' + (e && e.message ? e.message : e);
        liteStatus.className = 'fail';
      }
    }
    return;
  }
`;
  mustReplace(
    "  if (loginProvider === 'kugou') {\n    qrKey = null;\n    var kugouStatus = document.getElementById('qr-status');",
    refreshBranch + "  if (loginProvider === 'kugou') {\n    qrKey = null;\n    var kugouStatus = document.getElementById('qr-status');",
    'refreshQr lite branch'
  );
}

// startQrPoll + stopQrPoll + poll function
mustReplace(
  "  if (loginProvider === 'qishui') {\n    var generation = qishuiQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollQishuiQr(generation); }, 1200);\n    return;\n  }",
  "  if (loginProvider === 'qishui') {\n    var generation = qishuiQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollQishuiQr(generation); }, 1200);\n    return;\n  }\n  if (loginProvider === 'kugou-lite') {\n    var liteGen = kugouLiteQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollKugouLiteQr(liteGen); }, 1200);\n    return;\n  }",
  'startQrPoll lite'
);

mustReplace(
  "  qishuiQrPollGeneration += 1;\n  qishuiQrPollBusy = false;\n}",
  "  qishuiQrPollGeneration += 1;\n  qishuiQrPollBusy = false;\n  kugouLiteQrPollGeneration += 1;\n  kugouLiteQrPollBusy = false;\n}",
  'stopQrPoll lite'
);

if (!t.includes('async function pollKugouLiteQr')) {
  const pollFn = `
function scheduleKugouLiteQrPoll(generation, delay) {
  if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite' || !qrKey) return;
  if (qrPollTimer) clearTimeout(qrPollTimer);
  qrPollTimer = setTimeout(function () { pollKugouLiteQr(generation); }, Math.max(1000, Number(delay) || 2000));
}
async function pollKugouLiteQr(generation) {
  if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite' || !qrKey || kugouLiteQrPollBusy) return;
  kugouLiteQrPollBusy = true;
  var statusEl = document.getElementById('qr-status');
  var nextDelay = 2000;
  try {
    var result = await apiJson('/api/kugou-lite/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
    if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite') return;
    var st = Number(result && result.status);
    if (result && result.loggedIn) {
      stopQrPoll();
      kugouLiteLoginStatus = normalizeKugouLiteLoginStatus(result);
      activeAccountProvider = 'kugou-lite';
      markLoginWorkflowConnected('kugou-lite');
      renderUserBtn();
      if (statusEl) { statusEl.textContent = '登录成功！'; statusEl.className = 'scan'; }
      setTimeout(function () {
        closeLoginModal();
        showToast('酷狗概念版已登录: ' + (kugouLiteLoginStatus.nickname || kugouLiteLoginStatus.userId || ''));
      }, 450);
      return;
    }
    if (st === 0 || (result && result.statusLabel === 'expired')) {
      stopQrPoll();
      if (statusEl) { statusEl.textContent = '二维码已过期，请刷新'; statusEl.className = 'fail'; }
      return;
    }
    if (statusEl) {
      statusEl.textContent = st === 2 ? '已扫码，请在手机确认…' : '等待扫码确认…';
      statusEl.className = st === 2 ? 'scan' : '';
    }
  } catch (e) {
    nextDelay = 5000;
    console.warn('Kugou lite QR check failed:', e);
    if (statusEl) { statusEl.textContent = '登录状态检查失败，正在重试…'; statusEl.className = 'fail'; }
  } finally {
    kugouLiteQrPollBusy = false;
    scheduleKugouLiteQrPoll(generation, nextDelay);
  }
}
`;
  mustReplace(
    'async function pollQishuiQr(generation) {',
    pollFn + 'async function pollQishuiQr(generation) {',
    'pollKugouLiteQr'
  );
}

// ensure entry on setLoginProvider / open modal path — hook updateLoginProviderUi start
mustReplace(
  'function updateLoginProviderUi() {\n  var meta = platformMeta(loginProvider);',
  "function updateLoginProviderUi() {\n  ensureKugouLiteProviderEntry();\n  var meta = platformMeta(loginProvider);",
  'ensure on ui update'
);

// openProviderWebLogin: lite uses refreshQr
mustReplace(
  "  if (loginProvider === 'kugou') return openKugouWebLogin();\n  if (loginProvider === 'qishui') return openQishuiWebLogin();",
  "  if (loginProvider === 'kugou') return openKugouWebLogin();\n  if (loginProvider === 'kugou-lite') return refreshQr();\n  if (loginProvider === 'qishui') return openQishuiWebLogin();",
  'openProviderWebLogin lite'
);

fs.writeFileSync(path.join(root, rel), t, 'utf8');
console.log('flows patched');
