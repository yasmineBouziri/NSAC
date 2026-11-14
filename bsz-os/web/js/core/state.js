import { api } from './api.js';
import { uid } from './util.js';
// city: [IANA zone, lat, lon, mean temp C]
export const CITIES = {
  Houston: ['America/Chicago', 29.8, -95.4, 21], 'Cape Canaveral': ['America/New_York', 28.4, -80.6, 25],
  Tunis: ['Africa/Tunis', 36.8, 10.2, 18], Cologne: ['Europe/Berlin', 50.9, 7, 10], Paris: ['Europe/Paris', 48.9, 2.4, 12],
  Moscow: ['Europe/Moscow', 55.8, 37.6, 6], Baikonur: ['Asia/Qyzylorda', 45.9, 63.3, 13], Tokyo: ['Asia/Tokyo', 35.7, 139.7, 16],
  Beijing: ['Asia/Shanghai', 39.9, 116.4, 13], Bangalore: ['Asia/Kolkata', 13, 77.6, 26], Canberra: ['Australia/Sydney', -35.3, 149.1, 13],
  Cairo: ['Africa/Cairo', 30, 31.2, 22], Kourou: ['America/Cayenne', 5.2, -52.7, 27], Reykjavik: ['Atlantic/Reykjavik', 64.1, -21.9, 4],
  UTC: ['UTC', 0, 0, 15],
};
export const DEF = { widgets: [], recent: [], settings: { theme: 'aurora', motion: 'full', h24: true, city: 'Houston', stars: true, density: 'comfortable' } };
export const S = { user: null, data: structuredClone(DEF) };
let t;
export const save = () => { clearTimeout(t); t = setTimeout(flush, 400); };
export const flush = () => api('state', { method: 'PUT', body: S.data }).catch(() => {});
export async function loadState() {
  const d = await api('state');
  S.data = { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) } };
  if (!d.widgets) {
    S.data.widgets = [{ uid: uid(), type: 'citytime', size: 'm', cfg: {} }, { uid: uid(), type: 'calendar', size: 'l', cfg: {} }];
    save();
  }
}
