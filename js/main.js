// HIGHLIGHT Studio · 入口
// 调度原则：
//   1. 所有滚动相关的读写合并到一个 rAF 循环（scroll 事件只置脏位，不读布局）
//   2. 每个模块只在自己的版块接近视口时初始化，离开视口时停止逐帧工作
//   3. 只写 transform / opacity / 少量 CSS 变量；布局尺寸只在 resize 时读取并缓存
//   4. html.still（prefers-reduced-motion）时跳过所有逐帧动画，只保留静态结果

import { initHero } from './hero.js';
import { initCubex } from './cubex.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let still = reduce.matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// 用户在浏览中切换“减少动态效果”时实时生效
reduce.addEventListener?.('change', e => {
  still = e.matches;
  root.classList.toggle('still', still);
  root.classList.toggle('motion', !still);
  tick();
});

/* ---------------- 滚动调度 ---------------- */
const scrollJobs = new Set();
const resizeJobs = new Set();
let vh = innerHeight, sy = scrollY, queued = false;
function tick() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sy = scrollY;
    scrollJobs.forEach(fn => fn(sy));
  });
}
addEventListener('scroll', tick, { passive: true });
let rzTimer = 0;
addEventListener('resize', () => {
  clearTimeout(rzTimer);
  rzTimer = setTimeout(() => { vh = innerHeight; resizeJobs.forEach(fn => fn()); tick(); }, 120);
}, { passive: true });

// 只在元素接近视口时把 job 放进滚动循环
function whenNear(el, job, margin = '20% 0px') {
  if (!el) return;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { scrollJobs.add(job); tick(); }
    else scrollJobs.delete(job);
  }, { rootMargin: margin }).observe(el);
}

/* ---------------- 导航 ---------------- */
function initNav() {
  const nav = $('#nav'), bar = $('#navBar');
  if (!nav) return;
  let lastY = scrollY, docH = 1;
  const measure = () => { docH = Math.max(1, document.documentElement.scrollHeight - vh); };
  measure();
  resizeJobs.add(measure);
  new ResizeObserver(measure).observe(document.body);

  const island = nav.querySelector('.island');
  scrollJobs.add(y => {
    bar.style.transform = `scaleX(${clamp(y / docH)})`;
    // 顶部保持展开；向下滚收成一枚小胶囊，向上滚再展开
    const down = y > lastY + 6, up = y < lastY - 6;
    if (island && !document.body.classList.contains('lock')) {
      if (y < 60) island.classList.remove('mini');
      else if (down) island.classList.add('mini');
      else if (up) island.classList.remove('mini');
    }
    if (down || up) lastY = y;
  });
  nav.addEventListener('focusin', () => island && island.classList.remove('mini'));

  // scrollspy：哪个版块穿过视口中线，就点亮对应链接
  const links = $$('[data-spy]', nav);
  if (links.length) {
    const map = new Map(links.map(a => [a.dataset.spy, a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('on'));
      map.get(e.target.id)?.classList.add('on');
    }), { rootMargin: '-50% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }
}

/* ---------------- 菜单 ---------------- */
function initMenu() {
  const btn = $('#menuBtn'), menu = $('#menu');
  if (!btn || !menu) return;
  let open = false, lastFocus = null;
  const items = () => $$('a,button', menu);
  const set = v => {
    open = v;
    btn.setAttribute('aria-expanded', v);
    btn.setAttribute('aria-label', v ? '关闭菜单' : '打开菜单');
    document.body.classList.toggle('lock', v);
    if (v) {
      lastFocus = document.activeElement;
      menu.hidden = false;
      $('#nav .island')?.classList.remove('mini');
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('open')));
      setTimeout(() => items()[0]?.focus({ preventScroll: true }), 60);
    } else {
      menu.classList.remove('open');
      const done = () => { if (!open) menu.hidden = true; };
      still ? done() : setTimeout(done, 450);
      lastFocus?.focus?.({ preventScroll: true });
    }
  };
  btn.addEventListener('click', () => set(!open));
  menu.addEventListener('click', e => { if (e.target.closest('a,[data-close]')) set(false); });
  addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { set(false); return; }
    if (e.key === 'Tab') {
      // 焦点限制在菜单 + 菜单按钮之间
      const list = [btn, ...items()];
      const i = list.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 ? 0 : i + 1);
      e.preventDefault();
      list[next].focus();
    }
  });
}

/* ---------------- 下载：两个镜像随机 --------------- */
// 链接清单写在 data-alt 里（| 分隔）。每次点击重新抽一次，
// 某条线路挂了的时候，用户多点两次就能落到另一条上。
function initDownload() {
  const a = $('#cxDownload');
  if (!a) return;
  const urls = (a.dataset.alt || '').split('|').map(s => s.trim()).filter(Boolean);
  if (urls.length < 2) return;

  const pick = () => urls[Math.floor(Math.random() * urls.length)];
  // 页面加载先定一条：右键「复制链接」、中键新标签拿到的也是具体文件，不是空
  a.href = pick();

  // 不拦默认动作，只把 href 换成新抽的一条，交给 <a target="_blank"> 去开。
  // 用 window.open 反而会踩坑：features 里带 noopener 时它返回 null，
  // 于是「兜底跳转」每次都会执行，变成在当前页打开。
  // pointerdown 覆盖左键、中键、右键菜单，click 再补一次键盘 Enter。
  a.addEventListener('pointerdown', () => { a.href = pick(); });
  a.addEventListener('click', () => { a.href = pick(); });
}

/* ---------------- 章节指示 + 揭示 + 高亮 ---------------- */
function initChapters() {
  const chip = $('#chapter');
  if (!chip) return;
  const num = $('b', chip), name = $('span', chip);
  let t = 0;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const s = e.target;
    if (num.textContent === s.dataset.chapter) return;
    clearTimeout(t);
    chip.classList.add('swap');
    t = setTimeout(() => { num.textContent = s.dataset.chapter; name.textContent = s.dataset.name; chip.classList.remove('swap'); }, still ? 0 : 220);
  }), { rootMargin: '-45% 0px -55% 0px' });
  $$('[data-chapter]').forEach(s => io.observe(s));
  // 首屏不显示，读者开始往下走才出现
  scrollJobs.add(y => chip.classList.toggle('show', y > vh * .6));
  // 页脚字标露出时让位，避免压在红底上
  const foot = $('#distort');
  foot && new IntersectionObserver(([e]) => chip.classList.toggle('off', e.isIntersecting)).observe(foot);
}

function initReveal() {
  const els = $$('[data-rv]');
  if (still || !('IntersectionObserver' in window)) { $$('[data-hl]').forEach(h => h.classList.add('on')); return; }
  root.classList.add('rv');
  // 同一父容器里的兄弟元素依次错开 70ms，形成节奏而不是同时出现
  const groups = new Map();
  els.forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    if (i) el.style.setProperty('--d', `${Math.min(i, 6) * 0.07}s`);
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: .01 });
  els.forEach(el => io.observe(el));

  const hio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('on');
    hio.unobserve(e.target);
  }), { rootMargin: '0px 0px -25% 0px' });
  $$('[data-hl]').forEach(h => hio.observe(h));
}

/* ---------------- 页面装配 ---------------- */
async function boot() {
  initNav();
  initMenu();
  initDownload();
  initChapters();
  initReveal();
  // 首屏粒子与 CubeXDesktop 拼合：滚动只推进数值，绘制在各自模块里
  const heroFx = initHero({ isStill: () => still, getVh: () => vh });
  if (heroFx) { scrollJobs.add(heroFx.onScroll); heroFx.onScroll(scrollY); }
  const cx = initCubex({ isStill: () => still, getVh: () => vh, finePointer });
  if (cx) whenNear($('#cubex'), cx.onScroll, '0px');
  lazy('#works', () => import('./cards.js').then(m => m.initCards(finePointer)), '50% 0px');
  lazy('#distort', () => import('./footer.js').then(m => m.initFooter({ isStill: () => still, finePointer })), '100% 0px');
  tick();
}

function lazy(sel, load, margin = '60% 0px') {
  const el = $(sel);
  if (!el) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    load().catch(err => console.warn('[HIGHLIGHT]', sel, err));
  }, { rootMargin: margin });
  io.observe(el);
}

boot();
