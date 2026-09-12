const fs=require('fs');
const path=require('path');
const root=process.cwd();
const inst='D:/MuHaoradio/resources/app';

const files=[
  'public/js/modules/10-shell/03-splash.js',
  'public/js/modules/00-state/07-ui-playback-runtime.js',
  'public/index.html',
  'public/js/modules/05-playback/03b-muhao-home-hero.js',
  'public/js/modules/10-shell/04-desktop-overlay-fullscreen.js',
  'public/js/modules/08-account/03-login-modal-flows.js',
  'public/js/modules/08-account/01-login-modal-utils.js',
  'public/js/modules/07-fx/07-bindings-shelf-immersive.js',
];
for(const f of files){
  const from=path.join(root,f);
  const to=path.join(inst,f);
  fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.copyFileSync(from,to);
  console.log('synced', f);
}

// Strip muhao-debug-log from install server if present
{
  const sp=path.join(inst,'server.js');
  let s=fs.readFileSync(sp,'utf8');
  if(s.includes('muhao-debug-log')){
    // remove a block that handles muhao-debug-log - find and cut
    const re=/\n?\s*if\s*\(\s*pn\s*===\s*['"]\/api\/muhao-debug-log['"]\s*\)\s*\{[\s\S]*?return;\s*\}/;
    if(re.test(s)){
      s=s.replace(re,'\n');
      fs.writeFileSync(sp,s);
      console.log('removed muhao-debug-log route from install server');
    } else {
      console.log('muhao-debug-log present but pattern miss; leaving note');
      // show context
      const i=s.indexOf('muhao-debug-log');
      console.log(s.slice(i-80,i+200));
    }
  } else console.log('install server clean of debug log');
}

// Verify install clean
const idx=fs.readFileSync(path.join(inst,'public/index.html'),'utf8');
const splash=fs.readFileSync(path.join(inst,'public/js/modules/10-shell/03-splash.js'),'utf8');
const rt=fs.readFileSync(path.join(inst,'public/js/modules/00-state/07-ui-playback-runtime.js'),'utf8');
console.log('install probe?', /MUHAO_SPLASH_PROBE|MUHAO_FORCE_ENTER/.test(idx));
console.log('install SPLASH-DEBUG?', /SPLASH-DEBUG/.test(splash));
console.log('install schedule auto?', splash.includes('scheduleMuhaoSplashAutoEnter'));
console.log('install fastSkip default false?', /STARTUP_FAST_SKIP_STORE_KEY, false/.test(rt));
console.log('install canvas?', idx.includes('id="canvas-container"'));
console.log('install loader?', idx.includes('js/index-loader.js'));
