'use strict';

(function loadMineradioIndexModules() {
  // 打包态（Electron 桌面外壳会给 <html> 加 desktop-shell-root）用固定版本戳走 HTTP 缓存；
  // 非打包/调试态保留 Date.now() 以便改完代码刷新即生效。
  const isPackagedShell = document.documentElement.classList.contains('desktop-shell-root');
  const MODULE_BUILD_TAG = '2.1.0-20260913';
  const moduleCacheBust = isPackagedShell ? MODULE_BUILD_TAG : String(Date.now());
  const homeModuleCacheBust = '1789399825';
  const modulePaths = [
    'js/modules/00-state/00-core-stores.js',
    'js/modules/00-state/01-perf-render-state.js',
    'js/modules/00-state/02-preferences-ui-modes.js',
    'js/modules/00-state/03-beat-dj-state.js',
    'js/modules/00-state/04-fx-defaults.js',
    'js/modules/00-state/05-packaged-fx-archive.js',
    'js/modules/00-state/06-fx-runtime-layout.js',
    'js/modules/00-state/07-ui-playback-runtime.js',
    'js/modules/00-state/08-desktop-render-power.js',
    'js/modules/00-state/09-performance-probe.js',
    'js/modules/00-state/10-frame-scheduler.js',
    'js/modules/00-state/11-system-memory-controls.js',
    'js/modules/01-scene/00-renderer-quality.js',
    'js/modules/01-scene/01-orbit-free-camera.js',
    'js/modules/01-scene/02-beat-camera-runtime.js',
    'js/modules/01-scene/03-focus-cinema-camera.js',
    'js/modules/01-scene/04-bottom-controls-cursor.js',
    'js/modules/02-visual/00-pointer-cover-particles.js',
    'js/modules/02-visual/01-float-skull-backcover.js',
    'js/modules/02-visual/02-lyrics-state-layout.js',
    'js/modules/02-visual/03-lyrics-star-river.js',
    'js/modules/02-visual/04-visual-settings-persistence.js',
    'js/modules/02-visual/05-lyrics-fonts-texture.js',
    'js/modules/02-visual/06-custom-background-colorlab.js',
    'js/modules/02-visual/07-lyrics-palette-text-utils.js',
    'js/modules/02-visual/08-lyrics-display-modes.js',
    'js/modules/02-visual/09-lyrics-payloads.js',
    'js/modules/02-visual/10-lyrics-mask-textures.js',
    'js/modules/02-visual/11-lyrics-shaders.js',
    'js/modules/02-visual/12-lyrics-row-layers.js',
    'js/modules/02-visual/13-lyrics-mesh-build.js',
    'js/modules/02-visual/14-stage-lyrics-rendering.js',
    'js/modules/02-visual/15-ripples-cover-depth.js',
    'js/modules/02-visual/16-sonic-topography-preset.js',
    'js/modules/02-visual/17-sonic-workshop-preset.js',
    'js/modules/03-beat/00-tempo-worker-cache-prefetch.js',
    'js/modules/03-beat/01-audio-beat-analysis.js',
    'js/modules/03-beat/02-podcast-dj-analysis.js',
    'js/modules/03-beat/03-local-beat-cache-modal.js',
    'js/modules/03-beat/04-beat-map-runtime.js',
    'js/modules/03-beat/05-cover-loading-crop.js',
    'js/modules/03-beat/06-sonic-audio-monitor.js',
    'js/modules/04-shelf/00-layout-hover.js',
    'js/modules/04-shelf/01-manager-core.js',
    'js/modules/04-shelf/02-rebuild-panel-sync.js',
    'js/modules/04-shelf/03-content-list-manager.js',
    'js/modules/04-shelf/04-cover-api-helpers.js',
    'js/modules/04-shelf/05-card-interactions.js',
    'js/modules/04-shelf/06-keyboard-camera-events.js',
    'js/modules/05-playback/00-api-quality-output.js',
    'js/modules/05-playback/01-cover-custom-map.js',
    'js/modules/05-playback/02-listen-stats.js',
    'js/modules/05-playback/03-home-discover-weather.js',
    'js/modules/05-playback/03a-home-dashboard.js',
    'js/modules/05-playback/03b-muhao-home-hero.js',
    'js/modules/05-playback/04-home-empty-wallpaper.js',
    'js/modules/05-playback/05-home-actions.js',
    'js/modules/05-playback/06-track-detail-lyrics-actions.js',
    'js/modules/05-playback/07-search.js',
    'js/modules/05-playback/08-audio-graph-controls.js',
    'js/modules/05-playback/09-queue-snapshot-autoplay.js',
    'js/modules/05-playback/10-queue-actions.js',
    'js/modules/05-playback/11-provider-fallback.js',
    'js/modules/05-playback/12-playback-switch-core.js',
    'js/modules/05-playback/13-playback-start-audio.js',
    'js/modules/05-playback/14-player-controls.js',
    'js/modules/05-playback/14a-muhao-beat-diag.js',
    'js/modules/05-playback/15-control-glass-animations.js',
    'js/modules/05-playback/16-cuefield-automix-core.js',
    'js/modules/05-playback/17-cuefield-timeline-executor.js',
    'js/modules/05-playback/18-cuefield-automix-integration.js',
    'js/modules/06-lyrics/00-lyrics-fetch-parse.js',
    'js/modules/06-lyrics/01-playlist-panel-shell.js',
    'js/modules/06-lyrics/02-playlist-detail.js',
    'js/modules/06-lyrics/03-podcast-playlist-loaders.js',
    'js/modules/06-lyrics/04-progress-seek.js',
    'js/modules/06-lyrics/05-upload-dragdrop.js',
    'js/modules/06-lyrics/06-lyric-timing-offset.js',
    'js/modules/07-fx/00-preset-archive-data.js',
    'js/modules/07-fx/01-lyric-color-controls.js',
    'js/modules/07-fx/02-accent-background-controls.js',
    'js/modules/07-fx/03a-wallpaper-engine-library.js',
    'js/modules/07-fx/03b-cover-picker-fonts.js',
    'js/modules/07-fx/04-preset-grid-uniforms.js',
    'js/modules/07-fx/05-fx-panel-performance.js',
    'js/modules/07-fx/06-hotkeys.js',
    'js/modules/07-fx/07-bindings-shelf-immersive.js',
    'js/modules/07-fx/08-cache-storage-settings.js',
    'js/modules/07-fx/09-console-workspace.js',
    'js/modules/08-account/00a-update-preview.js',
    'js/modules/08-account/00b-login-easter-egg.js',
    'js/modules/08-account/01-login-modal-utils.js',
    'js/modules/08-account/02-login-status.js',
    'js/modules/08-account/03-login-modal-flows.js',
    'js/modules/08-account/04-user-modal-logout.js',
    'js/modules/08-account/05-startup-login-guide.js',
    'js/modules/09-idle/00-toast-libraries.js',
    'js/modules/10-shell/00-gesture-control.js',
    'js/modules/10-shell/01-viewport-resize-shortcuts.js',
    'js/modules/10-shell/02-peek-panels-upload.js',
    'js/modules/10-shell/03-splash.js',
    'js/modules/10-shell/03a-splash-organic-growth.js',
    'js/modules/10-shell/04-desktop-overlay-fullscreen.js',
    'js/modules/10-shell/05-startup-bindings.js',
    'js/modules/11-main-loop.js',
  ];

  function readModule(path) {
    const request = new XMLHttpRequest();
    // 缓存戳：开发态（http 且未打包）用时间戳强制拿最新模块；
    // 打包/生产态用固定版本号，让 105 个文件的 HTTP 缓存真正生效（原先每次启动都全量重拉）。
    var bust = 'v=' + moduleCacheBust;
    if (/05-playback\/(03-home-discover-weather|03a-home-dashboard|03b-muhao-home-hero|04-home-empty-wallpaper)\.js$/.test(path)) {
      bust += '&m=' + homeModuleCacheBust;
    }
    request.open('GET', path + (path.indexOf('?') >= 0 ? '&' : '?') + bust, false);
    request.send(null);

    if ((request.status < 200 || request.status >= 300) && request.status !== 0) {
      throw new Error('Failed to load Mineradio module: ' + path + ' (' + request.status + ')');
    }

    return request.responseText;
  }

  // Collect all module sources, catching failures to show the broken module on splash
  const sources = [];
  let failedModule = null;
  for (let i = 0; i < modulePaths.length; i++) {
    try {
      sources.push(readModule(modulePaths[i]));
    } catch (err) {
      failedModule = { path: modulePaths[i], error: err.message || String(err), index: i };
      break;
    }
  }

  if (failedModule) {
    // Show the error on the splash/page so the user knows exactly what broke
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,10,16,.92);color:#e8e0d0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:32px;text-align:center;';
    overlay.innerHTML =
      '<div style="font-size:15px;color:rgba(255,255,255,.5);letter-spacing:.1em;margin-bottom:12px;">MUHAO RADIO · 模块加载失败</div>' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:16px;color:#ff6b6b;">无法加载模块 (' + (failedModule.index + 1) + '/' + modulePaths.length + ')</div>' +
      '<code style="display:block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px 20px;font-size:13px;max-width:600px;word-break:break-all;color:#00f5d4;">' +
        failedModule.path + '</code>' +
      '<div style="margin-top:12px;font-size:13px;color:rgba(255,255,255,.45);">' + failedModule.error + '</div>' +
      '<div style="margin-top:24px;font-size:12px;color:rgba(255,255,255,.35);">请检查该文件是否存在或有语法错误，然后托盘退出冷启动重试</div>';
    document.body.appendChild(overlay);
    console.error('[MuHaoradio] Module load failed:', failedModule.path, failedModule.error);
    return; // Stop loading — don't inject partial scripts
  }

  const script = document.createElement('script');
  script.text = sources.join('') + '\n//# sourceURL=mineradio-index-modules.js\n';
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);
})();

