// 页脚揭幕：fixed 字标层只在占位区接近视口时可见（其余时间 visibility:hidden，不参与合成），
// WebGL 扭曲只在桌面精细指针 + 未开启减少动态效果 + 支持 WebGL2 时初始化。

export async function initFooter({ isStill, finePointer }) {
  const wrap = document.getElementById('distort');
  const host = document.getElementById('distortCanvas');
  if (!wrap || !host) return;

  let fx = null;
  const io = new IntersectionObserver(([e]) => {
    wrap.classList.toggle('near', e.isIntersecting);
    fx?.setVisible(e.isIntersecting);
  }, { rootMargin: '0px 0px 25% 0px' });
  io.observe(wrap);

  // trae 原版也只在支持 WebGL2 时渲染；触屏上没有 mousemove，静态图即最终效果
  if (isStill() || !finePointer) return;
  const { initDistort } = await import('./distort.js');
  try {
    fx = initDistort(host, { grid: 15, mouse: 0.25, strength: 0.15, relaxation: 0.9 });
    fx?.setVisible(wrap.classList.contains('near'));
  } catch (err) {
    console.warn('[HIGHLIGHT] distort fallback', err);
  }
}
