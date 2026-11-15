const STYLE = `
#pinball-native{width:100%;max-width:480px;margin:0 auto;display:flex;flex-direction:column;align-items:center;box-sizing:border-box}
#pinball-native *{box-sizing:border-box}
.pinball-cabinet{display:flex;flex-direction:column;align-items:center;gap:7px;width:100%;padding:10px 14px;border-radius:20px;background:linear-gradient(180deg,color-mix(in srgb,var(--sf) 95%,#0d1228),color-mix(in srgb,var(--sf) 95%,#040612));border:max(1px,var(--bw)) solid var(--ln);box-shadow:var(--ss),0 0 25px -6px var(--gl),0 10px 30px rgba(0,0,0,.5)}
.pinball-marquee-bezel{flex:0 0 auto;width:min(calc((100vh - 275px)*.625),min(84vw,315px));border-radius:8px;border:max(1px,var(--bw)) solid var(--ln);background:#04030a;overflow:hidden;box-shadow:inset 0 0 14px rgba(255,179,71,.25)}
.pinball-marquee-bezel canvas{width:100%!important;height:auto!important;display:block}
.pinball-playfield-frame{position:relative;flex:0 1 auto;width:min(calc((100vh - 275px)*.625),min(84vw,315px));height:min(calc(100vh - 275px),435px);min-width:200px;min-height:310px;aspect-ratio:5/8;border-radius:12px;border:max(1px,var(--bw)) solid var(--ln);background:#04030a;overflow:hidden;box-shadow:inset 0 0 25px rgba(0,0,0,.9),0 0 15px -4px var(--gl)}
.pinball-playfield-frame canvas{width:100%!important;height:100%!important;display:block;touch-action:none}
.pinball-glass-sheen{position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.07) 0%,transparent 40%,rgba(255,255,255,.02) 100%);border-radius:12px}
.pinball-help{flex:0 0 auto;margin:0;color:var(--m);font-family:var(--fb);font-size:11px;font-weight:600;text-align:center;min-height:16px;letter-spacing:.02em}
.pinball-controls{flex:0 0 auto;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:100%;margin-top:2px}
.pinball-controls button{font-family:var(--fb);font-size:12px;font-weight:700;color:var(--t);background:var(--sf);border:max(1px,var(--bw)) solid var(--ln);border-radius:var(--pr,999px);padding:6px 14px;cursor:pointer;touch-action:manipulation;box-shadow:var(--ss);transition:background .15s,border-color .15s,transform .1s}
.pinball-controls button:hover{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 25%,var(--sf))}
.pinball-controls button:active{transform:scale(.96);background:var(--ac);color:var(--on)}
#pgo{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 20%,var(--sf))}
#pgo:hover{background:color-mix(in srgb,var(--ac) 35%,var(--sf))}
`;

const MARKUP = `
<div id="pinball-native">
  <div class="pinball-cabinet">
    <div class="pinball-marquee-bezel"><canvas id="pled" width="800" height="168"></canvas></div>
    <div class="pinball-playfield-frame">
      <canvas id="pc" width="800" height="1280"></canvas>
      <div class="pinball-glass-sheen"></div>
    </div>
    <div id="pmsg" class="pinball-help">Hold SPACE or Plunger, release to launch. Flip with A/D or arrows, nudge with W.</div>
    <div class="pinball-controls">
      <button id="pL">◀ Left (A)</button>
      <button id="plg">⚡ Plunger (Space)</button>
      <button id="pR">Right (D) ▶</button>
      <button id="pgo">Start Game</button>
    </div>
  </div>
</div>
`;

export function mountPinball(host) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const root = document.createElement('div');
  root.innerHTML = MARKUP;
  host.append(style, root);

  const $ = s => root.querySelector(s);
  const pc = $('#pc'), pcx = pc.getContext('2d'), lc = $('#pled').getContext('2d');
  const pbMsg = t => { const e = $('#pmsg'); if (e) e.textContent = t; };

  const SEG = {
    a: 'abcdefg', b: 'bc', c: 'abdefg', d: 'abcdg', e: 'adefg', f: 'aefg', g: 'abcdfg', h: 'bcefg',
    i: 'bc', j: 'bcd', k: 'aefg', l: 'def', m: '', n: 'ceg', o: 'abcdef', p: 'abefg', q: 'abcfg',
    r: 'aefg', s: 'acdfg', t: 'defg', u: 'bcdef', v: 'cde', w: '', x: '', y: 'bcdfg', z: 'abdeg',
    '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg',
    '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'
  };
  const STARS = Array.from({ length: 40 }, () => [Math.random() * 400, Math.random() * 640, Math.random() * 1.5 + 0.5]);
  const PB = { score: 0, st: 0, on: 0, hold: 0, fl: [{ key: 0 }, { key: 0 }] };

  let animFrameId = null;
  let isDestroyed = false;

  const R = 7, G = 900, RANKS = ['CADET', 'ENSIGN', 'LIEUTENANT', 'CAPTAIN', 'COMMANDER', 'COMMODORE', 'REAR ADMIRAL', 'ADMIRAL', 'FLEET ADMIRAL'];
  const S = {
    on: 0, run: 0, bs: [], tr: [], pend: 0, lock: 0, lit: 0, mb: 0, wob: 0, wt: 0, wl: 150,
    b: null, wait: null, score: 0, balls: 0, rank: 0, mult: 1, pull: 0, hold: 0, msg: '', mt: 0,
    tilt: 0, nudge: 0, save: 0, mi: 0, mg: 0, ro: [0, 0, 0], cd: 0, fx: []
  };

  const MIS = [
    ['REACTOR TEST', 'HIT 12 BUMPERS', 'bump', 12],
    ['WORMHOLE TRANSIT', 'USE 3 WORMHOLES', 'hole', 3],
    ['LAUNCH RAMP', 'SHOOT THE RAMP 2X', 'ramp', 2],
    ['BLACK HOLE', 'GRAVITY WELL 2X', 'gw', 2],
    ['FUEL DEPOT', 'CLEAR A DROP BANK', 'bank', 1],
    ['HYPERSPACE', 'ENTER THE CHUTE 2X', 'hy', 2]
  ];

  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * i / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

  const SEGS = [
    ...arc(200, 200, 186, Math.PI, 2 * Math.PI, 40).slice(1).map((q, i, A) => {
      const p = i ? A[i - 1] : [14, 200];
      return [p[0], p[1], q[0], q[1], 0.05, 0];
    }),
    [14, 200, 14, 515, 0.45, 0], [14, 515, 92, 592, 0.4, 0], [96, 548, 120, 580, 0.4, 0],
    [386, 200, 386, 620, 0.4, 0], [358, 226, 358, 620, 0.4, 0], [358, 515, 280, 592, 0.4, 0],
    [304, 548, 252, 580, 0.4, 0], [358, 620, 386, 620, 0.2, 0], [58, 470, 96, 548, 0.5, 230],
    [342, 470, 304, 548, 0.5, 230]
  ];

  const TG = [
    ...[270, 292, 314].map(y => ({ ax: 24, ay: y, bx: 24, by: y + 16, bank: 0, dead: 0, f: 0 })),
    ...[300, 322, 344].map(y => ({ ax: 348, ay: y, bx: 348, by: y + 16, bank: 1, dead: 0, f: 0 }))
  ];

  const BU = [
    { x: 160, y: 150, r: 16, p: 100 }, { x: 222, y: 150, r: 16, p: 100 }, { x: 191, y: 200, r: 16, p: 100 },
    { x: 80, y: 100, r: 12, p: 50 }, { x: 52, y: 380, r: 12, p: 50 }, { x: 88, y: 400, r: 12, p: 50 },
    { x: 50, y: 430, r: 12, p: 50 }
  ].map(u => ({ ...u, f: 0, cd: 0, n: 0 }));

  const WH = [{ x: 88, y: 170, c: '#6dff9c' }, { x: 318, y: 250, c: '#ffd23d' }, { x: 292, y: 140, c: '#ff4d5e' }];
  const RO = [[150, 70], [190, 66], [230, 70]];
  const GW = { x: 186, y: 385 }, RAMP = { x: 62, y: 222 }, HY = { x: 332, y: 188 };
  const FL = [{ px: 120, py: 588, s: 1, a: 0.5, w: 0, e: 0.12, k: 0 }, { px: 252, py: 588, s: -1, a: 0.5, w: 0, e: 0.12, k: 0 }];
  const FLL = 56, UP = -0.5, REST = 0.5;

  const msg = t => { S.msg = t; S.mt = 3.2; pbMsg(t); };
  function add(n) { S.score += n * S.mult * (S.mb ? 2 : 1); PB.score = S.score; }
  function prog(k) {
    const m = MIS[S.mi % MIS.length];
    if (m[2] !== k) return;
    S.mg++;
    if (S.mg >= m[3]) {
      S.mg = 0; S.mi++;
      S.rank = Math.min(8, S.rank + 1);
      add(2000);
      msg('MISSION COMPLETE - PROMOTED TO ' + RANKS[S.rank]);
    }
  }

  function cs(b, ax, ay, bx, by, e, k, rad) {
    const dx = bx - ax, dy = by - ay;
    let t = ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    let nx = b.x - (ax + dx * t), ny = b.y - (ay + dy * t);
    const d = Math.hypot(nx, ny), rr = R + (rad || 0);
    if (d >= rr || !d) return 0;
    nx /= d; ny /= d;
    b.x += nx * (rr - d); b.y += ny * (rr - d);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
      if (k && vn < -60) { b.vx += nx * k; b.vy += ny * k; }
      return -vn;
    }
    return 0;
  }

  const nb = (x, y, vx = 0, vy = 0) => { const b = { x, y, vx, vy }; S.bs.push(b); return b; };
  const pickW = a => {
    let r = Math.random() * a.reduce((q, x) => q + x[0], 0);
    for (const x of a) if ((r -= x[0]) < 0) return x;
    return a[0];
  };

  function queue(ms) {
    S.pend++;
    setTimeout(() => {
      if (isDestroyed) return;
      S.pend--;
      if (!S.on) return;
      nb(372, 612);
      S.pull = 0; S.tilt = 0; S.nudge = 0;
    }, ms);
  }

  function spawn() {
    queue(0);
    pbMsg('Hold SPACE or Plunger, release to launch. Flip with A/D or arrows, nudge with W.');
  }

  function mystery() {
    const o = pickW([
      [3, '+3000', () => add(3000)],
      [1, 'JACKPOT +12000', () => add(12000)],
      [2, 'MULTIPLIER UP', () => { S.mult = Math.min(3, S.mult + 1); }],
      [2, 'MULTIPLIER RESET', () => { S.mult = 1; }],
      [2, 'BALL SAVER', () => { S.save = performance.now() + 6000; }],
      [2, 'LOCK IS LIT', () => { S.lit = 1; }],
      [3, 'NOTHING', () => {}],
      [1, 'MISSION ADVANCE', () => { S.mg = 99; prog(MIS[S.mi % MIS.length][2]); }]
    ]);
    o[2]();
    msg('MYSTERY: ' + o[1]);
  }

  function hide(b, t, fn) {
    S.bs.splice(S.bs.indexOf(b), 1);
    S.fx.push({ x: b.x, y: b.y, t: 0.4 });
    S.tr.push({ t, fn });
  }

  function endGame() {
    S.on = 0;
    const r = pickW([[2, 0.6], [3, 0.85], [4, 1], [3, 1.2], [2, 1.5], [1, 2.5]])[1];
    PB.score = Math.round(S.score * r);
    msg('FINAL ROLL x' + r + ' · SCORE: ' + PB.score);
    const goBtn = $('#pgo');
    if (goBtn) {
      goBtn.disabled = false;
      goBtn.textContent = 'Play Again ↺';
    }
  }

  function stepBall(b, dt, now) {
    b.vy += G * dt;
    if (b.x < 358) b.vx += S.wob * dt;
    const dg = Math.hypot(b.x - GW.x, b.y - GW.y);
    if (dg < 60 && dg > 1) {
      const a = 260 * (1 - dg / 60);
      b.vx += (GW.x - b.x) / dg * a * dt;
      b.vy += (GW.y - b.y) / dg * a * dt;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x > 356 && b.y < 222 && b.vy > 0) {
      b.vx = -Math.abs(b.vx) - 220;
      b.x = 356;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 1500) { b.vx *= 1500 / sp; b.vy *= 1500 / sp; }

    let hit = 0;
    SEGS.forEach(q => {
      const h = cs(b, q[0], q[1], q[2], q[3], q[4], q[5] ? q[5] * (0.6 + Math.random() * 0.9) : 0);
      if (h > 120) {
        hit = Math.max(hit, h);
        if (q[5] && now > (q.cd || 0)) { q.cd = now + 350; add(10); }
      }
    });

    TG.forEach(t => {
      if (t.dead) return;
      if (cs(b, t.ax, t.ay, t.bx, t.by, 0.5, 0, 3) > 40) {
        t.dead = 1; t.f = 1; add(150);
        const bk = TG.filter(x => x.bank === t.bank);
        if (bk.every(x => x.dead)) {
          add(700);
          S.mult = Math.min(3, S.mult + 1);
          prog('bank');
          if (Math.random() < 0.3) { S.lit = 1; msg('BANK CLEARED - LOCK IS LIT'); }
          else msg('DROP BANK CLEARED - x' + S.mult);
          setTimeout(() => { if (!isDestroyed) bk.forEach(x => x.dead = 0); }, 1600);
        }
      }
    });

    BU.forEach(u => {
      const dx = b.x - u.x, dy = b.y - u.y, d = Math.hypot(dx, dy), rr = R + u.r;
      if (d < rr && d > 0) {
        const nx = dx / d, ny = dy / d;
        b.x = u.x + nx * rr; b.y = u.y + ny * rr;
        const k = Math.max(380, sp * 0.8) * (0.85 + Math.random() * 0.3);
        const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.6;
        b.vx = Math.cos(a) * k; b.vy = Math.sin(a) * k;
        u.f = 1;
        if (now > u.cd) {
          u.cd = now + 260;
          u.n = Math.min(8, u.n + 1);
          add(Math.round(u.p * 0.6 * Math.max(0.15, 1 - u.n * 0.12) * (0.4 + Math.random() * 1.6)));
          prog('bump');
          if (Math.random() < 0.02) { add(1500); msg('BUMPER JACKPOT'); }
        }
      }
    });

    FL.forEach(f => {
      const c = Math.cos(f.a), sn = Math.sin(f.a), tx = f.px + f.s * FLL * c, ty = f.py + FLL * sn, dx = tx - f.px, dy = ty - f.py;
      let t = ((b.x - f.px) * dx + (b.y - f.py) * dy) / (dx * dx + dy * dy);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      let nx = b.x - (f.px + dx * t), ny = b.y - (f.py + dy * t);
      const d = Math.hypot(nx, ny), rr = R + 6;
      if (d < rr && d > 0) {
        nx /= d; ny /= d;
        b.x += nx * (rr - d); b.y += ny * (rr - d);
        const dl = t * FLL, vx = f.w * dl * (-f.s * sn), vy = f.w * dl * c, rx = b.vx - vx, ry = b.vy - vy, vn = rx * nx + ry * ny;
        if (vn < 0) {
          b.vx = rx - (1 + f.e) * vn * nx + vx;
          b.vy = ry - (1 + f.e) * vn * ny + vy;
        }
      }
    });

    RO.forEach((q, i) => {
      if (!S.ro[i] && Math.hypot(b.x - q[0], b.y - q[1]) < 12) {
        S.ro[i] = 1; add(60);
        if (S.ro.every(x => x)) {
          S.ro = [0, 0, 0]; S.mult = Math.min(3, S.mult + 1); add(300);
          msg('RE-ENTRY LANES - MULTIPLIER x' + S.mult);
        }
      }
    });

    if (now > S.cd) {
      const w = WH.findIndex(wh => Math.hypot(b.x - wh.x, b.y - wh.y) < 10);
      if (w >= 0) {
        S.cd = now + 900; add(S.mb ? 5000 : 300);
        if (S.mb) msg('JACKPOT!');
        prog('hole');
        if (Math.random() < 0.35) mystery();
        const to = WH[(w + 1 + (Math.random() < 0.3 ? 1 : 0)) % 3];
        hide(b, 0.8, () => {
          if (isDestroyed) return;
          const a = Math.random() * 6.28;
          nb(to.x, to.y, Math.cos(a) * 320, Math.sin(a) * 320);
          S.cd = performance.now() + 900;
        });
      } else if (Math.hypot(b.x - RAMP.x, b.y - RAMP.y) < 15 && sp > 200) {
        S.cd = now + 900; add(1000); prog('ramp'); msg('LAUNCH RAMP!');
        if (Math.random() < 0.4) mystery();
        hide(b, 0.9, () => { if (!isDestroyed) nb(40, 330, 60, 160); });
      } else if (Math.hypot(b.x - HY.x, b.y - HY.y) < 12 && sp > 150) {
        S.cd = now + 900; S.hy = (S.hy || 0) + 1; add(2000 * Math.min(3, S.hy)); prog('hy'); msg('HYPERSPACE x' + S.hy);
        hide(b, 1.1, () => { if (!isDestroyed) nb(36, 150, 240, 90); });
      } else if (dg < 9 && sp < 700) {
        S.cd = now + 1500;
        if (S.lit && S.lock < 3) {
          S.lit = 0; S.lock++; add(1500);
          S.bs.splice(S.bs.indexOf(b), 1);
          S.fx.push({ x: b.x, y: b.y, t: 0.4 });
          if (S.lock >= 3) {
            S.lock = 0; S.mb = 1; S.save = now + 9000; msg('MULTIBALL! SCORES x2');
            S.tr.push({
              t: 1, fn: () => {
                if (isDestroyed) return;
                for (let i = 0; i < 3; i++) {
                  const a = -1.57 + (Math.random() - 0.5) * 2;
                  nb(GW.x, GW.y - 14, Math.cos(a) * 720, Math.sin(a) * 720);
                }
              }
            });
          } else {
            msg('BALL LOCKED ' + S.lock + '/3');
            queue(900);
          }
        } else {
          add(800); prog('gw'); msg('GRAVITY WELL');
          if (Math.random() < 0.4) mystery();
          hide(b, 1.2, () => {
            if (isDestroyed) return;
            const a = -1.57 + (Math.random() - 0.5) * 1.6;
            nb(GW.x, GW.y - 14, Math.cos(a) * 720, Math.sin(a) * 720);
          });
        }
      }
    }
  }

  function step(dt) {
    const now = performance.now();
    FL.forEach((f, i) => {
      const k = PB.fl[i].key && !S.tilt && S.on, tg = k ? UP : REST, o = f.a;
      if (k && !f.k) f.e = Math.random() * 0.3;
      f.k = k ? 1 : 0;
      f.a += Math.sign(tg - f.a) * Math.min(Math.abs(tg - f.a), (k ? 22 : 14) * dt);
      f.w = (f.a - o) / dt;
    });
    BU.forEach(u => { u.f = Math.max(0, u.f - dt * 5); u.n = Math.max(0, u.n - dt * 0.6); });
    TG.forEach(t => t.f = Math.max(0, t.f - dt * 4));
    S.fx = S.fx.filter(f => (f.t -= dt) > 0);
    if (S.mt > 0) S.mt -= dt;
    if ((S.wt -= dt) <= 0) { S.wt = 0.3 + Math.random() * 0.6; S.wob = (Math.random() - 0.5) * S.wl; }

    const ln = S.bs.find(b => b.x > 360 && b.y > 570);
    if (PB.hold && S.on && ln) {
      S.pull = Math.min(1, S.pull + dt * 1.1);
    } else if (S.hold && !PB.hold) {
      if (ln && S.on) {
        const effPull = Math.max(0.4, S.pull);
        ln.vy = -(930 + effPull * 570) * (0.94 + Math.random() * 0.12);
        S.save = Math.max(S.save, now + 3500);
      }
      S.pull = 0;
    }
    S.hold = PB.hold;

    S.tr = S.tr.filter(o => {
      if ((o.t -= dt) <= 0) { o.fn(); return false; }
      return true;
    });

    S.bs.slice().forEach(b => { if (S.bs.includes(b)) stepBall(b, dt, now); });
    S.bs.filter(b => b.y > 660).forEach(b => {
      S.bs.splice(S.bs.indexOf(b), 1);
      if (S.save > now) { msg('BALL SAVED!'); queue(700); return; }
      const left = S.bs.length + S.tr.length + S.pend;
      if (left === 0) {
        S.balls--; S.mb = 0;
        if (S.balls > 0) { msg('BALL LOST - ' + S.balls + ' LEFT'); queue(1200); }
        else endGame();
      } else if (S.mb && !S.tr.length && S.bs.length + S.pend <= 1) {
        S.mb = 0; msg('MULTIBALL OVER');
      }
    });
  }

  const lamp = (c, x, y, on, col, r = 4) => {
    c.fillStyle = on ? col : '#1d1740';
    if (on) { c.shadowColor = col; c.shadowBlur = 12; }
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.shadowBlur = 0;
  };

  function seg(c, x, y, w, h, ch, on) {
    const t = Math.max(2, w * 0.18);
    const Q = {
      a: [x + t, y, w - 2 * t, t],
      b: [x + w - t, y + t, t, h / 2 - 1.5 * t],
      c: [x + w - t, y + h / 2 + t / 2, t, h / 2 - 1.5 * t],
      d: [x + t, y + h - t, w - 2 * t, t],
      e: [x, y + h / 2 + t / 2, t, h / 2 - 1.5 * t],
      f: [x, y + t, t, h / 2 - 1.5 * t],
      g: [x + t, y + h / 2 - t / 2, w - 2 * t, t]
    };
    const s = SEG[ch] || '';
    for (const k in Q) {
      const l = s.includes(k);
      c.fillStyle = l ? on : '#2b1b0a';
      if (l) { c.shadowColor = on; c.shadowBlur = 8; }
      c.fillRect(...Q[k]);
      c.shadowBlur = 0;
    }
  }

  let ART = null;
  function makeArt() {
    const a = document.createElement('canvas'); a.width = 800; a.height = 1280;
    const c = a.getContext('2d'); c.scale(2, 2);
    let g = c.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, '#0a0428'); g.addColorStop(0.55, '#120a3e'); g.addColorStop(1, '#1d0b40');
    c.fillStyle = g; c.fillRect(0, 0, 400, 640);
    for (const [x, y, r, col] of [[310, 90, 95, 'rgba(210,45,45,.5)'], [335, 70, 50, 'rgba(255,160,60,.4)'], [120, 330, 115, 'rgba(40,90,210,.28)'], [250, 480, 105, 'rgba(170,40,210,.28)'], [60, 130, 70, 'rgba(60,200,255,.14)']]) {
      g = c.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    c.lineCap = 'round';
    for (const [w, col] of [[38, '#241058'], [30, '#5a26a8'], [22, '#8a4fe0'], [6, '#d2b0ff99']]) {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(60, 205); c.quadraticCurveTo(140, 255, 40, 340); c.stroke();
    }
    c.fillStyle = '#5a2aa055'; c.beginPath(); c.moveTo(18, 340); c.lineTo(112, 362); c.lineTo(104, 452); c.lineTo(18, 444); c.fill();
    g = c.createLinearGradient(358, 0, 386, 0);
    g.addColorStop(0, '#5a3418'); g.addColorStop(0.5, '#b0713a'); g.addColorStop(1, '#4a2a12');
    c.fillStyle = g; c.fillRect(359, 226, 27, 394);
    c.fillStyle = '#0004';
    for (let y = 232; y < 620; y += 14) c.fillRect(359, y, 27, 2);
    g = c.createRadialGradient(GW.x, GW.y, 4, GW.x, GW.y, 56);
    g.addColorStop(0, '#2a9ccf'); g.addColorStop(0.55, '#0e4a78'); g.addColorStop(1, '#120a3e');
    c.fillStyle = g; c.beginPath(); c.arc(GW.x, GW.y, 56, 0, 7); c.fill();
    for (let i = 0; i < 14; i++) {
      const an = i / 14 * 6.283;
      c.fillStyle = i % 3 ? '#2b2f6b' : '#c8372d';
      c.beginPath(); c.arc(GW.x + Math.cos(an) * 46, GW.y + Math.sin(an) * 46, 3.4, 0, 7); c.fill();
    }
    c.fillStyle = '#4a1f8f'; c.beginPath();
    c.moveTo(186, 640); c.lineTo(150, 606); c.lineTo(172, 612); c.lineTo(186, 566); c.lineTo(200, 612); c.lineTo(222, 606); c.fill();
    c.font = 'italic 900 10px Outfit,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#c8372d';
    c.fillText('CINEMATRONICS', 72, 610); c.fillText('MAXIS', 318, 610);
    c.font = '900 30px Outfit,sans-serif'; c.strokeStyle = '#38e8ff44'; c.lineWidth = 1.5;
    c.strokeText('SPACE CADET', 200, 312);
    c.font = '700 9px Outfit,sans-serif'; c.fillStyle = '#38e8ff66';
    c.fillText('3D PINBALL', 200, 326);
    return a;
  }

  function draw() {
    const c = pcx, t = performance.now() / 1000;
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (!ART) ART = makeArt();
    c.drawImage(ART, 0, 0, 400, 640);
    STARS.forEach(s => {
      c.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.sin(t * 2 + s[0])})`;
      c.fillRect(s[0], s[1], s[2], s[2]);
    });
    c.lineCap = 'round'; c.strokeStyle = '#6a2fb8aa'; c.lineWidth = 26;
    c.beginPath(); c.moveTo(60, 205); c.quadraticCurveTo(130, 260, 40, 335); c.stroke();
    c.strokeStyle = '#38e8ff55'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(GW.x, GW.y, 56, 0, 7); c.stroke();
    c.beginPath(); c.arc(GW.x, GW.y, 36, 0, 7); c.stroke();
    c.shadowColor = '#38e8ff'; c.shadowBlur = 8; c.strokeStyle = '#38e8ff'; c.lineWidth = 2.5;
    SEGS.forEach(s => {
      c.strokeStyle = s[5] ? '#ff3d8b' : '#38e8ff';
      c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke();
    });
    c.shadowBlur = 0;
    TG.forEach(g => {
      if (g.dead) { c.strokeStyle = '#ffffff18'; }
      else { c.strokeStyle = g.f ? '#fff' : '#ffd23d'; c.shadowColor = '#ffd23d'; c.shadowBlur = 10; }
      c.lineWidth = 5; c.beginPath(); c.moveTo(g.ax, g.ay); c.lineTo(g.bx, g.by); c.stroke(); c.shadowBlur = 0;
    });
    WH.forEach(w => {
      c.strokeStyle = w.c; c.shadowColor = w.c; c.shadowBlur = 14; c.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.arc(w.x, w.y, 10 - k * 3, t * 3 + k, t * 3 + k + 4.4); c.stroke();
      }
      c.shadowBlur = 0;
    });
    c.fillStyle = '#000'; c.beginPath(); c.arc(GW.x, GW.y, 9, 0, 7); c.fill();
    c.strokeStyle = '#c78bff'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#ff8a3d'; c.beginPath(); c.arc(RAMP.x, RAMP.y, 13, 0, 7); c.stroke();
    c.strokeStyle = '#ffd23d'; c.beginPath(); c.arc(HY.x, HY.y, 12, 0, 7); c.stroke();
    BU.forEach(u => {
      const k = 1 + u.f * 0.18;
      c.fillStyle = u.f ? '#fff' : '#1a0f3a';
      c.strokeStyle = u.r > 13 ? '#ff3d8b' : '#38e8ff';
      c.shadowColor = c.strokeStyle; c.shadowBlur = 10 + u.f * 16; c.lineWidth = 3;
      c.beginPath(); c.arc(u.x, u.y, u.r * k, 0, 7); c.fill(); c.stroke(); c.shadowBlur = 0;
      c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(u.x, u.y, u.r * 0.4, 0, 7); c.fill();
    });
    RO.forEach((p, i) => lamp(c, p[0], p[1], S.ro[i], '#6dff9c', 5));
    for (let i = 0; i < 3; i++) lamp(c, GW.x - 16 + i * 16, GW.y + 24, i < S.lock, '#c78bff', 4.5);
    lamp(c, GW.x, GW.y - 26, S.lit && Math.sin(t * 10) > 0, '#fff', 5);
    for (let i = 0; i < 9; i++) lamp(c, 126 + i * 16, 508, i <= S.rank, '#f5c451', 4);
    const m = MIS[S.mi % MIS.length];
    for (let i = 0; i < m[3]; i++) lamp(c, 186 - (m[3] - 1) * 7 + i * 14, 526, i < S.mg, '#38e8ff', 3.5);
    c.fillStyle = '#9a8fba'; c.font = '700 8px Outfit,sans-serif'; c.textAlign = 'center';
    c.fillText(RANKS[S.rank] + '  -  ' + m[0] + ': ' + m[1], 186, 544);
    FL.forEach(f => {
      c.save(); c.translate(f.px, f.py); c.scale(f.s, 1); c.rotate(f.a);
      c.fillStyle = '#f5c451'; c.shadowColor = '#f5c451'; c.shadowBlur = 8;
      c.beginPath(); c.moveTo(0, -8); c.lineTo(FLL, -4); c.arc(FLL, 0, 4, -1.57, 1.57);
      c.lineTo(0, 8); c.arc(0, 0, 8, 1.57, 4.71); c.fill(); c.restore();
    });
    c.shadowBlur = 0;
    c.fillStyle = '#8a8aa0'; c.fillRect(366, 612 + S.pull * 22, 12, 26);
    S.fx.forEach(f => {
      c.strokeStyle = `rgba(255,255,255,${f.t * 2.5})`;
      c.beginPath(); c.arc(f.x, f.y, (0.4 - f.t) * 80, 0, 7); c.stroke();
    });
    S.bs.forEach(b => {
      const r = c.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, R);
      r.addColorStop(0, '#fff'); r.addColorStop(1, '#7d86a8');
      c.fillStyle = r; c.shadowColor = '#fff'; c.shadowBlur = 8;
      c.beginPath(); c.arc(b.x, b.y, R, 0, 7); c.fill(); c.shadowBlur = 0;
    });
    if (S.tilt) {
      c.fillStyle = '#ff3d8b'; c.font = '900 34px Outfit'; c.fillText('TILT', 200, 330);
    }
  }

  function led() {
    const c = lc;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#04030a'; c.fillRect(0, 0, 400, 84);
    const s = String(Math.max(0, Math.round(S.score))).padStart(8, '0');
    for (let i = 0; i < 8; i++) seg(c, 12 + i * 30, 10, 22, 38, s[i], '#ffb347');
    seg(c, 358, 10, 22, 38, String(Math.max(0, S.balls)), '#6dff9c');
    c.fillStyle = '#9a8fba'; c.font = '700 9px Outfit'; c.textAlign = 'left';
    c.fillText('BALL', 356, 60); c.fillText('x' + S.mult, 12, 62);
    c.textAlign = 'center'; c.fillStyle = S.mt > 0 ? '#ffb347' : '#5a4a2a'; c.font = '700 12px Outfit';
    c.fillText(S.mt > 0 ? S.msg : '3D SPACE CADET  -  ' + RANKS[S.rank], 200, 74);
  }

  function startPhysicsLoop() {
    if (S.run) return;
    S.run = 1;
    let last = performance.now(), acc = 0;
    (function loop(now) {
      if (isDestroyed || !root.isConnected) {
        S.run = 0;
        return;
      }
      const d = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now; acc += d;
      let n = 0;
      while (acc >= 1 / 240 && n++ < 16) {
        step(1 / 240);
        acc -= 1 / 240;
      }
      draw();
      led();
      animFrameId = requestAnimationFrame(loop);
    })(last);
  }

  const startGameSession = () => {
    Object.assign(S, {
      on: 1, score: 0, balls: 3, rank: 0, mult: 1, mi: 0, mg: 0,
      ro: [0, 0, 0], cd: 0, wait: null, hy: 0, bs: [], tr: [], pend: 0, lock: 0, lit: 0, mb: 0
    });
    TG.forEach(t => t.dead = 0);
    PB.score = 0; PB.on = 1;
    const goBtn = $('#pgo');
    if (goBtn) {
      goBtn.disabled = false;
      goBtn.textContent = 'Restart ↺';
    }
    spawn();
    startPhysicsLoop();
  };

  $('#pgo').onclick = () => startGameSession();

  const setFlipper = (i, on) => {
    if (!S.on) return;
    PB.fl[i].key = on ? 1 : 0;
  };

  const tapFlip = el => {
    el.style.touchAction = 'none';
    el._i = {};
    const dn = e => {
      if (!S.on) return;
      e.preventDefault();
      const r = el.getBoundingClientRect(), i = e.clientX < r.left + r.width / 2 ? 0 : 1;
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
      el._i[e.pointerId] = i;
      PB.fl[i].key = 1;
    };
    const up = e => {
      const i = el._i[e.pointerId];
      if (i != null) {
        PB.fl[i].key = 0;
        delete el._i[e.pointerId];
      }
    };
    el.addEventListener('pointerdown', dn);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, up));
  };
  tapFlip(pc);

  [['#pL', 0], ['#pR', 1]].forEach(([sel, i]) => {
    const el = $(sel);
    if (!el) return;
    ['pointerdown', 'mousedown', 'touchstart'].forEach(n => el.addEventListener(n, e => {
      e.preventDefault();
      setFlipper(i, 1);
    }));
    ['pointerup', 'pointercancel', 'mouseup', 'mouseleave', 'touchend'].forEach(n => el.addEventListener(n, e => {
      e.preventDefault();
      setFlipper(i, 0);
    }));
  });

  const plunger = $('#plg');
  let plungerPointer = null;
  const releasePlunger = () => {
    if (!S.on) return;
    PB.hold = 0;
    if (S.hold) {
      const ln = S.bs.find(b => b.x > 360 && b.y > 570);
      if (ln) {
        const eff = Math.max(0.42, S.pull);
        ln.vy = -(930 + eff * 570) * (0.94 + Math.random() * 0.12);
        S.save = Math.max(S.save, performance.now() + 3500);
      }
      S.pull = 0;
      S.hold = 0;
    }
  };

  if (plunger) {
    plunger.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!S.on) return;
      plungerPointer = e.pointerId;
      try { plunger.setPointerCapture(e.pointerId); } catch (x) {}
      PB.hold = 1; S.hold = 1;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => plunger.addEventListener(n, e => {
      if (plungerPointer === null || e.pointerId === plungerPointer) {
        plungerPointer = null;
        releasePlunger();
      }
    }));
  }

  const onKeyDown = e => {
    if (!S.on || isDestroyed) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!S.tilt) {
        S.bs.forEach(b => {
          b.vx += (Math.random() - 0.5) * 280;
          b.vy -= 150;
        });
        if (++S.nudge > 2 + (Math.random() * 3 | 0)) {
          S.tilt = 1;
          msg('TILT! Flippers disabled this ball');
        }
      }
      return;
    }
    if (e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); setFlipper(0, 1); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setFlipper(1, 1); }
    if (e.code === 'Space') { e.preventDefault(); PB.hold = 1; S.hold = 1; }
  };

  const onKeyUp = e => {
    if (isDestroyed) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') setFlipper(0, 0);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') setFlipper(1, 0);
    if (e.code === 'Space') releasePlunger();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Auto-start first session
  startGameSession();

  return () => {
    isDestroyed = true;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    root.remove();
    style.remove();
  };
}
