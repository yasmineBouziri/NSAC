import { h } from './util.js';
import { feed } from './data.js';
// Emergency notifications. Watches the health.domains feed (rule based, independent of the AI) and warns with a toast and a beep.
let ctx, seen = new Set(), box;
function beep() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch { /* audio blocked until first user gesture */ }
}
export function toast(title, text, level = 'alert') {
  box ||= document.body.appendChild(h('div', { id: 'toasts' }));
  const t = h('div', { class: 'toast ' + level, onClick: () => t.remove() }, h('b', {}, title), h('span', {}, text));
  box.append(t); if (level === 'alert') beep(); setTimeout(() => t.remove(), 12000);
}
export function startNotifications() {
  return feed('health.domains', () => [], 5000)((list) => {
    for (const d of list || []) {
      const key = d.id + d.status;
      if (d.status === 'alert' && !seen.has(key)) { seen.add(key); toast(d.label + ' alert', d.reasons?.[0]?.why || 'Check the matching applet.'); }
      if (d.status !== 'alert') seen.delete(d.id + 'alert');
    }
  });
}
