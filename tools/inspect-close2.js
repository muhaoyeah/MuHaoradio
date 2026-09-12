const fs=require('fs');

// Find window action binding
const overlay=fs.readFileSync('public/js/modules/10-shell/04-desktop-overlay-fullscreen.js','utf8');
let pos=0, n=0;
while((pos=overlay.indexOf('data-window-action', pos))>=0 && n<8){
  console.log('\n@', pos);
  console.log(overlay.slice(Math.max(0,pos-120), pos+500));
  pos++; n++;
}

// clock in html/css/js
for (const f of ['public/index.html','public/css/muhao-home-hero.css','public/js/modules/05-playback/03b-muhao-home-hero.js']){
  const t=fs.readFileSync(f,'utf8');
  const hits=[...t.matchAll(/clock|home-hero-time|hero-time|--:--/gi)].slice(0,10);
  console.log('\n'+f+' hits', hits.map(h=>h[0]+'@'+h.index));
}

// STARTUP_FAST_SKIP key name
const all=fs.readFileSync('public/js/modules/00-state/07-ui-playback-runtime.js','utf8');
// search elsewhere
const {execSync}=require('child_process');
console.log(execSync('rg -n "STARTUP_FAST_SKIP" public/js -g "*.js"',{encoding:'utf8'}));
