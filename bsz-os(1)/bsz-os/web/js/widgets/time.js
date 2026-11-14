import { h, pad, every } from '../core/util.js';
import { defineWidget } from '../core/registry.js';
import { CITIES, S } from '../core/state.js';

const city = c => c.city || S.data.settings.city;
const tzOf = c => CITIES[city(c)]?.[0] || 'UTC';
const parts = z => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: z, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hourCycle: S.data.settings.h24 ? 'h23' : 'h12',
}).formatToParts(new Date()).map(p => [p.type, p.value]));
const hour24 = z => +new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: 'numeric', hourCycle: 'h23' }).format();
const digits = z => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format().replace(/\D/g, '');
const offset = z => {
  const d = new Date();
  return Math.round((new Date(d.toLocaleString('en-US', { timeZone: z })) - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 18e5) / 2;
};

defineWidget({
  id: 'citytime', title: 'Time and date', icon: '◷', group: 'Time', size: 'm', desc: 'Clock and date for any city', cfg: [{ key: 'city', label: 'City', type: 'city' }],
  mount(b, c) {
    const t = h('div', { class: 'bigtime' }), d = h('div', { class: 'sub' }), o = h('div', { class: 'sub dim' });
    b.append(t, d, o);
    return every(() => {
      const z = tzOf(c.cfg), p = parts(z), off = offset(z);
      t.replaceChildren(p.hour, h('em', {}, ':'), p.minute, h('small', {}, ':' + p.second + (p.dayPeriod ? ' ' + p.dayPeriod.toUpperCase() : '')));
      d.textContent = `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
      const hr = hour24(z);
      o.textContent = `${city(c.cfg)}   UTC${off >= 0 ? '+' : ''}${off}   ${hr >= 6 && hr < 18 ? 'Day' : 'Night'}`;
    });
  },
});

defineWidget({
  id: 'met', title: 'Mission elapsed time', icon: '⏱', group: 'Time', size: 'm', desc: 'Time since launch or any start point',
  cfg: [{ key: 'name', label: 'Label', type: 'text', def: 'Mission' }, { key: 'start', label: 'Start', type: 'datetime' }],
  mount(b, c) {
    if (!c.cfg.start) { const d = new Date(); c.cfg.start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; c.save(); }
    const t = h('div', { class: 'bigtime' }), l = h('div', { class: 'sub dim' });
    b.append(t, l);
    return every(() => {
      let s = Math.max(0, Math.floor((Date.now() - new Date(c.cfg.start)) / 1000)) || 0;
      const d = Math.floor(s / 86400); s %= 86400;
      t.replaceChildren(`${d}d `, `${pad(Math.floor(s / 3600))}`, h('em', {}, ':'), pad(Math.floor((s % 3600) / 60)), h('small', {}, ':' + pad(s % 60)));
      l.textContent = `${c.cfg.name || 'Mission'}  MET`;
    });
  },
});
