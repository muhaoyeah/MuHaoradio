'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('kugou-lite guess-like recommendations contracts', () => {
  const media = read('desktop/kugou-lite-media.js');
  const server = read('server.js');

  assert.match(media, /async function handleLiteRecommendations\s*\(/);
  assert.match(media, /remain_songcnt:\s*0/);
  assert.match(media, /proxyLite\('\/personal\/fm'/);
  assert.match(media, /async function dropLikedSongs\s*\(/);
  assert.match(media, /excludeLiked:\s*true/);

  const start = media.indexOf('async function handleLiteRecommendations');
  const end = media.indexOf('\nmodule.exports', start);
  const rec = media.slice(start, end > start ? end : start + 8000);

  // Source endpoints must be FM / AI / top-card — not playlist tracks fetch as the feed.
  assert.match(rec, /'\/personal\/fm'/);
  assert.match(rec, /'\/ai\/recommend'|"\/ai\/recommend"|\/ai\/recommend/);
  assert.match(rec, /'\/top\/card'/);
  assert.doesNotMatch(rec, /proxyLite\('\/playlist\/track'|proxyLite\('\/playlist\/tracks'/);
  assert.doesNotMatch(rec, /handleLitePlaylistTracks\s*\(/);

  assert.match(server, /\/api\/kugou-lite\/recommendations/);
  assert.match(server, /handleLiteRecommendations/);
});

test('kugou-lite recommendations route is registered once as lite handler', () => {
  const server = read('server.js');
  const hits = server.match(/pn === '\/api\/kugou-lite\/recommendations'/g) || [];
  assert.ok(hits.length >= 1, 'missing /api/kugou-lite/recommendations route');
});