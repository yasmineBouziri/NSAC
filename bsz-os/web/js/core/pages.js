import { h, uid } from './util.js';
import { api } from './api.js';
import { S, save, CITIES, DEF } from './state.js';
import { definePage, defineApplet, widgets, pages } from './registry.js';
import { mountGrid } from './dashboard.js';
import { applyTheme, setTheme, THEMES } from './theme.js';
import { pop } from './fx.js';
import { mountClockApplet } from '../widgets/clockApplet.js';
import { setLocalTimezone } from '../lib/timezones.js';
import { mountSudoku } from '../games/sudoku.js';
import { mountChess } from '../games/chess.js';
import { mountPinball } from '../games/spacecadet.js';

const fixed = (ids, size) => ids.map(id => ({ uid: uid(), type: id, size: size?.[id] || widgets.get(id)?.size || 'm', cfg: {} }));
const SIMNOTE = 'Preview with simulated data. Connect the matching engine to make these widgets live.';

// ---- Applets. Each one embeds reusable parts (widgets) via parts(). ----
const parts = (ids, size, note) => v => mountGrid(v, fixed(ids, size), false, note);
const A = (id, title, icon, group, desc, render) => defineApplet({ id, title, icon, group, desc, render });

function gamesRoom(view) {
  view.classList.add('games-view');
  const choices = [
    ['g2048', '2048', '▣', 'Merge tiles'],
    ['snake', 'Snake', '∿', 'Arrow keys, WASD or swipe'],
    ['pinball', 'Space Cadet Pinball', '✦', 'Full pinball table'],
    ['chess', 'Star Chess', '♞', 'Planet-themed chess'],
    ['sudoku', 'Planet Sudoku', '⊕', 'Planet-themed sudoku'],
  ];
  const menu = h('div', { class: 'games-menu' });
  const stage = h('div', { class: 'games-stage', hidden: true });
  const backToGames = h('button', { class: 'games-back', hidden: true, onClick: () => stop() }, '← Back to games');
  const pause = h('div', { class: 'games-pause', hidden: true },
    h('h2', {}, 'Game paused'),
    h('p', {}, 'Press Esc to resume or quit to return to the game menu.'),
    h('div', { class: 'games-actions' }),
  );
  const actions = pause.lastChild;
  let cleanup = null;
  let active = null;
  let paused = false;

  const stop = () => {
    cleanup?.();
    cleanup = null;
    stage.replaceChildren(backToGames);
    backToGames.hidden = true;
    stage.hidden = true;
    pause.hidden = true;
    menu.hidden = false;
    active = null;
    paused = false;
  };
  const togglePause = () => {
    if (!active) return;
    paused = !paused;
    pause.hidden = !paused;
    stage.classList.toggle('paused', paused);
  };
  const select = id => {
    const def = choices.find(x => x[0] === id);
    if (!def) return;
    active = id;
    menu.hidden = true;
    stage.hidden = false;
    backToGames.hidden = false;
    stage.append(backToGames);
    if (id === 'pinball') {
      cleanup = mountPinball(stage);
    } else if (id === 'chess' || id === 'sudoku') {
      cleanup = id === 'sudoku' ? mountSudoku(stage) : mountChess(stage);
    } else {
      const widget = widgets.get(id);
      cleanup = widget.mount(stage, { cfg: {}, save, S: S.data, sim: () => {} });
    }
    stage.querySelector('[tabindex],button,canvas')?.focus();
  };
  choices.forEach(([id, title, icon, desc]) => {
    menu.append(h('button', { class: 'games-choice', onClick: () => select(id) },
      h('span', { class: 'games-choice-icon' }, icon),
      h('span', {}, h('b', {}, title), h('small', {}, desc)),
    ));
  });
  actions.append(h('button', { class: 'btn', onClick: stop }, 'Quit game'));
  view.append(menu, stage, pause);
  const onKey = e => {
    if (e.key === 'Escape' && active) { e.preventDefault(); togglePause(); }
  };
  document.addEventListener('keydown', onKey);
  return () => { document.removeEventListener('keydown', onKey); stop(); view.classList.remove('games-view'); };
}

A('home', 'Home', '◈', 'System', 'Applet launcher', v => {
  const list = [...pages.values()].filter(p => p.id !== 'home' && p.id !== 'engines');
  const groups = [...new Set(list.map(p => p.group))];
  v.replaceChildren(h('div', { class: 'launcher' }, groups.map(g => h('section', {}, h('h3', {}, g),
    h('div', { class: 'apps' }, list.filter(p => p.group === g).map(p => h('button', { class: 'app', onClick: () => (location.hash = '#/' + p.id) }, h('i', {}, p.icon), h('b', {}, p.title), h('small', {}, p.desc))))))));
  pop(v.querySelectorAll('.app'));
});
A('health', 'Health', '✚', 'Health', 'Physical and mental wellbeing', parts(['hscore', 'immune', 'domains', 'vitals', 'recs', 'hgraph', 'sleep', 'checkin', 'mood', 'breath', 'pvt'], { vitals: 'l' }, SIMNOTE + ' Guided breathing, fatigue vigilance, and psychological support.'));
A('clock', 'Clock', '◷', 'Time', 'World time, alarms, stopwatch, timer, mission elapsed time, calendar', v => mountClockApplet(v));
const aiPage = v => {
  const body = h('div', { class: 'ai-page-chat' });
  v.replaceChildren(body);
  return widgets.get('chat').mount(body, { cfg: {}, save, S: S.data, sim: () => {} });
};
A('assistant', 'AI Chatbot', '✦', 'AI', 'Local AI chat with Zibo', aiPage);
A('games', 'Games', '◉', 'Fun', 'Choose a game to play', gamesRoom);
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
        h('label', { class: 'dim' }, 'Motion', sel([['full', 'Full'], ['reduced', 'Reduced'], ['none', 'None']], s.motion || 'full', x => set('motion', x))),
        h('label', { class: 'dim' }, 'Starfield', sel([[1, 'On'], [0, 'Off']], s.stars ? 1 : 0, x => set('stars', x === '1'))),
        h('label', { class: 'dim' }, 'Density', sel([['comfortable', 'Comfortable'], ['compact', 'Compact']], s.density, x => set('density', x)))),
      h('section', {}, h('h3', {}, 'Time and place'),
        h('label', { class: 'dim' }, 'Clock format', sel([[1, '24 hour'], [0, '12 hour']], s.h24 ? 1 : 0, x => { set('h24', x === '1'); window.dispatchEvent(new CustomEvent('bsz:tz-changed')); })),
        h('label', { class: 'dim' }, 'Home city', sel(Object.keys(CITIES).map(c => [c, c]), s.city, x => { set('city', x); if (CITIES[x]?.[0]) setLocalTimezone(CITIES[x][0], x); }))),
      h('section', {}, h('h3', {}, 'Logged in as ' + (S.user?.name || 'Crew Member')), h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, reset, signOut))));
    pop(v.firstChild.children);
  },
});
