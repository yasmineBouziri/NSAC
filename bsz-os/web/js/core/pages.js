import { h, uid } from './util.js';
import { api } from './api.js';
import { S, save, CITIES, DEF } from './state.js';
import { definePage, defineApplet, widgets, pages } from './registry.js';
import { mountGrid } from './dashboard.js';
import { applyTheme, setTheme, THEMES } from './theme.js';
import { pop } from './fx.js';
import { mountClockApplet } from '../widgets/clockApplet.js';
import { setLocalTimezone } from '../lib/timezones.js';

const fixed = (ids, size) => ids.map(id => ({ uid: uid(), type: id, size: size?.[id] || widgets.get(id)?.size || 'm', cfg: {} }));
const SIMNOTE = 'Preview with simulated data. Connect the matching engine to make these widgets live.';

// ---- Applets. Each one embeds reusable parts (widgets) via parts(). ----
const parts = (ids, size, note) => v => mountGrid(v, fixed(ids, size), false, note);
const A = (id, title, icon, group, desc, render) => defineApplet({ id, title, icon, group, desc, render });

A('home', 'Home', '◈', 'System', 'Applet launcher', v => {
  const list = [...pages.values()].filter(p => p.id !== 'home' && p.id !== 'engines');
  const groups = [...new Set(list.map(p => p.group))];
  v.replaceChildren(h('div', { class: 'launcher' }, groups.map(g => h('section', {}, h('h3', {}, g),
    h('div', { class: 'apps' }, list.filter(p => p.group === g).map(p => h('button', { class: 'app', onClick: () => (location.hash = '#/' + p.id) }, h('i', {}, p.icon), h('b', {}, p.title), h('small', {}, p.desc))))))));
  pop(v.querySelectorAll('.app'));
});
A('physical', 'Physical health', '✚', 'Health', 'Vitals, domains, immune, recommendations', parts(['hscore', 'immune', 'domains', 'vitals', 'recs', 'hgraph', 'sleep'], { vitals: 'l' }, SIMNOTE + ' Anatomical body view with organ health telemetry.'));
A('mental', 'Mental health', '☯', 'Health', 'Check-ins, surveys, tips, breathing, reaction test', parts(['checkin', 'mood', 'breath', 'pvt'], null, 'Guided breathing, fatigue vigilance, and psychological support.'));
A('sensors', 'Sensor monitor', '☢', 'Space', 'Radiation, solar, cabin air', parts(['radiation', 'solar', 'atmo'], { solar: 'l' }, SIMNOTE));
A('clock', 'Clock', '◷', 'Time', 'World time, alarms, stopwatch, timer, mission elapsed time, calendar', v => mountClockApplet(v));
A('assistant', 'Assistant', '✦', 'AI', 'Local AI chat', parts(['chat'], { chat: 'x' }));
A('games', 'Games', '◉', 'Fun', 'Snake, 2048 (more planned)', parts(['snake', 'g2048']));
A('simulation', 'Simulation', '⎈', 'Simulation', 'Orbital and station drills', v => v.replaceChildren(h('div', { class: 'doc' },
  h('h2', {}, 'Simulation Drills'),
  h('p', {}, 'Practice runs for station maneuvers, spacewalks, fire response, and orbital docking adjustments.'),
  h('p', {}, 'Interactive thrust drills and telemetry are active on the mission dial.'))));
A('tutorial', 'Tutorial and about', '?', 'System', 'How BSZ-OS works', v => v.replaceChildren(h('div', { class: 'doc' }, h('h2', {}, 'About BSZ-OS'),
  h('p', {}, 'Offline-first crew health environment. Engines (accounts, health, sensors, AI) are independent plugins. Applets are the user-facing apps.'),
  h('p', {}, 'Data marked SIM is simulated. BSZ-OS is a decision support prototype, not a medical device. Alerts and thresholds never depend on the AI.'),
  h('p', {}, 'Guided tutorial and system walkthrough are accessible directly on the dial.'))));
A('credits', 'Credits', '★', 'System', 'Team and sources', v => v.replaceChildren(h('div', { class: 'doc' }, h('h2', {}, 'Credits'),
  h('p', {}, 'Team: Blood, Sweat and Zero-G (INSAT, Tunisia).'),
  h('p', {}, 'Libraries: Motion, anime.js. Data and references: see the register in the context hub.'),
  h('p', {}, 'Offline-first crew health and bio-monitoring architecture.'))));

const ROADMAP = [['health', 'Health engine'], ['ai', 'Local AI engine'], ['sensors', 'Sensor acquisition']];

definePage({
  id: 'engines', title: 'Engines', icon: '⚙', group: 'System', desc: 'Engine status', render(v) {
    const box = h('div', { class: 'eng' });
    v.replaceChildren(box);
    api('engines').then(list => {
      const have = new Set(list.map(e => e.name));
      box.append(...list.map(e => h('div', { class: 'row' }, h('span', { class: 'dot ' + (e.status === 'ok' ? (e.stub ? 's' : '') : 'f') }),
        h('b', {}, e.name), h('span', { class: 'dim' }, e.error || (e.stub ? 'stub ' : '') + 'v' + e.version + '  ' + e.provides.join(', ')))),
        ...ROADMAP.filter(r => !have.has(r[0])).map(r => h('div', { class: 'row off' }, h('span', { class: 'dot f' }), h('b', {}, r[1]), h('span', { class: 'dim' }, 'not installed'))));
      pop(box.children);
    });
  },
});

definePage({
  id: 'settings', title: 'Settings', icon: '☰', group: 'System', desc: 'Theme, motion, clock, city', render(v) {
    const s = S.data.settings;
    const set = (k, val) => { s[k] = val; applyTheme(); save(); };
    const sel = (opts, cur, fn) => { const e = h('select', {}, opts.map(([val, l]) => h('option', { value: val, selected: String(val) === String(cur) }, l))); e.onchange = () => fn(e.value); return e; };
    const sw = h('div', { class: 'swatches' });
    const paint = () => sw.replaceChildren(...THEMES.map(([k, label, grad]) => h('button', {
      class: 'sw' + ((s.theme || 'aurora') === k ? ' on' : ''),
      title: label,
      style: `background:linear-gradient(135deg,${grad})`,
      onClick: () => { setTheme(k); paint(); },
    })));
    paint();
    const reset = h('button', { class: 'btn', onClick: () => { if (confirm('Reset dashboard to defaults?')) { S.data.widgets = [{ uid: uid(), type: 'citytime', size: 'm', cfg: {} }, { uid: uid(), type: 'calendar', size: 'l', cfg: {} }]; save(); } } }, 'Reset dashboard');
    const signOut = h('button', { class: 'btn', style: 'background:color-mix(in srgb,var(--warn) 18%,transparent);border-color:var(--warn);color:var(--t)', onClick: async () => {
      await api('auth/logout', { method: 'POST' }).catch(() => {});
      location.reload();
    } }, 'Sign out ⏻');
    v.replaceChildren(h('div', { class: 'set' },
      h('section', {}, h('h3', {}, 'Theme'), sw),
      h('section', {}, h('h3', {}, 'Display'),
        h('label', { class: 'dim' }, 'Motion', sel([['full', 'Full'], ['reduced', 'Reduced']], s.motion, x => set('motion', x))),
        h('label', { class: 'dim' }, 'Starfield', sel([[1, 'On'], [0, 'Off']], s.stars ? 1 : 0, x => set('stars', x === '1'))),
        h('label', { class: 'dim' }, 'Density', sel([['comfortable', 'Comfortable'], ['compact', 'Compact']], s.density, x => set('density', x)))),
      h('section', {}, h('h3', {}, 'Time and place'),
        h('label', { class: 'dim' }, 'Clock format', sel([[1, '24 hour'], [0, '12 hour']], s.h24 ? 1 : 0, x => { set('h24', x === '1'); window.dispatchEvent(new CustomEvent('bsz:tz-changed')); })),
        h('label', { class: 'dim' }, 'Home city', sel(Object.keys(CITIES).map(c => [c, c]), s.city, x => { set('city', x); if (CITIES[x]?.[0]) setLocalTimezone(CITIES[x][0], x); }))),
      h('section', {}, h('h3', {}, 'Logged in as ' + (S.user?.name || 'Crew Member')), h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, reset, signOut))));
    pop(v.firstChild.children);
  },
});
