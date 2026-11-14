import { h, iso } from '../core/util.js';
import { defineWidget } from '../core/registry.js';

defineWidget({
  id: 'calendar', title: 'Calendar', icon: '▤', group: 'Time', size: 'l', desc: 'Month view with saved events',
  mount(b, c) {
    const ev = (c.cfg.events ||= {});
    const ref = new Date(); ref.setDate(1);
    let sel = iso(new Date());
    const head = h('div', { class: 'calhead' }), grid = h('div', { class: 'calgrid' }), list = h('div', { class: 'evlist' });
    const inp = h('input', { placeholder: 'Add event, press Enter', maxlength: 80 });
    const draw = () => {
      head.replaceChildren(h('button', { class: 'ico', onClick: () => { ref.setMonth(ref.getMonth() - 1); draw(); } }, '‹'),
        h('b', {}, ref.toLocaleString('en-GB', { month: 'long', year: 'numeric' })),
        h('button', { class: 'ico', onClick: () => { ref.setMonth(ref.getMonth() + 1); draw(); } }, '›'));
      grid.replaceChildren(...'MTWTFSS'.split('').map(x => h('span', { class: 'dow' }, x)));
      const first = (ref.getDay() + 6) % 7, n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(), today = iso(new Date());
      for (let i = 0; i < first; i++) grid.append(h('span'));
      for (let d = 1; d <= n; d++) {
        const k = iso(new Date(ref.getFullYear(), ref.getMonth(), d));
        grid.append(h('button', { class: 'day' + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + (ev[k]?.length ? ' has' : ''), onClick: () => { sel = k; draw(); } }, d));
      }
      list.replaceChildren(h('small', { class: 'dim' }, sel), ...(ev[sel] || []).map((t, i) => h('div', { class: 'ev' }, h('span', {}, t),
        h('button', { class: 'ico', onClick: () => { ev[sel].splice(i, 1); if (!ev[sel].length) delete ev[sel]; c.save(); draw(); } }, '×'))));
    };
    inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) { (ev[sel] ||= []).push(inp.value.trim()); inp.value = ''; c.save(); draw(); } };
    b.append(head, grid, list, inp); draw();
  },
});
