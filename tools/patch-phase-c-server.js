const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
let text = fs.readFileSync(serverPath, 'utf8');

if (!text.includes("require('./desktop/kugou-lite-media')")) {
  if (!text.includes("require('./desktop/kugou-lite-session')")) {
    throw new Error('kugou-lite-session require not found');
  }
  text = text.replace(
    "const kugouLiteSession = require('./desktop/kugou-lite-session');",
    "const kugouLiteSession = require('./desktop/kugou-lite-session');\nconst kugouLiteMedia = require('./desktop/kugou-lite-media');"
  );
}

const routeBlock = `
  if (pn === '/api/kugou-lite/search') {
    try {
      const kw = url.searchParams.get('keywords') || url.searchParams.get('keyword') || '';
      const limit = Math.max(4, Math.min(20, parseInt(url.searchParams.get('limit') || '12', 10) || 12));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      const data = await kugouLiteMedia.handleLiteSearch(kw, limit, offset);
      sendJSON(res, data);
    } catch (err) {
      console.error('[KugouLiteSearch]', err && err.message ? err.message : err);
      sendJSON(res, { provider: 'kugou-lite', platform: 'lite', error: err && err.message ? err.message : String(err), songs: [] }, 500);
    }
    return;
  }

  if (pn === '/api/kugou-lite/song/url') {
    try {
      const info = await kugouLiteMedia.handleLiteSongUrl({
        hash: url.searchParams.get('hash') || url.searchParams.get('id') || '',
        albumId: url.searchParams.get('albumId') || url.searchParams.get('album_id') || '',
        albumAudioId: url.searchParams.get('albumAudioId') || url.searchParams.get('album_audio_id') || url.searchParams.get('mixSongId') || '',
        mixSongId: url.searchParams.get('mixSongId') || '',
        hqHash: url.searchParams.get('hqHash') || url.searchParams.get('hq_hash') || '',
        sqHash: url.searchParams.get('sqHash') || url.searchParams.get('sq_hash') || '',
        resHash: url.searchParams.get('resHash') || url.searchParams.get('res_hash') || '',
        quality: url.searchParams.get('quality') || '',
      });
      const code = info && info.error === 'KUGOU_LITE_LOGIN_REQUIRED' ? 401
        : (info && info.playable === false && info.error === 'KUGOU_LITE_VIP_REQUIRED' ? 403
          : 200);
      sendJSON(res, info, code);
    } catch (err) {
      const code = err && err.code === 'KUGOU_LITE_LOGIN_REQUIRED' ? 401 : 500;
      console.error('[KugouLiteSongUrl]', err && err.message ? err.message : err);
      sendJSON(res, Object.assign(kugouLiteMedia.loginRequiredPayload(), {
        error: err && err.code ? err.code : (err && err.message ? err.message : String(err)),
        message: err && err.message ? err.message : '酷狗概念版播放地址获取失败',
      }), code);
    }
    return;
  }

  if (pn === '/api/kugou-lite/lyric') {
    try {
      const hash = url.searchParams.get('hash') || url.searchParams.get('id') || '';
      const albumAudioId = url.searchParams.get('albumAudioId') || url.searchParams.get('album_audio_id') || '';
      const duration = url.searchParams.get('duration') || '';
      if (!hash) { sendJSON(res, { provider: 'kugou-lite', platform: 'lite', error: 'Missing Kugou hash', lyric: '' }, 400); return; }
      const data = await kugouLiteMedia.handleLiteLyric(hash, albumAudioId, duration);
      sendJSON(res, data);
    } catch (err) {
      console.error('[KugouLiteLyric]', err && err.message ? err.message : err);
      sendJSON(res, { provider: 'kugou-lite', platform: 'lite', error: err && err.message ? err.message : String(err), lyric: '' }, 500);
    }
    return;
  }

`;

if (!text.includes("/api/kugou-lite/search")) {
  const anchor = "  if (pn === '/api/kugou-lite/logout') {\n    sendJSON(res, kugouLiteSession.clearSession());\n    return;\n  }";
  if (!text.includes(anchor)) {
    throw new Error('logout route anchor not found');
  }
  text = text.replace(anchor, anchor + '\n' + routeBlock);
}

// Also allow these paths through any CSRF/auth path allowlist if present
if (text.includes("'/api/kugou-lite/logout'") && !text.includes("'/api/kugou-lite/search'")) {
  text = text.replace(
    "'/api/kugou-lite/logout',",
    "'/api/kugou-lite/logout',\n  '/api/kugou-lite/search',\n  '/api/kugou-lite/song/url',\n  '/api/kugou-lite/lyric',"
  );
}

fs.writeFileSync(serverPath, text, 'utf8');
console.log('server.js patched for phase C routes');
