/* 启动页自然生长动效 · 运行时冒烟测试
 * ---------------------------------------------------------------------------
 * 门禁只能证明"语法没错"，证明不了"跑起来不炸"。
 * Chromium 太重（~500MB），这里用一套最小 DOM/Canvas 桩把模块真跑几百帧，
 * 用 clearRect 调用次数作为"实际画了几帧"的可靠指标（每帧开头必调一次）。
 *
 * 四个场景：
 *   1. 正常播放      应生长、吐花粉、3.5s 后自我拆除
 *   2. 启动页被隐藏  应立刻拆除，一帧都不画
 *   3. reduced-motion 只画静态一帧，不进循环
 *   4. canvas 2D 不可用   静默降级，不抛异常
 * 任一项不过 → 退出码 1
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MODULE_NAME = '03a-splash-organic-growth.js';
const MODULE_CANDIDATES = [
  /* 放进工具的 tools/ 目录时走这条 */
  path.join(__dirname, '..', 'public', 'js', 'modules', '10-shell', MODULE_NAME),
  /* 留在工作区直接跑时走这条（旁边 splash-preview/ 里有同一份拷贝） */
  path.join(__dirname, 'splash-preview', MODULE_NAME)
];
const MODULE = MODULE_CANDIDATES.find((p) => fs.existsSync(p));
if (!MODULE) {
  console.error('找不到 ' + MODULE_NAME + '，已尝试：\n  ' + MODULE_CANDIDATES.join('\n  '));
  process.exit(1);
}
const src = fs.readFileSync(MODULE, 'utf8');

function makeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c)
  };
}

function makeElement(tag, id) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    children: [],
    parentNode: null,
    style: {},
    classList: makeClassList(),
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    remove() { if (el.parentNode) el.parentNode.removeChild(el); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
    querySelector() { return null; }
  };
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  return el;
}

function makeCtx2D(stats) {
  const noop = () => { stats.ops++; };
  return {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    strokeStyle: '', fillStyle: '',
    lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    setTransform: noop,
    clearRect() { stats.clears++; stats.ops++; },
    fillRect: noop,
    beginPath: noop,
    moveTo(x, y) { stats.pts.push(x, y); stats.ops++; },
    lineTo(x, y) { stats.pts.push(x, y); stats.ops++; },
    quadraticCurveTo() { stats.curves++; stats.ops++; },
    arc: noop,
    stroke: noop,
    fill: noop,
    createLinearGradient() { stats.gradients++; return { addColorStop() {} }; }
  };
}

function runScenario(opts) {
  const stats = { ops: 0, curves: 0, gradients: 0, clears: 0, rafFrames: 0, errors: [], pts: [], pointFrames: [] };
  const rafQueue = new Map();
  const listeners = { window: new Map(), document: new Map() };
  let rafSeq = 1;
  let now = 1000;

  const splashEl = makeElement('div', 'splash');
  splashEl.classList.add('splash-active');

  const doc = {
    readyState: 'complete',
    head: makeElement('head'),
    documentElement: makeElement('html'),
    body: makeElement('body'),
    addEventListener() {},
    removeEventListener() {},
    createElement(tag) {
      const el = makeElement(tag);
      if (tag === 'canvas') {
        el.width = 0;
        el.height = 0;
        el.getContext = () => (opts.noCanvas2D ? null : makeCtx2D(stats));
      }
      return el;
    },
    getElementById(id) { return id === 'splash' ? splashEl : null; },
    querySelector() { return null; }
  };

  const win = {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    matchMedia: (q) => ({ matches: /prefers-reduced-motion/.test(q) ? !!opts.reducedMotion : (/pointer:\s*coarse/.test(q) ? !!opts.coarsePointer : false) }),
    addEventListener(type, fn) { listeners.window.set(type, fn); },
    removeEventListener() {},
    requestAnimationFrame(fn) {
      const id = rafSeq++;
      rafQueue.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) { rafQueue.delete(id); }
  };

  const sandbox = {
    window: win, document: doc,
    performance: { now: () => now },
    requestAnimationFrame: win.requestAnimationFrame,
    cancelAnimationFrame: win.cancelAnimationFrame,
    Math, Date, isFinite,
    console: { log() {}, warn() {}, info() {}, error() {} }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  try {
    vm.runInContext(src, sandbox, { filename: 'splash-organic-growth.js' });
  } catch (e) {
    stats.errors.push('加载即抛异常: ' + e.message);
    return stats;
  }

  const canvas = splashEl.children.find((c) => c.id === 'splash-organic-growth');
  if (!canvas && !opts.noCanvas2D) {
    stats.errors.push('未创建 canvas');
    return stats;
  }
  stats.canvasCreated = !!canvas;

  if (opts.afterBoot) opts.afterBoot(splashEl);

  const totalMs = opts.totalMs || 4200;
  for (let t = 0; t <= totalMs; t += 16) {
    now += 16;
    /* 场景可按帧注入合成事件（如 pointermove），驱动交互代码路径 */
    if (opts.onFrame) {
      try { opts.onFrame(t, { listeners, splashEl }); }
      catch (e) { stats.errors.push('onFrame 注入异常: ' + e.message); return stats; }
    }
    const batch = [...rafQueue.values()];
    rafQueue.clear();
    if (batch.length === 0) break;
    for (const fn of batch) {
      stats.rafFrames++;
      stats.pts.length = 0;
      try {
        fn(now);
      } catch (e) {
        stats.errors.push('第 ' + stats.rafFrames + ' 帧抛异常: ' + e.message);
        return stats;
      }
      stats.pointFrames.push(Float64Array.from(stats.pts));
    }
  }

  stats.canvasStillMounted = !!(canvas && canvas.parentNode);
  return stats;
}

let failed = 0;
function check(label, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  [' + detail + ']' : ''));
  if (!cond) failed++;
}

console.log('\n=== 场景 1：正常播放 ===');
const a = runScenario({ reducedMotion: false, totalMs: 4200 });
check('全程无异常', a.errors.length === 0, a.errors.join(' | '));
check('画了多帧（>120 帧）', a.clears > 120, '实际 ' + a.clears + ' 帧');
check('产生了大量绘制调用（>2000 次）', a.ops > 2000, '实际 ' + a.ops + ' 次');
check('草叶用了二次曲线（>100 条）', a.curves > 100, '实际 ' + a.curves + ' 条');
check('画了土壤辉光渐变', a.gradients > 0, '实际 ' + a.gradients);
check('淡出后已自我拆除 canvas', a.canvasStillMounted === false,
  a.canvasStillMounted ? 'canvas 仍挂在 DOM 上' : '');

/* 平滑度：相邻两帧"同名顶点"的平均位移（绘制顺序稳定，所以按下标配对即可）。
   曾经把毫秒当秒用 → 摆动实际频率约 247Hz，每帧相位跳好几圈 → 满屏高频抖动。
   正常慢速摆动下每帧位移应是亚像素级；抖动时是几十像素量级，这个指标能直接抓住。 */
function smoothness(frames) {
  let pairs = 0, sum = 0, max = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    if (!a || !b || a.length !== b.length || a.length === 0) continue;
    let local = 0;
    for (let k = 0; k < a.length; k++) local += Math.abs(b[k] - a[k]);
    local /= a.length;
    pairs += 1;
    sum += local;
    if (local > max) max = local;
  }
  return { pairs: pairs, mean: pairs ? sum / pairs : 0, max: max };
}

console.log('\n=== 场景 1b：摆动平滑度（防高频抖动回归） ===');
const sm = smoothness(a.pointFrames);
check('取到足够的可比帧对（>=30）', sm.pairs >= 30, '实际 ' + sm.pairs + ' 对');
check('每帧平均位移 < 1.0px', sm.mean < 1.0, '实际 ' + sm.mean.toFixed(3) + 'px');
check('每帧最大位移 < 3.0px', sm.max < 3.0, '实际 ' + sm.max.toFixed(3) + 'px');

console.log('\n=== 场景 2：启动页被隐藏（应立刻拆除） ===');
const b = runScenario({
  reducedMotion: false,
  totalMs: 4200,
  afterBoot: (el) => el.classList.add('hide')
});
check('无异常', b.errors.length === 0, b.errors.join(' | '));
check('一帧都没画', b.clears === 0, '实际 ' + b.clears + ' 帧');
check('canvas 已拆除', b.canvasStillMounted === false);

console.log('\n=== 场景 3：prefers-reduced-motion（静态一帧） ===');
const c = runScenario({ reducedMotion: true, totalMs: 4200 });
check('无异常', c.errors.length === 0, c.errors.join(' | '));
check('只画了 1 帧', c.clears === 1, '实际 ' + c.clears + ' 帧');
check('确实画了内容（>2000 次调用）', c.ops > 2000, '实际 ' + c.ops + ' 次');
check('未进入 RAF 循环', c.rafFrames === 0, '实际 ' + c.rafFrames + ' 帧');

console.log('\n=== 场景 4：canvas 2D 不可用（应静默降级） ===');
const d = runScenario({ reducedMotion: false, totalMs: 800, noCanvas2D: true });
check('无异常', d.errors.length === 0, d.errors.join(' | '));
check('canvas 未留在 DOM 上', d.canvasStillMounted === false);

console.log('\n=== 场景 5：指针交互（视差/吸引环/花粉打旋/辉光） ===');
const e = runScenario({
  reducedMotion: false,
  totalMs: 4200,
  onFrame: (t, { listeners }) => {
    /* 指针沿圆周快速移动：最坏情况下的位移速率，抓"瞬移/跳变" */
    const fn = listeners.window.get('pointermove');
    if (fn && t % 48 === 0) {
      const ang = t * 0.02;
      fn({ clientX: 640 + Math.cos(ang) * 400, clientY: 360 + Math.sin(ang) * 260 });
    }
  }
});
check('全程无异常', e.errors.length === 0, e.errors.join(' | '));
check('画了多帧（>120 帧）', e.clears > 120, '实际 ' + e.clears + ' 帧');
const smE = smoothness(e.pointFrames);
check('取到足够的可比帧对（>=30）', smE.pairs >= 30, '实际 ' + smE.pairs + ' 对');
/* 交互允许更大的帧间位移（拨开强度 44px 经 110ms 低通 ≈ 每帧 6px 量级），
   但仍必须有界：超过 20px 就是"瞬移"，说明低通失效 */
check('指针快速移动下每帧平均位移 < 6.0px', smE.mean < 6.0, '实际 ' + smE.mean.toFixed(3) + 'px');
check('指针快速移动下每帧最大位移 < 20.0px（无瞬移）', smE.max < 20.0, '实际 ' + smE.max.toFixed(3) + 'px');

console.log('\n=== 场景 6：粗指针（触屏）降载路径 ===');
const f = runScenario({
  reducedMotion: false,
  coarsePointer: true,
  totalMs: 3000,
  onFrame: (t, { listeners }) => {
    const fn = listeners.window.get('pointermove');
    if (fn && t % 64 === 0) fn({ clientX: 200 + (t % 800), clientY: 500 });
  }
});
check('全程无异常', f.errors.length === 0, f.errors.join(' | '));
check('画了多帧（>80 帧）', f.clears > 80, '实际 ' + f.clears + ' 帧');

console.log('\n' + (failed === 0
  ? '全部通过 —— 这层动效可以挂进启动页'
  : failed + ' 项失败 —— 不要提交'));
process.exit(failed === 0 ? 0 : 1);
