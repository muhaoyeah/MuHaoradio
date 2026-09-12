const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'public/js/modules/08-account/03-login-modal-flows.js');
let t = fs.readFileSync(p, 'utf8');

function replaceOnce(re, repl, label) {
  if (!re.test(t)) { console.log('skip/missing', label); return; }
  t = t.replace(re, repl);
  console.log('fixed', label);
}

replaceOnce(
  /btn\.innerHTML = '[\s\S]*?data-login-provider-output="kugou-lite"[\s\S]*?';/,
  "btn.innerHTML = '<span class=\"provider-logo\">概念</span><b>酷狗概念版</b><small>扫码登录 / lite</small><span class=\"flow-port out\" data-login-provider-output=\"kugou-lite\" title=\"拖到 MR 接入口\"></span>';",
  'innerHTML'
);

replaceOnce(
  /if \(provider === 'kugou-lite'\) return \{ title: '扫码', sub: '[^']*' \};/,
  "if (provider === 'kugou-lite') return { title: '扫码', sub: '酷狗概念版 App 扫码' };",
  'mode text'
);

replaceOnce(
  /if \(title\) title\.textContent = '[^\n']*';\r?\n    if \(desc\) desc\.innerHTML = '[^\n']*';/,
  "if (title) title.textContent = '扫码登录酷狗概念版';\n    if (desc) desc.innerHTML = '使用 <b>酷狗概念版 App</b> 扫描二维码并确认，会话仅保存在本机。';",
  'title/desc'
);

replaceOnce(
  /st\.textContent = \(kugouLiteLoginStatus && kugouLiteLoginStatus\.loggedIn\)\r?\n\s*\? \('[^']*' \+ \(kugouLiteLoginStatus\.nickname \|\| ''\)\)\r?\n\s*: '[^']*';/,
  "st.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn)\n        ? ('已登录酷狗概念版 · ' + (kugouLiteLoginStatus.nickname || ''))\n        : '点击“刷新二维码”开始扫码登录';",
  'status text'
);

replaceOnce(
  /refreshBtn\.textContent = \(kugouLiteLoginStatus && kugouLiteLoginStatus\.loggedIn\) \? '[^']*' : '[^']*';/,
  "refreshBtn.textContent = (kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn) ? '刷新状态' : '刷新二维码';",
  'refresh btn'
);

// Insert refreshQr branch before kugou branch if missing
if (!t.includes("/api/kugou-lite/login/qr/key")) {
  const marker = "  if (loginProvider === 'kugou') {\n    qrKey = null;\n    var kugouStatus = document.getElementById('qr-status');";
  if (!t.includes(marker)) throw new Error('kugou refresh marker missing');
  const branch = `  if (loginProvider === 'kugou-lite') {
    qrKey = null;
    var liteStatusEl = document.getElementById('qr-status');
    var liteImgEl = document.getElementById('qr-img');
    if (liteImgEl) liteImgEl.src = '';
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
      if (liteImgEl) {
        liteImgEl.src = img;
        liteImgEl.alt = '酷狗概念版登录二维码';
      }
      if (liteStatusEl) {
        liteStatusEl.textContent = '请使用酷狗概念版 App 扫码';
        liteStatusEl.className = '';
      }
      startQrPoll();
    } catch (e) {
      if (!isLoginRefreshCurrent(refreshProvider, refreshSeq)) return;
      if (liteStatusEl) {
        liteStatusEl.textContent = '出错: ' + (e && e.message ? e.message : e);
        liteStatusEl.className = 'fail';
      }
    }
    return;
  }
` + marker;
  t = t.replace(marker, branch);
  console.log('inserted refreshQr branch');
} else {
  console.log('refreshQr branch already present');
}

// deactivate lite button in general path
if (!t.includes("getElementById('login-provider-kugou-lite')") || !t.includes('kugouLiteBtn.classList.toggle')) {
  const m = "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);";
  if (t.includes(m) && !t.includes('var kugouLiteBtn = document.getElementById')) {
    t = t.replace(m, "  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);\n  var kugouLiteBtn = document.getElementById('login-provider-kugou-lite');\n  if (kugouLiteBtn) kugouLiteBtn.classList.toggle('active', false);\n  if (qishuiBtn) qishuiBtn.classList.toggle('active', isQishui);");
    console.log('added deactivate toggle');
  }
}

// Fix toast / poll success Chinese if garbled
replaceOnce(
  /showToast\('[\s\S]*?' \+ \(kugouLiteLoginStatus\.nickname \|\| kugouLiteLoginStatus\.userId \|\| ''\)\);/,
  "showToast('酷狗概念版已登录: ' + (kugouLiteLoginStatus.nickname || kugouLiteLoginStatus.userId || ''));",
  'toast'
);
replaceOnce(
  /statusEl\.textContent = '[\s\S]*?'; statusEl\.className = 'scan'; \}/,
  "statusEl.textContent = '登录成功！'; statusEl.className = 'scan'; }",
  'success status'
);
replaceOnce(
  /statusEl\.textContent = '[\s\S]*?'; statusEl\.className = 'fail'; \}\n      return;\n    }\n    if \(statusEl\) \{\n      statusEl\.textContent = st === 2/,
  "statusEl.textContent = '二维码已过期，请刷新'; statusEl.className = 'fail'; }\n      return;\n    }\n    if (statusEl) {\n      statusEl.textContent = st === 2",
  'expired'
);
replaceOnce(
  /statusEl\.textContent = st === 2 \? '[^']*' : '[^']*';/,
  "statusEl.textContent = st === 2 ? '已扫码，请在手机确认…' : '等待扫码确认…';",
  'waiting texts'
);
replaceOnce(
  /statusEl\.textContent = '[\s\S]*?'; statusEl\.className = 'fail'; \}\n  \} finally \{\n    kugouLiteQrPollBusy/,
  "statusEl.textContent = '登录状态检查失败，正在重试…'; statusEl.className = 'fail'; }\n  } finally {\n    kugouLiteQrPollBusy",
  'retry text'
);

fs.writeFileSync(p, t, 'utf8');
console.log('done');