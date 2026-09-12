const fs=require('fs');
const path=require('path');

function read(p){return fs.readFileSync(p,'utf8')}
function write(p,t){fs.writeFileSync(p,t); console.log('wrote',p,t.length)}

const root=process.cwd();

// --- 1) runtime: fast-skip default false ---
{
  const p=path.join(root,'public/js/modules/00-state/07-ui-playback-runtime.js');
  let t=read(p);
  t=t.replace(
    /startupFastSkipPreference = readBooleanPreference\(STARTUP_FAST_SKIP_STORE_KEY,\s*true\)/,
    'startupFastSkipPreference = readBooleanPreference(STARTUP_FAST_SKIP_STORE_KEY, false)'
  );
  if(!t.includes('readBooleanPreference(STARTUP_FAST_SKIP_STORE_KEY, false)')) throw new Error('fastSkip default not false');
  write(p,t);
}

// --- 2) splash: clean auto-enter, no debug titles ---
{
  const p=path.join(root,'public/js/modules/10-shell/03-splash.js');
  let t=read(p);
  // strip any SPLASH-DEBUG title assignments if present
  t=t.replace(/\s*document\.title\s*=\s*'SPLASH-DEBUG:[^']*';\s*/g,'\n');

  // Replace MUHAO_AUTO_ENTER block with cleaner version + hook for home hero
  const oldAuto = /\/\/ MUHAO_AUTO_ENTER_AFTER_READY:[\s\S]*?setTimeout\(function \(\) \{[\s\S]*?\}, 200\);\s*\}/;
  const newAuto = `// MUHAO: play full splash, then auto-enter via official dismissSplash (never stuck on splash).
var muhaoSplashAutoEnterTimer = null;
function scheduleMuhaoSplashAutoEnter() {
  if (muhaoSplashAutoEnterTimer) clearTimeout(muhaoSplashAutoEnterTimer);
  muhaoSplashAutoEnterTimer = setTimeout(function () {
    muhaoSplashAutoEnterTimer = null;
    try {
      if (splashReadyToEnter && typeof dismissSplash === 'function') dismissSplash();
    } catch (e) {}
  }, 450);
}
function onMuhaoSplashEntered() {
  try {
    if (typeof bootMuhaoHomeHero === 'function') bootMuhaoHomeHero();
  } catch (e) {}
}`;
  if(oldAuto.test(t)) t=t.replace(oldAuto, newAuto);
  else if(!t.includes('scheduleMuhaoSplashAutoEnter')) {
    // insert before markSplashReadyToEnter
    t=t.replace('function markSplashReadyToEnter()', newAuto + '\n\nfunction markSplashReadyToEnter()');
  }

  // Ensure markSplashReadyToEnter calls scheduleMuhaoSplashAutoEnter
  if(!t.includes('scheduleMuhaoSplashAutoEnter()')) {
    t=t.replace(
      /function markSplashReadyToEnter\(\) \{[\s\S]*?splashReadyToEnter = true;[\s\S]*?\n\}/,
      function(block){
        if(block.includes('scheduleMuhaoSplashAutoEnter')) return block;
        return block.replace(/splashReadyToEnter = true;/, 'splashReadyToEnter = true;\n  scheduleMuhaoSplashAutoEnter();');
      }
    );
  } else {
    // if old setTimeout still in markSplashReady - already replaced
  }

  // Hook dismissSplash success path to boot carousel once
  if(!t.includes('onMuhaoSplashEntered()')) {
    t=t.replace(
      /function dismissSplash\(opts\) \{/,
      'function dismissSplash(opts) {\n  var __muhaoEnteredHook = true;'
    );
    // Better: after finishSplashReveal or at end of dismiss when hide applied
    // Find finishSplashReveal or body class removal
  }

  write(p,t);
  console.log('splash has schedule', t.includes('scheduleMuhaoSplashAutoEnter'));
  console.log('splash has debug title', /SPLASH-DEBUG/.test(t));
}

console.log('phase1 done');
