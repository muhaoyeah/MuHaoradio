'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const net = require('net');

const DEFAULT_PORT = 17965;
const HOST = '127.0.0.1';

let child = null;
let runtimePort = 0;
let startPromise = null;

function vendorRoot() {
  return path.join(__dirname, '..', 'vendor', 'KuGouMusicApi');
}

function resolveNodeBinary() {
  const candidates = [
    process.env.MINERADIO_NODE_PATH,
    process.env.NODE_BINARY,
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch (_) {}
  }
  return 'node';
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: HOST, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => { try { socket.destroy(); } catch (_) {} resolve(false); });
  });
}

function httpGetJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs || 2500 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; if (raw.length > 200000) raw = raw.slice(0, 200000); });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: raw });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function waitReady(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 20000);
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const r = await httpGetJson('http://' + HOST + ':' + port + '/', 1500);
      if (r.status > 0 && r.status < 500) return true;
    } catch (e) { lastErr = e; }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw lastErr || new Error('kugou-lite not ready');
}

function ensureEnvFile(root) {
  const envPath = path.join(root, '.env');
  const wanted = 'platform=lite\nPORT=' + DEFAULT_PORT + '\nHOST=' + HOST + '\n';
  try {
    if (!fs.existsSync(envPath) || !String(fs.readFileSync(envPath, 'utf8')).includes('platform=lite')) {
      fs.writeFileSync(envPath, wanted, 'utf8');
    }
  } catch (_) {}
}

async function startKugouLiteRuntime(opts) {
  opts = opts || {};
  if (child && !child.killed && runtimePort) {
    if (await isPortOpen(runtimePort)) return getStatus();
  }
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const root = vendorRoot();
    if (!fs.existsSync(path.join(root, 'app.js'))) {
      throw new Error('KuGouMusicApi missing at vendor/KuGouMusicApi');
    }
    if (!fs.existsSync(path.join(root, 'node_modules'))) {
      throw new Error('KuGouMusicApi dependencies missing; run tools/install-kugou-lite.cmd');
    }
    ensureEnvFile(root);

    let port = Number(opts.port || process.env.KUGOU_LITE_PORT || DEFAULT_PORT);
    if (await isPortOpen(port)) {
      // Reuse an already-running local lite server.
      runtimePort = port;
      await waitReady(port, 5000);
      return getStatus();
    }

    const nodeBin = resolveNodeBinary();
    const env = Object.assign({}, process.env, {
      platform: 'lite',
      PORT: String(port),
      HOST: HOST,
      KUGOU_API_PLATFORM: 'lite',
    });
    // Never inherit a broken Electron-as-node accidentally for child path resolution noise.
    delete env.ELECTRON_RUN_AS_NODE;

    child = spawn(nodeBin, ['app.js'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    runtimePort = port;

    child.stdout.on('data', (buf) => {
      const s = String(buf || '').trim();
      if (s) console.log('[kugou-lite]', s.slice(0, 300));
    });
    child.stderr.on('data', (buf) => {
      const s = String(buf || '').trim();
      if (s) console.warn('[kugou-lite]', s.slice(0, 300));
    });
    child.on('exit', (code, signal) => {
      console.warn('[kugou-lite] exited', code, signal || '');
      child = null;
      runtimePort = 0;
    });

    await waitReady(port, opts.timeoutMs || 25000);
    return getStatus();
  })().finally(() => { startPromise = null; });

  return startPromise;
}

function stopKugouLiteRuntime() {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      child = null;
      runtimePort = 0;
      resolve({ ok: true, stopped: false });
      return;
    }
    const proc = child;
    child = null;
    runtimePort = 0;
    try {
      proc.once('exit', () => resolve({ ok: true, stopped: true }));
      proc.kill();
      setTimeout(() => {
        try { if (!proc.killed) proc.kill('SIGKILL'); } catch (_) {}
        resolve({ ok: true, stopped: true });
      }, 2000);
    } catch (e) {
      resolve({ ok: false, error: e.message || String(e) });
    }
  });
}

function getStatus() {
  return {
    ok: !!(runtimePort && (child || true)),
    running: !!(child && !child.killed),
    reused: !child && !!runtimePort,
    host: HOST,
    port: runtimePort || 0,
    baseUrl: runtimePort ? ('http://' + HOST + ':' + runtimePort) : '',
    platform: 'lite',
    vendor: vendorRoot(),
  };
}

async function healthCheck() {
  let status = getStatus();
  if (!status.port) {
    if (await isPortOpen(DEFAULT_PORT)) {
      runtimePort = DEFAULT_PORT;
      status = getStatus();
    } else {
      return { ok: false, error: 'not-started', status };
    }
  }
  try {
    const r = await httpGetJson(status.baseUrl + '/', 2500);
    return {
      ok: r.status > 0 && r.status < 500,
      httpStatus: r.status,
      platform: 'lite',
      status,
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e), status };
  }
}

module.exports = {
  startKugouLiteRuntime,
  stopKugouLiteRuntime,
  getKugouLiteStatus: getStatus,
  healthCheckKugouLite: healthCheck,
  KUGOU_LITE_DEFAULT_PORT: DEFAULT_PORT,
  KUGOU_LITE_HOST: HOST,
};


