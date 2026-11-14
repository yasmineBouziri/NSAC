import './core/ai.js';
import './widgets/index.js';
import './core/pages.js';
import { h, $, every } from './core/util.js';
import { api } from './core/api.js';
import { S, loadState, save, flush } from './core/state.js';
import { pages } from './core/registry.js';
import { fx, sky, startStars } from './core/fx.js';
import { applyTheme, setTheme, THEMES } from './core/theme.js';
import { authScreen } from './core/auth.js';
import { startNotifications } from './core/notify.js';

const root = $('#root');
startStars($('#stars'));

async function boot() {
  const el = $('#boot');
  if (!el) return;
  try {
    const eng = await api('engines').catch(() => []);
    const logo = h('div', { class: 'logo' }, [...'BSZ-OS'].map(c => h('span', {}, c)));
    const lines = [
      h('div', {}, 'display engine 0.1.0 ... ', h('b', {}, 'OK')),
      ...eng.map(e => h('div', {}, `${e.name} ${e.version || ''} ... `, h('b', { class: e.status === 'ok' ? '' : 'f' }, e.status === 'ok' ? (e.stub ? 'STUB' : 'OK') : 'FAIL'))),
    ];
    el.append(logo, h('div', { class: 'tag' }, 'Blood, Sweat and Zero-G'), h('div', { class: 'log' }, lines));
    const skip = new Promise(r => {
      el.addEventListener('click', r, { once: true });
      window.addEventListener('keydown', r, { once: true });
    });
    if (!fx.reduced && window.anime && window.Motion) {
      try {
        window.anime.animate(logo.children, { opacity: [0, 1], translateY: [24, 0], scale: [0.6, 1], delay: window.anime.stagger(70), duration: 600, ease: 'outBack' });
        window.Motion.animate(lines, { opacity: [0, 1], x: [-14, 0] }, { delay: window.Motion.stagger(0.12, { startDelay: 0.5 }), duration: 0.3 });
        await Promise.race([skip, new Promise(r => setTimeout(r, 900 + lines.length * 120))]);
        await Promise.race([
          window.Motion.animate(el, { opacity: 0 }, { duration: 0.35 }),
          new Promise(r => setTimeout(r, 450)),
        ]);
      } catch (animErr) {
        console.warn('Boot animation skipped:', animErr);
      }
    }
  } catch (err) {
    console.error('Boot error:', err);
  } finally {
    el.remove();
  }
}

function ic(p) {
  return '<svg viewBox="0 0 24 24">' + p + '</svg>';
}

function note(c, g, t, l) {
  return '<li class="' + c + '"><button><span class="ic">' + g + '</span><span>' + t + '</span><em>' + l + '</em></button></li>';
}

const ST = { ok: '✔ Normal', warn: '▲ Attention', info: '◆ Note' };
const RG = [
  ['Sleep', 92, 'var(--ok)', '7 h 20 min of sleep, which is 92% of your goal.'],
  ['Water', 64, 'var(--warn)', '1.3 L of 2 L so far. Drink about 300 ml soon.'],
  ['Activity', 78, 'var(--info)', '47 of 60 active minutes done today.'],
];
const BD = [
  ['Brain', 60, 27, 'Focus 87%', 'ok', 'Alert and clear. A short walk helps keep it that way.'],
  ['Lungs', 49, 78, 'SpO₂ 98%', 'ok', 'The oxygen in your blood is healthy.'],
  ['Heart', 68, 86, '72 bpm', 'ok', 'Resting and steady. Your cardio check is due tonight.'],
  ['Spine and bones', 60, 118, 'Density 98%', 'info', 'Bones thin slowly in space, so keep up resistance work.'],
  ['Muscles', 24, 104, 'Tone 94%', 'ok', 'Strong. Two resistance sessions are left this week.'],
  ['Legs and fluids', 50, 190, 'Mild fluid shift', 'warn', 'Fluids drift upward in microgravity. Drink water and stretch.'],
];
const SG = [
  ['Sleep', 22, 6, 'var(--info)'],
  ['Wake and meal', 6, 8, 'var(--warn)'],
  ['Morning work', 8, 12, 'var(--ac)'],
  ['Lunch', 12, 13, 'var(--warn)'],
  ['Afternoon work', 13, 17, 'var(--ac)'],
  ['Exercise', 17, 18, 'var(--ok)'],
  ['Free time', 18, 22, 'var(--ac2)'],
];
const RM = [
  ['Lab', [20.9, 0.32, 21.5]],
  ['Crew', [20.8, 0.28, 22.8]],
  ['Gym', [20.6, 0.36, 23.9]],
  ['Airlock', [20.7, 0.46, 19.8]],
];
const P = { Calm: [4, 0, 6, 0], Box: [4, 4, 4, 4], '4-7-8': [4, 7, 8, 0] };
const PN = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];

const H = {
  id: 'home',
  n: 'HOME',
  h: 'Welcome back, Commander Ayla',
  d: 'Mission day 142. Your crew systems are steady, and your next rest window opens in 3 hours.',
  w: function() {
    return '<div class="rings">' + RG.map((r, i) =>
      '<button class="rg" data-i="' + i + '"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--ln)" stroke-width="4"/><circle cx="22" cy="22" r="18" fill="none" stroke="' + r[2] + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (r[1] * 1.131) + ' 113" transform="rotate(-90 22 22)"/><text x="22" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + r[1] + '%</text></svg><span>' + r[0] + '</span></button>'
    ).join('') + '</div><div><ul class="notes">' +
      note('ok', '✔', 'Oxygen levels normal', 'Normal') +
      note('warn', '▲', 'Hydration is low', 'Attention') +
      note('info', '◆', 'Sleep window opens at 22:00', 'Info') +
      note('ok', '✔', 'Radiation within safe range', 'Normal') +
    '</ul><div class="rdl" id="rd">Tap a ring for details, or tick off a notification.</div></div>';
  },
  f: function() {
    document.querySelectorAll('.notes button').forEach(b => {
      b.onclick = () => b.classList.toggle('done');
    });
    document.querySelectorAll('.rg').forEach(b => {
      b.onclick = () => {
        const rd = document.querySelector('#rd');
        if (rd) rd.textContent = RG[b.dataset.i][3];
      };
    });
  },
  tip: 'Hi, I’m Zibo! Drag me anywhere you like. Turn the dial to open an app.',
};

const M = [
  {
    id: 'mental',
    n: 'MENTAL HEALTH',
    i: ic('<path d="M12 21c-5 0-8-4-8-9 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 9-8 9z"/><path d="M12 17V5"/>'),
    h: 'Take a quiet minute',
    d: 'Pick a breathing rhythm and follow the orb. Then tell me how you feel.',
    r: ['Breathing 4-7-8', 'Mood journal', 'Sleep sounds', 'Guided calm'],
    w: function() {
      return '<div class="orb" id="orb"><span><b id="bc"></b><span id="bt"></span></span></div><div class="col"><div class="row2">' +
        Object.keys(P).map(k => '<button class="pill sm" data-p="' + k + '" aria-pressed="' + (k === '4-7-8') + '">' + k + '</button>').join('') +
        '</div><div class="row2"><button class="pill sm" data-md="0">Calm</button><button class="pill sm" data-md="1">Okay</button><button class="pill sm" data-md="2">Low</button></div><span id="mm" style="color:var(--m)">How are you feeling today?</span></div>';
    },
    f: function(setI) {
      let pat = '4-7-8', ph = -1, left = 0;
      function tick() {
        const e = document.querySelector('#orb');
        if (!e) return;
        if (left <= 0) {
          do { ph = (ph + 1) % 4; } while (!P[pat][ph]);
          left = P[pat][ph];
          e.style.transitionDuration = left + 's';
          if (ph === 0) e.style.transform = 'scale(1.4)';
          if (ph === 2) e.style.transform = 'scale(1)';
          const bt = document.querySelector('#bt');
          if (bt) bt.textContent = PN[ph];
        }
        const bc = document.querySelector('#bc');
        if (bc) bc.textContent = left;
        left--;
      }
      setI(tick, 1000);
      document.querySelectorAll('[data-p]').forEach(b => {
        b.onclick = () => {
          pat = b.dataset.p; ph = -1; left = 0;
          document.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', x === b));
          tick();
        };
      });
      const m = ['Lovely. Let’s keep that going.', 'That’s okay. A slow breath can help.', 'Thank you for sharing. I’m here with you.'];
      document.querySelectorAll('[data-md]').forEach(b => {
        b.onclick = () => {
          const mm = document.querySelector('#mm');
          if (mm) mm.textContent = m[b.dataset.md];
        };
      });
    },
    tip: 'Breathe with the orb. It grows as you breathe in and shrinks as you breathe out.',
  },
  {
    id: 'physical',
    n: 'PHYSICAL HEALTH',
    i: ic('<path d="M3 12h4l2-6 4 12 2-6h6"/>'),
    h: 'Your body, in orbit',
    d: 'Tap a glowing point on the body to see how that part is doing.',
    r: ['Resistance session', 'Cardio check', 'Posture reset', 'Bone scan'],
    w: function() {
      return '<svg class="bd" viewBox="0 0 120 250" role="group" aria-label="Interactive body"><g opacity=".22"><circle cx="60" cy="27" r="17" fill="var(--ac)"/><g stroke="var(--ac)" stroke-linecap="round" fill="none"><path d="M60 58V122" stroke-width="38"/><path d="M34 66L22 122M86 66L98 122" stroke-width="12"/><path d="M50 136L48 236M70 136L72 236" stroke-width="15"/></g></g>' +
        BD.map((b, i) => '<circle class="hs' + (b[4] === 'warn' ? ' warn' : '') + (b[0] === 'Heart' ? ' pu' : '') + '" cx="' + b[1] + '" cy="' + b[2] + '" r="6" tabindex="0" role="button" aria-label="' + b[0] + '" data-i="' + i + '"/>').join('') +
        '</svg><div class="info" id="bi"></div>';
    },
    f: function() {
      function pick(i) {
        document.querySelectorAll('.hs').forEach(h => h.classList.toggle('on', +h.dataset.i === i));
        const b = BD[i];
        const bi = document.querySelector('#bi');
        if (bi) bi.innerHTML = '<h3>' + b[0] + '</h3><b>' + b[3] + '</b><span class="c-' + b[4] + '">' + ST[b[4]] + '</span><span>' + b[5] + '</span>';
      }
      document.querySelectorAll('.hs').forEach(h => {
        h.onclick = () => pick(+h.dataset.i);
        h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(+h.dataset.i); } };
      });
      pick(2);
    },
    tip: 'Tap the heart, the lungs, or the glowing dot on the legs.',
  },
  {
    id: 'clock',
    n: 'CLOCK',
    i: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    h: 'Two clocks, one rhythm',
    d: 'Your 24-hour mission day. Tap a part of the ring to see its time.',
    r: ['Set alarm', 'Sleep schedule', 'World times', 'Timer'],
    w: function() {
      const C = 2 * Math.PI * 48;
      const arcs = SG.map((s, i) => {
        const l = (s[2] - s[1] + 24) % 24;
        return '<circle class="sg" data-i="' + i + '" cx="60" cy="60" r="48" fill="none" stroke="' + s[3] + '" stroke-width="8" stroke-dasharray="' + (C * l / 24 - 0.8) + ' ' + C + '" transform="rotate(' + (s[1] * 15 - 90) + ' 60 60)"/>';
      }).join('');
      return '<svg class="dial" viewBox="0 0 120 120" role="img" aria-label="24-hour mission day">' + arcs +
        '<text x="60" y="6">0</text><text x="116" y="62">6</text><text x="60" y="118">12</text><text x="4" y="62">18</text><line id="hd" x1="60" y1="60" x2="60" y2="18" stroke="var(--t)" stroke-width="1.5" stroke-linecap="round"/><circle cx="60" cy="60" r="2.5" fill="var(--t)"/><text id="ct" x="60" y="82"></text></svg><div class="col" style="align-items:stretch"><div class="chips">' +
        SG.map((s, i) => '<button class="pill sm" data-i="' + i + '">' + s[0] + '</button>').join('') +
        '</div><span id="cs" style="color:var(--m);text-align:left">Earth time: <b id="et"></b></span></div>';
    },
    f: function(setI) {
      function pick(i) {
        const s = SG[i], l = (s[2] - s[1] + 24) % 24;
        document.querySelectorAll('.sg').forEach(c => {
          c.setAttribute('stroke-width', +c.dataset.i === i ? 11 : 8);
          c.style.opacity = +c.dataset.i === i ? 1 : 0.55;
        });
        document.querySelectorAll('.chips .pill').forEach(c => {
          c.setAttribute('aria-pressed', +c.dataset.i === i);
        });
        const cs = document.querySelector('#cs');
        if (cs) cs.innerHTML = s[0] + ': ' + ('0' + s[1]).slice(-2) + ':00 to ' + ('0' + s[2]).slice(-2) + ':00, ' + l + ' h. Earth time: <b id="et"></b>';
      }
      document.querySelectorAll('.sg, .chips .pill').forEach(c => {
        c.onclick = () => pick(+c.dataset.i);
      });
      setI(function() {
        const d = new Date(), h = document.querySelector('#hd');
        if (!h) return;
        h.setAttribute('transform', 'rotate(' + ((d.getUTCHours() + d.getUTCMinutes() / 60) * 15) + ' 60 60)');
        const ct = document.querySelector('#ct');
        if (ct) ct.textContent = d.toISOString().slice(11, 19);
        const e = document.querySelector('#et');
        if (e) e.textContent = d.toLocaleTimeString();
      }, 1000);
    },
    tip: 'Sleep is the violet part. Protect it, and the rest of the day gets easier.',
  },
  {
    id: 'sensors',
    n: 'SENSOR MONITOR',
    i: ic('<path d="M3 9a13 13 0 0118 0M6 12.5a8.5 8.5 0 0112 0M9 16a4 4 0 016 0"/><circle cx="12" cy="19.5" r=".8"/>'),
    h: 'Everything around you',
    d: 'Tap a module in the station to read its sensors.',
    r: ['Cabin air report', 'Radiation log', 'Suit telemetry', 'Calibrate'],
    w: function() {
      let r = '';
      ['Oxygen', 'Radiation', 'Temperature'].forEach((x, i) => {
        r += '<div class="r"><span>' + x + '</span><div class="bar"><i id="s' + i + '"></i></div><em id="v' + i + '"></em></div>';
      });
      return '<div class="col"><svg class="cab" viewBox="0 0 240 50" role="group" aria-label="Station modules"><path d="M20 25H220" stroke="var(--ln)" stroke-width="3"/>' +
        RM.map((m, i) => '<g tabindex="0" role="button" aria-label="' + m[0] + '" data-i="' + i + '"><rect class="rm" x="' + (4 + i * 60) + '" y="6" width="52" height="38" rx="12"/><text x="' + (30 + i * 60) + '" y="29">' + m[0] + '</text></g>').join('') +
        '</svg><div class="rows">' + r + '</div></div>';
    },
    f: function(setI) {
      let k = 0;
      function upd() {
        if (!document.querySelector('#s0')) return;
        const b = RM[k][1];
        const o = b[0] + Math.random() * 0.2 - 0.1;
        const rad = b[1] + Math.random() * 0.04;
        const t = b[2] + Math.random() * 0.4;
        const w = rad > 0.43;
        [
          [o / 25 * 100, o.toFixed(1) + '%  ✔ Normal', 0],
          [rad / 0.6 * 100, rad.toFixed(2) + ' mSv  ' + (w ? '▲ Watch' : '✔ Normal'), w],
          [(t - 15) / 15 * 100, t.toFixed(1) + '°C  ✔ Normal', 0],
        ].forEach((x, i) => {
          const e = document.querySelector('#s' + i);
          if (e) {
            e.style.width = x[0] + '%';
            e.style.background = x[2] ? 'var(--warn)' : 'var(--ok)';
          }
          const v = document.querySelector('#v' + i);
          if (v) v.textContent = x[1];
        });
      }
      document.querySelectorAll('.cab g').forEach(g => {
        g.onclick = () => {
          k = +g.dataset.i;
          document.querySelectorAll('.cab g').forEach(x => x.classList.toggle('on', x === g));
          upd();
          say(RM[k][0] + ' module: sensors updated.');
        };
        g.onkeydown = e => { if (e.key === 'Enter') g.onclick(); };
      });
      const firstCab = document.querySelectorAll('.cab g')[0];
      if (firstCab) firstCab.classList.add('on');
      setI(upd, 1800);
    },
    tip: 'The Airlock shows a ▲ sometimes. That’s a normal reading, just worth watching.',
  },
  {
    id: 'games',
    n: 'GAMES',
    i: ic('<path d="M7 8h10a4 4 0 014 4v2a3 3 0 01-5 2l-1-1h-6l-1 1a3 3 0 01-5-2v-2a4 4 0 014-4z"/><path d="M8 10.5v3M6.5 12h3"/>'),
    h: 'Play, unwind, repeat',
    d: 'A little Star Pop to try. Tap the floating stars.',
    r: ['Star Pop', 'Moon Match', 'Comet Catch', 'Zen Garden'],
    w: function() {
      return '<div class="col"><div class="fld" id="fld"></div><span id="sc" style="color:var(--m)">Stars popped: 0</span></div>';
    },
    f: function() {
      let sc = 0;
      const r = Math.random;
      function mk() {
        const fl = document.querySelector('#fld');
        if (!fl) return;
        const b = document.createElement('button');
        b.className = 'st';
        b.textContent = '✦';
        b.setAttribute('aria-label', 'Pop star');
        b.style.cssText = 'left:' + (4 + r() * 88) + '%;top:' + (6 + r() * 70) + '%;--dx:' + (r() * 30 - 15) + 'px;--dy:' + (r() * 30 - 15) + 'px;--du:' + (3 + r() * 3) + 's;font-size:' + (1.2 + r() * 1.4) + 'em';
        b.onclick = () => {
          b.classList.add('pop');
          sc++;
          const s = document.querySelector('#sc');
          if (s) s.textContent = 'Stars popped: ' + sc;
          if (sc % 5 === 0) say('Nice! ' + sc + ' stars popped.');
          setTimeout(() => { b.remove(); setTimeout(mk, 600); }, 350);
        };
        fl.appendChild(b);
      }
      for (let i = 0; i < 7; i++) mk();
    },
    tip: 'Pop the stars. There’s no timer, no score to beat.',
  },
  {
    id: 'settings',
    n: 'SETTINGS',
    i: ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    h: 'Make it yours',
    d: 'Comfort options that work right here in this preview.',
    r: ['Notifications', 'Display', 'Privacy', 'Units'],
    w: function() {
      let r = '';
      [['Daily reminders', 1], ['Sound effects', 1], ['Large text', 0], ['Reduce motion', 0]].forEach((x, i) => {
        r += '<button class="tg" role="switch" aria-checked="' + !!x[1] + '" data-k="' + i + '"><span>' + x[0] + '</span><u><b>' + (x[1] ? 'On' : 'Off') + '</b><s></s></u></button>';
      });
      return '<div class="sgrid">' + r + '<label class="rn">Brightness<input type="range" id="br" min="55" max="110" value="100"></label><label class="rn">Volume<input type="range" min="0" max="100" value="60"></label></div>';
    },
    f: function() {
      document.querySelectorAll('.tg').forEach(b => {
        b.onclick = () => {
          const v = b.getAttribute('aria-checked') !== 'true';
          b.setAttribute('aria-checked', v);
          const bLabel = b.querySelector('b');
          if (bLabel) bLabel.textContent = v ? 'On' : 'Off';
          const k = b.dataset.k;
          if (k === '2') document.documentElement.classList.toggle('lg', v);
          if (k === '3') document.documentElement.classList.toggle('rm', v);
        };
      });
      const br = document.querySelector('#br');
      if (br) br.oninput = function() { document.body.style.filter = 'brightness(' + (this.value / 100) + ')'; };
    },
    tip: 'Try “Large text”, the brightness slider, or change the whole look with Style.',
  },
  {
    id: 'simulation',
    n: 'SIMULATION',
    i: ic('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
    h: 'Practice, safely',
    d: 'Choose a drill, then use the thrust slider to change your orbit.',
    r: ['Docking drill', 'Spacewalk', 'Fire response', 'Landing'],
    w: function() {
      return '<div class="sim"><div class="pl"></div><div class="orbit" id="ob"><span></span></div></div><div class="col"><div class="row2">' +
        ['Docking', 'Spacewalk', 'Landing'].map((k, i) => '<button class="pill sm" data-d="' + k + '" aria-pressed="' + !i + '">' + k + '</button>').join('') +
        '</div><label class="rn" style="gap:1.2em">Thrust<input type="range" id="thr" min="1" max="10" value="3"></label><span id="tl" style="color:var(--m)"></span></div>';
    },
    f: function() {
      let d = 'Docking';
      function u() {
        const thr = document.querySelector('#thr');
        const ob = document.querySelector('#ob');
        const tl = document.querySelector('#tl');
        if (!thr || !ob || !tl) return;
        const t = +thr.value;
        ob.style.animationDuration = (18 / t) + 's';
        tl.textContent = d + ' drill: altitude ' + (380 + t * 6) + ' km, speed ' + (7 + t * 0.08).toFixed(2) + ' km/s';
      }
      const thr = document.querySelector('#thr');
      if (thr) thr.oninput = u;
      document.querySelectorAll('[data-d]').forEach(b => {
        b.onclick = () => {
          d = b.dataset.d;
          document.querySelectorAll('[data-d]').forEach(x => x.setAttribute('aria-pressed', x === b));
          u();
        };
      });
      u();
    },
    tip: 'More thrust, faster orbit. Practice runs are always safe.',
  },
  {
    id: 'credits',
    n: 'CREDITS',
    i: ic('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    h: 'Made by explorers',
    d: 'The people and ideas behind BSZ-OS.',
    r: ['Team', 'Thank you', 'Licenses', 'Contact'],
    w: function() {
      return '<div class="cr"><div>Concept and direction<br><b>Blood, Sweat &amp; Zero-G</b><br>Design and animation<br><b>INSAT Space Team</b><br>Medical advisers<br><b>Crew Health Division</b><br>Thank you for exploring with us</div></div>';
    },
    f: function() {},
    tip: 'Everyone who built this is listed here.',
  },
  {
    id: 'tutorial',
    n: 'TUTORIAL & ABOUT',
    i: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .8-1.5 1.2-1.5 2.5M12 17.5h.01"/>'),
    h: 'New here? Start here',
    d: 'A one-minute tour of how BSZ-OS works.',
    r: ['Dial basics', 'Reading alerts', 'Using Zibo', 'Safety info'],
    w: function() {
      return '<div class="col"><div class="stp" id="stp"></div><div class="dots" id="dots"></div><div class="row2"><button class="pill sm" id="bk">Back</button><button class="solid" id="nt">Next</button></div></div>';
    },
    f: function() {
      const S3 = [
        ['Turn the dial', 'Use the arrows, the mouse wheel, or tap a menu on the rim. Press Enter to open the selected menu.'],
        ['Read the glow', 'The menu that glows and grows is open. Home is the small planet on the dial, so scroll to find it.'],
        ['Meet Zibo', 'Tap me to ask a question, and drag me wherever I’m not in the way.'],
      ];
      let k = 0;
      function u() {
        const stp = document.querySelector('#stp');
        const dots = document.querySelector('#dots');
        const nt = document.querySelector('#nt');
        if (!stp || !dots || !nt) return;
        stp.innerHTML = '<h3>' + S3[k][0] + '</h3><span>' + S3[k][1] + '</span>';
        dots.innerHTML = S3.map((_, i) => '<i class="' + (i === k ? 'on' : '') + '"></i>').join('');
        nt.textContent = k === 2 ? 'Start over' : 'Next';
      }
      const nt = document.querySelector('#nt');
      const bk = document.querySelector('#bk');
      if (nt) nt.onclick = () => { k = (k + 1) % 3; u(); say(S3[k][1]); };
      if (bk) bk.onclick = () => { k = (k + 2) % 3; u(); };
      u();
    },
    tip: 'Follow the three steps. It takes less than a minute.',
  },
  {
    id: 'assistant',
    l: 'AI chatbot',
    n: 'AI CHATBOT',
    i: ic('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    h: 'Ask your assistant',
    d: 'Write a message below and press Enter to chat with Zibo.',
    r: ['New chat', 'Chat history', 'Ask about sleep', 'Ask about water'],
    w: function() {
      return '<div class="chat"><div class="msg">Hello, Commander Ayla. I’m your BSZ-OS assistant. What would you like to know?</div><form class="cf" id="cf" autocomplete="off"><input id="ci" type="text" placeholder="Type a message and press Enter…" aria-label="Message to the AI chatbot"><button type="submit" aria-label="Send message">➤</button></form></div>';
    },
    f: function() {
      const cf = document.querySelector('#cf');
      if (cf) cf.onsubmit = async function(e) {
        e.preventDefault();
        const ci = document.querySelector('#ci');
        if (!ci) return;
        const q = ci.value.trim();
        if (!q) return;
        ci.value = '';
        say('Thinking…');
        try {
          let reply;
          if (window.BZG?.ai?.backend) {
            reply = await window.BZG.ai.backend([{ role: 'user', content: q }]);
          } else {
            reply = 'Received: ' + q + '. All systems running nominally.';
          }
          say(reply);
        } catch (err) {
          say('Sorry, could not process request right now.');
        }
      };
    },
    tip: 'Type a message and press Enter to ask Zibo or open the full assistant.',
  },
];

let sayFn = () => {};
function say(t) { sayFn(t); }

function nm(i) {
  const m = M[i];
  if (!m) return '';
  return m.l || m.n.charAt(0) + m.n.slice(1).toLowerCase();
}

function buildUI() {
  root.replaceChildren();

  // Background elements
  const neb = h('div', { class: 'neb' });
  const auA = h('div', { class: 'au a' });
  const auB = h('div', { class: 'au b' });
  const auC = h('div', { class: 'au c' });
  const skyEl = h('div', { id: 'sky' });

  // Top header
  const logo = h('div', { class: 'logo', style: 'cursor:pointer', title: 'Return to Mission Dial' },
    h('b', {}, 'BSZ-OS'),
    h('small', {}, 'Crew health monitor')
  );
  logo.onclick = () => { if (pgOpen) closePage(); home(); };

  const appsBtn = h('button', { class: 'tbtn chip', id: 'tb-apps', title: 'Open Applications Launcher' }, 'Apps ◈');
  appsBtn.onclick = () => openPageById('home');

  const engDot = h('span', { class: 'dot' });
  const engText = h('span', { id: 'eng' }, 'engines');
  const engChip = h('button', { class: 'tbtn chip', id: 'tb-eng', title: 'View Engines Status' }, engDot, engText);
  engChip.onclick = () => openPageById('engines');
  api('engines').then(l => {
    const bad = l.filter(e => e.status !== 'ok').length;
    engText.textContent = `${l.length - bad}/${l.length} engines`;
    if (bad) engDot.className = 'dot f';
    else if (l.some(e => e.stub)) engDot.className = 'dot s';
  }).catch(() => {});

  const outBtn = h('button', { class: 'ico', title: 'Sign out', style: 'margin-left:6px;background:none;border:none;color:inherit;cursor:pointer' }, '⏻');
  outBtn.onclick = async () => {
    await flush();
    await api('auth/logout', { method: 'POST' }).catch(() => {});
    location.reload();
  };
  const userChip = h('span', { class: 'tbtn chip' }, S.user?.name || 'Commander Ayla', outBtn);

  const tbtn = h('button', { class: 'tbtn', id: 'tb', 'aria-expanded': 'false' }, 'Style');
  const th = h('div', { class: 'themes', id: 'th' });
  const topControls = h('div', { class: 'top-right' }, appsBtn, engChip, userChip, tbtn, th);
  const topHeader = h('header', { class: 'top' }, logo, topControls);

  // Disk dial
  const sl = h('div', { class: 'sl', id: 'sl' });
  const pv = h('button', { class: 'arr l', id: 'pv', 'aria-label': 'Previous menu' }, '‹');
  const nx = h('button', { class: 'arr r', id: 'nx', 'aria-label': 'Next menu' }, '›');
  const panel = h('section', { class: 'panel', id: 'panel', 'aria-live': 'polite' });
  const disk = h('main', { class: 'disk', id: 'disk', 'aria-label': 'Menu dial' }, sl, pv, nx, panel);

  // Page overlay (full-screen applet)
  const pgb = h('button', { class: 'pill page-ret', id: 'pgb' }, '‹ Return to Dial');
  const pgn = h('span', { class: 'page-title', id: 'pgn' });
  const pgbBadge = h('span', { class: 'page-badge', id: 'pgb-badge' });
  const pgNav = h('div', { class: 'page-nav' }, pgb, pgn, pgbBadge);

  const pgAppsQuick = h('button', { class: 'pill sm', id: 'pg-apps-quick' }, 'All Apps ◈');
  pgAppsQuick.onclick = () => openPageById('home');
  const pgTop = h('header', { class: 'page-top' }, pgNav, pgAppsQuick);

  const pgh = h('h2', { id: 'pgh' });
  const pgp = h('p', { id: 'pgp' });
  const pgHeader = h('div', { class: 'page-header' }, pgh, pgp);
  const pgbody = h('div', { class: 'page-body', id: 'pgbody' });
  const pgc = h('div', { class: 'page-content', id: 'pgc' }, pgHeader, pgbody);
  const page = h('section', { class: 'page', id: 'page', 'aria-live': 'polite' }, pgTop, pgc);

  // Zibo mascot
  const bub = h('div', { class: 'bub', id: 'bub' });
  const aq = h('input', { id: 'aq', type: 'text', placeholder: 'Ask Zibo anything…', 'aria-label': 'Ask Zibo a question' });
  const askBtn = h('button', { type: 'submit', 'aria-label': 'Send question' }, '➤');
  const ask = h('form', { class: 'ask', id: 'ask', autocomplete: 'off' }, aq, askBtn);
  const zi = h('div', { class: 'zi' });
  zi.innerHTML = '<svg viewBox="0 0 100 120" aria-hidden="true">' +
    '<defs><radialGradient id="ab" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="var(--ac)"/><stop offset="1" stop-color="var(--ac2)"/></radialGradient></defs>' +
    '<path d="M50 26V10" stroke="var(--ac)" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="8" r="5" fill="var(--info)"/>' +
    '<path d="M50 24C26 24 12 42 12 64c0 22 16 38 38 38s38-16 38-38C88 42 74 24 50 24z" fill="url(#ab)"/>' +
    '<g class="eyes"><ellipse cx="35" cy="58" rx="8" ry="10.5" fill="#0b1a24"/><ellipse cx="65" cy="58" rx="8" ry="10.5" fill="#0b1a24"/><circle cx="38" cy="54" r="3.2" fill="#fff"/><circle cx="68" cy="54" r="3.2" fill="#fff"/></g>' +
    '<ellipse cx="22" cy="73" rx="5" ry="3" fill="#f2a7bd" opacity=".6"/><ellipse cx="78" cy="73" rx="5" ry="3" fill="#f2a7bd" opacity=".6"/>' +
    '<path d="M44 76q6 5 12 0" stroke="#0b1a24" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
  '</svg>';
  const zb = h('div', { class: 'alien', id: 'zb', role: 'button', tabindex: '0', 'aria-label': 'Zibo, the assistant. Drag to move, click to talk.' }, bub, ask, zi);

  root.append(neb, auA, auB, auC, skyEl, topHeader, disk, page, zb);

  // Twinkling stars in sky
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('span');
    const z = Math.random() * 1.8 + 0.6;
    s.className = 'star';
    s.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;width:' + z + 'px;height:' + z + 'px;animation-delay:' + Math.random() * 4 + 's;opacity:' + (0.25 + Math.random() * 0.5);
    skyEl.appendChild(s);
  }

  // Populate Themes in top dropdown
  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.dataset.k = t[0];
    b.innerHTML = '<span class="sw" style="background:linear-gradient(135deg,' + t[2] + ')"></span>' + t[1];
    b.onclick = () => {
      setTheme(t[0]);
      say('Style changed to ' + t[1]);
    };
    th.appendChild(b);
  });
  tbtn.onclick = () => {
    const o = th.classList.toggle('open');
    tbtn.setAttribute('aria-expanded', o);
  };

  // Dial items logic
  const N = 11;
  let pos = 0;
  let cur = -1;
  let pgOpen = false;
  let curPageCleanup = null;
  let timers = [];
  function setI(f, ms) { f(); timers.push(setInterval(f, ms)); }

  let rec = {};
  let hist = [[0, 'Breathing 4-7-8'], [3, 'Cabin air report'], [1, 'Resistance session'], [4, 'Star Pop']];
  M.forEach((m, i) => { rec[i] = m.r.slice(); });
  try {
    const sv = JSON.parse(localStorage.getItem('nc-rec3'));
    if (sv && sv[0] && sv[1]) { rec = sv[0]; hist = sv[1]; }
  } catch (e) {}

  const S_slots = [];
  const allDialItems = [{ i: ic('<circle cx="12" cy="12" r="5"/><path d="M2.5 15C6 17.5 18 11 21.5 9"/>'), l: 'Home', id: 'home' }]
    .concat(M.map((m, j) => ({ i: m.i, l: nm(j), id: m.id })));

  allDialItems.forEach((m, k) => {
    const b = document.createElement('button');
    const r = Math.random;
    b.className = 'slot';
    b.innerHTML = '<span class="o">' + m.i + '</span>';
    b.setAttribute('aria-label', m.l);
    b.style.cssText = '--jr:' + (r() * 0.04 - 0.01).toFixed(3) + ';--dx:' + (r() * 14 - 7).toFixed(1) + 'px;--dy:' + (r() * 14 - 7).toFixed(1) + 'px;--du:' + (4 + r() * 4).toFixed(1) + 's;--dl:-' + (r() * 5).toFixed(1) + 's';
    b.onclick = () => {
      if (k === pos) {
        if (k === 0) openPageById('home');
        else openPageById(M[k - 1].id);
        return;
      }
      if (k === 0) home();
      else go(k - 1);
    };
    b.ondblclick = () => {
      if (k === 0) { home(); openPageById('home'); }
      else { go(k - 1); openPageById(M[k - 1].id); }
    };
    disk.insertBefore(b, sl);
    S_slots.push(b);
  });

  function layout() {
    S_slots.forEach((el, k) => {
      const d = ((k - pos + 5) % N + N) % N - 5;
      const w = Math.abs(d - (el._d === undefined ? d : el._d)) > 4;
      const s = d === 0;
      el._d = d;
      el.style.transition = w ? 'none' : '';
      el.style.transform = 'rotate(' + (d * 20) + 'deg) translateY(calc(var(--R)*-1*(1 + var(--jr)))) rotate(' + (-d * 20) + 'deg) scale(' + (s ? 1.5 : 1) + ')';
      el.classList.toggle('sel', s);
      el.setAttribute('aria-current', s);
    });
  }

  function rcr() {
    const e = document.querySelector('#rc');
    if (!e) return;
    const it = cur < 0 ? hist.filter(x => M[x[0]]).slice(0, 4) : ((rec[cur] || []).slice(0, 3).map(f => [cur, f]));
    e.innerHTML = '<span>Recently used</span>' + it.map(x => '<button class="pill sm" data-m="' + x[0] + '" data-f="' + x[1] + '">' + x[1] + (cur < 0 ? '<small>' + nm(x[0]) + '</small>' : '') + '</button>').join('');
    e.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        const mIdx = +b.dataset.m;
        use(mIdx, b.dataset.f);
        if (mIdx >= 0 && mIdx < M.length) {
          openPageById(M[mIdx].id);
        }
      };
    });
  }

  function use(m, f) {
    rec[m] = [f].concat((rec[m] || []).filter(x => x !== f));
    hist = [[m, f]].concat(hist.filter(x => !(x[0] === m && x[1] === f))).slice(0, 6);
    try { localStorage.setItem('nc-rec3', JSON.stringify([rec, hist])); } catch (e) {}
    if (cur < 0) go(m, 1); else rcr();
    say('Opening “' + f + '”.');
  }

  function render() {
    timers.forEach(clearInterval);
    timers = [];
    const isHome = cur < 0;
    const m = isHome ? H : M[cur];
    panel.className = 'panel' + (isHome ? ' home' : '');
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
    sl.textContent = m.n;

    const actBtn = isHome
      ? '<button class="pill open-pill" id="btn-open-act">Open App Launcher ◈</button>'
      : '<button class="pill open-pill" id="btn-open-act">Open ' + m.n + ' ↗</button>';

    panel.innerHTML = '<h2>' + m.h + '</h2><p>' + m.d + '</p><div class="w">' + m.w() + '</div><div class="panel-act">' + actBtn + '</div><div class="rc" id="rc"></div>';

    const btn = panel.querySelector('#btn-open-act');
    if (btn) {
      btn.onclick = () => {
        if (isHome) openPageById('home');
        else openPageById(m.id);
      };
    }

    rcr();
    m.f(setI);
  }

  function go(j, q) {
    cur = ((j % M.length) + M.length) % M.length;
    pos = cur + 1;
    layout();
    render();
    if (!q) say(M[cur].tip);
  }

  function home() {
    cur = -1;
    pos = 0;
    layout();
    render();
    say(H.tip);
  }

  function step(n) {
    const a = document.activeElement;
    if (a && disk.contains(a)) a.blur();
    const p = ((pos + n) % N + N) % N;
    if (p) go(p - 1); else home();
  }

  function openPageById(id) {
    if (!id) id = 'home';
    const p = pages.get(id);
    if (!p) {
      console.warn('Unknown page ID:', id);
      return;
    }

    curPageCleanup && curPageCleanup();
    curPageCleanup = null;
    pgbody.replaceChildren();

    pgn.textContent = p.title;
    pgh.textContent = p.title;
    pgp.textContent = p.desc || '';
    pgbBadge.textContent = p.group || 'App';

    pgOpen = true;
    document.body.classList.add('pg');
    page.classList.add('open');
    page.scrollTop = 0;
    pgb.focus();

    try {
      curPageCleanup = p.render(pgbody);
    } catch (err) {
      console.error('Error rendering page ' + id + ':', err);
      pgbody.innerHTML = '<p class="err" style="color:var(--warn);padding:1em">Failed to render app: ' + err.message + '</p>';
    }

    if (location.hash !== '#/' + id) {
      history.pushState(null, '', '#/' + id);
    }
    window.dispatchEvent(new CustomEvent('bsz:nav', { detail: id }));
  }

  function closePage() {
    curPageCleanup && curPageCleanup();
    curPageCleanup = null;
    pgbody.replaceChildren();
    pgOpen = false;
    document.body.classList.remove('pg');
    page.classList.remove('open');
    if (location.hash !== '#/home' && location.hash !== '#' && location.hash !== '') {
      history.pushState(null, '', '#/home');
    }
    const activeSlot = S_slots[pos];
    if (activeSlot && activeSlot.focus) activeSlot.focus();
  }

  pgb.onclick = closePage;

  // Zibo say logic
  let bt;
  sayFn = function(t) {
    const r = zb.getBoundingClientRect();
    const f = r.left + r.width / 2 < innerWidth / 2;
    bub.textContent = t;
    bub.classList.toggle('flip', f);
    ask.classList.toggle('flip', f);
    bub.classList.add('show');
    clearTimeout(bt);
    bt = setTimeout(() => bub.classList.remove('show'), Math.max(5500, t.length * 70));
  };

  function toggleAsk() {
    const o = !ask.classList.contains('open');
    ask.classList.toggle('open', o);
    if (o) {
      say('Hi! Type your question for me.');
      aq.focus();
      aq.setSelectionRange(aq.value.length, aq.value.length);
    } else {
      bub.classList.remove('show');
    }
  }

  ask.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', e => {
    if (ask.classList.contains('open') && !zb.contains(e.target)) ask.classList.remove('open');
  });
  ask.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { ask.classList.remove('open'); zb.focus(); }
  });
  ask.addEventListener('submit', async e => {
    e.preventDefault();
    const q = aq.value.trim();
    if (!q) return;
    aq.value = '';
    say('Thinking…');
    try {
      let ans;
      if (window.BZG?.ai?.backend) {
        ans = await window.BZG.ai.backend([{ role: 'user', content: q }]);
      } else {
        ans = 'You asked: “' + q + '”. All systems running normally.';
      }
      say(String(ans));
    } catch (err) {
      say('Sorry, I couldn’t get an answer right now.');
    }
  });

  let dr = null;
  zb.addEventListener('pointerdown', e => {
    const r = zb.getBoundingClientRect();
    dr = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, m: 0 };
    zb.setPointerCapture(e.pointerId);
  });
  zb.addEventListener('pointermove', e => {
    if (!dr) return;
    const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
    if (!dr.m && Math.hypot(dx, dy) < 6) return;
    dr.m = 1;
    zb.classList.add('drag');
    zb.style.left = Math.max(0, Math.min(innerWidth - zb.offsetWidth, dr.l + dx)) + 'px';
    zb.style.top = Math.max(0, Math.min(innerHeight - zb.offsetHeight, dr.t + dy)) + 'px';
    zb.style.right = 'auto';
    zb.style.bottom = 'auto';
  });
  zb.addEventListener('pointerup', () => {
    if (dr && !dr.m) toggleAsk();
    else if (dr) {
      try { localStorage.setItem('nc-zibo', zb.style.left + '|' + zb.style.top); } catch (e) {}
    }
    dr = null;
    zb.classList.remove('drag');
  });
  zb.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') toggleAsk();
  });

  try {
    const zp = (localStorage.getItem('nc-zibo') || '').split('|');
    if (zp[1]) {
      zb.style.left = Math.min(parseFloat(zp[0]), innerWidth - 90) + 'px';
      zb.style.top = Math.min(parseFloat(zp[1]), innerHeight - 110) + 'px';
      zb.style.right = 'auto';
      zb.style.bottom = 'auto';
    }
  } catch (e) {}

  nx.onclick = () => step(1);
  pv.onclick = () => step(-1);
  disk.addEventListener('wheel', e => {
    e.preventDefault();
    step(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  addEventListener('keydown', e => {
    if (pgOpen) {
      if (e.key === 'Escape') closePage();
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const a = document.activeElement;
      if (!a || !/BUTTON|SELECT|TEXTAREA|INPUT/.test(a.tagName) || a.classList.contains('slot')) {
        e.preventDefault();
        if (cur < 0) openPageById('home');
        else openPageById(M[cur].id);
        return;
      }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
  });

  // Handle URL hash navigation
  function handleHash() {
    const hId = location.hash.replace(/^#\/?/, '').trim();
    if (!hId || hId === 'home') {
      if (pgOpen) closePage();
      if (cur !== -1) home();
    } else {
      const idx = M.findIndex(m => m.id === hId);
      if (idx >= 0) {
        if (cur !== idx) go(idx, true);
        openPageById(hId);
      } else if (pages.has(hId)) {
        openPageById(hId);
      }
    }
  }
  addEventListener('hashchange', handleHash);

  layout();
  render();

  // If initial hash is present, navigate to it
  const initHash = location.hash.replace(/^#\/?/, '').trim();
  if (initHash && initHash !== 'home') {
    const idx = M.findIndex(m => m.id === initHash);
    if (idx >= 0) {
      go(idx, true);
      openPageById(initHash);
    } else if (pages.has(initHash)) {
      openPageById(initHash);
    }
  }

  setTimeout(() => say(H.tip), 900);
  startNotifications();
}

(async () => {
  try {
    applyTheme();
    await boot();
    try {
      S.user = await api('auth/me');
      await loadState();
    } catch {
      // Fallback to default commander session from UI-test
      S.user = { id: 0, name: 'Commander Ayla' };
      try { await loadState(); } catch (e) {}
    }
    applyTheme();
    buildUI();
  } catch (err) {
    console.error('App startup error:', err);
    const el = $('#boot');
    if (el) el.remove();
    try { buildUI(); } catch (e) { console.error('buildUI error:', e); }
  }
})();
