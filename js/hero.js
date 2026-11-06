// 00 品牌：粒子穹顶 + 流星 + 标语从屏外滚入、到中心组装
//
// 几何：正圆取 120°（半圆的 2/3），R = W/√3，圆心落在屏幕底边下方 R/2，
// 于是弦正好是屏幕底边，弧的两端就是左下角与右下角。
//
// 密度：只有「离圆心多远」一个参数。圆心最疏最暗，越靠弧线越密越亮，
// 出界后一路衰减到零——边界的「清楚」完全由粒子密度堆出来，
// 不铺任何填充色，所以没有一层灰白的形状，也没有一条硬坎。
//
// 每帧只画点：按亮度分桶，每桶一次 path fill；滚动只改一个 progress 值。

const A0 = Math.PI / 6;                 // 弧的右端 30°
const SPAN = Math.PI * 2 / 3;           // 120° = 半圆的 2/3
const FEATHER = 0.22;                   // 界外羽化带宽（以内半径为 1），要窄，边界才清楚
const NB = 10;                          // 亮度分桶数

export function initHero({ isStill, getVh }) {
  const hero = document.getElementById('brand');
  const stage = hero && hero.querySelector('.hero-stage');
  const canvas = document.getElementById('heroFx');
  if (!hero || !stage || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const mark = document.getElementById('heroMark');
  const word = document.getElementById('heroWord');
  const sub = document.getElementById('heroSub');
  const hint = hero.querySelector('.hero-hint');
  const chars = word ? [...word.querySelectorAll('.hw-c')] : [];

  let W = 0, H = 0, cx = 0, cy = 0, R = 0, dpr = 1;
  let wordCX = 0, wordCY = 0, F = 100;
  let dots = [], meteors = [];
  let progress = 0, smoothP = 0, rot = 0;
  let visible = true, running = false, raf = 0, last = 0, rt = 0;
  const buckets = Array.from({ length: NB }, () => []);
  const bigBuckets = Array.from({ length: NB }, () => []);

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = q => q * q * (3 - 2 * q);

  // logo 与标语周围不再单独压暗：那会在穹顶正中间压出一大片发黑的空档，
  // 层次交给密度曲线自己完成
  const dimAt = () => 1;

  function build() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    R = W / Math.sqrt(3);
    cx = W / 2;
    cy = H + R / 2;

    if (word) {
      F = parseFloat(getComputedStyle(word).fontSize) || 100;
      const wr = word.getBoundingClientRect();
      wordCX = wr.left + wr.width / 2 - rect.left;
      wordCY = wr.top + wr.height / 2 - rect.top;
    }

    const small = W < 700;
    // 候选点数按穹顶面积给，宽屏和窄屏的颗粒密度才是同一个观感
    const N = Math.round(Math.min(30000, Math.max(2400, R * R * 0.038)));
    dots = [];

    for (let i = 0; i < N; i++) {
      const ang = A0 + Math.random() * SPAN;
      const t = Math.sqrt(Math.random()) * (1 + FEATHER);
      const rr = R * t;
      const x = cx + rr * Math.cos(ang);
      const y = cy - rr * Math.sin(ang);
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;

      // 两端按角度渐隐，场的边界不是一条硬直线
      const edge = Math.min(clamp((ang - A0) / 0.14), clamp((A0 + SPAN - ang) / 0.14));
      if (edge <= 0.02) continue;

      const outside = t > 1;
      const c = Math.min(1, t);
      const fade = outside ? 1 - (t - 1) / FEATHER : 1;

      // 密度：圆心 0.10 → 弧线 0.94。屏幕只看到半径 0.65 以外那圈，
      // 所以曲线用三次方，把变化摊在真正看得见的那段里，往里一路匀匀地变疏
      // 密度：圆心 0.40 → 弧线 0.94。屏幕上看得到的「圆里面」其实只是半径 0.5 以外的一段，
      // 所以内圈不能压太低，否则半圆正中会空出一大片
      const dens = outside ? 0.22 * Math.pow(fade, 3) : 0.4 + 0.54 * Math.pow(c, 2);
      const kept = Math.random() < dens;

      // 没被选中的位置留一部分极淡的尘，免得出片状的空。界外一个都不留——
      // 半圆外面只要还剩浮尘，轮廓立刻被糊掉
      if (!kept && (outside || Math.random() > 0.24)) continue;
      const dust = !kept;

      // 亮度：圆内 0.10 → 弧线 0.60。c^7 那一项让最外一圈明显亮一档，
      // 但它跟着粒子一起转，所以是「越靠边越亮」，不是画上去的一圈死环
      let al;
      if (dust) al = rand(0.04, 0.09);
      else if (outside) al = 0.4 * Math.pow(fade, 1.4);
      else al = 0.1 + 0.24 * Math.pow(c, 1.5) + 0.26 * Math.pow(c, 7);
      al *= edge * dimAt(x, y) * rand(0.86, 1.12);
      al = Math.max(al, outside ? 0.01 : 0.03);

      dots.push({
        a: ang,
        r: t,
        s: dust
          ? 0.26 + 0.22 * Math.random()
          : (0.38 + 1.2 * Math.pow(Math.random(), 2.6)) * (0.82 + 0.46 * Math.pow(c, 2.4)),
        al,
      });
    }

    meteors = [];
    const n = small ? 3 : 6;
    for (let i = 0; i < n; i++) meteors.push(newMeteor(true));
  }

  function newMeteor(init = false) {
    const ang = rand(Math.PI * 0.6, Math.PI * 0.76);
    const sp = rand(240, 460);
    return {
      x: rand(-0.1 * W, 1.1 * W),
      y: init ? rand(-0.5 * H, 0.6 * H) : rand(-0.34 * H, -24),
      vx: Math.cos(ang) * sp * 0.52,
      vy: Math.sin(ang) * sp,
      len: rand(0.5, 1.4),
    };
  }

  function paint(dt) {
    ctx.clearRect(0, 0, W, H);

    for (let b = 0; b < NB; b++) buckets[b].length = 0;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      // 整个场一起绕圆心缓慢流转，跑到右端由左端补回，穹顶始终是满的
      let a = d.a - rot;
      a = A0 + (((a - A0) % SPAN) + SPAN) % SPAN;
      const rr = R * d.r;
      const x = cx + rr * Math.cos(a);
      const y = cy - rr * Math.sin(a);
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const b = Math.min(NB - 1, (d.al * NB) | 0);
      buckets[b].push(x, y, d.s);
    }

    // 细点直接画成方点（一个多设备像素以下，和圆点看不出差别），省掉大量 arc 路径
    for (let b = 0; b < NB; b++) bigBuckets[b].length = 0;
    for (let b = 0; b < NB; b++) {
      const arr = buckets[b];
      if (!arr.length) continue;
      const bb = bigBuckets[b];
      ctx.fillStyle = `rgba(255,255,255,${(((b + 0.5) / NB) * 0.95).toFixed(3)})`;
      ctx.beginPath();
      for (let j = 0; j < arr.length; j += 3) {
        const sz = arr[j + 2];
        if (sz * dpr > 1.3) { bb.push(arr[j], arr[j + 1], sz); continue; }
        ctx.rect(arr[j] - sz, arr[j + 1] - sz, sz * 2, sz * 2);
      }
      ctx.fill();
    }
    for (let b = 0; b < NB; b++) {
      const bb = bigBuckets[b];
      if (!bb.length) continue;
      ctx.fillStyle = `rgba(255,255,255,${(((b + 0.5) / NB) * 0.95).toFixed(3)})`;
      ctx.beginPath();
      for (let j = 0; j < bb.length; j += 3) {
        ctx.moveTo(bb[j] + bb[j + 2], bb[j + 1]);
        ctx.arc(bb[j], bb[j + 1], bb[j + 2], 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // 轻微拖尾：沿弧往回抽样画一小段，只是让流动有方向感；
    // 只在真正滚动时出现，静止时不留任何沿弧的连续笔画
    if (!isStill() && smoothP > 0.02) {
      const da = 0.01;
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 26) {
        const d = dots[i];
        if (d.r < 0.9 || d.r > 1.1) continue;
        const a = A0 + (((d.a - rot - A0) % SPAN) + SPAN) % SPAN;
        const rr = R * d.r;
        ctx.moveTo(cx + rr * Math.cos(a + da), cy - rr * Math.sin(a + da));
        ctx.arc(cx, cy, rr, -(a + da), -a);
      }
      ctx.stroke();
    }

    if (!isStill()) drawMeteors(dt);
  }

  function drawMeteors(dt) {
    for (let i = 0; i < meteors.length; i++) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // 碰到穹顶就消失（接触即重生，下一颗从头落下）
      const dx = m.x - cx, dy = m.y - cy;
      if (dx * dx + dy * dy <= R * R * 1.002) { meteors[i] = newMeteor(); continue; }

      const tx = m.x - m.vx * m.len * 0.16;
      const ty = m.y - m.vy * m.len * 0.16;
      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, 'rgba(255,255,255,.78)');
      grad.addColorStop(0.4, 'rgba(255,255,255,.14)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      if (m.y > H + 80 || m.x > W + 160 || m.x < -200) meteors[i] = newMeteor();
    }
  }

  /* ---------------- 滚动：logo 退场、标语自左滚入、到中心组装 ---------------- */
  function applyText(p) {
    const q0 = isStill() ? 1 : p;

    if (mark) {
      const m = Math.max(0, 1 - q0 / 0.22);
      mark.style.opacity = m.toFixed(3);
      mark.style.transform =
        `translate3d(-50%,calc(-50% - ${(q0 * 44).toFixed(1)}px),0) scale(${(1 - q0 * 0.09).toFixed(3)})`;
    }

    const stepA = (F * 0.94) / (R * 0.9);          // 弧上每字的角度间距
    const restA = Math.PI / 2 - 2.5 * stepA;        // 落定后最右一个字的角度
    const shiftMax = (A0 + SPAN) - restA + stepA * 0.55;
    const shift = (1 - ease(clamp(q0 / 0.4))) * shiftMax;
    const rr = R * 0.9;

    for (let i = 0; i < chars.length; i++) {
      const ang = Math.PI / 2 + (2.5 - i) * stepA + shift;
      const ax = cx + rr * Math.cos(ang) - wordCX;
      const ay = cy - rr * Math.sin(ang) - wordCY;
      const row = i < 3 ? 0 : 1;
      const sx = ((i % 3) - 1) * F * 1.04;
      const sy = (row ? 0.58 : -0.58) * F;
      const q = clamp((q0 - 0.46 - i * 0.022) / 0.26);
      const e = ease(q);
      const x = ax + (sx - ax) * e;
      const y = ay + (sy - ay) * e;
      const sc = 0.52 + 0.48 * e;
      const tilt = (ang - Math.PI / 2) * 0.38 * (1 - e);
      const vis = clamp((cx + rr * Math.cos(ang) + F * 0.5) / (F * 1.6));
      const el = chars[i];
      el.style.transform =
        `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${tilt.toFixed(3)}rad) scale(${sc.toFixed(3)})`;
      el.style.opacity = (vis * (0.86 + 0.14 * e)).toFixed(3);
    }

    if (sub) sub.style.opacity = clamp((q0 - 0.68) / 0.26).toFixed(3);
    if (hint) hint.style.opacity = (1 - Math.min(1, q0 / 0.14)).toFixed(3);
  }

  function onScroll(y) {
    const h = hero.offsetHeight - getVh();
    const p = h > 0 ? clamp(y / h) : 0;
    if (p === progress) return;
    progress = p;
    applyText(p);
    if (isStill()) { smoothP = 0; rot = 0; paint(0); }
  }

  /* ---------------- 循环 ---------------- */
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    smoothP += (progress - smoothP) * 0.1;
    // 只有滚动才让整场粒子绕圆心流转；页面停住时一颗粒子都不动
    rot = smoothP * 0.42;
    paint(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  build();
  applyText(0);
  if (isStill()) paint(0); else start();

  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      build();
      applyText(progress);
      if (isStill()) paint(0);
      else { stop(); start(); }
    }, 160);
  }, { passive: true });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !isStill()) start(); else stop();
  }, { threshold: 0.01 }).observe(hero);

  return { onScroll, refreshProgress: () => onScroll(scrollY) };
}
