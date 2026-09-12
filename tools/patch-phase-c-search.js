const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function patch(file, replacers) {
  const p = path.join(root, file);
  let text = fs.readFileSync(p, 'utf8');
  const before = text;
  for (const [from, to, label] of replacers) {
    if (typeof from === 'string') {
      if (!text.includes(from)) {
        if (text.includes(to) || (label && text.includes(label))) {
          console.log('skip already', file, label || from.slice(0, 40));
          continue;
        }
        throw new Error('anchor missing in ' + file + ': ' + (label || from.slice(0, 80)));
      }
      if (to && text.includes(label || '___never___') && label && text.includes(to.slice(0, Math.min(40, to.length)))) {
        // fallthrough
      }
      text = text.replace(from, to);
    } else {
      const next = text.replace(from, to);
      if (next === text) throw new Error('regex no match in ' + file + ': ' + (label || from));
      text = next;
    }
  }
  if (text !== before) {
    fs.writeFileSync(p, text, 'utf8');
    console.log('patched', file);
  } else {
    console.log('unchanged', file);
  }
}

// --- 07-search.js ---
patch('public/js/modules/05-playback/07-search.js', [
  [
    "var SEARCH_HISTORY_MODES = ['song', 'netease', 'qq', 'kugou', 'qishui', 'spotify', 'podcast'];",
    "var SEARCH_HISTORY_MODES = ['song', 'netease', 'qq', 'kugou', 'kugou-lite', 'qishui', 'spotify', 'podcast'];",
    'SEARCH_HISTORY_MODES'
  ],
  [
    `function songProviderKey(song) {
  if (song && (song.provider === 'spotify' || song.source === 'spotify' || song.type === 'spotify' || song.spotifyId || song.spotifyUri)) return 'spotify';
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'qishui' || song.source === 'qishui' || song.type === 'qishui')) return 'qishui';
  if (song && (song.provider === 'kugou' || song.source === 'kugou' || song.type === 'kugou' || song.hash || song.audioHash)) return 'kugou';
  return 'netease';
}`,
    `function songProviderKey(song) {
  if (song && (song.provider === 'spotify' || song.source === 'spotify' || song.type === 'spotify' || song.spotifyId || song.spotifyUri)) return 'spotify';
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'qishui' || song.source === 'qishui' || song.type === 'qishui')) return 'qishui';
  if (song && (song.provider === 'kugou-lite' || song.source === 'kugou-lite' || song.type === 'kugou-lite' || song.platform === 'lite')) return 'kugou-lite';
  if (song && (song.provider === 'kugou' || song.source === 'kugou' || song.type === 'kugou' || song.hash || song.audioHash)) return 'kugou';
  return 'netease';
}`,
    'songProviderKey-lite'
  ],
  [
    "var key = /^(netease|qq|kugou|qishui|spotify)$/.test(String(rawKey || '')) ? String(rawKey) : songProviderKey(song);\n  var label = key === 'qq' ? 'QQ' : (key === 'kugou' ? 'KG' : (key === 'qishui' ? 'QS' : (key === 'spotify' ? 'SP' : 'NE')));",
    "var key = /^(netease|qq|kugou|kugou-lite|qishui|spotify)$/.test(String(rawKey || '')) ? String(rawKey) : songProviderKey(song);\n  var label = key === 'qq' ? 'QQ' : (key === 'kugou-lite' ? '概念' : (key === 'kugou' ? 'KG' : (key === 'qishui' ? 'QS' : (key === 'spotify' ? 'SP' : 'NE'))));",
    'songSourceTagHtml'
  ],
  [
    `function controlSourceProviders() {
  return [
    { key: 'netease', label: 'NE', title: '网易云' },
    { key: 'qq', label: 'QQ', title: 'QQ音乐' },
    { key: 'kugou', label: 'KG', title: '酷狗' },
    { key: 'qishui', label: 'QS', title: '汽水' },
    { key: 'spotify', label: 'SP', title: 'Spotify' }
  ];
}`,
    `function controlSourceProviders() {
  return [
    { key: 'netease', label: 'NE', title: '网易云' },
    { key: 'qq', label: 'QQ', title: 'QQ音乐' },
    { key: 'kugou', label: 'KG', title: '酷狗' },
    { key: 'kugou-lite', label: '概念', title: '酷狗概念版' },
    { key: 'qishui', label: 'QS', title: '汽水' },
    { key: 'spotify', label: 'SP', title: 'Spotify' }
  ];
}`,
    'controlSourceProviders'
  ],
  [
    "  if (provider === 'kugou') return '/api/kugou/search?keywords=' + encodeURIComponent(query) + '&limit=8';\n  if (provider === 'qishui') return '/api/qishui/search?keywords=' + encodeURIComponent(query) + '&limit=8';",
    "  if (provider === 'kugou') return '/api/kugou/search?keywords=' + encodeURIComponent(query) + '&limit=8';\n  if (provider === 'kugou-lite') return '/api/kugou-lite/search?keywords=' + encodeURIComponent(query) + '&limit=8';\n  if (provider === 'qishui') return '/api/qishui/search?keywords=' + encodeURIComponent(query) + '&limit=8';",
    'controlSourceSearchUrl'
  ],
  [
    "var MUSIC_SEARCH_PROVIDER_ORDER = ['netease', 'qq', 'kugou', 'qishui', 'spotify'];",
    "var MUSIC_SEARCH_PROVIDER_ORDER = ['netease', 'qq', 'kugou', 'kugou-lite', 'qishui', 'spotify'];",
    'MUSIC_SEARCH_PROVIDER_ORDER'
  ],
  [
    "  if (provider === 'kugou') return kugouLoginStatus;\n  if (provider === 'qq') return qqLoginStatus;",
    "  if (provider === 'kugou') return kugouLoginStatus;\n  if (provider === 'kugou-lite') return kugouLiteLoginStatus;\n  if (provider === 'qq') return qqLoginStatus;",
    'searchProviderStatus'
  ],
  [
    "  return provider === 'netease' || provider === 'qq' || provider === 'kugou' || provider === 'qishui';\n}\nfunction searchModeProvider(mode) {\n  return mode === 'netease' || mode === 'qq' || mode === 'kugou' || mode === 'qishui' || mode === 'spotify' ? mode : '';\n}",
    "  return provider === 'netease' || provider === 'qq' || provider === 'kugou' || provider === 'kugou-lite' || provider === 'qishui';\n}\nfunction searchModeProvider(mode) {\n  return mode === 'netease' || mode === 'qq' || mode === 'kugou' || mode === 'kugou-lite' || mode === 'qishui' || mode === 'spotify' ? mode : '';\n}",
    'searchProviderCanSearch'
  ],
  [
    "  if (provider === 'kugou') return '/api/kugou/search?keywords=' + encodeURIComponent(q) + suffix;\n  if (provider === 'qishui') return '/api/qishui/search?keywords=' + encodeURIComponent(q) + suffix;",
    "  if (provider === 'kugou') return '/api/kugou/search?keywords=' + encodeURIComponent(q) + suffix;\n  if (provider === 'kugou-lite') return '/api/kugou-lite/search?keywords=' + encodeURIComponent(q) + suffix;\n  if (provider === 'qishui') return '/api/qishui/search?keywords=' + encodeURIComponent(q) + suffix;",
    'searchProviderUrl'
  ],
]);

// Inject ensureKugouLiteSearchTab into updateSearchModeTabs area
(() => {
  const p = path.join(root, 'public/js/modules/05-playback/07-search.js');
  let text = fs.readFileSync(p, 'utf8');
  if (text.includes('function ensureKugouLiteSearchTab')) {
    console.log('skip ensureKugouLiteSearchTab already present');
    return;
  }
  const helper = `
function ensureKugouLiteSearchTab() {
  var tabs = document.getElementById('search-mode-tabs');
  if (!tabs || document.getElementById('search-mode-kugou-lite')) return;
  var kugouBtn = document.getElementById('search-mode-kugou');
  var btn = document.createElement('button');
  btn.id = 'search-mode-kugou-lite';
  btn.type = 'button';
  btn.setAttribute('onclick', "setSearchMode('kugou-lite')");
  btn.setAttribute('aria-selected', 'false');
  btn.textContent = '概念';
  btn.title = '酷狗概念版搜索';
  if (kugouBtn && kugouBtn.parentNode === tabs) tabs.insertBefore(btn, kugouBtn.nextSibling);
  else tabs.appendChild(btn);
}
`;
  if (!text.includes('function updateSearchModeTabs')) throw new Error('updateSearchModeTabs missing');
  text = text.replace('function updateSearchModeTabs', helper + 'function updateSearchModeTabs');
  // call ensure at start of updateSearchModeTabs
  text = text.replace(
    /function updateSearchModeTabs\(\)\s*\{/,
    "function updateSearchModeTabs() {\n  ensureKugouLiteSearchTab();"
  );
  // toggle active for lite button
  if (!text.includes("search-mode-kugou-lite'))")) {
    text = text.replace(
      "var kugouBtn = document.getElementById('search-mode-kugou');",
      "var kugouBtn = document.getElementById('search-mode-kugou');\n  var kugouLiteBtn = document.getElementById('search-mode-kugou-lite');"
    );
    text = text.replace(
      "if (kugouBtn) {\n    kugouBtn.classList.toggle('active', searchMode === 'kugou');\n    kugouBtn.setAttribute('aria-selected', searchMode === 'kugou' ? 'true' : 'false');\n  }",
      "if (kugouBtn) {\n    kugouBtn.classList.toggle('active', searchMode === 'kugou');\n    kugouBtn.setAttribute('aria-selected', searchMode === 'kugou' ? 'true' : 'false');\n  }\n  if (kugouLiteBtn) {\n    kugouLiteBtn.classList.toggle('active', searchMode === 'kugou-lite');\n    kugouLiteBtn.setAttribute('aria-selected', searchMode === 'kugou-lite' ? 'true' : 'false');\n  }"
    );
  }
  // placeholder text
  text = text.replace(
    "(searchMode === 'kugou' ? '搜索酷狗音乐...' :",
    "(searchMode === 'kugou-lite' ? '搜索酷狗概念版...' : (searchMode === 'kugou' ? '搜索酷狗音乐...' :"
  );
  // setSearchMode validation - find the mode assign line
  text = text.replace(
    "mode = (mode === 'podcast' || mode === 'netease' || mode === 'qq' || mode === 'kugou' || mode === 'qishui' || mode === 'spotify') ? mode : 'song';",
    "mode = (mode === 'podcast' || mode === 'netease' || mode === 'qq' || mode === 'kugou' || mode === 'kugou-lite' || mode === 'qishui' || mode === 'spotify') ? mode : 'song';"
  );
  // pageLimitByProvider / songsByProvider if present
  text = text.replace(
    "var pageLimitByProvider = { netease: 18, qq: 12, kugou: 12, qishui: 12, spotify: 10 };",
    "var pageLimitByProvider = { netease: 18, qq: 12, kugou: 12, 'kugou-lite': 12, qishui: 12, spotify: 10 };"
  );
  text = text.replace(
    "var songsByProvider = { netease: [], qq: [], kugou: [], qishui: [], spotify: [] };",
    "var songsByProvider = { netease: [], qq: [], kugou: [], 'kugou-lite': [], qishui: [], spotify: [] };"
  );
  fs.writeFileSync(p, text, 'utf8');
  console.log('patched search tab helpers');
})();

console.log('frontend search patch done');
