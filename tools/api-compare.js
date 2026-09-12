const {execSync}=require('child_process');
const fs=require('fs');
const path=require('path');
function sh(c){return execSync(c,{encoding:'utf8',maxBuffer:20e6}).trim()}

function extractRoutes(src){
  const routes=[];
  const re=/(?:app|router)\.(get|post|put|delete|patch|use)\(\s*['`]([^'`]+)['`]/g;
  let m; while((m=re.exec(src))) routes.push(m[1].toUpperCase()+' '+m[2]);
  // also app.get('/path'
  const re2=/\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
  while((m=re2.exec(src))) {
    const s=m[1].toUpperCase()+' '+m[2];
    if(!routes.includes(s) && m[2].startsWith('/')) routes.push(s);
  }
  return [...new Set(routes)].sort();
}
function extractIpc(src){
  const handlers=[];
  const re=/ipcMain\.(handle|on)\(\s*['"]([^'"]+)['"]/g;
  let m; while((m=re.exec(src))) handlers.push(m[1]+':'+m[2]);
  return [...new Set(handlers)].sort();
}
function extractPreload(src){
  const keys=[];
  // contextBridge.exposeInMainWorld('desktopWindow', { ... }) roughly - collect method names near close:
  const re=/^\s{2,}([a-zA-Z0-9_]+)\s*:/gm;
  // better: between expose blocks
  const blocks=[...src.matchAll(/exposeInMainWorld\(\s*['"]([^'"]+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g)];
  for(const b of blocks){
    const name=b[1];
    const body=b[2];
    const methods=[...body.matchAll(/^\s*([a-zA-Z0-9_]+)\s*[:(]/gm)].map(x=>x[1]);
    for(const meth of methods) keys.push(name+'.'+meth);
  }
  return [...new Set(keys)].sort();
}

const upServer=sh('git show 96091d1:server.js');
const forkServer=sh('git show 83534e1:server.js');
const upMain=sh('git show 96091d1:desktop/main.js');
const forkMain=sh('git show 83534e1:desktop/main.js');
const upPre=sh('git show 96091d1:desktop/preload.js');
const forkPre=sh('git show 83534e1:desktop/preload.js');

const ur=extractRoutes(upServer), fr=extractRoutes(forkServer);
const um=extractIpc(upMain), fm=extractIpc(forkMain);
const up=extractPreload(upPre), fp=extractPreload(forkPre);

function diff(a,b){return a.filter(x=>!b.includes(x))}
console.log('=== ROUTES missing in fork (upstream has) ==='); console.log(diff(ur,fr).join('\n')||'(none)');
console.log('\n=== ROUTES extra in fork ==='); console.log(diff(fr,ur).join('\n')||'(none)');
console.log('\n=== IPC missing in fork ==='); console.log(diff(um,fm).join('\n')||'(none)');
console.log('\n=== IPC extra in fork ==='); console.log(diff(fm,um).join('\n')||'(none)');
console.log('\n=== PRELOAD missing in fork ==='); console.log(diff(up,fp).join('\n')||'(none)');
console.log('\n=== PRELOAD extra in fork ==='); console.log(diff(fp,up).join('\n')||'(none)');
console.log('\ncounts routes up/fork', ur.length, fr.length, 'ipc', um.length, fm.length, 'preload', up.length, fp.length);

// server.js diff hunk summary around conflict
console.log('\n=== server.js diff names only ===');
console.log(sh('git diff 96091d1 83534e1 -- server.js').split('\n').filter(l=>/^[-+]/.test(l) && !/^[-+]{3}/.test(l)).slice(0,80).join('\n'));

// splash auto enter in install vs source
const splashInstall=fs.readFileSync('D:/MuHaoradio/resources/app/public/js/modules/10-shell/03-splash.js','utf8');
const splashSrc=fs.readFileSync('public/js/modules/10-shell/03-splash.js','utf8');
console.log('\n=== splash install has MUHAO_AUTO ===', /MUHAO_AUTO/.test(splashInstall));
console.log('splash src has MUHAO_AUTO ===', /MUHAO_AUTO/.test(splashSrc));
const auto=splashInstall.match(/MUHAO_AUTO[\s\S]{0,400}/);
console.log('install auto snippet:', auto&&auto[0].slice(0,400));
const auto2=splashSrc.match(/MUHAO_AUTO[\s\S]{0,400}/);
console.log('src auto snippet:', auto2&&auto2[0].slice(0,400));
console.log('startupFastSkip default src:', (splashSrc+fs.readFileSync('public/js/modules/00-state/07-ui-playback-runtime.js','utf8')).match(/startupFastSkipPreference[^=]*=[^;]+/)?.[0]);
