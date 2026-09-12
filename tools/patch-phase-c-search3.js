const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'public/js/modules/05-playback/07-search.js');
let t = fs.readFileSync(p, 'utf8');
if (!t.includes("var kugouLiteBtn = document.getElementById('search-mode-kugou-lite');")) {
  t = t.replace(
    `  var kugouBtn = document.getElementById('search-mode-kugou');
  var qishuiBtn = document.getElementById('search-mode-qishui');`,
    `  var kugouBtn = document.getElementById('search-mode-kugou');
  var kugouLiteBtn = document.getElementById('search-mode-kugou-lite');
  var qishuiBtn = document.getElementById('search-mode-qishui');`
  );
}
if (!t.includes("kugouLiteBtn.classList.toggle('active', searchMode === 'kugou-lite')")) {
  t = t.replace(
    `  if (kugouBtn) {
    kugouBtn.classList.toggle('active', searchMode === 'kugou');
    kugouBtn.setAttribute('aria-selected', searchMode === 'kugou' ? 'true' : 'false');
  }
  if (qishuiBtn) {`,
    `  if (kugouBtn) {
    kugouBtn.classList.toggle('active', searchMode === 'kugou');
    kugouBtn.setAttribute('aria-selected', searchMode === 'kugou' ? 'true' : 'false');
  }
  if (kugouLiteBtn) {
    kugouLiteBtn.classList.toggle('active', searchMode === 'kugou-lite');
    kugouLiteBtn.setAttribute('aria-selected', searchMode === 'kugou-lite' ? 'true' : 'false');
  }
  if (qishuiBtn) {`
  );
}
fs.writeFileSync(p, t, 'utf8');
console.log('lite tab toggle ok');
