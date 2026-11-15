const STYLE = `
.native-orbit.sudoku-host{width:100%;max-width:540px;margin:0 auto;display:flex;flex-direction:column;align-items:center;color:var(--t);font-family:var(--fb);box-sizing:border-box}
.sudoku-host *{box-sizing:border-box}
.sudoku-console{width:100%;display:flex;flex-direction:column;align-items:center;gap:0}

/* Dedicated Game Header Section */
.sudoku-header-panel{width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 14px;margin:0 0 10px;background:var(--sf);border:max(1px,var(--bw)) solid var(--ln);border-radius:16px;box-shadow:var(--ss);backdrop-filter:var(--dbl,blur(12px))}
.sudoku-controls-row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;width:100%}
.sudoku-diff-group{display:inline-flex;gap:4px;background:color-mix(in srgb,var(--sf) 90%,#000);padding:3px;border-radius:var(--pr,999px);border:max(1px,var(--bw)) solid var(--ln)}
.sudoku-actions-group{display:inline-flex;gap:6px}
.sudoku-host button{font-family:var(--fb);font-size:12px;font-weight:700;color:var(--t);background:var(--sf);border:max(1px,var(--bw)) solid var(--ln);border-radius:var(--pr,999px);padding:4px 12px;cursor:pointer;box-shadow:var(--ss);transition:background .2s,border-color .2s,box-shadow .2s,transform .1s}
.sudoku-host button:hover{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 20%,var(--sf));box-shadow:0 0 10px var(--gl)}
.sudoku-host button:active{transform:scale(.97)}
.sudoku-host button.active{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 32%,var(--sf));color:var(--on);font-weight:800}
.sudoku-status-badge{font-size:12px;font-weight:800;color:var(--ac);text-align:center;letter-spacing:.03em;min-height:1.2em;display:flex;align-items:center;justify-content:center;gap:4px}

/* Dedicated Grid Section (Below Header) */
.sudoku-grid-card{position:relative;width:min(calc(100vh - 275px),min(88vw,390px));height:min(calc(100vh - 275px),390px);min-width:270px;min-height:270px;aspect-ratio:1;margin:0 auto 10px;border:2.5px solid var(--ac);border-radius:12px;overflow:hidden;box-shadow:var(--ss),0 0 25px -6px var(--gl),0 10px 30px rgba(0,0,0,.5)}
.sudoku-board-grid{width:100%!important;height:100%!important;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));grid-template-rows:repeat(9,minmax(0,1fr));background:var(--ln);gap:1px}

/* Sudoku Cells */
.sudoku-host .sc{background:color-mix(in srgb,var(--sf) 95%,#030510);display:flex;align-items:center;justify-content:center;font-size:clamp(14px,3.5vmin,24px);line-height:1;cursor:pointer;user-select:none;transition:background .15s}
.sudoku-host .sc.g{background:color-mix(in srgb,var(--sf) 82%,var(--ac) 18%);font-weight:800}
.sudoku-host .sc.sel{background:color-mix(in srgb,var(--ac) 45%,var(--sf));box-shadow:inset 0 0 10px var(--ac)}
.sudoku-host .sc.bad{background:color-mix(in srgb,var(--warn) 45%,var(--sf));box-shadow:inset 0 0 10px var(--warn)}
.sudoku-host .sc:nth-child(3n){border-right:2px solid var(--ac)}
.sudoku-host .sc:nth-child(9n){border-right:0}
.sudoku-host .sc.r3,.sudoku-host .sc.r6{border-bottom:2px solid var(--ac)}

/* Dedicated Palette Dock */
.sudoku-palette-panel{width:100%;max-width:440px;display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin:0 auto}
.sudoku-palette-dock{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;width:100%}
.sudoku-palette-dock button{display:inline-flex;flex-direction:row;align-items:center;gap:4px;padding:3px 8px;font-size:11px;color:var(--t);border-radius:var(--pr,999px)}
.sudoku-palette-dock b{font-size:14px;font-weight:700;line-height:1}
`;

const MARKUP = `
<div class="sudoku-console">
  <!-- Dedicated Controls & Settings Header -->
  <header class="sudoku-header-panel">
    <div class="sudoku-controls-row">
      <div class="sudoku-diff-group" role="group" aria-label="Difficulty level">
        <button data-d="36" class="diff-btn active">Easy</button>
        <button data-d="46" class="diff-btn">Medium</button>
        <button data-d="54" class="diff-btn">Hard</button>
      </div>
      <div class="sudoku-actions-group">
        <button id="er" class="sudoku-act-btn" aria-label="Erase selected cell">⌫ Erase</button>
        <button id="ck" class="sudoku-act-btn" aria-label="Check board for conflicts">✔ Check</button>
      </div>
    </div>
    <div class="sudoku-status-badge" id="sm" aria-live="polite">Select an orbital cell, then choose a planet</div>
  </header>

  <!-- Dedicated Grid Section (Below Header) -->
  <section class="sudoku-grid-card">
    <div id="sg" class="sudoku-board-grid"></div>
  </section>

  <!-- Dedicated Solar Palette Section -->
  <footer class="sudoku-palette-panel">
    <div id="pal" class="sudoku-palette-dock"></div>
  </footer>
</div>
`;

export function mountSudoku(host) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const root = document.createElement('div');
  root.className = 'native-orbit sudoku-host';
  root.innerHTML = MARKUP;
  host.append(style, root);

  const $ = s => root.querySelector(s);
  const E = '\uFE0E';
  const PL = [
    ['☉', 'Sun', '#ffcc33'],
    ['☿', 'Mercury', '#c4c4cc'],
    ['♀', 'Venus', '#f0c27b'],
    ['⊕', 'Earth', '#4da6ff'],
    ['♂', 'Mars', '#ff6a4d'],
    ['♃', 'Jupiter', '#e0a070'],
    ['♄', 'Saturn', '#e8d48a'],
    ['♅', 'Uranus', '#7fe0e0'],
    ['♆', 'Neptune', '#8a9bff']
  ];

  let sol = [], cur = [], giv = Array(81).fill(true), sel = -1;
  let activeHoles = 36;

  const sh = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function newSudoku(holes) {
    activeHoles = holes;
    root.querySelectorAll('.diff-btn').forEach(btn => {
      btn.classList.toggle('active', +btn.dataset.d === holes);
    });
    const g = sh([0, 1, 2]), rows = [], cols = [];
    g.forEach(b => sh([0, 1, 2]).forEach(r => rows.push(b * 3 + r)));
    sh([0, 1, 2]).forEach(b => sh([0, 1, 2]).forEach(c => cols.push(b * 3 + c)));
    const sym = sh([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    sol = [];
    rows.forEach(r => cols.forEach(c => sol.push(sym[(3 * (r % 3) + (r / 3 | 0) + c) % 9])));
    cur = sol.slice();
    giv = Array(81).fill(true);
    sh([...Array(81).keys()]).slice(0, holes).forEach(i => { cur[i] = -1; giv[i] = false; });
    sel = -1;
    const sm = $('#sm');
    if (sm) sm.textContent = 'Select an orbital cell, then choose a planet';
    drawS();
  }

  function conflicts() {
    const bad = new Set();
    for (let i = 0; i < 81; i++) {
      if (cur[i] < 0) continue;
      for (let j = 0; j < 81; j++) {
        if (i === j || cur[j] !== cur[i]) continue;
        const r = i / 9 | 0, c = i % 9, r2 = j / 9 | 0, c2 = j % 9;
        if (r === r2 || c === c2 || ((r / 3 | 0) === (r2 / 3 | 0) && (c / 3 | 0) === (c2 / 3 | 0))) {
          bad.add(i);
        }
      }
    }
    return bad;
  }

  function drawS(showBad) {
    const bad = showBad ? conflicts() : new Set();
    const sg = $('#sg');
    if (!sg) return;
    sg.innerHTML = cur.map((v, i) => {
      const r = i / 9 | 0;
      const r3Class = (r === 2 || r === 5) ? ' r3' : '';
      return `<div class="sc${giv[i] ? ' g' : ''}${i === sel ? ' sel' : ''}${bad.has(i) ? ' bad' : ''}${r3Class}" data-i="${i}" style="${v >= 0 ? 'color:' + PL[v][2] : ''}">${v >= 0 ? PL[v][0] + E : ''}</div>`;
    }).join('');
  }

  $('#sg').onclick = e => {
    const c = e.target.closest('.sc');
    if (c) {
      sel = +c.dataset.i;
      drawS();
    }
  };

  function put(v) {
    if (sel < 0 || giv[sel]) return;
    cur[sel] = v;
    drawS();
    const sm = $('#sm');
    if (!cur.includes(-1)) {
      const b = conflicts();
      if (sm) sm.textContent = b.size ? 'All cells filled, but some planets collide.' : 'Solved! The solar system is in perfect alignment ✦';
      if (b.size) drawS(true);
    } else if (sm) {
      sm.textContent = v >= 0 ? PL[v][1] + ' placed' : 'Cell cleared';
    }
  }

  const pal = $('#pal');
  if (pal) {
    pal.innerHTML = PL.map((p, i) => `<button data-v="${i}"><b style="color:${p[2]}">${p[0] + E}</b>${p[1]}</button>`).join('');
    pal.onclick = e => {
      const b = e.target.closest('button');
      if (b) put(+b.dataset.v);
    };
  }

  $('#er').onclick = () => put(-1);
  $('#ck').onclick = () => {
    const b = conflicts();
    drawS(true);
    const sm = $('#sm');
    if (sm) sm.textContent = b.size ? b.size + ' cells clash with an orbit, column or quadrant.' : 'No clashes so far. Good navigation!';
  };

  root.querySelectorAll('.diff-btn').forEach(b => {
    b.onclick = () => newSudoku(+b.dataset.d);
  });

  const onKeyDown = e => {
    if (!root.isConnected) return;
    if (e.key >= '1' && e.key <= '9') {
      put(+e.key - 1);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      put(-1);
    } else if (sel >= 0) {
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
      if (d && sel + d >= 0 && sel + d < 81) {
        sel += d;
        drawS();
        e.preventDefault();
      }
    }
  };

  window.addEventListener('keydown', onKeyDown);

  newSudoku(36);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    root.remove();
    style.remove();
  };
}
