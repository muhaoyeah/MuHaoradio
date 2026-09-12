const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function patchFile(rel, pairs) {
  const p = path.join(root, rel);
  let t = fs.readFileSync(p, 'utf8');
  for (const [from, to, label] of pairs) {
    if (!t.includes(from)) {
      if (to && t.includes(to.slice(0, Math.min(60, to.length)))) {
        console.log('skip', rel, label);
        continue;
      }
      throw new Error('missing in ' + rel + ': ' + label);
    }
    t = t.replace(from, to);
  }
  fs.writeFileSync(p, t, 'utf8');
  console.log('patched', rel);
}

const liteUrlBuilder = `'/api/kugou-lite/song/url?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
      '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') +
      '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
      '&mixSongId=' + encodeURIComponent(song.mixSongId || '') +
      '&hqHash=' + encodeURIComponent(song.hqHash || song.hq_hash || '') +
      '&sqHash=' + encodeURIComponent(song.sqHash || song.sq_hash || '') +
      '&resHash=' + encodeURIComponent(song.resHash || song.res_hash || '') +
      qualityParam`;

const kugouUrlBlockGapless = `  if (playbackProvider === 'kugou') {
    return apiJson('/api/kugou/song/url?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
      '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') +
      '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
      '&mixSongId=' + encodeURIComponent(song.mixSongId || '') +
      '&hqHash=' + encodeURIComponent(song.hqHash || song.hq_hash || '') +
      '&sqHash=' + encodeURIComponent(song.sqHash || song.sq_hash || '') +
      '&resHash=' + encodeURIComponent(song.resHash || song.res_hash || '') +
      '&vipRequired=' + encodeURIComponent(song.vipRequired || song.needVip || song.onlyVipPlayable || song.only_vip_playable ? '1' : '') +
      '&privilege=' + encodeURIComponent(song.privilege || song.Privilege || song.mediaPrivilege || song.media_privilege || '') +
      '&fee=' + encodeURIComponent(song.fee || song.Fee || '') +
      qualityParam, { timeoutMs: 9000 });
  }`;

const liteGapless = `  if (songProviderKey(song) === 'kugou-lite') {
    return apiJson(` + liteUrlBuilder + `, { timeoutMs: 12000 });
  }
` + kugouUrlBlockGapless;

patchFile('public/js/modules/05-playback/13-playback-start-audio.js', [
  [kugouUrlBlockGapless, liteGapless, 'gapless-kugou-url'],
]);

// Main play path
(() => {
  const p = path.join(root, 'public/js/modules/05-playback/13-playback-start-audio.js');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes("var isKugouLitePlayback")) {
    t = t.replace(
      `      var isKugouPlayback = playbackProvider === 'kugou';
      var isQishuiPlayback = playbackProvider === 'qishui';`,
      `      var isKugouLitePlayback = songProviderKey(song) === 'kugou-lite';
      var isKugouPlayback = playbackProvider === 'kugou' && !isKugouLitePlayback;
      var isQishuiPlayback = playbackProvider === 'qishui';`
    );
  }
  if (!t.includes("isKugouLitePlayback) {")) {
    const mainKugou = `      } else if (isKugouPlayback) {
        data = await apiJson('/api/kugou/song/url?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
          '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') +
          '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
          '&mixSongId=' + encodeURIComponent(song.mixSongId || '') +
          '&hqHash=' + encodeURIComponent(song.hqHash || song.hq_hash || '') +
          '&sqHash=' + encodeURIComponent(song.sqHash || song.sq_hash || '') +
          '&resHash=' + encodeURIComponent(song.resHash || song.res_hash || '') +
          '&vipRequired=' + encodeURIComponent(song.vipRequired || song.needVip || song.onlyVipPlayable || song.only_vip_playable ? '1' : '') +
          '&privilege=' + encodeURIComponent(song.privilege || song.Privilege || song.mediaPrivilege || song.media_privilege || '') +
          '&fee=' + encodeURIComponent(song.fee || song.Fee || '') +
          qualityParam, { timeoutMs: 9000 });
      } else if (isQishuiPlayback) {`;
    const mainLite = `      } else if (isKugouLitePlayback) {
        data = await apiJson('/api/kugou-lite/song/url?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
          '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') +
          '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
          '&mixSongId=' + encodeURIComponent(song.mixSongId || '') +
          '&hqHash=' + encodeURIComponent(song.hqHash || song.hq_hash || '') +
          '&sqHash=' + encodeURIComponent(song.sqHash || song.sq_hash || '') +
          '&resHash=' + encodeURIComponent(song.resHash || song.res_hash || '') +
          qualityParam, { timeoutMs: 12000 });
      } else if (isKugouPlayback) {
        data = await apiJson('/api/kugou/song/url?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
          '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') +
          '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
          '&mixSongId=' + encodeURIComponent(song.mixSongId || '') +
          '&hqHash=' + encodeURIComponent(song.hqHash || song.hq_hash || '') +
          '&sqHash=' + encodeURIComponent(song.sqHash || song.sq_hash || '') +
          '&resHash=' + encodeURIComponent(song.resHash || song.res_hash || '') +
          '&vipRequired=' + encodeURIComponent(song.vipRequired || song.needVip || song.onlyVipPlayable || song.only_vip_playable ? '1' : '') +
          '&privilege=' + encodeURIComponent(song.privilege || song.Privilege || song.mediaPrivilege || song.media_privilege || '') +
          '&fee=' + encodeURIComponent(song.fee || song.Fee || '') +
          qualityParam, { timeoutMs: 9000 });
      } else if (isQishuiPlayback) {`;
    if (!t.includes(mainKugou)) throw new Error('main kugou block missing');
    t = t.replace(mainKugou, mainLite);
  }
  // quality label for lite
  t = t.replace(
    "showSourceFallbackNotice((isKugouPlayback ? '酷狗' : (isQishuiPlayback ? '汽水' : '网易云')) + '音质自动降级'",
    "showSourceFallbackNotice((isKugouLitePlayback ? '酷狗概念版' : (isKugouPlayback ? '酷狗' : (isQishuiPlayback ? '汽水' : '网易云'))) + '音质自动降级'"
  );
  // resolved provider should stay kugou-lite
  t = t.replace(
    "        song.resolvedPlaybackProvider = playbackProvider;",
    "        song.resolvedPlaybackProvider = isKugouLitePlayback ? 'kugou-lite' : playbackProvider;"
  );
  fs.writeFileSync(p, t, 'utf8');
  console.log('patched playback-start-audio main');
})();

// lyrics
patchFile('public/js/modules/06-lyrics/00-lyrics-fetch-parse.js', [
  [
    `  if (provider === 'kugou') {
    return '/api/kugou/lyric?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
      '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
      '&duration=' + encodeURIComponent(playbackDurationFromSong(song) || '');
  }`,
    `  if (provider === 'kugou-lite') {
    return '/api/kugou-lite/lyric?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
      '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
      '&duration=' + encodeURIComponent(playbackDurationFromSong(song) || '');
  }
  if (provider === 'kugou') {
    return '/api/kugou/lyric?hash=' + encodeURIComponent(song.hash || song.fileHash || song.audioHash || song.id || '') +
      '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || song.mixSongId || '') +
      '&duration=' + encodeURIComponent(playbackDurationFromSong(song) || '');
  }`,
    'lyricEndpoint'
  ],
]);

// quality: map kugou-lite -> kugou for prefs, but keep labels aware
patchFile('public/js/modules/05-playback/00-api-quality-output.js', [
  [
    `function normalizePlaybackProvider(provider) {
  if (provider === 'qq') return 'qq';
  if (provider === 'kugou') return 'kugou';
  if (provider === 'qishui') return 'qishui';
  if (provider === 'spotify') return 'spotify';
  return 'netease';
}`,
    `function normalizePlaybackProvider(provider) {
  if (provider === 'qq') return 'qq';
  if (provider === 'kugou-lite') return 'kugou';
  if (provider === 'kugou') return 'kugou';
  if (provider === 'qishui') return 'qishui';
  if (provider === 'spotify') return 'spotify';
  return 'netease';
}`,
    'normalizePlaybackProvider'
  ],
]);

console.log('playback/lyrics/quality done');
