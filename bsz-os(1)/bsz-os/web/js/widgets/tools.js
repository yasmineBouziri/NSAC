import { h, iso, pad } from '../core/util.js';
import { defineWidget, pages } from '../core/registry.js';
import { fx } from '../core/fx.js';
import { S } from '../core/state.js';
import { api } from '../core/api.js';
export const report = (metric, value) => api('health/report', { method: 'POST', body: { metric, value } }).catch(() => {});

// AI chat. Backend is swappable: BZG.ai.setBackend(async (messages) => 'reply')
defineWidget({
  id: 'chat', title: 'AI assistant', icon: '✦', group: 'AI', size: 'l', desc: 'Chat with the local model (plug in later)',
  mount(b, c) {
    const hist = (c.cfg.history ||= []);
    const msgs = h('div', { class: 'msgs' }), inp = h('input', { placeholder: 'Ask about your health data', maxlength: 600 });
    const add = (role, text) => { const m = h('div', { class: 'msg ' + (role === 'user' ? 'me' : 'ai') }, text); msgs.append(m); msgs.scrollTop = 1e9; return m; };
    hist.forEach(m => add(m.role, m.content));
    let busy = false;
    const send = async () => {
      const t = inp.value.trim(); if (!t || busy) return;
      busy = true; inp.value = ''; hist.push({ role: 'user', content: t }); add('user', t);
      const m = add('assistant', '...');
      let reply;
      try { reply = await window.BZG.ai.backend(hist.slice(-12)); } catch (e) { reply = 'Error: ' + e.message; }
      m.textContent = '';
      for (let i = 0; i < reply.length; i += 3) { m.textContent = reply.slice(0, i + 3); msgs.scrollTop = 1e9; if (!fx.reduced) await new Promise(r => setTimeout(r, 12)); }
      m.textContent = reply; hist.push({ role: 'assistant', content: reply }); if (hist.length > 40) hist.splice(0, hist.length - 40); c.save(); busy = false;
    };
    inp.onkeydown = e => e.key === 'Enter' && send();
    b.append(h('div', { class: 'chat' }, msgs, h('div', { style: 'display:flex;gap:6px' }, inp, h('button', { class: 'btn', style: 'flex:none', onClick: send }, 'Send'))));
  },
});

defineWidget({
  id: 'breath', title: 'Breathing guide', icon: '❍', group: 'Health', size: 's', desc: 'Box breathing, 4 4 4 4',
  mount(b) {
    const orb = h('div', { class: 'orb' }), lab = h('div', { class: 'orblab' }, 'Ready'), btn = h('button', { class: 'btn' }, 'Start');
    b.append(h('div', { class: 'orbwrap' }, orb, lab), btn);
    const P = [['Inhale', 1.35], ['Hold', 1.35], ['Exhale', 0.7], ['Hold', 0.7]];
    let run = false;
    const loop = async () => {
      for (let i = 0; run; i++) {
        const [n, sc] = P[i % 4]; lab.textContent = n;
        if (!fx.reduced && i % 2 === 0) window.Motion.animate(orb, { scale: sc }, { duration: 4, ease: 'easeInOut' });
        await new Promise(r => setTimeout(r, 4000));
      }
      lab.textContent = 'Ready';
    };
    btn.onclick = () => { run = !run; btn.textContent = run ? 'Stop' : 'Start'; if (run) loop(); };
    return () => { run = false; };
  },
});

defineWidget({
  id: 'mood', title: 'Mood check-in', icon: '☺', group: 'Health', size: 's', desc: 'One tap log, 7 day trend',
  mount(b, c) {
    const log = (c.cfg.log ||= {}), faces = ['☹', '☁', '–', '☺', '★'], row = h('div', { class: 'faces' }), tr = h('div', { class: 'sub dim', style: 'text-align:center' });
    const draw = () => {
      const today = iso(new Date());
      [...row.children].forEach((x, i) => x.classList.toggle('on', log[today] === i + 1));
      const last = Object.keys(log).sort().slice(-7).map(k => log[k]);
      tr.textContent = last.length ? 'Last days: ' + last.join(' ') : 'No entries yet';
    };
    faces.forEach((f, i) => row.append(h('button', { onClick: () => { log[iso(new Date())] = i + 1; c.save(); draw(); report('mood', i + 1); } }, f)));
    b.append(row, tr); draw();
  },
});

// Psychomotor vigilance test, a standard fatigue measure on long missions
defineWidget({
  id: 'pvt', title: 'Reaction test', icon: '⚡', group: 'Health', size: 's', desc: 'Psychomotor vigilance, tracks fatigue',
  mount(b, c) {
    const hist = (c.cfg.hist ||= []);
    const pad_ = h('div', { class: 'pvt' }, 'Click to start'), kv = h('div', { class: 'kv' });
    let st = 'idle', t0 = 0, to;
    const stats = () => { const r = hist.slice(-5); kv.replaceChildren(h('span', { class: 'dim' }, 'Avg last 5'), h('b', {}, r.length ? Math.round(r.reduce((a, x) => a + x, 0) / r.length) + ' ms' : '-'), h('span', { class: 'dim' }, 'Best'), h('b', {}, hist.length ? Math.min(...hist) + ' ms' : '-')); };
    pad_.onclick = () => {
      if (st === 'idle') { st = 'wait'; pad_.className = 'pvt wait'; pad_.textContent = 'Wait for green'; to = setTimeout(() => { st = 'go'; t0 = performance.now(); pad_.className = 'pvt go'; pad_.textContent = 'NOW'; }, 1500 + Math.random() * 3000); }
      else if (st === 'wait') { clearTimeout(to); st = 'idle'; pad_.className = 'pvt'; pad_.textContent = 'Too early. Click to retry'; }
      else { const ms = Math.round(performance.now() - t0); hist.push(ms); if (hist.length > 30) hist.shift(); c.save(); report('pvt_ms', ms); st = 'idle'; pad_.className = 'pvt'; pad_.textContent = ms + ' ms. Click to go again'; stats(); }
    };
    b.append(pad_, kv); stats();
    return () => clearTimeout(to);
  },
});
