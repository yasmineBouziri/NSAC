import { h, uid } from './util.js';
import { S, save, CITIES } from './state.js';
import { widgets } from './registry.js';
import { fx, pop, flip } from './fx.js';

const SIZES = { s: 'S', m: 'M', l: 'L', x: 'Wide' };
const GROUPS = ['Time', 'Space', 'Health', 'Games', 'AI'];

function cfgForm(def, w, done) {
  return h('div', { class: 'cfg' }, def.cfg.map(f => {
    const v = w.cfg[f.key] ?? (f.type === 'city' ? S.data.settings.city : f.def ?? '');
    let i;
    if (f.type === 'city' || f.type === 'select') {
      const opts = f.type === 'city' ? Object.keys(CITIES) : f.options;
      i = h('select', {}, opts.map(o => h('option', { value: o, selected: o === v }, o)));
    } else i = h('input', { type: f.type === 'datetime' ? 'datetime-local' : 'text', value: v });
    i.onchange = () => { w.cfg[f.key] = i.value; save(); done(); };
    return h('label', {}, f.label, i);
  }));
}

// Renders a grid of widget instances. editable=true gives drag, resize, config, remove and the add tile.
export function mountGrid(view, items, editable, note) {
  const grid = h('div', { class: 'grid' });
  const built = new Set();
  let drag = null, last = 0;

  const commit = () => {
    S.data.widgets = [...grid.querySelectorAll('.card')].map(c => S.data.widgets.find(x => x.uid === c.dataset.uid)).filter(Boolean);
    save();
  };

  function build(w) {
    const def = widgets.get(w.type);
    if (!def) return null;
    w.cfg ||= {};
    const badge = h('span', { class: 'badge', hidden: true, title: 'Simulated data. No live source connected.' }, 'SIM');
    const body = h('div', { class: 'wbody' });
    const head = h('header', { class: 'whead' }, h('span', { class: 'wicon' }, def.icon), h('h3', {}, def.title), badge);
    const el = h('section', { class: 'card', 'data-size': w.size, 'data-uid': w.uid, 'data-widget': w.type }, h('div', { class: 'inner' }, head, body));
    let cleanup;
    const mount = () => {
      cleanup && cleanup(); body.replaceChildren(); badge.hidden = true;
      try { cleanup = def.mount(body, { cfg: w.cfg, save, S: S.data, sim: b => (badge.hidden = !b) }); }
      catch (e) { console.error(e); body.append(h('p', { class: 'err' }, 'Widget error: ' + e.message)); }
    };
    el._destroy = () => cleanup && cleanup();
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    if (editable) {
      const move = d => {
        const sib = d < 0 ? el.previousElementSibling : el.nextElementSibling;
        if (!sib || !sib.classList.contains('card')) return;
        flip(grid, () => grid.insertBefore(el, d < 0 ? sib : sib.nextElementSibling)); commit();
      };
      const sizeBtns = Object.entries(SIZES).map(([k, l]) => h('button', {
        class: k === w.size ? 'on' : '',
        onClick: e => {
          flip(grid, () => { w.size = k; el.dataset.size = k; });
          e.target.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target)); save();
        },
      }, l));
      const cfgBox = h('div');
      const menu = h('div', { class: 'menu', hidden: true },
        h('div', { class: 'row' }, sizeBtns), h('div', { class: 'row' }, h('button', { onClick: () => move(-1) }, '◀ Earlier'), h('button', { onClick: () => move(1) }, 'Later ▶')),
        cfgBox, h('button', { class: 'btn rm', onClick: () => remove() }, 'Remove'));
      if (def.cfg) cfgBox.append(cfgForm(def, w, mount));
      const remove = () => {
        const done = () => { cleanup && cleanup(); el.remove(); built.delete(el); S.data.widgets = S.data.widgets.filter(x => x !== w); save(); };
        if (fx.reduced) return done();
        window.Motion.animate(el, { opacity: 0, scale: 0.8 }, { duration: 0.22 }).then(() => flip(grid, done));
      };
      head.append(h('button', { class: 'ico', title: 'Options', onClick: () => (menu.hidden = !menu.hidden) }, '⋯'));
      el.firstChild.append(menu);
      head.draggable = true;
      head.ondragstart = e => { drag = el; el.classList.add('drag'); e.dataTransfer.setDragImage(el, 20, 20); e.dataTransfer.effectAllowed = 'move'; };
      head.ondragend = () => { el.classList.remove('drag'); drag = null; commit(); };
    }
    mount(); built.add(el);
    return el;
  }

  if (editable) {
    grid.addEventListener('dragover', e => {
      if (!drag) return;
      e.preventDefault();
      const t = e.target.closest('.card');
      if (!t || t === drag || Date.now() - last < 140) return;
      const r = t.getBoundingClientRect();
      const after = (e.clientY - r.top) / r.height + (e.clientX - r.left) / r.width > 1;
      const ref = after ? t.nextElementSibling : t;
      if (ref === drag || ref === drag.nextElementSibling) return;
      last = Date.now(); flip(grid, () => grid.insertBefore(drag, ref));
    });
    document.addEventListener('click', hideMenus);
  }

  const els = items.map(build).filter(Boolean);
  grid.append(...els);
  let tile;
  if (editable) {
    tile = h('button', { class: 'addtile', onClick: () => catalog(d => {
      const w = { uid: uid(), type: d.id, size: d.size, cfg: {} };
      S.data.widgets.push(w); save();
      const el = build(w); grid.insertBefore(el, tile); pop([el]); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }) }, h('span', {}, '+'), 'Add widget');
    grid.append(tile);
  }
  view.replaceChildren(...(note ? [h('div', { class: 'note' }, note)] : []), grid);
  pop([...grid.children]);
  return () => { document.removeEventListener('click', hideMenus); built.forEach(e => e._destroy()); };
}

function hideMenus(e) {
  if (e.target.closest('.menu,[title=Options]')) return;
  document.querySelectorAll('.menu:not([hidden])').forEach(m => (m.hidden = true));
}

function catalog(onPick) {
  const q = h('input', { placeholder: 'Search widgets', autofocus: true });
  const body = h('div');
  const close = () => { document.removeEventListener('keydown', esc); m.remove(); };
  const esc = e => e.key === 'Escape' && close();
  const tiles = [];
  for (const g of GROUPS) {
    const list = [...widgets.values()].filter(d => d.group === g);
    if (!list.length) continue;
    const row = h('div', { class: 'tiles' }, list.map(d => {
      const t = h('button', { class: 'tile', onClick: () => { close(); onPick(d); } }, h('i', {}, d.icon), h('b', {}, d.title), h('small', {}, d.desc));
      t._k = (d.title + d.desc + g).toLowerCase(); tiles.push(t); return t;
    }));
    body.append(h('h4', {}, g), row);
  }
  q.oninput = () => tiles.forEach(t => (t.style.display = t._k.includes(q.value.toLowerCase()) ? '' : 'none'));
  const m = h('div', { class: 'modal', onClick: e => e.target === m && close() },
    h('div', { class: 'sheet' }, h('header', {}, h('h2', {}, 'Add widget'), q, h('button', { class: 'ico', onClick: close }, '✕')), body));
  document.body.append(m); document.addEventListener('keydown', esc);
  if (!fx.reduced) window.Motion.animate(m, { opacity: [0, 1] }, { duration: 0.18 });
  pop(tiles);
  q.focus();
}
