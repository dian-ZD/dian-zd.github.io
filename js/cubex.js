// 01 CubeXDesktop：窗口里跑的是原软件真实的渲染层（site/cubex-app）。
// 同源，所以滚动时可以拿到它的真实 DOM，把侧栏、标题栏、欢迎区、输入区
// 这些窗格整块从窗口右边界之外推进来，落位后正好拼回原界面。
// 只写 transform，落位即清空内联样式，恢复成原软件自己的排版。

const FRAME_W = 1120;

// 起点一律在窗口右边界之外：iframe 会裁掉出界的部分，所以视觉上这些模块
// 是真的从画面右侧外面飞进来的，而不是在落点附近抖一下。
// OUT 是落在窗口外之后再多给的余量，保证整块（不是一条边）都在框外。
const OUT = 56;

// 按「部件」飞：底色（shell 背景、整列侧栏面板、主区粒子场）从一开始就在，
// 界面上每一个按钮、每一行文字都自己从窗口右边界之外飞进来。
const PIECES = [
  '.sidebar-brand',
  '.sidebar-mode',
  '.sidebar > .nav-action.new-task',
  '.sidebar > .nav-action:not(.new-task)',
  '.titlebar-context',
  '.titlebar-actions .icon-button',
  '.welcome-mark',
  '.welcome h1',
  '.welcome p',
  '.window-controls .window-button',
  '.sidebar-scroll .section-head',
  '.sidebar-scroll .project-list',
  '.composer-stack',
  '.sidebar-bottom',
];

// 出发间隔 / 单块飞行时长：20 块左右铺满整段滚动，画面里始终三四块在空中
const STEP = 0.042;
const FLY = 0.2;

// 飞行中的每一块都挂一张「承载卡」：深色底 + 1px 描边 + 大投影，
// 让它在半空中是一块看得见的模块，而不是一行漂浮的文字。
// 卡片画在伪元素上，用 --fly 逐帧收淡，落位时刚好和位移一起归零。
// sidebar-scroll 原本 overflow:auto，会把飞出去的子元素裁掉，这里放开。
const FLY_CSS = `
.cx-fly{position:relative;z-index:20;will-change:transform}
.cx-fly::before{
  content:"";position:absolute;inset:-6px;border-radius:11px;z-index:-1;
  background:linear-gradient(180deg,rgba(38,41,47,.97),rgba(22,24,28,.97));
  border:1px solid rgba(255,255,255,.09);
  box-shadow:0 26px 58px rgba(0,0,0,.6),0 3px 12px rgba(0,0,0,.42);
  opacity:var(--fly,1);pointer-events:none;
}
.sidebar-scroll{overflow:visible !important}
`;

export function initCubex({ isStill, getVh }) {
  const sec = document.getElementById('cubex');
  const stage = document.getElementById('cxStage');
  const frame = document.getElementById('cxFrame');
  const iframe = document.getElementById('cxApp');
  if (!sec || !stage || !frame || !iframe) return;

  let scale = 1;
  let doc = null, items = [], progress = 0, done = false, started = false, frozen = false;

  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  // 干净的减速：不回弹。原来的 back-out 会冲过落点 6%，
  // 侧栏那种 400px 宽的块冲过头就是「压到旁边那块」的来源
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const still = () => isStill();

  function fit() {
    scale = stage.clientWidth / FRAME_W;
    frame.style.transform = `translate3d(0,0,0) scale(${scale.toFixed(4)})`;
  }

  function collect() {
    const found = [];
    for (const sel of PIECES) {
      for (const el of doc.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 4) continue;
        found.push({ el, r });
      }
    }
    if (!found.length) return false;

    items = found.map(({ el, r }, i) => {
      // 侧栏、标题栏的部件一律水平推进：它们在同一列/同一行里排队，
      // 上下再错开就会在半空中互相压字
      const flat = r.left < 210 || r.top < 60;
      // 又宽又矮的块（字标、标题、副文案）本身只是一行字，
      // 挂整块宽度的承载卡反而变成一条空条；整体宽度超过 600 的输入区同理，
      // 它自己就有底和描边，不需要再包一张卡。这些都裸飞。
      const bare = (r.width > 380 && r.height < 90) || r.width > 600;
      return {
        el,
        // 起飞点：让整块的左边缘越过窗口右边界，出界部分被 iframe 裁掉
        x: FRAME_W - r.left + OUT,
        y: flat ? 0 : ((i % 2) ? 1 : -1) * (4 + (i % 3) * 3),
        rot: flat ? 0 : ((i % 3) - 1) * 0.7,
        bare,
        start: 0.02 + i * STEP,
        dur: FLY,
        flyVar: null,
        flying: false,
        landed: false,
      };
    });

    if (still()) {
      // 减少动态效果：直接给成品，之后的滚动不再改这些元素
      frozen = true;
      items.forEach(it => {
        it.el.style.transform = '';
        it.el.style.opacity = '';
        it.el.style.removeProperty('--fly');
        it.el.classList.remove('cx-fly');
        it.landed = true;
      });
      stage.classList.add('done');
      done = true;
    } else {
      render(progress);
    }
    return true;
  }

  function render(p) {
    if (!items.length || frozen) return;

    // 窗口本体一进场就是实体，滚起来才往里装东西；
    // 只留一点点下沉和缩放，作为从上一屏带进来的过渡
    const k = 1 - easeOut(clamp01(p / 0.06));
    frame.style.transform =
      `translate3d(0,${(k * 18).toFixed(1)}px,0) scale(${(scale * (1 - 0.012 * k)).toFixed(4)})`;
    frame.style.opacity = (1 - 0.22 * k).toFixed(3);

    for (const it of items) {
      const t = clamp01((p - it.start) / it.dur);
      if (t >= 1) {
        if (!it.landed) {
          it.el.style.transform = '';
          it.el.style.opacity = '';
          it.el.style.removeProperty('--fly');
          it.el.classList.remove('cx-fly');
          it.flying = false;
          it.flyVar = null;
          it.landed = true;
        }
        continue;
      }
      if (!it.flying && !it.bare) { it.el.classList.add('cx-fly'); it.flying = true; it.flyVar = null; }
      const f = 1 - easeOut(t);
      // 横向匀速收口，纵向用 f² 收得更快，轨迹就成了一道很浅的弧，不是斜直线
      const y = it.y * f * f;
      it.el.style.transform =
        `translate3d(${(it.x * f).toFixed(1)}px,${y.toFixed(1)}px,0) ` +
        `rotate(${(it.rot * f).toFixed(2)}deg) scale(${(1 - 0.05 * f).toFixed(3)})`;
      // 承载卡只在最后 16% 路程收淡；中间段固定为 1，不逐帧写变量
      if (!it.bare) {
        const v = t > 0.84 ? Math.round((1 - t) / 0.16 * 100) / 100 : 1;
        if (v !== it.flyVar) { it.el.style.setProperty('--fly', v); it.flyVar = v; }
      }
      it.landed = false;
    }

    const fin = p > 0.965;
    if (fin !== done) { stage.classList.toggle('done', fin); done = fin; }
  }

  function progressOf(y) {
    const h = sec.offsetHeight - getVh();
    return h > 0 ? clamp01((y - sec.offsetTop) / h) : 1;
  }

  function bind() {
    try { doc = iframe.contentDocument; } catch (err) { doc = null; }
    if (!doc) return;
    if (!doc.getElementById('cx-fly-css')) {
      const s = doc.createElement('style');
      s.id = 'cx-fly-css';
      s.textContent = FLY_CSS;
      (doc.head || doc.documentElement).appendChild(s);
    }
    let tries = 0;
    const wait = () => {
      if (doc.querySelector('.titlebar')) { if (collect()) started = true; return; }
      if (++tries < 60) setTimeout(wait, 100);
    };
    wait();
  }

  fit();
  window.addEventListener('resize', fit, { passive: true });

  iframe.addEventListener('load', bind);

  // 到版块附近才真正加载这套界面，首屏不付这个代价
  const lazy = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    lazy.disconnect();
    iframe.src = iframe.dataset.src;
  }, { rootMargin: '700px' });
  lazy.observe(sec);

  render(0);

  return {
    onScroll(y) {
      progress = progressOf(y);
      if (started) render(progress);
    },
  };
}
