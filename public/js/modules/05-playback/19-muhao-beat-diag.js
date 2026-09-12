// ============================================================
// MuHao beat/splash runtime diagnostic (no secrets)
// Writes %TEMP%\muhao-beat-diag.log via /api/muhao-diag + localStorage ring
// ============================================================
function muhaoBeatDiagSnapshot(reason) {
  var body = document.body;
  var html = document.documentElement;
  var signal = 0;
  try {
    if (typeof readPlaybackAnalyserSignal === 'function') signal = readPlaybackAnalyserSignal();
  } catch (e) { signal = -1; }
  var audioCtxState = '';
  try { audioCtxState = audioCtx ? audioCtx.state : 'null'; } catch (e2) { audioCtxState = 'err'; }
  return {
    at: new Date().toISOString(),
    reason: String(reason || ''),
    splashActive: !!(body && body.classList.contains('splash-active')),
    splashRevealing: !!(body && body.classList.contains('splash-revealing')),
    emptyHome: !!(body && body.classList.contains('empty-home-active')),
    wallpaperPreview: !!(body && body.classList.contains('home-wallpaper-preview')),
    deepSleep: !!(body && body.classList.contains('render-deep-sleep')),
    fastSkipPreload: !!(html && html.classList.contains('startup-fast-skip-preload')),
    playing: !!playing,
    audioPaused: !!(audio && audio.paused),
    audioSrc: !!(audio && (audio.currentSrc || audio.src)),
    analyserExists: !!analyser,
    beatAnalyserExists: !!beatAnalyser,
    audioReady: !!audioReady,
    audioCtxState: audioCtxState,
    analyserSignal: Number(signal) || 0,
    beatPulse: (typeof beatPulse === 'number' ? beatPulse : null),
    bass: (typeof bass === 'number' ? bass : null),
    smoothBass: (typeof smoothBass === 'number' ? smoothBass : null),
    smoothEnergy: (typeof smoothEnergy === 'number' ? smoothEnergy : null),
    uBass: (typeof uniforms !== 'undefined' && uniforms && uniforms.uBass ? Number(uniforms.uBass.value) || 0 : null),
    uBeat: (typeof uniforms !== 'undefined' && uniforms && uniforms.uBeat ? Number(uniforms.uBeat.value) || 0 : null),
    kickRms: (function () {
      try {
        if (!analyser || typeof beatBandRms !== 'function') return null;
        var sr = (audioCtx && audioCtx.sampleRate) || 44100;
        var fft = analyser.fftSize || 2048;
        return beatBandRms(frequencyData, sr, fft, 52, 165);
      } catch (eKick) { return -1; }
    })(),
    cinema: !!(fx && fx.cinema),
    bloom: !!(fx && fx.bloom),
    floatLayer: !!(typeof floatGroup !== 'undefined' && floatGroup && floatGroup.visible),
    fxPreset: (fx && typeof fx.preset === 'number' ? fx.preset : null),
    playbackVisualPreset: (typeof playbackVisualPreset === 'number' ? playbackVisualPreset : null),
    homeVisualPresetActive: !!homeVisualPresetActive,
    intensity: (fx && typeof fx.intensity === 'number' ? fx.intensity : null),
    coverResolution: (fx && fx.coverResolution != null ? fx.coverResolution : null)
  };
}

function muhaoBeatDiagAppendLine(line) {
  try {
    var key = 'muhao-beat-diag-ring-v1';
    var prev = [];
    try { prev = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e0) { prev = []; }
    if (!Array.isArray(prev)) prev = [];
    prev.push(String(line).slice(0, 2000));
    if (prev.length > 40) prev = prev.slice(prev.length - 40);
    localStorage.setItem(key, JSON.stringify(prev));
  } catch (e1) {}
  try {
    fetch('/api/muhao-diag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: String(line).slice(0, 4000) })
    }).catch(function () {});
  } catch (e2) {}
  try { console.info('[MuHaoBeatDiag]', line); } catch (e3) {}
}

function muhaoBeatDiagOnPlay(reason) {
  var snap = muhaoBeatDiagSnapshot(reason);
  muhaoBeatDiagAppendLine(JSON.stringify(snap));
  setTimeout(function () {
    try {
      var snap2 = muhaoBeatDiagSnapshot(reason + '+400ms');
      snap2.wallpaperPreviewAfter = !!(document.body && document.body.classList.contains('home-wallpaper-preview'));
      snap2.fxPresetAfter = (fx && typeof fx.preset === 'number' ? fx.preset : null);
      muhaoBeatDiagAppendLine(JSON.stringify(snap2));
    } catch (e5) {}
  }, 400);
  setTimeout(function () {
    try {
      muhaoBeatDiagAppendLine(JSON.stringify(muhaoBeatDiagSnapshot(reason + '+1600ms')));
    } catch (e6) {}
  }, 1600);
}

// ============================================================
// MuHao: global renderer error capture. A throwing stage inside the rAF loop
// used to freeze the 3D canvas (static cover, no beat) while HTML audio kept
// playing. Log every distinct error (throttled) so the culprit is identifiable.
(function muhaoInstallGlobalErrorCapture() {
  if (window.__muhaoErrCaptureInstalled) return;
  window.__muhaoErrCaptureInstalled = true;
  var lastByKey = Object.create(null);
  function muhaoReportRuntimeError(kind, msg, src, line, col, errObj) {
    try {
      var nowMs = performance.now();
      var key = String(kind) + '|' + String(msg == null ? '' : msg).slice(0, 120);
      var last = lastByKey[key] || 0;
      if (nowMs - last < 1500) return;
      lastByKey[key] = nowMs;
      var stack = '';
      try { stack = errObj && errObj.stack ? String(errObj.stack).slice(0, 800) : ''; } catch (eS) { stack = ''; }
      muhaoBeatDiagAppendLine(JSON.stringify({
        kind: 'window-error',
        via: String(kind),
        message: String(msg == null ? '' : msg).slice(0, 400),
        source: String(src || '').slice(0, 220),
        line: line || 0,
        col: col || 0,
        stack: stack,
        at: new Date().toISOString()
      }));
    } catch (e) { }
  }
  window.addEventListener('error', function (ev) {
    muhaoReportRuntimeError('error', ev && ev.message, ev && ev.filename, ev && ev.lineno, ev && ev.colno, ev && ev.error);
  }, true);
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    muhaoReportRuntimeError('promise', r && (r.message || String(r)), '', 0, 0, r);
  }, true);
})();
