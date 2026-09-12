'use strict';
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const INSTALL = process.argv[3] || '';
if (!SRC) {
  console.error('Usage: node patch-kugou-lite-clearall.js <sourceRoot> [installRoot]');
  process.exit(1);
}

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('WROTE', p);
}

function patchServer(filePath) {
  let s = read(filePath);
  const needle = 'function clearAllRuntimeLoginCredentials(reason) {';
  if (!s.includes(needle)) throw new Error('clearAllRuntimeLoginCredentials not found in ' + filePath);
  if (s.includes('kugouLiteSession.clearSession()') &&
      s.indexOf('kugouLiteSession.clearSession()') >
      s.indexOf(needle) &&
      s.indexOf('kugouLiteSession.clearSession()') < s.indexOf(needle) + 800) {
    console.log('SKIP server already patched:', filePath);
    return false;
  }
  const oldBlock = `function clearAllRuntimeLoginCredentials(reason) {
  userCookie = '';
  qqCookie = '';
  kugouCookie = '';
  qishuiCookie = '';
  Object.keys(configuredCookieStores).forEach((key) => {
    configuredCookieStores[key].value = '';
  });
  clearNeteaseLoginInfoCache();
  qqVipInfoCache.clear();
  clearQQLikedPlaylistCoverCache();
  clearKugouSessionCaches();
  const qishui = clearQishuiAccessToken();
  const spotify = clearSpotifyToken();
  return {
    ok: true,
    reason: String(reason || 'login-reset'),
    qishui: !qishui || qishui.ok !== false,
    spotify: !spotify || spotify.ok !== false,
  };
}`;
  const newBlock = `function clearAllRuntimeLoginCredentials(reason) {
  userCookie = '';
  qqCookie = '';
  kugouCookie = '';
  qishuiCookie = '';
  Object.keys(configuredCookieStores).forEach((key) => {
    configuredCookieStores[key].value = '';
  });
  clearNeteaseLoginInfoCache();
  qqVipInfoCache.clear();
  clearQQLikedPlaylistCoverCache();
  clearKugouSessionCaches();
  try {
    if (kugouLiteSession && typeof kugouLiteSession.clearSession === 'function') {
      kugouLiteSession.clearSession();
    }
  } catch (_) {}
  const qishui = clearQishuiAccessToken();
  const spotify = clearSpotifyToken();
  return {
    ok: true,
    reason: String(reason || 'login-reset'),
    qishui: !qishui || qishui.ok !== false,
    spotify: !spotify || spotify.ok !== false,
  };
}`;
  if (!s.includes(oldBlock)) throw new Error('Exact clearAllRuntimeLoginCredentials block not found in ' + filePath);
  s = s.replace(oldBlock, newBlock);
  write(filePath, s);
  return true;
}

function patchMain(filePath) {
  let s = read(filePath);
  const needle = 'async function clearAllProviderLoginState(reason) {';
  if (!s.includes(needle)) throw new Error('clearAllProviderLoginState not found in ' + filePath);
  // Already has clearSession in this function?
  const fnStart = s.indexOf(needle);
  const fnEnd = s.indexOf('\n}', fnStart);
  const fnBody = s.slice(fnStart, fnEnd + 2);
  if (fnBody.includes('clearSession')) {
    console.log('SKIP main already patched:', filePath);
    return false;
  }
  const oldBlock = `async function clearAllProviderLoginState(reason) {
  if (localServer && typeof localServer.clearAllLoginCredentials === 'function') {
    const result = localServer.clearAllLoginCredentials(reason || 'login-reset');
    if (!result || result.ok !== true) {
      throw new Error(result && result.error || 'LOCAL_SERVER_LOGIN_STATE_CLEAR_FAILED');
    }
  }
  const results = await Promise.allSettled([
    clearNeteaseMusicLoginSession(),
    clearQQMusicLoginSession(),
    clearKugouMusicLoginSession(),
    clearQishuiMusicLoginSession(),
    clearSpotifyMusicLoginSession(),
  ]);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  return { ok: true };
}`;
  const newBlock = `async function clearAllProviderLoginState(reason) {
  if (localServer && typeof localServer.clearAllLoginCredentials === 'function') {
    const result = localServer.clearAllLoginCredentials(reason || 'login-reset');
    if (!result || result.ok !== true) {
      throw new Error(result && result.error || 'LOCAL_SERVER_LOGIN_STATE_CLEAR_FAILED');
    }
  }
  try {
    const kugouLiteSession = require('./kugou-lite-session');
    if (kugouLiteSession && typeof kugouLiteSession.clearSession === 'function') {
      kugouLiteSession.clearSession();
    }
  } catch (_) {}
  const results = await Promise.allSettled([
    clearNeteaseMusicLoginSession(),
    clearQQMusicLoginSession(),
    clearKugouMusicLoginSession(),
    clearQishuiMusicLoginSession(),
    clearSpotifyMusicLoginSession(),
  ]);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  return { ok: true };
}`;
  if (!s.includes(oldBlock)) throw new Error('Exact clearAllProviderLoginState block not found in ' + filePath);
  s = s.replace(oldBlock, newBlock);
  write(filePath, s);
  return true;
}

function patchGitignore(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('SKIP gitignore missing:', filePath);
    return false;
  }
  let s = read(filePath);
  const needed = [
    'kugou-lite-session.json',
    '**/.kugou-lite-session.json',
    '**/kugou-lite-session.json',
  ];
  let changed = false;
  for (const line of needed) {
    if (!s.split(/\r?\n/).includes(line)) {
      if (!s.endsWith('\n')) s += '\n';
      s += line + '\n';
      changed = true;
      console.log('ADD gitignore', line);
    }
  }
  if (changed) write(filePath, s);
  else console.log('SKIP gitignore already ok:', filePath);
  return changed;
}

function syncFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('SYNC', from, '->', to);
}

const serverSrc = path.join(SRC, 'server.js');
const mainSrc = path.join(SRC, 'desktop', 'main.js');
const giSrc = path.join(SRC, '.gitignore');

patchServer(serverSrc);
patchMain(mainSrc);
patchGitignore(giSrc);

if (INSTALL) {
  syncFile(serverSrc, path.join(INSTALL, 'server.js'));
  syncFile(mainSrc, path.join(INSTALL, 'desktop', 'main.js'));
  // Also patch install copies in case they diverged before sync — sync already overwrote.
  // Ensure install server/main contain the clearSession calls (verify below).
  const giInst = path.join(INSTALL, '.gitignore');
  if (fs.existsSync(giInst)) patchGitignore(giInst);
}

console.log('DONE');
