const fs = require('fs');
const path = require('path');
const root = 'C:/Users/MUHAO/Desktop/新建文件夹/muhaoradio';
const modRoot = path.join(root, 'public/js/modules');
const dirs = fs.readdirSync(modRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
for (const d of dirs) {
  console.log('\n## ' + d);
  const files = fs.readdirSync(path.join(modRoot, d)).filter(f => f.endsWith('.js')).sort();
  for (const f of files) {
    const p = path.join(modRoot, d, f);
    const lines = fs.readFileSync(p, 'utf8').split(/\n/).length;
    console.log('  - ' + f + '  (~' + lines + ' lines)');
  }
}
console.log('\n## other');
for (const rel of ['public/js/index-loader.js','desktop','public/css','server.js','kugou-api.js','qishui-api.js','qq-vip-api.js','spotify-api.js']) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    let n = 0;
    (function walk(x){ for (const e of fs.readdirSync(x,{withFileTypes:true})) { const y=path.join(x,e.name); if(e.isDirectory()) walk(y); else n++; } })(p);
    console.log('  - ' + rel + '/ (' + n + ' files)');
  } else {
    console.log('  - ' + rel + ' (~' + fs.readFileSync(p,'utf8').split(/\n/).length + ' lines)');
  }
}
