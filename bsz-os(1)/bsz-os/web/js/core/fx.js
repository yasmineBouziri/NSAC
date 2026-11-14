const M = () => window.Motion;
export const fx = { reduced: false };
export const sky = { on: true, warp() {} };

export function pop(els, o = {}) {
  els = [...els];
  if (!els.length) return;
  els.forEach(e => { e.style.opacity = '1'; });
  if (fx.reduced || !window.Motion) return;
  try {
    M().animate(els, { y: [16, 0], scale: [0.98, 1] },
      { duration: 0.35, easing: 'ease-out', delay: M().stagger(0.03, { startDelay: o.delay || 0 }) });
  } catch (err) {}
}
export function count(el, to, dec = 0) {
  const from = el._v ?? to;
  el._v = to;
  if (fx.reduced || from === to) { el.textContent = to.toFixed(dec); return; }
  M().animate(from, to, { duration: 0.6, ease: 'easeOut', onUpdate: v => (el.textContent = v.toFixed(dec)) });
}
export function flip(container, mutate) {
  const first = new Map([...container.children].map(k => [k, k.getBoundingClientRect()]));
  mutate();
  if (fx.reduced) return;
  for (const k of container.children) {
    const a = first.get(k);
    if (!a) continue;
    const b = k.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (dx || dy) M().animate(k, { x: [dx, 0], y: [dy, 0] }, { type: 'spring', stiffness: 420, damping: 34 });
  }
}
export function startStars(cv) {
  const cx = cv.getContext('2d');
  let W, H, sp = 1, pts = [];
  const init = () => {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    pts = Array.from({ length: Math.min(260, (W * H) / 6000 | 0) }, () => ({ x: Math.random() * W - W / 2, y: Math.random() * H - H / 2, z: Math.random() * W }));
  };
  init(); addEventListener('resize', init);
  (function loop() {
    requestAnimationFrame(loop);
    cx.clearRect(0, 0, W, H);
    if (!sky.on) return;
    const v = fx.reduced ? 0.1 : sp, d = 0.6 * v + 0.15;
    for (const s of pts) {
      s.z -= d;
      if (s.z <= 1) { s.x = Math.random() * W - W / 2; s.y = Math.random() * H - H / 2; s.z = W; }
      const k = W / s.z, k2 = W / (s.z + d * 3);
      cx.strokeStyle = `rgba(255,255,255,${Math.min(1, 1.2 - s.z / W)})`;
      cx.lineWidth = Math.min(2.2, (1 - s.z / W) * 2 + 0.3);
      cx.beginPath(); cx.moveTo(s.x * k2 + W / 2, s.y * k2 + H / 2); cx.lineTo(s.x * k + W / 2, s.y * k + H / 2); cx.stroke();
    }
  })();
  sky.warp = () => {
    if (fx.reduced) return;
    M().animate(1, 14, { duration: 0.18, onUpdate: v => (sp = v), onComplete: () => M().animate(14, 1, { duration: 1, ease: 'easeOut', onUpdate: v => (sp = v) }) });
  };
}
