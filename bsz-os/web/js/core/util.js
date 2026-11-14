export const $ = (s, r = document) => r.querySelector(s);
export const pad = n => String(n).padStart(2, '0');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
export const every = (fn, ms = 1000) => { fn(); const i = setInterval(fn, ms); return () => clearInterval(i); };
