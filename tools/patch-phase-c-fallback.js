const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'public/js/modules/05-playback/11-provider-fallback.js');
let t = fs.readFileSync(p, 'utf8');
const oldLabel = `function playbackProviderLabel(song) {
  var provider = songProviderKey(song);
  if (provider === 'qq') return 'QQ 音乐';
  if (provider === 'kugou') return '酷狗音乐';
  if (provider === 'qishui') return '汽水音乐';
  if (provider === 'spotify') return 'Spotify';
  return '网易云';
}
function playbackLoginProvider(song) {
  return normalizePlaybackProvider(songProviderKey(song));
}`;
const newLabel = `function playbackProviderLabel(song) {
  var provider = songProviderKey(song);
  if (provider === 'qq') return 'QQ 音乐';
  if (provider === 'kugou-lite') return '酷狗概念版';
  if (provider === 'kugou') return '酷狗音乐';
  if (provider === 'qishui') return '汽水音乐';
  if (provider === 'spotify') return 'Spotify';
  return '网易云';
}
function playbackLoginProvider(song) {
  var key = songProviderKey(song);
  if (key === 'kugou-lite') return 'kugou-lite';
  return normalizePlaybackProvider(key);
}`;
if (!t.includes(oldLabel)) throw new Error('label block missing');
t = t.replace(oldLabel, newLabel);
fs.writeFileSync(p, t, 'utf8');
console.log('fallback labels patched');
