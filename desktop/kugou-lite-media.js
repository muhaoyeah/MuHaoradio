'use strict';

const kugouLiteSession = require('./kugou-lite-session');

const LITE_QUALITY_CHAIN = [
  { ui: 'hires', lite: 'high', br: 1999000, label: 'Hi-Res', hashKeys: ['resHash', 'res_hash', 'ResFileHash'] },
  { ui: 'lossless', lite: 'flac', br: 1411000, label: '无损 FLAC', hashKeys: ['sqHash', 'sq_hash', 'SQFileHash'] },
  { ui: 'exhigh', lite: '320', br: 320000, label: '320k', hashKeys: ['hqHash', 'hq_hash', 'HQFileHash'] },
  { ui: 'standard', lite: '128', br: 128000, label: '128k', hashKeys: ['hash', 'fileHash', 'FileHash', 'id'] },
];

function normalizeLiteUiQuality(quality) {
  const q = String(quality || '').toLowerCase().trim();
  if (!q) return 'exhigh';
  if (q === 'jymaster' || q === 'master' || q === 'hires' || q === 'hi-res' || q === 'high' || q === 'hi_res' || q === 'highest') return 'hires';
  if (q === 'lossless' || q === 'flac' || q === 'sq') return 'lossless';
  if (q === 'exhigh' || q === '320' || q === '320k' || q === 'hq') return 'exhigh';
  if (q === 'standard' || q === '128' || q === '128k' || q === 'std' || q === 'normal') return 'standard';
  // numeric bitrate hints
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) {
    if (n >= 900) return 'hires';
    if (n >= 400) return 'lossless';
    if (n >= 250) return 'exhigh';
    return 'standard';
  }
  return 'exhigh';
}

function qualityToLite(quality) {
  const ui = normalizeLiteUiQuality(quality);
  const hit = LITE_QUALITY_CHAIN.find((item) => item.ui === ui);
  return hit ? hit.lite : '320';
}

function liteToUiLevel(liteQuality) {
  const q = String(liteQuality || '').toLowerCase();
  if (q === 'high' || q === 'hires' || q === 'viper_tape' || q === 'super') return 'hires';
  if (q === 'flac' || q === 'lossless') return 'lossless';
  if (q === '320' || q === 'exhigh' || q === 'hq') return 'exhigh';
  if (q === '128' || q === 'standard') return 'standard';
  return normalizeLiteUiQuality(liteQuality);
}

function pickHashForLiteLevel(params, levelItem, fallbackHash) {
  params = params || {};
  const keys = (levelItem && levelItem.hashKeys) || [];
  for (let i = 0; i < keys.length; i++) {
    const v = String(params[keys[i]] || '').trim();
    if (v) return v;
  }
  return String(fallbackHash || '').trim();
}

function liteQualityCandidates(params, requestedQuality) {
  const requested = normalizeLiteUiQuality(requestedQuality);
  const startIdx = Math.max(0, LITE_QUALITY_CHAIN.findIndex((item) => item.ui === requested));
  const chain = LITE_QUALITY_CHAIN.slice(startIdx);
  const baseHash = String(params.hash || params.fileHash || params.id || '').trim();
  const out = [];
  const seen = new Set();
  chain.forEach((item) => {
    const hash = pickHashForLiteLevel(params, item, baseHash);
    if (!hash) return;
    const key = hash.toLowerCase() + '|' + item.lite;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      hash,
      lite: item.lite,
      ui: item.ui,
      br: item.br,
      label: item.label,
    });
  });
  // Always keep a last-resort base-hash attempt at standard if nothing else.
  if (!out.length && baseHash) {
    out.push({ hash: baseHash, lite: '128', ui: 'standard', br: 128000, label: '128k' });
  }
  return out;
}

function stripEm(text) {
  return String(text || '').replace(/<\/?em>/gi, '').trim();
}

function coverUrl(raw, size) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.replace(/\{size\}/gi, String(size || 240));
}

function pickUrl(body) {
  if (!body || typeof body !== 'object') return '';
  const candidates = [body.url, body.backupUrl, body.backup_url, body.play_url, body.play_backup_url];
  for (let i = 0; i < candidates.length; i++) {
    const v = candidates[i];
    if (Array.isArray(v) && v.length) {
      const first = String(v[0] || '').trim();
      if (first) return first;
    } else if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function mapSearchItem(item) {
  item = item || {};
  const hash = String(item.FileHash || item.hash || '').trim();
  const albumId = item.AlbumID != null ? String(item.AlbumID) : (item.album_id != null ? String(item.album_id) : '');
  const mixSongId = item.MixSongID != null ? String(item.MixSongID) : (item.mixsongid != null ? String(item.mixsongid) : '');
  const albumAudioIdRaw = item.EMixSongID || item.AlbumAudioID || item.album_audio_id || '';
  const albumAudioId = (/^\d+$/.test(mixSongId) ? mixSongId : '') || String(albumAudioIdRaw || '') || mixSongId;
  const privilege = Number(item.Privilege || item.privilege || 0) || 0;
  const name = stripEm(item.SongName || item.FileName || item.OriSongName || '');
  const artist = stripEm(item.SingerName || '');
  return {
    provider: 'kugou-lite',
    source: 'kugou-lite',
    type: 'kugou-lite',
    platform: 'lite',
    id: hash || mixSongId || albumAudioId,
    hash,
    fileHash: hash,
    albumId,
    album_id: albumId,
    mixSongId,
    albumAudioId,
    album_audio_id: albumAudioId,
    audioId: item.Audioid || item.Scid || '',
    name,
    artist,
    artists: artist ? [{ id: '', name: artist }] : [],
    album: stripEm(item.AlbumName || ''),
    cover: coverUrl(item.Image || item.AlbumImage || item.cover || item.img || '', 240),
    duration: (Number(item.Duration) || 0) * 1000,
    fee: privilege >= 10 ? 1 : 0,
    privilege,
    playable: privilege <= 8,
    vipRequired: privilege >= 10,
    hqHash: item.HQFileHash || '',
    sqHash: item.SQFileHash || '',
    resHash: item.ResFileHash || '',
  };
}

function sessionCookieString() {
  const s = kugouLiteSession.readSession();
  if (!s) return '';
  return 'token=' + s.token + ';userid=' + s.userid;
}

function withSessionQuery(query, opts) {
  opts = opts || {};
  const q = Object.assign({}, query || {});
  const s = kugouLiteSession.readSession();
  if (s) {
    q.userid = s.userid;
    q.cookie = sessionCookieString();
    // token stays in cookie by default; includeToken only for write ops — never log token
    if (opts.includeToken) q.token = s.token;
  } else if (opts.requireSession) {
    const err = new Error('KUGOU_LITE_LOGIN_REQUIRED');
    err.code = 'KUGOU_LITE_LOGIN_REQUIRED';
    err.statusCode = 401;
    err.message = '请先登录酷狗概念版';
    throw err;
  }
  return q;
}

function loginRequiredPayload(extra) {
  return Object.assign({
    provider: 'kugou-lite',
    platform: 'lite',
    ok: false,
    playable: false,
    url: '',
    error: 'KUGOU_LITE_LOGIN_REQUIRED',
    reason: 'login_required',
    message: '请先登录酷狗概念版（扫码）后再播放会员歌曲',
    restriction: { category: 'login_required', message: '请先登录酷狗概念版' },
  }, extra || {});
}

async function handleLiteSearch(keywords, limit, offset) {
  const kw = String(keywords || '').trim();
  const lim = Math.max(1, Math.min(Number(limit) || 12, 20));
  const start = Math.max(0, Number(offset) || 0);
  if (!kw) {
    return { provider: 'kugou-lite', platform: 'lite', songs: [], offset: start, limit: lim, nextOffset: start, hasMore: false };
  }
  const page = Math.floor(start / lim) + 1;
  const query = withSessionQuery({
    keywords: kw,
    keyword: kw,
    page,
    pagesize: lim,
    type: 'song',
  }, { requireSession: false });
  const { result } = await kugouLiteSession.proxyLite('/search', query);
  const body = result.body || {};
  const lists = body && body.data && Array.isArray(body.data.lists) ? body.data.lists : [];
  const songs = lists.map(mapSearchItem).filter((s) => s.name && (s.hash || s.id));
  const upstreamErr = body.error_code || body.errcode || body.error;
  return {
    provider: 'kugou-lite',
    platform: 'lite',
    songs,
    offset: start,
    limit: lim,
    nextOffset: start + songs.length,
    hasMore: songs.length >= lim,
    httpStatus: result.httpStatus,
    upstreamError: upstreamErr || undefined,
    message: songs.length ? undefined : (body.error_msg || body.errmsg || (upstreamErr ? ('搜索失败: ' + upstreamErr) : '无结果')),
  };
}

async function handleLiteSongUrl(params) {
  params = params || {};
  const hash = String(params.hash || params.fileHash || params.id || '').trim();
  if (!hash) {
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      url: '',
      playable: false,
      error: 'MISSING_HASH',
      message: '缺少酷狗概念版歌曲 hash',
    };
  }
  const session = kugouLiteSession.readSession();
  if (!session) return loginRequiredPayload({ hash });

  // Accept quality / level / br from UI or clients.
  const requestedRaw = params.quality || params.level || params.br || params.bitrate || 'exhigh';
  const requestedQuality = normalizeLiteUiQuality(requestedRaw);
  const albumId = String(params.albumId || params.album_id || '0');
  const albumAudioId = String(params.albumAudioId || params.album_audio_id || params.mixSongId || '0');
  const candidates = liteQualityCandidates(params, requestedQuality);
  const tried = [];
  let lastFail = null;

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    tried.push(cand.ui + ':' + cand.lite);
    const query = withSessionQuery({
      hash: String(cand.hash || hash).toLowerCase(),
      album_id: albumId || '0',
      album_audio_id: albumAudioId || '0',
      quality: cand.lite,
    }, { requireSession: true });

    let result;
    try {
      ({ result } = await kugouLiteSession.proxyLite('/song/url', query));
    } catch (err) {
      lastFail = {
        rawMsg: err && err.message ? String(err.message) : String(err),
        errorCode: err && err.code,
        httpStatus: err && err.statusCode,
        status: NaN,
      };
      continue;
    }
    const body = (result && result.body) || {};
    const url = pickUrl(body);
    const status = Number(body.status);
    if (url && (status === 1 || status === 200 || !Number.isFinite(status))) {
      const level = liteToUiLevel(cand.lite);
      const downgraded = level !== requestedQuality;
      return {
        provider: 'kugou-lite',
        platform: 'lite',
        url,
        playable: true,
        trial: false,
        level,
        br: cand.br,
        quality: cand.lite,
        qualityLabel: cand.label,
        requestedQuality,
        qualityDowngraded: downgraded,
        fallbackTried: tried,
        hash: String(cand.hash || hash),
        loggedIn: true,
        httpStatus: result.httpStatus,
      };
    }

    const rawMsg = String(body.error_msg || body.errmsg || body.error || body.msg || body.message || '');
    lastFail = {
      rawMsg,
      errorCode: body.error_code || body.errcode || body.error,
      httpStatus: result && result.httpStatus,
      status,
    };
    // Login failures should not cascade through lower qualities.
    if (/验证|登录|login|token|cookie|未登录|授权/i.test(rawMsg) || Number(body.error_code) === 20018) {
      break;
    }
  }

  const rawMsg = (lastFail && lastFail.rawMsg) || '';
  const needsLogin = /验证|登录|login|token|cookie|未登录|授权/i.test(rawMsg) || Number(lastFail && lastFail.errorCode) === 20018;
  const needsVip = /会员|vip|付费|购买|权限/i.test(rawMsg);
  const category = needsLogin ? 'login_required' : (needsVip ? 'vip_required' : 'url_unavailable');
  const message = needsLogin
    ? '请先登录酷狗概念版后再播放'
    : (needsVip
      ? (rawMsg || '该歌曲需要酷狗概念版会员权限')
      : (rawMsg || ('酷狗概念版未返回播放地址（已尝试: ' + tried.join(', ') + '）')));
  return {
    provider: 'kugou-lite',
    platform: 'lite',
    url: '',
    playable: false,
    error: category === 'login_required' ? 'KUGOU_LITE_LOGIN_REQUIRED' : (category === 'vip_required' ? 'KUGOU_LITE_VIP_REQUIRED' : 'KUGOU_LITE_URL_UNAVAILABLE'),
    reason: category,
    message,
    restriction: { category, message },
    requestedQuality,
    fallbackTried: tried,
    hash,
    loggedIn: true,
    httpStatus: lastFail && lastFail.httpStatus,
    upstreamStatus: lastFail && lastFail.status,
  };
}

function decodeLyricContent(content) {
  const raw = String(content || '').trim();
  if (!raw) return '';
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8').replace(/^\uFEFF/, '');
    if (decoded && (decoded.includes('[') || /[\u4e00-\u9fa5]/.test(decoded))) return decoded;
  } catch (_) {}
  return raw;
}

async function handleLiteLyric(hash, albumAudioId, durationSec) {
  const fileHash = String(hash || '').trim();
  if (!fileHash) {
    return { provider: 'kugou-lite', platform: 'lite', error: 'Missing Kugou hash', lyric: '', tlyric: '' };
  }
  const searchQuery = withSessionQuery({
    hash: fileHash,
    album_audio_id: albumAudioId || 0,
    duration: Math.max(0, Number(durationSec) || 0),
    man: 'yes',
  }, { requireSession: false });
  const { result: searchRes } = await kugouLiteSession.proxyLite('/search/lyric', searchQuery);
  const searchBody = searchRes.body || {};
  const candidates = Array.isArray(searchBody.candidates) ? searchBody.candidates
    : (searchBody.data && Array.isArray(searchBody.data.candidates) ? searchBody.data.candidates : []);
  const candidate = candidates[0];
  if (!candidate || !candidate.id) {
    return { provider: 'kugou-lite', platform: 'lite', hash: fileHash, lyric: '', tlyric: '', trans: '' };
  }
  const lyricQuery = withSessionQuery({
    id: candidate.id,
    accesskey: candidate.accesskey || '',
    fmt: 'lrc',
    decode: 'true',
    charset: 'utf8',
  }, { requireSession: false });
  const { result: lyricRes } = await kugouLiteSession.proxyLite('/lyric', lyricQuery);
  const lyricBody = lyricRes.body || {};
  const lyric = lyricBody.decodeContent
    ? String(lyricBody.decodeContent)
    : decodeLyricContent(lyricBody.content);
  return {
    provider: 'kugou-lite',
    platform: 'lite',
    hash: fileHash,
    lyric: lyric || '',
    tlyric: '',
    trans: '',
  };
}

/* ===== kugou-lite playlists (appended helpers) ===== */

function stripLiteFileName(name, artist) {
  let n = String(name || '').replace(/<\/?em>/gi, '').replace(/\.mp3$/i, '').trim();
  const a = String(artist || '').trim();
  if (a) {
    const prefix = a + ' - ';
    if (n.indexOf(prefix) === 0) n = n.slice(prefix.length).trim();
  }
  // Fallback: "artist - title" when singerinfo formatting differs (、 vs /)
  const sep = n.lastIndexOf(' - ');
  if (sep > 0 && sep < n.length - 3) {
    const left = n.slice(0, sep).trim();
    const right = n.slice(sep + 3).trim();
    if (right && left) n = right;
  }
  return n || String(name || '').replace(/\.mp3$/i, '').trim();
}

function parseLiteListId(playlistId) {
  const id = String(playlistId || '').trim();
  if (!id) return '';
  if (/^\d+$/.test(id)) return id;
  if (id.indexOf('collection_') === 0) {
    const parts = id.split('_');
    if (parts.length >= 5 && parts[3]) return String(parts[3]);
  }
  const matched = id.match(/collection_\d+_\d+_(\d+)_\d+/);
  return matched ? matched[1] : id;
}

function extractLitePlaylistLists(data) {
  data = (data && data.data) || data || {};
  if (Array.isArray(data.info)) return data.info;
  const info = data.info || data;
  return []
    .concat(Array.isArray(info.collect) ? info.collect : [])
    .concat(Array.isArray(info.list) ? info.list : [])
    .concat(Array.isArray(info.mydiy) ? info.mydiy : [])
    .concat(Array.isArray(info.playlist) ? info.playlist : [])
    .concat(Array.isArray(info.lists) ? info.lists : []);
}

function mapLitePlaylistItem(item) {
  item = item || {};
  const id = item.global_collection_id || item.specialid || item.listid || item.list_id || item.id || '';
  const listId = item.list_create_listid || item.listid || parseLiteListId(id) || '';
  return {
    provider: 'kugou-lite',
    source: 'kugou-lite',
    platform: 'lite',
    id: String(id || listId),
    listId: String(listId || ''),
    name: stripEm(item.name || item.listname || item.specialname || item.title || '酷狗概念版歌单'),
    cover: coverUrl(item.pic || item.img || item.imgurl || item.sizable_cover || item.create_user_pic || '', 240),
    trackCount: Number(item.count || item.m_count || item.song_count || item.total || item.list_count || 0) || 0,
    creator: stripEm(item.nickname || item.username || item.user_name || item.list_create_username || ''),
  };
}

function mapLitePlaylistTrack(item) {
  item = item || {};
  const singers = Array.isArray(item.singerinfo) ? item.singerinfo : (Array.isArray(item.Singers) ? item.Singers : []);
  const artistLabel = singers.map((s) => s.name || s.SingerName).filter(Boolean).join(' / ')
    || stripEm(item.SingerName || item.author_name || '');
  const mixSongId = item.mixsongid != null ? String(item.mixsongid)
    : (item.MixSongID != null ? String(item.MixSongID)
      : (item.album_audio_id != null ? String(item.album_audio_id) : ''));
  const hash = String(item.hash || item.FileHash || item.filehash || '').trim();
  const albumId = String(
    (item.albuminfo && item.albuminfo.id) || item.album_id || item.AlbumID || ''
  );
  const name = stripLiteFileName(item.name || item.songname || item.SongName || item.filename || item.FileName || item.official_songname || '', artistLabel);
  const privilege = Number(
    item.media_privilege != null ? item.media_privilege
      : (item.privilege != null ? item.privilege : item.Privilege)
  ) || 0;
  const durationMs = Number(item.duration)
    ? Number(item.duration) * (Number(item.duration) < 10000 ? 1000 : 1)
    : (item.timelen ? Number(item.timelen) : 0);
  const mapped = {
    provider: 'kugou-lite',
    source: 'kugou-lite',
    type: 'kugou-lite',
    platform: 'lite',
    id: hash || mixSongId,
    hash,
    fileHash: hash,
    albumId,
    album_id: albumId,
    mixSongId,
    albumAudioId: (/^\d+$/.test(mixSongId) ? mixSongId : '') || String(item.album_audio_id || item.EMixSongID || mixSongId || ''),
    album_audio_id: (/^\d+$/.test(mixSongId) ? mixSongId : '') || String(item.album_audio_id || ''),
    audioId: item.audio_id || item.Audioid || item.Scid || '',
    name,
    artist: artistLabel,
    artists: artistLabel ? artistLabel.split(' / ').map((n) => ({ id: '', name: n })) : [],
    album: stripEm((item.albuminfo && item.albuminfo.name) || item.album_name || item.AlbumName || ''),
    cover: coverUrl(item.cover || item.img || item.Image || (item.trans_param && item.trans_param.union_cover) || '', 240),
    duration: durationMs,
    fee: privilege >= 10 ? 1 : 0,
    privilege,
    playable: privilege <= 8,
    vipRequired: privilege >= 10,
    hqHash: item.HQFileHash || item.hq_hash || item.hqHash || '',
    sqHash: item.SQFileHash || item.sq_hash || item.sqHash || '',
    resHash: item.ResFileHash || item.res_hash || item.resHash || '',
  };
  if (item.fileid != null || item.file_id != null) {
    mapped.fileId = String(item.fileid != null ? item.fileid : item.file_id);
  }
  return mapped;
}

async function handleLiteUserPlaylists(opts) {
  opts = opts || {};
  const session = kugouLiteSession.readSession();
  if (!session) {
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      loggedIn: false,
      playlists: [],
      error: 'KUGOU_LITE_LOGIN_REQUIRED',
      message: '请先登录酷狗概念版',
    };
  }
  const pagesize = Math.max(10, Math.min(50, Number(opts.pagesize) || 50));
  const playlists = [];
  const seen = new Set();
  let total = 0;
  try {
    for (let page = 1; page <= 20; page += 1) {
      const query = withSessionQuery({
        userid: session.userid,
        page,
        pagesize,
        type: 2,
      }, { requireSession: true });
      const { result } = await kugouLiteSession.proxyLite('/user/playlist', query);
      const body = (result && result.body) || {};
      const data = body.data || {};
      const lists = extractLitePlaylistLists(body);
      if (!total) total = Number(data.total || data.count || 0) || 0;
      let added = 0;
      lists.forEach((item) => {
        const mapped = mapLitePlaylistItem(item);
        if (!mapped.id || !mapped.name) return;
        if (seen.has(mapped.id)) return;
        seen.add(mapped.id);
        playlists.push(mapped);
        added += 1;
      });
      if (!lists.length || added === 0) break;
      if (lists.length < pagesize) break;
      if (total && playlists.length >= total) break;
    }
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      loggedIn: true,
      userId: session.userid,
      nickname: session.nickname || '',
      avatar: session.avatar || '',
      playlists,
      total: total || playlists.length,
      hasMore: false,
    };
  } catch (err) {
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      loggedIn: true,
      playlists: [],
      error: err && err.code ? err.code : (err && err.message ? err.message : 'KUGOU_LITE_PLAYLIST_FAILED'),
      message: '酷狗概念版歌单加载失败',
    };
  }
}

async function handleLitePlaylistTracks(playlistId, opts) {
  opts = opts || {};
  const session = kugouLiteSession.readSession();
  if (!session) {
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      tracks: [],
      total: 0,
      error: 'KUGOU_LITE_LOGIN_REQUIRED',
      message: '请先登录酷狗概念版',
    };
  }
  const listid = parseLiteListId(playlistId);
  if (!listid) {
    return { provider: 'kugou-lite', platform: 'lite', tracks: [], total: 0, error: 'MISSING_PLAYLIST_ID' };
  }
  const paged = !!opts.paged;
  const pagesize = Math.max(1, Math.min(50, Number(opts.limit) || 50));
  const offset = Math.max(0, Number(opts.offset) || 0);

  async function fetchPage(pageNo, baseOffset) {
    baseOffset = baseOffset || 0;
    const query = withSessionQuery({
      listid: Number(listid) || listid,
      userid: session.userid,
      page: pageNo,
      pagesize,
    }, { requireSession: true });
    const { result } = await kugouLiteSession.proxyLite('/playlist/track/all/new', query);
    const body = (result && result.body) || {};
    const data = body.data || {};
    const chunk = data.info || data.songs || data.lists || data.file || [];
    const list = Array.isArray(chunk) ? chunk : (Array.isArray(chunk.file) ? chunk.file : []);
    const tracks = list.map((item, index) => {
      const mapped = mapLitePlaylistTrack(item);
      mapped.addedAt = Number(item.addtime || item.add_time || item.collect_time || item.collecttime || item.ctime || 0) || 0;
      mapped.playlistIndex = baseOffset + index;
      return mapped;
    }).filter((s) => s.name && (s.hash || s.id));
    const total = Number(data.count || 0) || tracks.length;
    return { tracks, total, httpStatus: result && result.httpStatus };
  }

  function reverseTracks(tracks, listOffset) {
    tracks.reverse();
    tracks.forEach((t, i) => { t.playlistIndex = listOffset + i; });
    return tracks;
  }

  try {
    if (paged) {
      const probe = await fetchPage(1, 0);
      const total = probe.total || probe.tracks.length;
      if (!total) {
        return {
          provider: 'kugou-lite',
          platform: 'lite',
          id: String(playlistId || listid),
          listId: String(listid),
          tracks: reverseTracks(probe.tracks.slice(), offset),
          total: probe.tracks.length,
          offset,
          limit: pagesize,
          hasMore: false,
        };
      }
      // Newest-first like standard kugou playlist UI
      const origStart = Math.max(0, total - offset - pagesize);
      const origEnd = total - offset;
      const count = Math.min(pagesize, Math.max(0, origEnd - origStart));
      if (count <= 0) {
        return {
          provider: 'kugou-lite',
          platform: 'lite',
          id: String(playlistId || listid),
          listId: String(listid),
          tracks: [],
          total,
          offset,
          limit: pagesize,
          hasMore: false,
        };
      }
      const out = [];
      let remaining = count;
      let pos = origStart;
      while (remaining > 0) {
        const pageNo = Math.floor(pos / pagesize) + 1;
        const baseOffset = (pageNo - 1) * pagesize;
        const chunk = await fetchPage(pageNo, baseOffset);
        if (!chunk.tracks.length) break;
        const inPage = pos - baseOffset;
        const take = Math.min(remaining, chunk.tracks.length - inPage);
        if (take <= 0) break;
        out.push(...chunk.tracks.slice(inPage, inPage + take));
        remaining -= take;
        pos += take;
      }
      const pageTracks = reverseTracks(out, offset);
      return {
        provider: 'kugou-lite',
        platform: 'lite',
        id: String(playlistId || listid),
        listId: String(listid),
        tracks: pageTracks,
        total,
        offset,
        limit: pagesize,
        hasMore: offset + pageTracks.length < total,
      };
    }

    const tracks = [];
    let total = 0;
    for (let round = 0; round < 500; round += 1) {
      const chunk = await fetchPage(round + 1, tracks.length);
      total = chunk.total || total;
      if (!chunk.tracks.length) break;
      tracks.push(...chunk.tracks);
      if (chunk.tracks.length < pagesize || (total && tracks.length >= total)) break;
    }
    reverseTracks(tracks, 0);
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      id: String(playlistId || listid),
      listId: String(listid),
      tracks,
      total: total || tracks.length,
    };
  } catch (err) {
    return {
      provider: 'kugou-lite',
      platform: 'lite',
      id: String(playlistId || listid),
      listId: String(listid),
      tracks: [],
      total: 0,
      error: err && err.code ? err.code : (err && err.message ? err.message : 'KUGOU_LITE_PLAYLIST_TRACKS_FAILED'),
      message: '酷狗概念版歌单歌曲加载失败',
    };
  }
}


let liteFavoriteListCache = { listId: '', userId: '', at: 0 };
// Cached 我喜欢 hash/name sets for 猜你喜欢 exclusion (TTL 10 min).
let liteFavoriteFilterCache = { at: 0, userId: '', hashes: null, names: null, loading: null };
const liteLikeFileIdByHash = new Map();

function invalidateLiteLikeFileCache(hash) {
  const key = String(hash || '').trim().toLowerCase();
  if (key) liteLikeFileIdByHash.delete(key);
}

function bumpLiteFavoriteListCache() {
  if (liteFavoriteListCache && liteFavoriteListCache.listId) {
    liteFavoriteListCache = Object.assign({}, liteFavoriteListCache, { at: 0 });
  }
}

function isLiteUpstreamWriteOk(result, body) {
  const http = Number(result && result.httpStatus) || 0;
  if (http && (http < 200 || http >= 300)) return false;
  body = body || {};
  const errCode = Number(body.error_code != null ? body.error_code : (body.errcode != null ? body.errcode : (body.err_code != null ? body.err_code : NaN)));
  if (Number.isFinite(errCode) && errCode !== 0) return false;
  if (body.error && body.status !== 1 && body.status !== 200 && body.status !== '1') return false;
  if (body.status === 1 || body.status === 200 || body.status === '1') return true;
  if (body.ok === true || body.success === true) return true;
  if (body.status === 0 || body.status === '0') return false;
  // HTTP 2xx with empty/minimal body and no explicit error
  if (http >= 200 && http < 300 && body.error == null && !Number.isFinite(errCode)) return true;
  return false;
}

function parseLiteFavoriteCountMap(body) {
  const out = Object.create(null);
  if (!body || typeof body !== 'object') return out;
  const data = body.data != null ? body.data : body;
  let rows = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === 'object') {
    rows = data.info || data.list || data.lists || data.songs || data.data || [];
    if (!Array.isArray(rows) && data) {
      // map-shaped: { "123": 1, ... }
      Object.keys(data).forEach((k) => {
        if (!/^d+$/.test(k)) return;
        const v = data[k];
        const liked = typeof v === 'object' && v
          ? !!(v.count || v.collect || v.is_collect || v.collected || v.liked)
          : !!(Number(v) > 0 || v === true);
        out[String(k)] = liked;
      });
      return out;
    }
  }
  if (!Array.isArray(rows)) return out;
  rows.forEach((row) => {
    if (row == null) return;
    if (typeof row !== 'object') return;
    const id = String(row.mixsongid || row.mixSongId || row.album_audio_id || row.albumAudioId || row.id || '').trim();
    if (!id) return;
    const liked = !!(Number(row.count || row.collect_count || row.collect || 0) > 0
      || row.is_collect || row.collected || row.liked || row.has_collect);
    out[id] = liked;
  });
  return out;
}


function isLiteFavoritePlaylistName(name) {
  return /我喜欢|喜欢的音乐|我的收藏|favorite|liked/i.test(String(name || '').trim());
}

function isLitePrimaryFavoritePlaylistName(name) {
  return /我喜欢|喜欢的音乐|liked music|my favorites?/i.test(String(name || '').trim());
}

function pickLiteFavoritePlaylist(lists) {
  lists = Array.isArray(lists) ? lists : [];
  let fav = lists.find((item) => isLitePrimaryFavoritePlaylistName(item && item.name));
  if (!fav) fav = lists.find((item) => String(item && (item.listId || item.listid || '')) === '2');
  if (!fav) fav = lists.find((item) => Number(item && (item.specialType || item.type)) === 0 && isLiteFavoritePlaylistName(item && item.name));
  if (!fav) fav = lists.find((item) => isLiteFavoritePlaylistName(item && item.name));
  if (!fav) fav = lists.find((item) => Number(item && (item.is_default || item.default)) === 1);
  return fav || null;
}

async function resolveLiteFavoriteListId(force) {
  const session = kugouLiteSession.readSession();
  if (!session) return '';
  if (!force && liteFavoriteListCache.listId && liteFavoriteListCache.userId === session.userid && Date.now() - liteFavoriteListCache.at < 300000) {
    return liteFavoriteListCache.listId;
  }
  const data = await handleLiteUserPlaylists({});
  const lists = (data && data.playlists) || [];
  const fav = pickLiteFavoritePlaylist(lists);
  const listId = fav ? String(fav.listId || parseLiteListId(fav.id) || fav.id || '').trim() : '';
  if (listId) liteFavoriteListCache = { listId, userId: session.userid, at: Date.now() };
  return listId;
}

async function getLiteFavoriteFilterSets() {
  const session = kugouLiteSession.readSession();
  if (!session) return { hashes: new Set(), names: new Set() };
  const uid = String(session.userid || '');
  const fresh = liteFavoriteFilterCache.hashes
    && liteFavoriteFilterCache.userId === uid
    && Date.now() - liteFavoriteFilterCache.at < 600000;
  if (fresh) {
    return { hashes: liteFavoriteFilterCache.hashes, names: liteFavoriteFilterCache.names };
  }
  if (liteFavoriteFilterCache.loading) {
    return liteFavoriteFilterCache.loading;
  }
  liteFavoriteFilterCache.loading = (async () => {
    const hashes = new Set();
    const names = new Set();
    try {
      const listId = await resolveLiteFavoriteListId();
      if (listId) {
        const first = await handleLitePlaylistTracks(listId, { limit: 50, offset: 0, paged: true });
        const total = Math.max(Number(first.total || 0), (first.tracks || []).length);
        const pages = Math.max(1, Math.min(25, Math.ceil(total / 50)));
        const ingest = (tracks) => {
          (tracks || []).forEach((t) => {
            const h = String(t.hash || t.fileHash || '').toLowerCase();
            if (h) hashes.add(h);
            const n = String(t.name || t.title || '').trim();
            if (n) names.add(n);
          });
        };
        ingest(first.tracks);
        for (let page = 2; page <= pages; page += 1) {
          const chunk = await handleLitePlaylistTracks(listId, { limit: 50, offset: (page - 1) * 50, paged: true });
          ingest(chunk.tracks);
        }
      }
    } catch (_) {}
    liteFavoriteFilterCache = { at: Date.now(), userId: uid, hashes, names, loading: null };
    return { hashes, names };
  })();
  return liteFavoriteFilterCache.loading;
}

function buildLiteSongDataString(song) {
  song = song || {};
  const name = String(song.name || song.title || '').trim().replace(/\|/g, '/');
  const hash = String(song.hash || song.fileHash || song.id || '').trim();
  const albumId = String(song.albumId || song.album_id || '0').trim() || '0';
  const mixSongId = String(song.mixSongId || song.albumAudioId || song.album_audio_id || '0').trim() || '0';
  return [name, hash, albumId, mixSongId].join('|');
}

async function fetchLiteFavoriteHashSet(hashSet, maxPages) {
  const listId = await resolveLiteFavoriteListId();
  const liked = {};
  if (!listId || !hashSet || !hashSet.size) return { listId, liked };
  maxPages = Math.max(1, Math.min(16, Number(maxPages) || 8));
  const first = await handleLitePlaylistTracks(listId, { limit: 50, offset: 0, paged: true });
  const total = Math.max(Number(first.total || 0), (first.tracks || []).length);
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const pageOrder = [];
  for (let page = totalPages; page >= 1 && pageOrder.length < maxPages; page -= 1) pageOrder.push(page);
  for (let page = 1; page <= totalPages && pageOrder.length < maxPages * 2; page += 1) {
    if (pageOrder.indexOf(page) < 0) pageOrder.push(page);
  }
  for (let i = 0; i < pageOrder.length; i += 1) {
    const page = pageOrder[i];
    const chunk = page === 1 && (first.tracks || []).length
      ? first
      : await handleLitePlaylistTracks(listId, { limit: 50, offset: (page - 1) * 50, paged: true });
    const tracks = chunk.tracks || [];
    if (!tracks.length) continue;
    tracks.forEach((track) => {
      const hash = String(track.hash || track.fileHash || '').toLowerCase();
      if (!hash || !hashSet.has(hash)) return;
      liked[hash] = true;
      if (track.fileId) liteLikeFileIdByHash.set(hash, String(track.fileId));
    });
    if (Object.keys(liked).length >= hashSet.size) break;
  }
  return { listId, liked };
}

async function tryLiteFavoriteCount(mixsongids) {
  const ids = String(mixsongids || '').trim();
  if (!ids) return null;
  try {
    const query = withSessionQuery({ mixsongids: ids }, { requireSession: true });
    const { result } = await kugouLiteSession.proxyLite('/favorite/count', query);
    return (result && result.body) || null;
  } catch (_) {
    return null;
  }
}

async function handleLiteLikeCheck(params) {
  params = params || {};
  const raw = String(params.hashes || params.hash || '').trim();
  const hashes = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!hashes.length) return { provider: 'kugou-lite', liked: {} };
  const session = kugouLiteSession.readSession();
  if (!session) return { provider: 'kugou-lite', liked: {}, error: 'KUGOU_LITE_LOGIN_REQUIRED', listId: '' };

  const liked = {};
  const confirmed = Object.create(null);
  hashes.forEach((h) => { liked[h] = false; });

  const mixRaw = String(params.mixsongids || params.mixSongIds || '').trim();
  const mixIds = mixRaw.split(',').map((item) => item.trim()).filter(Boolean);
  if (mixIds.length && mixIds.length === hashes.length) {
    try {
      const body = await tryLiteFavoriteCount(mixIds.join(','));
      const countMap = parseLiteFavoriteCountMap(body);
      hashes.forEach((hash, index) => {
        const mixId = mixIds[index];
        if (!mixId || !countMap || countMap[mixId] == null) return;
        liked[hash] = !!countMap[mixId];
        confirmed[hash] = true;
      });
    } catch (_) {}
  }

  const pending = hashes.filter((h) => !confirmed[h]);
  let listId = '';
  let error = '';
  if (pending.length) {
    const scanned = await fetchLiteFavoriteHashSet(new Set(pending), Math.min(8, Math.max(2, Math.ceil(pending.length / 4)))).catch((err) => ({ liked: {}, listId: '', error: err.message }));
    listId = scanned.listId || '';
    error = scanned.error || '';
    pending.forEach((hash) => {
      if (scanned.liked && scanned.liked[hash]) liked[hash] = true;
    });
  } else {
    listId = await resolveLiteFavoriteListId().catch(() => '');
  }

  if (error && !listId && pending.length === hashes.length) {
    return { provider: 'kugou-lite', liked, listId: '', error };
  }
  return { provider: 'kugou-lite', liked, listId };
}

async function handleLiteAddSongToList(listId, song) {
  const session = kugouLiteSession.readSession();
  if (!session) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_LOGIN_REQUIRED' };
  const targetListId = String(listId || '').trim() || await resolveLiteFavoriteListId();
  if (!targetListId) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_FAVORITE_LIST_NOT_FOUND' };
  const data = buildLiteSongDataString(song);
  const hash = String((song && (song.hash || song.fileHash || song.id)) || '').trim().toLowerCase();
  const query = withSessionQuery({
    listid: Number(targetListId) || targetListId,
    data,
    userid: session.userid,
  }, { requireSession: true, includeToken: true });
  const { result } = await kugouLiteSession.proxyLite('/playlist/tracks/add', query, { method: 'POST', body: {} });
  const body = (result && result.body) || {};
  const ok = isLiteUpstreamWriteOk(result, body);
  if (ok) {
    invalidateLiteLikeFileCache(hash);
    bumpLiteFavoriteListCache();
  }
  return {
    provider: 'kugou-lite',
    success: !!ok,
    liked: true,
    listId: targetListId,
    httpStatus: result && result.httpStatus,
    body,
    error: ok ? undefined : (body.error || body.error_code || body.errcode || body.message || 'KUGOU_LITE_ADD_FAILED'),
  };
}

async function findLitePlaylistFileId(listId, song) {
  song = song || {};
  if (song.fileId || song.fileid || song.file_id) return String(song.fileId || song.fileid || song.file_id);
  const hash = String(song.hash || song.fileHash || song.id || '').trim().toLowerCase();
  if (!hash) return '';
  if (liteLikeFileIdByHash.has(hash)) return liteLikeFileIdByHash.get(hash);
  const targetListId = String(listId || '').trim();
  if (!targetListId) return '';
  for (let page = 1; page <= 8; page += 1) {
    const chunk = await handleLitePlaylistTracks(targetListId, { limit: 50, offset: (page - 1) * 50, paged: true });
    const tracks = chunk.tracks || [];
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      const trackHash = String(track.hash || track.fileHash || '').toLowerCase();
      if (trackHash !== hash) continue;
      if (track.fileId) {
        liteLikeFileIdByHash.set(hash, String(track.fileId));
        return String(track.fileId);
      }
    }
    if (!tracks.length || tracks.length < 50) break;
  }
  return '';
}

async function handleLiteRemoveSongFromList(listId, song) {
  const session = kugouLiteSession.readSession();
  if (!session) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_LOGIN_REQUIRED' };
  const targetListId = String(listId || '').trim() || await resolveLiteFavoriteListId();
  if (!targetListId) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_FAVORITE_LIST_NOT_FOUND' };
  const fileId = await findLitePlaylistFileId(targetListId, song);
  if (!fileId) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_SONG_NOT_IN_LIST' };
  const query = withSessionQuery({
    listid: Number(targetListId) || targetListId,
    fileids: String(fileId),
    userid: session.userid,
  }, { requireSession: true, includeToken: true });
  const { result } = await kugouLiteSession.proxyLite('/playlist/tracks/del', query, { method: 'POST', body: {} });
  const hash = String((song && (song.hash || song.fileHash || song.id)) || '').trim().toLowerCase();
  const body = (result && result.body) || {};
  const ok = isLiteUpstreamWriteOk(result, body);
  if (ok) {
    invalidateLiteLikeFileCache(hash);
    bumpLiteFavoriteListCache();
  }
  return {
    provider: 'kugou-lite',
    success: !!ok,
    liked: false,
    listId: targetListId,
    httpStatus: result && result.httpStatus,
    body,
    error: ok ? undefined : (body.error || body.error_code || body.errcode || body.message || 'KUGOU_LITE_REMOVE_FAILED'),
  };
}

async function handleLiteLikeToggle(song, like) {
  if (like) return handleLiteAddSongToList('', song);
  return handleLiteRemoveSongFromList('', song);
}

async function handleLitePlaylistAddSong(listId, song) {
  return handleLiteAddSongToList(listId, song);
}

async function handleLitePlaylistRemoveSong(listId, song) {
  return handleLiteRemoveSongFromList(listId, song);
}

async function handleLitePlaylistCreate(opts) {
  opts = opts || {};
  const session = kugouLiteSession.readSession();
  if (!session) return { provider: 'kugou-lite', success: false, error: 'KUGOU_LITE_LOGIN_REQUIRED' };
  const name = String(opts.name || '').trim();
  if (!name) return { provider: 'kugou-lite', success: false, error: 'MISSING_NAME' };
  const query = withSessionQuery({
    name,
    type: 0,
    userid: session.userid,
  }, { requireSession: true, includeToken: true });
  const { result } = await kugouLiteSession.proxyLite('/playlist/add', query, { method: 'POST', body: {} });
  const body = (result && result.body) || {};
  const data = body.data || body;
  const mapped = mapLitePlaylistItem(Object.assign({}, data, { name: name || (data && data.name) }));
  const ok = isLiteUpstreamWriteOk(result, body) && !!(mapped.id || mapped.listId || body.status === 1 || body.status === 200);
  if (ok) bumpLiteFavoriteListCache();
  return {
    provider: 'kugou-lite',
    success: !!ok,
    playlist: mapped.id || mapped.listId ? mapped : undefined,
    httpStatus: result && result.httpStatus,
    body,
    error: ok ? undefined : (body.error || body.error_code || body.errcode || body.message || 'KUGOU_LITE_CREATE_FAILED'),
  };
}

function extractLiteRecommendSongs(body) {
  const data = (body && body.data) || body || {};
  const candidates = [
    data.song_list,
    data.songlist,
    data.info,
    data.list,
    data.songs,
    data.lists,
    Array.isArray(data) ? data : null,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i]) && candidates[i].length) return candidates[i];
  }
  return [];
}

async function handleLiteRecommendations(limit) {
  const lim = Math.max(4, Math.min(30, Number(limit) || 12));
  const session = kugouLiteSession.readSession();
  if (!session) {
    return {
      provider: 'kugou-lite',
      loggedIn: false,
      songs: [],
      updatedAt: Date.now(),
      error: 'KUGOU_LITE_LOGIN_REQUIRED',
      message: '请先登录酷狗概念版',
      mode: 'guess-like',
    };
  }

  function mapRawSongs(raw) {
    return (Array.isArray(raw) ? raw : []).map((item) => {
      try { return mapLitePlaylistTrack(item); } catch (_) { return mapSearchItem(item); }
    }).map((s) => {
      if (s && s.name) return s;
      try {
        const alt = mapSearchItem(s || {});
        return alt && alt.name ? alt : s;
      } catch (_) { return s; }
    }).filter((s) => s && s.name && (s.hash || s.id));
  }

  async function fetchPersonalFmOnce() {
    const query = withSessionQuery({
      userid: session.userid,
      platform: 'android',
      action: 'play',
      mode: 'normal',
      remain_songcnt: 0,
    }, { requireSession: true, includeToken: true });
    const { result } = await kugouLiteSession.proxyLite('/personal/fm', query, {
      method: 'POST',
      body: {
        action: 'play',
        mode: 'normal',
        remain_songcnt: 0,
        platform: 'android',
        userid: session.userid,
      },
    });
    const body = (result && result.body) || {};
    const data = body.data || {};
    const raw = data.song_list || data.songlist || data.info || data.list || [];
    return { body, songs: mapRawSongs(raw), endpoint: '/personal/fm' };
  }

  async function fetchAiRecommend() {
    const query = withSessionQuery({
      userid: session.userid,
      platform: 'android',
    }, { requireSession: true, includeToken: true });
    const { result } = await kugouLiteSession.proxyLite('/ai/recommend', query, {
      method: 'GET',
    });
    const body = (result && result.body) || {};
    const data = body.data || {};
    const raw = data.song_list || data.songlist || data.info || data.list || extractLiteRecommendSongs(body);
    return { body, songs: mapRawSongs(raw), endpoint: '/ai/recommend' };
  }

  async function fetchTopCard() {
    const query = withSessionQuery({
      userid: session.userid,
      card_id: 1,
      platform: 'android',
    }, { requireSession: true, includeToken: true });
    const { result } = await kugouLiteSession.proxyLite('/top/card', query, {
      method: 'POST',
      body: { card_id: 1, userid: session.userid, platform: 'android' },
    });
    const body = (result && result.body) || {};
    const raw = extractLiteRecommendSongs(body);
    return { body, songs: mapRawSongs(raw), endpoint: '/top/card' };
  }

  // Prefer 私人FM / 猜你喜欢 (remain_songcnt must be 0..4; >4 returns empty).
  // Never everyday_song_recommend / never 我喜欢 playlist as source.
  // Light filter: like-check only the candidate songs (no full 941-track scan).
  let lastErr = '';
  const collected = [];
  const seen = new Set();
  let filteredLiked = 0;
  const likeCache = new Map(); // hash -> boolean
  // Warm 我喜欢 name/hash cache in parallel (TTL inside).
  try { getLiteFavoriteFilterSets().catch(function () {}); } catch (_) {}

  async function dropLikedSongs(songs) {
    const pending = [];
    (songs || []).forEach((song) => {
      if (!song) return;
      const h = String(song.hash || song.fileHash || '').toLowerCase();
      if (!h) return;
      if (likeCache.has(h)) return;
      pending.push(h);
    });
    if (pending.length) {
      try {
        const check = await handleLiteLikeCheck({ hashes: pending.join(',') });
        const likedMap = (check && check.liked) || {};
        Object.keys(likedMap).forEach((h) => {
          likeCache.set(String(h).toLowerCase(), !!likedMap[h]);
        });
      } catch (_) {}
    }
    let nameSet = null;
    try {
      const sets = await Promise.race([
        getLiteFavoriteFilterSets(),
        new Promise((resolve) => { setTimeout(function () { resolve(null); }, 10000); }),
      ]);
      if (sets && sets.names && sets.names.size) nameSet = sets.names;
    } catch (_) {}
    const kept = [];
    (songs || []).forEach((song) => {
      if (!song) return;
      const h = String(song.hash || song.fileHash || '').toLowerCase();
      if (h && likeCache.get(h) === true) {
        filteredLiked += 1;
        return;
      }
      const n = String(song.name || song.title || '').trim();
      if (n && nameSet && nameSet.has(n)) {
        filteredLiked += 1;
        return;
      }
      kept.push(song);
    });
    return kept;
  }

  async function acceptSongs(songs) {
    const unique = [];
    (songs || []).forEach((song) => {
      if (!song) return;
      const key = String(song.hash || song.id || '').toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(song);
    });
    if (!unique.length) return;
    const kept = await dropLikedSongs(unique);
    kept.forEach((song) => collected.push(song));
  }

  try {
    for (let round = 0; round < 10 && collected.length < lim; round += 1) {
      const pack = await fetchPersonalFmOnce();
      await acceptSongs(pack.songs || []);
      if (!(pack.songs || []).length) {
        lastErr = (pack.body && (pack.body.error_msg || pack.body.errmsg || pack.body.message)) || 'personal_fm_empty';
        break;
      }
    }
    if (collected.length) {
      return {
        provider: 'kugou-lite',
        loggedIn: true,
        songs: collected.slice(0, lim),
        updatedAt: Date.now(),
        endpoint: '/personal/fm',
        mode: 'guess-like',
        source: 'personal-fm',
        playlistName: '猜你喜欢',
        excludeLiked: true,
        filteredLikedCount: filteredLiked,
        message: filteredLiked
          ? ('已按红心过滤，丢弃 ' + filteredLiked + ' 首已喜欢')
          : '已排除已红心歌曲',
      };
    }
  } catch (err) {
    lastErr = err && err.message ? err.message : String(err);
  }

  try {
    const pack = await fetchAiRecommend();
    await acceptSongs(pack.songs || []);
    if (collected.length) {
      return {
        provider: 'kugou-lite',
        loggedIn: true,
        songs: collected.slice(0, lim),
        updatedAt: Date.now(),
        endpoint: pack.endpoint || '/ai/recommend',
        mode: 'guess-like',
        source: 'ai-recommend',
        playlistName: '猜你喜欢',
        excludeLiked: true,
        filteredLikedCount: filteredLiked,
        message: '私人FM暂空，已用概念版AI口味推荐并排除红心',
      };
    }
    lastErr = (pack.body && (pack.body.error_msg || pack.body.errmsg || pack.body.message)) || lastErr || 'ai_recommend_empty';
  } catch (err) {
    lastErr = err && err.message ? err.message : String(err);
  }

  try {
    const pack = await fetchTopCard();
    await acceptSongs(pack.songs || []);
    if (collected.length) {
      return {
        provider: 'kugou-lite',
        loggedIn: true,
        songs: collected.slice(0, lim),
        updatedAt: Date.now(),
        endpoint: pack.endpoint || '/top/card',
        mode: 'guess-like',
        source: 'top-card',
        playlistName: '猜你喜欢·精选兜底',
        fallback: true,
        curatedFallback: true,
        excludeLiked: true,
        filteredLikedCount: filteredLiked,
        message: '私人FM暂无数据，已切到平台精选并排除红心',
      };
    }
    lastErr = (pack.body && (pack.body.error_msg || pack.body.errmsg || pack.body.message)) || lastErr || 'empty';
  } catch (err) {
    lastErr = err && err.message ? err.message : String(err);
  }

  return {
    provider: 'kugou-lite',
    loggedIn: true,
    songs: [],
    updatedAt: Date.now(),
    mode: 'guess-like',
    excludeLiked: true,
    filteredLikedCount: filteredLiked,
    message: lastErr ? ('猜你喜欢暂无未红心数据: ' + lastErr) : '猜你喜欢暂无未红心数据',
  };
}


module.exports = {
  handleLiteSearch,
  handleLiteSongUrl,
  handleLiteLyric,
  handleLiteUserPlaylists,
  handleLitePlaylistTracks,
  resolveLiteFavoriteListId,
  handleLiteLikeCheck,
  handleLiteAddSongToList,
  handleLiteRemoveSongFromList,
  handleLiteLikeToggle,
  handleLitePlaylistAddSong,
  handleLitePlaylistCreate,
  handleLitePlaylistRemoveSong,
  handleLiteRecommendations,
  parseLiteListId,
  mapLitePlaylistItem,
  mapLitePlaylistTrack,
  qualityToLite,
  normalizeLiteUiQuality,
  liteQualityCandidates,
  liteToUiLevel,
  mapSearchItem,
  loginRequiredPayload,
};

