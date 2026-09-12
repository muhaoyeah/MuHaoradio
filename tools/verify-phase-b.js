const http = require('http');
const fs = require('fs');
const path = require('path');
const session = require('../desktop/kugou-lite-session');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 10000 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        let body = raw;
        try { body = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

(async () => {
  const out = [];
  const root = await get('http://127.0.0.1:17965/');
  out.push(['lite_root', root.status, typeof root.body === 'object' ? Object.keys(root.body).slice(0,5) : String(root.body).slice(0,80)]);

  const keyRes = await session.proxyLite('/login/qr/key', {});
  const key = session.extractQrKey(keyRes.result.body || {});
  out.push(['qr_key', keyRes.result.httpStatus, !!key, key ? ('len=' + key.length) : 'EMPTY']);

  let createOk = false;
  let base64Len = 0;
  if (key) {
    const createRes = await session.proxyLite('/login/qr/create', { key, qrimg: 'true' });
    const data = (createRes.result.body && createRes.result.body.data) || {};
    const b64 = data.base64 || '';
    createOk = !!b64;
    base64Len = b64.length;
    out.push(['qr_create', createRes.result.httpStatus, createOk, 'base64Len=' + base64Len, !!data.url]);
  } else {
    out.push(['qr_create', 'SKIPPED', false]);
  }

  let checkStatus = null;
  if (key) {
    const checkRes = await session.proxyLite('/login/qr/check', { key });
    const parsed = session.extractCheck(checkRes.result.body || {});
    checkStatus = parsed.status;
    out.push(['qr_check', checkRes.result.httpStatus, 'status=' + parsed.status, 'hasToken=' + !!parsed.token]);
  }

  // session file gitignore + logout clear
  const fake = session.writeSession({ userid: 'test-user-phaseb', token: 'test-token-phaseb', nickname: 'phaseb' });
  const sp = session.sessionPath();
  const exists1 = fs.existsSync(sp);
  const pub = session.publicStatus();
  const hasTokenLeak = JSON.stringify(pub).includes('test-token');
  session.clearSession();
  const exists2 = fs.existsSync(sp);
  out.push(['session_path', sp]);
  out.push(['session_write', !!fake, exists1, 'tokenLeakedInStatus=' + hasTokenLeak]);
  out.push(['session_clear', !exists2]);

  // gitignore check
  const gi = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
  out.push(['gitignore_session', gi.includes('.kugou-lite-session.json') || gi.includes('.kugou-lite-*')]);

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error('VERIFY_FAIL', e && e.message ? e.message : e); process.exit(1); });