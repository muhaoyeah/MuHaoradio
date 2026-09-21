'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('empty-home entrance trigger and CSS contracts exist', () => {
  const wall = read('public/js/modules/05-playback/04-home-empty-wallpaper.js');
  const css = read('public/css/index.css');
  const hero = read('public/css/muhao-home-hero.css');
  const splash = read('public/js/modules/10-shell/03-splash.js');

  assert.match(wall, /function triggerHomeShellEntrance\s*\(/);
  assert.match(wall, /function forceHomeShellEntranceAfterSplash\s*\(/);
  assert.match(wall, /home-shell-entering/);
  assert.match(wall, /requestAnimationFrame/);
  assert.match(splash, /forceHomeShellEntranceAfterSplash|triggerHomeShellEntrance/);

  assert.match(css, /home-shell-entering/);
  assert.match(css, /@keyframes\s+home-card-enter/);
  assert.match(css, /@keyframes\s+home-copy-enter/);
  assert.match(hero, /home-shell-entering/);
  assert.match(hero, /@keyframes\s+home-hero-enter/);

  // Must remain entrance-only: no sheen/pointer gloss helpers reintroduced.
  assert.doesNotMatch(wall + css, /home-card-sheen|bindHomeCardPointerGloss/);
});