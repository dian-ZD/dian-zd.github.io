// 页脚字标的网格扭曲，1:1 复刻 trae.cn 的 grid-distortion 组件（原实现基于 three.js）。
// 这里改用原生 WebGL2，省掉约 600KB 的 three.js，算法、参数与着色器保持一致：
//   grid=15  mouse=.25  strength=.15  relaxation=.9
//   数据纹理 n×n RGBA Float，初值 R/G = 255*random-125，NEAREST 采样（three DataTexture 默认）
//   片元：gl_FragColor = texture2D(uTexture, vUv - 0.02 * texture2D(uDataTexture, vUv).rg)
//   每帧：全部格子 *= relaxation；半径 n*mouse 内的格子按指针速度叠加位移
// 与原版的区别只在调度：离屏、静止收敛后停止 rAF；不支持 WebGL2 时保留静态 <img>。

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
in vec2 vUv;
out vec4 outColor;
void main(){
  vec4 offset = texture(uDataTexture, vUv);
  outColor = texture(uTexture, vUv - 0.02 * offset.rg);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function initDistort(host, { grid: n = 15, mouse = 0.25, strength = 0.15, relaxation = 0.9 } = {}) {
  const img = host.querySelector('img');
  const src = img && (img.currentSrc || img.getAttribute('src'));
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl || !src) return null;

  // ---- 程序与全屏四边形（等价于 trae 的 PlaneGeometry + 正交相机铺满容器）----
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // ---- 数据纹理：Float32 RGBA，NEAREST，所以位移是一格一格的“像素块”----
  const data = new Float32Array(4 * n * n);
  for (let i = 0; i < n * n; i++) {
    data[4 * i] = 255 * Math.random() - 125;
    data[4 * i + 1] = 255 * Math.random() - 125;
  }
  const dataTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, dataTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, n, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(prog, 'uDataTexture'), 1);
  gl.uniform1i(gl.getUniformLocation(prog, 'uTexture'), 0);

  let ready = false, running = false, visible = false, raf = 0, dead = false;
  const T = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };

  // ---- 字标纹理：minFilter = Linear（与 trae 一致），无 mipmap ----
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    if (dead) return;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    ready = true;
    host.appendChild(canvas);
    resize();
    wake();
  };
  image.src = src;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    if (ready) draw();
  }

  function draw() {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dataTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, data);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    host.parentElement.parentElement.classList.add('gl');
  }

  // 每帧更新，与 trae 源码逐行对应
  function step() {
    let change = 0;
    for (let d = 0; d < n * n; d++) {
      const r = data[4 * d], g = data[4 * d + 1];
      data[4 * d] = r * relaxation;
      data[4 * d + 1] = g * relaxation;
      change += Math.abs(r - data[4 * d]) + Math.abs(g - data[4 * d + 1]);
    }
    const l = n * T.x, c = n * T.y, p = n * mouse;
    for (let m = 0; m < n; m++) {
      for (let v = 0; v < n; v++) {
        const f = (l - m) ** 2 + (c - v) ** 2;
        if (f < p * p) {
          const b = 4 * (m + n * v);
          const h = Math.min(p / Math.sqrt(f), 10);
          const ax = 100 * strength * T.vX * h, ay = 100 * strength * T.vY * h;
          data[b] += ax;
          data[b + 1] -= ay;
          change += Math.abs(ax) + Math.abs(ay);
        }
      }
    }
    return change;
  }

  let last = 0;
  function frame(now) {
    raf = 0;
    if (!running) return;
    // 原版跟随显示器刷新率；这里固定按 60Hz 推进，避免 120Hz 屏上衰减速度翻倍
    if (now - last < 1000 / 61) { raf = requestAnimationFrame(frame); return; }
    last = now;
    const change = step();
    draw();
    // 状态是确定性的：两帧之间几乎没有变化就说明已经收敛，停帧后画面完全一致
    if (change < 1e-3) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (!ready || !visible || running || dead) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function sleep() {
    running = false;
    if (raf) cancelAnimationFrame(raf), raf = 0;
  }

  // 指针：mousemove 记录归一化坐标与速度；mouseleave 清零（与 trae 相同，触屏不触发）
  const onMove = e => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = 1 - (e.clientY - r.top) / r.height;
    T.vX = x - T.prevX; T.vY = y - T.prevY;
    T.x = x; T.y = y; T.prevX = x; T.prevY = y;
    wake();
  };
  const onLeave = () => { Object.assign(T, { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 }); wake(); };
  host.addEventListener('mousemove', onMove, { passive: true });
  host.addEventListener('mouseleave', onLeave, { passive: true });

  const ro = new ResizeObserver(resize);
  ro.observe(host);

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    dead = true; sleep();
    host.parentElement.parentElement.classList.remove('gl');
    canvas.remove();
  });

  return {
    setVisible(v) { visible = v; v ? wake() : sleep(); },
  };
}
