import { api } from './api.js';
// feed(name, simFn, ms) -> subscribe(fn(value, isSim)) -> unsubscribe.
// Tries the engine feed first. A 404 means no engine provides it, so the simulator runs and the widget shows SIM.
export const feed = (name, sim, ms = 2000) => fn => {
  let live = true, real = null, n = 0;
  const tick = async () => {
    if (!live) return;
    let v, s = true;
    if (++n % 30 === 0 && real === false) real = null;
    if (real !== false) {
      try { v = await api('feed/' + name); s = false; real = true; }
      catch (e) { if (e.status === 404 || e.status === 503) real = false; }
    }
    if (!live) return;
    if (v === undefined) v = sim();
    fn(v, s);
  };
  tick();
  const id = setInterval(tick, ms);
  return () => { live = false; clearInterval(id); };
};
