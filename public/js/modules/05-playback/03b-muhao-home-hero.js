var homeHeroCarouselState = {
  index: 0,
  timer: null,
  paused: false,
  intervalMs: 8000,
};
var homeHeroCarouselCopy = [
  { kicker: 'MuHao Radio', title: '今晚听点什么', sub: '把首页留给你喜欢的照片，打开播放器后也有一点自己的气味。', moodA: '夜间电台', moodB: '私人封面' },
  { kicker: 'Soft Signal', title: '雨天适合慢歌', sub: '不急着切歌，让一首歌把房间的声音慢慢铺满。', moodA: '慢歌', moodB: '低音量' },
  { kicker: 'After Hours', title: '一个人的电台', sub: '搜索、歌单和视觉舞台都收在这里，打开就能接着听。', moodA: '独处', moodB: '继续播放' },
  { kicker: 'Daily Drift', title: '随机一点也不错', sub: '从推荐里顺手挑一首，不用想太多，先让音乐开始。', moodA: '随机漫游', moodB: '轻点开播' },
  { kicker: 'Listen Log', title: '别太吵，刚刚好', sub: '首页不抢音乐的风头，只把常用入口放在最顺手的位置。', moodA: '安静', moodB: '常用入口' },
  { kicker: 'Visual Radio', title: '继续播放昨天', sub: '照片、歌单、最近播放和视觉效果，慢慢长成你的私人电台。', moodA: '昨天的歌', moodB: '视觉舞台' },
];
function setHomeHeroSlide(nextIndex) {
  var slides = Array.from(document.querySelectorAll('.home-hero-slide'));
  var dots = Array.from(document.querySelectorAll('.home-hero-dot'));
  if (!slides.length) return;
  var count = slides.length;
  var normalized = ((nextIndex % count) + count) % count;
  var copy = homeHeroCarouselCopy[normalized] || homeHeroCarouselCopy[0] || {};
  homeHeroCarouselState.index = normalized;
  slides.forEach(function(slide, index) {
    slide.classList.toggle('is-active', index === normalized);
  });
  dots.forEach(function(dot, index) {
    dot.classList.toggle('is-active', index === normalized);
    dot.setAttribute('aria-pressed', index === normalized ? 'true' : 'false');
  });
  var kicker = document.getElementById('home-hero-kicker');
  var title = document.getElementById('home-hero-title');
  var sub = document.getElementById('home-hero-sub');
  var moodA = document.getElementById('home-hero-mood-a');
  var moodB = document.getElementById('home-hero-mood-b');
  if (kicker) kicker.textContent = copy.kicker || 'MuHao Radio';
  if (title) title.textContent = copy.title || '今晚听点什么';
  if (sub) sub.textContent = copy.sub || '';
  if (moodA) moodA.textContent = copy.moodA || '私人电台';
  if (moodB) moodB.textContent = copy.moodB || '轻点开播';
}
function stepHomeHeroSlide(delta) {
  setHomeHeroSlide(homeHeroCarouselState.index + delta);
  restartHomeHeroCarousel();
}
function restartHomeHeroCarousel() {
  if (homeHeroCarouselState.timer) {
    clearInterval(homeHeroCarouselState.timer);
    homeHeroCarouselState.timer = null;
  }
  homeHeroCarouselState.timer = setInterval(function() {
    if (homeHeroCarouselState.paused) return;
    if (!document.body.classList.contains('empty-home-active')) return;
    setHomeHeroSlide(homeHeroCarouselState.index + 1);
  }, homeHeroCarouselState.intervalMs);
}
function initHomeHeroCarousel() {
  var carousel = document.getElementById('home-hero-carousel');
  var dotsWrap = document.getElementById('home-hero-dots');
  var slides = Array.from(document.querySelectorAll('.home-hero-slide'));
  if (!carousel || !dotsWrap || !slides.length || carousel.dataset.ready === '1') return;
  carousel.dataset.ready = '1';
  dotsWrap.innerHTML = slides.map(function(_, index) {
    return '<button class="home-hero-dot' + (index === 0 ? ' is-active' : '') + '" type="button" data-home-hero-dot="' + index + '" aria-label="切换到第 ' + (index + 1) + ' 张" aria-pressed="' + (index === 0 ? 'true' : 'false') + '"></button>';
  }).join('');
  var hero = carousel.closest('.home-hero');
  if (hero) {
    hero.addEventListener('mouseenter', function() { homeHeroCarouselState.paused = true; });
    hero.addEventListener('mouseleave', function() { homeHeroCarouselState.paused = false; });
    hero.addEventListener('focusin', function() { homeHeroCarouselState.paused = true; });
    hero.addEventListener('focusout', function() { homeHeroCarouselState.paused = false; });
  }
  var prev = document.querySelector('[data-home-hero-prev]');
  var next = document.querySelector('[data-home-hero-next]');
  if (prev) prev.addEventListener('click', function() { stepHomeHeroSlide(-1); });
  if (next) next.addEventListener('click', function() { stepHomeHeroSlide(1); });
  dotsWrap.addEventListener('click', function(event) {
    var dot = event.target.closest('[data-home-hero-dot]');
    if (!dot) return;
    setHomeHeroSlide(Number(dot.dataset.homeHeroDot || 0));
    restartHomeHeroCarousel();
  });
  setHomeHeroSlide(0);
  restartHomeHeroCarousel();
}
/* --- MuHao Radio markup bootstrap for Mineradio 2.1.0 home shell --- */
function ensureMuhaoHomeHeroMarkup() {
  var hero = document.querySelector('#empty-home .home-hero');
  if (!hero) return false;
  if (!hero.querySelector('#home-hero-carousel')) {
    var html = ''
      + '<div class="home-hero-carousel" id="home-hero-carousel" aria-label="MuHao home carousel">'
      + '<figure class="home-hero-slide is-active"><img src="assets/home-hero/hero-01.jpg" alt="" loading="eager" decoding="async"></figure>'
      + '<figure class="home-hero-slide"><img src="assets/home-hero/hero-02.jpg" alt="" loading="lazy" decoding="async"></figure>'
      + '<figure class="home-hero-slide"><img src="assets/home-hero/hero-03.jpg" alt="" loading="lazy" decoding="async"></figure>'
      + '<figure class="home-hero-slide"><img src="assets/home-hero/hero-04.jpg" alt="" loading="lazy" decoding="async"></figure>'
      + '<figure class="home-hero-slide"><img src="assets/home-hero/hero-05.jpg" alt="" loading="lazy" decoding="async"></figure>'
      + '<figure class="home-hero-slide"><img src="assets/home-hero/hero-06.jpg" alt="" loading="lazy" decoding="async"></figure>'
      + '</div>'
      + '<div class="home-audio-reactor" id="home-audio-reactor" aria-hidden="true"><div class="home-wave-track" id="home-wave-track"></div></div>'
      + '<div class="home-hero-carousel-shell">'
      + '<div class="home-hero-carousel-copy">'
      + '<div class="home-hero-carousel-kicker" id="home-hero-kicker">MuHao Radio</div>'
      + '<div class="home-hero-carousel-title" id="home-hero-title"></div>'
      + '<div class="home-hero-carousel-sub" id="home-hero-sub"></div>'
      + '<div class="home-hero-mood-row"><span class="home-hero-mood" id="home-hero-mood-a"></span><span class="home-hero-mood" id="home-hero-mood-b"></span></div>'
      + '</div>'
      + '<div class="home-hero-carousel-actions" aria-label="home hero controls">'
      + '<button class="home-chip home-console-chip" type="button" onclick="openHomePlayerConsole()">console</button>'
      + '<button class="home-hero-nav" type="button" data-home-hero-prev aria-label="prev">&#8249;</button>'
      + '<button class="home-hero-nav" type="button" data-home-hero-next aria-label="next">&#8250;</button>'
      + '<div class="home-hero-dots" id="home-hero-dots" aria-label="slides"></div>'
      + '</div></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var card = hero.querySelector('.daily-review-card');
    while (wrap.firstChild) {
      if (card) hero.insertBefore(wrap.firstChild, card);
      else hero.appendChild(wrap.firstChild);
    }
  } else if (!document.getElementById('home-wave-track')) {
    var reactor = document.createElement('div');
    reactor.className = 'home-audio-reactor';
    reactor.id = 'home-audio-reactor';
    reactor.setAttribute('aria-hidden', 'true');
    reactor.innerHTML = '<div class="home-wave-track" id="home-wave-track"></div>';
    var card2 = hero.querySelector('.daily-review-card');
    if (card2) hero.insertBefore(reactor, card2); else hero.appendChild(reactor);
  }
  return true;
}

var _muhaoHomeHeroInited = false;
function bootMuhaoHomeHero() {
  if (!ensureMuhaoHomeHeroMarkup()) return;
  if (!_muhaoHomeHeroInited) {
    _muhaoHomeHeroInited = true;
    initHomeHeroCarousel();
  } else {
    setHomeHeroSlide(homeHeroCarouselState.index || 0);
    restartHomeHeroCarousel();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootMuhaoHomeHero);
  else bootMuhaoHomeHero();
}
