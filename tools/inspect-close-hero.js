const fs=require('fs');
const path=require('path');

// Inspect close binding and hero clock
const overlay=fs.readFileSync('public/js/modules/10-shell/04-desktop-overlay-fullscreen.js','utf8');
const idx=overlay.indexOf('data-window-action');
console.log('--- overlay close context ---');
console.log(overlay.slice(idx-200, idx+700));

const hero=fs.readFileSync('public/js/modules/05-playback/03b-muhao-home-hero.js','utf8');
console.log('\n--- hero file ---');
console.log(hero.slice(0,2500));
console.log('...');
console.log(hero.slice(-2000));

// Find STARTUP_FAST_SKIP key
const rt=fs.readFileSync('public/js/modules/00-state/07-ui-playback-runtime.js','utf8');
console.log('\n--- runtime ---\n', rt);
