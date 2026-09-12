const fs=require('fs');
const html=fs.readFileSync('public/index.html','utf8');
const i=html.indexOf('--:--');
console.log(html.slice(i-250,i+200));

const overlay=fs.readFileSync('public/js/modules/10-shell/04-desktop-overlay-fullscreen.js','utf8');
const j=overlay.lastIndexOf('var api =', overlay.indexOf('querySelectorAll(\'[data-window-action]\')'));
// find nearest api assignment before the forEach
const foreachAt=overlay.indexOf("document.querySelectorAll('[data-window-action]')");
console.log('\n40 lines before forEach:');
console.log(overlay.slice(foreachAt-800, foreachAt+650));
