# -*- coding: utf-8 -*-
from pathlib import Path
p = Path('public/js/modules/08-account/03-login-modal-flows.js')
t = p.read_text(encoding='utf-8')
assert 'ensureKugouLiteProviderEntry' not in t

def rep1(old, new, label):
    global t
    n = t.count(old)
    if n != 1:
        raise SystemExit(f'anchor {label} count={n}')
    t = t.replace(old, new, 1)
    print('ok', label)

rep1(
    "var LOGIN_WORKFLOW_PROVIDERS = ['netease', 'qq', 'kugou', 'qishui', 'spotify'];",
    "var LOGIN_WORKFLOW_PROVIDERS = ['netease', 'qq', 'kugou', 'kugou-lite', 'qishui', 'spotify'];\nvar kugouLiteQrPollGeneration = 0;\nvar kugouLiteQrPollBusy = false;",
    'providers'
)

rep1(
    "function normalizeLoginProviderKey(provider) {\n  return provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : (provider === 'qishui' ? 'qishui' : (provider === 'spotify' ? 'spotify' : 'netease')));\n}",
    "function normalizeLoginProviderKey(provider) {\n  if (provider === 'qq') return 'qq';\n  if (provider === 'kugou-lite') return 'kugou-lite';\n  if (provider === 'kugou') return 'kugou';\n  if (provider === 'qishui') return 'qishui';\n  if (provider === 'spotify') return 'spotify';\n  return 'netease';\n}",
    'normalize'
)

rep1(
    "  if (provider === 'kugou') return { title: '\u5b98\u7f51', sub: '\u5f39\u51fa\u9177\u72d7\u5b98\u65b9\u7a97\u53e3' };\n  return { title: '\u626b\u7801', sub: '\u8fde\u63a5\u540e\u5f39\u51fa\u5b98\u65b9\u7a97\u53e3' };",
    "  if (provider === 'kugou') return { title: '\u5b98\u7f51', sub: '\u5f39\u51fa\u9177\u72d7\u5b98\u65b9\u7a97\u53e3' };\n  if (provider === 'kugou-lite') return { title: '\u626b\u7801', sub: '\u9177\u72d7\u6982\u5ff5\u7248 App \u626b\u7801' };\n  return { title: '\u626b\u7801', sub: '\u8fde\u63a5\u540e\u5f39\u51fa\u5b98\u65b9\u7a97\u53e3' };",
    'mode text'
)

helper = r'''
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
    btn.innerHTML = '<span class="provider-logo">''' + '\u6982\u5ff5' + r'''</span><b>''' + '\u9177\u72d7\u6982\u5ff5\u7248' + r'''</b><small>''' + '\u626b\u7801\u767b\u5f55 / lite' + r'''</small><span class="flow-port out" data-login-provider-output="kugou-lite" title="''' + '\u62d6\u5230 MR \u63a5\u5165\u53e3' + r'''"></span>';
    if (kugouBtn && kugouBtn.parentNode === tabs) {
      if (kugouBtn.nextSibling) tabs.insertBefore(btn, kugouBtn.nextSibling);
      else tabs.appendChild(btn);
    } else {
      tabs.appendChild(btn);
    }
  } catch (e) { }
}
'''

rep1('function selectLoginProviderNode(provider) {', helper + 'function selectLoginProviderNode(provider) {', 'helper')

rep1(
    'function updateLoginProviderUi() {\n  var meta = platformMeta(loginProvider);',
    'function updateLoginProviderUi() {\n  ensureKugouLiteProviderEntry();\n  var meta = platformMeta(loginProvider);',
    'ui ensure'
)

rep1(
    "  var isKugou = loginProvider === 'kugou';\n  var isQishui = loginProvider === 'qishui';",
    "  var isKugou = loginProvider === 'kugou';\n  var isKugouLite = loginProvider === 'kugou-lite';\n  var isQishui = loginProvider === 'qishui';",
    'flag'
)

lite_ui = (
"  if (isKugouLite) {\n"
"    ensureKugouLiteProviderEntry();\n"
"    var liteBtn = document.getElementById('login-provider-kugou-lite');\n"
"    if (neteaseBtn) neteaseBtn.classList.toggle('active', false);\n"
"    if (qqBtn) qqBtn.classList.toggle('active', false);\n"
"    if (kugouBtn) kugouBtn.classList.toggle('active', false);\n"
"    if (liteBtn) liteBtn.classList.toggle('active', true);\n"
"    if (qishuiBtn) qishuiBtn.classList.toggle('active', false);\n"
"    if (spotifyBtn) spotifyBtn.classList.toggle('active', false);\n"
"    if (title) title.textContent = '\u626b\u7801\u767b\u5f55\u9177\u72d7\u6982\u5ff5\u7248';\n"
"    if (desc) desc.innerHTML = '\u4f7f\u7528 <b>\u9177\u72d7\u6982\u5ff5\u7248 App</b> \u626b\u63cf\u4e8c\u7ef4\u7801\u5e76\u786e\u8ba4\uff0c\u4f1a\u8bdd\u4ec5\u4fdd\u5b58\u5728\u672c\u673a\u3002';\n"
"    if (shell) {\n"
"      shell.classList.remove('web-login-preview', 'qq-preview', 'netease-preview');\n"
"    }\n"
"    if (qqPanel) qqPanel.classList.remove('show', 'spotify-guide-panel');\n"
"    if (qqCookieToggle) qqCookieToggle.classList.remove('show');\n"
"    if (qqCard) qqCard.style.display = 'none';\n"
"    if (st) {\n"
"      st.className = kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn ? 'preview' : '';\n"
"      st.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn)\n"
"        ? ('\u5df2\u767b\u5f55\u9177\u72d7\u6982\u5ff5\u7248 \u00b7 ' + (kugouLiteLoginStatus.nickname || ''))\n"
"        : '\u70b9\u51fb\u201c\u5237\u65b0\u4e8c\u7ef4\u7801\u201d\u5f00\u59cb\u626b\u7801\u767b\u5f55';\n"
"    }\n"
"    if (refreshBtn) {\n"
"      refreshBtn.disabled = false;\n"
"      refreshBtn.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn) ? '\u5237\u65b0\u72b6\u6001' : '\u5237\u65b0\u4e8c\u7ef4\u7801';\n"
"      refreshBtn.onclick = refreshQr;\n"
"    }\n"
"    updateLoginNodeGraphUi();\n"
"    return;\n"
"  }\n"
)

# NOTE: above has Python string concat issue - the JS + needs to be in the output
lite_ui = lite_ui.replace(
"        ? ('\u5df2\u767b\u5f55\u9177\u72d7\u6982\u5ff5\u7248 \u00b7 ' + (kugouLiteLoginStatus.nickname || ''))\n",
"        ? ('\u5df2\u767b\u5f55\u9177\u72d7\u6982\u5ff5\u7248 \u00b7 ' + (kugouLiteLoginStatus.nickname || ''))\n"
)

rep1(
    "  if (qqPanel) qqPanel.classList.remove('spotify-guide-panel');\n  if (spotifyBtn) spotifyBtn.classList.toggle('active', false);",
    lite_ui + "  if (qqPanel) qqPanel.classList.remove('spotify-guide-panel');\n  if (spotifyBtn) spotifyBtn.classList.toggle('active', false);",
    'lite ui'
)

rep1(
    "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);",
    "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  var kugouLiteBtnGen = document.getElementById('login-provider-kugou-lite');\n  if (kugouLiteBtnGen) kugouLiteBtnGen.classList.toggle('active', false);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);",
    'deactivate'
)

refresh_branch = (
"  if (loginProvider === 'kugou-lite') {\n"
"    qrKey = null;\n"
"    var liteStatusEl = document.getElementById('qr-status');\n"
"    var liteImgEl = document.getElementById('qr-img');\n"
"    if (liteImgEl) liteImgEl.src = '';\n"
"    try {\n"
"      var keyRes = await apiJson('/api/kugou-lite/login/qr/key?t=' + Date.now());\n"
"      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;\n"
"      var liteKey = keyRes && (keyRes.key || keyRes.qrcode);\n"
"      if (!liteKey) throw new Error((keyRes && (keyRes.message || keyRes.error)) || '\u83b7\u53d6\u6982\u5ff5\u7248\u4e8c\u7ef4\u7801 key \u5931\u8d25');\n"
"      var createRes = await apiJson('/api/kugou-lite/login/qr/create?key=' + encodeURIComponent(liteKey) + '&qrimg=true&t=' + Date.now());\n"
"      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;\n"
"      var img = createRes && (createRes.img || createRes.base64);\n"
"      if (!img) throw new Error((createRes && (createRes.message || createRes.error)) || '\u751f\u6210\u6982\u5ff5\u7248\u4e8c\u7ef4\u7801\u5931\u8d25');\n"
"      qrKey = liteKey;\n"
"      if (liteImgEl) {\n"
"        liteImgEl.src = img;\n"
"        liteImgEl.alt = '\u9177\u72d7\u6982\u5ff5\u7248\u767b\u5f55\u4e8c\u7ef4\u7801';\n"
"      }\n"
"      if (liteStatusEl) {\n"
"        liteStatusEl.textContent = '\u8bf7\u4f7f\u7528\u9177\u72d7\u6982\u5ff5\u7248 App \u626b\u7801';\n"
"        liteStatusEl.className = '';\n"
"      }\n"
"      startQrPoll();\n"
"    } catch (e) {\n"
"      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;\n"
"      if (liteStatusEl) {\n"
"        liteStatusEl.textContent = '\u51fa\u9519: ' + (e && e.message ? e.message : e);\n"
"        liteStatusEl.className = 'fail';\n"
"      }\n"
"    }\n"
"    return;\n"
"  }\n"
)

rep1(
    "  if (loginProvider === 'kugou') {\n    qrKey = null;\n    var kugouStatus = document.getElementById('qr-status');",
    refresh_branch + "  if (loginProvider === 'kugou') {\n    qrKey = null;\n    var kugouStatus = document.getElementById('qr-status');",
    'refresh branch'
)

rep1(
    "  if (loginProvider === 'qishui') {\n    var generation = qishuiQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollQishuiQr(generation); }, 1200);\n    return;\n  }",
    "  if (loginProvider === 'qishui') {\n    var generation = qishuiQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollQishuiQr(generation); }, 1200);\n    return;\n  }\n  if (loginProvider === 'kugou-lite') {\n    var liteGen = kugouLiteQrPollGeneration;\n    qrPollTimer = setTimeout(function () { pollKugouLiteQr(liteGen); }, 1200);\n    return;\n  }",
    'start poll'
)

rep1(
    "  qishuiQrPollGeneration += 1;\n  qishuiQrPollBusy = false;\n}",
    "  qishuiQrPollGeneration += 1;\n  qishuiQrPollBusy = false;\n  kugouLiteQrPollGeneration += 1;\n  kugouLiteQrPollBusy = false;\n}",
    'stop poll'
)

poll_fn = (
"function scheduleKugouLiteQrPoll(generation, delay) {\n"
"  if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite' || !qrKey) return;\n"
"  if (qrPollTimer) clearTimeout(qrPollTimer);\n"
"  qrPollTimer = setTimeout(function () { pollKugouLiteQr(generation); }, Math.max(1000, Number(delay) || 2000));\n"
"}\n"
"async function pollKugouLiteQr(generation) {\n"
"  if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite' || !qrKey || kugouLiteQrPollBusy) return;\n"
"  kugouLiteQrPollBusy = true;\n"
"  var statusEl = document.getElementById('qr-status');\n"
"  var nextDelay = 2000;\n"
"  try {\n"
"    var result = await apiJson('/api/kugou-lite/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());\n"
"    if (generation !== kugouLiteQrPollGeneration || loginProvider !== 'kugou-lite') return;\n"
"    var stNum = Number(result && result.status);\n"
"    if (result && result.loggedIn) {\n"
"      stopQrPoll();\n"
"      kugouLiteLoginStatus = normalizeKugouLiteLoginStatus(result);\n"
"      activeAccountProvider = 'kugou-lite';\n"
"      markLoginWorkflowConnected('kugou-lite');\n"
"      renderUserBtn();\n"
"      if (statusEl) { statusEl.textContent = '\u767b\u5f55\u6210\u529f\uff01'; statusEl.className = 'scan'; }\n"
"      setTimeout(function () {\n"
"        closeLoginModal();\n"
"        showToast('\u9177\u72d7\u6982\u5ff5\u7248\u5df2\u767b\u5f55: ' + (kugouLiteLoginStatus.nickname || kugouLiteLoginStatus.userId || ''));\n"
"      }, 450);\n"
"      return;\n"
"    }\n"
"    if (stNum === 0 || (result && result.statusLabel === 'expired')) {\n"
"      stopQrPoll();\n"
"      if (statusEl) { statusEl.textContent = '\u4e8c\u7ef4\u7801\u5df2\u8fc7\u671f\uff0c\u8bf7\u5237\u65b0'; statusEl.className = 'fail'; }\n"
"      return;\n"
"    }\n"
"    if (statusEl) {\n"
"      statusEl.textContent = stNum === 2 ? '\u5df2\u626b\u7801\uff0c\u8bf7\u5728\u624b\u673a\u786e\u8ba4\u2026' : '\u7b49\u5f85\u626b\u7801\u786e\u8ba4\u2026';\n"
"      statusEl.className = stNum === 2 ? 'scan' : '';\n"
"    }\n"
"  } catch (e) {\n"
"    nextDelay = 5000;\n"
"    console.warn('Kugou lite QR check failed:', e);\n"
"    if (statusEl) { statusEl.textContent = '\u767b\u5f55\u72b6\u6001\u68c0\u67e5\u5931\u8d25\uff0c\u6b63\u5728\u91cd\u8bd5\u2026'; statusEl.className = 'fail'; }\n"
"  } finally {\n"
"    kugouLiteQrPollBusy = false;\n"
"    scheduleKugouLiteQrPoll(generation, nextDelay);\n"
"  }\n"
"}\n"
)

rep1('async function pollQishuiQr(generation) {', poll_fn + 'async function pollQishuiQr(generation) {', 'poll fn')

rep1(
    "  if (loginProvider === 'kugou') return openKugouWebLogin();\n  if (loginProvider === 'qishui') return openQishuiWebLogin();",
    "  if (loginProvider === 'kugou') return openKugouWebLogin();\n  if (loginProvider === 'kugou-lite') return refreshQr();\n  if (loginProvider === 'qishui') return openQishuiWebLogin();",
    'open web'
)

p.write_text(t, encoding='utf-8')
print('lines', t.count(chr(10))+1)
print('done')