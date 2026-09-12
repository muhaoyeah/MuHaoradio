const fs=require('fs');
const overlay=fs.readFileSync('public/js/modules/10-shell/04-desktop-overlay-fullscreen.js','utf8');
const foreachAt=overlay.indexOf("document.querySelectorAll('[data-window-action]')");
// walk back for function start / var api
const before=overlay.slice(0, foreachAt);
const apiMatches=[...before.matchAll(/var api = [^;]+;/g)];
console.log('api assignments before forEach:', apiMatches.slice(-3).map(m=>m[0]));
const fnStarts=[...before.matchAll(/function [A-Za-z0-9_]+\(/g)].slice(-5);
console.log('recent fns', fnStarts.map(m=>m[0]+'@'+m.index));
// Find daily review time updater upstream
const {execSync}=require('child_process');
console.log(execSync('rg -n "daily-review-time|daily-review-date" public/js -g "*.js"',{encoding:'utf8'}));
