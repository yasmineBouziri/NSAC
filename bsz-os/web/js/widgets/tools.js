import { h, iso, pad } from '../core/util.js';
import { defineWidget, pages } from '../core/registry.js';
import { fx } from '../core/fx.js';
import { S } from '../core/state.js';
import { api } from '../core/api.js';
export const report = (metric, value) => api('health/report', { method: 'POST', body: { metric, value } }).catch(() => {});

// AI chat. Backend is swappable: BZG.ai.setBackend(async (messages) => 'reply')
defineWidget({
  id: 'chat', title: 'AI assistant', icon: '✦', group: 'AI', size: 'l', desc: 'Personalized local health assistant',
  mount(b, c) {
    const pending = window.BZG?.ai?.pending;
    let conversationId = pending?.conversationId || null, hist = pending?.history || [];
    window.BZG.ai.pending = null;
    const list = h('div', { class: 'chat-history' }), msgs = h('div', { class: 'msgs' }), inp = h('input', {
      type: 'text', placeholder: 'Ask about your health data', maxlength: 600,
      autocomplete: 'off', autocapitalize: 'sentences', spellcheck: 'true',
    });
    const search = h('input', { class: 'chat-search', placeholder: 'Search conversations', type: 'search' });
    const category = h('select', { class: 'chat-category' }, ...[['current', 'Current'], ['active', 'Active'], ['inactive', 'Inactive'], ['archived', 'Archived'], ['deleted', 'Deleted']].map(([v, t]) => h('option', { value: v }, t)));
    const title = h('b', { class: 'chat-current-title' }, 'New conversation');
    const renderMessages = () => { msgs.replaceChildren(); hist.forEach(m => add(m.role, m.content)); };
    const add = (role, text) => { const m = h('div', { class: 'msg ' + (role === 'user' ? 'me' : 'ai') }, text); msgs.append(m); msgs.scrollTop = 1e9; return m; };
    const loadMessages = async id => {
      hist = await api('ai/messages?conversation_id=' + encodeURIComponent(id));
      conversationId = id; renderMessages();
    };
    const changeConversation = async (id, action) => {
      await api('ai/conversation', { method: 'POST', body: { conversation_id: id, action } });
      if (id === conversationId) newChat();
      await loadConversations();
    };
    const loadConversations = async () => {
      const qs = new URLSearchParams({ category: category.value });
      if (search.value.trim()) qs.set('search', search.value.trim());
      const rows = await api('ai/conversations?' + qs);
      list.replaceChildren(...rows.map(row => {
        const open = h('button', { class: 'chat-history-open', onClick: async () => {
          await loadMessages(row.id); title.textContent = row.title; await loadConversations();
        } }, h('b', {}, row.title), h('small', {}, new Date(row.updated_at * 1000).toLocaleString()));
        const actions = h('div', { class: 'chat-history-actions' },
          category.value === 'archived' ? h('button', { title: 'Restore', onClick: () => changeConversation(row.id, 'restore') }, 'Restore') :
            h('button', { title: 'Archive', onClick: () => changeConversation(row.id, 'archive') }, 'Archive'),
          h('button', { title: 'Delete permanently', onClick: () => {
            if (confirm('Delete this conversation permanently?')) changeConversation(row.id, 'delete');
          } }, 'Delete'));
        return h('div', { class: 'chat-history-item' + (row.id === conversationId ? ' selected' : '') }, open, actions);
      }));
      if (!conversationId && rows[0]) { await loadMessages(rows[0].id); title.textContent = rows[0].title; }
      const current = rows.find(row => row.id === conversationId);
      if (current) title.textContent = current.title;
      return rows;
    };
    const newChat = () => { conversationId = null; hist = []; title.textContent = 'New conversation'; renderMessages(); inp.focus(); };
    renderMessages();
    let busy = false;
    const send = async () => {
      const t = inp.value.trim(); if (!t || busy) return;
      busy = true; inp.value = ''; hist.push({ role: 'user', content: t }); add('user', t);
      const m = add('assistant', 'Thinking');
      m.classList.add('thinking');
      let reply;
      try {
        reply = await window.BZG.ai.backend(hist.slice(-12), {
          stream: true,
          conversationId,
          onConversation: id => { conversationId = id; c.cfg.conversationId = id; },
          onToken: text => { m.classList.remove('thinking'); m.textContent = text; msgs.scrollTop = 1e9; },
        });
      } catch (e) {
        console.error('Assistant request failed:', e);
        reply = 'AI unavailable: ' + (e?.message || 'check runtime_bootstrap.py --check');
      }
      m.classList.remove('thinking');
      m.textContent = reply; hist.push({ role: 'assistant', content: reply }); if (hist.length > 40) hist.splice(0, hist.length - 40); busy = false; await loadConversations();
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    };
    search.oninput = () => loadConversations().catch(console.error);
    category.onchange = () => loadConversations().catch(console.error);
    b.append(h('div', { class: 'chat-dashboard' },
      h('aside', { class: 'chat-history-panel' }, h('div', { class: 'chat-history-head' }, h('b', {}, 'Conversations'), h('button', { class: 'btn', onClick: newChat }, 'New')), category, search, list),
      h('section', { class: 'chat-main' }, h('header', { class: 'chat-main-head' }, h('span', { class: 'zibo-avatar' }, '👽'), title), h('div', { class: 'chat' }, msgs, h('div', { style: 'display:flex;gap:6px' }, inp, h('button', { class: 'btn', style: 'flex:none', onClick: send }, 'Send'))))));
    loadConversations().catch(e => { console.error('Conversation history failed:', e); });
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
