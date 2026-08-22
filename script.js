/* HIGHLIGHT Studio — 以人文铸科技
   顶栏：滚动收放的胶囊岛 / 菜单：paused timeline + addPause
   标识：横向跑马灯 / 页脚：光斑扫过实体 logo
   品牌片：<audio> 作为主时钟的 2:04 纯 MG 引擎 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.gsap) {
  gsap.registerPlugin(...[window.ScrollTrigger, window.ScrollToPlugin].filter(Boolean));
  gsap.defaults({ ease: 'power3.out' });
}

/* ---------- 1. 取景框光标：准星跟随 + 悬停时报出这里能做什么 ---------- */
(() => {
  const cur = $('.cursor');
  if (!cur || reduced) return;
  const ring = cur.querySelector('i'), dot = cur.querySelector('b'), tag = cur.querySelector('u');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; gsap.set(dot, { x, y }); }, { passive: true });
  gsap.ticker.add(() => {
    rx += (x - rx) * .16; ry += (y - ry) * .16;
    gsap.set(ring, { x: rx, y: ry });
    if (tag) gsap.set(tag, { x: rx, y: ry });
  });
  addEventListener('pointerdown', () => cur.classList.add('press'));
  addEventListener('pointerup', () => cur.classList.remove('press'));

  /* 标签只说动作，不说「点击」这种废话；顺序即优先级 */
  const LABEL = [
    ['#bigPlay,#btnPlay', '播放'],
    ['.track', '拖动'],
    ['.chapters button', '跳到这章'],
    ['.controls button', '控制'],
    ['.pm-card', '看看'],
    ['.role', '展开'],
    ['.contact-card', '复制'],
    ['a[href^="mailto"]', '写信'],
    ['a[href^="http"]', '新窗口'],
    ['.join-cta,.island-join', '加入'],
    ['.menu-link', '前往'],
    ['.fchar,#footMark', '试试'],
    ['a,button', '前往']
  ];
  const hot = LABEL.map(l => l[0]).join(',');

  document.addEventListener('pointerover', e => {
    const t = e.target.closest(hot);
    if (!t) return;
    cur.classList.add('on');
    if (!tag) return;
    const hit = LABEL.find(([sel]) => t.matches(sel) || t.closest(sel));
    tag.textContent = t.dataset.cursor || (hit ? hit[1] : '');
  });
  document.addEventListener('pointerout', e => { if (e.target.closest(hot)) cur.classList.remove('on'); });

  /* 离开窗口时收起，避免残留在角落 */
  document.addEventListener('pointerleave', () => gsap.to(cur, { autoAlpha: 0, duration: .3 }));
  document.addEventListener('pointerenter', () => gsap.to(cur, { autoAlpha: 1, duration: .3 }));
})();

/* ---------- 2. smooth anchors ---------- */
$$('[data-scroll]').forEach(el => el.addEventListener('click', () => {
  const t = $(el.dataset.scroll); if (!t) return;
  closeMenu?.();
  if (reduced || !window.gsap || !window.ScrollToPlugin) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  else gsap.to(window, { scrollTo: { y: t, offsetY: 0 }, duration: 1.05, ease: 'power2.inOut' });
}));

/* ---------- 3. 顶栏胶囊岛：往下走就收起，抬头就还你 ---------- */
let closeMenu = null;
(() => {
  const island = $('#island'), links = $('#islandLinks'), toggle = $('#islandToggle');
  const backdrop = $('#menuBackdrop'), panel = $('#menuPanel');
  if (!island || !window.gsap) return;

  /* 3a. 收起是"让路"，展开是"回应"：所以收起慢而稳，展开快而准 */
  const linksW = () => links ? links.getBoundingClientRect().width : 0;
  let collapsed = false, wide = linksW();
  addEventListener('resize', () => { if (!collapsed) wide = linksW(); });

  const setCollapsed = v => {
    if (v === collapsed || !links) return;
    collapsed = v;
    /* 3.13 没有 easeReverse：用两条不同 ease 的补间模拟"反向更利落" */
    gsap.to(links, v
      ? { width: 0, opacity: 0, marginLeft: -14, duration: .55, ease: 'power3.inOut' }
      : { width: wide, opacity: 1, marginLeft: 0, duration: .34, ease: 'power2.out',
          onComplete: () => gsap.set(links, { width: 'auto' }) });
    /* 收起时整条岛也一起变窄变矮一点，像被按扁 —— 只是收链接会显得半途而废 */
    gsap.to(island, {
      paddingLeft: v ? 11 : 14, paddingRight: v ? 6 : 8,
      minHeight: v ? 46 : 52, duration: .5, ease: 'power3.out'
    });
    fadeIsland();
  };

  /* 3a2. 让路要让到底：往下读的时候整条岛收上去藏起来，绝不压在正文上；
     指针一靠近页面顶端、或者往回滚一点，它立刻落回来 */
  let nearTop = false, entered = false;

  /* 藏起来的东西必须留一个能碰到的把手。
     岛收上去时 visibility 是 hidden，按钮就再也点不到了；
     所以在页面顶端常驻一条窄带，鼠标靠上来或者手指点一下都能把岛叫回来 */
  const peek = document.createElement('div');
  peek.className = 'island-peek';
  peek.setAttribute('aria-hidden', 'true');
  document.body.appendChild(peek);
  const recall = () => { if (!nearTop) { nearTop = true; fadeIsland(); } };
  peek.addEventListener('pointerenter', recall);
  peek.addEventListener('click', recall);

  function fadeIsland() {
    if (!entered) return;
    const away = collapsed && !nearTop;
    gsap.to(island, { y: away ? -78 : 0, autoAlpha: away ? 0 : 1, duration: away ? .45 : .32,
      ease: away ? 'power3.inOut' : 'power2.out', overwrite: 'auto' });
    /* 只有真藏起来的时候那条带才接管指针，平时它不能挡住正文 */
    peek.classList.toggle('live', away);
  }
  addEventListener('pointermove', e => {
    const n = e.clientY < 118;
    if (n !== nearTop) { nearTop = n; fadeIsland(); }
  }, { passive: true });
  island.addEventListener('pointerenter', () => { nearTop = true; fadeIsland(); });
  /* 键盘用户按 Tab 想进导航时，隐藏的岛先落回来，否则焦点会跳过整条顶栏 */
  addEventListener('keydown', e => { if (e.key === 'Tab') recall(); });

  /* 3b. 顶栏底部的红线随阅读进度长出来 */
  const prog = $('#islandProgress');
  if (prog && window.ScrollTrigger && !reduced) {
    gsap.to(prog, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: .3 }
    });
  }

  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (y > 220 && y > last) setCollapsed(true);
    else if (y < last - 6 || y < 140) setCollapsed(false);
    last = y;
  }, { passive: true });

  /* 入场：岛先落下，里面的东西才依次到位。
     入场没走完就不许让路动画插手，否则两个 tween 抢同一个 y */
  gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => { entered = true; fadeIsland(); } })
    .from(island, { y: -72, autoAlpha: 0, duration: .9 }, .15)
    .from(island.querySelectorAll('.island-brand, .island-links a, .island-join, .island-toggle'),
      { y: -10, autoAlpha: 0, duration: .5, stagger: .05 }, .45);

  /* 3c. 菜单：paused timeline + addPause，进场慢出场快 */
  if (!toggle || !panel || !backdrop) return;
  const barA = $('#barA'), barB = $('#barB');
  const items = $$('.menu-link', panel);
  const side = $('.menu-side', panel);
  gsap.set(panel, { yPercent: -4 });

  const tl = gsap.timeline({ paused: true, defaults: { duration: .5, ease: 'power3.out' } })
    .to(backdrop, { autoAlpha: 1, duration: .4 }, 0)
    /* 面板从顶部展开而不是整块淡入：它是从顶栏里拉下来的东西 */
    .fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.out' }, .05)
    .to(panel, { autoAlpha: 1, yPercent: 0, duration: .55 }, .05)
    .to(barA, { attr: { x1: 3.5, y1: 3.5, x2: 14.5, y2: 14.5 }, duration: .45, ease: 'back.out(2)' }, 0)
    .to(barB, { attr: { x1: 14.5, y1: 3.5, x2: 3.5, y2: 14.5 }, duration: .45, ease: 'back.out(2)' }, 0)
    /* 菜单项从左侧被推进来，编号先到、字后到：读起来有先后 */
    .from(items, { x: -26, autoAlpha: 0, duration: .6, stagger: .07, ease: 'expo.out' }, .16)
    .from($$('.menu-link i', panel), { autoAlpha: 0, duration: .4, stagger: .07 }, .12)
    .from(side ? [side] : [], { autoAlpha: 0, y: 16, duration: .45 }, .3)
    .addPause();

  let open = false;
  const openMenu = () => { open = true; toggle.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; tl.timeScale(1).play(); };
  closeMenu = () => { if (!open) return; open = false; toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; tl.timeScale(1.7).reverse(); };
  toggle.addEventListener('click', () => open ? closeMenu() : openMenu());
  backdrop.addEventListener('click', closeMenu);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  $$('.menu-link[href]', panel).forEach(a => a.addEventListener('click', closeMenu));
})();

/* ---------- 4. hero 首屏：先量后写，再随滚动交出画面 ---------- */
(() => {
  if (!window.gsap) return;
  const lines = $$('.hero-h1 .ln > span');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  /* 顺序有意：先出眉标那条线（像先架好尺），再落标题，最后才是导语 */
  const rule = $('.hero-eyebrow');
  if (rule) {
    tl.from(rule, { autoAlpha: 0, duration: .7, ease: 'power2.out' }, .15)
      .fromTo(rule, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1 }, .15);
  }
  if (lines.length) {
    gsap.set(lines, { yPercent: 112, rotate: 1.4, transformOrigin: 'left bottom' });
    tl.to(lines, { yPercent: 0, rotate: 0, duration: 1.35, stagger: .13 }, .45);
  }
  const em = $('.hero-h1 em');
  if (em) tl.fromTo(em, { color: '#f4f5f7' }, { color: '#ff3038', duration: .9, ease: 'power2.inOut' }, 1.35);
  const tail = ['.hero-lede', '.scroll-hint'].filter(s => $(s));
  if (tail.length) tl.from(tail, { autoAlpha: 0, y: 24, duration: .95, stagger: .12 }, 1.15);

  /* 往下滚时首屏不是简单淡出，而是被下一屏「抬走」：标题上浮、透明度递减。
     加入我们那一页没有这套首屏结构，先确认元素在再挂，否则会空跑报警告 */
  const heroSec = $('.hero'), heroIn = $('.hero-inner');
  if (heroSec && heroIn && window.ScrollTrigger && !reduced) {
    gsap.to(heroIn, {
      yPercent: -14, autoAlpha: .12, ease: 'none',
      scrollTrigger: { trigger: heroSec, start: 'top top', end: 'bottom top', scrub: .6 }
    });
  }

  const cv = $('#heroCanvas');
  if (cv && !reduced) {
    const ctx = cv.getContext('2d');
    let w, h, dpr = Math.min(devicePixelRatio || 1, 2), t = 0;
    const fit = () => { w = cv.width = cv.offsetWidth * dpr; h = cv.height = cv.offsetHeight * dpr; };
    fit(); addEventListener('resize', fit);
    /* 指针目标值与实际值分开，靠缓动追上去，鼠标停下时画面仍在收敛 */
    let tx = .5, ty = .5, mx = .5, my = .5;
    addEventListener('pointermove', e => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; }, { passive: true });

    gsap.ticker.add(() => {
      t += .006;
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      ctx.clearRect(0, 0, w, h);
      const gap = 46 * dpr;

      /* 点阵：离指针越近越亮，且尺寸从方点长成短横，像被「读取」到 */
      for (let y = 0; y < h + gap; y += gap) {
        for (let x = 0; x < w + gap; x += gap) {
          const d = Math.hypot(x / w - mx, (y / h - my) * .8);
          const near = Math.max(0, .46 - d) / .46;
          const a = near * (.5 + .5 * Math.sin(t * 1.8 + x * .004 + y * .004));
          if (a <= .012) { ctx.fillStyle = 'rgba(148,155,170,.10)'; ctx.fillRect(x, y, 1 * dpr, 1 * dpr); continue; }
          ctx.fillStyle = `rgba(255,48,56,${a * .62})`;
          ctx.fillRect(x, y, (1.2 + near * 5) * dpr, 1.2 * dpr);
        }
      }

      /* 十字准线 + 一段读数：科技的部分只出现在测量动作里，不喧哗 */
      const cx = w * mx, cy = h * my;
      ctx.strokeStyle = 'rgba(61,67,80,.5)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,48,56,.5)';
      ctx.beginPath();
      ctx.moveTo(cx - 16 * dpr, cy); ctx.lineTo(cx - 5 * dpr, cy);
      ctx.moveTo(cx + 5 * dpr, cy); ctx.lineTo(cx + 16 * dpr, cy);
      ctx.stroke();

      ctx.font = `${10 * dpr}px ui-monospace,monospace`;
      ctx.fillStyle = 'rgba(148,155,170,.42)';
      ctx.fillText(`${(mx * 100).toFixed(1)} / ${(my * 100).toFixed(1)}`, cx + 22 * dpr, cy - 10 * dpr);

      /* 呼吸的水平基线，保留原来的尺度感 */
      const ly = h * (.3 + my * .26);
      ctx.strokeStyle = 'rgba(42,46,56,.9)';
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
    });
  }
})();

/* ---------- 5. 品牌标识跑马灯：滚动带着它走，指针点亮经过的词 ---------- */
(() => {
  const track = $('#htextTrack');
  if (!track) return;
  const unit = track.firstElementChild;
  if (!unit) return;
  /* 复制到宽度足够无缝 */
  const need = Math.ceil(innerWidth / unit.getBoundingClientRect().width) + 2;
  for (let i = 0; i < need; i++) track.appendChild(unit.cloneNode(true));
  if (reduced || !window.gsap) return;

  const unitW = () => unit.getBoundingClientRect().width;
  /* repeat:-1 遇 timeScale(-1) 会把补间推到 totalDuration=Infinity 而被立即移除，
     改用足够大的有限 repeat：取模包装保证循环边界视觉无缝，且可安全反向 */
  const loop = gsap.to(track, { x: () => -unitW(), duration: 18, ease: 'none', repeat: 9999,
    modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % unitW()) } });

  const band = track.parentElement;

  if (window.ScrollTrigger) {
    /* 5a. 滚动的速度就是带子的速度，方向也跟着翻 —— 往回滚时字反着走，
       让这条带子看起来是被页面拖动的，而不是自己在空转 */
    const clamp = gsap.utils.clamp(-5, 5);
    let dir = 1, settle;
    ScrollTrigger.create({
      onUpdate: self => {
        const v = clamp(self.getVelocity() / 300);
        if (v && Math.sign(v) !== dir) dir = Math.sign(v);
        gsap.to(loop, { timeScale: (Math.abs(v) + 1) * dir, duration: .3, overwrite: true });
        /* 停止滚动后收敛回常速，只留一次收尾补间，不叠 */
        settle && settle.kill();
        settle = gsap.to(loop, { timeScale: dir, duration: 1.5, delay: .35, overwrite: 'auto' });
      }
    });

    /* 5b. 内容随滚动上下浮动一点：带子的边线不动，字在里面移，像透过一道缝在看
       （不要 skew 整条带子——上下边线会跟页面边缘错开，看着像布局坏了） */
    if (band) {
      gsap.fromTo(track, { y: 10 }, {
        y: -10, ease: 'none',
        scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: .8 }
      });
    }
  }

  /* 5c. 指针经过时点亮那个空心词：与 hero 点阵同一隐喻——被读到的地方才亮 */
  track.addEventListener('pointermove', e => {
    const w = e.target.closest('.htext-word');
    $$('.htext-word.lit', track).forEach(el => { if (el !== w) el.classList.remove('lit'); });
    if (w) w.classList.add('lit');
  }, { passive: true });
  track.addEventListener('pointerleave', () => $$('.htext-word.lit', track).forEach(el => el.classList.remove('lit')));
})();

/* ---------- 6. 滚动进场：reveal / rule / 逐词点亮 ---------- */
(() => {
  if (reduced) { $$('.reveal, .underlined').forEach(e => e.classList.add('in')); return; }
  if (!window.gsap || !window.ScrollTrigger) {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
    $$('.reveal, .underlined').forEach(e => io.observe(e));
    return;
  }

  $$('.reveal').forEach(el => ScrollTrigger.create({
    trigger: el, start: 'top 86%', once: true,
    onEnter: () => el.classList.add('in')
  }));

  /* 手写划线：读完那句话的中途才画出来，所以触发点比 reveal 更靠上。
     首屏已经在视口里的那句（hero 导语）等入场动画走完再画，否则 ScrollTrigger 永不 onEnter */
  $$('.underlined').forEach(el => {
    const draw = d => gsap.delayedCall(d, () => el.classList.add('in'));
    if (el.getBoundingClientRect().top < innerHeight) { draw(1.7); return; }
    ScrollTrigger.create({ trigger: el, start: 'top 74%', once: true, onEnter: () => draw(.45) });
  });

  $$('.rule').forEach(el => gsap.fromTo(el, { scaleX: 0 }, {
    scaleX: 1, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 92%' }
  }));

  $$('.grid3 .section-index').forEach(el => gsap.from(el, {
    autoAlpha: 0, x: -14, duration: .7,
    scrollTrigger: { trigger: el, start: 'top 88%' }
  }));

  /* 段落逐词点亮 */
  const mf = $('#mfWords');
  if (mf) {
    const txt = mf.textContent.trim();
    mf.innerHTML = [...txt].map(c => `<span class="w">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    gsap.to($$('.w', mf), {
      color: 'var(--ink)', stagger: .012, ease: 'none',
      scrollTrigger: { trigger: mf, start: 'top 78%', end: 'bottom 42%', scrub: .6 }
    });
  }

  /* 章节大标题：由下向上带遮罩 */
  $$('.mf-h2, .joinband h2, .pm-group > h3').forEach(el => gsap.from(el, {
    yPercent: 16, autoAlpha: 0, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 88%' }
  }));

  /* 产品卡片错落进场 */
  $$('.pm-group').forEach(g => gsap.from($$('.pm-card', g), {
    y: 34, autoAlpha: 0, duration: .8, stagger: .08, ease: 'power3.out',
    scrollTrigger: { trigger: g, start: 'top 82%' }
  }));

  /* 章节抬头：先划线，再让眉标与编号从线里升起。
     底线用 background-image 画（见 .sec-head），才能直接补间 background-size */
  $$('.sec-head').forEach(head => {
    gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 88%' } })
      .fromTo(head, { backgroundSize: '0% 1px' }, { backgroundSize: '100% 1px', duration: 1, ease: 'expo.out' }, 0)
      .from(head.children, { yPercent: 60, autoAlpha: 0, duration: .8, stagger: .08, ease: 'expo.out' }, .18);
  });

  /* 批注：一条一条送到眼前，像有人依次把便签贴上来 */
  $$('.mf-note').forEach(box => gsap.from($$('.note', box), {
    x: -12, autoAlpha: 0, duration: .8, stagger: .12, ease: 'power3.out',
    scrollTrigger: { trigger: box, start: 'top 84%' }
  }));

  /* 引文：整块升起，署名再慢半拍 */
  $$('.quote').forEach(q => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: q, start: 'top 84%' } })
      .from(q, { autoAlpha: 0, y: 16, duration: .9, ease: 'expo.out' }, 0);
    const cite = $('cite', q);
    if (cite) tl.from(cite, { autoAlpha: 0, y: 8, duration: .6 }, .5);
  });

  /* 推荐位的取景角标由 §7 的扫描时间线统一接管，这里不重复触发 */

  /* 联系卡：从下方推入 */
  const cg = $('.contact-grid');
  if (cg) gsap.from($$('.contact-card', cg), {
    y: 26, autoAlpha: 0, duration: .8, stagger: .1, ease: 'power3.out',
    scrollTrigger: { trigger: cg, start: 'top 86%' }
  });
})();

/* ---------- 7. 越权者推荐位：先被扫出来，再越出自己的边 ---------- */
(() => {
  const stage = $('#featStage');
  if (!stage || !window.gsap || reduced) return;
  const base = $('.l-base', stage), ox = $('.l-ox', stage), red = $('.l-red', stage), scan = $('#featScan');
  const corners = $$('.feat-corner', stage);

  gsap.set(base, { autoAlpha: 0, clipPath: 'inset(0 0 100% 0)' });
  gsap.set([ox, red], { autoAlpha: 0 });
  gsap.set(corners, { autoAlpha: 0 });

  /* 入场的因果是明确的：扫描线走一趟，走到哪儿标识就显到哪儿；
     线走到底的一瞬三色错开——这个系列讲的就是越界——随后自己对齐。
     扫描线只有 2px 高，yPercent 走不出距离，改用百分比 top（相对舞台高度） */
  const enter = gsap.timeline({ paused: true })
    .set(base, { autoAlpha: 1 })
    .fromTo(scan, { top: '0%', autoAlpha: 0 }, { autoAlpha: 1, duration: .2 }, 0)
    .to(scan, { top: '100%', duration: 1.15, ease: 'power1.inOut' }, 0)
    .to(base, { clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'power1.inOut' }, 0)
    .to(scan, { autoAlpha: 0, duration: .25 }, 1.05)
    .set([ox, red], { autoAlpha: .92 }, 1.02)
    .to(ox, { x: -11, y: 4, duration: .1 }, 1.02)
    .to(red, { x: 11, y: -4, duration: .1 }, 1.02)
    .to([ox, red], { x: 0, y: 0, duration: .55, ease: 'power3.inOut' }, 1.2)
    .to([ox, red], { autoAlpha: 0, duration: .4 }, 1.45)
    .fromTo(corners, { scale: .35, autoAlpha: 0 }, { scale: 1, autoAlpha: .7, duration: .8, stagger: .1, ease: 'expo.out' }, .9);

  ScrollTrigger.create({ trigger: stage, start: 'top 78%', once: true, onEnter: () => enter.play() });

  /* 舞台随滚动做极缓的推近，网格与标识不同速：画面有纵深，不是一张贴图 */
  gsap.fromTo($('.feat-logo-stack', stage), { yPercent: 5 }, {
    yPercent: -5, ease: 'none',
    scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: .7 }
  });

  /* 悬停：两个色层朝指针的反方向被顶出去，越靠边越偏——手真的在把画面推出边界 */
  const q = { ox: gsap.quickTo(ox, 'x', { duration: .5, ease: 'power3' }),
              oy: gsap.quickTo(ox, 'y', { duration: .5, ease: 'power3' }),
              rx: gsap.quickTo(red, 'x', { duration: .5, ease: 'power3' }),
              ry: gsap.quickTo(red, 'y', { duration: .5, ease: 'power3' }) };

  stage.addEventListener('pointerenter', () => {
    gsap.to([ox, red], { autoAlpha: .8, duration: .35, overwrite: true });
    gsap.to(corners, { scale: 1.25, autoAlpha: 1, duration: .5, ease: 'expo.out' });
  });

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - .5) * 2, dy = ((e.clientY - r.top) / r.height - .5) * 2;
    q.ox(-dx * 16); q.oy(-dy * 8);
    q.rx(dx * 16); q.ry(dy * 8);
  }, { passive: true });

  stage.addEventListener('pointerleave', () => {
    gsap.to([ox, red], { x: 0, y: 0, autoAlpha: 0, duration: .55, ease: 'power3.out', overwrite: true });
    gsap.to(corners, { scale: 1, autoAlpha: .7, duration: .5, ease: 'expo.out' });
  });
})();

/* ---------- 8. 页脚品牌标识：像素切割 ---------- */
(() => {
  const mark = $('#footMark'), inner = $('#footMarkInner');
  const cv = $('#footPx'), img = mark && mark.querySelector('.foot-logo');
  if (!mark || !inner || !cv || !img) return;

  if (reduced) { mark.classList.add('awake'); return; }

  const ctx = cv.getContext('2d');
  const CELL = 12;
  const DECAY = .972;
  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;

  let cssW = 0, cssH = 0, cols = 0, rows = 0, dpr = 1, ready = false;
  let R = 170, MAX = CELL * 3;
  let seeds = [], seedy = [], ink = [], dx = [], dy = [];

  /* 逐格取一次墨量：空白格不参与绘制，本该空白的地方就不会冒出任何东西 */
  const sample = () => {
    ink = new Array(cols * rows).fill(1);
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const oc = off.getContext('2d', { willReadFrequently: true });
    if (!oc) return;
    oc.drawImage(img, 0, 0, cols, rows);
    let d = null;
    try { d = oc.getImageData(0, 0, cols, rows).data; } catch (err) { d = null; }
    if (!d) return;
    for (let i = 0; i < ink.length; i++) {
      const p = i * 4;
      const a = d[p + 3] / 255;
      const l = (d[p] * .299 + d[p + 1] * .587 + d[p + 2] * .114) / 255;
      ink[i] = a * l;
    }
  };

  const measure = () => {
    const w = inner.clientWidth;
    if (!w || !img.naturalWidth) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = w;
    cssH = Math.round(w * img.naturalHeight / img.naturalWidth);
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    cv.style.height = cssH + 'px';
    cols = Math.ceil(cssW / CELL);
    rows = Math.ceil(cssH / CELL);
    R = Math.max(110, Math.min(cssH * .95, 190));
    MAX = CELL * 3;
    seeds = new Array(cols * rows);
    seedy = new Array(cols * rows);
    dx = new Float32Array(cols * rows);
    dy = new Float32Array(cols * rows);
    for (let i = 0; i < seeds.length; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      seeds[i] = s - Math.floor(s);
      const t = Math.sin(i * 78.233 + 1.7) * 24634.6345;
      seedy[i] = t - Math.floor(t);
    }
    sample();
    return true;
  };

  /* 指针位置用 css px 记，-1 表示指针不在图上 */
  let tx = -1, ty = -1, cx = -1, cy = -1, energy = 0, tEnergy = 0;
  let raf = 0;

  const paint = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const sx = img.naturalWidth / cssW, sy = img.naturalHeight / cssH;

    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const i = r * cols + q;
        if (ink[i] < .06) continue;

        const x = q * CELL, y = r * CELL;
        const w = Math.min(CELL, cssW - x), h = Math.min(CELL, cssH - y);
        if (w <= 0 || h <= 0) continue;

        /* 整格错位，位移量取整才有「像素被推开」的硬边 */
        const ox = Math.round(dx[i] / CELL) * CELL;
        const oy = Math.round(dy[i] / CELL) * CELL;
        ctx.drawImage(img, x * sx, y * sy, w * sx, h * sy, x + ox, y + oy, w, h);
      }
    }
  };

  /* TRAE 的手感 + 自动恢复：碎片先留在原地，停手后慢慢滑回原位 */
  const step = () => {
    if (cx < 0) { cx = tx; cy = ty; } else { cx += (tx - cx) * .3; cy += (ty - cy) * .3; }
    energy += (tEnergy - energy) * .2;

    if (cx >= 0 && energy > .02) {
      for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) {
          const i = r * cols + q;
          if (ink[i] < .06) continue;

          const mx = q * CELL + CELL / 2 - cx, my = r * CELL + CELL / 2 - cy;
          const d = Math.sqrt(mx * mx + my * my);
          const f = cl(1 - d / R) * energy;
          if (f <= .04) continue;

          const k = f * f * MAX;
          const nx = d < .001 ? 0 : mx / d, ny = d < .001 ? 0 : my / d;
          /* 整格量化后再存，格子只会落在栅格上 */
          const px = Math.round((nx * k + (seeds[i] - .5) * k * .8) / CELL) * CELL;
          const py = Math.round((ny * k * .5 + (seedy[i] - .5) * k * .6) / CELL) * CELL;
          if (Math.abs(px) > Math.abs(dx[i])) dx[i] = px;
          if (Math.abs(py) > Math.abs(dy[i])) dy[i] = py;
        }
      }
    }

    let rest = 0;
    for (let i = 0; i < dx.length; i++) {
      if (dx[i] !== 0 || dy[i] !== 0) {
        dx[i] *= DECAY;
        dy[i] *= DECAY;
        /* 衰减到不足一格时直接归零，避免亚像素残量糊在原地 */
        if (Math.abs(dx[i]) < CELL * .5) dx[i] = 0;
        if (Math.abs(dy[i]) < CELL * .5) dy[i] = 0;
      }
      rest += Math.abs(dx[i]) + Math.abs(dy[i]);
    }
    return rest;
  };

  const loop = () => {
    const rest = step();
    paint();
    const live = tEnergy > .01 || Math.abs(tEnergy - energy) > .01 || rest > 0;
    raf = live ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  /* TRAE 的做法：不做入场表演，静态就是静态，只有指针经过才推开像素 */
  const intro = () => {
    mark.classList.add('awake');
    if (!ready) return;
    tEnergy = energy = 0;
    tx = ty = cx = cy = -1;
    paint();
  };

  const start = () => {
    if (!measure()) return;
    ready = true;
    mark.classList.add('px');
    paint();
    if (window.gsap && window.ScrollTrigger) {
      ScrollTrigger.create({ trigger: mark, start: 'top 92%', once: true, onEnter: intro });
    } else intro();
  };

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start, { once: true });

  mark.addEventListener('pointerenter', () => { cx = cy = -1; });

  mark.addEventListener('pointermove', e => {
    if (!ready) return;
    const b = inner.getBoundingClientRect();
    tx = (e.clientX - b.left) * (cssW / b.width);
    ty = (e.clientY - b.top) * (cssH / b.height);
    tEnergy = 1;
    mark.classList.add('live');
    kick();
  });

  mark.addEventListener('pointerleave', () => {
    mark.classList.remove('live');
    tEnergy = 0;
    kick();
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (measure()) paint(); }, 160);
  });
})();

/* ---------- 9. 品牌片引擎：56 秒，十三镜，纯 Canvas 逐帧绘制 ---------- */
(() => {
  const stage = $('#stage'), cv = $('#mgLayer');
  if (!stage || !cv) return;

  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  /* 镜头表：矿 → 模具 → 高温 → 交到人手里，一句话不打，全靠画 */
  const SHOTS = [
    ['boot', 4], ['pick', 4], ['lamp', 4], ['ore', 4],
    ['mold', 4], ['cast', 4], ['means', 4], ['speak', 4],
    ['ask', 4], ['echo', 4], ['give', 6], ['human', 6],
    ['sign', 4]
  ].map(([k, d]) => ({ k, d, t: 0 }));
  let acc = 0;
  SHOTS.forEach(s => { s.t = acc; acc += s.d; });
  const DUR = acc;
  const TR = .38;

  const fill = $('#trackFill'), knob = $('#trackKnob'), track = $('#track');
  const label = $('#timeLabel'), btnPlay = $('#btnPlay'), btnMute = $('#btnMute');
  const score = $('#brandScore');
  const cta = $('#stageCta'), bigPlay = $('#bigPlay');

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const idxAt = t => { let i = 0; SHOTS.forEach((s, k) => { if (t >= s.t) i = k; }); return i; };

  /* 配乐作为主时钟，Canvas 只负责逐帧绘制 */
  let clock = 0, last = 0, running = false, cur = -1, muted = true;
  const live = document.createElement('p');
  live.className = 'stage-live';
  live.setAttribute('aria-live', 'polite');
  stage.appendChild(live);

  /* ---- 配乐由本地 Pixabay 音频提供，时间轴直接读取 audio.currentTime ---- */
  const play = () => {
    if (!score) return;
    running = true; last = 0;
    if (score.ended) score.currentTime = 0;
    cta?.classList.add('gone');
    btnPlay && (btnPlay.textContent = '❚❚');
    score.muted = muted;
    score.volume = .72;
    score.play().catch(() => { running = false; });
  };
  const pause = () => {
    running = false;
    btnPlay && (btnPlay.textContent = '▶');
    score?.pause();
  };
  const seek = t => {
    clock = Math.max(0, Math.min(DUR - .02, t));
    if (score) score.currentTime = clock;
  };

  bigPlay?.addEventListener('click', play);
  btnPlay?.addEventListener('click', () => running ? pause() : play());
  btnMute?.addEventListener('click', () => {
    muted = !muted;
    if (score) score.muted = muted;
    btnMute.textContent = muted ? '◌' : '◍';
    btnMute.setAttribute('aria-label', muted ? '取消静音' : '静音');
  });

  const seekFromEvent = e => {
    const r = track.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width * DUR);
  };
  if (track) {
    let dragging = false;
    track.addEventListener('pointerdown', e => { dragging = true; track.setPointerCapture(e.pointerId); seekFromEvent(e); });
    track.addEventListener('pointermove', e => { if (dragging) seekFromEvent(e); });
    track.addEventListener('pointerup', e => { dragging = false; track.releasePointerCapture(e.pointerId); });
  }

  const tick = () => {
    const now = performance.now();
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    if (running && score) {
      clock = score.currentTime;
      if (score.ended || clock >= DUR - .02) { clock = DUR - .02; pause(); }
    } else if (running) {
      clock += dt;
      if (clock >= DUR) { clock = DUR - .02; pause(); }
    }
    const p = clock / DUR;
    if (fill) fill.style.transform = `scaleX(${p})`;
    if (knob) knob.style.left = (p * 100) + '%';
    if (label) label.textContent = `${fmt(clock)} / ${fmt(DUR)}`;
    const i = idxAt(clock);
    if (i !== cur) { cur = i; live.textContent = `镜 ${String(i + 1).padStart(2, '0')} / ${SHOTS.length}`; }
    draw(i, clock);
  };

  /* ---- 画布语汇：像素块、栅格、字符、红。全片没有一张外部素材 ---- */
  const RED = '#ff3038', WHITE = '#f4f5f7', BLUE = '#2f80ff', GREEN = '#34d058';
  const HOT = '#ff8a3d', EMBER = '#ffd166';
  const LINE = 'rgba(244,245,247,.42)', DIM = 'rgba(244,245,247,.16)', FAINT = 'rgba(244,245,247,.06)';
  const mono = s => `${s}px "GeistMono", ui-monospace, monospace`;
  const disp = (s, w = 700) => `${w} ${s}px "Bricolage", "Noto Sans CJK SC", system-ui, sans-serif`;
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const eo = x => 1 - Math.pow(1 - cl(x), 3);
  const ei = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const bk = (v, a, b) => cl((v - a) / (b - a));
  const rnd = i => { const x = Math.sin(i * 127.1 + i * i * .0173) * 43758.5453; return x - Math.floor(x); };
  const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const seg = (x1, y1, x2, y2, c = LINE, w = 2) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const dash = (x1, y1, x2, y2, c = DIM, w = 1.3, d = [6, 8]) => { ctx.save(); ctx.setLineDash(d); seg(x1, y1, x2, y2, c, w); ctx.restore(); };
  const txt = (s, x, y, size = 22, c = LINE, font = mono) => { ctx.fillStyle = c; ctx.font = font(size); ctx.fillText(s, x, y); };
  const mid = (s, x, y, size, c, font) => { ctx.save(); ctx.textAlign = 'center'; txt(s, x, y, size, c, font); ctx.restore(); };
  const arc = (x, y, r, a0, a1, c = LINE, w = 2) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); };
  const ring = (x, y, r, c, w = 2) => arc(x, y, r, 0, Math.PI * 2, c, w);
  const disc = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  /* 辉光：同一笔画多层叠出来的热度，画面才不至于太平 */
  const glow = (c, blur, fn, times = 2) => {
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = blur;
    for (let i = 0; i < times; i++) fn();
    ctx.restore();
  };
  const bloomAt = (x, y, r, c, a = .5) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  const vign = (a = .55) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * .18, W / 2, H / 2, W * .72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const scan = (a = .05) => {
    ctx.save(); ctx.globalAlpha = a;
    for (let y = 0; y < H; y += 4) box(0, y, W, 1, '#000');
    ctx.restore();
  };

  const bg = () => {
    box(0, 0, W, H, '#07070a');
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(47,128,255,.07)');
    g.addColorStop(.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(255,48,56,.05)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };

  const grid = (a = 1, step = 80) => {
    ctx.save(); ctx.globalAlpha = a;
    for (let x = 0; x <= W; x += step) seg(x, 0, x, H, FAINT, 1);
    for (let y = 0; y <= H; y += step) seg(0, y, W, y, FAINT, 1);
    ctx.restore();
  };

  const hud = (no, t) => {
    ctx.save(); ctx.globalAlpha = .8;
    const m = 46, l = 22;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      seg(x, y, x + l * sx, y, DIM, 1.4); seg(x, y, x, y + l * sy, DIM, 1.4);
    });
    txt(`${String(no).padStart(2, '0')} / ${SHOTS.length}`, m, H - m - 16, 18, DIM);
    ctx.save(); ctx.textAlign = 'right';
    txt(fmt(t) + ':' + String(Math.floor((t % 1) * 24)).padStart(2, '0'), W - m, H - m - 16, 18, DIM);
    ctx.restore();
    txt('HIGHLIGHT STUDIO', m, m + 30, 18, DIM);
    ctx.restore();
  };

  const CELL = 20;
  const COLS = Math.floor(W / CELL), ROWS = Math.floor(H / CELL);
  const pixels = (sample, p, opt = {}) => {
    const { c = WHITE, jitter = 0, alpha = 1, gap = 3, hot = null } = opt;
    ctx.save(); ctx.globalAlpha = alpha;
    for (let r = 0; r < ROWS; r++) {
      for (let q = 0; q < COLS; q++) {
        const v = sample(q, r);
        if (v <= 0) continue;
        const seed = r * COLS + q;
        const pp = cl((p - rnd(seed) * .42) / .42);
        if (pp <= 0) continue;
        const s = (CELL - gap) * eo(pp) * cl(v);
        const jx = jitter ? (rnd(seed + 7) - .5) * jitter : 0;
        const jy = jitter ? (rnd(seed + 13) - .5) * jitter : 0;
        box(q * CELL + (CELL - s) / 2 + jx, r * CELL + (CELL - s) / 2 + jy, s, s, hot && hot(q, r) ? RED : c);
      }
    }
    ctx.restore();
  };

  const hBars = (cx, cy, w, h, th) => ([
    [cx - w / 2, cy - h / 2, th, h],
    [cx + w / 2 - th, cy - h / 2, th, h],
    [cx - w / 2, cy - th / 2, w, th]
  ]);
  const inH = (x, y, cx, cy, w, h, th) =>
    hBars(cx, cy, w, h, th).some(([bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh);

  const inFigure = (x, y, cx = W / 2, k = 1) => {
    const hy = H * .3, hr = 62 * k;
    if ((x - cx) ** 2 + (y - hy) ** 2 <= hr * hr) return 1;
    const ty = H * .42, bw = (150 + (y - ty) * .34) * k;
    if (y > ty && y < H * .82 && Math.abs(x - cx) < bw / 2) return 1;
    return 0;
  };

  /* Echo 的图标拆成三层判定：蓝盘、白圈与双竖条、右上绿点 */
  const GLYPH = '01<>[]{}/\\|=+*#·';
  const echoAt = (x, y, cx, cy, R) => {
    const d = Math.hypot(x - cx, y - cy);
    if (Math.hypot(x - (cx + R * .8), y - (cy - R * .84)) < R * .17) return GREEN;
    if (Math.abs(y - cy) < R * .3 && (Math.abs(x - (cx - R * .16)) < R * .075 || Math.abs(x - (cx + R * .16)) < R * .075)) return WHITE;
    if (d > R * .84 && d < R * .96) return WHITE;
    if (d <= R * .78) return BLUE;
    return null;
  };

  /* 矿石轮廓：不规则多边形，同一个 seed 每次都长一样 */
  const chunk = (cx, cy, r, seed, c, w = 2, fill = null) => {
    const n = 9;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = r * (.66 + rnd(seed + i * 3) * .5);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .88;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
  };

  /* ---- 新版渲染：信号、Echo、人的尺度、落版四个视觉阶段 ---- */
  function draw(i, t) {
    const s = SHOTS[i], L = t - s.t, u = cl(L / s.d), p = ei(u);
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    box(0, 0, W, H, '#050609');
    grid(.16, 120);

    if (i <= 2) {
      const sweep = W * (.15 + p * .7);
      for (let n = 0; n < 160; n++) {
        const x = W * rnd(n), y = H * rnd(n + 9);
        const d = Math.abs(x - sweep);
        if (d > 220) continue;
        ctx.globalAlpha = cl(1 - d / 220) * (.25 + rnd(n + 2) * .7);
        box(x, y, 3 + rnd(n + 4) * 9, 3 + rnd(n + 5) * 9, n % 11 ? WHITE : RED);
      }
      ctx.globalAlpha = .75;
      seg(sweep, 0, sweep, H, RED, 3);
      ring(cx, cy, 90 + p * 260, 'rgba(47,128,255,.65)', 2);
      for (let n = 0; n < 9; n++) {
        const x = W * (.16 + n * .085), h = 80 + Math.sin(n * 2.1 + t * 6) * 55;
        box(x, cy - h / 2, 28, h, n === 5 ? RED : BLUE);
      }
      mid(i === 0 ? 'SIGNAL FOUND' : i === 1 ? 'KEEP THE MOMENT' : 'LOOK CLOSER', cx, H * .83, 24, WHITE, mono);
    } else if (i <= 5) {
      const R = 210 + p * 80;
      bloomAt(cx, cy, 430, i === 5 ? 'rgba(255,48,56,.3)' : 'rgba(47,128,255,.25)', .8);
      if (i === 3) {
        for (let n = 0; n < 42; n++) {
          const col = n % 7, row = Math.floor(n / 7);
          const x = cx - 210 + col * 70, y = -80 + row * 72 + (1 - p) * 260;
          box(x, y, 54, 54, n % 6 === 0 ? BLUE : WHITE);
        }
      } else if (i === 4) {
        hBars(cx, cy, 420, 330, 64).forEach(([x, y, w, h], n) => {
          const k = cl(p * 1.3 - n * .12);
          glow(n === 2 ? RED : WHITE, 20, () => box(x, y + (1 - k) * (n === 2 ? 100 : 40), w, h * k, n === 2 ? RED : WHITE));
        });
      } else {
        for (let n = 0; n < 90; n++) {
          const a = rnd(n) * Math.PI * 2, rr = R * (.3 + rnd(n + 4) * .8);
          disc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7, 3 + rnd(n + 7) * 7, n % 5 ? HOT : RED);
        }
        glow(RED, 34, () => ring(cx, cy, R, RED, 7));
      }
      mid(i === 3 ? 'RAW MATERIAL' : i === 4 ? 'FORM FOLLOWS INTENT' : 'HEAT CHANGES SHAPE', cx, H * .83, 24, i === 5 ? RED : WHITE, mono);
    } else if (i <= 9) {
      const R = 205;
      disc(cx, cy, R, BLUE);
      ring(cx, cy, R + 18, WHITE, 4);
      box(cx - 29, cy - 58, 21, 116, WHITE);
      box(cx + 8, cy - 58, 21, 116, WHITE);
      if (i === 7) {
        for (let n = 0; n < 12; n++) {
          const x = W * .15 + (n % 4) * 280, y = H * .2 + Math.floor(n / 4) * 155;
          ctx.globalAlpha = .22 + p * .55;
          ctx.strokeStyle = n === 6 ? RED : WHITE; ctx.lineWidth = 2;
          ctx.strokeRect(x, y, 190, 94);
        }
      }
      if (i === 8) {
        const x = cx - 320 + p * 320, y = cy - 240 + p * 240;
        seg(x, y, x + 42, y + 56, WHITE, 6);
        seg(x + 42, y + 56, x + 60, y + 32, WHITE, 6);
        ring(cx, cy, R + p * 100, RED, 3);
      }
      if (i === 9) {
        for (let n = 0; n < 24; n++) {
          const h = 20 + (Math.sin(n * 1.8 + t * 9) * .5 + .5) * 130;
          box(cx - 165 + n * 14, cy - h / 2, 7, h, n % 4 === 0 ? RED : WHITE);
        }
        disc(cx + 168, cy - 176, 14, GREEN);
      }
      mid(i === 6 ? 'TECH IS THE MEDIUM' : i === 7 ? 'DIFFERENT STATES' : i === 8 ? 'DOES IT FEEL EASY?' : 'ECHO / RESPONSE', cx, H * .83, 24, WHITE, mono);
    } else if (i <= 11) {
      const gap = 440 - p * 220;
      [cx - gap / 2, cx + gap / 2].forEach((x, n) => {
        ctx.globalAlpha = .85;
        ring(x, cy - 150, 38, n ? WHITE : BLUE, 3);
        seg(x, cy - 110, x, cy + 125, n ? WHITE : BLUE, 8);
        seg(x - 70, cy - 10, x + 70, cy - 10, n ? WHITE : BLUE, 8);
        seg(x, cy + 125, x - 58, cy + 220, n ? WHITE : BLUE, 8);
        seg(x, cy + 125, x + 58, cy + 220, n ? WHITE : BLUE, 8);
      });
      glow(RED, 24, () => seg(cx - gap / 2 + 80, cy, cx + gap / 2 - 80, cy, RED, 4));
      mid(i === 10 ? 'PUT IT BACK IN THE HAND' : 'HUMANITY IS THE NORTH STAR', cx, H * .83, 24, i === 10 ? EMBER : WHITE, mono);
    } else {
      const k = ei(bk(L, .1, 1.8));
      hBars(cx, cy - 60, 320 + k * 80, 270 + k * 20, 62).forEach(([x, y, w, h], n) => box(x, y, w, h, n === 2 ? RED : WHITE));
      mid('HIGHLIGHT', cx, H * .79, 52, WHITE, disp);
      mid('STUDIO / 2026', cx, H * .87, 18, RED, mono);
      ring(cx, cy - 60, 250 + Math.sin(t * 5) * 10, 'rgba(47,128,255,.55)', 2);
    }

    ctx.globalAlpha = 1;
    vign(.48); scan(.02);
    hud(i + 1, t);
  }

  /* 出场的往前顶出画，进场的从右侧滑进来，交叠里两者同时在动 */
  const shot = (i, L, D, w, dir) => {
    const k = SHOTS[i].k, e = ei(w);
    ctx.save();
    if (dir) {
      ctx.globalAlpha = dir < 0 ? 1 - e : e;
      ctx.translate(W / 2, H / 2);
      const sc = dir < 0 ? 1 + e * .14 : .9 + e * .1;
      ctx.scale(sc, sc);
      ctx.translate(dir < 0 ? -e * 210 : (1 - e) * 240, 0);
      ctx.translate(-W / 2, -H / 2);
    }
    (SC[k] || SC.boot)(Math.max(0, L), D, cl(Math.max(0, L) / D));
    ctx.restore();
  };

  /* 缝：一道热线扫过接点，顺手带一层辉 */
  const seam = w => {
    const x = ei(w) * W;
    ctx.save();
    ctx.globalAlpha = Math.sin(cl(w) * Math.PI);
    bloomAt(x, H / 2, 300, 'rgba(255,138,61,.55)', .6);
    glow(RED, 30, () => box(x - 2, 0, 4, H, RED));
    box(x - 1.5, 0, 3, H, WHITE);
    ctx.restore();
  };

  const SC = {};

  /* 01 上电：噪点满屏亮起，一道红列横扫，栅格从雾里显形 */
  SC.boot = (L, D, u) => {
    grid(bk(L, .05, .8));
    const p = bk(L, .05, 1.1), sx = bk(L, .4, 1.6);
    pixels((q, r) => (rnd(r * COLS + q) > .52 ? .45 + rnd(q * 31 + r) * .55 : 0), p, {
      c: 'rgba(244,245,247,.42)', alpha: .9, hot: q => Math.abs(q - sx * COLS) < 1.6
    });
    if (sx > 0 && sx < 1) {
      bloomAt(sx * W, H / 2, 340, 'rgba(255,48,56,.4)', .7);
      glow(RED, 24, () => box(sx * W - 1.5, 0, 3, H, RED));
    }
    const a = bk(L, 1.3, 2.0);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a * .9;
      bloomAt(W / 2, H / 2, 420, 'rgba(47,128,255,.3)', .5);
      ring(W / 2, H / 2, 60 + (1 - a) * 160, 'rgba(244,245,247,.5)', 2);
      ctx.restore();
    }
    void u;
  };

  /* 03 打灯：暗处本来就有东西，光扫过才被看见 */
  SC.lamp = (L, D, u) => {
    const sw = bk(L, .1, 1.5);
    const lx = W * (.12 + sw * .78), ly = H * .5;
    const R = 300;
    const objs = [];
    for (let i = 0; i < 9; i++) objs.push([W * (.14 + i * .09), H * (.34 + rnd(i) * .34), 30 + rnd(i + 5) * 34, i]);
    objs.forEach(([x, y, r, i]) => {
      const d = Math.abs(x - lx);
      const lit = cl(1 - d / R);
      ctx.save();
      ctx.globalAlpha = .2 + lit * .8;
      chunk(x, y, r, i * 4, lit > .3 ? WHITE : DIM, 1.6, lit > .3 ? `rgba(244,245,247,${.06 + lit * .16})` : null);
      if (lit > .5) glow(EMBER, 18 * lit, () => chunk(x, y, r, i * 4, EMBER, 1.4));
      ctx.restore();
    });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cone = ctx.createLinearGradient(lx, 0, lx, H);
    void cone;
    bloomAt(lx, ly, 460, 'rgba(255,209,102,.34)', .85);
    ctx.restore();
    dash(lx, 0, lx, H, 'rgba(255,209,102,.4)', 1.2, [4, 10]);
    grid(.5);
    void u;
  };

  /* 04 矿：一块粗料，扫描线一层层剖进去 */
  SC.ore = (L, D, u) => {
    grid(.5);
    const cx = W / 2, cy = H / 2;
    const p = eo(bk(L, .05, .9));
    const r = 210 * p;
    ctx.save();
    ctx.globalAlpha = p;
    chunk(cx, cy, r, 3, 'rgba(244,245,247,.55)', 2.4, 'rgba(47,128,255,.08)');
    for (let i = 1; i < 5; i++) {
      ctx.globalAlpha = p * (.5 - i * .08);
      chunk(cx, cy, r * (1 - i * .16), 3 + i * 7, LINE, 1.2);
    }
    ctx.restore();
    const cut = bk(L, .8, 2.0);
    if (cut > 0) {
      const y = cy - r + cut * r * 2;
      glow(RED, 20, () => seg(cx - r * 1.3, y, cx + r * 1.3, y, RED, 2));
      for (let i = 0; i < 26; i++) {
        const a = rnd(i) * Math.PI * 2, rr = r * (.2 + rnd(i + 9) * .8);
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .88;
        if (py > y) continue;
        box(px - 2, py - 2, 4, 4, i % 4 ? 'rgba(244,245,247,.6)' : EMBER);
      }
    }
    void u;
  };

  /* 05 模具：栅格收成一副规整的框，粗料被放进去对位 */
  SC.mold = (L, D, u) => {
    grid(.7, 80 - eo(bk(L, 0, 1.2)) * 40);
    const cx = W / 2, cy = H / 2;
    const p = ei(bk(L, .1, 1.2));
    const mw = 420, mh = 330;
    ctx.save();
    ctx.globalAlpha = p;
    for (let i = 0; i < 3; i++) {
      const k = 1 + i * .09;
      ctx.globalAlpha = p * (.9 - i * .28);
      ctx.strokeStyle = i ? DIM : 'rgba(244,245,247,.7)';
      ctx.lineWidth = i ? 1.2 : 2.4;
      ctx.strokeRect(cx - mw * k / 2, cy - mh * k / 2, mw * k, mh * k);
    }
    ctx.restore();
    const fit = ei(bk(L, .9, 2.0));
    const r = 210 - fit * 40;
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.beginPath();
    ctx.rect(cx - mw / 2, cy - mh / 2, mw, mh);
    ctx.save(); ctx.clip();
    chunk(cx, cy - (1 - fit) * 260, r, 3, WHITE, 2.2, 'rgba(244,245,247,.1)');
    ctx.restore();
    ctx.restore();
    if (fit > .8) {
      const k = bk(L, 1.9, 2.1);
      [[cx - mw / 2, cy - mh / 2], [cx + mw / 2, cy - mh / 2], [cx - mw / 2, cy + mh / 2], [cx + mw / 2, cy + mh / 2]].forEach(([x, y], i) => {
        ctx.save(); ctx.globalAlpha = k;
        disc(x, y, 5, RED); bloomAt(x, y, 70, 'rgba(255,48,56,.5)', k);
        ctx.restore(); void i;
      });
    }
    void u;
  };

  /* 02 挑那几秒：一整条等价的帧，只有一格被留下 */
  SC.pick = (L, D, u) => {
    grid(.6);
    const n = 22, gw = W / (n + 6), y = H / 2, hh = 132;
    const sel = 13;
    const scanx = bk(L, .15, 1.05) * n;
    const lock = bk(L, 1.05, 1.5), drop = bk(L, 1.5, 2.4);
    for (let i = 0; i < n; i++) {
      const x = gw * 3 + i * gw;
      const isSel = i === sel;
      const passed = scanx > i;
      const fall = isSel ? 0 : ei(drop) * (140 + rnd(i) * 220);
      const a = isSel ? 1 : 1 - ei(drop) * .92;
      ctx.save(); ctx.globalAlpha = a;
      const h = hh * (isSel ? 1 + lock * .5 : .82);
      box(x, y - h / 2 + fall, gw - 8, h, passed ? 'rgba(244,245,247,.13)' : 'rgba(244,245,247,.05)');
      seg(x, y - h / 2 + fall, x, y + h / 2 + fall, isSel ? WHITE : DIM, isSel ? 2 : 1);
      ctx.restore();
    }
    const sx = gw * 3 + sel * gw;
    if (lock > 0) {
      const h = hh * (1 + lock * .5);
      bloomAt(sx + gw / 2, y, 240 * lock, 'rgba(255,209,102,.45)', .8);
      glow(EMBER, 22 * lock, () => box(sx, y - h / 2, gw - 8, h, 'rgba(255,209,102,.9)'));
      seg(sx - 14, y - h / 2 - 14, sx + gw + 6, y - h / 2 - 14, RED, 2);
      seg(sx - 14, y + h / 2 + 14, sx + gw + 6, y + h / 2 + 14, RED, 2);
    }
    if (scanx < n) {
      const x = gw * 3 + scanx * gw;
      seg(x, y - 190, x, y + 190, RED, 2);
    }
    void u;
  };

  /* 06 高温重塑：料在框里烧红，被压成一个 H */
  SC.cast = (L, D, u) => {
    grid(.4);
    const cx = W / 2, cy = H / 2;
    const heat = bk(L, .1, 1.2), form = ei(bk(L, .9, 2.1)), cool = bk(L, 2.1, 2.8);
    const hw = 300, hh = 260, th = 74;
    ctx.save();
    bloomAt(cx, cy, 420 * heat * (1 - cool * .55), `rgba(255,138,61,${.4 * heat})`, .9);
    ctx.restore();
    const mixC = (a, b, k) => {
      const pa = [255, 138, 61], pb = [244, 245, 247];
      const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
      void a; void b;
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    };
    const col = mixC(HOT, WHITE, cool);
    ctx.save();
    ctx.globalAlpha = .95;
    hBars(cx, cy, hw, hh, th).forEach(([x, y, w, h], i) => {
      const k = ei(cl((form - i * .12) / .7));
      const bx = x + (1 - k) * (i === 2 ? 0 : (i ? 90 : -90));
      const by = y + (1 - k) * (i === 2 ? 110 : 0);
      const bw = i === 2 ? w * k : w;
      const bh = i === 2 ? h : h * k;
      if (k <= 0) return;
      glow(col, 26 * (1 - cool * .7), () => box(bx, by, bw, bh, col));
    });
    ctx.restore();
    if (form > .1 && form < 1) {
      for (let i = 0; i < 30; i++) {
        const a = rnd(i) * Math.PI * 2, rr = 200 + rnd(i + 3) * 220 * form;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .7;
        ctx.globalAlpha = (1 - form) * .8;
        box(px, py, 3, 3, EMBER);
      }
      ctx.globalAlpha = 1;
    }
    if (cool > 0) {
      ctx.save(); ctx.globalAlpha = cool * .6;
      ctx.strokeRect(cx - hw / 2 - 22, cy - hh / 2 - 22, hw + 44, hh + 44);
      ctx.restore();
    }
    void u;
  };

  /* 07 手段与目的：一排零件推着一个人形走，人形始终在最前 */
  SC.means = (L, D, u) => {
    grid(.55);
    const p = ei(bk(L, .1, 1.4)), lock = bk(L, 1.3, 2.2);
    const gy = H * .62;
    for (let i = 0; i < 7; i++) {
      const x = W * .1 + i * 96 + p * 120;
      const a = cl(1 - i * .1) * (1 - lock * .5);
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = DIM; ctx.lineWidth = 1.6;
      ctx.strokeRect(x - 30, gy - 30, 60, 60);
      dash(x + 30, gy, x + 66, gy, DIM, 1.2, [4, 6]);
      ctx.restore();
    }
    const fx = W * .1 + 7 * 96 + p * 120 + 120;
    ctx.save();
    ctx.globalAlpha = .95;
    ctx.translate(fx - W / 2, 0);
    pixels((q, r) => inFigure(q * CELL + CELL / 2, r * CELL + CELL / 2, W / 2, .7), p, {
      c: 'rgba(244,245,247,.85)', gap: 4, alpha: .9,
      hot: (q, r) => rnd(r * COLS + q) > .93
    });
    ctx.restore();
    if (lock > 0) {
      ctx.save(); ctx.globalAlpha = lock;
      bloomAt(fx, H * .5, 300, 'rgba(47,128,255,.3)', .7);
      ctx.restore();
    }
    void u;
  };

  /* 08 说人话：密集的机读字符逐格塌成一句能听懂的呼吸 */
  SC.speak = (L, D, u) => {
    grid(.5);
    const p = bk(L, .05, 1.4), calm = ei(bk(L, 1.0, 2.2));
    ctx.save();
    ctx.textAlign = 'center';
    const rows = 9, cols = 34;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const seed = r * cols + q;
        const t0 = rnd(seed) * .5;
        const on = p > t0;
        if (!on) continue;
        const x0 = W * .1 + q * (W * .8 / cols);
        const y0 = H * .28 + r * 52;
        const mergeY = H / 2;
        const x = x0 + (W / 2 - x0) * calm * (r === 4 ? .0 : .12);
        const y = y0 + (mergeY - y0) * calm * (r === 4 ? 0 : 1);
        const a = r === 4 ? 1 : (1 - calm) * .5;
        if (a <= .02) continue;
        ctx.globalAlpha = a;
        const ch = GLYPH[Math.floor(rnd(seed + Math.floor(L * 8)) * GLYPH.length)];
        txt(ch, x, y, 22, r === 4 ? WHITE : DIM);
      }
    }
    ctx.restore();
    if (calm > .3) {
      const w = 520 * ei(bk(calm, .3, 1));
      ctx.save(); ctx.globalAlpha = calm;
      bloomAt(W / 2, H / 2 - 8, 320, 'rgba(47,128,255,.26)', .7);
      glow(WHITE, 14, () => seg(W / 2 - w / 2, H / 2 + 34, W / 2 + w / 2, H / 2 + 34, 'rgba(244,245,247,.7)', 2));
      ctx.restore();
    }
    void u;
  };

  /* 09 先问一句：一个人形站定，一圈问号似的探针从他身上发出去 */
  SC.ask = (L, D, u) => {
    grid(.5);
    const cx = W / 2, cy = H * .52;
    const p = ei(bk(L, .05, .9));
    ctx.save();
    ctx.globalAlpha = p * .9;
    pixels((q, r) => inFigure(q * CELL + CELL / 2, r * CELL + CELL / 2, cx, .82), p, {
      c: 'rgba(244,245,247,.5)', gap: 5, alpha: .85
    });
    ctx.restore();
    const wave = bk(L, .7, 2.2);
    for (let i = 0; i < 3; i++) {
      const k = cl(wave * 1.4 - i * .28);
      if (k <= 0) continue;
      ctx.save();
      ctx.globalAlpha = (1 - k) * .8;
      ring(cx, cy, 90 + k * 420, i ? DIM : 'rgba(47,128,255,.6)', i ? 1.2 : 2);
      ctx.restore();
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + L * .4;
      const rr = 120 + wave * 300;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .62;
      ctx.save(); ctx.globalAlpha = wave * (1 - wave) * 3.4;
      disc(px, py, 4, i % 3 ? WHITE : BLUE);
      dash(cx, cy, px, py, 'rgba(244,245,247,.12)', 1, [3, 9]);
      ctx.restore();
    }
    bloomAt(cx, cy, 260, 'rgba(47,128,255,.22)', .6);
    void u;
  };

  /* 10 字符拼出 Echo：满屏字符抖着收敛，落成那个图标 */
  SC.echo = (L, D, u) => {
    grid(.45);
    const cx = W / 2, cy = H * .5, R = 250;
    const G = 24;
    const settle = ei(bk(L, .1, 1.7)), hold = bk(L, 1.7, 2.4), off = bk(L, 2.5, 2.8);
    ctx.save();
    ctx.textAlign = 'center';
    for (let y = cy - R * 1.1; y < cy + R * 1.1; y += G) {
      for (let x = cx - R * 1.1; x < cx + R * 1.1; x += G) {
        const c = echoAt(x, y, cx, cy, R);
        if (!c) continue;
        const seed = Math.floor(x) * 7 + Math.floor(y) * 13;
        const j = (1 - settle) * 130;
        const dx = (rnd(seed) - .5) * j, dy = (rnd(seed + 5) - .5) * j;
        const a = (.25 + settle * .75) * (1 - off);
        ctx.globalAlpha = a;
        const ch = settle > .96 ? (c === BLUE ? '0' : '1') : GLYPH[Math.floor(rnd(seed + Math.floor(L * 14)) * GLYPH.length)];
        txt(ch, x + dx, y + dy, 19, c);
      }
    }
    ctx.restore();
    if (hold > 0) {
      ctx.save(); ctx.globalAlpha = hold * (1 - off);
      bloomAt(cx, cy, 380, 'rgba(47,128,255,.32)', .8);
      bloomAt(cx + R * .8, cy - R * .84, 90, 'rgba(52,208,88,.6)', hold);
      ring(cx, cy, R * .9 + hold * 16, 'rgba(244,245,247,.24)', 1.4);
      ctx.restore();
    }
    void u;
  };

  /* 11 归还于人：光团从机器一侧交到手里，栅格向人聚拢 */
  SC.give = (L, D, u) => {
    grid(.5);
    const y = H * .54;
    const mx = W * .24, hx = W * .74;
    const p = ei(bk(L, .15, 1.5)), land = bk(L, 1.4, 2.2);
    ctx.save();
    ctx.globalAlpha = .8 - land * .4;
    ctx.strokeStyle = DIM; ctx.lineWidth = 1.8;
    ctx.strokeRect(mx - 74, y - 74, 148, 148);
    for (let i = 0; i < 4; i++) seg(mx - 74, y - 74 + i * 49, mx + 74, y - 74 + i * 49, FAINT, 1);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .45 + land * .55;
    pixels((q, r) => inFigure(q * CELL + CELL / 2, r * CELL + CELL / 2, hx, .62), bk(L, .1, 1), {
      c: 'rgba(244,245,247,.7)', gap: 5, alpha: .9
    });
    ctx.restore();
    const px = mx + (hx - mx) * p, py = y - Math.sin(p * Math.PI) * 130;
    bloomAt(px, py, 200, 'rgba(255,209,102,.5)', .9);
    glow(EMBER, 26, () => disc(px, py, 16 + land * 8, EMBER));
    dash(mx, y, px, py, 'rgba(255,209,102,.3)', 1.2, [5, 10]);
    if (land > .5) {
      ctx.save(); ctx.globalAlpha = (land - .5) * 2;
      ring(hx, y - 20, 120 + land * 70, 'rgba(255,209,102,.35)', 1.6);
      ctx.restore();
    }
    void u;
  };

  /* 12 人在正中：两个人形对面站，中间的技术缩成一条细线 */
  SC.human = (L, D, u) => {
    grid(.55);
    const p = ei(bk(L, .05, 1.1)), close = ei(bk(L, .9, 2.2));
    const gap = 460 - close * 250;
    const lx = W / 2 - gap / 2, rx = W / 2 + gap / 2;
    [lx, rx].forEach((x, i) => {
      ctx.save();
      ctx.globalAlpha = .9;
      pixels((q, r) => inFigure(q * CELL + CELL / 2, r * CELL + CELL / 2, x, .58), p, {
        c: i ? 'rgba(244,245,247,.8)' : 'rgba(47,128,255,.75)', gap: 5, alpha: .9
      });
      ctx.restore();
    });
    const w = gap - 150;
    if (w > 0) {
      ctx.save();
      ctx.globalAlpha = .9;
      glow(RED, 18, () => seg(W / 2 - w / 2, H * .52, W / 2 + w / 2, H * .52, RED, 2 + close * 2));
      ctx.restore();
    }
    if (close > .7) {
      const k = bk(close, .7, 1);
      bloomAt(W / 2, H * .52, 300 * k, 'rgba(255,48,56,.3)', k * .8);
    }
    void u;
  };

  /* 13 落款：所有像素向中线收，H 立住，标记浮出来 */
  SC.sign = (L, D, u) => {
    grid(.6);
    const cx = W / 2, cy = H * .48;
    const p = ei(bk(L, .05, 1.3));
    const hw = 300, hh = 260, th = 74;
    pixels((q, r) => inH(q * CELL + CELL / 2, r * CELL + CELL / 2, cx, cy, hw, hh, th) ? 1 : 0, p, {
      c: WHITE, gap: 3, jitter: (1 - p) * 40, alpha: .95,
      hot: (q, r) => rnd(r * COLS + q) > .9
    });
    if (p > .5) {
      ctx.save(); ctx.globalAlpha = (p - .5) * 2;
      bloomAt(cx, cy, 420, 'rgba(47,128,255,.22)', .6);
      ctx.restore();
    }
    const w = bk(L, 1.3, 2.1);
    if (w > 0) {
      ctx.save(); ctx.globalAlpha = w;
      mid('HIGHLIGHT STUDIO', cx, H * .84, 44, WHITE, disp);
      const lw = 420 * ei(w);
      seg(cx - lw / 2, H * .88, cx + lw / 2, H * .88, RED, 2);
      ctx.restore();
    }
    const out = bk(L, 2.3, 3.0);
    if (out > 0) {
      ctx.save();
      ctx.globalAlpha = out * .9;
      for (let i = 0; i < 40; i++) {
        const a = rnd(i) * Math.PI * 2, rr = eo(out) * (300 + rnd(i + 4) * 520);
        box(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7, 4, 4, i % 5 ? 'rgba(244,245,247,.5)' : RED);
      }
      ctx.restore();
    }
    void u;
  };

  if (window.gsap) gsap.ticker.add(tick); else setInterval(tick, 1000 / 60);
  tick();

  /* 滚到影片：静音自动起播，绕过自动播放限制，点一下即出声 */
  score?.addEventListener('ended', () => { clock = DUR - .02; pause(); });

  if (window.ScrollTrigger && !reduced) {
    ScrollTrigger.create({
      trigger: stage, start: 'top 62%', end: 'bottom 30%',
      onEnter: () => { if (!running) play(); },
      onLeave: () => pause(),
      onLeaveBack: () => pause(),
      onEnterBack: () => play()
    });
  }
})();

/* ---------- 10. 加入我们页：开场三句 + 岗位逐条被"翻到" ---------- */
(() => {
  const jhero = $('.jhero');
  if (!jhero) return;

  if (window.gsap) {
    const lines = $$('.jhero h1 .ln > span');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.jhero .eyebrow', { autoAlpha: 0, x: -14, duration: .8 }, .1);
    if (lines.length) {
      gsap.set(lines, { yPercent: 110, rotate: 1.2, transformOrigin: 'left bottom' });
      /* 三句话是一句一句说出来的，所以间隔比标题该有的更长一点 */
      tl.to(lines, { yPercent: 0, rotate: 0, duration: 1.25, stagger: .16 }, .3);
    }
    tl.from(['.jhero-sub', '.jhero .btn', '.jhero .scroll-hint'],
      { autoAlpha: 0, y: 22, duration: .9, stagger: .1 }, .95);
  }

  const roles = $$('.role');
  if (reduced || !window.gsap || !window.ScrollTrigger) { roles.forEach(r => r.classList.add('in')); return; }

  roles.forEach(r => {
    const no = $('.role-no', r), h3 = $('h3', r), body = $('.role-body', r) || $('.role-body2', r);
    const chips = $$('.role-tools span', r), line = $('.role-line', r);
    /* 顺序：先划出这一行的边界，再落编号与岗位名，最后才是说明和工具链 */
    const tl = gsap.timeline({ scrollTrigger: { trigger: r, start: 'top 82%' } });
    if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1.05, ease: 'expo.out' }, 0);
    if (no) tl.from(no, { autoAlpha: 0, x: -16, duration: .6 }, .06);
    if (h3) tl.from(h3, { yPercent: 26, autoAlpha: 0, duration: 1, ease: 'expo.out' }, .1);
    if (body) tl.from(body, { autoAlpha: 0, y: 18, duration: .75 }, .22);
    if (chips.length) tl.from(chips, { autoAlpha: 0, y: 12, duration: .5, stagger: .05 }, .3);

    /* 悬停：不动整行（grid 会抖），只把编号和标题往里推，工具标签依次亮边
       —— 像手指按住这一条，内容朝你转过来一点 */
    const hov = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .to([no, h3].filter(Boolean), { x: 12, duration: .45 }, 0);
    if (chips.length) hov.to(chips, { borderColor: 'var(--line-2)', color: 'var(--ink)', duration: .35, stagger: .04 }, 0);
    if (line) hov.to(line, { scaleY: 2, duration: .35 }, 0);

    r.addEventListener('pointerenter', () => hov.timeScale(1).play());
    r.addEventListener('pointerleave', () => hov.timeScale(1.5).reverse());
  });

  /* 联系卡的进场在 §6 里已按 .contact-grid 统一处理，这里不再重复 */
})();
