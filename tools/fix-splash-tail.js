const fs=require('fs');
const path=require('path');
const p=path.join(process.cwd(),'public/js/modules/10-shell/03-splash.js');
let t=fs.readFileSync(p,'utf8');

const start=t.indexOf('function dismissSplash(opts)');
if(start<0) throw new Error('dismissSplash missing');

const tail = `function dismissSplash(opts) {
  opts = opts || {};
  var s = document.getElementById('splash');
  if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;
  var instant = !!opts.instant;
  markAppPerf(instant ? 'splash-skip' : 'splash-dismiss');
  if (splashTimer) { clearTimeout(splashTimer); splashTimer = null; }
  if (typeof muhaoSplashAutoEnterTimer !== 'undefined' && muhaoSplashAutoEnterTimer) {
    clearTimeout(muhaoSplashAutoEnterTimer);
    muhaoSplashAutoEnterTimer = null;
  }
  splashReadyToEnter = false;
  s.classList.remove('ready');
  setTimeout(stopSplashIntroSound, instant ? 0 : 240);
  if (instant) {
    s.classList.add('hide');
    s.style.display = 'none';
    splashAnimating = false;
    document.body.classList.remove('splash-active');
    document.body.classList.remove('splash-revealing');
    revealIdleParticles(0, 520);
    finishSplashReveal(true, { fastSkip: true, reason: 'fast-skip' });
    onMuhaoSplashEntered();
    return;
  }
  if (typeof shouldUseIdleWallpaperPreview === 'function'
    ? shouldUseIdleWallpaperPreview(true)
    : (typeof shouldShowEmptyHomeAfterSplash === 'function' && shouldShowEmptyHomeAfterSplash())) {
    activateHomeWallpaperPreview();
  }
  revealIdleParticles(0, reduceSplashMotion ? 520 : 920);
  document.body.classList.add('splash-revealing');
  s.classList.add('exiting');

  var content = s.querySelector('.splash-content');
  if (content) {
    content.style.transition = 'opacity 360ms cubic-bezier(.22,1,.36,1), transform 520ms cubic-bezier(.22,1,.36,1)';
    content.style.opacity = '0';
    content.style.transform = 'translateY(-10px) scale(.992)';
  }

  setTimeout(function () {
    s.classList.add('hide');
    splashAnimating = false;
    document.body.classList.remove('splash-active');
    document.body.classList.remove('splash-revealing');
    if (s && s.parentNode) s.style.display = 'none';
    finishSplashReveal(true, { reason: 'splash-dismiss' });
    onMuhaoSplashEntered();
  }, 620);
}

// MUHAO: play full splash animation, then auto-enter via official dismissSplash (never stuck).
var muhaoSplashAutoEnterTimer = null;
var muhaoSplashEnteredOnce = false;
function scheduleMuhaoSplashAutoEnter() {
  if (muhaoSplashAutoEnterTimer) clearTimeout(muhaoSplashAutoEnterTimer);
  muhaoSplashAutoEnterTimer = setTimeout(function () {
    muhaoSplashAutoEnterTimer = null;
    try {
      if (splashReadyToEnter && typeof dismissSplash === 'function') dismissSplash();
    } catch (e) {}
  }, 480);
}
function onMuhaoSplashEntered() {
  if (muhaoSplashEnteredOnce) return;
  muhaoSplashEnteredOnce = true;
  try {
    if (typeof bootMuhaoHomeHero === 'function') bootMuhaoHomeHero();
  } catch (e) {}
}

function markSplashReadyToEnter() {
  var s = document.getElementById('splash');
  if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;
  markAppPerf('splash-ready');
  splashReadyToEnter = true;
  splashTimer = null;
  s.classList.add('ready');
  s.setAttribute('role', 'button');
  s.setAttribute('tabindex', '0');
  s.setAttribute('aria-label', '点击进入 MuHao Radio');
  scheduleMuhaoSplashAutoEnter();
}

document.addEventListener('DOMContentLoaded', function () {
  var s = document.getElementById('splash');
  if (!s) return;
  markAppPerf('dom-content-loaded');
  if (startupFastSkipPreference) {
    dismissSplash({ instant: true });
    return;
  }
  armSplashSoundFallback();
  prewarmHomeWallpaperPreview();
  function requestSplashEnter() {
    playMineradioIntroSound();
    if (splashReadyToEnter) dismissSplash();
  }
  s.addEventListener('click', requestSplashEnter);
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('splash-active')) return;
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      requestSplashEnter();
    }
  });
  if (reduceSplashMotion) {
    s.classList.add('reduce-motion');
    splashTimer = setTimeout(markSplashReadyToEnter, 650);
    return;
  }
  playMineradioIntroSound();
  splashTimer = setTimeout(markSplashReadyToEnter, 1500);
});
`;

fs.writeFileSync(p, t.slice(0,start) + tail);
console.log('rewrote splash tail, len', fs.statSync(p).size);

// sanity: balanced braces rough
const all=fs.readFileSync(p,'utf8');
let bal=0; for(const c of all){ if(c==='{')bal++; else if(c==='}')bal--; }
console.log('brace delta', bal);
console.log('has schedule call in mark', /splashReadyToEnter = true;[\s\S]{0,120}scheduleMuhaoSplashAutoEnter/.test(all));
