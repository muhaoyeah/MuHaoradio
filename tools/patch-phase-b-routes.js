const fs = require('fs');
const path = require('path');
const root = process.cwd();
const p = path.join(root, 'server.js');
let t = fs.readFileSync(p, 'utf8');

if (t.includes("pn === '/api/kugou-lite/login/qr/key'")) {
  console.log('handlers already present');
  process.exit(0);
}

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
if (!t.includes(anchor)) throw new Error('anchor missing');
t = t.replace(anchor, block + anchor);
fs.writeFileSync(p, t, 'utf8');
console.log('handlers inserted');
