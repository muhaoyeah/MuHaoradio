'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const SESSION_BASENAME = 'kugou-lite-session.json';
const LEGACY_DOT_BASENAME = '.kugou-lite-session.json';

function mineradioUserDataDir() {
  const fromEnv = String(process.env.MINERADIO_USER_DATA || '').trim();
  if (fromEnv && path.isAbsolute(fromEnv)) return path.resolve(fromEnv);
  if (process.env.APPDATA) return path.join(process.env.APPDATA, 'Mineradio');
  if (process.env.HOME) return path.join(process.env.HOME, '.config', 'Mineradio');
  return path.join(__dirname, '..');
}

function primarySessionPath() {
  const fromEnv = String(process.env.KUGOU_LITE_SESSION_FILE || '').trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(mineradioUserDataDir(), SESSION_BASENAME);
}

function legacySessionCandidates() {
  const primary = primarySessionPath();
  const userData = mineradioUserDataDir();
  const appRoot = path.join(__dirname, '..');
  const desktopDir = __dirname;
  const list = [
    path.join(userData, LEGACY_DOT_BASENAME),
    path.join(userData, SESSION_BASENAME),
    path.join(appRoot, LEGACY_DOT_BASENAME),
    path.join(appRoot, SESSION_BASENAME),
    path.join(desktopDir, LEGACY_DOT_BASENAME),
    path.join(desktopDir, SESSION_BASENAME),
    path.join(process.cwd(), LEGACY_DOT_BASENAME),
    path.join(process.cwd(), SESSION_BASENAME),
  ];
  const out = [];
  const seen = new Set();
  for (const candidate of list) {
    const resolved = path.resolve(candidate);
    if (resolved === path.resolve(primary)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

function sessionPath() {
  return primarySessionPath();
}

function parseSessionRaw(raw) {
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
}

function readSessionFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parseSessionRaw(raw);
  } catch (_) {
    return null;
  }
}

function migrateSessionToPrimary() {
  const primary = primarySessionPath();
  if (readSessionFile(primary)) return primary;
  let best = null;
  for (const candidate of legacySessionCandidates()) {
    const parsed = readSessionFile(candidate);
    if (!parsed) continue;
    let mtimeMs = 0;
    try { mtimeMs = fs.statSync(candidate).mtimeMs; } catch (_) { mtimeMs = 0; }
    if (!best || mtimeMs > best.mtimeMs) best = { file: candidate, mtimeMs, parsed };
  }
  if (!best) return primary;
  try {
    fs.mkdirSync(path.dirname(primary), { recursive: true });
    fs.copyFileSync(best.file, primary);
    try { fs.utimesSync(primary, new Date(), new Date(best.mtimeMs)); } catch (_) {}
  } catch (_) {
    // Fall through: still readable from legacy until next write.
  }
  return primary;
}

function readSession() {
  const primary = migrateSessionToPrimary();
  const fromPrimary = readSessionFile(primary);
  if (fromPrimary) return fromPrimary;
  for (const candidate of legacySessionCandidates()) {
    const parsed = readSessionFile(candidate);
    if (parsed) return parsed;
  }
  return null;
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
  const primary = primarySessionPath();
  fs.mkdirSync(path.dirname(primary), { recursive: true });
  fs.writeFileSync(primary, JSON.stringify(payload, null, 2), 'utf8');
  return readSession();
}

function clearSession() {
  const targets = [primarySessionPath()].concat(legacySessionCandidates());
  const seen = new Set();
  for (const file of targets) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    try { if (fs.existsSync(resolved)) fs.unlinkSync(resolved); } catch (_) {}
  }
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

function liteBase() {
  return process.env.MINERADIO_KUGOU_LITE_BASE
    || ('http://127.0.0.1:' + (process.env.MINERADIO_KUGOU_LITE_PORT || process.env.KUGOU_LITE_PORT || '17965'));
}

function httpJson(targetUrl, timeoutMs) {
  return httpJsonRequest(targetUrl, { method: 'GET', timeoutMs: timeoutMs || 8000 });
}

function httpJsonRequest(targetUrl, opts) {
  opts = opts || {};
  const method = String(opts.method || 'GET').toUpperCase();
  const timeoutMs = Number(opts.timeoutMs) || 10000;
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === 'https:' ? https : http;
    let payload = null;
    const headers = {
      Accept: 'application/json',
      Host: u.host,
    };
    if (method !== 'GET' && method !== 'HEAD') {
      if (opts.form != null) {
        if (typeof opts.form === 'string') payload = opts.form;
        else if (opts.form && typeof opts.form === 'object') {
          payload = Object.keys(opts.form).map((k) => {
            if (opts.form[k] === undefined || opts.form[k] === null) return '';
            return encodeURIComponent(k) + '=' + encodeURIComponent(String(opts.form[k]));
          }).filter(Boolean).join('&');
        } else payload = '';
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
      } else {
        const bodyObj = opts.body === undefined ? {} : opts.body;
        payload = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj == null ? {} : bodyObj);
        headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      headers['Content-Length'] = Buffer.byteLength(payload || '');
    }
    const req = lib.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      timeout: timeoutMs,
      headers,
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
    if (payload != null) req.write(payload);
    req.end();
  });
}

async function proxyLite(pathname, query, opts) {
  opts = opts || {};
  const method = String(opts.method || 'GET').toUpperCase();
  const base = liteBase();
  const u = new URL(pathname, base.endsWith('/') ? base : base + '/');
  const q = query && typeof query === 'object' ? query : {};
  Object.keys(q).forEach((k) => {
    if (q[k] === undefined || q[k] === null || q[k] === '') return;
    u.searchParams.set(k, String(q[k]));
  });
  u.searchParams.set('timestamp', String(Date.now()));
  const reqOpts = { method, timeoutMs: Number(opts.timeoutMs) || 10000 };
  if (method !== 'GET' && method !== 'HEAD') {
    if (opts.form != null) reqOpts.form = opts.form;
    else reqOpts.body = opts.body === undefined ? {} : opts.body;
  }
  const result = await httpJsonRequest(u.toString(), reqOpts);
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
  primarySessionPath,
  legacySessionCandidates,
  readSession,
  writeSession,
  clearSession,
  publicStatus,
  proxyLite,
  httpJson,
  httpJsonRequest,
  extractQrKey,
  extractCheck,
};