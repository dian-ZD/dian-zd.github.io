// 03 产品卡：跟随指针的径向高光
// 用事件委托只挂一个监听；进入卡片时缓存 rect，移动时只写两个 CSS 变量，并合并到 rAF。

export function initCards(finePointer) {
  const grid = document.getElementById('works');
  if (!grid || !finePointer) return;
  let card = null, rect = null, x = 0, y = 0, raf = 0;
  const apply = () => {
    raf = 0;
    if (!card) return;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
  };
  grid.addEventListener('pointermove', e => {
    const c = e.target.closest('.card');
    if (!c) return;
    if (c !== card) { card = c; rect = c.getBoundingClientRect(); }
    x = Math.round(e.clientX - rect.left);
    y = Math.round(e.clientY - rect.top);
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  grid.addEventListener('pointerleave', () => { card = null; rect = null; });
  // 滚动后 rect 失效，下次移动时重新读取
  addEventListener('scroll', () => { card = null; }, { passive: true });
}
