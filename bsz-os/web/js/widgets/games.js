import { h } from '../core/util.js';
import { defineWidget } from '../core/registry.js';
import { fx } from '../core/fx.js';
import { move, spawn, canMove, snakeNew, snakeStep } from '../lib/gamelogic.js';

const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
const swipe = (el, fn) => {
  let x, y;
  el.addEventListener('pointerdown', e => { x = e.clientX; y = e.clientY; });
  el.addEventListener('pointerup', e => {
    const dx = e.clientX - x, dy = e.clientY - y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    fn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  });
};
defineWidget({
  id: 'snake', title: 'Snake', icon: '∿', group: 'Internal', size: 'm', desc: 'Arrow keys, WASD or swipe',
  mount(b, c) {
    const cv = h('canvas', { width: 320, height: 320 }), info = h('div', { class: 'kv', style: 'width:100%' });
    const box = h('div', { class: 'game', tabindex: 0 }, info, cv); b.append(box);
    const cx = cv.getContext('2d'), acc = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    let s = snakeNew(), next = null, running = false, timer;
    const draw = () => {
      const k = cv.width / s.n; cx.clearRect(0, 0, cv.width, cv.height);
      s.body.forEach((p, i) => { cx.fillStyle = acc(); cx.globalAlpha = 1 - (i / s.body.length) * 0.6; cx.shadowColor = acc(); cx.shadowBlur = 8; cx.fillRect(p[0] * k + 1, p[1] * k + 1, k - 2, k - 2); });
      cx.globalAlpha = 1; cx.fillStyle = '#3ddc97'; cx.shadowColor = '#3ddc97'; cx.fillRect(s.food[0] * k + 3, s.food[1] * k + 3, k - 6, k - 6); cx.shadowBlur = 0;
      if (!running) { cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#fff'; cx.font = '18px sans-serif'; cx.textAlign = 'center'; cx.fillText(s.dead ? 'Game over. Click to retry' : 'Click or press a key', cv.width / 2, cv.height / 2); }
      info.replaceChildren(h('span', {}, 'Score ' + s.score), h('span', { class: 'dim' }, 'Best ' + (c.cfg.best || 0)));
    };
    const tick = () => {
      snakeStep(s, next); next = null;
      if (s.dead) { running = false; clearInterval(timer); if (s.score > (c.cfg.best || 0)) { c.cfg.best = s.score; c.save(); } }
      draw();
    };
    const start = () => { if (running) return; if (s.dead) s = snakeNew(); running = true; timer = setInterval(tick, 110); draw(); };
    const steer = d => { next = d; start(); };
    box.addEventListener('keydown', e => { const d = DIRS[e.key]; if (d) { e.preventDefault(); steer(d); } });
    box.addEventListener('click', () => { box.focus(); start(); });
    swipe(cv, steer); draw();
    return () => clearInterval(timer);
  },
});

defineWidget({
  id: 'g2048', title: '2048', icon: '▣', group: 'Internal', size: 'm', desc: 'Merge tiles, arrow keys or swipe',
  mount(b, c) {
    let bd = Array.from({ length: 4 }, () => Array(4).fill(0)), score = 0, over = false;
    spawn(bd); spawn(bd);
    const info = h('div', { class: 'kv', style: 'width:100%' }), grid = h('div', { class: 'board' });
    const box = h('div', { class: 'game', tabindex: 0 }, info, grid); b.append(box);
    const render = fresh => {
      grid.replaceChildren(...bd.flat().map((v, i) => {
        const t = h('div', { class: 't' }, v || '');
        if (v) { t.dataset.v = v; t.style.setProperty('--h', (Math.log2(v) * 38 + 330) % 360); t.style.setProperty('--l', Math.min(20, Math.log2(v) * 1.2) + '%'); }
        if (fresh && fresh[0] * 4 + fresh[1] === i && !fx.reduced) window.Motion.animate(t, { scale: [0.3, 1] }, { type: 'spring', bounce: 0.5, duration: 0.4 });
        return t;
      }));
      info.replaceChildren(h('span', {}, 'Score ' + score + (over ? '  Game over' : '')), h('button', { class: 'ico', title: 'New game', onClick: reset }, '↻'), h('span', { class: 'dim' }, 'Best ' + (c.cfg.best || 0)));
    };
    const reset = () => { bd = Array.from({ length: 4 }, () => Array(4).fill(0)); score = 0; over = false; spawn(bd); spawn(bd); render(); };
    const go = dir => {
      if (over) return;
      const r = move(bd, dir); if (!r.moved) return;
      bd = r.board; score += r.gain; const f = spawn(bd);
      if (score > (c.cfg.best || 0)) { c.cfg.best = score; c.save(); }
      if (!canMove(bd)) over = true;
      render(f);
    };
    const K = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };
    box.addEventListener('keydown', e => { if (K[e.key]) { e.preventDefault(); go(K[e.key]); } });
    box.addEventListener('click', () => box.focus());
    swipe(grid, d => go(d[0] ? (d[0] > 0 ? 'R' : 'L') : d[1] > 0 ? 'D' : 'U'));
    render();
  },
});
