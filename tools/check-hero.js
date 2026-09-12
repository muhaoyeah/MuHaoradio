const fs=require('fs');
const t=fs.readFileSync('C:/Users/MUHAO/Desktop/新建文件夹/muhaoradio/public/js/modules/05-playback/03b-muhao-home-hero.js','utf8');
const i=t.indexOf('function initHomeHeroCarousel');
const j=t.indexOf('function restartHomeHeroCarousel');
console.log('--- init ---\n', t.slice(i, i+900));
console.log('--- restart ---\n', t.slice(j, j+700));
let bal=0; for(const c of t){ if(c==='{')bal++; else if(c==='}')bal--; }
console.log('brace', bal);
