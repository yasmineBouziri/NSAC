import { h, pad, every, iso } from '../core/util.js';
import { S, save, CITIES } from '../core/state.js';
import {
  getLocalTimezone,
  getLocalCityName,
  setLocalTimezone,
  getTimezoneInfo,
  getAllTimezones,
  MAJOR_CITIES,
  getTimezoneOffsetMinutes
} from '../lib/timezones.js';
import { playAlarm, stopAlarm, playTimerChime, playBeep } from '../lib/audio.js';
import { toast } from '../core/notify.js';

// ---- SVG Line Icons (No ordinary emojis) ----
function svg(paths, size = 16, strokeWidth = 1.8) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', String(strokeWidth));
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('class', 'app-svg-ico');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = paths;
  return el;
}

const ICO_WORLD = '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>';
const ICO_ALARM = '<circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14 15"/><line x1="5" y1="3" x2="2" y2="6"/><line x1="19" y1="3" x2="22" y2="6"/>';
const ICO_STOPWATCH = '<circle cx="12" cy="14" r="8"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="2" x2="12" y2="6"/>';
const ICO_TIMER = '<path d="M5 22h14M5 2h14M17 22v-4.17a3 3 0 0 0-.88-2.12L13.4 13a2 2 0 0 1 0-2l2.72-2.71a3 3 0 0 0 .88-2.12V2M7 22v-4.17a3 3 0 0 1 .88-2.12L10.6 13a2 2 0 0 0 0-2L7.88 8.29A3 3 0 0 1 7 6.17V2"/>';
const ICO_MET = '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12l2 2M15 5a2 2 0 1 0 2 2"/>';
const ICO_CAL = '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
const ICO_BELL = '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>';
const ICO_CLOSE = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
const ICO_EDIT = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';
const ICO_UP = '<polyline points="18 15 12 9 6 15"/>';
const ICO_DOWN = '<polyline points="6 9 12 15 18 9"/>';
const ICO_PREV = '<polyline points="15 18 9 12 15 6"/>';
const ICO_NEXT = '<polyline points="9 18 15 12 9 6"/>';

// ---- Active Global State for Stopwatch, Timer, Alarms ----
const stopwatchState = {
  running: false,
  startTime: 0,
  accumulatedMs: 0,
  laps: [], // { lapMs, totalMs }
};

const timerState = {
  running: false,
  durationMs: 300000, // 5 min default
  targetTime: 0,
  remainingMs: 300000,
  completed: false,
};

let activeAlarmModal = null;
let lastAlarmMinute = '';

// Helper to format milliseconds to MM:SS.cs
function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${pad(min)}:${pad(sec)}.${pad(cs)}`;
}

// Global alarm monitor loop
export function initGlobalAlarmMonitor() {
  setInterval(() => {
    checkAlarms();
  }, 1000);
}

function checkAlarms() {
  const alarms = S.data?.clock?.alarms;
  if (!alarms || !alarms.length) return;

  const localTz = getLocalTimezone();
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: localTz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const timeStr = dtf.format(now); // "HH:MM"

  // Check day of week (0=Sun, 1=Mon... 6=Sat -> convert to 1=Mon..7=Sun)
  const dtfDay = new Intl.DateTimeFormat('en-US', { timeZone: localTz, weekday: 'short' }).format(now);
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const currentDayNum = dayMap[dtfDay] || 1;

  if (timeStr === lastAlarmMinute) return;

  for (const alm of alarms) {
    if (!alm.enabled) continue;
    if (alm.time === timeStr) {
      // Check repeat schedule (empty days means once)
      const matchesDay = !alm.days || !alm.days.length || alm.days.includes(currentDayNum);
      if (matchesDay) {
        lastAlarmMinute = timeStr;
        triggerAlarmAlert(alm);
        break;
      }
    }
  }
}

function triggerAlarmAlert(alm) {
  playAlarm();
  toast('ALARM: ' + (alm.label || 'Alarm'), `Ringing at ${alm.time}`, 'alert');

  if (activeAlarmModal) activeAlarmModal.remove();

  const overlay = h('div', { class: 'alarm-ringing-overlay' });
  const card = h('div', { class: 'alarm-ringing-card' });
  const bell = h('div', { class: 'ringing-bell' }, svg(ICO_BELL, 44, 1.8));
  const title = h('h2', {}, alm.label || 'Alarm');
  const time = h('div', { class: 'ringing-time' }, alm.time);
  const info = h('p', { class: 'dim' }, 'Crew Wake / Station Scheduled Event');

  const snoozeBtn = h('button', { class: 'pill', onClick: () => {
    stopAlarm();
    overlay.remove();
    activeAlarmModal = null;
    toast('Alarm Snoozed', 'Will ring again in 5 minutes', 'info');
    // Schedule snooze alarm 5 min later
    const now = new Date(Date.now() + 5 * 60000);
    const snzTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    S.data.clock.alarms.push({
      id: 'snz_' + Date.now(),
      time: snzTime,
      label: 'Snooze: ' + (alm.label || 'Alarm'),
      days: [],
      enabled: true,
      isSnooze: true
    });
    save();
  } }, 'Snooze (+5 min)');

  const dismissBtn = h('button', { class: 'pill open-pill', onClick: () => {
    stopAlarm();
    overlay.remove();
    activeAlarmModal = null;
    if (alm.isSnooze) {
      S.data.clock.alarms = S.data.clock.alarms.filter(a => a.id !== alm.id);
      save();
    } else if (!alm.days || !alm.days.length) {
      alm.enabled = false;
      save();
    }
  } }, 'Dismiss');

  const acts = h('div', { class: 'ringing-actions' }, snoozeBtn, dismissBtn);
  card.append(bell, title, time, info, acts);
  overlay.append(card);
  document.body.appendChild(overlay);
  activeAlarmModal = overlay;
}

// ---- Main Clock Applet Component ----
export function mountClockApplet(container) {
  // Ensure storage exists in S.data
  S.data.clock ||= {};
  S.data.clock.worldClocks ||= [
    { city: getLocalCityName(), tz: getLocalTimezone(), isLocal: true },
    { city: 'UTC Space Standard', tz: 'UTC' },
    { city: 'Houston', tz: 'America/Chicago', note: 'Mission Control' },
    { city: 'Tokyo', tz: 'Asia/Tokyo', note: 'JAXA Control' },
    { city: 'Tunis', tz: 'Africa/Tunis' },
  ];
  S.data.clock.alarms ||= [
    { id: 'alm_1', time: '06:30', label: 'Crew Wake & Morning Telemetry', days: [1, 2, 3, 4, 5], enabled: true },
    { id: 'alm_2', time: '17:00', label: 'Aerobic & Resistance Exercise', days: [1, 2, 3, 4, 5, 6, 7], enabled: true },
  ];
  S.data.clock.met ||= {
    name: 'BSZ-1 Mission',
    start: new Date(Date.now() - 142 * 86400000 - 8 * 3600000 - 24 * 60000).toISOString(),
    isPaused: false,
    pausedDurationMs: 0,
    pausedAt: null
  };
  S.data.clock.calendarEvents ||= {};

  let activeTab = 'world'; // 'world' | 'alarms' | 'stopwatch' | 'timer' | 'met' | 'calendar'
  let appletInterval = null;

  const tabsNav = h('nav', { class: 'clock-nav' });
  const contentArea = h('div', { class: 'clock-content' });

  const tabsConfig = [
    { id: 'world', label: 'World Clock', iconPath: ICO_WORLD },
    { id: 'alarms', label: 'Alarms', iconPath: ICO_ALARM },
    { id: 'stopwatch', label: 'Stopwatch', iconPath: ICO_STOPWATCH },
    { id: 'timer', label: 'Timer', iconPath: ICO_TIMER },
    { id: 'met', label: 'Mission Time', iconPath: ICO_MET },
    { id: 'calendar', label: 'Calendar', iconPath: ICO_CAL },
  ];

  function renderTabs() {
    tabsNav.replaceChildren(...tabsConfig.map(t => {
      const active = t.id === activeTab;
      const b = h('button', {
        class: 'clock-nav-btn' + (active ? ' on' : ''),
        'aria-selected': active,
        onClick: () => {
          activeTab = t.id;
          renderTabs();
          renderContent();
        }
      }, h('span', { class: 'nav-icon' }, svg(t.iconPath, 16)), h('span', { class: 'nav-label' }, t.label));
      return b;
    }));
  }

  function renderContent() {
    contentArea.replaceChildren();
    if (activeTab === 'world') renderWorldClock(contentArea);
    else if (activeTab === 'alarms') renderAlarms(contentArea);
    else if (activeTab === 'stopwatch') renderStopwatch(contentArea);
    else if (activeTab === 'timer') renderTimer(contentArea);
    else if (activeTab === 'met') renderMET(contentArea);
    else if (activeTab === 'calendar') renderCalendar(contentArea);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. WORLD CLOCK
  // ─────────────────────────────────────────────────────────────
  function renderWorldClock(view) {
    const localTz = getLocalTimezone();
    const localCity = getLocalCityName();

    const head = h('div', { class: 'sec-head' },
      h('div', {},
        h('h3', {}, 'World Time Zones'),
        h('p', { class: 'dim' }, `Local reference: ${localCity} (${localTz})`)
      ),
      h('button', { class: 'pill open-pill', onClick: () => showTimezoneSearchModal() }, '+ Add City')
    );

    const list = h('div', { class: 'world-grid' });

    function drawClocks() {
      const clocks = S.data.clock.worldClocks;
      list.replaceChildren(...clocks.map((c, idx) => {
        const info = getTimezoneInfo(c.tz, localTz);
        const isCurrentLocal = c.tz === localTz;

        const cityTitle = h('div', { class: 'wc-city' },
          h('b', {}, c.city || info.city || c.tz),
          c.note ? h('span', { class: 'badge sm' }, c.note) : null
        );

        const relBadge = h('span', { class: 'wc-rel-badge' },
          info.dayDiff !== 'Today' ? `${info.dayDiff}, ${info.diffStr}` : info.diffStr
        );

        const offsetBadge = h('span', { class: 'wc-utc-badge' }, info.utcOffsetStr);
        const dayNight = h('span', { class: 'wc-dn-badge ' + (info.isDay ? 'day' : 'night') },
          info.isDay ? 'DAY' : 'NIGHT'
        );

        const timeRow = h('div', { class: 'wc-time-row' },
          h('div', { class: 'wc-bigtime' },
            h('span', { class: 'wc-time' }, info.time),
            h('span', { class: 'wc-sec' }, ':' + info.seconds),
            info.dayPeriod ? h('span', { class: 'wc-ampm' }, info.dayPeriod) : null
          ),
          dayNight
        );

        const dateRow = h('div', { class: 'wc-date-row' },
          h('span', { class: 'dim' }, info.date),
          h('div', { class: 'wc-badges' }, relBadge, offsetBadge)
        );

        // Actions: Make Local, Move Up, Move Down, Delete
        const makeLocalBtn = h('button', {
          class: 'pill sm' + (isCurrentLocal ? ' on' : ''),
          title: isCurrentLocal ? 'Current primary local timezone' : 'Set as primary local timezone',
          onClick: () => {
            setLocalTimezone(c.tz, c.city);
            c.isLocal = true;
            clocks.forEach((x, i) => { if (i !== idx) x.isLocal = false; });
            save();
            renderWorldClock(view);
          }
        }, isCurrentLocal ? 'Primary Local' : 'Set Local');

        const upBtn = h('button', {
          class: 'ico sm',
          title: 'Move up',
          disabled: idx === 0,
          onClick: () => {
            if (idx > 0) {
              const temp = clocks[idx];
              clocks[idx] = clocks[idx - 1];
              clocks[idx - 1] = temp;
              save();
              renderWorldClock(view);
            }
          }
        }, svg(ICO_UP, 13, 2));

        const downBtn = h('button', {
          class: 'ico sm',
          title: 'Move down',
          disabled: idx === clocks.length - 1,
          onClick: () => {
            if (idx < clocks.length - 1) {
              const temp = clocks[idx];
              clocks[idx] = clocks[idx + 1];
              clocks[idx + 1] = temp;
              save();
              renderWorldClock(view);
            }
          }
        }, svg(ICO_DOWN, 13, 2));

        const delBtn = h('button', {
          class: 'ico sm del',
          title: 'Remove clock',
          onClick: () => {
            clocks.splice(idx, 1);
            save();
            renderWorldClock(view);
          }
        }, svg(ICO_CLOSE, 13, 2));

        const cardActions = h('div', { class: 'wc-card-actions' }, makeLocalBtn, upBtn, downBtn, delBtn);
        const card = h('div', { class: 'wc-card' + (isCurrentLocal ? ' is-local' : '') },
          h('div', { class: 'wc-card-top' }, cityTitle, cardActions),
          timeRow,
          dateRow
        );
        return card;
      }));
    }

    drawClocks();
    view.replaceChildren(head, list);
  }

  // Timezone search modal
  function showTimezoneSearchModal() {
    const allTz = getAllTimezones();
    const modal = h('div', { class: 'modal-overlay' });
    const box = h('div', { class: 'tz-modal' });

    const mHead = h('div', { class: 'tz-modal-head' },
      h('h3', {}, 'Choose World Time Zone'),
      h('button', { class: 'ico', title: 'Close', onClick: () => modal.remove() }, svg(ICO_CLOSE, 16, 2))
    );

    const searchInput = h('input', {
      type: 'text',
      class: 'tz-search-input',
      placeholder: 'Search city, country, or region (e.g. Paris, Tokyo, Tunis, USA)...',
      autofocus: true
    });

    const filterChips = h('div', { class: 'tz-filter-chips' });
    const regions = ['All', 'Europe', 'Americas', 'Asia', 'Africa', 'Oceania'];
    let selectedRegion = 'All';

    const resultsList = h('div', { class: 'tz-results-list' });

    function renderResults(filterText = '') {
      const q = filterText.trim().toLowerCase();
      const filtered = allTz.filter(item => {
        if (selectedRegion !== 'All' && item.region !== selectedRegion) return false;
        if (!q) return true;
        return item.city.toLowerCase().includes(q) ||
               (item.country && item.country.toLowerCase().includes(q)) ||
               item.tz.toLowerCase().includes(q) ||
               (item.note && item.note.toLowerCase().includes(q));
      }).slice(0, 50);

      resultsList.replaceChildren(...filtered.map(item => {
        const offMin = getTimezoneOffsetMinutes(item.tz);
        const offSign = offMin >= 0 ? '+' : '-';
        const offHr = Math.floor(Math.abs(offMin) / 60);
        const offRem = Math.abs(offMin) % 60;
        const offStr = `UTC${offSign}${offHr}${offRem ? ':' + pad(offRem) : ''}`;

        const row = h('button', {
          class: 'tz-result-row',
          onClick: () => {
            S.data.clock.worldClocks.push({
              city: item.city,
              tz: item.tz,
              note: item.note || null
            });
            save();
            modal.remove();
            renderContent();
          }
        },
          h('div', { class: 'tz-res-info' },
            h('b', {}, item.city),
            h('span', { class: 'dim' }, item.country || item.region),
            item.note ? h('span', { class: 'badge sm' }, item.note) : null
          ),
          h('div', { class: 'tz-res-meta' },
            h('span', { class: 'tz-offset' }, offStr),
            h('span', { class: 'tz-add-plus' }, '+')
          )
        );
        return row;
      }));

      if (!filtered.length) {
        resultsList.replaceChildren(h('div', { class: 'tz-empty' }, 'No time zones match your search.'));
      }
    }

    function renderFilterChips() {
      filterChips.replaceChildren(...regions.map(r => {
        const on = r === selectedRegion;
        return h('button', {
          class: 'pill sm' + (on ? ' on' : ''),
          onClick: () => {
            selectedRegion = r;
            renderFilterChips();
            renderResults(searchInput.value);
          }
        }, r);
      }));
    }

    searchInput.oninput = () => renderResults(searchInput.value);
    renderFilterChips();
    renderResults();

    box.append(mHead, searchInput, filterChips, resultsList);
    modal.append(box);
    document.body.appendChild(modal);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ALARMS
  // ─────────────────────────────────────────────────────────────
  function renderAlarms(view) {
    const alarms = S.data.clock.alarms;
    const now = new Date();
    const localTz = getLocalTimezone();

    // Compute upcoming alarm countdown
    let nextAlarmInfo = 'No upcoming alarms set.';
    const enabledAlarms = alarms.filter(a => a.enabled);
    if (enabledAlarms.length) {
      let minDiffMs = Infinity;
      let nextAlm = null;
      enabledAlarms.forEach(a => {
        const [ah, am] = a.time.split(':').map(Number);
        const target = new Date();
        target.setHours(ah, am, 0, 0);
        let diff = target.getTime() - now.getTime();
        if (diff <= 0) diff += 86400000; // tomorrow
        if (diff < minDiffMs) {
          minDiffMs = diff;
          nextAlm = a;
        }
      });
      if (nextAlm) {
        const hRemain = Math.floor(minDiffMs / 3600000);
        const mRemain = Math.floor((minDiffMs % 3600000) / 60000);
        nextAlarmInfo = `Next alarm: in ${hRemain > 0 ? hRemain + ' hr ' : ''}${mRemain} min (${nextAlm.label || nextAlm.time})`;
      }
    }

    const head = h('div', { class: 'sec-head' },
      h('div', {},
        h('h3', {}, 'Alarms'),
        h('p', { class: 'dim' }, nextAlarmInfo)
      ),
      h('button', { class: 'pill open-pill', onClick: () => showAlarmEditModal() }, '+ New Alarm')
    );

    const list = h('div', { class: 'alarms-list' });

    function drawAlarms() {
      if (!alarms.length) {
        list.replaceChildren(h('div', { class: 'empty-notice' }, 'No alarms configured. Tap "+ New Alarm" to add one.'));
        return;
      }

      list.replaceChildren(...alarms.map((alm, idx) => {
        const daysLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const repeatPills = h('div', { class: 'alarm-days' },
          daysLabels.map((lbl, dIdx) => {
            const dayNum = dIdx + 1;
            const on = alm.days && alm.days.includes(dayNum);
            return h('button', {
              class: 'day-pill' + (on ? ' on' : ''),
              onClick: () => {
                alm.days ||= [];
                if (alm.days.includes(dayNum)) {
                  alm.days = alm.days.filter(d => d !== dayNum);
                } else {
                  alm.days.push(dayNum);
                  alm.days.sort();
                }
                save();
                renderAlarms(view);
              }
            }, lbl);
          })
        );

        const toggleBtn = h('button', {
          class: 'alarm-toggle' + (alm.enabled ? ' on' : ''),
          'aria-pressed': alm.enabled,
          onClick: () => {
            alm.enabled = !alm.enabled;
            save();
            renderAlarms(view);
          }
        }, h('span', { class: 'toggle-slider' }));

        const editBtn = h('button', {
          class: 'ico sm',
          title: 'Edit alarm',
          onClick: () => showAlarmEditModal(alm, idx)
        }, svg(ICO_EDIT, 14, 2));

        const delBtn = h('button', {
          class: 'ico sm del',
          title: 'Delete alarm',
          onClick: () => {
            alarms.splice(idx, 1);
            save();
            renderAlarms(view);
          }
        }, svg(ICO_CLOSE, 14, 2));

        const card = h('div', { class: 'alarm-card' + (alm.enabled ? ' active' : ' disabled') },
          h('div', { class: 'alarm-main' },
            h('div', { class: 'alarm-time' }, alm.time),
            h('div', { class: 'alarm-meta' },
              h('div', { class: 'alarm-label' }, alm.label || 'Alarm'),
              repeatPills
            )
          ),
          h('div', { class: 'alarm-actions' }, toggleBtn, editBtn, delBtn)
        );
        return card;
      }));
    }

    drawAlarms();
    view.replaceChildren(head, list);
  }

  function showAlarmEditModal(existing = null, editIdx = -1) {
    const modal = h('div', { class: 'modal-overlay' });
    const box = h('div', { class: 'alarm-modal' });

    const mHead = h('div', { class: 'tz-modal-head' },
      h('h3', {}, existing ? 'Edit Alarm' : 'New Alarm'),
      h('button', { class: 'ico', title: 'Close', onClick: () => modal.remove() }, svg(ICO_CLOSE, 16, 2))
    );

    const timeInput = h('input', {
      type: 'time',
      class: 'alarm-time-input',
      value: existing ? existing.time : '07:00'
    });

    const labelInput = h('input', {
      type: 'text',
      class: 'alarm-label-input',
      placeholder: 'Alarm Label (e.g. Cardio Exercise, Shift Handover)',
      value: existing ? existing.label : ''
    });

    const days = existing?.days ? [...existing.days] : [1, 2, 3, 4, 5];
    const daysRow = h('div', { class: 'modal-days-row' },
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((lbl, i) => {
        const dNum = i + 1;
        const btn = h('button', {
          class: 'pill sm' + (days.includes(dNum) ? ' on' : ''),
          onClick: () => {
            if (days.includes(dNum)) {
              const idx = days.indexOf(dNum);
              days.splice(idx, 1);
              btn.classList.remove('on');
            } else {
              days.push(dNum);
              days.sort();
              btn.classList.add('on');
            }
          }
        }, lbl);
        return btn;
      })
    );

    const saveBtn = h('button', {
      class: 'pill open-pill',
      onClick: () => {
        const timeVal = timeInput.value || '07:00';
        const labelVal = labelInput.value.trim() || 'Alarm';
        if (existing && editIdx >= 0) {
          S.data.clock.alarms[editIdx].time = timeVal;
          S.data.clock.alarms[editIdx].label = labelVal;
          S.data.clock.alarms[editIdx].days = days;
        } else {
          S.data.clock.alarms.push({
            id: 'alm_' + Date.now(),
            time: timeVal,
            label: labelVal,
            days: days,
            enabled: true
          });
        }
        save();
        modal.remove();
        renderContent();
      }
    }, 'Save Alarm');

    box.append(mHead, h('label', { class: 'dim' }, 'Time (24h)', timeInput), h('label', { class: 'dim' }, 'Label', labelInput), h('label', { class: 'dim' }, 'Repeat Days', daysRow), saveBtn);
    modal.append(box);
    document.body.appendChild(modal);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. STOPWATCH
  // ─────────────────────────────────────────────────────────────
  function renderStopwatch(view) {
    const swBox = h('div', { class: 'stopwatch-container' });
    const readout = h('div', { class: 'sw-display' }, '00:00.00');

    function getElapsedMs() {
      return stopwatchState.accumulatedMs + (stopwatchState.running ? performance.now() - stopwatchState.startTime : 0);
    }

    function updateDisplay() {
      const ms = getElapsedMs();
      readout.textContent = formatMs(ms);
    }

    const startBtn = h('button', { class: 'pill sw-btn start' }, 'Start');
    const lapBtn = h('button', { class: 'pill sw-btn lap', disabled: true }, 'Lap');
    const resetBtn = h('button', { class: 'pill sw-btn reset', disabled: true }, 'Reset');

    function syncButtons() {
      if (stopwatchState.running) {
        startBtn.textContent = 'Pause';
        startBtn.className = 'pill sw-btn pause';
        lapBtn.disabled = false;
        resetBtn.disabled = true;
      } else {
        startBtn.textContent = stopwatchState.accumulatedMs > 0 ? 'Resume' : 'Start';
        startBtn.className = 'pill sw-btn start';
        lapBtn.disabled = true;
        resetBtn.disabled = stopwatchState.accumulatedMs === 0;
      }
    }

    startBtn.onclick = () => {
      playBeep(880, 0.05);
      if (!stopwatchState.running) {
        stopwatchState.running = true;
        stopwatchState.startTime = performance.now();
      } else {
        stopwatchState.running = false;
        stopwatchState.accumulatedMs += performance.now() - stopwatchState.startTime;
      }
      syncButtons();
      updateLapsTable();
    };

    resetBtn.onclick = () => {
      playBeep(440, 0.06);
      stopwatchState.running = false;
      stopwatchState.accumulatedMs = 0;
      stopwatchState.laps = [];
      updateDisplay();
      syncButtons();
      updateLapsTable();
    };

    lapBtn.onclick = () => {
      playBeep(1046, 0.04);
      const totalMs = getElapsedMs();
      const prevTotal = stopwatchState.laps.length
        ? stopwatchState.laps[stopwatchState.laps.length - 1].totalMs
        : 0;
      const lapMs = totalMs - prevTotal;
      stopwatchState.laps.push({ lapMs, totalMs });
      updateLapsTable();
    };

    const lapsContainer = h('div', { class: 'sw-laps-box' });

    function updateLapsTable() {
      if (!stopwatchState.laps.length) {
        lapsContainer.replaceChildren(h('div', { class: 'dim sw-empty-laps' }, 'Recorded laps will appear here.'));
        return;
      }

      // Find min and max lap times
      let minLap = Infinity, maxLap = -Infinity;
      if (stopwatchState.laps.length >= 2) {
        stopwatchState.laps.forEach(l => {
          if (l.lapMs < minLap) minLap = l.lapMs;
          if (l.lapMs > maxLap) maxLap = l.lapMs;
        });
      }

      const rows = [...stopwatchState.laps].reverse().map((l, revIdx) => {
        const lapNum = stopwatchState.laps.length - revIdx;
        const isFastest = stopwatchState.laps.length >= 2 && l.lapMs === minLap;
        const isSlowest = stopwatchState.laps.length >= 2 && l.lapMs === maxLap;

        let tag = null;
        let rowClass = 'sw-lap-row';
        if (isFastest) {
          tag = h('span', { class: 'badge sm ok' }, 'FASTEST');
          rowClass += ' fastest';
        } else if (isSlowest) {
          tag = h('span', { class: 'badge sm warn' }, 'SLOWEST');
          rowClass += ' slowest';
        }

        return h('div', { class: rowClass },
          h('span', { class: 'lap-num' }, `Lap ${lapNum}`),
          h('div', { class: 'lap-times' },
            tag,
            h('span', { class: 'lap-time' }, formatMs(l.lapMs)),
            h('span', { class: 'lap-split dim' }, formatMs(l.totalMs))
          )
        );
      });

      lapsContainer.replaceChildren(
        h('div', { class: 'sw-laps-head' },
          h('span', {}, 'Lap'),
          h('span', {}, 'Lap Time / Split')
        ),
        h('div', { class: 'sw-laps-list' }, rows)
      );
    }

    const btnsRow = h('div', { class: 'sw-actions' }, resetBtn, startBtn, lapBtn);
    syncButtons();
    updateDisplay();
    updateLapsTable();

    swBox.append(readout, btnsRow, lapsContainer);
    view.replaceChildren(swBox);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. TIMER / COUNTDOWN
  // ─────────────────────────────────────────────────────────────
  function renderTimer(view) {
    const timerBox = h('div', { class: 'timer-container' });

    function getRemainingSec() {
      if (timerState.running) {
        const rem = Math.max(0, Math.ceil((timerState.targetTime - performance.now()) / 1000));
        return rem;
      }
      return Math.max(0, Math.ceil(timerState.remainingMs / 1000));
    }

    const ringRadius = 88;
    const circumference = 2 * Math.PI * ringRadius;

    const ringSvg = h('div', { class: 'timer-ring-wrap' });
    ringSvg.innerHTML = `
      <svg class="timer-svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${ringRadius}" fill="none" stroke="var(--ln)" stroke-width="8"/>
        <circle id="timer-progress" cx="100" cy="100" r="${ringRadius}" fill="none" stroke="var(--ac)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
      </svg>
      <div class="timer-readout" id="timer-readout">05:00</div>
    `;

    function updateRing() {
      const remSec = getRemainingSec();
      const totalSec = Math.max(1, Math.round(timerState.durationMs / 1000));
      const frac = remSec / totalSec;
      const offset = circumference * (1 - frac);

      const circle = ringSvg.querySelector('#timer-progress');
      if (circle) circle.style.strokeDashoffset = String(offset);

      const rd = ringSvg.querySelector('#timer-readout');
      if (rd) {
        const hr = Math.floor(remSec / 3600);
        const m = Math.floor((remSec % 3600) / 60);
        const s = remSec % 60;
        rd.textContent = hr > 0 ? `${pad(hr)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
      }

      if (timerState.running && remSec <= 0) {
        timerState.running = false;
        timerState.remainingMs = 0;
        timerState.completed = true;
        playTimerChime();
        toast('TIMER COMPLETE', 'Your countdown timer has finished!', 'alert');
        renderTimer(view);
      }
    }

    // Quick presets
    const presets = [
      { label: '1m', ms: 60000 },
      { label: '3m', ms: 180000 },
      { label: '5m', ms: 300000 },
      { label: '10m', ms: 600000 },
      { label: '15m', ms: 900000 },
      { label: '25m', ms: 1500000, note: 'Pomodoro' },
      { label: '30m', ms: 1800000 },
      { label: '1h', ms: 3600000 },
    ];

    const presetsRow = h('div', { class: 'timer-presets' },
      presets.map(p => h('button', {
        class: 'pill sm',
        onClick: () => {
          timerState.running = false;
          timerState.durationMs = p.ms;
          timerState.remainingMs = p.ms;
          timerState.completed = false;
          updateRing();
          syncTimerControls();
        }
      }, p.label + (p.note ? ' ' + p.note : '')))
    );

    // Duration input spinners
    const curSec = Math.floor(timerState.durationMs / 1000);
    const inH = h('input', { type: 'number', min: '0', max: '23', class: 't-spin', value: String(Math.floor(curSec / 3600)) });
    const inM = h('input', { type: 'number', min: '0', max: '59', class: 't-spin', value: String(Math.floor((curSec % 3600) / 60)) });
    const inS = h('input', { type: 'number', min: '0', max: '59', class: 't-spin', value: String(curSec % 60) });

    function setFromInputs() {
      const hVal = Math.max(0, parseInt(inH.value, 10) || 0);
      const mVal = Math.max(0, parseInt(inM.value, 10) || 0);
      const sVal = Math.max(0, parseInt(inS.value, 10) || 0);
      const total = (hVal * 3600 + mVal * 60 + sVal) * 1000;
      if (total > 0) {
        timerState.running = false;
        timerState.durationMs = total;
        timerState.remainingMs = total;
        timerState.completed = false;
        updateRing();
        syncTimerControls();
      }
    }
    inH.onchange = setFromInputs;
    inM.onchange = setFromInputs;
    inS.onchange = setFromInputs;

    const inputsRow = h('div', { class: 'timer-inputs-row' },
      h('label', {}, 'Hours', inH),
      h('label', {}, 'Min', inM),
      h('label', {}, 'Sec', inS)
    );

    const startTimerBtn = h('button', { class: 'pill sw-btn start' }, 'Start');
    const resetTimerBtn = h('button', { class: 'pill sw-btn reset' }, 'Reset');
    const addMinBtn = h('button', { class: 'pill sm', onClick: () => {
      timerState.durationMs += 60000;
      if (timerState.running) timerState.targetTime += 60000;
      else timerState.remainingMs += 60000;
      updateRing();
    } }, '+1 Min');

    function syncTimerControls() {
      if (timerState.running) {
        startTimerBtn.textContent = 'Pause';
        startTimerBtn.className = 'pill sw-btn pause';
      } else {
        startTimerBtn.textContent = (timerState.remainingMs < timerState.durationMs && timerState.remainingMs > 0) ? 'Resume' : 'Start';
        startTimerBtn.className = 'pill sw-btn start';
      }
    }

    startTimerBtn.onclick = () => {
      playBeep(660, 0.05);
      if (!timerState.running) {
        if (timerState.remainingMs <= 0) timerState.remainingMs = timerState.durationMs;
        timerState.running = true;
        timerState.completed = false;
        timerState.targetTime = performance.now() + timerState.remainingMs;
      } else {
        timerState.running = false;
        timerState.remainingMs = Math.max(0, timerState.targetTime - performance.now());
      }
      syncTimerControls();
      updateRing();
    };

    resetTimerBtn.onclick = () => {
      playBeep(440, 0.05);
      timerState.running = false;
      timerState.remainingMs = timerState.durationMs;
      timerState.completed = false;
      syncTimerControls();
      updateRing();
    };

    syncTimerControls();
    updateRing();

    const controlsRow = h('div', { class: 'timer-controls' }, resetTimerBtn, startTimerBtn, addMinBtn);

    timerBox.append(ringSvg, inputsRow, presetsRow, controlsRow);
    view.replaceChildren(timerBox);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. MISSION ELAPSED TIME (MET)
  // ─────────────────────────────────────────────────────────────
  function renderMET(view) {
    const met = S.data.clock.met;
    const box = h('div', { class: 'met-container' });

    function getElapsedSeconds() {
      const startMs = new Date(met.start).getTime();
      let totalMs = Date.now() - startMs - (met.pausedDurationMs || 0);
      if (met.isPaused && met.pausedAt) {
        totalMs -= (Date.now() - new Date(met.pausedAt).getTime());
      }
      return Math.max(0, Math.floor(totalMs / 1000));
    }

    const statusBadge = h('span', { class: 'met-status-badge ' + (met.isPaused ? 'paused' : 'running') },
      met.isPaused ? 'PAUSED' : 'RUNNING'
    );

    const titleInput = h('input', {
      type: 'text',
      class: 'met-label-input',
      value: met.name || 'BSZ-1 Orbital Mission',
      title: 'Click to edit mission name'
    });
    titleInput.onchange = () => {
      met.name = titleInput.value.trim() || 'Mission';
      save();
    };

    const readout = h('div', { class: 'met-readout' });

    function updateMET() {
      const s = getElapsedSeconds();
      const d = Math.floor(s / 86400);
      const rem = s % 86400;
      const hr = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const sec = rem % 60;

      readout.replaceChildren(
        h('span', { class: 'met-plus' }, '+'),
        h('span', { class: 'met-days' }, `${d}d`),
        h('span', { class: 'met-colon' }, ' '),
        h('span', { class: 'met-num' }, pad(hr)),
        h('span', { class: 'met-colon' }, ':'),
        h('span', { class: 'met-num' }, pad(m)),
        h('span', { class: 'met-colon' }, ':'),
        h('span', { class: 'met-num sec' }, pad(sec))
      );
    }

    updateMET();

    const pauseBtn = h('button', {
      class: 'pill ' + (met.isPaused ? 'open-pill' : ''),
      onClick: () => {
        playBeep(700, 0.05);
        if (!met.isPaused) {
          met.isPaused = true;
          met.pausedAt = new Date().toISOString();
        } else {
          met.isPaused = false;
          if (met.pausedAt) {
            met.pausedDurationMs = (met.pausedDurationMs || 0) + (Date.now() - new Date(met.pausedAt).getTime());
            met.pausedAt = null;
          }
        }
        save();
        renderMET(view);
      }
    }, met.isPaused ? 'Resume MET' : 'Pause MET');

    const calibBtn = h('button', {
      class: 'pill sm',
      onClick: () => showMETCalibrateModal()
    }, 'Calibrate Zero Point');

    const resetNowBtn = h('button', {
      class: 'pill sm del',
      onClick: () => {
        if (confirm('Reset Mission Elapsed Time to 00:00:00 (now)?')) {
          met.start = new Date().toISOString();
          met.pausedDurationMs = 0;
          met.isPaused = false;
          met.pausedAt = null;
          save();
          renderMET(view);
        }
      }
    }, 'Reset to Now');

    const metaInfo = h('div', { class: 'met-meta-info' },
      h('div', {}, 'Zero Point (T-0): ' + new Date(met.start).toLocaleString()),
      h('div', {}, 'Spacecraft Clock Synchronization: NOMINAL')
    );

    const actsRow = h('div', { class: 'met-actions' }, pauseBtn, calibBtn, resetNowBtn);

    box.append(
      h('div', { class: 'met-head' }, titleInput, statusBadge),
      readout,
      actsRow,
      metaInfo
    );

    view.replaceChildren(box);
  }

  function showMETCalibrateModal() {
    const met = S.data.clock.met;
    const modal = h('div', { class: 'modal-overlay' });
    const box = h('div', { class: 'alarm-modal' });

    const mHead = h('div', { class: 'tz-modal-head' },
      h('h3', {}, 'Calibrate Mission Clock T-Zero'),
      h('button', { class: 'ico', title: 'Close', onClick: () => modal.remove() }, svg(ICO_CLOSE, 16, 2))
    );

    // Format start to datetime-local value
    const curStart = new Date(met.start);
    const localIso = new Date(curStart.getTime() - curStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dtInput = h('input', { type: 'datetime-local', class: 'alarm-time-input', value: localIso });

    const saveBtn = h('button', {
      class: 'pill open-pill',
      onClick: () => {
        if (dtInput.value) {
          met.start = new Date(dtInput.value).toISOString();
          met.pausedDurationMs = 0;
          met.isPaused = false;
          met.pausedAt = null;
          save();
          modal.remove();
          renderContent();
        }
      }
    }, 'Set Launch Date');

    box.append(mHead, h('p', { class: 'dim' }, 'Synchronize the mission clock with your mission launch point:'), dtInput, saveBtn);
    modal.append(box);
    document.body.appendChild(modal);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. CALENDAR
  // ─────────────────────────────────────────────────────────────
  function renderCalendar(view) {
    const ev = S.data.clock.calendarEvents;
    const ref = new Date();
    ref.setDate(1);
    let sel = iso(new Date());

    const calBox = h('div', { class: 'cal-full-wrap' });
    const leftCol = h('div', { class: 'cal-left-col' });
    const rightCol = h('div', { class: 'cal-right-col' });

    const head = h('div', { class: 'calhead' });
    const grid = h('div', { class: 'calgrid' });
    const list = h('div', { class: 'evlist' });
    const inp = h('input', { placeholder: 'Add mission event / task, press Enter…', maxlength: 100, class: 'cal-add-inp' });

    const draw = () => {
      head.replaceChildren(
        h('button', { class: 'ico', title: 'Previous month', onClick: () => { ref.setMonth(ref.getMonth() - 1); draw(); } }, svg(ICO_PREV, 15, 2)),
        h('b', { class: 'cal-month-title' }, ref.toLocaleString('en-GB', { month: 'long', year: 'numeric' })),
        h('button', { class: 'ico', title: 'Next month', onClick: () => { ref.setMonth(ref.getMonth() + 1); draw(); } }, svg(ICO_NEXT, 15, 2)),
        h('button', { class: 'pill sm', onClick: () => { ref.setTime(Date.now()); ref.setDate(1); sel = iso(new Date()); draw(); } }, 'Today')
      );

      grid.replaceChildren(...'Mon Tue Wed Thu Fri Sat Sun'.split(' ').map(x => h('span', { class: 'dow' }, x)));

      const first = (ref.getDay() + 6) % 7;
      const n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      const today = iso(new Date());

      for (let i = 0; i < first; i++) grid.append(h('span', { class: 'day empty' }));

      for (let d = 1; d <= n; d++) {
        const k = iso(new Date(ref.getFullYear(), ref.getMonth(), d));
        const hasEv = ev[k] && ev[k].length;
        const btn = h('button', {
          class: 'day' + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + (hasEv ? ' has' : ''),
          onClick: () => { sel = k; draw(); }
        },
          h('span', { class: 'day-num' }, String(d)),
          hasEv ? h('span', { class: 'ev-dot' }) : null
        );
        grid.append(btn);
      }

      // Format sel date title
      const selObj = new Date(sel + 'T00:00:00');
      const selDateFmt = selObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      const evItems = (ev[sel] || []).map((t, i) => {
        return h('div', { class: 'ev' },
          h('span', { class: 'ev-bullet' }),
          h('span', { class: 'ev-text' }, t),
          h('button', { class: 'ico sm del', title: 'Delete event', onClick: () => {
            ev[sel].splice(i, 1);
            if (!ev[sel].length) delete ev[sel];
            save();
            draw();
          } }, svg(ICO_CLOSE, 12, 2))
        );
      });

      list.replaceChildren(
        h('div', { class: 'ev-head' },
          h('h4', {}, selDateFmt),
          h('span', { class: 'dim' }, `${evItems.length} event${evItems.length === 1 ? '' : 's'}`)
        ),
        h('div', { class: 'ev-items' }, evItems.length ? evItems : h('div', { class: 'dim ev-empty' }, 'No events scheduled for this date.'))
      );
    };

    inp.onkeydown = e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        (ev[sel] ||= []).push(inp.value.trim());
        inp.value = '';
        save();
        draw();
      }
    };

    draw();

    leftCol.append(head, grid);
    rightCol.append(list, inp);
    calBox.append(leftCol, rightCol);
    view.replaceChildren(calBox);
  }

  // Setup loop for active displays
  renderTabs();
  renderContent();

  appletInterval = setInterval(() => {
    // Refresh live time in active tab
    if (activeTab === 'world') {
      const view = contentArea;
      // update time elements in place
      const localTz = getLocalTimezone();
      const cards = view.querySelectorAll('.wc-card');
      const clocks = S.data.clock.worldClocks;
      cards.forEach((card, idx) => {
        const c = clocks[idx];
        if (!c) return;
        const info = getTimezoneInfo(c.tz, localTz);
        const tEl = card.querySelector('.wc-time');
        const sEl = card.querySelector('.wc-sec');
        const dEl = card.querySelector('.wc-date-row .dim');
        if (tEl) tEl.textContent = info.time;
        if (sEl) sEl.textContent = ':' + info.seconds;
        if (dEl) dEl.textContent = info.date;
      });
    } else if (activeTab === 'stopwatch') {
      const disp = contentArea.querySelector('.sw-display');
      if (disp && stopwatchState.running) {
        disp.textContent = formatMs(stopwatchState.accumulatedMs + (performance.now() - stopwatchState.startTime));
      }
    } else if (activeTab === 'timer') {
      if (timerState.running) {
        const remSec = Math.max(0, Math.ceil((timerState.targetTime - performance.now()) / 1000));
        const totalSec = Math.max(1, Math.round(timerState.durationMs / 1000));
        const circle = contentArea.querySelector('#timer-progress');
        if (circle) {
          const circumference = 2 * Math.PI * 88;
          circle.style.strokeDashoffset = String(circumference * (1 - remSec / totalSec));
        }
        const rd = contentArea.querySelector('#timer-readout');
        if (rd) {
          const hr = Math.floor(remSec / 3600);
          const m = Math.floor((remSec % 3600) / 60);
          const s = remSec % 60;
          rd.textContent = hr > 0 ? `${pad(hr)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
        }
        if (remSec <= 0) {
          timerState.running = false;
          timerState.remainingMs = 0;
          playTimerChime();
          toast('TIMER COMPLETE', 'Your countdown timer has finished!', 'alert');
          renderContent();
        }
      }
    } else if (activeTab === 'met') {
      const met = S.data.clock.met;
      if (!met.isPaused) {
        const startMs = new Date(met.start).getTime();
        const totalMs = Date.now() - startMs - (met.pausedDurationMs || 0);
        const s = Math.max(0, Math.floor(totalMs / 1000));
        const d = Math.floor(s / 86400);
        const rem = s % 86400;
        const hr = Math.floor(rem / 3600);
        const m = Math.floor((rem % 3600) / 60);
        const sec = rem % 60;

        const dEl = contentArea.querySelector('.met-days');
        const numEls = contentArea.querySelectorAll('.met-num');
        if (dEl) dEl.textContent = `${d}d`;
        if (numEls.length >= 3) {
          numEls[0].textContent = pad(hr);
          numEls[1].textContent = pad(m);
          numEls[2].textContent = pad(sec);
        }
      }
    }
  }, 100);

  container.replaceChildren(tabsNav, contentArea);

  // Return cleanup function
  return () => {
    if (appletInterval) clearInterval(appletInterval);
  };
}
