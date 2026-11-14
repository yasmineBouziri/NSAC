import { S, save } from './state.js';
import { fx, sky } from './fx.js';

export const THEMES = [
  ['aurora', 'Aurora', '#9fd8cf,#7f86c9'],
  ['nebula', 'Nebula Horizon', '#f6c27a,#6fa8dc'],
  ['hud', 'Neon Command', '#19e6ff,#ff3dac'],
  ['retro', 'Mission Control 70s', '#e8602c,#efb23a'],
  ['paper', 'Ink and Paper', '#f4efe4,#a8483a'],
  ['clay', 'Soft Clay', '#dfe3f1,#6c74f0'],
  ['brutal', 'Brutalist', '#ffe14d,#ff4d6d'],
  ['glass', 'Liquid Glass', '#7b5cff,#ff7ab8'],
  ['access', 'Colorblind-safe', '#0072B2,#E69F00'],
];

export function applyTheme(themeKey) {
  const s = S.data.settings;
  const k = themeKey || s.theme || localStorage.getItem('nc-theme4') || 'aurora';
  s.theme = k;
  document.documentElement.dataset.theme = k;
  document.body.dataset.density = s.density || 'comfortable';
  fx.reduced = s.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  sky.on = !!s.stars;
  try { localStorage.setItem('nc-theme4', k); } catch (e) {}
  document.querySelectorAll('#th button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
}

export function setTheme(k) {
  if (!S.data.settings) S.data.settings = {};
  S.data.settings.theme = k;
  applyTheme(k);
  save();
}
