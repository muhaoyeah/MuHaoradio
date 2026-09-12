const fs = require('fs');
const path = require('path');
const root = process.cwd();

// --- main.js ---
{
  const p = path.join(root, 'desktop/main.js');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes("require('./kugou-lite-runtime')")) {
    t = t.replace(
      "const { extractKugouAuth } = require('../kugou-api');",
      "const { extractKugouAuth } = require('../kugou-api');\nconst {\n  startKugouLiteRuntime,\n  stopKugouLiteRuntime,\n  getKugouLiteStatus,\n  healthCheckKugouLite,\n} = require('./kugou-lite-runtime');"
    );
  }
  if (!t.includes('ensureKugouLiteRuntimeStarted')) {
    const helper = `\nasync function ensureKugouLiteRuntimeStarted() {\n  try {\n    const status = await startKugouLiteRuntime();\n    if (status && status.baseUrl) {\n      process.env.MINERADIO_KUGOU_LITE_BASE = status.baseUrl;\n      process.env.MINERADIO_KUGOU_LITE_PORT = String(status.port || '');\n    }\n    console.log('[kugou-lite] ready', status && status.baseUrl);\n    return status;\n  } catch (error) {\n    console.warn('[kugou-lite] start failed:', error && error.message ? error.message : error);\n    return { ok: false, error: error && error.message ? error.message : String(error) };\n  }\n}\n`;
    t = t.replace('async function ensureLocalServerStarted() {', helper + 'async function ensureLocalServerStarted() {');
  }
  if (!t.includes('await ensureKugouLiteRuntimeStarted();')) {
    t = t.replace(
      "writeStartupState('server-ready', { serverReadyAt: Date.now(), port });\n    return localServer;",
      "writeStartupState('server-ready', { serverReadyAt: Date.now(), port });\n    await ensureKugouLiteRuntimeStarted();\n    return localServer;"
    );
  }
  if (!t.includes('stopKugouLiteRuntime()')) {
    t = t.replace(
      "app.on('before-quit', (event) => {",
      "app.on('before-quit', (event) => {\n  try { stopKugouLiteRuntime(); } catch (_) {}"
    );
  }
  if (!t.includes("ipcMain.handle('kugou-lite-health'")) {
    t = t.replace(
      "ipcMain.handle('kugou-music-open-login'",
      "ipcMain.handle('kugou-lite-health', async () => {\n  try {\n    if (!getKugouLiteStatus().port) await ensureKugouLiteRuntimeStarted();\n    return await healthCheckKugouLite();\n  } catch (error) {\n    return { ok: false, error: error && error.message ? error.message : String(error), status: getKugouLiteStatus() };\n  }\n});\n\nipcMain.handle('kugou-music-open-login'"
    );
  }
  fs.writeFileSync(p, t);
  console.log('patched main.js');
}

// --- server.js health ---
{
  const p = path.join(root, 'server.js');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes("/api/kugou-lite/health")) {
    const block = `  if (pn === '/api/kugou-lite/health') {\n    const base = process.env.MINERADIO_KUGOU_LITE_BASE || ('http://127.0.0.1:' + (process.env.MINERADIO_KUGOU_LITE_PORT || process.env.KUGOU_LITE_PORT || '17965'));\n    try {\n      const result = await new Promise((resolve, reject) => {\n        const target = new URL('/', base);\n        const lib = target.protocol === 'https:' ? require('https') : require('http');\n        const req = lib.get({\n          hostname: target.hostname,\n          port: target.port,\n          path: '/',\n          timeout: 2500,\n          headers: { Host: target.host },\n        }, (res) => {\n          res.resume();\n          resolve({ ok: (res.statusCode || 0) > 0 && (res.statusCode || 0) < 500, httpStatus: res.statusCode || 0 });\n        });\n        req.on('error', reject);\n        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });\n      });\n      sendJSON(res, {\n        ok: !!result.ok,\n        provider: 'kugou-lite',\n        platform: 'lite',\n        base,\n        httpStatus: result.httpStatus,\n        message: result.ok ? 'lite runtime reachable' : 'lite runtime unhealthy',\n      }, result.ok ? 200 : 503);\n    } catch (err) {\n      sendJSON(res, {\n        ok: false,\n        provider: 'kugou-lite',\n        platform: 'lite',\n        base,\n        error: err && err.message ? err.message : String(err),\n        message: 'lite runtime not reachable',\n      }, 503);\n    }\n    return;\n  }\n\n`;
    const anchor = "if (pn === '/api/kugou-concept/login/status')";
    if (!t.includes(anchor)) throw new Error('concept status anchor missing');
    t = t.replace(anchor, block + anchor);
    fs.writeFileSync(p, t);
    console.log('patched server.js');
  } else console.log('server health already present');
}

// --- gitignore ---
{
  const p = path.join(root, '.gitignore');
  let t = fs.readFileSync(p, 'utf8');
  const extras = [
    'vendor/KuGouMusicApi/node_modules/',
    'vendor/KuGouMusicApi/.env',
    '.kugou-lite-cookie',
    '.kugou-lite-session.json',
    '.kugou-lite-*',
  ];
  let added = 0;
  for (const line of extras) {
    if (!t.includes(line)) { t += (t.endsWith('\n') ? '' : '\n') + line + '\n'; added++; }
  }
  fs.writeFileSync(p, t);
  console.log('gitignore added', added);
}

// --- package.json ---
{
  const p = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!pkg.build) pkg.build = {};
  if (!Array.isArray(pkg.build.files)) pkg.build.files = [];
  const need = [
    'vendor/KuGouMusicApi/**/*',
    'vendor/KuGouMusicApi/node_modules/**/*',
    'desktop/kugou-lite-runtime.js',
  ];
  let added = 0;
  for (const item of need) {
    if (!pkg.build.files.includes(item)) { pkg.build.files.push(item); added++; }
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
  console.log('package.json files added', added);
}

console.log('phase A patches done');
