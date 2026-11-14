import { h } from '../core/util.js';
import { defineWidget } from '../core/registry.js';
import { feed } from '../core/data.js';
import { chart } from '../core/chart.js';
import { count } from '../core/fx.js';

const radSim = (() => {
  let t = 0, spike = 0, cum = 38.2;
  return () => {
    t++; spike = Math.max(0, spike * 0.93 - 0.5);
    if (Math.random() < 0.015) spike = 60 + Math.random() * 90;
    const v = 14 + 2 * Math.sin(t / 40) + (Math.random() - 0.5) * 1.5 + spike / 4;
    cum += (v / 1000) * (2 / 3600);
    return { usvh: +v.toFixed(1), mission_msv: +cum.toFixed(3) };
  };
})();
const solSim = (() => {
  let fl = 0;
  return () => {
    fl *= 0.9;
    if (Math.random() < 0.03) fl = 1 + Math.random() * 2.6;
    return { logflux: +(-6.7 + Math.sin(Date.now() / 6e4) * 0.3 + fl * 0.9 + (Math.random() - 0.5) * 0.05).toFixed(2), kp: +(2 + Math.abs(Math.sin(Date.now() / 9e5)) * 3).toFixed(1) };
  };
})();

const ARC = Math.PI * 70;
defineWidget({
  id: 'radiation', title: 'Radiation', icon: '☢', group: 'Space', size: 'm', desc: 'Dose rate gauge, mission dose and trend',
  mount(b, c) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 160 90'); svg.setAttribute('class', 'gauge');
    svg.innerHTML = '<path class="bg" d="M10 80A70 70 0 0 1 150 80"/><path class="fg" d="M10 80A70 70 0 0 1 150 80" stroke-dasharray="0 220"/>';
    const fg = svg.querySelector('.fg'), num = h('span'), val = h('div', { class: 'gval' }, num, h('small', {}, 'µSv/h')), st = h('div', { class: 'state', style: 'text-align:center' });
    const dose = h('b', {}), cv = h('canvas', { class: 'cv' });
    b.append(svg, val, st, h('div', { class: 'kv' }, h('span', { class: 'dim' }, 'Mission dose'), dose), cv);
    const ch = chart(cv, { min: 0, max: 80, color: '#ff7a3b', bands: [{ from: 21, to: 54, color: '#ffb02e' }, { from: 54, to: 80, color: '#ff4d4d' }] }), hist = [];
    const un = feed('space.radiation', radSim)((d, sim) => {
      c.sim(sim);
      const b = d.band || (d.usvh <= 21 ? 'ok' : d.usvh <= 54 ? 'watch' : 'alert');
      const band = { ok: ['NOMINAL', '#3ddc97'], watch: ['ELEVATED', '#ffb02e'], alert: ['HIGH', '#ff4d4d'], unknown: ['NO DATA', '#8a90ad'] }[b];
      fg.setAttribute('stroke-dasharray', `${Math.min(1, d.usvh / 80) * ARC} 220`); fg.style.stroke = band[1]; fg.style.color = band[1];
      count(num, d.usvh, 1);
      st.textContent = band[0]; st.style.color = band[1]; dose.textContent = d.mission_msv.toFixed(2) + ' mSv';
      hist.push(d.usvh); if (hist.length > 60) hist.shift(); ch.set(hist);
    });
    return () => { un(); ch.destroy(); };
  },
});

const CL = [['A', -8, '#8a90ad'], ['B', -7, '#38d9ff'], ['C', -6, '#3ddc97'], ['M', -5, '#ffb02e'], ['X', -4, '#ff4d4d']];
export const flareClass = lf => { let k = CL[0]; for (const x of CL) if (lf >= x[1]) k = x; return { letter: k[0], mag: Math.pow(10, lf - k[1]), color: k[2] }; };
defineWidget({
  id: 'solar', title: 'Solar activity', icon: '☀', group: 'Space', size: 'l', desc: 'X-ray flux flare graph, class and Kp',
  mount(b, c) {
    const sun = h('div', { class: 'sun' }), cls = h('div', { class: 'bigtime', style: 'font-size:36px' }), kp = h('div', { class: 'sub dim' });
    const cv = h('canvas', { class: 'cv' });
    b.append(h('div', { class: 'sunrow' }, sun, h('div', {}, cls, kp)), cv);
    const bands = CL.map((k, i) => ({ from: k[1], to: CL[i + 1] ? CL[i + 1][1] : -3, color: k[2] }));
    const ch = chart(cv, { min: -8, max: -3, bands, color: '#ffb02e' }), hist = [];
    const pulse = window.Motion.animate(sun, { scale: [1, 1.08, 1] }, { duration: 2.4, repeat: Infinity, ease: 'easeInOut' });
    const un = feed('space.solar', solSim)((d, sim) => {
      c.sim(sim);
      const f = flareClass(d.logflux);
      cls.textContent = f.letter + f.mag.toFixed(1); cls.style.color = f.color;
      kp.textContent = `GOES style X-ray flux 1 to 8 A   Kp ${d.kp}`;
      sun.style.boxShadow = `0 0 ${30 + (d.logflux + 7) * 14}px ${8 + (d.logflux + 7) * 4}px rgba(255,140,40,.5)`;
      hist.push(d.logflux); if (hist.length > 90) hist.shift(); ch.set(hist);
    });
    return () => { un(); ch.destroy(); pulse.stop(); };
  },
});
