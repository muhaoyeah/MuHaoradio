const fs = require('fs');
const path = require('path');
const root = 'C:/Users/MUHAO/Desktop/新建文件夹/muhaoradio';
const inst = 'D:/MuHaoradio/resources/app';

// Clean source splash already good; re-copy to install (source has no TRACE)
fs.copyFileSync(path.join(root, 'public/js/modules/10-shell/03-splash.js'), path.join(inst, 'public/js/modules/10-shell/03-splash.js'));
console.log('splash synced clean', !fs.readFileSync(path.join(inst,'public/js/modules/10-shell/03-splash.js'),'utf8').includes('MUHAO_SPLASH_TRACE'));

// Remove debug route from install server
{
  const sp = path.join(inst, 'server.js');
  let s = fs.readFileSync(sp, 'utf8');
  const start = s.indexOf("if (pn === '/api/muhao-debug-log'");
  if (start >= 0) {
    let i = s.indexOf('{', start); let depth = 0;
    for (; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    while (s[i] === '\n' || s[i] === '\r') i++;
    s = s.slice(0, start) + s.slice(i);
    fs.writeFileSync(sp, s);
    console.log('debug route removed');
  } else console.log('no debug route');
}

// Add hover pause + keyboard polish to hero in SOURCE then sync
{
  const p = path.join(root, 'public/js/modules/05-playback/03b-muhao-home-hero.js');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('muhaoHeroHoverPauseBound')) {
    // enhance initHomeHeroCarousel if exists
    if (t.includes('function initHomeHeroCarousel')) {
      t = t.replace(
        /function initHomeHeroCarousel\s*\([^)]*\)\s*\{/,
        (m) => m + "\n  var heroRoot = document.querySelector('.home-hero-carousel') || document.getElementById('home-hero') || document.querySelector('.empty-home');\n  if (heroRoot && !heroRoot.muhaoHeroHoverPauseBound) {\n    heroRoot.muhaoHeroHoverPauseBound = true;\n    heroRoot.addEventListener('mouseenter', function () { if (homeHeroCarouselState) homeHeroCarouselState.paused = true; });\n    heroRoot.addEventListener('mouseleave', function () { if (homeHeroCarouselState) { homeHeroCarouselState.paused = false; restartHomeHeroCarousel(); } });\n  }"
      );
      // make interval respect paused
      t = t.replace(
        /homeHeroCarouselState\.timer = setInterval\(function \(\) \{[\s\S]*?\}, homeHeroCarouselState\.intervalMs\);/,
        "homeHeroCarouselState.timer = setInterval(function () {\n    if (homeHeroCarouselState.paused) return;\n    setHomeHeroSlide(homeHeroCarouselState.index + 1);\n  }, homeHeroCarouselState.intervalMs);"
      );
    }
    fs.writeFileSync(p, t);
    console.log('hero hover pause added');
  } else console.log('hero hover already');
  fs.copyFileSync(p, path.join(inst, 'public/js/modules/05-playback/03b-muhao-home-hero.js'));
}

// Also sync overlay/runtime already done; ensure index has no probes
console.log('index probe', /MUHAO_SPLASH_PROBE|MUHAO_FORCE_ENTER/.test(fs.readFileSync(path.join(inst,'public/index.html'),'utf8')));
