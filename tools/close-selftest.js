const fs = require('fs');
const p = 'D:/MuHaoradio/resources/app/public/js/modules/10-shell/03-splash.js';
let t = fs.readFileSync(p, 'utf8');
const needle = 'function onMuhaoSplashEntered() {';
const idx = t.indexOf(needle);
if (idx < 0) throw new Error('no onMuhao');
if (t.includes('MUHAO_CLOSE_SELFTEST')) { console.log('already'); process.exit(0); }
const insert = `function onMuhaoSplashEntered() {
  if (muhaoSplashEnteredOnce) return;
  muhaoSplashEnteredOnce = true;
  try {
    if (typeof bootMuhaoHomeHero === 'function') bootMuhaoHomeHero();
  } catch (e) {}
  /* MUHAO_CLOSE_SELFTEST */
  setTimeout(function () {
    try {
      var b = document.querySelector('[data-window-action="close"]');
      if (b) b.click();
    } catch (e) {}
  }, 3500);
}`;
// replace function body until next function at same level - find matching brace
let i = t.indexOf('{', idx); let depth = 0; let end = i;
for (; end < t.length; end++) {
  if (t[end] === '{') depth++;
  else if (t[end] === '}') { depth--; if (depth === 0) { end++; break; } }
}
t = t.slice(0, idx) + insert + t.slice(end);
fs.writeFileSync(p, t);
console.log('selftest injected');
