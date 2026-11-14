import { h } from '../core/util.js';
import { defineWidget } from '../core/registry.js';
import { feed } from '../core/data.js';
import { chart } from '../core/chart.js';
import { count } from '../core/fx.js';
import { report } from './tools.js';

const vitSim = (() => {
  let t = 0;
  return () => { t++; return { hr: Math.round(64 + 6 * Math.sin(t / 9) + Math.random() * 3), spo2: +(97.5 + Math.random() * 1.2).toFixed(1), temp: +(36.6 + 0.2 * Math.sin(t / 30) + Math.random() * 0.1).toFixed(1), resp: Math.round(14 + Math.random() * 2), hrv: Math.round(52 + 8 * Math.sin(t / 12)) }; };
})();
const METRICS = { hr: ['Heart rate', 'bpm', 0], spo2: ['SpO2', '%', 1], temp: ['Core temp', '°C', 1], resp: ['Respiration', '/min', 0], hrv: ['HRV', 'ms', 0] };

defineWidget({
  id: 'vitals', title: 'Vitals', icon: '♥', group: 'Health', size: 'l', desc: 'Heart rate, SpO2, temperature, respiration, HRV',
  mount(b, c) {
    const box = h('div', { class: 'stats' }), refs = {};
    for (const [k, [l, u]] of Object.entries(METRICS)) {
      const v = h('b'), cv = h('canvas'); refs[k] = { v, ch: chart(cv, { fill: false }), hist: [] };
      box.append(h('div', { class: 'stat' }, h('small', {}, l), h('div', {}, v, h('span', {}, u)), cv));
    }
    b.append(box);
    const un = feed('health.vitals', vitSim)((d, sim) => {
      c.sim(sim);
      for (const k in refs) { const r = refs[k]; if (d[k] == null) continue; count(r.v, d[k], METRICS[k][2]); r.hist.push(d[k]); if (r.hist.length > 40) r.hist.shift(); r.ch.set(r.hist); }
    });
    return () => { un(); Object.values(refs).forEach(r => r.ch.destroy()); };
  },
});

defineWidget({
  id: 'hgraph', title: 'Health graph', icon: '∿', group: 'Health', size: 'm', desc: 'Live trace of one vital', cfg: [{ key: 'metric', label: 'Metric', type: 'select', options: Object.keys(METRICS), def: 'hr' }],
  mount(b, c) {
    const m = c.cfg.metric || 'hr', lab = h('div', { class: 'kv' }), cv = h('canvas', { class: 'cv' });
    b.append(lab, cv);
    const ch = chart(cv), hist = [];
    ch.set([0, 0]); ch.reveal();
    const un = feed('health.vitals', vitSim)((d, sim) => {
      c.sim(sim);
      hist.push(d[m]); if (hist.length > 80) hist.shift(); ch.set(hist);
      lab.replaceChildren(h('span', { class: 'dim' }, METRICS[m][0]), h('b', {}, d[m] + ' ' + METRICS[m][1]));
    });
    return () => { un(); ch.destroy(); };
  },
});

defineWidget({
  id: 'hscore', title: 'Readiness', icon: '◉', group: 'Health', size: 'm', desc: 'Overall score with sleep, cardio, bone, mood',
  mount(b, c) {
    const R = 44, C = 2 * Math.PI * R, NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 110 110'); svg.setAttribute('class', 'ring');
    svg.innerHTML = `<circle class="bg" cx="55" cy="55" r="${R}"/><circle class="fg" cx="55" cy="55" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 55 55)"/><text x="55" y="64">0</text>`;
    const fg = svg.querySelector('.fg'), tx = svg.querySelector('text'), parts = h('div', { class: 'parts' });
    b.append(svg, parts);
    const un = feed('health.score', () => ({ score: 86, parts: { Sleep: 81, Cardio: 90, Bone: 78, Mood: 88 } }), 5000)((d, sim) => {
      c.sim(sim);
      fg.style.strokeDashoffset = C * (1 - d.score / 100); count(tx, d.score, 0);
      parts.replaceChildren(...Object.entries(d.parts).map(([k, v]) => h('div', { class: 'kv' }, h('span', { class: 'dim' }, k), h('b', {}, v))));
    });
    return un;
  },
});

const RECS = [
  { p: 'high', t: 'Resistance session overdue', d: 'No loading exercise logged for 2 days. Schedule 45 min today to protect bone density.' },
  { p: 'med', t: 'CO2 trending up in sleep quarters', d: 'Check scrubber flow before the next rest period.' },
  { p: 'med', t: 'Sleep timing drifted 50 min', d: 'Hold lights-out within 20 min of your baseline.' },
  { p: 'low', t: 'Hydration on target', d: 'Intake matches the daily goal. Keep the pace.' },
];
defineWidget({
  id: 'recs', title: 'Recommendations', icon: '✓', group: 'Health', size: 'm', desc: 'Prioritised actions from the health engine',
  mount(b, c) {
    const box = h('div', { class: 'recs' }); b.append(box);
    return feed('health.recs', () => RECS, 10000)((d, sim) => {
      c.sim(sim); box.replaceChildren(...d.map(r => h('div', { class: 'rec ' + r.p }, h('b', {}, r.t), h('span', {}, r.d))));
    });
  },
});

defineWidget({
  id: 'sleep', title: 'Sleep, last 7 nights', icon: '☾', group: 'Health', size: 'm', desc: 'Nightly hours bar chart',
  mount(b, c) {
    const kv = h('div', { class: 'kv' }), cv = h('canvas', { class: 'cv' }); b.append(kv, cv);
    const ch = chart(cv, { bars: true, min: 0, max: 10 });
    const un = feed('health.sleep', () => ({ hours: [6.8, 7.2, 6.1, 7.5, 6.9, 7.1, 6.6] }), 20000)((d, sim) => {
      c.sim(sim); const avg = d.hours.reduce((a, x) => a + x, 0) / d.hours.length;
      kv.replaceChildren(h('span', { class: 'dim' }, 'Average'), h('b', {}, avg.toFixed(1) + ' h')); ch.set(d.hours); ch.reveal();
    });
    return () => { un(); ch.destroy(); };
  },
});

defineWidget({
  id: 'atmo', title: 'Cabin atmosphere', icon: '≋', group: 'Health', size: 'm', desc: 'O2, CO2, pressure, humidity, temperature',
  mount(b, c) {
    const box = h('div', { class: 'stats' }), refs = {};
    const M = { o2: ['O2', '%', 1], co2: ['CO2', 'ppm', 0], kpa: ['Pressure', 'kPa', 1], hum: ['Humidity', '%', 0], temp: ['Temp', '°C', 1] };
    for (const [k, [l, u]] of Object.entries(M)) { const v = h('b'); refs[k] = v; box.append(h('div', { class: 'stat' }, h('small', {}, l), h('div', {}, v, h('span', {}, u)))); }
    b.append(box);
    return feed('cabin.atmo', () => ({ o2: +(20.9 + Math.random() * 0.1).toFixed(1), co2: Math.round(2900 + Math.random() * 300), kpa: +(101.3 + Math.random() * 0.2).toFixed(1), hum: Math.round(44 + Math.random() * 3), temp: +(22.4 + Math.random() * 0.3).toFixed(1) }), 3000)((d, sim) => {
      c.sim(sim); for (const k in refs) count(refs[k], d[k], M[k][2]);
    });
  },
});

const STC = { ok: 'var(--ok)', watch: 'var(--warn)', alert: 'var(--bad)', unknown: 'var(--dim)' };
defineWidget({
  id: 'domains', title: 'Health domains', icon: '✚', group: 'Health', size: 'l', desc: 'Status of every body system with reasons and sources',
  mount(b, c) {
    const box = h('div', { class: 'recs' }), open = new Set();
    let data = [];
    b.append(box);
    const draw = () => box.replaceChildren(...data.map(x => {
      const full = open.has(x.id), rs = x.reasons.filter(r => full || r.status !== 'ok').slice(0, full ? 20 : 2);
      const head = h('b', {}, x.label, h('span', { class: 'dim', style: 'float:right;font-weight:400' }, x.status === 'unknown' ? 'no data' : `${x.status}  ${Math.round(x.confidence * 100)}% inputs`));
      const rows = rs.map(r => h('span', { title: 'Source ' + r.src + (r.verify ? ' (verify)' : '') }, `${r.why}  [${r.src}]`));
      return h('div', { class: 'rec dom', style: `border-color:${STC[x.status]}`, onClick: () => { full ? open.delete(x.id) : open.add(x.id); draw(); } }, head, ...rows);
    }));
    const simData = () => ['Cardiovascular', 'Respiratory', 'Sleep and circadian', 'Bone and muscle', 'Cognition', 'Radiation'].map((l, i) => ({
      id: 'd' + i, label: l, status: i === 2 ? 'watch' : 'ok', confidence: 1,
      reasons: i === 2 ? [{ why: 'Sleep, 7 night mean 6.2 h, expected >= 7', status: 'watch', src: 'AASM' }] : [],
    }));
    return feed('health.domains', simData, 3000)((d, sim) => { c.sim(sim); data = d; draw(); });
  },
});

defineWidget({
  id: 'immune', title: 'Immune load (inferred)', icon: '⛨', group: 'Health', size: 'm', desc: 'Estimated from sleep, stress, radiation and more',
  mount(b, c) {
    const R = 44, C = 2 * Math.PI * R, NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 110 110'); svg.setAttribute('class', 'ring');
    svg.innerHTML = `<circle class="bg" cx="55" cy="55" r="${R}"/><circle class="fg" cx="55" cy="55" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 55 55)"/><text x="55" y="64">-</text>`;
    const fg = svg.querySelector('.fg'), tx = svg.querySelector('text'), why = h('div', { class: 'sub dim' });
    b.append(svg, why);
    return feed('health.immune', () => ({ index: 82, status: 'ok', confidence: 0.8, contrib: [{ label: 'Sleep, 7 night mean', pct: 40 }, { label: 'Workload', pct: 25 }] }), 4000)((d, sim) => {
      c.sim(sim);
      fg.style.strokeDashoffset = C * (1 - (d.index || 0) / 100); fg.style.stroke = STC[d.status];
      d.index == null ? (tx.textContent = '-') : count(tx, d.index, 0);
      why.textContent = `Inferred, ${Math.round(d.confidence * 100)}% of inputs. ` + (d.contrib.length ? 'Drivers: ' + d.contrib.map(x => x.label + ' ' + x.pct + '%').join(', ') : 'No strong drivers.');
    });
  },
});

defineWidget({
  id: 'checkin', title: 'Check-in', icon: '✎', group: 'Health', size: 'm', desc: 'Sleepiness, workload, mood, PHQ-9, GAD-7, social contact',
  mount(b) {
    const F = [['kss', 'Sleepiness 1 to 9', 1, 9], ['tlx', 'Workload 0 to 100', 0, 100], ['mood', 'Mood 1 to 5', 1, 5], ['phq9', 'PHQ-9 total 0 to 27', 0, 27], ['gad7', 'GAD-7 total 0 to 21', 0, 21], ['social', 'Social contacts today', 0, 20]];
    const ins = F.map(([k, l, lo, hi]) => [k, h('input', { type: 'number', min: lo, max: hi, placeholder: l })]);
    const msg = h('div', { class: 'sub dim' });
    b.append(h('div', { class: 'stats' }, ins.map(([k, i], n) => h('label', { class: 'dim', style: 'font-size:11px;display:grid;gap:2px' }, F[n][1], i))),
      h('button', { class: 'btn', onClick: async () => {
        let n = 0;
        for (const [k, i] of ins) if (i.value !== '') { await report(k, +i.value); n++; i.value = ''; }
        msg.textContent = n ? `Logged ${n} value${n > 1 ? 's' : ''}` : 'Nothing to log';
      } }, 'Log'), msg);
  },
});
