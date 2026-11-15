import { S, save } from './state.js';
import { fx, sky } from './fx.js';

export const THEME_METADATA = {
  'high-contrast': {
    name: 'High Contrast',
    motion: 'none',
    contrast: 21.0,
    isHighContrast: true,
    headingFont: 'Atkinson Hyperlegible',
    bodyFont: 'Atkinson Hyperlegible',
    slotRadius: '50%',
    borderWidth: '3px',
    shadow: 'none',
  },
  'low-vision-xl': {
    name: 'Low Vision XL',
    motion: 'none',
    contrast: 19.8,
    isHighContrast: true,
    headingFont: 'Atkinson Hyperlegible',
    bodyFont: 'Atkinson Hyperlegible',
    slotRadius: '14px',
    borderWidth: '2px',
    shadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  'lexior': {
    name: 'Lexior',
    motion: 'none',
    contrast: 12.9,
    isHighContrast: false,
    headingFont: 'Lexend',
    bodyFont: 'Lexend',
    slotRadius: '14px',
    borderWidth: '2px',
    shadow: '0 2px 8px rgba(43,43,43,0.08)',
  },
  'calm': {
    name: 'Low-Stimulation Calm',
    motion: 'none',
    contrast: 12.2,
    isHighContrast: false,
    headingFont: 'Manrope',
    bodyFont: 'Manrope',
    slotRadius: '8px',
    borderWidth: '1px',
    shadow: 'none',
  },
  'night-vision': {
    name: 'Night Vision',
    motion: 'reduced',
    contrast: 5.2,
    isHighContrast: false,
    headingFont: 'Manrope',
    bodyFont: 'Manrope',
    slotRadius: '12px',
    borderWidth: '1px',
    shadow: '0 0 10px rgba(255,107,87,0.15)',
  },
  'monochrome': {
    name: 'Monochrome',
    motion: 'reduced',
    contrast: 17.1,
    isHighContrast: true,
    headingFont: 'Atkinson Hyperlegible',
    bodyFont: 'Atkinson Hyperlegible',
    slotRadius: '8px',
    borderWidth: '2px',
    shadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  'zen-garden': {
    name: 'Zen Garden',
    motion: 'reduced',
    contrast: 12.3,
    isHighContrast: false,
    headingFont: 'Shippori Mincho',
    bodyFont: 'Manrope',
    slotRadius: 'organic',
    borderWidth: '1.5px',
    shadow: '0 4px 14px rgba(45,42,38,0.08)',
  },
  'retro-terminal': {
    name: 'Retro Terminal',
    motion: 'reduced',
    contrast: 15.7,
    isHighContrast: false,
    headingFont: 'VT323',
    bodyFont: 'IBM Plex Mono',
    slotRadius: '0px',
    borderWidth: '1px',
    shadow: '0 0 10px rgba(124,255,138,0.2)',
  },
  'retro-terminal-amber': {
    name: 'Retro Terminal Amber',
    motion: 'reduced',
    contrast: 10.9,
    isHighContrast: false,
    headingFont: 'VT323',
    bodyFont: 'IBM Plex Mono',
    slotRadius: '0px',
    borderWidth: '1px',
    shadow: '0 0 10px rgba(255,176,0,0.2)',
  },
  'deep-ocean': {
    name: 'Deep Ocean',
    motion: 'full',
    contrast: 16.2,
    isHighContrast: false,
    headingFont: 'Outfit',
    bodyFont: 'Sora',
    slotRadius: '50%',
    borderWidth: '1px',
    shadow: '0 0 25px rgba(61,242,224,0.25)',
  },
  'botanical': {
    name: 'Botanical Greenhouse',
    motion: 'reduced',
    contrast: 12.2,
    isHighContrast: false,
    headingFont: 'Fraunces',
    bodyFont: 'Nunito',
    slotRadius: '50%',
    borderWidth: '1.5px',
    shadow: '0 3px 12px rgba(34,48,31,0.08)',
  },
  'dusk-synth': {
    name: 'Dusk Synth',
    motion: 'full',
    contrast: 16.7,
    isHighContrast: false,
    headingFont: 'Audiowide',
    bodyFont: 'Space Grotesk',
    slotRadius: '50%',
    borderWidth: '1.5px',
    shadow: '0 0 20px rgba(0,240,255,0.35)',
  },
  'dusk-synth-toned': {
    name: 'Dusk Synth (Toned)',
    motion: 'reduced',
    contrast: 15.0,
    isHighContrast: false,
    headingFont: 'Audiowide',
    bodyFont: 'Space Grotesk',
    slotRadius: '50%',
    borderWidth: '1.5px',
    shadow: '0 0 15px rgba(224,83,145,0.25)',
  },
  'cozy-hearth': {
    name: 'Cozy Hearth',
    motion: 'reduced',
    contrast: 14.5,
    isHighContrast: false,
    headingFont: 'Fraunces',
    bodyFont: 'Nunito',
    slotRadius: '22px',
    borderWidth: '1.5px',
    shadow: '0 4px 18px rgba(232,162,74,0.15)',
  },
  'mischief-plush': {
    name: 'Mischief Plush',
    motion: 'full',
    contrast: 10.4,
    isHighContrast: false,
    headingFont: 'Nunito',
    bodyFont: 'Nunito',
    slotRadius: '50%',
    borderWidth: '3px',
    shadow: '0 4px 0 rgba(90,59,46,0.35)',
  },
};

export const THEMES = [
  ['high-contrast', 'High Contrast', '#FFFF00,#000000'],
  ['low-vision-xl', 'Low Vision XL', '#0B3D91,#5A2D82'],
  ['lexior', 'Lexior', '#FBF4E4,#2F6F8F'],
  ['calm', 'Low-Stimulation Calm', '#1E2326,#8FB3A3'],
  ['night-vision', 'Night Vision (Red)', '#080000,#FF6B57'],
  ['monochrome', 'Monochrome', '#0F0F0F,#FFFFFF'],
  ['zen-garden', 'Zen Garden', '#F2EEE6,#6B7F5E'],
  ['retro-terminal', 'Retro Terminal', '#050A05,#7CFF8A'],
  ['retro-terminal-amber', 'Retro Terminal Amber', '#0A0700,#FFB000'],
  ['deep-ocean', 'Deep Ocean', '#00141F,#3DF2E0'],
  ['botanical', 'Botanical Greenhouse', '#EEF1E6,#4F7A4A'],
  ['dusk-synth', 'Dusk Synth', '#1A0B3B,#00F0FF'],
  ['dusk-synth-toned', 'Dusk Synth (Toned)', '#120726,#E05391'],
  ['cozy-hearth', 'Cozy Hearth', '#1F1612,#E8A24A'],
  ['mischief-plush', 'Mischief Plush', '#EFE3D6,#8E5BB5'],
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
  if (!S.data.settings) S.data.settings = {};
  const s = S.data.settings;
  const k = themeKey || s.theme || localStorage.getItem('nc-theme4') || 'aurora';
  s.theme = k;
  document.documentElement.dataset.theme = k;
  document.body.dataset.density = s.density || 'comfortable';

  const meta = THEME_METADATA[k] || { motion: 'full' };
  const themeMotion = meta.motion || 'full';
  document.documentElement.dataset.themeMotion = themeMotion;

  // Reduce motion triggers:
  // 1. User selected 'reduced' or 'none' in settings
  // 2. System prefers-reduced-motion media query
  // 3. Theme default motion is 'none' or 'reduced' (unless user explicitly overrode to 'full')
  const userSetting = s.motion;
  const systemPrefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  let effectiveMotion;
  if (userSetting === 'none') {
    effectiveMotion = 'none';
  } else if (userSetting === 'reduced' || systemPrefersReduced) {
    effectiveMotion = 'reduced';
  } else if (userSetting === 'full') {
    effectiveMotion = themeMotion === 'none' ? 'none' : 'full';
  } else {
    effectiveMotion = themeMotion;
  }

  document.documentElement.dataset.motion = effectiveMotion;
  const isReducedOrNone = effectiveMotion === 'reduced' || effectiveMotion === 'none';
  document.body.classList.toggle('rm', isReducedOrNone);

  fx.reduced = isReducedOrNone;
  sky.on = effectiveMotion !== 'none' && s.stars !== false && themeMotion !== 'none';

  try { localStorage.setItem('nc-theme4', k); } catch (e) {}
  document.querySelectorAll('#th button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
}

export function setTheme(k) {
  if (!S.data.settings) S.data.settings = {};
  S.data.settings.theme = k;
  applyTheme(k);
  save();
}
