/* ============================================================================
 * 启动页 · 自然生长动效（Sylva 机制的本土化移植 · 档位 A）
 * ----------------------------------------------------------------------------
 * 硬约束（来自 桌面/Sylva-对照MuHaoradio-动效细表.md）：
 *   1. 不修改 10-shell/03-splash.js —— 本文件是纯增量层
 *   2. 不引入新依赖，沿用启动页现有配色（琥珀 #F4D28A / 青 #7AD7C2 / 白）
 *   3. 不使用 Sylva 的任何代码或素材（其仓库未授权复用），只移植"机制"
 *   4. 覆盖 prefers-reduced-motion
 *   5. 任何异常静默降级 —— 绝不能让启动页卡住、绝不能影响进入流程
 *
 * 移植的三个机制：
 *   ① 程序化生长  分形分叉的藤蔓从画面下缘向上生长，带缓动与锥度
 *   ② 草叶拨开    指针位移场把附近草叶向两侧推开（Sylva 的核心交互）
 *   ③ 花粉飘散    生长末端持续吐出光尘，向上飘升，并受指针扰动
 *
 * ── 关于"摆动"的两条铁律（2026-09-13 修正高频抖动后确立）──────────────
 *   ① 【时间单位】本文件里 `elapsed` 是**毫秒**（用于 CFG 里的各段时机），
 *      但所有正弦振荡必须用**秒**（`sec = elapsed / 1000`）。
 *      把毫秒直接塞进 sin() 会让频率变成几百 Hz，远超帧率 → 相位混叠 → 满屏抖动。
 *   ② 【低通滤波】指针位置、指针在场强度、以及每个节点的位移量，
 *      全部走一阶低通（`1 - Math.exp(-dt / tau)`，与帧率无关），
 *      不允许任何量直接从"目标值"跳到"当前值"。
 *
 * 本文件不新增 index.html / index.css 依赖：样式由脚本自行注入到 <head>。
 * 这样做是为了让整个动效可以「删一个文件 + 删一行清单」彻底移除。
 * ========================================================================== */
(function muhaoSplashOrganicGrowth() {
  'use strict';

  if (window.__muhaoSplashOrganicGrowthInstalled) return;
  window.__muhaoSplashOrganicGrowthInstalled = true;

  var CANVAS_ID = 'splash-organic-growth';
  var STYLE_ID = 'muhao-splash-organic-style';

  var reducedMotion = false;
  try {
    reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reducedMotion = false; }

  /* --- 可调参数：想改观感只动这里 ------------------------------------- */
  var CFG = {
    rootCount: 8,            // 主藤条数
    segmentsPerRoot: 30,     // 每条藤的节点数
    branchChance: 0.5,       // 节点分叉概率
    reachMin: 0.30,          // 生长高度（占视口高）
    reachMax: 0.62,
    growStartMs: 260,        // 第一条藤开始生长（等光缝落地）
    growSpreadMs: 820,       // 各条藤的起跑时间分散度
    growDurMs: 1450,         // 单条藤生长用时
    bladeEvery: 3,           // 每隔几个节点长一丛草叶
    pollenStartMs: 1050,
    pollenMax: 64,
    pushRadius: 132,         // 指针拨开半径（px）
    pushStrength: 44,        // 拨开最大位移（px）
    fadeOutMs: 2980,         // 开始淡出（启动页 3500ms 自动进入）
    zIndex: 4,               // 压在光缝(5)之下、噪点(3)之上

    /* 摆动 —— 单位一律是 Hz（每秒周期数），不是 rad/ms */
    swayHzA: 0.42,           // 藤蔓主摆：周期约 2.4s
    swayHzB: 0.17,           // 藤蔓次摆：周期约 5.9s（叠加出"呼吸"感）
    bladeSwayHzA: 0.55,      // 草叶主摆
    bladeSwayHzB: 0.23,
    wavePerNode: 0.09,       // 沿藤蔓的行波相位差（越小越像整体摆动）
    pointerTauMs: 70,        // 指针位置低通时间常数
    pressTauMs: 150,         // 指针"在场"强度过渡
    offsetTauMs: 110         // 每个节点/草叶位移量低通时间常数
  };

  /* 配色不自定，一律取项目的设计令牌 —— 与《诊断与改进方案》P0-1「裁决唯一强调色」保持一致：
     - 强调色只认 --home-accent (#00f5d4)
     - 点缀金只认 --champagne   (#f4d28a)
     这样换肤只需改 CSS 变量，本文件一行不用动。取不到令牌时才用同值兜底。
     注意：只有"青"和"金"两色，藤与草叶共用同一套、只靠透明度区分 ——
     不要为藤和草叶各配一个近似色，那是"同类东西做两份"。 */
  var ACCENT_RGB = '0, 245, 212';
  var GOLD_RGB = '244, 210, 138';
  var POLLEN_RGB = '250, 238, 202';

  /* --- 小工具 ---------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutCubic(t) { t = clamp01(t); var u = 1 - t; return 1 - u * u * u; }
  function smoothstep(e0, e1, x) {
    var t = clamp01((x - e0) / Math.max(0.0001, e1 - e0));
    return t * t * (3 - 2 * t);
  }
  /* 与帧率无关的一阶低通系数 */
  function lowpass(dtMs, tauMs) { return 1 - Math.exp(-dtMs / tauMs); }
  /* 双频叠加摆动：慢速主摆 + 更慢的次级摆，读起来像呼吸而不是震动。
     `sec` 必须是秒。返回值域约 ±1，再乘振幅。 */
  function breathe(sec, hzA, hzB, seed) {
    var twoPi = Math.PI * 2;
    return Math.sin(sec * hzA * twoPi + seed) * 0.72
      + Math.sin(sec * hzB * twoPi + seed * 1.7) * 0.28;
  }

  /* 读 CSS 自定义属性，并把 #rrggbb 归一成 "r, g, b" 字符串（本文件里都用这种格式拼 rgba） */
  function cssVar(name) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v || '').trim();
    } catch (e) { return ''; }
  }
  function toRgbStr(v, fallback) {
    if (!v) return fallback;
    var hex = v.match(/^#?([0-9a-fA-F]{6})$/);
    if (hex) {
      var n = parseInt(hex[1], 16);
      return (((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255));
    }
    var p = v.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (p) return p[1] + ', ' + p[2] + ', ' + p[3];
    return fallback;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + CANVAS_ID + '{',
      '  position:absolute;inset:0;z-index:' + CFG.zIndex + ';',
      '  pointer-events:none;opacity:1;',
      '}',
      '#splash.exiting #' + CANVAS_ID + ',#splash.hide #' + CANVAS_ID + '{opacity:0}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  /* --- 几何：程序化生成藤蔓与草叶 -------------------------------------- */
  function buildStems(w, h) {
    var stems = [];
    var rootCount = Math.max(4, Math.min(CFG.rootCount, Math.round(w / 190)));
    var scale = Math.min(1.25, Math.max(0.65, w / 1440));
    var maxSegs = Math.round(CFG.segmentsPerRoot * scale);
    /* 摆动振幅跟着视口缩放，小窗口下不会显得幅度过大 */
    var ampScale = Math.max(0.55, Math.min(1.5, h / 720));

    for (var i = 0; i < rootCount; i++) {
      var baseX = (i + 0.5) / rootCount * w + rnd(-w * 0.045, w * 0.045);
      stems.push(growStem(baseX, h + rnd(8, 30), -Math.PI / 2 + rnd(-0.40, 0.40),
        h * rnd(CFG.reachMin, CFG.reachMax), maxSegs, 0, ampScale, w, h));
    }
    return stems;
  }

  function growStem(x, y, angle, reach, segs, depth, ampScale, w, h) {
    var pts = [];
    var segLen = reach / segs * rnd(1.25, 1.60);
    var drift = rnd(-0.0022, 0.0022);
    var startY = y;
    for (var s = 0; s < segs; s++) {
      /* 位移量挂在节点上：_px/_py 是低通后的实际位移，必须初始化为 0 */
      pts.push({ x: x, y: y, k: s / segs, _px: 0, _py: 0 });
      angle += rnd(-0.19, 0.19) + drift;
      /* 轻微向画面中线回收，防止整片跑出视口 */
      angle += ((w * 0.5 - x) / Math.max(w, 1)) * 0.016;
      var sl = segLen * (1 - (s / segs) * 0.44);
      x += Math.cos(angle) * sl;
      y += Math.sin(angle) * sl;
      if (startY - y >= reach) break;
    }
    var stem = {
      pts: pts,
      nodes: [],               // 每帧算一次节点最终位置，绘制阶段直接复用
      visible: 0,
      t0: CFG.growStartMs + rnd(0, CFG.growSpreadMs) * (1 - depth * 0.35),
      dur: CFG.growDurMs * (depth === 0 ? 1 : 0.72) * rnd(0.85, 1.15),
      swayPhase: rnd(0, Math.PI * 2),
      swayAmp: rnd(3.0, 6.6) * ampScale * (depth === 0 ? 1 : 0.62),
      warm: Math.random() < 0.34,
      depth: depth,
      width: depth === 0 ? rnd(1.5, 2.3) : rnd(0.85, 1.35)
    };
    /* 分叉：从后半段挑节点再长出子藤 */
    if (depth < 2 && pts.length > 6) {
      stem.children = [];
      for (var b = Math.floor(pts.length * 0.42); b < pts.length - 1; b++) {
        if (Math.random() > CFG.branchChance) continue;
        var p = pts[b];
        var dir = (b === 0)
          ? -Math.PI / 2
          : Math.atan2(p.y - pts[b - 1].y, p.x - pts[b - 1].x);
        var side = Math.random() < 0.5 ? -1 : 1;
        stem.children.push({
          parent: stem,
          from: b,
          stem: growStem(p.x, p.y, dir + side * rnd(0.52, 1.06), reach * rnd(0.20, 0.42),
            Math.max(5, Math.round(segs * 0.34)), depth + 1, ampScale, w, h)
        });
        if (stem.children.length >= 3) break;
      }
    }
    return stem;
  }

  function flattenStems(stems, out) {
    for (var i = 0; i < stems.length; i++) {
      out.push(stems[i]);
      if (stems[i].children) {
        for (var c = 0; c < stems[i].children.length; c++) {
          flattenStems([stems[i].children[c].stem], out);
        }
      }
    }
    return out;
  }

  /* 草叶：挂在藤蔓节点上，记录挂点与基准角度与自己的低通位移状态 */
  function buildBlades(stems) {
    var blades = [];
    for (var i = 0; i < stems.length; i++) {
      var st = stems[i];
      var pts = st.pts;
      for (var s = 1; s < pts.length; s += CFG.bladeEvery) {
        var p = pts[s];
        var prev = pts[s - 1];
        var dir = Math.atan2(p.y - prev.y, p.x - prev.x);
        var n = (st.depth === 0 && s % (CFG.bladeEvery * 2) === 0) ? 2 : 1;
        for (var b = 0; b < n; b++) {
          blades.push({
            angle: dir + (Math.random() < 0.5 ? -1 : 1) * rnd(0.36, 1.02),
            len: rnd(8, 21) * (st.depth === 0 ? 1 : 0.74),
            phase: rnd(0, Math.PI * 2),
            warm: st.warm && Math.random() < 0.5,
            stem: st,
            at: s,
            width: rnd(0.75, 1.25),
            _px: 0, _py: 0
          });
        }
      }
    }
    return blades;
  }

  /* --- 安装 ------------------------------------------------------------ */
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  whenReady(function boot() {
    try { start(); } catch (e) { /* 静默降级：没有这层动效也要能正常启动 */ }
  });

  function start() {
    var splashEl = document.getElementById('splash');
    if (!splashEl) return;

    /* 令牌在 start() 里解析（而非模块加载时）：此时样式已应用，取值才可靠 */
    ACCENT_RGB = toRgbStr(cssVar('--home-accent-rgb') || cssVar('--home-accent'), ACCENT_RGB);
    GOLD_RGB = toRgbStr(cssVar('--champagne'), GOLD_RGB);

    injectStyle();

    var canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    canvas.setAttribute('aria-hidden', 'true');
    splashEl.insertBefore(canvas, splashEl.firstChild);

    var ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }

    var w = 0, h = 0, dpr = 1;
    var flat = [], blades = [], pollen = [];
    var rafId = 0;
    var stopped = false;
    var lastTime = 0;

    /* 指针状态：x/y 是原始目标，sx/sy 是低通后的实际采样点，press 是在场强度。
       三者都平滑，草叶才不会随鼠标"瞬移"。 */
    var ptr = { x: 0, y: 0, sx: 0, sy: 0, ready: false, press: 0, pressTarget: 0 };

    /* 对齐启动页自己的时间轴：03-splash.js 里有全局 splashStartedAt。
       用 typeof 软引用，拿不到就退化成自己的启动时刻。 */
    var t0 = (typeof splashStartedAt === 'number' && isFinite(splashStartedAt))
      ? splashStartedAt
      : performance.now();

    function resize() {
      dpr = Math.min(1.6, Math.max(1, window.devicePixelRatio || 1));
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      flat = flattenStems(buildStems(w, h), []);
      blades = buildBlades(flat);
      pollen = [];
      lastEmit = 0;
      /* 重建几何后指针低通状态要重置，否则会从旧位置"飞"过来 */
      ptr.ready = false;
    }
    var lastEmit = 0;

    function updatePointer(dt) {
      if (!ptr.ready) { ptr.sx = ptr.x; ptr.sy = ptr.y; ptr.ready = true; }
      var kp = lowpass(dt, CFG.pointerTauMs);
      ptr.sx += (ptr.x - ptr.sx) * kp;
      ptr.sy += (ptr.y - ptr.sy) * kp;
      var ka = lowpass(dt, CFG.pressTauMs);
      ptr.press += (ptr.pressTarget - ptr.press) * ka;
    }

    /* 指针位移场：返回该点应被推开的偏移量。
       平方衰减 —— 越近推得越狠，边缘平滑归零，不会出现硬边。
       采样点用的是低通后的指针位置。 */
    function pushAt(x, y) {
      if (ptr.press <= 0.002) return null;
      var dx = x - ptr.sx;
      var dy = y - ptr.sy;
      var d2 = dx * dx + dy * dy;
      var r = CFG.pushRadius;
      if (d2 > r * r) return null;
      var d = Math.sqrt(d2) || 0.0001;
      var fall = 1 - d / r;
      var mag = fall * fall * CFG.pushStrength * ptr.press;
      return { x: (dx / d) * mag, y: (dy / d) * mag };
    }

    /* 每帧先把一条藤的所有节点位置算好（含摆动与低通位移），
       绘制阶段直接读 nodes[i]。这样每个节点每帧只算一次 ——
       之前是每段算两次，若在节点上做低通就会被重复施加，滤波失效。 */
    function updateStemCoords(st, elapsed, sec, dt) {
      var pts = st.pts;
      var nodes = st.nodes;
      var p = clamp01((elapsed - st.t0) / st.dur);
      st.grow = easeOutCubic(p);
      st.visible = p <= 0 ? 0 : Math.max(1, Math.floor(pts.length * st.grow));

      var ko = lowpass(dt, CFG.offsetTauMs);
      for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        var sway = breathe(sec, CFG.swayHzA, CFG.swayHzB, st.swayPhase + i * CFG.wavePerNode)
          * st.swayAmp * pt.k * 0.62;

        var hit = pushAt(pt.x, pt.y);
        var tx = hit ? hit.x : 0;
        var ty = hit ? hit.y : 0;
        pt._px += (tx - pt._px) * ko;
        pt._py += (ty - pt._py) * ko;

        var n = nodes[i] || (nodes[i] = { x: 0, y: 0 });
        n.x = pt.x + sway + pt._px;
        n.y = pt.y + pt._py * 0.6;
      }
    }

    function drawStem(st) {
      var visible = st.visible;
      if (visible <= 1) return;
      var total = st.pts.length;
      var nodes = st.nodes;
      var rgb = st.warm ? GOLD_RGB : ACCENT_RGB;
      /* 生长头部柔和淡入，避免出现"硬边推进"的跳变 */
      var headIn = smoothstep(0, 0.30, clamp01((st.grow * total) / total));

      for (var i = 0; i < visible - 1; i++) {
        var a = nodes[i];
        var b = nodes[i + 1];
        var k = i / Math.max(1, total - 1);
        /* 锥度：根部粗、末端细 */
        var taper = (1 - k * 0.72) * (st.depth === 0 ? 1 : 0.7);
        var headFade = (i > visible - 4) ? (visible - i - 1) / 3 : 1;
        var alpha = (0.16 + 0.42 * taper) * headFade * headIn;
        if (alpha <= 0.004) continue;
        ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = Math.max(0.35, st.width * taper * headFade);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    function drawBlade(bl, elapsed, sec, dt) {
      var st = bl.stem;
      if (st.visible <= 1) return;
      /* 草叶出现的时机比藤蔓略晚，形成"先枝干后叶片"的层次 */
      var local = clamp01(((elapsed - st.t0) - bl.at * 12) / 620);
      if (local <= 0) return;
      var grow = easeOutCubic(local);

      var idx = Math.min(bl.at, st.pts.length - 1);
      var base = st.nodes[idx];
      var raw = st.pts[idx];

      /* 草叶自己的摆动：比藤蔓稍快一点，但同样是双频、慢速、带自身相位 */
      var own = breathe(sec, CFG.bladeSwayHzA, CFG.bladeSwayHzB, bl.phase) * bl.len * 0.13;

      /* 草叶对指针更敏感（乘 1.35），并且有自己的低通状态 */
      var hit = pushAt(raw.x, raw.y);
      var tx = hit ? hit.x * 1.35 : 0;
      var ty = hit ? hit.y * 1.05 : 0;
      var ko = lowpass(dt, CFG.offsetTauMs * 1.2);
      bl._px += (tx - bl._px) * ko;
      bl._py += (ty - bl._py) * ko;

      var len = bl.len * grow;
      var px = bl._px;
      var py = bl._py;
      var tipX = base.x + Math.cos(bl.angle) * len + own + px;
      var tipY = base.y + Math.sin(bl.angle) * len + py;
      /* 二次曲线让草叶自然弓弯，而不是一根硬直线 */
      var midX = base.x + Math.cos(bl.angle) * len * 0.5 + own * 0.5 + px * 0.55 + Math.cos(bl.angle + 1.4) * len * 0.22;
      var midY = base.y + Math.sin(bl.angle) * len * 0.5 + py * 0.55 + Math.sin(bl.angle + 1.4) * len * 0.12;

      var rgb = bl.warm ? GOLD_RGB : ACCENT_RGB;
      /* 顶端草叶淡一点，根部浓一点，避免糊成一团 */
      var alpha = (0.20 + 0.34 * grow) * (1 - (bl.at / Math.max(1, st.pts.length)) * 0.35);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = Math.max(0.35, bl.width * grow);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    }

    function emitPollen(elapsed) {
      if (elapsed < CFG.pollenStartMs) return;
      if (pollen.length >= CFG.pollenMax) return;
      /* 从已经长到中后段的藤蔓末端吐出花粉 */
      var st = flat[(Math.random() * flat.length) | 0];
      if (!st || st.visible <= 1) return;
      if (clamp01((elapsed - st.t0) / st.dur) < 0.55) return;
      var tip = st.pts[st.pts.length - 1];
      if (tip.y > h * 0.98) return;
      pollen.push({
        x: tip.x + rnd(-16, 16),
        y: tip.y + rnd(-12, 12),
        vx: rnd(-0.22, 0.22),
        vy: rnd(-0.58, -0.16),
        r: rnd(0.7, 1.9),
        life: 0,
        maxLife: rnd(2400, 5200),
        phase: rnd(0, Math.PI * 2)
      });
    }

    function drawPollen(dt, sec) {
      for (var i = pollen.length - 1; i >= 0; i--) {
        var m = pollen[i];
        m.life += dt;
        if (m.life > m.maxLife || m.y < -20) { pollen.splice(i, 1); continue; }
        /* 飘升 + 横向缓慢噪声摆动，而不是匀速直线 */
        m.x += m.vx * dt * 0.06 + breathe(sec, 0.21, 0.09, m.phase) * 0.14;
        m.y += m.vy * dt * 0.06;
        var hit = pushAt(m.x, m.y);
        if (hit) {
          m.x += hit.x * 0.045;
          m.y += hit.y * 0.02;
        }
        var t = m.life / m.maxLife;
        var alpha = Math.sin(Math.PI * clamp01(t)) * 0.5;
        if (alpha <= 0.004) continue;
        ctx.fillStyle = 'rgba(' + POLLEN_RGB + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* 下缘的"土壤辉光"——让藤蔓像从光里长出来，而不是凭空出现 */
    function drawGroundGlow(elapsed) {
      var a = smoothstep(CFG.growStartMs, CFG.growStartMs + 1200, elapsed) * 0.5;
      if (a <= 0.004) return;
      var g = ctx.createLinearGradient(0, h, 0, h - h * 0.30);
      g.addColorStop(0, 'rgba(' + ACCENT_RGB + ',' + (a * 0.42).toFixed(3) + ')');
      g.addColorStop(0.42, 'rgba(' + GOLD_RGB + ',' + (a * 0.14).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h - h * 0.30, w, h * 0.30);
    }

    function frame(now) {
      if (stopped) return;
      rafId = requestAnimationFrame(frame);
      try {
        var dt = lastTime ? Math.min(64, now - lastTime) : 16;
        lastTime = now;
        /* elapsed 用毫秒（对齐 CFG 里的时机）；sec 用秒（喂给所有正弦） */
        var elapsed = now - t0;
        var sec = elapsed / 1000;

        if (splashEl.classList.contains('hide')) { teardown(); return; }

        var exitAlpha = 1 - smoothstep(CFG.fadeOutMs, CFG.fadeOutMs + 520, elapsed);
        if (splashEl.classList.contains('exiting')) exitAlpha = Math.min(exitAlpha, 0.35);

        updatePointer(dt);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (exitAlpha <= 0.004) { teardown(); return; }

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = exitAlpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        drawGroundGlow(elapsed);

        var i;
        for (i = 0; i < flat.length; i++) updateStemCoords(flat[i], elapsed, sec, dt);
        for (i = 0; i < flat.length; i++) drawStem(flat[i]);
        for (i = 0; i < blades.length; i++) drawBlade(blades[i], elapsed, sec, dt);

        if (reducedMotion) {
          /* 尊重系统设置：只画一帧静态生长，不吐花粉、不循环 */
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          stopped = true;
          cancelAnimationFrame(rafId);
          rafId = 0;
          return;
        }

        if (elapsed - lastEmit > 92) { lastEmit = elapsed; emitPollen(elapsed); }
        drawPollen(dt, sec);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      } catch (e) {
        /* 一旦出错就停掉自己，把画面还给原启动页 */
        teardown();
      }
    }

    function teardown() {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove, true);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    function onPointerMove(e) {
      if (stopped) return;
      var rect = splashEl.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      if (!ptr.ready) { ptr.sx = ptr.x; ptr.sy = ptr.y; ptr.ready = true; }
      ptr.pressTarget = 1;
    }

    function onPointerLeave() { ptr.pressTarget = 0; }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerleave', onPointerLeave, true);
    window.addEventListener('blur', onPointerLeave);

    if (reducedMotion) {
      /* 静态帧：把时间轴推到生长完成的位置，画一次就收工 */
      t0 = performance.now() - (CFG.growStartMs + CFG.growSpreadMs + CFG.growDurMs + 400);
      frame(performance.now());
    } else {
      rafId = requestAnimationFrame(frame);
    }
  }
})();
