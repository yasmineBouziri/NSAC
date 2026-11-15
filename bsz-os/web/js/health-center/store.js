import { api } from '../core/api.js';

const dateKey = (date = new Date()) => {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const localTimestamp = (hour, minute) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const freshState = () => ({
  version: 1,
  reminders: {},
  history: {},
  menstrual: { enabled: false, periods: [], symptoms: {} },
  nutrition: {
    dayKey: dateKey(), goalMl: 2000, waterMl: 1280, meals: [
      { label: 'Breakfast · rehydrated oatmeal', category: 'meal', energy: 520, protein: 38, at: localTimestamp(7, 10) },
      { label: 'Water · 500 ml', category: 'water', water: 500, at: localTimestamp(8, 30) },
    ],
    nutrientIntake: { energy: 1480, protein: 62, calcium: 610, vitaminD: 300, sodium: 2100 },
  },
  gym: { videoNames: {} },
  zibo: { position: null },
  sensorsConnected: false,
  sensorPort: null,
});

const mergeDefaults = state => {
  const defaults = freshState();
  const value = state && typeof state === 'object' ? state : {};
  const nutrition = {
    ...defaults.nutrition, ...(value.nutrition || {}),
    nutrientIntake: { ...defaults.nutrition.nutrientIntake, ...(value.nutrition?.nutrientIntake || {}) },
  };
  if (nutrition.dayKey !== defaults.nutrition.dayKey) {
    nutrition.dayKey = defaults.nutrition.dayKey;
    nutrition.waterMl = defaults.nutrition.waterMl;
    nutrition.meals = defaults.nutrition.meals;
    nutrition.nutrientIntake = { ...defaults.nutrition.nutrientIntake };
  }
  return {
    ...defaults, ...value,
    reminders: { ...defaults.reminders, ...(value.reminders || {}) },
    history: { ...defaults.history, ...(value.history || {}) },
    menstrual: { ...defaults.menstrual, ...(value.menstrual || {}) },
    nutrition,
    gym: { ...defaults.gym, ...(value.gym || {}), videoNames: { ...defaults.gym.videoNames, ...(value.gym?.videoNames || {}) } },
    zibo: { ...defaults.zibo, ...(value.zibo || {}) },
  };
};

export class HealthCenterStore extends EventTarget {
  constructor() {
    super();
    this.state = freshState();
    this.ready = false;
    this.error = '';
    this.pendingWrite = Promise.resolve();
    this.revision = 0;
  }

  async load() {
    try {
      let response;
      try {
        response = await api('health-center/state');
      } catch (err) {
        if (err.status === 404) response = await api('health/center-state');
        else throw err;
      }
      this.state = mergeDefaults(response?.state);
    } catch (error) {
      this.state = freshState();
      this.error = error.message || 'Health Center data is currently unavailable.';
    }
    this.ready = true;
    this.dispatchEvent(new Event('change'));
    return this.state;
  }

  getState() {
    return this.state;
  }

  update(mutator) {
    if (this.state.nutrition.dayKey !== dateKey()) {
      const dailyDefaults = freshState().nutrition;
      this.state.nutrition.dayKey = dailyDefaults.dayKey;
      this.state.nutrition.waterMl = dailyDefaults.waterMl;
      this.state.nutrition.meals = dailyDefaults.meals;
      this.state.nutrition.nutrientIntake = { ...dailyDefaults.nutrientIntake };
    }
    mutator(this.state);
    this.revision++;
    const revision = this.revision;
    const snapshot = JSON.parse(JSON.stringify(this.state));
    this.error = '';
    this.dispatchEvent(new Event('change'));
    this.pendingWrite = this.pendingWrite.catch(() => {}).then(async () => {
      try {
        try {
          await api('health-center/state', { method: 'PUT', body: { state: snapshot } });
        } catch (err) {
          if (err.status === 404) await api('health/center-state', { method: 'PUT', body: { state: snapshot } });
          else throw err;
        }
        if (revision === this.revision) {
          this.error = '';
          this.dispatchEvent(new Event('change'));
        }
      } catch (error) {
        if (revision === this.revision) {
          this.error = error.message || 'Could not save your Health Center changes.';
          this.dispatchEvent(new Event('change'));
        }
        throw error;
      }
    });
    this.pendingWrite.catch(() => {});
    return this.pendingWrite;
  }

  record(metricKey, entry) {
    return this.update(state => {
      const items = state.history[metricKey] || (state.history[metricKey] = []);
      items.unshift({ ...entry, at: new Date().toISOString() });
      if (items.length > 200) items.length = 200;
    });
  }
}

export { freshState };
