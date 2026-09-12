const fs=require('fs');
const path=require('path');
const root=process.cwd();
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,t){fs.writeFileSync(p,t); console.log('OK', path.relative(root,p), t.length)}

// Verify splash end
{
  const t=read('public/js/modules/10-shell/03-splash.js');
  const i=t.indexOf('function markSplashReadyToEnter');
  console.log('markSplash snippet:\n', t.slice(i, i+450));
  if(!t.includes('scheduleMuhaoSplashAutoEnter()')) throw new Error('missing schedule call');
  if(/SPLASH-DEBUG|MUHAO_FORCE_ENTER|MUHAO_SPLASH_PROBE/.test(t)) throw new Error('debug left in splash');
}

// --- Strip MUHAO probes from source index.html ---
{
  let html=read('public/index.html');
  const before=html.length;
  // Remove any trailing MUHAO_* script blocks before index-loader
  html=html.replace(/\s*<script>\s*\/\* MUHAO_[\s\S]*?<\/script>\s*(?=<script src="js\/index-loader\.js"><\/script>)/g, '\n');
  // Also remove if after other scripts at end
  html=html.replace(/\s*<script>\s*\/\* MUHAO_[\s\S]*?<\/script>\s*$/g, '\n');
  if(/MUHAO_FORCE_ENTER|MUHAO_ERROR_TO_TITLE|MUHAO_SPLASH_PROBE/.test(html)) {
    // more aggressive: find last index-loader and ensure nothing MUHAO before it except normal
    console.log('still has MUHAO markers, doing line-based strip');
    const lines=html.split(/\n/);
    const out=[];
    let skipping=false;
    for(let i=0;i<lines.length;i++){
      const L=lines[i];
      if(/\/\* MUHAO_/.test(L) || (/<script>/.test(L) && i+1<lines.length && /\/\* MUHAO_/.test(lines[i+1]))) {
        skipping=true;
      }
      if(skipping){
        if(/<\/script>/.test(L)) { skipping=false; continue; }
        continue;
      }
      out.push(L);
    }
    html=out.join('\n');
  }
  if(/MUHAO_FORCE_ENTER|MUHAO_ERROR_TO_TITLE|MUHAO_SPLASH_PROBE/.test(html)) throw new Error('failed strip probes');
  if(!html.includes('id="canvas-container"')) throw new Error('canvas lost');
  if(!html.includes('js/index-loader.js')) throw new Error('loader lost');
  write('public/index.html', html);
  console.log('index.html delta', before, '->', html.length);
}

// --- Null guards ---
function patchOnce(file, from, to){
  let t=read(file);
  if(t.includes(to)) { console.log('already', file); return; }
  if(!t.includes(from)) { console.log('MISS', file, from.slice(0,60)); return; }
  write(file, t.replace(from,to));
}
patchOnce(
  'public/js/modules/08-account/03-login-modal-flows.js',
  'if (!loginProviderPointer.dragging && dist < 5) return;',
  'if (!loginProviderPointer || (!loginProviderPointer.dragging && dist < 5)) return;'
);
patchOnce(
  'public/js/modules/08-account/01-login-modal-utils.js',
  'if (!topAccountPillDrag.dragging && Math.sqrt(dx * dx + dy * dy) < 7) return;',
  'if (!topAccountPillDrag || (!topAccountPillDrag.dragging && Math.sqrt(dx * dx + dy * dy) < 7)) return;'
);
patchOnce(
  'public/js/modules/07-fx/07-bindings-shelf-immersive.js',
  "sv.addEventListener('pointermove', function (e) { if (colorLabState.dragging) updateColorLabFromSv(e); });",
  "sv.addEventListener('pointermove', function (e) { if (colorLabState && colorLabState.dragging) updateColorLabFromSv(e); });"
);

// --- Muhao hero: guards + ensure boot idempotent + clock ---
{
  const p='public/js/modules/05-playback/03b-muhao-home-hero.js';
  let t=read(p);
  if(!t.includes('if (!homeHeroCarouselState) return;')){
    t=t.replace('function setHomeHeroSlide(nextIndex) {','function setHomeHeroSlide(nextIndex) {\n  if (!homeHeroCarouselState) return;');
    t=t.replace('function restartHomeHeroCarousel() {','function restartHomeHeroCarousel() {\n  if (!homeHeroCarouselState) return;');
  }
  // Make bootMuhaoHomeHero idempotent
  if(!t.includes('muhaoHomeHeroBooted')){
    t=t.replace(
      /function bootMuhaoHomeHero\s*\(/,
      'var muhaoHomeHeroBooted = false;\nfunction bootMuhaoHomeHero('
    );
    // find body start after function boot...
    t=t.replace(/function bootMuhaoHomeHero\([^)]*\)\s*\{/,
      (m)=> m + '\n  if (muhaoHomeHeroBooted) return;\n  muhaoHomeHeroBooted = true;');
  }
  write(p,t);
}

console.log('phase2 source patches done');
