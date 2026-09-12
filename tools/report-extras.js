const {execSync}=require('child_process');
const fs=require('fs');
function sh(c){try{return execSync(c,{encoding:'utf8',maxBuffer:30e6})}catch(e){return e.stdout||e.message}}

// conflict resolution hints: MM files in merge
const files=['.gitignore','desktop/main.js','desktop/preload.js','public/index.html','server.js','public/js/index-loader.js','public/js/modules/05-playback/03a-home-dashboard.js','public/js/modules/07-fx/05-fx-panel-performance.js'];
for(const f of files){
  const stat=sh(`git diff 96091d1 83534e1 --stat -- ${f}`);
  console.log('\n####', f);
  console.log(stat.trim());
}

// install-only patches vs merge tip
console.log('\n==== INSTALL vs COMMITTED key deltas ====');
const pairs=[
  ['public/index.html','D:/MuHaoradio/resources/app/public/index.html'],
  ['public/js/modules/10-shell/03-splash.js','D:/MuHaoradio/resources/app/public/js/modules/10-shell/03-splash.js'],
  ['public/js/modules/00-state/07-ui-playback-runtime.js','D:/MuHaoradio/resources/app/public/js/modules/00-state/07-ui-playback-runtime.js'],
  ['server.js','D:/MuHaoradio/resources/app/server.js'],
];
for(const [src,inst] of pairs){
  const a=fs.readFileSync(src,'utf8');
  const b=fs.readFileSync(inst,'utf8');
  console.log(src, 'same?', a===b, 'srcLen', a.length, 'instLen', b.length);
}

// install server muhao debug
const instServer=fs.readFileSync('D:/MuHaoradio/resources/app/server.js','utf8');
console.log('install has muhao-debug-log', instServer.includes('muhao-debug-log'));
console.log('committed has muhao-debug-log', sh('git show 83534e1:server.js').includes('muhao-debug-log'));

// working tree startupFastSkip
const wt=fs.readFileSync('public/js/modules/00-state/07-ui-playback-runtime.js','utf8');
const instRt=fs.readFileSync('D:/MuHaoradio/resources/app/public/js/modules/00-state/07-ui-playback-runtime.js','utf8');
console.log('WT startupFastSkip', wt.match(/startupFastSkipPreference = [^;]+/)?.[0]);
console.log('INST startupFastSkip', instRt.match(/startupFastSkipPreference = [^;]+/)?.[0]);
console.log('COMMIT startupFastSkip', sh('git show 83534e1:public/js/modules/00-state/07-ui-playback-runtime.js').match(/startupFastSkipPreference = [^;]+/)?.[0]);

// preload extra methods detail
const pre=sh('git show 83534e1:desktop/preload.js');
console.log('\nkugou in preload', /kugou/i.test(pre));
const mainDiff=sh('git diff 96091d1 83534e1 -- desktop/main.js');
console.log('main.js +lines about kugou', (mainDiff.match(/kugou/gi)||[]).length);
console.log(mainDiff.split('\n').filter(l=>l.startsWith('+')&&/kugou|concept/i.test(l)).slice(0,30).join('\n'));
