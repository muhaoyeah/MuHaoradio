const {execSync}=require('child_process');
const fs=require('fs');
function sh(c){return execSync(c,{encoding:'utf8',maxBuffer:30e6})}
function apis(src){
  const set=new Set();
  const re=/['"`](\/api\/[A-Za-z0-9_\-./{}:]+)['"`]/g;
  let m; while((m=re.exec(src))) set.add(m[1].replace(/\/+$/,''));
  // also pn === '/api/...
  const re2=/pn\s*===\s*['"](\/api\/[^'"]+)['"]/g;
  while((m=re2.exec(src))) set.add(m[1]);
  return [...set].sort();
}
const up=apis(sh('git show 96091d1:server.js'));
const fork=apis(sh('git show 83534e1:server.js'));
const miss=up.filter(x=>!fork.includes(x));
const extra=fork.filter(x=>!up.includes(x));
console.log('upstream api count', up.length, 'fork', fork.length);
console.log('\nMISSING in fork');
console.log(miss.join('\n')||'(none)');
console.log('\nEXTRA in fork');
console.log(extra.join('\n')||'(none)');
// also walk server-related modules if any
const files=sh('git ls-tree -r --name-only 83534e1').split(/\r?\n/).filter(f=>/server|route|api/i.test(f) && f.endsWith('.js'));
console.log('\nserver-related files fork', files.join(', '));

// startupFastSkip default
const runtime=sh('git show 83534e1:public/js/modules/00-state/07-ui-playback-runtime.js');
const m=runtime.match(/startupFastSkipPreference[\s\S]{0,120}/);
console.log('\nstartupFastSkip snippet', m&&m[0]);
const upRuntime=sh('git show 96091d1:public/js/modules/00-state/07-ui-playback-runtime.js');
const m2=upRuntime.match(/startupFastSkipPreference[\s\S]{0,120}/);
console.log('upstream startupFastSkip', m2&&m2[0]);

// working tree dirty splash vs committed
const dirty=fs.readFileSync('public/js/modules/10-shell/03-splash.js','utf8');
console.log('\nworking tree MUHAO_AUTO', /MUHAO_AUTO/.test(dirty));
console.log('working tree SPLASH-DEBUG', /SPLASH-DEBUG/.test(dirty));
console.log('install index has probe', fs.readFileSync('D:/MuHaoradio/resources/app/public/index.html','utf8').includes('MUHAO_SPLASH_PROBE'));
console.log('source index has probe', fs.readFileSync('public/index.html','utf8').includes('MUHAO_SPLASH_PROBE'));

// list all fork-only server endpoints with methods by nearby lines
const forkServer=sh('git show 83534e1:server.js');
for (const ep of extra){
  const i=forkServer.indexOf(ep);
  console.log('\n---', ep, 'ctx ---');
  console.log(forkServer.slice(Math.max(0,i-80), i+200).replace(/\s+/g,' ').slice(0,280));
}
