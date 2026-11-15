import { h } from './util.js';
import { api } from './api.js';
import { S, CITIES, loadState, save } from './state.js';
import { fx } from './fx.js';

export function authScreen(root, onDone) {
  let mode = 'login';
  const name = h('input', { autocomplete: 'username', maxlength: 24, placeholder: 'Crew Name' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'At least 8 characters' });
  const city = h('select', {}, Object.keys(CITIES).sort((a, b) => a.localeCompare(b))
    .map(c => h('option', { value: c, selected: c === 'Houston' }, c)));
  const cityL = h('label', { hidden: true }, 'Home city (Earth side)', city);
  const err = h('div', { class: 'err' });
  const go = h('button', { class: 'go' }, 'SIGN IN');
  const tabs = ['login', 'register'].map(m => h('button', { class: m === mode ? 'on' : '', onClick: () => set(m) }, m === 'login' ? 'Sign in' : 'Create account'));
  const panel = h('div', { class: 'apanel' }, h('h1', {}, h('b', {}, 'BSZ'), '-OS'), h('div', { class: 'tag' }, 'Blood, Sweat and Zero-G'),
    h('div', { class: 'tabs' }, tabs), h('label', {}, 'Crew name', name), h('label', {}, 'Password', pw), cityL, err, go);
  function set(m) {
    mode = m; tabs.forEach((t, i) => t.classList.toggle('on', ['login', 'register'][i] === m));
    cityL.hidden = m === 'login'; go.textContent = m === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT';
    pw.autocomplete = m === 'login' ? 'current-password' : 'new-password'; err.textContent = '';
  }
  const submit = async () => {
    err.textContent = '';
    try {
      S.user = await api('auth/' + mode, { method: 'POST', body: { name: name.value, password: pw.value } });
      await loadState();
      if (mode === 'register') { S.data.settings.city = city.value; S.data.widgets.forEach(w => { w.cfg = {}; }); save(); }
      root.replaceChildren(); onDone();
      window.BZG?.ai?.warmup?.().catch(e => console.warn('AI warm-up failed:', e));
    } catch (e) {
      err.textContent = e.message;
      if (!fx.reduced) window.Motion.animate(panel, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
    }
  };
  go.onclick = submit;
  panel.addEventListener('keydown', e => e.key === 'Enter' && submit());
  root.replaceChildren(h('div', { class: 'auth' }, panel));
  if (!fx.reduced && window.Motion) {
    try {
      window.Motion.animate(panel, { y: [20, 0], scale: [0.96, 1] }, { duration: 0.35, easing: 'ease-out' });
    } catch (e) {}
  }
  name.focus();
}
