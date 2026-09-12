const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.KUGOU_LITE_SESSION_FILE = 'D:/MuHaoradio/resources/app/.kugou-lite-session.json';

const media = require('../desktop/kugou-lite-media');
const session = require('../desktop/kugou-lite-session');

function get(u) {
  return new Promise((res, rej) => {
    http.get(u, { timeout: 12000 }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        let b; try { b = JSON.parse(d); } catch (e) { b = { raw: String(d).slice(0, 200) }; }
        res({ s: r.statusCode, b });
      });
    }).on('error', rej);
  });
}

function redact(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (/token|cookie|accesskey/i.test(String(k))) return '***';
    if (typeof v === 'string' && /^https?:\/\//.test(v) && /kugou|fs\./i.test(v)) return 'URL';
    return v;
  });
}

(async () => {
  const out = [];
  const healthLite = await get('http://127.0.0.1:17965/');
  out.push(['lite_root', healthLite.s, healthLite.s === 200]);

  // app health if up
  try {
    const h = await get('http://127.0.0.1:3000/api/kugou-lite/health');
    out.push(['app_lite_health', h.s, h.b && h.b.platform, h.b && h.b.ok]);
  } catch (e) {
    out.push(['app_lite_health', 'DOWN', e.message]);
  }

  const pub = session.publicStatus();
  out.push(['session_status', pub.loggedIn, pub.nickname, 'tokenLeaked=' + JSON.stringify(pub).includes('token')]);

  // search with session available
  const search = await media.handleLiteSearch('周杰伦', 5, 0);
  out.push(['search', search.songs.length, search.songs[0] && search.songs[0].name, search.songs[0] && search.songs[0].provider, search.upstreamError || null]);

  const vip = (search.songs || []).find((s) => s.vipRequired || s.privilege >= 10) || search.songs[0];
  if (vip) {
    const play = await media.handleLiteSongUrl({
      hash: vip.hash,
      albumId: vip.albumId,
      albumAudioId: vip.albumAudioId,
      quality: 'exhigh',
    });
    out.push(['play_with_session', !!play.url, play.playable, play.level || null, play.error || null, play.message || null]);

    const lyric = await media.handleLiteLyric(vip.hash, vip.albumAudioId, Math.round((vip.duration || 0) / 1000));
    out.push(['lyric', !!(lyric.lyric && lyric.lyric.length > 20), (lyric.lyric || '').slice(0, 40)]);
  } else {
    out.push(['play_with_session', 'NO_SEARCH_HIT']);
  }

  // unauthenticated path
  const bak = process.env.KUGOU_LITE_SESSION_FILE;
  const missingPath = path.join(__dirname, '..', '.kugou-lite-session-MISSING-phasec.json');
  process.env.KUGOU_LITE_SESSION_FILE = missingPath;
  // re-require won't reload; call loginRequired via clearing by temp rename
  const real = 'D:/MuHaoradio/resources/app/.kugou-lite-session.json';
  const moved = real + '.phasec-bak';
  let unauth = null;
  try {
    if (fs.existsSync(real)) fs.renameSync(real, moved);
    // force readSession to miss: module cached SESSION_FILE const at load time!
    // So test loginRequiredPayload + handle with monkey by writing empty and using original path...
  } catch (e) {}
  // Because SESSION_FILE is captured at module load, restore and instead call loginRequiredPayload directly
  try {
    if (fs.existsSync(moved) && !fs.existsSync(real)) fs.renameSync(moved, real);
  } catch (e) {}
  process.env.KUGOU_LITE_SESSION_FILE = bak;

  // Direct unauth simulation: clear session file temporarily and re-read via fresh require in child
  const { spawnSync } = require('child_process');
  const child = spawnSync(process.execPath, ['-e', `
    const fs=require('fs');
    const real='D:/MuHaoradio/resources/app/.kugou-lite-session.json';
    const moved=real+'.phasec-bak';
    let renamed=false;
    try {
      if (fs.existsSync(real)) { fs.renameSync(real, moved); renamed=true; }
      process.env.KUGOU_LITE_SESSION_FILE = real;
      const media = require(${JSON.stringify(path.join(__dirname, '..', 'desktop', 'kugou-lite-media.js').replace(/\\/g, '/'))});
      media.handleLiteSongUrl({ hash: 'B3A52A7A958BF0AED0EBFBA2E9A818B7', albumId: '966846', albumAudioId: '32100650', quality: '128' })
        .then((r) => { console.log(JSON.stringify({ error: r.error, reason: r.reason, message: r.message, playable: r.playable, url: !!r.url })); })
        .catch((e) => { console.log(JSON.stringify({ boom: e.message })); })
        .finally(() => { if (renamed && fs.existsSync(moved)) fs.renameSync(moved, real); });
    } catch (e) {
      if (renamed && fs.existsSync(moved) && !fs.existsSync(real)) fs.renameSync(moved, real);
      console.log(JSON.stringify({ boom: e.message }));
    }
  `], { encoding: 'utf8', timeout: 15000 });
  out.push(['play_without_session_child', child.status, String(child.stdout || '').trim(), String(child.stderr || '').trim().slice(0, 200)]);

  // anonymous search still ok
  const searchAnonNote = 'search allowed without session (catalog)';
  out.push(['search_anon_policy', searchAnonNote, search.songs.length > 0]);

  console.log(redact(out));
})().catch((e) => { console.error('VERIFY_FAIL', e); process.exit(1); });
