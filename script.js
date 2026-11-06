/* HIGHLIGHT Studio — 叙事版交互
   1 导航岛  2 菜单  3 锚点  4 进场  5 幕次指示  6 序章灯光
   7 GSAP 幕：序章退场 / 越权者扫描 / 放映倒计时   8 作品卡高光  9 跑马灯
   10 页脚：trae 式网格扭曲（原生 WebGL2 复刻 grid-distortion）
   原则：只动 transform / opacity；所有逐帧循环在空闲或离屏时停下 */
(() => {
  'use strict';
  window.HL = 1;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = !mqReduce.matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* 用户中途切换「减少动态效果」：重新加载，让整站按新偏好重新初始化 */
  mqReduce.addEventListener && mqReduce.addEventListener('change', () => location.reload());

  /* ---------- 1. 导航岛：下行让路、上行回应；底边红线 = 阅读进度 ---------- */
  const navWrap = $('.island-wrap');
  const progress = $('#progress');
  let lastY = scrollY, ticking = false, maxScroll = 1;

  const measure = () => { maxScroll = Math.max(1, root.scrollHeight - innerHeight); };
  measure();
  new ResizeObserver(measure).observe(document.body);

  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    if (progress) progress.style.transform = `scaleX(${Math.min(1, y / maxScroll)})`;
    if (navWrap && !root.classList.contains('menu-open')) {
      if (y > 140 && y - lastY > 6) navWrap.classList.add('hide');
      else if (lastY - y > 6 || y < 140) navWrap.classList.remove('hide');
    }
    lastY = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  navWrap && navWrap.addEventListener('focusin', () => navWrap.classList.remove('hide'));

  /* ---------- 2. 菜单 ---------- */
  const menu = $('#menuPanel'), toggle = $('#menuToggle');
  const setMenu = open => {
    if (!menu || !toggle) return;
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { navWrap && navWrap.classList.remove('hide'); setTimeout(() => { const f = $('.menu-link', menu); f && f.focus({ preventScroll: true }); }, 60); }
    else toggle.focus({ preventScroll: true });
  };
  toggle && toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  menu && menu.addEventListener('click', e => { if (e.target.closest('[data-close], a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });

  /* ---------- 3. 页内锚点：平滑滚动（减少动态时直接跳） ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });

  /* ---------- 4. 进场：IntersectionObserver 只负责加 .in，过渡全交给 CSS ---------- */
  if (motion && 'IntersectionObserver' in window) {
    const groups = new Map();
    $$('[data-rv]').forEach(el => {
      const p = el.parentElement;
      const i = groups.get(p) || 0;
      groups.set(p, i + 1);
      if (!el.classList.contains('act-head')) el.style.setProperty('--d', ((i % 3) * 0.08).toFixed(2));
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    $$('[data-rv]').forEach(el => io.observe(el));
  }

  /* ---------- 5. 幕次指示 + 导航高亮 ---------- */
  const rail = $('.rail');
  const acts = $$('main > section[id]');
  if (acts.length && 'IntersectionObserver' in window) {
    const railItems = $$('[data-rail]'), navItems = $$('[data-nav]');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        railItems.forEach(li => li.classList.toggle('on', li.dataset.rail === id));
        navItems.forEach(a => a.classList.toggle('on', a.dataset.nav === id));
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    acts.forEach(s => io.observe(s));
  }

  /* ---------- 6. 序章：开灯结束后撤掉遮罩；指针处一团高光跟随 ---------- */
  const lit = $('.ht-lit');
  if (lit && motion) {
    lit.addEventListener('animationend', () => lit.classList.add('done'), { once: true });
  }
  const hero = $('.act-hero'), glow = $('#heroGlow');
  if (hero && glow && motion && fine) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, first = true;
    const loop = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      glow.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (first) { cx = tx; cy = ty; first = false; }
      glow.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  /* ---------- 7. GSAP：需要滚动绑定或时间线的三幕 ---------- */
  if (hasGsap && motion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });

    /* 7a. 序章退场：不是淡出，是被下一幕「推走」——上移、变暗、光束收起 */
    const heroInner = $('#heroInner');
    if (hero && heroInner) {
      gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
        .to(heroInner, { yPercent: -18, autoAlpha: 0.1, ease: 'none' }, 0)
        .to($('.hero-beam', hero), { autoAlpha: 0, ease: 'none' }, 0);
    }

    /* 7b. 越权者：扫描线走一趟把标识显出来，走到底三色错开再对齐（保留原有动画）；
           之后随滚动缓慢推近，悬停时两个色层被指针顶出边界 */
    const stage = $('#featStage');
    if (stage) {
      const base = $('.l-base', stage), ox = $('.l-ox', stage), red = $('.l-red', stage);
      const scan = $('#featScan'), corners = $$('.feat-corner', stage), logo = $('.feat-logo', stage);
      gsap.set(base, { clipPath: 'inset(0 0 100% 0)' });
      gsap.set(corners, { autoAlpha: 0 });

      const enter = gsap.timeline({ paused: true })
        .fromTo(scan, { top: '0%', autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
        .to(scan, { top: '100%', duration: 1.15, ease: 'power1.inOut' }, 0)
        .to(base, { clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'power1.inOut' }, 0)
        .to(scan, { autoAlpha: 0, duration: 0.25 }, 1.05)
        .set([ox, red], { autoAlpha: 0.92 }, 1.02)
        .to(ox, { x: -11, y: 4, duration: 0.1 }, 1.02)
        .to(red, { x: 11, y: -4, duration: 0.1 }, 1.02)
        .to([ox, red], { x: 0, y: 0, duration: 0.55, ease: 'power3.inOut' }, 1.2)
        .to([ox, red], { autoAlpha: 0, duration: 0.4 }, 1.45)
        .fromTo(corners, { scale: 0.35, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.8, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, 0.9);
      ScrollTrigger.create({ trigger: stage, start: 'top 75%', once: true, onEnter: () => enter.play() });

      gsap.fromTo(stage, { scale: 0.94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'center center', scrub: 0.6 } });
      gsap.fromTo(logo, { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: 0.7 } });

      if (fine) {
        const q = [ [ox, 'x'], [ox, 'y'], [red, 'x'], [red, 'y'] ].map(([el, p]) => gsap.quickTo(el, p, { duration: 0.5, ease: 'power3' }));
        stage.addEventListener('pointerenter', () => {
          gsap.to([ox, red], { autoAlpha: 0.8, duration: 0.35, overwrite: 'auto' });
          gsap.to(corners, { scale: 1.25, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
        });
        stage.addEventListener('pointermove', e => {
          const r = stage.getBoundingClientRect();
          const dx = ((e.clientX - r.left) / r.width - 0.5) * 2, dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
          q[0](-dx * 16); q[1](-dy * 8); q[2](dx * 16); q[3](dy * 8);
        }, { passive: true });
        stage.addEventListener('pointerleave', () => {
          gsap.to([ox, red], { x: 0, y: 0, autoAlpha: 0, duration: 0.55, overwrite: 'auto' });
          gsap.to(corners, { scale: 1, autoAlpha: 0.8, duration: 0.5, ease: 'expo.out' });
        });
      }
    }

    /* 7c. 放映：画面钉住，滚动推动片头倒计时 3 → 2 → 1，转完落到「片子还在剪」 */
    const pin = $('#filmPin'), screen = $('#screen');
    if (pin && screen) {
      const leader = $('#leader'), sweep = $('#leaderSweep'), num = $('#leaderNum'), slate = $('#slate'), tc = $('#timecode');
      gsap.set(leader, { autoAlpha: 1 });
      gsap.set(slate, { autoAlpha: 0, y: 28 });
      const pad = n => String(n).padStart(2, '0');
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin, start: 'center center', end: '+=150%', pin: true, scrub: 0.5, anticipatePin: 1,
          onUpdate: self => {
            const f = Math.round(self.progress * 96);
            tc.textContent = `00:00:${pad(Math.floor(f / 24))}:${pad(f % 24)}`;
          }
        }
      });
      ['3', '2', '1'].forEach((n, i) => {
        tl.set(num, { textContent: n }, i)
          .fromTo(sweep, { rotation: 0 }, { rotation: 360, duration: 1, immediateRender: false }, i)
          .fromTo(num, { scale: 1.12, autoAlpha: 0.4 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'power2.out', immediateRender: i === 0 }, i);
      });
      tl.to(leader, { autoAlpha: 0, scale: 1.08, duration: 0.5 }, 3)
        .to(slate, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.2)
        .to({}, { duration: 0.4 });
    }

    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- 8. 作品卡：指针处的一团高光（只改两个 CSS 变量） ---------- */
  const works = $('#works');
  if (works && fine && motion) {
    let pending = null;
    works.addEventListener('pointermove', e => {
      const card = e.target.closest('.work');
      if (!card) return;
      if (!pending) requestAnimationFrame(() => {
        const { card: c, x, y } = pending; pending = null;
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (x - r.left).toFixed(0) + 'px');
        c.style.setProperty('--my', (y - r.top).toFixed(0) + 'px');
      });
      pending = { card, x: e.clientX, y: e.clientY };
    }, { passive: true });
  }

  /* ---------- 9. 跑马灯：离屏即暂停 ---------- */
  const ticker = $('#ticker');
  if (ticker && motion && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => ticker.classList.toggle('run', en.isIntersecting)).observe(ticker);
  }

  /* ---------- 10. 页脚：trae 式网格扭曲 ----------
     复刻 trae 底部 grid-distortion：15×15 浮点网格作为位移贴图（NEAREST 采样 → 块状错位），
     指针速度推动半径内的格子，每帧按 0.9 回弹；指针停住时保留最后速度（与原版一致）。
     外层 position:fixed 叠在页面之下，滚到底才被「揭开」。
     差异只在性能：按 60fps 归一化步长、离屏 / 静止即停止渲染、接近视口才初始化。 */
  const distort = $('#distort');
  if (distort) {
    const box = $('#distortCanvas'), img = $('.distort-img', box);
    const loadImg = () => { if (img && !img.src) img.src = img.dataset.src; };
    let gl = null, started = false, visible = false, kick = () => {};

    const startGL = () => {
      if (started) return;
      started = true;
      loadImg();
      if (!motion) return;
      const canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      if (!gl) return;

      const N = 15, MOUSE = 0.25, STRENGTH = 0.15, RELAX = 0.9;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
        in vec2 aPos; out vec2 vUv;
        void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;
        uniform sampler2D uData; uniform sampler2D uTex;
        in vec2 vUv; out vec4 outColor;
        void main(){ vec4 offset = texture(uData, vUv); outColor = texture(uTex, vUv - 0.02 * offset.rg); }`));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return; }
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const data = new Float32Array(4 * N * N);
      const dataTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, data);
      [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
      gl.uniform1i(gl.getUniformLocation(prog, 'uData'), 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 1);

      let texReady = false;
      const upload = () => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0);
        texReady = true;
        box.appendChild(canvas);
        distort.classList.add('gl');
        resize();
        kick();
      };

      const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(box.clientWidth * dpr)), h = Math.max(1, Math.round(box.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        kick();
      };
      new ResizeObserver(resize).observe(box);

      const m = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };
      box.addEventListener('pointermove', e => {
        const r = box.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
        m.vX = x - m.prevX; m.vY = y - m.prevY;
        m.x = x; m.y = y; m.prevX = x; m.prevY = y;
        kick();
      }, { passive: true });
      box.addEventListener('pointerleave', () => { m.x = m.y = m.prevX = m.prevY = m.vX = m.vY = 0; kick(); });

      let raf = 0, last = 0;
      const frame = now => {
        raf = 0;
        const step = last ? Math.min((now - last) / (1000 / 60), 3) : 1;
        last = now;
        const decay = Math.pow(RELAX, step);
        let energy = 0;
        for (let i = 0; i < N * N; i++) {
          data[4 * i] *= decay; data[4 * i + 1] *= decay;
          energy += Math.abs(data[4 * i]) + Math.abs(data[4 * i + 1]);
        }
        if (m.vX || m.vY) {
          const gx = N * m.x, gy = N * m.y, r = N * MOUSE;
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            const d2 = (gx - i) * (gx - i) + (gy - j) * (gy - j);
            if (d2 < r * r) {
              const k = 4 * (i + N * j), p = Math.min(r / Math.sqrt(d2), 10);
              data[k] += 100 * STRENGTH * m.vX * p * step;
              data[k + 1] -= 100 * STRENGTH * m.vY * p * step;
            }
          }
        }
        gl.bindTexture(gl.TEXTURE_2D, dataTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, data);
        if (texReady) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        const active = m.vX || m.vY || energy > 0.05;
        if (visible && active) raf = requestAnimationFrame(frame);
        else last = 0;
      };
      kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

      if (img.complete && img.naturalWidth) upload();
      else img.addEventListener('load', upload, { once: true });
    };

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      distort.classList.toggle('near', visible);
      rail && rail.classList.toggle('off', visible);
      if (visible) { startGL(); kick(); }
    }, { rootMargin: '240px 0px' }).observe(distort);
  }
})();
