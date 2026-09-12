const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,t){fs.writeFileSync(p,t); console.log('OK',p)}

// 1) Safe close in overlay
{
  const p='public/js/modules/10-shell/04-desktop-overlay-fullscreen.js';
  let t=read(p);
  const from = `  document.querySelectorAll('[data-window-action]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute('data-window-action');
      if (action === 'minimize') animateDesktopWindowMinimize(api);
      if (action === 'maximize') toggleFullscreen();
      if (action === 'close') {
        saveLastPlaybackSnapshot(true, 'window-close');
        api.close(closeBehaviorPreference);
      }
    });
  });`;
  const to = `  document.querySelectorAll('[data-window-action]').forEach(function (btn) {
    if (btn.__muhaoWindowActionBound) return;
    btn.__muhaoWindowActionBound = true;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute('data-window-action');
      var winApi = api || (typeof getDesktopWindowApi === 'function' ? getDesktopWindowApi() : null) || window.desktopWindow;
      if (action === 'minimize') animateDesktopWindowMinimize(winApi);
      if (action === 'maximize') toggleFullscreen();
      if (action === 'close') {
        try { saveLastPlaybackSnapshot(true, 'window-close'); } catch (err) {}
        try {
          if (winApi && typeof winApi.close === 'function') winApi.close(closeBehaviorPreference || 'quit');
          else if (window.desktopWindow && typeof window.desktopWindow.close === 'function') window.desktopWindow.close('quit');
        } catch (err2) {}
      }
    }, true);
  });`;
  if(!t.includes(from)) {
    // try already patched
    if(t.includes('__muhaoWindowActionBound')) console.log('close already patched');
    else {
      // softer replace just the close block
      const from2 = `      if (action === 'close') {
        saveLastPlaybackSnapshot(true, 'window-close');
        api.close(closeBehaviorPreference);
      }`;
      const to2 = `      if (action === 'close') {
        try { saveLastPlaybackSnapshot(true, 'window-close'); } catch (err) {}
        var winApi = api || (typeof getDesktopWindowApi === 'function' ? getDesktopWindowApi() : null) || window.desktopWindow;
        try {
          if (winApi && typeof winApi.close === 'function') winApi.close(closeBehaviorPreference || 'quit');
          else if (window.desktopWindow && typeof window.desktopWindow.close === 'function') window.desktopWindow.close('quit');
        } catch (err2) {}
      }`;
      if(!t.includes(from2)) throw new Error('close block not found');
      t=t.replace(from2,to2);
      write(p,t);
    }
  } else {
    write(p, t.replace(from,to));
  }
}

// 2) Fix bootMuhaoHomeHero idempotency + clock tick feature
{
  const p='public/js/modules/05-playback/03b-muhao-home-hero.js';
  let t=read(p);
  // Fix boot: don't mark booted if markup missing
  t=t.replace(
`var muhaoHomeHeroBooted = false;
function bootMuhaoHomeHero() {
  if (muhaoHomeHeroBooted) return;
  muhaoHomeHeroBooted = true;
  if (!ensureMuhaoHomeHeroMarkup()) return;
  if (!_muhaoHomeHeroInited) {
    _muhaoHomeHeroInited = true;
    initHomeHeroCarousel();
  } else {
    setHomeHeroSlide(homeHeroCarouselState.index || 0);
    restartHomeHeroCarousel();
  }
}`,
`var muhaoHomeHeroBooted = false;
var muhaoHomeClockTimer = null;
function tickMuhaoHomeClock() {
  var timeEl = document.getElementById('daily-review-time');
  var dateEl = document.getElementById('daily-review-date');
  if (!timeEl && !dateEl) return;
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  if (timeEl) timeEl.textContent = hh + ':' + mm;
  if (dateEl) {
    var week = ['日','一','二','三','四','五','六'][now.getDay()];
    dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 · 周' + week;
  }
}
function startMuhaoHomeClock() {
  tickMuhaoHomeClock();
  if (muhaoHomeClockTimer) clearInterval(muhaoHomeClockTimer);
  muhaoHomeClockTimer = setInterval(tickMuhaoHomeClock, 15000);
}
function bootMuhaoHomeHero() {
  if (muhaoHomeHeroBooted) {
    restartHomeHeroCarousel();
    startMuhaoHomeClock();
    return;
  }
  if (!ensureMuhaoHomeHeroMarkup()) return;
  muhaoHomeHeroBooted = true;
  if (!_muhaoHomeHeroInited) {
    _muhaoHomeHeroInited = true;
    initHomeHeroCarousel();
  } else {
    setHomeHeroSlide(homeHeroCarouselState.index || 0);
    restartHomeHeroCarousel();
  }
  startMuhaoHomeClock();
}`);
  write(p,t);
}

// 3) One-time restore of fast-skip preference (localStorage may still be true)
{
  const p='public/js/modules/00-state/07-ui-playback-runtime.js';
  let t=read(p);
  if(!t.includes('muhao-startup-fast-skip-restored-v1')){
    t=t.replace(
      'var startupFastSkipPreference = readBooleanPreference(STARTUP_FAST_SKIP_STORE_KEY, false);',
      `var startupFastSkipPreference = readBooleanPreference(STARTUP_FAST_SKIP_STORE_KEY, false);
// MuHao one-shot: restore official splash after debug era forced fast-skip on.
try {
  if (!localStorage.getItem('muhao-startup-fast-skip-restored-v1')) {
    startupFastSkipPreference = false;
    if (typeof saveBooleanPreference === 'function') saveBooleanPreference(STARTUP_FAST_SKIP_STORE_KEY, false);
    else localStorage.setItem(STARTUP_FAST_SKIP_STORE_KEY, '0');
    localStorage.setItem('muhao-startup-fast-skip-restored-v1', '1');
  }
} catch (e) {}`
    );
    write(p,t);
  }
}

// 4) Dashboard time - ensure it runs; peek function
{
  const dash=read('public/js/modules/05-playback/03a-home-dashboard.js');
  const i=dash.indexOf('daily-review-time');
  console.log('dashboard time ctx:\n', dash.slice(i-200, i+400));
}

console.log('phase3 done');
