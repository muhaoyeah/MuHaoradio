const http = require('http');
function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:43880' + path, { timeout: 12000 }, (res) => {
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
  const health = await get('/api/kugou-lite/health');
  console.log('health', health.status, health.body && { ok: health.body.ok, platform: health.body.platform, provider: health.body.provider });

  const key = await get('/api/kugou-lite/login/qr/key');
  const k = key.body && (key.body.key || key.body.qrcode);
  console.log('key', key.status, !!k, k ? ('len=' + String(k).length) : '', key.body && key.body.error);

  const create = await get('/api/kugou-lite/login/qr/create?key=' + encodeURIComponent(k || 'x') + '&qrimg=true');
  const img = create.body && (create.body.img || create.body.base64);
  console.log('create', create.status, !!img, img ? ('imgLen=' + String(img).length) : '', create.body && create.body.error);

  const check = await get('/api/kugou-lite/login/qr/check?key=' + encodeURIComponent(k || 'x'));
  console.log('check', check.status, check.body && { status: check.body.status, statusLabel: check.body.statusLabel, loggedIn: check.body.loggedIn, message: check.body.message });

  const st1 = await get('/api/kugou-lite/login/status');
  console.log('status', st1.status, st1.body && { loggedIn: st1.body.loggedIn, hasToken: !!(st1.body.token) });

  const logout = await get('/api/kugou-lite/logout');
  console.log('logout', logout.status, logout.body && { ok: logout.body.ok, loggedIn: logout.body.loggedIn });
})().catch((e) => { console.error(e); process.exit(1); });