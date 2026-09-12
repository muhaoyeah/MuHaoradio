const fs = require('fs');
const path = require('path');
const root = process.cwd();

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, t) { fs.writeFileSync(path.join(root, rel), t, 'utf8'); console.log('wrote', rel); }
function once(hay, needle, insert, label) {
  if (hay.includes(insert.trim().slice(0, 40))) { console.log('skip', label); return hay; }
  if (!hay.includes(needle)) throw new Error('anchor missing for ' + label + ': ' + needle.slice(0, 80));
  return hay.replace(needle, insert + needle);
}

// ---------- helper module ----------
{
  const rel = 'desktop/kugou-lite-session.js';
  const body = `'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const SESSION_FILE = process.env.KUGOU_LITE_SESSION_FILE
  || path.join(__dirname, '..', '.kugou-lite-session.json');

function liteBase() {
  return process.env.MINERADIO_KUGOU_LITE_BASE
    || ('http://127.0.0.1:' + (process.env.MINERADIO_KUGOU_LITE_PORT || process.env.KUGOU_LITE_PORT || '17965'));
}

function sessionPath() { return SESSION_FILE; }

function readSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    const userid = String(raw.userid || raw.userId || '').trim();
    const token = String(raw.token || '').trim();
    if (!userid || !token) return null;
    return {
      provider: 'kugou-lite',
      loggedIn: true,
      userid,
      userId: userid,
      token,
      nickname: String(raw.nickname || raw.nick_name || '酷狗概念版').trim() || '酷狗概念版',
      avatar: String(raw.avatar || ''),
      savedAt: Number(raw.savedAt || 0) || 0,
      platform: 'lite',
    };
  } catch (_) {
    return null;
  }
}

function writeSession(data) {
  const userid = String((data && (data.userid || data.userId)) || '').trim();
  const token = String((data && data.token) || '').trim();
  if (!userid || !token) {
    clearSession();
    return null;
  }
  const payload = {
    provider: 'kugou-lite',
    platform: 'lite',
    userid,
    token,
    nickname: String((data && (data.nickname || data.nick_name)) || '酷狗概念版').trim() || '酷狗概念版',
    avatar: String((data && data.avatar) || ''),
    savedAt: Date.now(),
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return readSession();
}

function clearSession() {
  try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE); } catch (_) {}
  return { provider: 'kugou-lite', loggedIn: false, ok: true };
}

function publicStatus() {
  const s = readSession();
  if (!s) {
    return {
      provider: 'kugou-lite',
      loggedIn: false,
      platform: 'lite',
      nickname: '酷狗概念版',
      message: '尚未登录酷狗概念版',
    };
  }
  return {
    provider: 'kugou-lite',
    loggedIn: true,
    platform: 'lite',
    userId: s.userId,
    userid: s.userid,
    nickname: s.nickname,
    avatar: s.avatar,
    savedAt: s.savedAt,
    message: '已登录酷狗概念版',
    // never expose token to clients in status
  };
}

function httpJson(targetUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      timeout: timeoutMs || 8000,
      headers: { Accept: 'application/json', Host: u.host },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; if (raw.length > 500000) raw = raw.slice(0, 500000); });
      res.on('end', () => {
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch (_) { body = { raw }; }
        resolve({ httpStatus: res.statusCode || 0, body, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function proxyLite(pathname, query) {
  const base = liteBase();
  const u = new URL(pathname, base.endsWith('/') ? base : base + '/');
  const q = query && typeof query === 'object' ? query : {};
  Object.keys(q).forEach((k) => {
    if (q[k] === undefined || q[k] === null || q[k] === '') return;
    u.searchParams.set(k, String(q[k]));
  });
  u.searchParams.set('timestamp', String(Date.now()));
  const result = await httpJson(u.toString(), 10000);
  return { base, url: u.toString().replace(/token=[^&]+/gi, 'token=***'), result };
}

function extractQrKey(body) {
  const d = body && (body.data || body);
  if (!d || typeof d !== 'object') return '';
  return String(d.qrcode || d.key || d.unikey || d.qrcode_key || '').trim();
}

function extractCheck(body) {
  const d = (body && body.data) || body || {};
  const status = Number(d.status != null ? d.status : (body && body.status));
  return {
    status: Number.isFinite(status) ? status : -1,
    token: String(d.token || '').trim(),
    userid: String(d.userid || d.userId || d.user_id || '').trim(),
    nickname: String(d.nickname || d.nick_name || d.username || '').trim(),
    avatar: String(d.pic || d.avatar || d.headimg || '').trim(),
    message: String((body && (body.message || body.msg)) || d.message || ''),
  };
}

module.exports = {
  liteBase,
  sessionPath,
  readSession,
  writeSession,
  clearSession,
  publicStatus,
  proxyLite,
  extractQrKey,
  extractCheck,
};
`;
  write(rel, body);
}

// ---------- server.js ----------
{
  let t = read('server.js');

  if (!t.includes("require('./desktop/kugou-lite-session')") && !t.includes('kugou-lite-session')) {
    const reqLine = "const { planCuefieldTransitionFromCache } = require('./cuefield/mineradio-bridge');";
    if (!t.includes(reqLine)) throw new Error('require anchor missing');
    t = t.replace(reqLine, reqLine + "\nconst kugouLiteSession = require('./desktop/kugou-lite-session');");
  }

  const protectAdd = [
    "  '/api/kugou-lite/login/qr/key',",
    "  '/api/kugou-lite/login/qr/create',",
    "  '/api/kugou-lite/login/qr/check',",
    "  '/api/kugou-lite/login/status',",
    "  '/api/kugou-lite/logout',",
  ];
  for (const line of protectAdd) {
    if (!t.includes(line)) {
      t = t.replace("  '/api/qishui/login/check',", "  '/api/qishui/login/check',\n" + line);
    }
  }

  if (!t.includes("/api/kugou-lite/login/qr/key")) {
    const block = `
  if (pn === '/api/kugou-lite/login/qr/key') {
    try {
      const { result } = await kugouLiteSession.proxyLite('/login/qr/key', {});
      const body = result.body || {};
      const key = kugouLiteSession.extractQrKey(body);
      sendJSON(res, {
        provider: 'kugou-lite',
        ok: !!key,
        key,
        qrcode: key,
        data: body.data || body,
        httpStatus: result.httpStatus,
      }, key ? 200 : (result.httpStatus || 502));
    } catch (err) {
      sendJSON(res, { provider: 'kugou-lite', ok: false, error: err && err.message ? err.message : String(err) }, 503);
    }
    return;
  }

  if (pn === '/api/kugou-lite/login/qr/create') {
    try {
      const key = url.searchParams.get('key') || url.searchParams.get('qrcode') || '';
      if (!key) { sendJSON(res, { provider: 'kugou-lite', error: 'MISSING_KEY' }, 400); return; }
      const qrimg = url.searchParams.get('qrimg') !== 'false';
      const { result } = await kugouLiteSession.proxyLite('/login/qr/create', { key, qrimg: qrimg ? 'true' : '' });
      const data = (result.body && result.body.data) || {};
      const base64 = data.base64 || data.qrimg || '';
      sendJSON(res, {
        provider: 'kugou-lite',
        ok: !!(base64 || data.url),
        key,
        url: data.url || '',
        img: base64,
        base64,
        httpStatus: result.httpStatus,
      }, (base64 || data.url) ? 200 : (result.httpStatus || 502));
    } catch (err) {
      sendJSON(res, { provider: 'kugou-lite', ok: false, error: err && err.message ? err.message : String(err) }, 503);
    }
    return;
  }

  if (pn === '/api/kugou-lite/login/qr/check') {
    try {
      const key = url.searchParams.get('key') || url.searchParams.get('qrcode') || '';
      if (!key) { sendJSON(res, { provider: 'kugou-lite', error: 'MISSING_KEY' }, 400); return; }
      const { result } = await kugouLiteSession.proxyLite('/login/qr/check', { key });
      const parsed = kugouLiteSession.extractCheck(result.body || {});
      let loggedIn = false;
      let statusInfo = null;
      if (parsed.status === 4 && parsed.token && parsed.userid) {
        kugouLiteSession.writeSession({
          userid: parsed.userid,
          token: parsed.token,
          nickname: parsed.nickname || '酷狗概念版',
          avatar: parsed.avatar || '',
        });
        loggedIn = true;
        statusInfo = kugouLiteSession.publicStatus();
      }
      const statusLabel = parsed.status === 0 ? 'expired'
        : parsed.status === 1 ? 'waiting'
        : parsed.status === 2 ? 'scanned'
        : parsed.status === 4 ? 'success'
        : 'unknown';
      sendJSON(res, {
        provider: 'kugou-lite',
        ok: true,
        key,
        status: parsed.status,
        statusLabel,
        loggedIn,
        message: parsed.message || (
          statusLabel === 'waiting' ? '等待扫码'
          : statusLabel === 'scanned' ? '已扫码，请在手机确认'
          : statusLabel === 'success' ? '登录成功'
          : statusLabel === 'expired' ? '二维码已过期'
          : '未知状态'
        ),
        userId: loggedIn ? statusInfo.userId : undefined,
        nickname: loggedIn ? statusInfo.nickname : undefined,
        httpStatus: result.httpStatus,
      });
    } catch (err) {
      sendJSON(res, { provider: 'kugou-lite', ok: false, error: err && err.message ? err.message : String(err) }, 503);
    }
    return;
  }

  if (pn === '/api/kugou-lite/login/status') {
    sendJSON(res, kugouLiteSession.publicStatus());
    return;
  }

  if (pn === '/api/kugou-lite/logout') {
    sendJSON(res, kugouLiteSession.clearSession());
    return;
  }

`;
    const anchor = "if (pn === '/api/kugou-concept/login/status')";
    // insert after health block — health ends just before concept status
    if (!t.includes(anchor)) throw new Error('concept status anchor missing');
    // Prefer insert right after health return, before concept
    t = t.replace(anchor, block + anchor);
  } else {
    console.log('server login routes already present');
  }

  write('server.js', t);
}

console.log('phase-b server patch done');
