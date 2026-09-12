const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'public/js/modules/05-playback/07-search.js');
let t = fs.readFileSync(p, 'utf8');
const bad = ": (searchMode === 'kugou-lite' ? '搜索酷狗概念版...' : (searchMode === 'kugou' ? '搜索酷狗音乐...' : (searchMode === 'qq' ? '搜索 QQ 音乐...' : (searchMode === 'netease' ? '搜索网易云音乐...' : '搜索歌曲、歌手...')));";
const good = ": (searchMode === 'kugou-lite' ? '搜索酷狗概念版...' : (searchMode === 'kugou' ? '搜索酷狗音乐...' : (searchMode === 'qq' ? '搜索 QQ 音乐...' : (searchMode === 'netease' ? '搜索网易云音乐...' : '搜索歌曲、歌手...'))));";
if (!t.includes(bad) && !t.includes(good)) throw new Error('placeholder line not found');
if (t.includes(bad)) t = t.replace(bad, good);
const oldMergeCall = `  var songs = mergeSongSearchResults(
    songsByProvider.netease,
    songsByProvider.qq,
    songsByProvider.kugou,
    songsByProvider.qishui,
    songsByProvider.spotify,
    MUSIC_SEARCH_MAX_RESULTS,
    q
  );`;
const newMergeCall = `  var songs = mergeSongSearchResults(
    songsByProvider.netease,
    songsByProvider.qq,
    (songsByProvider.kugou || []).concat(songsByProvider['kugou-lite'] || []),
    songsByProvider.qishui,
    songsByProvider.spotify,
    MUSIC_SEARCH_MAX_RESULTS,
    q
  );`;
if (!t.includes(oldMergeCall) && !t.includes("songsByProvider['kugou-lite']")) throw new Error('merge call not found');
if (t.includes(oldMergeCall)) t = t.replace(oldMergeCall, newMergeCall);
fs.writeFileSync(p, t, 'utf8');
console.log('fixed search placeholders/merge');
