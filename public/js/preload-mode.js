try {
  // Cinema restore: never preload-hide splash unless BOTH fast-skip and explicit allow.
  var allowFastSkip = localStorage.getItem('muhao-allow-fast-skip-v1') === '1';
  var fastSkip = localStorage.getItem('mineradio-startup-fast-skip-v1') === '1';
  if (allowFastSkip && fastSkip) {
    document.documentElement.classList.add('startup-fast-skip-preload');
  }
  // Default: no preload hide — wordmark / cinema must paint
  document.documentElement.classList.add(localStorage.getItem('mineradio-diy-player-mode-v1') === '1' ? 'diy-mode-preload' : 'simple-mode-preload');
} catch (e) {
  document.documentElement.classList.add('simple-mode-preload');
}
