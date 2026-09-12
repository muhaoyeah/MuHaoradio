function fallbackHomeTiles() {
  return [
    { kind: 'login', title: '登录同步歌单', sub: '网易云 / QQ / 酷狗 / 汽水' },
    { kind: 'search', title: '搜索一首歌', sub: '原唱优先', query: '' },
    { kind: 'local', title: '导入本地音乐', sub: '本地文件也能可视化' },
    { kind: 'podcastSearch', title: '搜索播客', sub: '长内容 / 电台' },
    { kind: 'guide', title: '看看视觉舞台', sub: '粒子 / 歌词 / 封面' },
  ];
}
function homeTileCover(item) {
  if (!item) return '';
  if (item.kind === 'song') return songCoverSrc(item.song, 220);
  return item.cover ? coverUrlWithSize(item.cover, 220) : '';
}
function homeToneForItem(item, index) {
  if (!item) return 'daily';
  if (item.kind === 'recent') return 'search';
  if (item.kind === 'profile') return 'local';
  if (item.tone) return item.tone;
  if (item.kind === 'song') return index % 2 ? 'search' : 'daily';
  if (item.kind === 'playlist') return 'playlist';
  if (item.kind === 'podcast' || item.kind === 'podcastSearch') return 'podcast';
  if (item.kind === 'local') return 'local';
  if (item.kind === 'guide') return 'guide';
  if (item.kind === 'login') return 'library';
  if (item.kind === 'search') return 'search';
  return ['daily', 'playlist', 'local', 'guide', 'search'][index % 5];
}
function renderHomeMosaic(items) {
  var cells = document.querySelectorAll('#home-mosaic .home-mosaic-cell');
  if (!cells.length) return;
  var covers = [];
  (items || []).forEach(function (item) {
    var cover = homeTileCover(item);
    if (cover) covers.push(cover);
  });
  for (var i = 0; i < cells.length; i++) {
    var src = covers[i] || covers[(i + 1) % Math.max(1, covers.length)] || '';
    cells[i].style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
    cells[i].classList.toggle('has-cover', !!src);
    cells[i].classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
  }
}
function renderHomeTiles() {
  var row = document.getElementById('home-tile-row');
  var title = document.getElementById('home-rail-title');
  var note = document.getElementById('home-rail-note');
  if (!row) return;
  var tiles = [];
  var loggedOutHome = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  var summary = homeListenSummary();
  if (summary.recent && tiles.length < 5) {
    tiles.push({ kind: 'recent', title: summary.recent.name || '继续听', sub: summary.recent.artist || summary.recent.source || '', cover: summary.recent.cover, record: summary.recent });
  }
  if (summary.topArtist && tiles.length < 5) {
    tiles.push({ kind: 'profile', title: summary.topArtist.name, sub: '常听歌手 · ' + summary.topArtist.plays + ' 次', query: summary.topArtist.name });
  }
  if (!loggedOutHome) {
    homeDiscoverState.songs.slice(0, Math.max(0, 4 - tiles.length)).forEach(function (song, i) {
      tiles.push({ kind: 'song', index: i, song: song, title: song.name || '今日歌曲', sub: song.artist || songSourceLabel(song) });
    });
    homeDiscoverState.playlists.slice(0, Math.max(0, 5 - tiles.length)).forEach(function (pl, i) {
      tiles.push({ kind: 'playlist', index: i, title: pl.name || '推荐歌单', sub: (pl.trackCount ? pl.trackCount + ' 首' : 'Playlist') + (pl.playCount ? ' · ' + compactHomeCount(pl.playCount) + ' 播放' : ''), cover: pl.cover });
    });
    if (tiles.length < 5) {
      homeDiscoverState.podcasts.slice(0, 5 - tiles.length).forEach(function (p, i) {
        tiles.push({ kind: 'podcast', index: i, title: p.name || '热门播客', sub: p.djName || p.category || 'Podcast', cover: p.cover });
      });
    }
  }
  if (!tiles.length) tiles = fallbackHomeTiles();
  tiles = tiles.slice(0, 5);
  if (title) title.textContent = summary.recent ? '接着听' : (loggedOutHome ? '先从这里开始' : '你的歌单与推荐');
  if (note) {
    var liveNote = homeDiscoverState.updatedAt ? '刚刚更新 · 点击即可播放' : '点击即可播放';
    note.textContent = homeDiscoverState.loading ? '正在整理推荐' : (loggedOutHome ? '登录平台后显示个人推荐' : (homeDiscoverState.error ? '离线精选' : liveNote));
  }
  row.innerHTML = tiles.map(function (item, i) {
    var cover = homeTileCover(item);
    var tone = homeToneForItem(item, i);
    var coverClass = 'home-tile-cover' + (cover ? ' has-cover' : '');
    return '<button class="home-tile' + (!cover && homeDiscoverState.loading ? ' home-skeleton' : '') + '" data-home-tone="' + escHtml(tone) + '" type="button" onclick="handleHomeTileClick(' + i + ')">' +
      '<div class="' + coverClass + '" style="' + (cover ? 'background-image:url(&quot;' + escHtml(cssImageUrl(cover)) + '&quot;)' : '') + '"></div>' +
      '<div class="home-tile-title">' + escHtml(item.title || '') + '</div>' +
      '<div class="home-tile-sub">' + escHtml(item.sub || '') + '</div>' +
      '</button>';
  }).join('');
  row._homeTiles = tiles;
  renderHomeMosaic(tiles);
}
function renderHomeDiscover() {
  var sub = document.getElementById('home-subtitle');
  var loggedOutHome = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  var weatherTitle = document.getElementById('home-weather-title');
  var weatherKicker = document.getElementById('home-weather-kicker');
  var weatherMeta = document.getElementById('home-weather-meta');
  if (weatherTitle) weatherTitle.textContent = '我的音乐库';
  if (weatherKicker) weatherKicker.textContent = 'Mineradio · Your Library';
  if (sub) {
    if (loggedOutHome) sub.textContent = '登录后会把你的歌单、常听歌手和最近播放放在这里；也可以直接搜索或导入本地音乐。';
    else sub.textContent = '从你的歌单、最近播放、平台推荐和常听歌手开始。';
  }
  if (weatherMeta) {
    var meta = loggedOutHome ? ['跨平台搜索', '本地音乐', '热门电台'] : ['个人推荐', '平台歌单', '热门电台'];
    weatherMeta.innerHTML = meta.map(function (text) { return '<span class="home-weather-pill">' + escHtml(text) + '</span>'; }).join('');
  }
  var daily = homeDiscoverState.songs[0] || null;
  var cardSongB = homeDiscoverState.songs[1] || null;
  var cardSongC = homeDiscoverState.songs[2] || null;
  var playlistItem = homeDiscoverState.playlists[0] || null;
  var podcastItem = homeDiscoverState.podcasts[0] || null;
  var summary = homeListenSummary();
  var weatherCardTitle = document.getElementById('home-weather-card-title');
  var weatherCardSub = document.getElementById('home-weather-card-sub');
  var dailyTitle = document.getElementById('home-daily-title');
  var dailySub = document.getElementById('home-daily-sub');
  var privateTitle = document.getElementById('home-private-title');
  var privateSub = document.getElementById('home-private-sub');
  var continueTitle = document.getElementById('home-continue-title');
  var continueSub = document.getElementById('home-continue-sub');
  var profileTitle = document.getElementById('home-profile-title');
  var profileSub = document.getElementById('home-profile-sub');
  var libTitle = document.getElementById('home-library-title');
  var libSub = document.getElementById('home-library-sub');
  if (weatherCardTitle) weatherCardTitle.textContent = '我的歌单库';
  if (weatherCardSub) {
    weatherCardSub.textContent = playlistItem ? (((playlistItem.trackCount || 0) ? playlistItem.trackCount + ' 首 · ' : '') + (playlistItem.creator || '歌单库') + ' · 非猜你喜欢') : '打开歌单库 · 不是猜你喜欢'
  }
  if (continueTitle) continueTitle.textContent = summary.recent ? summary.recent.name : '继续听';
  if (continueSub) continueSub.textContent = summary.recent ? (summary.recent.artist || summary.recent.source || '最近播放') : '最近播放会出现在这里';
  if (profileTitle) profileTitle.textContent = summary.topArtist ? summary.topArtist.name : (summary.topSong ? summary.topSong.name : '听歌画像');
  if (profileSub) profileSub.textContent = summary.topArtist ? ('常听歌手 · ' + summary.topArtist.plays + ' 次') : (summary.totalPlays ? summary.totalPlays + ' 次有效播放' : '播放几首后生成偏好');
  if (loggedOutHome) {
    if (dailyTitle) dailyTitle.textContent = (typeof isKugouLiteHomeRecommendActive === 'function' && isKugouLiteHomeRecommendActive()) ? '猜你喜欢' : '每日推荐';
    if (dailySub) dailySub.textContent = (typeof isKugouLiteHomeRecommendActive === 'function' && isKugouLiteHomeRecommendActive()) ? '登录后同步酷狗概念版听歌品味推荐' : '登录后同步你的今日歌曲';
    if (privateTitle) privateTitle.textContent = '推荐歌曲';
    if (privateSub) privateSub.textContent = '登录后同步更多歌曲';
    if (libTitle) libTitle.textContent = '更多歌曲';
    if (libSub) libSub.textContent = '播放后会继续补全推荐';
    setHomeArt('home-weather-art', '', 280);
    setHomeArt('home-daily-art', '', 280);
    setHomeArt('home-private-art', '', 280);
    setHomeArt('home-continue-art', summary.recent && summary.recent.cover, 280);
    setHomeArt('home-profile-art', summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover, 280);
    setHomeArt('home-library-art', '', 280);
  } else {
    if (typeof isKugouLiteHomeRecommendActive === 'function' && isKugouLiteHomeRecommendActive()) {
      if (dailyTitle) dailyTitle.textContent = '猜你喜欢';
      if (dailySub) dailySub.textContent = daily
        ? ((daily.artist || songSourceLabel(daily) || '品味推荐') + ' · 酷狗概念版猜你喜欢')
        : ((homeDiscoverState.recommendEndpoint === '/top/card')
          ? '精选兜底 · 非我喜欢歌单'
          : '根据听歌品味/习惯推荐 · 点击播放');
    } else {
      if (dailyTitle) dailyTitle.textContent = daily ? daily.name : '每日推荐';
      if (dailySub) dailySub.textContent = daily ? ((daily.artist || songSourceLabel(daily) || '今日歌曲') + ' · 点击播放今日队列') : '同步你的今日歌曲';
    }
    if (privateTitle) privateTitle.textContent = cardSongB ? cardSongB.name : '私人雷达';
    if (privateSub) privateSub.textContent = cardSongB ? (cardSongB.artist || songSourceLabel(cardSongB) || '推荐歌曲') : (homeDiscoverState.songs.length + ' 首 · 根据今日推荐与常听偏好');
    if (libTitle) libTitle.textContent = cardSongC ? cardSongC.name : (summary.topArtist ? summary.topArtist.name : '更多歌曲');
    if (libSub) libSub.textContent = cardSongC ? (cardSongC.artist || songSourceLabel(cardSongC) || '推荐歌曲') : (summary.topArtist ? ('歌手偏好 · ' + summary.topArtist.plays + ' 次') : '播放几首后生成你的偏好');
    setHomeArt('home-weather-art', (userPlaylists[0] && userPlaylists[0].cover) || (playlistItem && playlistItem.cover) || daily && daily.cover, 280);
    setHomeArt('home-daily-art', daily && daily.cover, 280);
    setHomeArt('home-private-art', cardSongB && cardSongB.cover || daily && daily.cover || summary.recent && summary.recent.cover || playlistItem && playlistItem.cover, 280);
    setHomeArt('home-continue-art', summary.recent && summary.recent.cover || playlistItem && playlistItem.cover, 280);
    setHomeArt('home-profile-art', summary.topSong && summary.topSong.cover || podcastItem && podcastItem.cover, 280);
    setHomeArt('home-library-art', cardSongC && cardSongC.cover || summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover || podcastItem && podcastItem.cover, 280);
  }
  renderHomeTiles();
}


function isKugouLiteHomeRecommendActive() {
  try {
    if (homeDiscoverState && (homeDiscoverState.source === 'kugou-lite' || homeDiscoverState.recommendMode === 'guess-like')) return true;
    if (typeof kugouLiteSessionLoggedIn === 'function' && kugouLiteSessionLoggedIn()) return true;
    if (typeof hasPlatformLogin === 'function' && hasPlatformLogin('kugou-lite')) return true;
    if (typeof kugouLiteLoginStatus !== 'undefined' && kugouLiteLoginStatus) {
      if (kugouLiteLoginStatus.loggedIn) return true;
      if (kugouLiteLoginStatus.userid || kugouLiteLoginStatus.userId) return true;
      if (kugouLiteLoginStatus.nickname && kugouLiteLoginStatus.playbackKeyReady) return true;
      if (kugouLiteLoginStatus.token || kugouLiteLoginStatus.cookie || kugouLiteLoginStatus.session) return true;
    }
    if (typeof activeAccountProvider !== 'undefined' && activeAccountProvider === 'kugou-lite') return true;
    if (typeof kugouLiteIsActiveAccount === 'function' && kugouLiteIsActiveAccount()) return true;
    try {
      var raw = localStorage.getItem('kugouLiteSession') || localStorage.getItem('kugou-lite-session') || sessionStorage.getItem('kugouLiteSession');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && (parsed.userid || parsed.userId || parsed.token || parsed.loggedIn)) return true;
      }
    } catch (_ls) {}
  } catch (_e) {}
  return false;
}


async function fillHomeDiscoverFromKugouLite() {
  var liteOn = false;
  try {
    if (typeof isKugouLiteHomeRecommendActive === 'function') liteOn = !!isKugouLiteHomeRecommendActive();
    if (!liteOn && typeof kugouLiteSessionLoggedIn === 'function') liteOn = !!kugouLiteSessionLoggedIn();
    if (!liteOn && typeof hasPlatformLogin === 'function') liteOn = !!hasPlatformLogin('kugou-lite');
    if (!liteOn && typeof kugouLiteLoginStatus !== 'undefined' && kugouLiteLoginStatus) {
      liteOn = !!(kugouLiteLoginStatus.loggedIn || kugouLiteLoginStatus.userid || kugouLiteLoginStatus.userId);
    }
    if (!liteOn && typeof activeAccountProvider !== 'undefined' && activeAccountProvider === 'kugou-lite') liteOn = true;
  } catch (_) {}
  // Still attempt API when session may exist server-side even if UI status lagged.
  if (!liteOn) {
    try {
      var probe = await apiJson('/api/kugou-lite/recommendations?limit=4&t=' + Date.now(), { timeoutMs: 8000 });
      if (probe && Array.isArray(probe.songs) && probe.songs.length) {
        liteOn = true;
      } else if (probe && probe.error && probe.error !== 'KUGOU_LITE_LOGIN_REQUIRED') {
        liteOn = true;
      }
    } catch (_probe) {}
  }
  if (!liteOn) return false;
  try {
    var data = await apiJson('/api/kugou-lite/recommendations?limit=30&t=' + Date.now(), { timeoutMs: 16000 });
    var songs = data && Array.isArray(data.songs) ? data.songs.map(cloneSong) : [];
    if (!songs.length) return false;
    var playable = songs.filter(function (s) { return s && s.playable !== false && !s.vipRequired; });
    homeDiscoverState.songs = (playable.length ? playable : songs).slice();
    homeDiscoverState.mode = homeDiscoverState.mode || 'member';
    homeDiscoverState.loggedIn = true;
    homeDiscoverState.updatedAt = Number(data && data.updatedAt) || Date.now();
    homeDiscoverState.error = '';
    homeDiscoverState.source = 'kugou-lite';
    homeDiscoverState.recommendMode = data && data.mode ? String(data.mode) : 'guess-like';
    homeDiscoverState.recommendEndpoint = data && data.endpoint ? String(data.endpoint) : '';
    return true;
  } catch (e) {
    console.warn('[HomeDiscoverLite]', e);
    return false;
  }
}

async function loadHomeDiscover(force) {
  if (homeDiscoverState.loading) return;
  if (homeDiscoverState.loaded && !force) return;
  var token = ++homeDiscoverToken;
  homeDiscoverState.loading = true;
  homeDiscoverState.error = '';
  renderHomeDiscover();
  try {
    var data = await apiJson('/api/discover/home?t=' + Date.now());
    if (token !== homeDiscoverToken) return;
    homeDiscoverState.loggedIn = !!(data && data.loggedIn) || hasAnyPlatformLogin();
    homeDiscoverState.mode = data && data.mode || (homeDiscoverState.loggedIn ? 'member' : 'starter');
    homeDiscoverState.songs = homeDiscoverState.loggedIn ? (data && data.dailySongs || []).map(cloneSong) : [];
    homeDiscoverState.playlists = homeDiscoverState.loggedIn ? ((data && data.playlists && data.playlists.length) ? data.playlists : userPlaylists.slice(0, 10)) : [];
    homeDiscoverState.podcasts = homeDiscoverState.loggedIn ? (data && data.podcasts || []) : [];
    homeDiscoverState.updatedAt = Number(data && data.updatedAt) || Date.now();
    homeDiscoverState.source = (data && data.source) || (homeDiscoverState.songs.length ? 'netease' : '');
    // When 酷狗概念版 is logged in, ALWAYS use 猜你喜欢 (personal FM) for this home entry — never keep NetEase dailySongs / never 我喜欢.
    if (typeof isKugouLiteHomeRecommendActive === 'function' ? isKugouLiteHomeRecommendActive() : (typeof hasPlatformLogin === 'function' && hasPlatformLogin('kugou-lite'))) {
      await fillHomeDiscoverFromKugouLite();
    } else if ((!homeDiscoverState.songs || !homeDiscoverState.songs.length) && homeDiscoverState.loggedIn) {
      await fillHomeDiscoverFromKugouLite();
    }
    homeDiscoverState.loaded = true;
  } catch (e) {
    console.warn('home discover failed:', e);
    if (token === homeDiscoverToken) homeDiscoverState.error = 'DISCOVER_FAILED';
  } finally {
    if (token === homeDiscoverToken) {
      homeDiscoverState.loading = false;
      renderHomeDiscover();
    }
  }
}
