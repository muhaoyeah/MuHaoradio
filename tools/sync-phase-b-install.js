const fs = require('fs');
const path = require('path');
const root = process.cwd();
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
  'desktop/kugou-lite-runtime.js',
  'public/js/modules/00-state/00-core-stores.js',
  'public/js/modules/08-account/01-login-modal-utils.js',
  'public/js/modules/08-account/02-login-status.js',
  'public/js/modules/08-account/03-login-modal-flows.js',
  'public/js/modules/08-account/04-user-modal-logout.js',
  '.gitignore',
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
// also vendor api if missing in install
const vendorFrom = path.join(root, 'vendor/KuGouMusicApi');
const vendorTo = path.join(inst, 'vendor/KuGouMusicApi');
if (fs.existsSync(vendorFrom) && !fs.existsSync(path.join(vendorTo, 'app.js'))) {
  console.log('NOTE: vendor/KuGouMusicApi not fully present in install; not recursively copying node_modules here');
}