const STYLE = `
.native-orbit.chess-host{width:100%;max-width:580px;margin:0 auto;display:flex;flex-direction:column;align-items:center;color:var(--t);font-family:var(--fb);box-sizing:border-box}
.chess-host *{box-sizing:border-box}
.chess-console{width:100%;display:flex;flex-direction:column;align-items:center;gap:0}

/* Dedicated Game Header Section */
.chess-header-panel{width:100%;max-width:480px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 16px;margin:0 0 10px;background:var(--sf);border:max(1px,var(--bw)) solid var(--ln);border-radius:16px;box-shadow:var(--ss);backdrop-filter:var(--dbl,blur(12px))}
.chess-controls-bar{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;width:100%}
.chess-btn{font-family:var(--fb);font-size:12px;font-weight:700;color:var(--t);background:color-mix(in srgb,var(--sf) 85%,var(--t) 5%);border:max(1px,var(--bw)) solid var(--ln);border-radius:var(--pr,999px);padding:5px 14px;cursor:pointer;box-shadow:var(--ss);transition:background .2s,border-color .2s,box-shadow .2s,transform .1s}
.chess-btn:hover{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 20%,var(--sf));box-shadow:0 0 10px var(--gl)}
.chess-btn:active{transform:scale(.97)}
.chess-status-badge{font-size:12.5px;font-weight:800;color:var(--ac);text-align:center;letter-spacing:.03em;min-height:1.2em;display:flex;align-items:center;justify-content:center;gap:6px}

/* Dedicated Board Section (Below Header) */
.chess-board-card{position:relative;width:min(calc(100vh - 270px),min(88vw,420px));height:min(calc(100vh - 270px),420px);min-width:270px;min-height:270px;aspect-ratio:1;margin:0 auto 10px;border-radius:14px;border:max(1px,var(--bw)) solid var(--ln);box-shadow:var(--ss),0 0 25px -6px var(--gl),0 10px 30px rgba(0,0,0,.5);background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--sf) 85%,#0b1226),color-mix(in srgb,var(--sf) 95%,#010208) 92%);overflow:hidden;touch-action:none}
.chess-canvas-container{width:100%!important;height:100%!important;display:block}
.chess-canvas-container canvas{width:100%!important;height:100%!important;display:block}
.chess-grid-container{width:100%!important;height:100%!important;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr))}

/* Chess Squares & Pieces */
.chess-host .cc{display:flex;align-items:center;justify-content:center;font-size:clamp(18px,4vmin,32px);line-height:1;min-width:0;min-height:0;cursor:pointer;position:relative;user-select:none;transition:background .15s}
.chess-host .cc.l{background:color-mix(in srgb,var(--sf) 82%,var(--ac) 18%)}
.chess-host .cc.d{background:color-mix(in srgb,var(--sf) 95%,#02040b)}
.chess-host .cc.sel{background:color-mix(in srgb,var(--ac) 45%,var(--sf));box-shadow:inset 0 0 12px var(--ac)}
.chess-host .cc.lm{box-shadow:inset 0 0 0 2px var(--ac)}
.chess-host .cc.chk{background:color-mix(in srgb,var(--warn) 45%,var(--sf))}
.chess-host .cc.mv::after{content:"";position:absolute;width:24%;height:24%;border-radius:50%;background:var(--ac);box-shadow:0 0 8px var(--gl)}
.chess-host .cc.mv.cap::after{width:78%;height:78%;background:none;border:2px solid var(--warn);box-shadow:0 0 8px var(--warn)}
.chess-host .w{color:#5ce6ff;text-shadow:0 0 8px rgba(92,230,255,.85)}
.chess-host .k{color:#ffaa44;text-shadow:0 0 8px rgba(255,170,68,.85)}

/* Dedicated Legend Footer */
.chess-footer-panel{width:100%;max-width:480px;text-align:center;margin:0 auto}
.chess-legend{font-size:11px;color:var(--m);line-height:1.4;margin:0;padding:2px 8px}
.chess-host .hide{display:none!important}
`;

const MARKUP = `
<div class="chess-console">
  <!-- Dedicated Controls & Status Header -->
  <header class="chess-header-panel">
    <div class="chess-controls-bar">
      <button id="nw" class="chess-btn" aria-label="Start new game">↺ New Game</button>
      <button id="ai" class="chess-btn" aria-label="Toggle opponent mode">Mode: 2 players</button>
      <button id="vw" class="chess-btn" aria-label="Toggle 2D/3D view">View: 3D</button>
    </div>
    <div class="chess-status-badge" id="cm" aria-live="polite">Cyan fleet to move</div>
  </header>

  <!-- Dedicated Board Section (Below Header) -->
  <section class="chess-board-card">
    <div id="c3" class="chess-canvas-container"></div>
    <div id="cg" class="chess-grid-container hide"></div>
  </section>

  <!-- Dedicated Legend / Tactical Guidance Footer -->
  <footer class="chess-footer-panel">
    <p class="chess-legend">Cyan fleet moves first · Flagship ♚ Nova ♛ Station ♜ Comet ♝ Rocket ♞ Probe ♟ · Drag to orbit, scroll to zoom</p>
  </footer>
</div>
`;

export function mountChess(host) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const root = document.createElement('div');
  root.className = 'native-orbit chess-host';
  root.innerHTML = MARKUP;
  host.append(style, root);

  const $ = s => root.querySelector(s);
  const E = '\uFE0E';
  const GL = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

  let bd = Array(64).fill(null), turn = 'w', cs = -1, lg = [], lm = [], over = false, vsAI = false;
  let D = 0;
  const LV = [['2 players', 0], ['Cadet AI', 2], ['Pilot AI', 3], ['Admiral AI', 4]];
  let li = 0;

  function gen(b, i) {
    const p = b[i], col = p[0], t = p[1], r = i >> 3, c = i & 7, o = [];
    const add = (rr, cc) => {
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return false;
      const j = rr * 8 + cc;
      if (!b[j]) { o.push(j); return true; }
      if (b[j][0] !== col) o.push(j);
      return false;
    };
    if (t === 'P') {
      const d = col === 'w' ? -1 : 1, st = col === 'w' ? 6 : 1;
      if (r + d >= 0 && r + d < 8 && !b[(r + d) * 8 + c]) {
        o.push((r + d) * 8 + c);
        if (r === st && !b[(r + 2 * d) * 8 + c]) o.push((r + 2 * d) * 8 + c);
      }
      for (const dc of [-1, 1]) {
        const rr = r + d, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] && b[rr * 8 + cc][0] !== col) o.push(rr * 8 + cc);
      }
    } else if (t === 'N') {
      [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, d]) => add(r + a, c + d));
    } else if (t === 'K') {
      [-1, 0, 1].forEach(a => [-1, 0, 1].forEach(d => { if (a || d) add(r + a, c + d); }));
    } else {
      const DIRS = [];
      if (t !== 'B') DIRS.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      if (t !== 'R') DIRS.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      DIRS.forEach(([a, d]) => {
        let rr = r + a, cc = c + d;
        while (add(rr, cc) && !b[rr * 8 + cc]) { rr += a; cc += d; }
      });
    }
    return o;
  }

  function att(b, sq, by) {
    for (let i = 0; i < 64; i++) {
      if (!b[i] || b[i][0] !== by) continue;
      if (b[i][1] === 'P') {
        const d = by === 'w' ? -1 : 1;
        if (Math.abs((i & 7) - (sq & 7)) === 1 && (i >> 3) + d === (sq >> 3)) return true;
      } else if (gen(b, i).includes(sq)) return true;
    }
    return false;
  }

  function after(b, i, j) {
    const n = b.slice();
    n[j] = n[i];
    n[i] = null;
    if (n[j][1] === 'P' && (j >> 3 === 0 || j >> 3 === 7)) n[j] = n[j][0] + 'Q';
    return n;
  }

  function inChk(b, col) {
    return att(b, b.findIndex(x => x === col + 'K'), col === 'w' ? 'b' : 'w');
  }

  function legal(b, i) {
    return gen(b, i).filter(j => !inChk(after(b, i, j), b[i][0]));
  }

  function allMoves(col) {
    const m = [];
    bd.forEach((p, i) => {
      if (p && p[0] === col) legal(bd, i).forEach(j => m.push([i, j]));
    });
    return m;
  }

  function newChess() {
    bd = Array(64).fill(null);
    const B = 'RNBQKBNR';
    for (let c = 0; c < 8; c++) {
      bd[c] = 'b' + B[c];
      bd[8 + c] = 'bP';
      bd[48 + c] = 'wP';
      bd[56 + c] = 'w' + B[c];
    }
    turn = 'w'; cs = -1; lg = []; lm = []; over = false;
    drawC();
    status();
  }

  function status() {
    const m = allMoves(turn), ck = inChk(bd, turn), n = turn === 'w' ? 'Cyan fleet' : 'Orange fleet';
    const cmEl = $('#cm');
    if (!cmEl) return;
    if (!m.length) {
      over = true;
      cmEl.textContent = ck ? 'Checkmate! ' + (turn === 'w' ? 'Orange' : 'Cyan') + ' fleet wins.' : 'Stalemate: draw.';
    } else {
      cmEl.textContent = n + ' to move' + (ck ? ' (check!)' : '');
    }
  }

  function drawC() {
    sync3d();
    const kc = inChk(bd, turn) ? bd.findIndex(x => x === turn + 'K') : -1;
    const cg = $('#cg');
    if (!cg) return;
    cg.innerHTML = bd.map((p, i) => {
      const r = i >> 3, c = i & 7;
      return `<div class="cc ${(r + c) % 2 ? 'd' : 'l'}${i === cs ? ' sel' : ''}${lm.includes(i) ? ' lm' : ''}${i === kc ? ' chk' : ''}${lg.includes(i) ? ' mv' + (p ? ' cap' : '') : ''}" data-i="${i}">${p ? `<span class="${p[0] === 'w' ? 'w' : 'k'}">${GL[p[1]] + E}</span>` : ''}</div>`;
    }).join('');
  }

  function move(i, j) {
    bd = after(bd, i, j);
    lm = [i, j];
    cs = -1;
    lg = [];
    turn = turn === 'w' ? 'b' : 'w';
    drawC();
    status();
    if (vsAI && turn === 'b' && !over) setTimeout(aiMove, 350);
  }

  /* AI engine */
  const PV = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
  function ev(b) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const r = i >> 3, t = p[1], w = p[0] === 'w', cn = 3 - Math.max(Math.abs(r - 3.5), Math.abs((i & 7) - 3.5));
      let v = PV[t];
      if (t === 'P') v += (w ? 6 - r : r - 1) * 8 + cn * 3;
      else if (t === 'N' || t === 'B') v += cn * 12;
      else if (t === 'Q') v += cn * 2;
      s += w ? v : -v;
    }
    return s;
  }

  function pm(b, col, co) {
    const m = [];
    for (let i = 0; i < 64; i++) {
      if (b[i] && b[i][0] === col) {
        for (const j of gen(b, i)) {
          if (co && !b[j]) continue;
          m.push([i, j, b[j] ? PV[b[j][1]] * 10 - PV[b[i][1]] : 0]);
        }
      }
    }
    return m.sort((x, y) => y[2] - x[2]);
  }

  function qs(b, col, a, be) {
    const st = (col === 'w' ? 1 : -1) * ev(b);
    if (st >= be) return st;
    if (st > a) a = st;
    const o = col === 'w' ? 'b' : 'w';
    for (const [i, j] of pm(b, col, 1)) {
      if (b[j][1] === 'K') return 1e5;
      const s = -qs(after(b, i, j), o, -be, -a);
      if (s >= be) return s;
      if (s > a) a = s;
    }
    return a;
  }

  function ng(b, col, d, a, be) {
    if (d < 1) return qs(b, col, a, be);
    const o = col === 'w' ? 'b' : 'w';
    let best = -1e9;
    for (const [i, j] of pm(b, col)) {
      if (b[j] && b[j][1] === 'K') return 1e5 + d;
      const s = -ng(after(b, i, j), o, d - 1, -be, -a);
      if (s > best) {
        best = s;
        if (s > a) a = s;
        if (a >= be) break;
      }
    }
    return best;
  }

  function aiMove() {
    let best = -1e9, pick;
    allMoves('b').forEach(([i, j]) => {
      const s = -ng(after(bd, i, j), 'w', D - 1, -1e9, 1e9) + Math.random() * 4;
      if (s > best) { best = s; pick = [i, j]; }
    });
    if (pick) move(...pick);
  }

  function pickSq(i) {
    if (over || (vsAI && turn === 'b')) return;
    if (lg.includes(i)) return move(cs, i);
    if (bd[i] && bd[i][0] === turn) {
      cs = i;
      lg = legal(bd, i);
    } else {
      cs = -1;
      lg = [];
    }
    drawC();
  }

  $('#cg').onclick = e => {
    const c = e.target.closest('.cc');
    if (c) pickSq(+c.dataset.i);
  };

  /* Three.js 3D View */
  let R3 = null, SC, CM, PG, PL3, SQ = [], th = 0, ph = 0.95, rad = 13, v3 = true;
  let animId = null, resizeObs = null;
  const MT = {};

  function setView() {
    $('#c3').classList.toggle('hide', !v3);
    $('#cg').classList.toggle('hide', v3);
    $('#vw').textContent = 'View: ' + (v3 ? '3D' : '2D');
  }

  function sync3d() {
    if (!R3 || !PG) return;
    while (PG.children.length) PG.remove(PG.children[0]);
    const kc = inChk(bd, turn) ? bd.findIndex(x => x === turn + 'K') : -1;
    bd.forEach((p, i) => {
      if (!p) return;
      const g = mk(p[1], p[0]);
      g.position.set((i & 7) - 3.5, 0.1, (i >> 3) - 3.5);
      g.userData.i = i;
      PG.add(g);
    });
    SQ.forEach((m, i) => {
      if (!m.material) return;
      m.material.emissive.setHex(
        i === kc ? 0x7a1f35 :
        i === cs ? 0x4a62c9 :
        lg.includes(i) ? (bd[i] ? 0x992233 : 0x8a6a00) :
        lm.includes(i) ? 0x3a3000 : 0
      );
    });
  }

  function mk(t, c) {
    const THREE = window.THREE;
    const g = new THREE.Group(), m = MT[c];
    const add = (geo, x = 0, y = 0, z = 0, rt = [0, 0, 0]) => {
      const s = new THREE.Mesh(geo, m);
      s.position.set(x, y, z);
      s.rotation.set(...rt);
      g.add(s);
    };
    const Lh = a => new THREE.LatheGeometry(a.map(([r, y])=> new THREE.Vector2(r, y)), 20);
    const bs = [[0.001, 0], [0.34, 0], [0.34, 0.1], [0.15, 0.25]];
    const Tr = (r, q) => new THREE.TorusGeometry(r, q, 8, 24);
    const Sp = r => new THREE.SphereGeometry(r, 16, 12);

    if (t === 'P') {
      add(Lh([...bs, [0.13, 0.4], [0.001, 0.4]]));
      add(Sp(0.2), 0, 0.55);
    } else if (t === 'R') {
      add(Lh([...bs, [0.22, 0.7], [0.34, 0.8], [0.001, 0.8]]));
      add(Tr(0.32, 0.05), 0, 0.5, 0, [1.57, 0, 0]);
    } else if (t === 'N') {
      add(Lh([...bs, [0.001, 0.25]]));
      add(new THREE.CylinderGeometry(0.17, 0.22, 0.7, 16), 0, 0.6);
      add(new THREE.ConeGeometry(0.17, 0.4, 16), 0, 1.15);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.094;
        add(new THREE.BoxGeometry(0.04, 0.3, 0.25), Math.sin(a) * 0.25, 0.4, Math.cos(a) * 0.25, [0, a, 0]);
      }
    } else if (t === 'B') {
      add(Lh([...bs, [0.2, 0.5], [0.1, 0.9], [0.001, 1.1]]));
      add(Sp(0.13), 0, 1.15);
      add(Tr(0.24, 0.03), 0, 0.6, 0, [1.57, 0, 0]);
    } else if (t === 'Q') {
      add(Lh([...bs, [0.2, 0.7], [0.3, 1], [0.001, 1]]));
      add(Sp(0.18), 0, 1.2);
      add(Tr(0.34, 0.04), 0, 1, 0, [1.2, 0, 0.3]);
    } else {
      add(Lh([...bs, [0.22, 0.9], [0.3, 1], [0.001, 1]]));
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), 0, 1.25);
      add(new THREE.BoxGeometry(0.3, 0.04, 0.04), 0, 1.35);
    }
    return g;
  }

  function rsz() {
    const c3 = $('#c3');
    if (!c3 || !R3) return;
    const w = c3.clientWidth;
    if (!w) return;
    R3.setSize(w, w, false);
    CM.aspect = 1;
    CM.updateProjectionMatrix();
  }

  function init3d() {
    const THREE = window.THREE;
    try {
      if (typeof THREE === 'undefined') throw new Error('Three.js not loaded');
      R3 = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      R3 = null;
      v3 = false;
      setView();
      return;
    }

    const c3 = $('#c3');
    c3.replaceChildren(R3.domElement);
    SC = new THREE.Scene();
    CM = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    SC.add(new THREE.AmbientLight(0x8899cc, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(5, 10, 6);
    SC.add(dl);

    MT.w = new THREE.MeshStandardMaterial({ color: 0x6fe3ff, emissive: 0x1a6fa0, metalness: 0.6, roughness: 0.3 });
    MT.b = new THREE.MeshStandardMaterial({ color: 0xff8a4d, emissive: 0x8a2a0a, metalness: 0.6, roughness: 0.3 });

    const sp = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u);
      sp.push(90 * s * Math.cos(a), 90 * u, 90 * s * Math.sin(a));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    SC.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })));

    PL3 = new THREE.Group();
    PL3.add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 24), new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9, emissive: 0x2a1608 })));
    const rg = new THREE.Mesh(new THREE.RingGeometry(8, 12, 64), new THREE.MeshBasicMaterial({ color: 0xe8d48a, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }));
    rg.rotation.x = 1.3;
    PL3.add(rg);
    PL3.position.set(-28, 12, -40);
    SC.add(PL3);

    const fr = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.3, 8.6), new THREE.MeshStandardMaterial({ color: 0x0b1030, metalness: 0.8, roughness: 0.4 }));
    fr.position.y = -0.2;
    SC.add(fr);

    SQ = [];
    for (let i = 0; i < 64; i++) {
      const r = i >> 3, c = i & 7;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshStandardMaterial({ color: (r + c) % 2 ? 0x1a2358 : 0x3a4a96, roughness: 0.5 }));
      m.position.set(c - 3.5, 0, r - 3.5);
      m.userData.i = i;
      SC.add(m);
      SQ.push(m);
    }
    PG = new THREE.Group();
    SC.add(PG);

    const el = R3.domElement;
    let dr = null;
    el.onpointerdown = e => {
      dr = { x: e.clientX, y: e.clientY, m: 0 };
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    };
    el.onpointermove = e => {
      if (!dr) return;
      const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
      dr.m += Math.abs(dx) + Math.abs(dy);
      th -= dx * 0.01;
      ph = Math.min(1.45, Math.max(0.25, ph - dy * 0.01));
      dr.x = e.clientX;
      dr.y = e.clientY;
    };
    el.onpointerup = e => {
      if (dr && dr.m < 6) {
        const b = el.getBoundingClientRect(), rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1), CM);
        const h = rc.intersectObjects([...SQ, ...PG.children], true)[0];
        if (h) {
          let o = h.object;
          while (o && o.userData.i === undefined) o = o.parent;
          if (o && o.userData.i !== undefined) pickSq(o.userData.i);
        }
      }
      dr = null;
    };
    el.onwheel = e => {
      e.preventDefault();
      rad = Math.min(22, Math.max(8, rad + e.deltaY * 0.01));
    };

    resizeObs = new ResizeObserver(rsz);
    resizeObs.observe(c3);

    (function loop() {
      if (!root.isConnected) return;
      animId = requestAnimationFrame(loop);
      if (!c3.clientWidth) return;
      CM.position.set(rad * Math.sin(ph) * Math.sin(th), rad * Math.cos(ph), rad * Math.sin(ph) * Math.cos(th));
      CM.lookAt(0, 0, 0);
      PL3.rotation.y += 0.002;
      R3.render(SC, CM);
    })();

    setView();
    sync3d();
  }

  $('#nw').onclick = newChess;
  $('#ai').onclick = () => {
    li = (li + 1) % 4;
    D = LV[li][1];
    vsAI = D > 0;
    $('#ai').textContent = 'Mode: ' + LV[li][0];
    newChess();
  };
  $('#vw').onclick = () => {
    if (!R3) return;
    v3 = !v3;
    setView();
  };

  newChess();

  // Load Three.js safely
  const loadThree = () => new Promise((resolve, reject) => {
    if (window.THREE) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Three.js'));
    document.head.appendChild(script);
  });

  loadThree().then(() => init3d()).catch(() => {
    const vw = $('#vw');
    if (vw) vw.textContent = 'View: 2D';
    v3 = false;
    setView();
  });

  return () => {
    if (animId) cancelAnimationFrame(animId);
    if (resizeObs) resizeObs.disconnect();
    root.remove();
    style.remove();
  };
}
