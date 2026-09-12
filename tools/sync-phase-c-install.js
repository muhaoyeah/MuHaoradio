const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const candidates = [
  'D:/MuHaoradio/resources/app',
  'D:/MuHaoradio',
];
let inst = null;
for (const c of candidates) {
  if (fs.existsSync(path.join(c, 'server.js')) || fs.existsSync(path.join(c, 'public'))) {
    inst = c; break;
  }
}
if (!inst) {
  console.log('INSTALL_NOT_FOUND');
  process.exit(0);
}
const files = [
  'server.js',
  'desktop/kugou-lite-session.js',
  'desktop/kugou-lite-media.js',
  'desktop/kugou-lite-runtime.js',
  'vendor/KuGouMusicApi/module/search.js',
  'public/js/modules/05-playback/07-search.js',
  'public/js/modules/05-playback/00-api-quality-output.js',
  'public/js/modules/05-playback/13-playback-start-audio.js',
  'public/js/modules/05-playback/11-provider-fallback.js',
  'public/js/modules/06-lyrics/00-lyrics-fetch-parse.js',
];
console.log('install=', inst);
for (const f of files) {
  const from = path.join(root, f);
  if (!fs.existsSync(from)) { console.log('missing source', f); continue; }
  const to = path.join(inst, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('synced', f);
}
const vendorTo = path.join(inst, 'vendor/KuGouMusicApi/app.js');
console.log('vendor_app', fs.existsSync(vendorTo) ? 'present' : 'MISSING');
