// Pure game logic, no DOM. Tested in node.
export function slide(row) {
  const a = row.filter(Boolean), o = [];
  let gain = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === a[i + 1]) { o.push(a[i] * 2); gain += a[i] * 2; i++; } else o.push(a[i]);
  }
  while (o.length < row.length) o.push(0);
  return { row: o, gain };
}
export function move(b, dir) {
  const n = b.length, g = b.map(r => r.slice()), horiz = dir === 'L' || dir === 'R', rev = dir === 'R' || dir === 'D';
  let moved = false, gain = 0;
  for (let i = 0; i < n; i++) {
    let line = horiz ? g[i].slice() : g.map(r => r[i]);
    if (rev) line.reverse();
    const r = slide(line);
    const out = rev ? r.row.reverse() : r.row;
    gain += r.gain;
    for (let j = 0; j < n; j++) {
      const [y, x] = horiz ? [i, j] : [j, i];
      if (g[y][x] !== out[j]) { moved = true; g[y][x] = out[j]; }
    }
  }
  return { board: g, moved, gain };
}
export function spawn(b) {
  const e = [];
  b.forEach((r, y) => r.forEach((v, x) => v || e.push([y, x])));
  if (!e.length) return null;
  const [y, x] = e[(Math.random() * e.length) | 0];
  b[y][x] = Math.random() < 0.9 ? 2 : 4;
  return [y, x];
}
export const canMove = b => ['L', 'R', 'U', 'D'].some(d => move(b, d).moved);

export function snakeFood(s) {
  let f;
  do f = [(Math.random() * s.n) | 0, (Math.random() * s.n) | 0]; while (s.body.some(p => p[0] === f[0] && p[1] === f[1]));
  return f;
}
export function snakeNew(n = 16) {
  const s = { n, body: [[4, 8], [3, 8], [2, 8]], dir: [1, 0], score: 0, dead: false };
  s.food = snakeFood(s);
  return s;
}
export function snakeStep(s, d) {
  if (d && !(d[0] === -s.dir[0] && d[1] === -s.dir[1])) s.dir = d;
  const hd = [s.body[0][0] + s.dir[0], s.body[0][1] + s.dir[1]];
  if (hd[0] < 0 || hd[1] < 0 || hd[0] >= s.n || hd[1] >= s.n || s.body.slice(0, -1).some(p => p[0] === hd[0] && p[1] === hd[1])) { s.dead = true; return s; }
  s.body.unshift(hd);
  if (hd[0] === s.food[0] && hd[1] === s.food[1]) { s.score++; s.food = snakeFood(s); } else s.body.pop();
  return s;
}
