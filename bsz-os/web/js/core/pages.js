import { h, uid } from './util.js';
import { api } from './api.js';
import { S, save, CITIES, DEF } from './state.js';
import { definePage, defineApplet, widgets } from './registry.js';
import { mountGrid } from './dashboard.js';
import { applyTheme, setTheme, THEMES } from './theme.js';
import { pop } from './fx.js';
import { mountClockApplet } from '../widgets/clockApplet.js';
import { setLocalTimezone } from '../lib/timezones.js';
import { mountSudoku } from '../games/sudoku.js';
import { mountChess } from '../games/chess.js';
import { mountPinball } from '../games/spacecadet.js';
import { mountHealthCenter } from '../health-center/index.js';

const fixed = (ids, size) => ids.map(id => ({ uid: uid(), type: id, size: size?.[id] || widgets.get(id)?.size || 'm', cfg: {} }));
const SIMNOTE = 'Preview with simulated data. Connect the matching engine to make these widgets live.';

// ---- Applets. Each one embeds reusable parts (widgets) via parts(). ----
const parts = (ids, size, note) => v => mountGrid(v, fixed(ids, size), false, note);
const A = (id, title, icon, group, desc, render) => defineApplet({ id, title, icon, group, desc, render });

function gamesRoom(view) {
  view.classList.add('games-view');
  const choices = [
    { id: 'chess', title: 'Star Chess', icon: '♞', tag: 'Tactical Command', desc: 'Deep-space chess with 2D radar grid and 3D planetary orbit view', hint: 'Click pieces to move · In 3D: drag to orbit, scroll to zoom' },
    { id: 'pinball', title: 'Space Cadet Pinball', icon: '✦', tag: 'Arcade Classic', desc: 'Cosmic arcade pinball with reactor missions and LED score marquee', hint: 'Space / Hold: Plunger · A/D or ◀/▶: Flippers · W: Nudge table' },
    { id: 'sudoku', title: 'Planet Sudoku', icon: '⊕', tag: 'Celestial Logic', desc: 'Align 9 solar bodies across quadrants without gravitational conflict', hint: 'Select orbital cell, then choose a planet from the solar palette' },
    { id: 'g2048', title: '2048 Orbital', icon: '▣', tag: 'Gravitational Strategy', desc: 'Slide cosmic numbered bodies to fuse matter and reach the 2048 stellar core', hint: 'Arrow keys, WASD, or swipe to slide orbital tiles' },
    { id: 'snake', title: 'Star Snake', icon: '∿', tag: 'Arcade Survival', desc: 'Maneuver the star-crawler to collect radiant cosmic energy plasma', hint: 'Arrow keys, WASD, or swipe on screen to steer' },
  ];

  // Root menu container
  const menu = h('div', { class: 'games-menu games-dial-container', tabindex: '0' });

  // Center showcase card
  const tagEl = h('span', { class: 'games-showcase-tag' }, choices[0].tag);
  const titleEl = h('h3', { class: 'games-showcase-title' }, choices[0].icon + ' ' + choices[0].title);
  const descEl = h('p', { class: 'games-showcase-desc' }, choices[0].desc);
  const hintEl = h('div', { class: 'games-showcase-hint' }, choices[0].hint);
  const launchBtn = h('button', { class: 'pill open-pill games-launch-btn' }, 'Launch Mission ▶');
  const showcase = h('div', { class: 'games-showcase' }, tagEl, titleEl, descEl, hintEl, launchBtn);

  // Dial rim
  const dialRim = h('div', { class: 'games-dial-rim' });
  const dialDisk = h('div', { class: 'games-dial-disk' });
  const arrL = h('button', { class: 'games-dial-arr l', 'aria-label': 'Previous game' }, '‹');
  const arrR = h('button', { class: 'games-dial-arr r', 'aria-label': 'Next game' }, '›');
  dialRim.append(dialDisk, arrL, arrR);

  menu.append(showcase, dialRim);

  // Stage container
  const stage = h('div', { class: 'games-stage', hidden: true });
  const hudBack = h('button', { class: 'pill sm games-hud-back', onClick: () => stop() }, '‹ Games Menu');
  const hudBadge = h('span', { class: 'games-stage-badge' }, '🎮 Games');
  const hudPause = h('button', { class: 'pill sm games-hud-pause', onClick: () => togglePause() }, '⏸ Pause (Esc)');
  const hudBar = h('div', { class: 'games-hud-bar' }, hudBack, hudBadge, hudPause);
  const stageHost = h('div', { class: 'games-stage-host' });
  stage.append(hudBar, stageHost);

  // Pause overlay
  const pause = h('div', { class: 'games-pause', hidden: true },
    h('h2', {}, 'Mission Paused ⏸'),
    h('p', {}, 'Press Esc or Resume to continue your game, or return to the Games Menu.'),
    h('div', { class: 'games-actions' },
      h('button', { class: 'pill open-pill', onClick: () => togglePause() }, 'Resume Game ▶'),
      h('button', { class: 'pill', onClick: () => stop() }, 'Quit to Menu ✕'),
    ),
  );

  let cleanup = null;
  let active = null;
  let paused = false;
  let pos = 0;
  const N = choices.length;
  const half = Math.floor(N / 2);
  const slots = [];

  const updateShowcase = () => {
    const cur = choices[pos];
    tagEl.textContent = cur.tag;
    titleEl.textContent = cur.icon + ' ' + cur.title;
    descEl.textContent = cur.desc;
    hintEl.textContent = cur.hint;
    hudBadge.textContent = cur.icon + ' ' + cur.title;
  };

  const layoutDial = () => {
    slots.forEach((el, k) => {
      const d = ((k - pos + half) % N + N) % N - half;
      const s = d === 0;
      el._d = d;
      el.style.transform = 'rotate(' + (d * 38) + 'deg) translateY(calc(var(--GDR, 260px) * -1)) rotate(' + (-d * 38) + 'deg) scale(' + (s ? 1.36 : 1) + ')';
      el.classList.toggle('sel', s);
      el.setAttribute('aria-current', s);
    });
    updateShowcase();
  };

  const go = newPos => {
    pos = ((newPos % N) + N) % N;
    layoutDial();
  };

  choices.forEach((g, k) => {
    const r = Math.random;
    const b = h('button', {
      class: 'games-slot slot' + (k === 0 ? ' sel' : ''),
      'aria-label': g.title,
      title: g.title,
    },
      h('span', { class: 'o' }, g.icon),
      h('span', { class: 'slot-lbl' }, g.title),
    );
    b.style.cssText = '--jr:' + (r() * 0.04 - 0.01).toFixed(3) + ';--du:' + (4 + r() * 4).toFixed(1) + 's;--dl:-' + (r() * 5).toFixed(1) + 's';
    b.onclick = () => {
      if (k === pos) {
        select(g.id);
      } else {
        go(k);
      }
    };
    b.ondblclick = () => {
      select(g.id);
    };
    dialRim.appendChild(b);
    slots.push(b);
  });

  arrL.onclick = () => go(pos - 1);
  arrR.onclick = () => go(pos + 1);
  launchBtn.onclick = () => select(choices[pos].id);

  let wheelThrottle = 0;
  dialRim.onwheel = e => {
    e.preventDefault();
    const now = Date.now();
    if (now - wheelThrottle < 180) return;
    wheelThrottle = now;
    go(pos + (e.deltaY > 0 ? 1 : -1));
  };

  const stop = () => {
    cleanup?.();
    cleanup = null;
    stageHost.replaceChildren();
    stage.hidden = true;
    pause.hidden = true;
    menu.hidden = false;
    active = null;
    paused = false;
    hudBadge.textContent = '🎮 Games';
  };

  const togglePause = () => {
    if (!active) return;
    paused = !paused;
    pause.hidden = !paused;
    stage.classList.toggle('paused', paused);
  };

  const select = id => {
    const def = choices.find(x => x.id === id);
    if (!def) return;
    active = id;
    menu.hidden = true;
    stage.hidden = false;
    hudBadge.textContent = def.icon + ' ' + def.title;
    stageHost.replaceChildren();
    if (id === 'pinball') {
      cleanup = mountPinball(stageHost);
    } else if (id === 'chess' || id === 'sudoku') {
      cleanup = id === 'sudoku' ? mountSudoku(stageHost) : mountChess(stageHost);
    } else {
      const widget = widgets.get(id);
      cleanup = widget.mount(stageHost, { cfg: {}, save, S: S.data, sim: () => {} });
    }
    stageHost.querySelector('[tabindex],button,canvas')?.focus();
  };

  view.append(menu, stage, pause);
  layoutDial();

  const onKey = e => {
    if (e.key === 'Escape' && active) {
      e.preventDefault();
      togglePause();
      return;
    }
    if (!active && !menu.hidden) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1); }
      else if (e.key === 'Enter') {
        if (e.repeat) return;
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        select(choices[pos].id);
      }
    }
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
A('health', 'Health Center', '✚', 'Health', 'Physical, mental, and environmental health', v => mountHealthCenter(v));
A('clock', 'Clock', '◷', 'Time', 'World time, alarms, stopwatch, timer, mission elapsed time, calendar', v => mountClockApplet(v));
const aiPage = v => {
  const body = h('div', { class: 'ai-page-chat' });
  const healthBack = window.BZG?.ai?.healthCenterBack;
  const back = typeof healthBack === 'function'
    ? h('button', { class: 'pill sm health-center-return', onClick: () => {
      window.BZG.ai.healthCenterBack = null;
      healthBack();
    } }, '← Back to Health Center')
    : null;
  v.replaceChildren(...(back ? [back, body] : [body]));
  return widgets.get('chat').mount(body, { cfg: {}, save, S: S.data, sim: () => {} });
};
A('assistant', 'AI Chatbot', '✦', 'AI', 'Local AI chat with Zibo', aiPage);
A('games', 'Games', '◉', 'Fun', 'Choose a game to play', gamesRoom);

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
