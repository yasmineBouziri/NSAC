import { fx } from './fx.js';
// Canvas line or bar chart. o: {color,min,max,bands:[{from,to,color}],fill,bars}
export function chart(cv, o = {}) {
  const cx = cv.getContext('2d');
  let data = [], p = 1, W = 0, H = 0;
  const col = () => o.color || getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#9fd8cf';
  function draw() {
    cx.clearRect(0, 0, W, H);
    if (data.length < 2 || !W) return;
    const lo = o.min ?? Math.min(...data), hi = o.max ?? Math.max(...data), pd = 4;
    const y = v => H - pd - ((v - lo) / (hi - lo || 1)) * (H - 2 * pd), x = i => (i / (data.length - 1)) * W;
    for (const b of o.bands || []) {
      cx.globalAlpha = 0.12; cx.fillStyle = b.color;
      const a = y(Math.min(b.to, hi)), c = y(Math.max(b.from, lo)); cx.fillRect(0, a, W, c - a);
    }
    cx.globalAlpha = 1;
    if (o.bars) {
      const bw = W / data.length;
      data.forEach((v, i) => { const hh = (H - pd - y(v)) * p; cx.fillStyle = col(); cx.globalAlpha = 0.85; cx.fillRect(i * bw + bw * 0.15, H - hh, bw * 0.7, hh); });
      cx.globalAlpha = 1; return;
    }
    const n = Math.max(2, Math.floor(data.length * p));
    const isMono = document.documentElement.dataset.theme === 'monochrome';
    if (isMono) {
      const dashPattern = o.dash || (o.lineStyle === 'dotted' ? [2, 3] : (o.lineStyle === 'solid' ? [] : [6, 4]));
      cx.setLineDash(dashPattern);
    } else {
      cx.setLineDash(o.dash || []);
    }
    cx.beginPath();
    for (let i = 0; i < n; i++) (i ? cx.lineTo(x(i), y(data[i])) : cx.moveTo(x(i), y(data[i])));
    cx.strokeStyle = col(); cx.lineWidth = 2; cx.lineJoin = 'round';
    if (!isMono) { cx.shadowColor = col(); cx.shadowBlur = 10; }
    cx.stroke();
    cx.shadowBlur = 0;
    cx.setLineDash([]);
    if (o.fill !== false) {
      cx.lineTo(x(n - 1), H); cx.lineTo(0, H); cx.closePath();
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col() + '55'); g.addColorStop(1, col() + '00'); cx.fillStyle = g; cx.fill();
    }
  }
  const fit = () => {
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); draw();
  };
  const ro = new ResizeObserver(fit); ro.observe(cv);
  return {
    set(d) { data = d; draw(); },
    reveal() { if (fx.reduced) return; window.Motion.animate(0, 1, { duration: 1, ease: 'easeOut', onUpdate: v => { p = v; draw(); }, onComplete: () => { p = 1; draw(); } }); },
    destroy() { ro.disconnect(); },
  };
}
