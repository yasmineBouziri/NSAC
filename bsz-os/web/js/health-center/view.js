import { HealthCenterStore } from './store.js';
import { areas, cycleDemoHistory, demoContent, generateMeasurement, getMetric, getMetricHistory, getSystem, mealPresets, nextLiveReadings, nutrientTargets, options, sampleMetricHistory, systems } from './provider.js';

export const ziboEvents = Object.freeze({
  publish(type, detail = {}) {
    const event = new CustomEvent(`healthcenter:zibo:${type}`, { detail });
    window.dispatchEvent(event);
    return event;
  },
});

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const localDate = (date = new Date()) => {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ziboBounds = () => {
  const width = 84;
  const height = width * 1.2;
  return {
    minX: 0,
    maxX: Math.max(0, window.innerWidth - width),
    minY: 0,
    maxY: Math.max(0, window.innerHeight - height),
  };
};
const TIPS = {
  dash: 'This is your dashboard. Tap any tile to hear what it means.',
  notes: 'Most important notices come first. Urgent ones can only be acknowledged.',
  apps: 'Your five apps. Open one to take a test or browse its history.',
};
const VIEW_TIPS = {
  area: 'Pick an area to open. Tap a card to see its tests and history.',
  system: 'Averages first. Open a test to see its full history.',
  gym: 'Add a video for each day. The suggestions change with your muscles and your nutrition.',
  nutrition: 'Targets follow today’s training and your bones and muscles. Tap an item to log it.',
};
const ZIBO_HELLO = 'Hi, I’m Zibo! This is your Health Center. Tap me any time to ask a question.';
const ZIBO_FALLBACK = question => `You asked: “${question}”. I can’t answer questions yet, but I will soon.`;
const { tiles, domains, analysis, reminders, deferReasons, apps: appCards, exercises, appPages, appGroups } = demoContent;

const metricFormat = (value, digits) => Number(value).toFixed(digits);
const formatTimerDuration = seconds => `${Math.floor(seconds / 60)} min ${String(Math.round(seconds) % 60).padStart(2, '0')} s`;

function metricSeries(parameter, range) {
  const sample = sampleMetricHistory(parameter, range);
  if (!sample.series.length || !sample.series[0]?.length) return { chart: '', statistics: [], values: [], averages: [], outliers: 0, missing: sample.missing, delta: null };
  const count = sample.series[0].length;
  const valueSets = sample.series.map(series => series.map(point => point.value));
  const all = sample.series.flatMap(series => series.flatMap(point => [point.value, point.low, point.high]));
  let minimum = Math.min(...all), maximum = Math.max(...all);
  const pad = (maximum - minimum) * .08 || parameter.spread || 1;
  minimum -= pad; maximum += pad;
  const x = index => count > 1 ? index * 640 / (count - 1) : 320;
  const y = value => 160 - (value - minimum) / (maximum - minimum) * 145;
  const missingIndexes = new Set(Array.from({ length: Math.min(sample.missing, count) }, (_, index) => Math.round((index + 1) * count / (Math.min(sample.missing, count) + 1)) - 1));
  const paths = sample.series.map((series, seriesIndex) => {
    const segments = [];
    let active = [];
    series.forEach((point, index) => {
      if (missingIndexes.has(index)) {
        if (active.length) segments.push(active);
        active = [];
      } else active.push(`${x(index).toFixed(1)},${y(point.value).toFixed(1)}`);
    });
    if (active.length) segments.push(active);
    return segments.map(points => `<polyline points="${points.join(' ')}" class="hc-chart-line series-${seriesIndex}"></polyline>`).join('');
  }).join('');
  const firstSeries = sample.series[0];
  const bands = parameter.rangeLow + parameter.rangeHigh > 0
    ? `<polygon points="${firstSeries.map((point, index) => `${x(index).toFixed(1)},${y(point.low).toFixed(1)}`).concat(firstSeries.map((point, index) => `${x(index).toFixed(1)},${y(point.high).toFixed(1)}`).reverse()).join(' ')}" class="hc-chart-band"></polygon>`
    : '';
  const baselineLines = `<line x1="0" x2="640" y1="${y(parameter.base)}" y2="${y(parameter.base)}" class="hc-baseline"></line>`;
  const outlierMarks = valueSets[0].map((value, index) => {
      const outlier = parameter.trend > 0
        ? value > parameter.base + 2.5 * parameter.spread
        : value < parameter.base - 2.5 * parameter.spread;
      if (!outlier) return '';
      return `<circle cx="${x(index)}" cy="${y(value)}" r="3" class="hc-outlier"><title>Outside baseline range</title></circle>`;
    }).join('');
  const outliers = valueSets[0].filter(value => parameter.trend > 0
    ? value > parameter.base + 2.5 * parameter.spread
    : value < parameter.base - 2.5 * parameter.spread).length;
  const gaps = [...missingIndexes].map(index => `<line x1="${x(index)}" x2="${x(index)}" y1="166" y2="157" class="hc-missing-mark"><title>Missing data</title></line>`).join('');
  const grid = [0, 1, 2].map(step => {
    const fraction = step / 2;
    const value = maximum - fraction * (maximum - minimum);
    const yPosition = 15 + fraction * 145;
    return `<line x1="0" x2="640" y1="${yPosition}" y2="${yPosition}" class="hc-gridline"></line><text x="3" y="${yPosition - 3}" class="hc-axis-label">${escape(metricFormat(value, parameter.digits))}</text>`;
  }).join('');
  const dateLabel = index => {
    if (range === 'year') return new Date(Date.now() - (11 - index) * 30 * 86400000).toLocaleDateString('en', { month: 'short' });
    if (range === 'week') return new Date(Date.now() - (count - 1 - index) * 86400000).toLocaleDateString('en', { weekday: 'short' });
    return new Date(Date.now() - (count - 1 - index) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };
  const seriesLabels = sample.series.length > 1 ? '<div class="hc-series-legend"><span>Systolic</span><span>Diastolic</span></div>' : '';
  const chart = `<svg viewBox="0 0 640 170" preserveAspectRatio="none" role="img" aria-label="${escape(parameter.name)} history for ${range}">
      ${grid}${bands}${baselineLines}${paths}${outlierMarks}${gaps}
    </svg><div class="hc-axis-labels"><span>${escape(dateLabel(0))}</span><span>${escape(dateLabel(Math.floor((count - 1) / 2)))}</span><span>${escape(dateLabel(count - 1))}</span></div>${seriesLabels}`;
  const delta = mean(valueSets[0]) - parameter.base;
  const statistics = sample.series.length > 1 ? [
    ['Systolic avg', metricFormat(mean(valueSets[0]), 0)],
    ['Diastolic avg', metricFormat(mean(valueSets[1]), 0)],
    ['Highest systolic', metricFormat(Math.max(...valueSets[0]), 0)],
    ['Baseline', `${metricFormat(parameter.base, 0)}/${metricFormat(parameter.secondBase, 0)}`],
  ] : [
    ['Average', metricFormat(mean(valueSets[0]), parameter.digits)],
    ['Lowest', metricFormat(Math.min(...sample.series[0].map(point => point.low)), parameter.digits)],
    ['Highest', metricFormat(Math.max(...sample.series[0].map(point => point.high)), parameter.digits)],
    ['Baseline', metricFormat(parameter.base, parameter.digits)],
  ];
  return { chart, statistics, values: valueSets.map(values => values.at(-1)), averages: valueSets.map(mean), outliers, missing: sample.missing, delta };
}

function formatMetric(parameter, liveReadings = {}) {
  if (parameter.live && liveReadings[parameter.key] != null) return `${metricFormat(liveReadings[parameter.key], parameter.digits)} ${parameter.unit}`.trim();
  const sampled = sampleMetricHistory(parameter, 'week').series;
  if (!sampled.length) return 'No reading';
  const values = sampled.map(series => metricFormat(series.reduce((sum, point) => sum + point.value, 0) / series.length, parameter.digits));
  return values.length > 1 ? `${values[0]}/${values[1]} ${parameter.unit}` : `${values[0]} ${parameter.unit}`.trim();
}

function metricCard(parameter, range, history, state, liveReadings, expandedMetrics) {
  const saved = history[parameter.key] || [];
  const rangeIndex = { week: 0, month: 1, year: 2 }[range] || 0;
  const eventCount = parameter.eventCounts?.[rangeIndex] ?? parameter.events.length;
  const totalEvents = eventCount + saved.length;
  const period = { week: 'last 7 days', month: 'last 30 days', year: 'last 12 months, monthly averages' }[range];
  const value = parameter.eventOnly
    ? `${totalEvents}<small>${parameter.eventUnit || 'events'}</small>`
    : parameter.live
      ? state.sensorsConnected ? formatMetric(parameter, liveReadings).replace(` ${parameter.unit}`, '') : '—'
      : derivedValue(parameter, range);
  const expanded = expandedMetrics.has(parameter.key);
  const derived = metricSeries(parameter, range);
  const usual = Math.abs(derived.delta || 0) > 2 * parameter.spread;
  const status = parameter.eventOnly
    ? totalEvents ? `◆ ${parameter.eventLabel || 'For review'}` : '✔ No entries'
    : parameter.live
      ? state.sensorsConnected ? '<i class="hc-live-dot"></i>Live · in range' : '◆ Not connected'
      : usual ? `▲ ${derived.delta >= 0 ? '+' : '−'}${metricFormat(Math.abs(derived.delta), parameter.digits)} vs baseline` : '✔ In usual range';
  const statusClass = parameter.eventOnly ? totalEvents ? 'info' : 'ok'
    : parameter.live ? state.sensorsConnected ? 'ok' : 'info' : usual ? 'warn' : 'ok';
  const events = parameter.events.slice(0, Math.min(3, eventCount)).map(event => `<div class="hc-event"><b>${escape(event[0])}</b><span>${escape(event[1])}</span><small>${escape(event[2])}</small></div>`).join('');
  const chart = parameter.eventOnly ? '' : `<div class="hc-chart">${derived.chart}</div>`;
  const valid = Math.max(0, (range === 'year' ? 12 : range === 'month' ? 30 : 7) - derived.missing);
  const total = range === 'year' ? 12 : range === 'month' ? 30 : 7;
  const actionLabel = parameter.mode === 'measure' ? 'Evaluate' : parameter.mode === 'scale' ? 'Check in'
    : parameter.mode === 'log' || parameter.mode === 'cycle' ? 'Log entry'
      : parameter.mode === 'memory' || parameter.mode === 'accuracy' ? 'Play'
        : 'Start test';
  const savedEntries = saved.length ? `<div class="hc-history"><h4>Logged by you</h4>${saved.slice(0, 3).map(entry => `<div class="hc-history-row"><time>${escape(new Date(entry.at).toLocaleString())}</time><b>${escape(entry.value ?? entry.label ?? entry.summary)}${entry.notes ? `<small>${escape(Array.isArray(entry.notes) ? entry.notes.join(' / ') : entry.notes)}</small>` : ''}</b></div>`).join('')}</div>` : '';
  return `<article class="hc-panel hc-parameter" id="metric-${escape(parameter.key)}">
    <div class="hc-metric-header"><div><h3>${escape(parameter.name)}</h3><span>${parameter.live ? 'Live reading' : `Average · ${period}`}</span></div><div class="hc-metric-value"><b aria-live="${parameter.live ? 'polite' : 'off'}">${value}${parameter.eventOnly ? '' : `<small>${escape(parameter.unit)}</small>`}</b><span class="hc-${statusClass}">${status}</span></div></div>
    <div class="hc-actions"><button class="hc-button primary" data-action="evaluate" data-metric="${escape(parameter.key)}">${actionLabel} ▸</button><button class="hc-button" data-action="toggle-metric" data-metric="${escape(parameter.key)}" aria-expanded="${expanded}">${expanded ? 'Hide history ▴' : 'Show history ▾'}</button></div>
    ${expanded ? `<div class="hc-parameter-details">
      ${chart}
      ${derived.statistics.length ? `<div class="hc-statistics">${derived.statistics.map(([label, amount]) => `<div><span>${escape(label)}</span><b>${escape(amount)}</b></div>`).join('')}</div>` : ''}
      ${parameter.eventOnly ? `${events ? `<div class="hc-events">${events}</div>` : !totalEvents ? '<p class="hc-window-caption">Nothing logged in this window.</p>' : ''}` : `<p class="hc-window-caption">${escape(parameter.unit)} · ${period} · ${valid} of ${total} ${range === 'year' ? 'monthly' : 'daily'} summaries valid · ${derived.missing} missing</p><p class="hc-window-caption">${derived.outliers ? `<b class="hc-warn">▲ ${derived.outliers} reading${derived.outliers === 1 ? '' : 's'} outside your usual range in this window.</b>` : '<span class="hc-good">✔ No readings outside your usual range.</span>'} ${escape(parameter.note)}</p>`}
      ${parameter.eventOnly ? `<p class="hc-note">${escape(parameter.note)}</p>` : ''}
      ${savedEntries}
    </div>` : ''}
  </article>`;
}

function derivedValue(parameter, range) {
  const sample = sampleMetricHistory(parameter, range);
  if (!sample.series.length) return '—';
  const averages = sample.series.map(series => series.reduce((sum, point) => sum + point.value, 0) / series.length);
  return averages.length > 1
    ? `${metricFormat(averages[0], 0)}/${metricFormat(averages[1], 0)}`
    : metricFormat(averages[0], parameter.digits);
}

function renderHome(state) {
  return `<div class="hc-home">
    <section class="hc-section" id="hc-dashboard"><div class="hc-section-heading"><div><p class="hc-eyebrow">HEALTH CENTER · GLOBAL HEALTH DASHBOARD</p><h2>Today at a glance</h2><p class="hc-subtitle">Averages and trends are personalized. Missing data is never read as normal.</p></div><span class="hc-status warn">Monitor</span></div>
      <div class="hc-dashboard-grid">
        <article class="hc-panel hc-overview"><h3>Overall health status</h3><div class="hc-score">Monitor</div><div class="hc-stat-row"><span class="hc-chip warn">▲ 2 active alerts</span><span class="hc-chip">3 tests due</span></div><p>Alerts support clinical review; they are not diagnoses.</p></article>
        <article class="hc-panel hc-domain-panel"><h3>Domain summaries</h3>${domains.map(([name, text, status, time, tone]) => `<button class="hc-domain" data-action="tip" data-tip="Tap a domain to open its details. That view arrives with the full app."><span class="hc-domain-icon">${name === 'Physical' ? '⌁' : name === 'Mental' ? '♡' : '⌘'}</span><span><b>${name}</b><small>${text}</small></span><em class="hc-${tone}">${status}<small>${time}</small></em></button>`).join('')}</article>
        <article class="hc-panel hc-wide"><h3>Key indicators</h3><div class="hc-tiles">${tiles.map(([name, value, unit, status, tone, key, tip]) => `<button class="hc-tile" data-action="tip" data-tip="${escape(tip)}" aria-label="${name}: ${value} ${unit}. ${status}"><span>${name}</span><b>${value}<small>${unit}</small></b><em class="hc-${tone}">${status}</em><span class="hc-range ${key === 'hrv' ? 'dashed' : ''}" ${key === 'hrv' ? 'aria-label="No usual range available"' : ''}><i></i><b></b></span></button>`).join('')}</div><p class="hc-note">The green band on each tile is your usual range. The white mark is today’s reading.</p></article>
        <article class="hc-panel hc-wide"><h3>Analysis-derived indicators</h3><div class="hc-analysis">${analysis.map(([name, status, tone, detail]) => `<button class="hc-analysis-card" data-action="tip" data-tip="${escape(detail)}"><h4>${name}</h4><b class="hc-${tone}">${status}</b><span>${detail}</span></button>`).join('')}</div><p class="hc-note">Inferred indicators are limited by the quality and availability of their inputs.</p></article>
      </div>
    </section>
    <section class="hc-section" id="hc-reminders"><div class="hc-section-heading"><div><p class="hc-eyebrow">FOLLOW-UP</p><h2>Reminders</h2><p class="hc-subtitle">Urgent items stay in your audit history once acknowledged.</p></div></div>
      <div class="hc-reminder-list">${reminders.map(item => renderReminder(item, state.reminders[item.id])).join('')}</div>
    </section>
    <section class="hc-section" id="hc-apps"><div class="hc-section-heading"><div><p class="hc-eyebrow">EXPLORE</p><h2>Health apps</h2><p class="hc-subtitle">Every test lives in an app. Open an area to take a test or browse its history.</p></div></div><div class="hc-app-grid">${appCards.map(card => renderAppCard(card, state)).join('')}</div></section>
    ${state.error ? `<p class="hc-save-error" role="status">Save issue: ${escape(state.error)}. Your changes remain visible and will retry on the next change.</p>` : ''}
  </div>`;
}

function renderReminder(item, status) {
  const color = item.id === 'urgent-bp' || item.id === 'rhr-trend' ? 'warn' : item.id === 'pvt-due' ? 'info' : 'accent';
  let action;
  if (status?.state === 'acknowledged') action = '<span class="hc-confirmation">✔ Acknowledged · saved in the audit history</span>';
  else if (status?.state === 'deferred') action = `<span class="hc-confirmation">Deferred · ${escape(status.reason)}</span><button class="hc-button small" data-action="undo-reminder" data-id="${item.id}">Undo</button>`;
  else if (status?.state === 'choose-reason') action = `<span class="hc-confirmation">Reason:</span>${deferReasons.map(reason => `<button class="hc-button small" data-action="defer-reminder" data-id="${item.id}" data-reason="${reason}">${reason}</button>`).join('')}`;
  else action = `<button class="hc-button primary small" data-action="reminder-open" data-id="${item.id}">${item.action}</button>${item.ack ? `<button class="hc-button small" data-action="ack-reminder" data-id="${item.id}">Acknowledge</button>` : `<button class="hc-button small" data-action="choose-defer" data-id="${item.id}">Defer</button>`}`;
  return `<article class="hc-reminder ${item.id === 'urgent-bp' ? 'urgent' : ''} ${status?.state === 'acknowledged' || status?.state === 'deferred' ? 'done' : ''}"><span class="hc-reminder-mark hc-${color}" aria-hidden="true">${item.id === 'urgent-bp' ? '!' : item.id === 'rhr-trend' ? '▲' : '◆'}</span><div><b class="hc-reminder-type">${item.type}</b><strong>${item.title}</strong><small>${item.detail}</small></div><div class="hc-reminder-actions">${action}</div></article>`;
}

function renderAppCard(card, state) {
  const enabled = card.id !== 'physical' || state.menstrual.enabled;
  const badges = card.systems ? card.systems.map(system => `<span class="hc-tag ${system.id === 'mens' && !enabled ? 'disabled' : ''}">${system.id === 'mens' && !enabled ? `<s>${escape(system.name)}</s>` : escape(system.name)}</span>`).join('') : options[card.id].map(name => `<span class="hc-tag">${escape(name)}</span>`).join('');
  return `<button class="hc-panel hc-app-card" data-action="area" data-area="${card.id}" aria-label="Open ${card.name}"><span class="hc-app-icon">${card.icon}</span><h3>${card.name}</h3><p>${card.detail}</p><div class="hc-tags">${badges}</div><span class="hc-app-footer"><b>${card.status}</b> · updated ${card.updated}<span>Open ›</span></span></button>`;
}

function renderSystemCard(system, state, liveReadings) {
  const description = escape(system.description.replace(/\.$/, ''));
  if (system.id === 'mens') {
    const enabled = state.menstrual.enabled;
    const status = enabled ? escape(system.status) : 'Not enabled for this profile';
    const card = `<${enabled ? 'button' : 'div'} class="hc-panel hc-system-card hc-cycle-system${enabled ? '' : ' disabled'}" ${enabled ? 'data-action="system" data-system="mens"' : 'aria-disabled="true"'}><span class="hc-system-icon">${escape(system.icon)}</span><h3>${escape(system.cardName)}</h3><p>${description}</p><span class="hc-app-footer"><b>${status}</b>${enabled ? '<span>Open ›</span>' : ''}</span></${enabled ? 'button' : 'div'}>`;
    return `<div class="hc-cycle-wrap" id="hc-system-mens"><button class="hc-cycle-toggle" data-action="toggle-cycle" aria-pressed="${enabled}" aria-label="Menstrual cycle tracking" title="${enabled ? 'Tracking on. Tap to turn off' : 'Tap to enable for this profile'}">♀</button>${card}</div>`;
  }
  const metric = system.metrics[0];
  const status = system.area === 'environment'
    ? state.sensorsConnected
      ? `<b class="hc-live-status"><i class="hc-live-dot"></i>${escape(formatMetric(metric, liveReadings))}</b>`
      : '<b>Not connected</b>'
    : `<b class="hc-card-status">${escape(system.status)}</b>`;
  return `<button class="hc-panel hc-system-card" id="hc-system-${system.id}" data-action="system" data-system="${system.id}"><span class="hc-system-icon">${escape(system.icon)}</span><h3>${escape(system.cardName)}</h3><p>${description}</p><span class="hc-app-footer"><span>${status}</span><span>Open ›</span></span></button>`;
}

function renderArea(areaId, state, liveReadings = {}) {
  const card = appCards.find(item => item.id === areaId);
  if (areaId === 'gym') return renderGym(state);
  if (areaId === 'nutrition') return renderNutrition(state);
  if (!card || !appPages[areaId]) return renderHome(state);
  const page = appPages[areaId];
  const groupedSystems = appGroups[areaId].map(([heading, ids]) => {
    const cards = ids.map(id => card.systems.find(system => system.id === id)).filter(Boolean);
    return `<section class="hc-system-group"><p class="hc-eyebrow">${escape(heading)}</p><div class="hc-system-grid">${cards.map(system => renderSystemCard(system, state, liveReadings)).join('')}</div></section>`;
  }).join('');
  const sensorBlock = areaId === 'environment'
    ? `<div class="hc-panel hc-sensor-banner"><div><h3>Sensor network</h3><p>${state.sensorsConnected ? 'Connected. The sensors survey the station 24/7 and keep recording on their own. Nothing more to do.' : 'Connect once. The sensors then survey the station around the clock without another tap.'}</p></div>${state.sensorsConnected ? '<span class="hc-live-indicator"><i class="hc-live-dot"></i>Live · 24/7</span>' : '<button class="hc-button primary" data-action="connect-sensors">Connect sensors</button>'}</div>`
    : '';
  return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button><section class="hc-section"><p class="hc-eyebrow">App ${page.number} of 5</p><h2>${escape(page.name)}</h2>${page.subtitle ? `<p class="hc-subtitle">${escape(page.subtitle)}</p>` : ''}${sensorBlock}${groupedSystems}</section></div>`;
}

const todayExerciseIndex = 2;

function selectedTargets() {
  const trainingType = exercises[todayExerciseIndex][2];
  return {
    ...nutrientTargets,
    energy: nutrientTargets.energy + (trainingType === 'end' ? 300 : 0),
    protein: nutrientTargets.protein + (trainingType === 'str' ? 10 : 0),
  };
}

function addMealToState(state, entry) {
  const nutrition = state.nutrition;
  const values = {
    energy: Math.max(0, Number(entry.energy) || 0),
    protein: Math.max(0, Number(entry.protein) || 0),
    calcium: Math.max(0, Number(entry.calcium) || 0),
    vitaminD: Math.max(0, Number(entry.vitaminD) || 0),
    sodium: Math.max(0, Number(entry.sodium) || 0),
    water: Math.max(0, Number(entry.water) || 0),
  };
  nutrition.meals.unshift({ ...values, label: String(entry.label || 'Meal').slice(0, 120), category: entry.category || 'meal', at: new Date().toISOString() });
  for (const key of ['energy', 'protein', 'calcium', 'vitaminD', 'sodium']) {
    nutrition.nutrientIntake[key] = Math.max(0, Number(nutrition.nutrientIntake[key]) || 0) + values[key];
  }
  nutrition.waterMl = Math.max(0, Number(nutrition.waterMl) || 0) + values.water;
}

function addHistoryEntry(state, key, entry) {
  const items = state.history[key] || (state.history[key] = []);
  items.unshift({ ...entry, at: new Date().toISOString() });
  if (items.length > 200) items.length = 200;
}

function ensureCyclePeriods(state) {
  if (!Array.isArray(state.menstrual.periods) || !state.menstrual.periods.length) {
    state.menstrual.periods = cycleDemoHistory();
  }
  return state.menstrual.periods;
}

function gripStatus() {
  const parameter = getMetric('grip');
  const readings = getMetricHistory(parameter).slice(-7).map(day => day[0].value);
  const average = readings.reduce((sum, value) => sum + value, 0) / readings.length;
  const baseline = parameter.base;
  const belowPercent = Math.round(Math.max(0, (baseline - average) / baseline * 100));
  return { belowPercent, low: belowPercent >= 2 };
}

function workoutSuggestions(state, dayIndex) {
  const trainingType = exercises[dayIndex]?.[2];
  const targets = selectedTargets();
  const intake = state.nutrition.nutrientIntake || {};
  const grip = gripStatus();
  const proteinGap = Math.max(0, Math.round(targets.protein - (intake.protein || 0)));
  const waterPercent = Math.round((state.nutrition.waterMl || 0) / targets.water * 100);
  const suggestions = [['Warm-up', '5 min of joint mobility for hips, shoulders and wrists, then two light sets.']];
  if (trainingType === 'str') {
    suggestions.push(['Musculoskeletal', grip.low
      ? `Grip strength is ${grip.belowPercent}% below your usual. Add one extra grip set, and keep loads about 5% lighter if it feels weak.`
      : 'Grip and strength are steady. Keep your usual loads and add a set if it feels easy.']);
    suggestions.push(['Nutrition', proteinGap > 10
      ? `Protein is ${proteinGap} g short of today’s target. Take 25 to 30 g within an hour of finishing.`
      : 'Protein is on target. Still take 25 g within an hour of finishing.']);
  } else if (trainingType === 'end') {
    suggestions.push(['Musculoskeletal', 'Endurance sets the pace. Hold a steady effort where you can still speak in short sentences.']);
    suggestions.push(['Nutrition', 'Endurance days raise your energy target by about 300 kcal. Add a carbohydrate snack 60 min before.']);
  } else {
    suggestions.push(['Musculoskeletal', 'Bone and muscle loading is lower today, so mobility and gentle movement matter most.']);
    suggestions.push(['Nutrition', 'Keep calcium, vitamin D and protein up on rest days. Recovery happens now.']);
  }
  if (trainingType !== 'rec' && waterPercent < 80) suggestions.push(['Hydration', `Water is at ${waterPercent}% of goal. Drink 500 ml before you start and cut intensity about 10% until it recovers.`]);
  return suggestions;
}

function renderSystem(systemId, state, range, liveReadings, calendar, expandedMetrics) {
  const system = getSystem(systemId);
  if (!system) return renderHome(state);
  if (systemId === 'mens') return state.menstrual.enabled ? renderCycle(state, calendar) : renderArea('physical', state);
  const rangeLabel = { week: 'last 7 days', month: 'last 30 days', year: 'last 12 months, monthly averages' }[range];
  return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button>
    <section class="hc-section"><p class="hc-eyebrow">${escape(areas.find(area => area.id === system.area)?.title)} · ${escape(system.cardName)}</p><h2>${escape(system.pageTitle)}</h2><p class="hc-subtitle">${escape(system.detail)}</p>
      ${system.area === 'environment' && !state.sensorsConnected ? '<div class="hc-panel hc-sensor-banner"><div><h3>Sensors not connected</h3><p>Connect once to start live readings. They then run 24/7.</p></div><button class="hc-button primary" data-action="connect-sensors">Connect sensors</button></div>' : ''}
      <div class="hc-range-controls" role="group" aria-label="History range">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([value, label]) => `<button class="hc-button small ${range === value ? 'selected' : ''}" data-action="range" data-range="${value}" aria-pressed="${range === value}">${label}</button>`).join('')}<span>Showing averages for the ${rangeLabel}.</span></div>
      <div class="hc-metric-grid">${system.metrics.map(parameter => metricCard(parameter, range, state.history, state, liveReadings, expandedMetrics)).join('')}</div>
    </section></div>`;
}

function renderGym(state, gymDay = '', gymMedia = []) {
  const dayIndex = gymDay === '' ? -1 : Number(gymDay);
  const selected = Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex < exercises.length ? dayIndex : -1;
  const day = exercises[selected] || exercises[todayExerciseIndex];
  const media = gymMedia[selected];
  const grip = gripStatus();
  const targets = selectedTargets();
  const proteinPercent = Math.round((state.nutrition.nutrientIntake?.protein || 0) / targets.protein * 100);
  const waterPercent = Math.round((state.nutrition.waterMl || 0) / targets.water * 100);
  if (selected < 0) {
    return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button><section class="hc-section"><div class="hc-section-heading"><div><p class="hc-eyebrow">App 4 of 5</p><h2>Gym</h2><p class="hc-subtitle">Your seven-day plan. Pick a day to add a guided video, switch on the camera and see that day’s suggestions.</p></div></div>
      <article class="hc-panel hc-training-context" id="hc-workout-context"><h3>What shapes today’s suggestions</h3><div class="hc-stat-row"><span class="hc-chip ${grip.low ? 'warn' : 'ok'}">Grip ${grip.low ? `▼ ${grip.belowPercent}% below usual` : '✔ steady'}</span><span class="hc-chip ${proteinPercent < 60 ? 'warn' : 'ok'}">Protein ${proteinPercent}% of target</span><span class="hc-chip ${waterPercent < 70 ? 'warn' : 'ok'}">Water ${waterPercent}% of goal</span></div><div class="hc-button-row"><button class="hc-button small" data-action="system" data-system="musc">Open Musculoskeletal ›</button><button class="hc-button small" data-action="area" data-area="nutrition">Open Nutrition ›</button></div></article>
      <div class="hc-gym-days">${exercises.map((item, index) => `<button class="hc-panel hc-gym-day ${index === todayExerciseIndex ? 'today' : ''}" data-action="gym-day" data-day="${index}"><b>${escape(item[0])}${index === todayExerciseIndex ? ' · Today' : ''}</b><span>${escape(item[1])}</span><span class="hc-gym-day-footer"><span>${item[3].length} exercises${gymMedia[index]?.url ? ' · video added' : ''}</span><span>Open ›</span></span></button>`).join('')}</div></section></div>`;
  }
  const preview = media?.url
    ? `<div class="hc-video-frame"><video src="${escape(media.url)}" controls playsinline preload="metadata" aria-label="Uploaded guided workout video"></video><button class="hc-button small" data-action="replace-video" data-day="${selected}">Replace</button><input hidden type="file" accept="video/*" data-field="gym-video" data-day="${selected}" aria-label="Replace guided workout video"></div>`
    : `<label class="hc-video-upload"><input hidden type="file" accept="video/*" data-field="gym-video" data-day="${selected}" aria-label="Upload a guided workout video"><span>⬆ Upload a video</span><small>Add this day’s guided session</small></label>`;
  return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button><section class="hc-section"><div class="hc-section-heading"><div><p class="hc-eyebrow">Gym · ${escape(day[0])}${selected === todayExerciseIndex ? ' · Today' : ''}</p><h2>${escape(day[1])}</h2><p class="hc-subtitle">Upload a guided video to fill the screen, or switch the camera on to see yourself next to it, half and half.</p></div></div>
      <section class="hc-gym-media ${media.camera ? 'split' : ''}" id="hc-gym-media" aria-label="Workout video and optional camera">
        ${media.camera ? '<div class="hc-gym-camera-pane"><video class="hc-camera-preview" data-camera-preview autoplay muted playsinline aria-label="Your camera preview"></video><span>You</span></div>' : ''}
        <div class="hc-gym-player">${preview}</div>
        <button type="button" class="hc-camera-switch" role="switch" aria-checked="${media.camera}" data-action="gym-camera" data-day="${selected}"><i></i>Camera</button>
        ${media.error ? `<p class="hc-camera-error" role="status">${escape(media.error)}</p>` : ''}
      </section>
      <article class="hc-panel hc-gym-session" id="hc-gym-plan"><h3>Today’s session</h3><ul class="hc-exercise-list">${day[3].map(item => `<li>${escape(item)}</li>`).join('')}</ul></article>
      <article class="hc-panel hc-gym-suggestions" id="hc-gym-suggestions"><h3>Suggestions</h3>${workoutSuggestions(state, selected).map(([title, detail]) => `<div class="hc-gym-suggestion"><b>${escape(title)}</b><span>${escape(detail)}</span></div>`).join('')}</article></section></div>`;
}

function nutritionSuggestions(state, targets) {
  const intake = state.nutrition.nutrientIntake || {};
  const suggestions = [];
  const grip = gripStatus();
  const protein = Number(intake.protein || 0), calcium = Number(intake.calcium || 0), vitaminD = Number(intake.vitaminD || 0);
  const water = Number(state.nutrition.waterMl || 0) / 1000, energy = Number(intake.energy || 0), sodium = Number(intake.sodium || 0);
  const proteinShortfall = Math.round(targets.protein - protein);
  const latestDigestive = state.history.digestive?.[0]?.label;
  if (protein / targets.protein < .6) suggestions.push({ group: 'Gym · Musculoskeletal', title: 'Close the protein gap', text: `Today is a ${exercises[todayExerciseIndex][1].toLowerCase()} day, so your protein target is ${targets.protein} g. You are ${proteinShortfall} g short. Aim for 25 to 30 g in each meal.`, preset: 0 });
  if (calcium / targets.calcium < .7 || vitaminD / targets.vitaminD < .7) suggestions.push({ group: 'Musculoskeletal', title: 'Support your bones', text: `Bone loss is a known flight risk. Calcium is at ${Math.round(calcium / targets.calcium * 100)}% and vitamin D at ${Math.round(vitaminD / targets.vitaminD * 100)}% of target. Add a dairy-style item and a vitamin D source with a meal.`, preset: 2 });
  if (water / (targets.water / 1000) < .7) suggestions.push({ group: 'Gym · Kidney & Urinary', title: 'Drink before you train', text: `Water is at ${Math.round(water / (targets.water / 1000) * 100)}% of goal. Take 500 ml before today’s session. Good hydration also lowers kidney-stone risk.`, water: 500 });
  if (grip.low) suggestions.push({ group: 'Musculoskeletal', title: 'Help grip and muscle recover', text: `Grip is ${grip.belowPercent}% below your usual. Protein with each meal and enough energy help rebuild strength.`, preset: 5 });
  if (sodium / targets.sodium > .85) suggestions.push({ group: 'Musculoskeletal', title: 'Watch sodium', text: `Salt is at ${Math.round(sodium / targets.sodium * 100)}% of the limit. High sodium raises calcium loss, so pick lower-sodium pouches for the next meal.`, preset: 3 });
  if (latestDigestive === 'Bloated' || latestDigestive === 'Constipated') suggestions.push({ group: 'Digestive', title: 'Ease your digestion', text: `You logged ${latestDigestive.toLowerCase()}. Add fiber from beans or cereal and keep fluids up. Light movement helps too.`, preset: 4 });
  if (latestDigestive === 'Nausea') suggestions.push({ group: 'Digestive', title: 'Go gentle', text: 'You logged nausea. Choose small, frequent meals and plain foods until it settles. Tell the flight surgeon if it lasts.', water: 250 });
  if (energy / targets.energy < .6) suggestions.push({ group: 'Gym', title: 'Keep energy up', text: `About ${targets.energy - energy} kcal remain today. Spread them over meals and a snack, with carbohydrates before training.`, preset: 4 });
  if (!suggestions.length) suggestions.push({ group: 'All good', title: 'You are on track', text: 'Intake matches today’s targets. Keep logging meals and fluids.' });
  return suggestions;
}

function renderNutrition(state) {
  const nutrition = state.nutrition;
  const intake = nutrition.nutrientIntake || {};
  const targets = selectedTargets(state);
  const currentWater = Number(nutrition.waterMl || 0);
  const waterLitres = currentWater / 1000;
  const intakeRows = [
    { name: 'Energy', value: Number(intake.energy || 0), target: targets.energy, unit: 'kcal', threshold: .4, digits: 0 },
    { name: 'Protein', value: Number(intake.protein || 0), target: targets.protein, unit: 'g', threshold: .6, digits: 0 },
    { name: 'Water', value: waterLitres, target: targets.water / 1000, unit: 'L', threshold: .7, digits: 1 },
    { name: 'Calcium', value: Number(intake.calcium || 0), target: targets.calcium, unit: 'mg', threshold: .7, digits: 0 },
    { name: 'Vitamin D', value: Number(intake.vitaminD || 0), target: targets.vitaminD, unit: 'IU', threshold: .7, digits: 0 },
    { name: 'Sodium', value: Number(intake.sodium || 0), target: targets.sodium, unit: 'mg', threshold: 0, digits: 0 },
  ];
  const suggestions = nutritionSuggestions(state, targets);
  const loggedToday = (nutrition.meals || []).filter(item => item.at && localDate(new Date(item.at)) === localDate()).slice(0, 6);
  const digestive = (state.history.digestive || []).slice(0, 3);
  const today = exercises[todayExerciseIndex];
  const intakeMarkup = intakeRows.map(row => {
    const percent = Math.round(row.value / row.target * 100);
    const warn = row.threshold ? percent < row.threshold * 100 : percent > 100;
    const value = row.digits ? row.value.toFixed(row.digits) : Math.round(row.value);
    const target = row.name === 'Water' ? row.target : row.digits ? row.target.toFixed(row.digits) : row.target;
    return `<div class="hc-nbar"><span>${row.name}</span><span class="hc-nbar-track"><i class="${warn ? 'warn' : ''}" style="width:${clamp(percent, 0, 100)}%"></i></span><em class="${warn ? 'hc-warn' : 'hc-ok'}">${value} / ${row.name === 'Sodium' ? 'max ' : ''}${target} ${row.unit}</em></div>`;
  }).join('');
  const mealButtons = mealPresets.map((meal, index) => `<button class="hc-button small" data-action="meal-preset" data-index="${index}">${escape(meal.label)}</button>`).join('');
  const suggestionCards = suggestions.map(item => `<article class="hc-suggestion"><span class="hc-eyebrow">${escape(item.group)}</span><b>${escape(item.title)}</b><p>${escape(item.text)}</p>${item.preset != null ? `<button class="hc-button small" data-action="meal-preset" data-index="${item.preset}">+ ${escape(mealPresets[item.preset].label)}</button>` : item.water ? `<button class="hc-button small" data-action="water-add" data-amount="${item.water}">+ ${item.water} ml water</button>` : ''}</article>`).join('');
  const digestiveButtons = ['Comfortable', 'Bloated', 'Constipated', 'Nausea', 'Loose stool'].map(label => `<button class="hc-button small" data-action="digestive" data-label="${label}">${label}</button>`).join('');
  const historyRows = (entries, includeReview = false) => entries.map(entry => `<div class="hc-event"><b>${escape(new Date(entry.at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }))}</b><span>${escape(entry.label)}</span>${includeReview ? '<small>Logged by you</small>' : ''}</div>`).join('');
  return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button><section class="hc-section"><div class="hc-section-heading"><div><p class="hc-eyebrow">App 5 of 5</p><h2>Nutrition</h2><p class="hc-subtitle">Targets are set for an astronaut’s needs and for today’s training. They follow your musculoskeletal results and your gym plan, and they change as you log.</p></div></div>
    <div class="hc-nutrition-grid">
      <article class="hc-panel hc-nutrition-intake" id="hc-intake"><h3>Today’s intake</h3>${intakeMarkup}
        <div class="hc-button-row hc-nutrition-quick"><button class="hc-button small" data-action="water-add" data-amount="250">+ 250 ml water</button><button class="hc-button small" data-action="water-add" data-amount="500">+ 500 ml water</button></div><h3 class="hc-meal-heading">Log a meal</h3><div class="hc-button-row">${mealButtons}</div>
      </article>
      <article class="hc-panel hc-nutrition-linked"><h3>Linked to</h3>
        <div class="hc-linked-card"><span><b>Gym · ${escape(today[0])}</b><small>${escape(today[1])}. Protein target ${targets.protein} g, energy ${targets.energy} kcal.</small></span><button class="hc-button small" data-action="area" data-area="gym">Open ›</button></div>
        <div class="hc-linked-card"><span><b>Musculoskeletal</b><small>Grip, endurance and bone support set protein, calcium and vitamin D.</small></span><button class="hc-button small" data-action="system" data-system="musc">Open ›</button></div>
        <div class="hc-linked-card"><span><b>Kidney & Urinary</b><small>Hydration status sets your fluid goal of ${targets.water / 1000} L.</small></span><button class="hc-button small" data-action="system" data-system="kid">Open ›</button></div>
      </article>
      <article class="hc-panel hc-nutrition-suggestions" id="hc-suggestions"><h3>Suggestions for you</h3><div class="hc-suggestion-grid">${suggestionCards}</div><p class="hc-disclaimer">Decision support only. Your flight dietitian has the final word on targets and supplements.</p></article>
      <article class="hc-panel hc-nutrition-digestive" id="hc-digestive"><h3>Digestive health</h3><p>How does your stomach feel right now?</p><div class="hc-button-row">${digestiveButtons}</div><div class="hc-digestive-history">${historyRows(digestive, true)}</div></article>
      <article class="hc-panel hc-nutrition-logged" id="hc-meals"><h3>Logged today</h3><div class="hc-meal-history">${historyRows(loggedToday)}</div></article>
    </div></section></div>`;
}

function renderCycle(state, calendar = { year: new Date().getFullYear(), month: new Date().getMonth(), mode: 'month', selected: localDate(), window: 6 }) {
  const year = calendar.year, month = calendar.month;
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const savedPeriods = state.menstrual.periods || [];
  const periods = savedPeriods.length ? savedPeriods : cycleDemoHistory();
  const symptoms = state.menstrual.symptoms || {};
  const starts = [...periods].map(item => item.start).sort();
  const cycleLengths = starts.slice(1).map((date, index) => Math.round((new Date(`${date}T12:00:00`) - new Date(`${starts[index]}T12:00:00`)) / 86400000));
  const averageCycleLength = cycleLengths.length ? mean(cycleLengths) : 28;
  const addDays = (key, amount) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  };
  const durations = periods.map(item => item.end
    ? Math.round((new Date(`${item.end}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000) + 1
    : 0).filter(value => value > 0 && value <= 14);
  const expectedDuration = durations.length ? mean(durations) : 5;
  const predictedDuration = Math.round(expectedDuration);
  const latestStart = starts.at(-1);
  const predictionStarts = Array.from({ length: 14 }, (_, index) => latestStart
    ? addDays(latestStart, Math.round(averageCycleLength * (index + 1)))
    : '').filter(Boolean);
  const dateCells = Array.from({ length: offset }, () => '<span></span>');
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const logged = periods.some(item => item.start <= key && (item.end ? item.end >= key : (item.lastDay || localDate()) >= key));
    const activeStart = periods.some(item => !item.end && item.start < key && Math.round((new Date(`${key}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000) < predictedDuration);
    const predictionStart = predictionStarts.find(start => {
      const difference = Math.round((new Date(`${key}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000);
      return difference >= 0 && difference < predictedDuration;
    });
    const predicted = !logged && (activeStart || !!predictionStart);
    const ovulation = [...starts.slice(1), ...predictionStarts].some(start => {
      const difference = Math.round((new Date(`${start}T12:00:00`) - new Date(`${key}T12:00:00`)) / 86400000);
      return difference >= 13 && difference <= 15;
    });
    const symptomList = Array.isArray(symptoms[key]) ? symptoms[key] : symptoms[key] ? [symptoms[key]] : [];
    dateCells.push(`<button class="hc-calendar-day ${logged ? 'period' : ''} ${predicted ? 'predicted' : ''} ${ovulation ? 'ovulation' : ''} ${calendar.selected === key ? 'selected' : ''} ${key === localDate() ? 'today' : ''}" data-action="cycle-day" data-date="${key}" aria-pressed="${calendar.selected === key}" aria-label="${day} ${new Date(year, month, 1).toLocaleDateString('en', { month: 'long' })}${logged ? ', period' : predicted ? ', predicted period' : ''}${ovulation ? ', predicted ovulation' : ''}${symptomList.length ? `, symptoms: ${escape(symptomList.join(', '))}` : ''}">${day}${symptomList.length ? '<i aria-label="Symptoms logged"></i>' : ''}</button>`);
  }
  const selected = calendar.selected || localDate();
  const selectedSymptoms = Array.isArray(symptoms[selected]) ? symptoms[selected] : symptoms[selected] ? [symptoms[selected]] : [];
  const selectedPeriod = [...periods].reverse().find(item => item.start <= selected && Math.round((new Date(`${selected}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000) <= 14);
  const isLogged = periods.some(item => item.start <= selected && (item.end ? item.end >= selected : (item.lastDay || localDate()) >= selected));
  const selectedPeriodDays = selectedPeriod ? Math.round((new Date(`${selected}T12:00:00`) - new Date(`${selectedPeriod.start}T12:00:00`)) / 86400000) : -1;
  const canEnd = !!selectedPeriod && selectedPeriodDays >= 0 && (!selectedPeriod.end || selected <= selectedPeriod.end);
  const canAdd = !!selectedPeriod && selected > (selectedPeriod.end || selectedPeriod.start) && selectedPeriodDays <= 14;
  const windowMonths = calendar.window || 6;
  const cutoff = new Date(Date.now() - windowMonths * 30 * 86400000).toISOString().slice(0, 10);
  const trendRows = starts.slice(1).map((end, index) => ({ start: starts[index], end, length: Math.round((new Date(`${end}T12:00:00`) - new Date(`${starts[index]}T12:00:00`)) / 86400000) })).filter(item => item.end >= cutoff);
  const trendMax = Math.max(34, ...trendRows.map(item => item.length));
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthGrid = monthNames.map((name, index) => `<button class="hc-button small hc-year-month" data-action="cycle-month-select" data-month="${index}" aria-pressed="${index === month}">${name.slice(0, 3)}</button>`).join('');
  const picker = calendar.mode === 'year'
    ? `<div class="hc-month-nav"><button class="hc-button small" data-action="cycle-year" data-delta="-1" aria-label="Previous year">‹</button><span class="hc-calendar-year" aria-live="polite">${year}</span><button class="hc-button small" data-action="cycle-year" data-delta="1" aria-label="Next year">›</button></div><div class="hc-year-grid">${monthGrid}</div>`
    : `<div class="hc-month-nav"><button class="hc-button small" data-action="cycle-month" data-delta="-1" aria-label="Previous month">‹</button><button class="hc-calendar-year" data-action="cycle-mode" aria-label="Change year or month">${new Date(year, month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })} ▾</button><button class="hc-button small" data-action="cycle-month" data-delta="1" aria-label="Next month">›</button></div><div class="hc-calendar"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>${dateCells.join('')}</div>`;
  const historyButtons = [[3, '3 months'], [6, '6 months'], [12, 'Year']].map(([value,label]) => `<button class="hc-button small ${windowMonths === value ? 'selected' : ''}" data-action="cycle-window" data-window="${value}" aria-pressed="${windowMonths === value}">${label}</button>`).join('');
  const latestLength = trendRows.length ? mean(trendRows.map(item => item.length)) : averageCycleLength;
  const selectedLogged = periods.some(item => item.start <= selected && (item.end ? item.end >= selected : (item.lastDay || localDate()) >= selected));
  const selectedPredicted = !selectedLogged && (periods.some(item => !item.end && item.start < selected && Math.round((new Date(`${selected}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000) < predictedDuration)
    || predictionStarts.some(start => { const difference = Math.round((new Date(`${selected}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000); return difference >= 0 && difference < predictedDuration; }));
  const selectedOvulation = [...starts.slice(1), ...predictionStarts].some(start => { const difference = Math.round((new Date(`${start}T12:00:00`) - new Date(`${selected}T12:00:00`)) / 86400000); return difference >= 13 && difference <= 15; });
  const dayStatus = selectedLogged ? 'Period day.' : selectedPredicted ? 'Predicted period day.' : selectedOvulation ? 'Predicted ovulation window.' : 'No period logged.';
  const currentSymptomText = selectedSymptoms.length ? ` Symptoms: ${escape(selectedSymptoms.join(', '))}.` : '';
  return `<div class="hc-detail-view"><button class="hc-button back" data-action="back">‹ Back</button><section class="hc-section"><p class="hc-eyebrow">Physical Health · Menstrual Cycle</p><h2>Menstrual cycle</h2><p class="hc-subtitle">Tap a day to log symptoms or the start or end of your period. Colours and circles are predictions from your own cycle history.</p>
    <div class="hc-cycle-grid"><article class="hc-panel">${picker}<div class="hc-calendar-legend"><span><i class="hc-legend-period"></i>Period</span><span><i class="hc-legend-predicted"></i>Predicted period</span><span><i class="hc-legend-ovulation"></i>Predicted ovulation</span><span><i class="hc-legend-symptoms"></i>Symptoms</span></div></article>
      <article class="hc-panel"><h3>${new Date(`${selected}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3><p>${dayStatus}${currentSymptomText}</p><div class="hc-button-row"><button class="hc-button small" data-action="cycle-log-symptoms" data-date="${selected}">Log symptoms</button><button class="hc-button small" data-action="period-start" data-date="${selected}" ${isLogged ? 'disabled' : ''}>Period started</button><button class="hc-button small" data-action="period-end" data-date="${selected}" ${canEnd ? '' : 'disabled'}>Period ended</button><button class="hc-button small" data-action="period-add-day" data-date="${selected}" ${canAdd ? '' : 'disabled'}>Add this day to period</button></div><p class="hc-note">After you log a start, the next days are coloured using your average period length (${expectedDuration.toFixed(1)} days). If it ended sooner, tap that day and choose Period ended. If it lasted longer, tap the later day and choose Add this day.</p></article>
      <article class="hc-panel hc-wide"><h3>Cycle length history</h3><div class="hc-button-row" role="group" aria-label="History window">${historyButtons}</div>${trendRows.length ? `${trendRows.map(item => `<div class="hc-cycle-trend"><span>${new Date(`${item.start}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span><span class="hc-nutrient-track"><i style="width:${clamp(item.length / (trendMax + 4) * 100, 0, 100)}%"></i></span><b>${item.length} days</b></div>`).join('')}<p class="hc-note">Average in this window: ${latestLength.toFixed(1)} days. All time: ${averageCycleLength.toFixed(1)} days, with periods of about ${expectedDuration.toFixed(1)} days.</p>` : '<p class="hc-note">No full cycles in this window.</p>'}</article></div>
    </section></div>`;
}

function renderModal(modal) {
  if (!modal) return '';
  return `<div class="hc-modal-backdrop" data-action="backdrop"><section class="hc-panel hc-modal" role="dialog" aria-modal="true" aria-labelledby="hc-modal-title" tabindex="-1"><button class="hc-modal-close" data-action="close-modal" aria-label="Close">×</button><div class="hc-modal-content">${modal.html}</div></section></div>`;
}

function actionButton(action, label, extra = '') {
  return `<button class="hc-button ${extra}" data-action="${action}">${label}</button>`;
}

export function mountHealthCenterView(root, { openAssistant, initialPoint }) {
  const store = new HealthCenterStore();
  const savedPoint = initialPoint || null;
  let view = savedPoint?.view || 'home';
  let area = savedPoint?.area || '';
  let system = savedPoint?.system || '';
  let selectedParameterKey = savedPoint?.parameter || '';
  let expandedMetrics = new Set(savedPoint?.expandedMetrics || []);
  if (view === 'area' && area === 'gym') view = 'gym';
  if (view === 'area' && area === 'nutrition') view = 'nutrition';
  let range = savedPoint?.range || 'week';
  let stack = [];
  let modal = null;
  let modalReturn = null;
  let calendar = { year: new Date().getFullYear(), month: new Date().getMonth(), mode: 'month', selected: localDate(), window: 6 };
  let ziboTimer = 0;
  let helloTimer = 0;
  let testTimer = 0;
  let testState = null;
  let skinNotes = [];
  let cycleSymptomDate = '';
  let cycleSymptomSelection = [];
  let liveReadings = {};
  let liveTimer = 0;
  let connectTimer = 0;
  let ziboMessage = '';
  let ziboVisible = false;
  let observer = null;
  let cameraStream = null;
  let draggingZibo = null;
  let askOpen = false;
  const gymMedia = exercises.map(() => ({ url: '', fileName: '', camera: false, stream: null, error: '', request: 0 }));
  let gone = false;
  root.classList.add('hc-root');
  root.innerHTML = '<div class="hc" aria-label="Health Center"><div class="hc-loading" role="status">Loading Health Center…</div></div>';
  const shell = root.querySelector('.hc');
  const modalHost = document.createElement('div');
  modalHost.className = 'hc-root hc-modal-portal';
  document.body.appendChild(modalHost);

  const getScrollContainer = () => {
    let node = root.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const overflow = getComputedStyle(node).overflowY;
      if (/(auto|scroll|overlay)/.test(overflow) && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  };
  const getScrollPosition = () => {
    const container = getScrollContainer();
    return container === document.scrollingElement || container === document.documentElement
      ? window.scrollY
      : container.scrollTop;
  };
  const setScrollPosition = (top, behavior = 'auto') => {
    const container = getScrollContainer();
    const target = container === document.scrollingElement || container === document.documentElement
      ? document.scrollingElement || document.documentElement
      : container;
    if (behavior === 'auto') target.scrollTop = top;
    else target.scrollTo({ top, behavior });
  };
  const attachCameraPreview = () => {
    const preview = shell.querySelector('[data-camera-preview]');
    const activeMedia = gymMedia.find(item => item.stream);
    if (preview && activeMedia?.stream) preview.srcObject = activeMedia.stream;
  };
  const stopCamera = () => {
    gymMedia.forEach(media => {
      media.request++;
      media.stream?.getTracks().forEach(track => track.stop());
      media.stream = null;
      media.camera = false;
      media.error = '';
    });
    cameraStream = null;
  };
  const setGymCamera = (dayIndex, enabled) => {
    const media = gymMedia[dayIndex];
    if (!media) return;
    if (!enabled) {
      media.request++;
      const stopped = media.stream;
      media.stream?.getTracks().forEach(track => track.stop());
      media.stream = null;
      media.camera = false;
      media.error = '';
      if (cameraStream === stopped) cameraStream = null;
      render();
      return;
    }
    gymMedia.forEach(item => {
      if (item !== media) {
        item.request++;
        item.stream?.getTracks().forEach(track => track.stop());
        item.stream = null;
        item.camera = false;
        item.error = '';
      }
    });
    cameraStream = null;
    media.camera = true;
    media.error = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      media.camera = false;
      media.error = 'Camera is not available in this browser.';
      render();
      return;
    }
    const request = ++media.request;
    render();
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
      if (gone || media.request !== request || view !== 'gym' || Number(area) !== dayIndex) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      cameraStream = stream;
      media.stream = stream;
      media.camera = true;
      media.error = '';
      render();
    }).catch(() => {
      if (media.request !== request) return;
      media.stream = null;
      media.camera = false;
      media.error = 'Camera permission was not given.';
      render();
    });
  };
  const render = () => {
    if (gone) return;
    const scrollTop = getScrollPosition();
    const active = document.activeElement;
    const focused = active && shell.contains(active) ? { ...active.dataset } : null;
    const modalFocus = active && modalHost.contains(active) ? { ...active.dataset } : null;
    const modalFieldValues = new Map([...modalHost.querySelectorAll('[data-field]')].map(field => [field.dataset.field, {
      value: field.value,
      checked: 'checked' in field ? field.checked : undefined,
      selectionStart: typeof field.selectionStart === 'number' ? field.selectionStart : null,
      selectionEnd: typeof field.selectionEnd === 'number' ? field.selectionEnd : null,
    }]));
    const focusedZibo = active?.classList.contains('hc-zibo-wrap');
    const focusedAsk = active?.matches('.hc-zibo-ask input');
    const askValue = modalHost.querySelector('.hc-zibo-ask input')?.value || '';
    const state = store.getState();
    let page = view === 'home' ? renderHome(state) :
      view === 'area' ? renderArea(area, state, liveReadings) :
      view === 'system' ? renderSystem(system, state, range, liveReadings, calendar, expandedMetrics) :
      view === 'gym' ? renderGym(state, area, gymMedia) :
      view === 'nutrition' ? renderNutrition(state) :
      view === 'coming' ? `<section class="hc-coming-soon" aria-live="polite"><p class="hc-eyebrow">${escape(area)}</p><h2>Coming soon</h2><p>${escape(area)} will be developed soon. Thanks for your patience.</p><button class="hc-button primary" data-action="back">‹ Return</button></section>` :
      view === 'cycle' ? state.menstrual.enabled ? renderCycle(state, calendar) : renderArea('physical', state, liveReadings) : renderHome(state);
    const navItems = view === 'home' ? [['hc-dashboard', 'Dashboard'], ['hc-reminders', 'Reminders'], ['hc-apps', 'Apps']]
      : [];
    const homeControl = view === 'home' ? '' : '<button class="hc-button small" data-action="home">Home</button>';
    const ziboPosition = state.zibo?.position;
    const bounds = ziboBounds();
    const legacyPosition = ziboPosition?.unit !== 'px';
    const left = ziboPosition && Number.isFinite(ziboPosition.x)
      ? clamp(legacyPosition ? ziboPosition.x / 100 * bounds.maxX : ziboPosition.x, bounds.minX, bounds.maxX)
      : null;
    const top = ziboPosition && Number.isFinite(ziboPosition.y)
      ? clamp(legacyPosition ? ziboPosition.y / 100 * bounds.maxY : ziboPosition.y, bounds.minY, bounds.maxY)
      : null;
    const ziboStyle = left !== null && top !== null
      ? `left:${left}px;top:${top}px;right:auto;bottom:auto`
      : 'right:1.8vw;bottom:2.5vh';
    shell.innerHTML = `<div class="hc-route-nav">${homeControl}${navItems.length ? `<nav class="hc-section-nav" aria-label="Health Center sections">${navItems.map(([id, label]) => `<button data-action="scroll" data-target="${id}" aria-current="false">${escape(label)}</button>`).join('')}</nav>` : ''}</div><div class="hc-content">${page}</div>${state.error ? `<div class="hc-save-error" role="status">Save issue: ${escape(state.error)}. Your changes remain visible.</div>` : ''}<div class="hc-zibo-wrap" style="${ziboStyle}" role="button" tabindex="0" aria-label="Zibo, the assistant. Drag to move, click to ask a question." aria-expanded="${askOpen}"><div class="hc-zibo-bubble${ziboVisible ? ' visible' : ''}" role="status" aria-live="polite">${escape(ziboMessage)}</div><form class="hc-zibo-ask${askOpen ? ' open' : ''}" autocomplete="off"><input type="text" placeholder="Ask Zibo anything…" aria-label="Ask Zibo a question"><button type="submit" aria-label="Send question">➤</button></form><div class="hc-zibo-figure"><svg viewBox="0 0 100 120" aria-hidden="true"><defs><radialGradient id="hc-zibo-gradient" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="var(--ac)"/><stop offset="1" stop-color="var(--ac2)"/></radialGradient></defs><path d="M50 26V10" stroke="var(--ac)" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="8" r="5" fill="var(--info)"/><path d="M50 24C26 24 12 42 12 64c0 22 16 38 38 38s38-16 38-38C88 42 74 24 50 24z" fill="url(#hc-zibo-gradient)"/><g class="hc-zibo-eyes"><ellipse cx="35" cy="58" rx="8" ry="10.5" fill="#0b1a24"/><ellipse cx="65" cy="58" rx="8" ry="10.5" fill="#0b1a24"/><circle cx="38" cy="54" r="3.2" fill="#fff"/><circle cx="68" cy="54" r="3.2" fill="#fff"/></g><ellipse cx="22" cy="73" rx="5" ry="3" fill="#f2a7bd" opacity=".6"/><ellipse cx="78" cy="73" rx="5" ry="3" fill="#f2a7bd" opacity=".6"/><path d="M44 76q6 5 12 0" stroke="#0b1a24" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></div></div>`;
    const ziboMarkup = shell.querySelector('.hc-zibo-wrap')?.outerHTML || '';
    shell.querySelector('.hc-zibo-wrap')?.remove();
    modalHost.innerHTML = `${renderModal(modal)}${ziboMarkup}`;
    modalHost.querySelectorAll('[data-field]').forEach(field => {
      const saved = modalFieldValues.get(field.dataset.field);
      if (!saved) return;
      if (saved.value !== undefined) field.value = saved.value;
      if (saved.checked !== undefined) field.checked = saved.checked;
    });
    const askInput = modalHost.querySelector('.hc-zibo-ask input');
    if (askInput && askValue) askInput.value = askValue;
    const ziboWrap = modalHost.querySelector('.hc-zibo-wrap');
    const ziboRect = ziboWrap?.getBoundingClientRect();
    const ziboFlip = !!ziboRect && ziboRect.left + ziboRect.width / 2 < window.innerWidth / 2;
    modalHost.querySelector('.hc-zibo-bubble')?.classList.toggle('flip', ziboFlip);
    modalHost.querySelector('.hc-zibo-ask')?.classList.toggle('flip', ziboFlip);
    if (focusedZibo) modalHost.querySelector('.hc-zibo-wrap')?.focus({ preventScroll: true });
    if (focusedAsk) askInput?.focus({ preventScroll: true });
    shell.querySelector('.hc-content h2')?.setAttribute('tabindex', '-1');
    observer?.disconnect();
    observer = null;
    const nav = shell.querySelector('.hc-section-nav');
    if (nav && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        nav.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', button.dataset.target === visible.target.id ? 'location' : 'false'));
      }, { rootMargin: '-18% 0px -65% 0px', threshold: [0, .15, .5] });
      navItems.forEach(([id]) => { const target = shell.querySelector(`#${CSS.escape(id)}`); if (target) observer.observe(target); });
    }
    attachCameraPreview();
    setScrollPosition(scrollTop);
    if (focused) {
      let selector = '';
      if (focused.action) {
        selector = `[data-action="${CSS.escape(focused.action)}"]`;
        for (const key of ['metric', 'id', 'system', 'area', 'day', 'target']) if (focused[key]) selector += `[data-${key}="${CSS.escape(focused[key])}"]`;
      } else if (focused.field) selector = `[data-field="${CSS.escape(focused.field)}"]`;
      if (selector) shell.querySelector(selector)?.focus({ preventScroll: true });
    }
    if (modalFocus) {
      let selector = '';
      if (modalFocus.action) {
        selector = `[data-action="${CSS.escape(modalFocus.action)}"]`;
        for (const key of ['metric', 'index', 'value', 'label', 'eye', 'day']) if (modalFocus[key]) selector += `[data-${key}="${CSS.escape(modalFocus[key])}"]`;
      } else if (modalFocus.field) selector = `[data-field="${CSS.escape(modalFocus.field)}"]`;
      const target = selector ? modalHost.querySelector(selector) : null;
      target?.focus({ preventScroll: true });
      if (target && modalFocus.field) {
        const saved = modalFieldValues.get(modalFocus.field);
        if (saved?.selectionStart != null) target.setSelectionRange(saved.selectionStart, saved.selectionEnd);
      }
    }
  };
  const say = text => {
    const message = String(text ?? '');
    ziboMessage = message;
    ziboVisible = true;
    ziboEvents.publish('message', { message, view, area, system, parameter: selectedParameterKey || null });
    const bubble = modalHost.querySelector('.hc-zibo-bubble');
    if (bubble) {
      bubble.textContent = message;
      const wrap = modalHost.querySelector('.hc-zibo-wrap');
      const rect = wrap?.getBoundingClientRect();
      const flip = !!rect && rect.left + rect.width / 2 < window.innerWidth / 2;
      bubble.classList.toggle('flip', flip);
      modalHost.querySelector('.hc-zibo-ask')?.classList.toggle('flip', flip);
      bubble.classList.add('visible');
      clearTimeout(ziboTimer);
      ziboTimer = setTimeout(() => {
        ziboVisible = false;
        modalHost.querySelector('.hc-zibo-bubble')?.classList.remove('visible');
      }, Math.max(5500, message.length * 70));
    }
  };
  const setAskOpen = (open, focus = false) => {
    askOpen = open;
    const wrap = modalHost.querySelector('.hc-zibo-wrap');
    const ask = modalHost.querySelector('.hc-zibo-ask');
    wrap?.setAttribute('aria-expanded', String(open));
    ask?.classList.toggle('open', open);
    if (open) {
      say('Hi! Type your question for me.');
      const input = ask?.querySelector('input');
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    } else {
      clearTimeout(ziboTimer);
      ziboVisible = false;
      modalHost.querySelector('.hc-zibo-bubble')?.classList.remove('visible');
      if (focus) wrap?.focus({ preventScroll: true });
    }
  };
  const toggleAsk = () => setAskOpen(!askOpen);
  const notifyStore = async promise => {
    try { await promise; }
    catch (error) { say(error.message || 'Could not save your change.'); }
  };
  const historyToken = `hc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let expectedPopIndex = null;
  let pendingHomePop = false;
  let historyAvailable = true;
  const routePoint = () => ({
    view,
    arg: view === 'area' ? area : view === 'system' ? system : view === 'gym' ? area : '',
    area,
    system,
    range,
    parameter: selectedParameterKey,
    expandedMetrics: [...expandedMetrics],
    scrollY: getScrollPosition(),
  });
  const writeHistory = () => {
    try { window.history.pushState({ ...(window.history.state || {}), __healthCenter: { token: historyToken, index: stack.length } }, ''); }
    catch (error) { historyAvailable = false; console.error('Health Center history update failed:', error); }
  };
  const applyPoint = point => {
    if (view === 'gym' && (point.view !== 'gym' || point.area !== area)) stopCamera();
    view = point.view || 'home';
    area = point.area ?? (point.view === 'area' ? point.arg : '') ?? '';
    system = point.system ?? (point.view === 'system' ? point.arg : '') ?? '';
    range = point.range || 'week';
    selectedParameterKey = point.parameter || '';
    if (Array.isArray(point.expandedMetrics)) expandedMetrics = new Set(point.expandedMetrics);
    if (point.calendar) calendar = { ...calendar, ...point.calendar };
    modal = null;
    render();
    setScrollPosition(point.scrollY ?? point.scroll ?? 0);
  };
  const sayView = () => {
    if (view === 'home') say(TIPS.dash);
    else if (view === 'system' && getSystem(system)?.area === 'environment' && !store.getState().sensorsConnected) {
      say('These sensors are not connected yet. Connect them once and they run 24/7.');
    } else {
      const tip = VIEW_TIPS[view === 'cycle' ? 'system' : view];
      if (tip) say(tip);
    }
  };
  const navigate = (nextView, nextArea = '', nextSystem = '', nextParameter = '') => {
    const changed = view !== nextView || area !== nextArea || system !== nextSystem || selectedParameterKey !== nextParameter;
    if (changed) stack.push(routePoint());
    else return;
    if (view === 'gym' && (nextView !== 'gym' || !nextArea || area !== nextArea)) stopCamera();
    view = nextView; area = nextArea; system = nextSystem; selectedParameterKey = nextParameter;
    modal = null;
    writeHistory();
    render();
    setScrollPosition(0);
    shell.querySelector('h2')?.focus?.({ preventScroll: true });
    sayView();
  };
  const goTest = (systemId, parameterKey, shouldEvaluate = false) => {
    const system = getSystem(systemId);
    const parameter = getMetric(parameterKey);
    if (!system || !parameter) return;
    expandedMetrics.add(parameterKey);
    navigate('system', system.area, system.id, parameterKey);
    requestAnimationFrame(() => {
      shell.querySelector(`#metric-${CSS.escape(parameterKey)}`)?.scrollIntoView({ block: 'start' });
      if (shouldEvaluate) {
        selectedParameterKey = parameterKey;
        evaluate(parameter);
      }
    });
  };
  const restorePrevious = () => {
    if (modal) { closeModal(); return true; }
    const previous = stack.pop();
    if (!previous) return false;
    applyPoint(previous);
    sayView();
    return true;
  };
  const returnHome = () => {
    const first = stack[0];
    const scrollY = first?.scrollY ?? first?.scroll ?? 0;
    if (view === 'gym') stopCamera();
    stack = [];
    view = 'home'; area = ''; system = ''; selectedParameterKey = ''; modal = null;
    render();
    setScrollPosition(scrollY);
    say(TIPS.dash);
    const marker = window.history.state?.__healthCenter;
    if (historyAvailable && marker?.token === historyToken && marker.index > 0) {
      pendingHomePop = true;
      expectedPopIndex = 0;
      window.history.go(-marker.index);
    }
  };
  const back = () => {
    if (modal) { closeModal(); return true; }
    const marker = window.history.state?.__healthCenter;
    const targetIndex = Math.max(0, stack.length - 1);
    if (!restorePrevious()) return view === 'home';
    if (historyAvailable && marker?.token === historyToken && marker.index > targetIndex) {
      expectedPopIndex = targetIndex;
      window.history.back();
    }
    return true;
  };
  const onPopState = event => {
    const marker = event.state?.__healthCenter;
    if (marker?.token !== historyToken) return;
    if (pendingHomePop && marker.index === 0) {
      pendingHomePop = false;
      expectedPopIndex = null;
      return;
    }
    if (marker.index === expectedPopIndex) {
      expectedPopIndex = null;
      return;
    }
    expectedPopIndex = null;
    if (marker.index < stack.length) {
      let previous;
      while (stack.length > marker.index) previous = stack.pop();
      if (previous) { applyPoint(previous); sayView(); }
    }
  };
  const restore = point => {
    if (!point) return;
    applyPoint(point);
    if (view === 'area' && area === 'gym') view = 'gym';
    if (view === 'area' && area === 'nutrition') view = 'nutrition';
    stack = Array.isArray(point.stack) ? point.stack.map(item => ({ ...item })) : [];
    try { window.history.replaceState({ ...(window.history.state || {}), __healthCenter: { token: historyToken, index: stack.length } }, ''); } catch (error) { console.error('Health Center history restore failed:', error); }
    render();
    setScrollPosition(point.scrollY ?? point.scroll ?? 0);
    sayView();
  };
  const closeModal = () => {
    clearTimeout(testTimer);
    testTimer = 0;
    clearTimeout(connectTimer);
    connectTimer = 0;
    testState = null;
    skinNotes = [];
    modal = null;
    render();
    let selector = '';
    if (modalReturn?.action) {
      selector = `[data-action="${CSS.escape(modalReturn.action)}"]`;
      for (const key of ['metric', 'id', 'system', 'area']) if (modalReturn[key]) selector += `[data-${key}="${CSS.escape(modalReturn[key])}"]`;
    }
    const returnFocus = selector ? shell.querySelector(selector) : null;
    returnFocus?.focus();
    modalReturn = null;
  };
  const openModal = (html, metricKey = '') => {
    const target = document.activeElement;
    modalReturn = target?.dataset ? { ...target.dataset } : null;
    modal = { html, metricKey };
    render();
    modalHost.querySelector('.hc-modal')?.focus();
    modalHost.querySelector('.hc-modal-content input, .hc-modal-content button')?.focus();
  };
  const modalTitle = (title, body, buttons = '') => `<h3 id="hc-modal-title">${escape(title)}</h3>${body}${buttons ? `<div class="hc-modal-actions">${buttons}</div>` : ''}`;
  const saveEntry = async (parameter, entry, message) => {
    try { await store.record(parameter.key, entry); }
    catch (error) {
      say(error.message || 'Could not save this entry.');
      modal = { html: modalTitle('Save failed', `<p>${escape(error.message || 'Your entry could not be saved. Try again.')}</p>`, actionButton('close-modal', 'Close', 'primary')), metricKey: parameter.key };
      render();
      return;
    }
    expandedMetrics.add(parameter.key);
    const owner = systems.find(item => item.metrics.some(metric => metric.key === parameter.key));
    if (owner && (view !== 'system' || system !== owner.id)) navigate('system', owner.area, owner.id, parameter.key);
    else { selectedParameterKey = parameter.key; render(); }
    requestAnimationFrame(() => shell.querySelector(`#metric-${CSS.escape(parameter.key)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    modal = { html: modalTitle('Saved', `<p><b>${escape(entry.value ?? entry.label ?? entry.summary)}</b></p><p>${escape(message)}</p>`, actionButton('close-modal', 'Done', 'primary')), metricKey: parameter.key };
    render();
    say('Saved to your history.');
  };

  const startPvt = parameter => {
    testState = { type: 'pvt', parameter, trials: [], phase: 'wait', start: 0 };
    runPvtRound();
  };
  const runPvtRound = () => {
    if (!testState || testState.type !== 'pvt') return;
    testState.phase = 'wait';
    modal = { html: modalTitle(`Reaction test · trial ${testState.trials.length + 1} of 3`, '<button class="hc-reaction" data-action="pvt-tap">Wait…</button><p>Tap only when the circle lights up.</p>', ''), metricKey: testState.parameter.key };
    render();
    testTimer = setTimeout(() => {
      if (!modal || !testState || testState.type !== 'pvt') return;
      testState.phase = 'ready';
      testState.start = performance.now();
      const target = modalHost.querySelector('.hc-reaction');
      if (target) { target.textContent = 'TAP'; target.classList.add('ready'); }
    }, 1300 + Math.random() * 2200);
  };
  const pvtTap = () => {
    if (!testState || testState.type !== 'pvt') return;
    if (testState.phase !== 'ready') {
      clearTimeout(testTimer);
      modal = { html: modalTitle('Too early', '<p>Wait until the circle lights up before tapping.</p>', actionButton('pvt-retry', 'Try again', 'primary')), metricKey: testState.parameter.key };
      render();
      return;
    }
    testState.trials.push(Math.round(performance.now() - testState.start));
    if (testState.trials.length < 3) runPvtRound();
    else {
      const median = [...testState.trials].sort((a, b) => a - b)[1];
      saveEntry(testState.parameter, { value: `Reaction time · ${median} ms (${testState.trials.join(', ')})`, score: median, trials: testState.trials }, median <= testState.parameter.base + 25 ? 'Within your usual range.' : 'Slower than usual. Rest and try again later.');
    }
  };
  const startMemory = parameter => {
    const faces = ['🚀', '🌙', '⭐', '🪐', '☄️', '🛰️', '👨‍🚀', '🌍'];
    const cards = [...faces, ...faces];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    testState = { type: 'memory', parameter, cards, open: cards.map(() => true), matched: cards.map(() => false), selected: [], score: 0, attempts: 0, locked: true };
    drawMemory('Memorize the cards for 5 seconds.');
    let countdown = 5;
    const step = () => {
      if (!testState || testState.type !== 'memory') return;
      countdown--;
      if (countdown > 0) { drawMemory(`Memorize the cards: ${countdown}`); testTimer = setTimeout(step, 1000); }
      else { testState.open = testState.open.map(() => false); testState.locked = false; drawMemory('Find the pairs.'); }
    };
    testTimer = setTimeout(step, 1000);
  };
  const drawMemory = message => {
    if (!testState || testState.type !== 'memory') return;
    const body = `<p><b>Score ${testState.score}</b> · Attempts ${testState.attempts}</p><div class="hc-memory-grid">${testState.cards.map((face, index) => `<button class="hc-memory-card ${testState.matched[index] ? 'matched' : ''}" data-action="memory-card" data-index="${index}" aria-label="${testState.matched[index] || testState.open[index] ? face : 'Hidden card'}">${testState.matched[index] || testState.open[index] ? face : '?'}</button>`).join('')}</div><p class="hc-note">${escape(message)}</p>`;
    modal = { html: modalTitle('Working memory test', body, ''), metricKey: testState.parameter.key };
    render();
  };
  const memoryCard = index => {
    if (!testState || testState.type !== 'memory' || testState.locked || testState.matched[index] || testState.open[index]) return;
    testState.open[index] = true;
    testState.selected.push(index);
    if (testState.selected.length < 2) { drawMemory('Pick a second card.'); return; }
    const [first, second] = testState.selected;
    testState.selected = [];
    testState.attempts++;
    if (testState.cards[first] === testState.cards[second]) {
      testState.matched[first] = testState.matched[second] = true;
      testState.score += 10;
      if (testState.matched.every(Boolean)) {
        const parameter = testState.parameter, score = testState.score, attempts = testState.attempts;
        const efficiency = Math.round(8 / attempts * 100);
        saveEntry(parameter, { value: `Working memory · score ${score}, 8 pairs in ${attempts} attempts (${efficiency}% efficiency)`, score, attempts, efficiency }, efficiency >= parameter.base - 10 ? 'Within your usual range.' : 'Below your usual range. Rest and try again later.');
      } else drawMemory('Match! +10');
    } else {
      testState.locked = true;
      testState.score = Math.max(0, testState.score - 2);
      drawMemory('No match. −2');
      testTimer = setTimeout(() => {
        if (!testState || testState.type !== 'memory') return;
        testState.open[first] = testState.open[second] = false;
        testState.locked = false;
        drawMemory('Find the pairs.');
      }, 800);
    }
  };
  const startAccuracy = parameter => {
    testState = { type: 'accuracy', parameter, round: 0, correct: 0 };
    drawAccuracy();
  };
  const drawAccuracy = () => {
    const symbols = [['●', '○'], ['▲', '△'], ['■', '□'], ['◆', '◇'], ['E', 'F'], ['b', 'd'], ['O', 'Q'], ['M', 'N']];
    const pair = symbols[Math.floor(Math.random() * symbols.length)];
    const odd = Math.floor(Math.random() * 16);
    const swap = Math.random() < .5 ? 1 : 0;
    testState = { ...testState, pair, odd, swap };
    const body = `<p>Round ${testState.round + 1} of 10</p><div class="hc-memory-grid">${Array.from({ length: 16 }, (_, index) => `<button class="hc-memory-card" data-action="accuracy-pick" data-index="${index}" aria-label="Symbol ${index + 1}">${pair[index === odd ? 1 - swap : swap]}</button>`).join('')}</div><p>Tap the odd one out.</p>`;
    modal = { html: modalTitle(`Test · ${testState.parameter.name}`, body, ''), metricKey: testState.parameter.key };
    render();
  };
  const accuracyPick = index => {
    if (!testState || testState.type !== 'accuracy') return;
    if (+index === testState.odd) testState.correct++;
    testState.round++;
    if (testState.round < 10) drawAccuracy();
    else {
      const percent = testState.correct * 10;
      saveEntry(testState.parameter, { value: `Accuracy · ${percent}% (${testState.correct} of 10 correct)`, score: percent }, percent >= testState.parameter.base - 3 ? 'Within your usual range.' : 'Below your usual range. Read this alongside reaction speed.');
    }
  };
  const timerResult = (seconds, ended) => {
    if (!testState || testState.type !== 'timer') return;
    clearTimeout(testTimer);
    testTimer = 0;
    testState.seconds = clamp(Math.round(seconds), 0, testState.length);
    testState.ended = ended;
    const percent = Math.round(testState.seconds / testState.length * 100);
    const body = `<p>${ended ? 'The 2 minutes are up. ' : ''}${testState.parameter.key === 'gait' ? 'How long did you keep walking comfortably?' : 'How long did you manage to stay balanced on one leg?'} Move either slider.</p><label class="hc-field">Time: <output data-timer-time-label>${formatTimerDuration(testState.seconds)}</output><input type="range" min="0" max="${testState.length}" step="1" value="${testState.seconds}" data-field="timer-time"></label><label class="hc-field">Share of the 2 minutes: <output data-timer-percent-label>${percent}%</output><input type="range" min="0" max="100" step="1" value="${percent}" data-field="timer-percent"></label>`;
    modal = { html: modalTitle(`Result · ${testState.parameter.name}`, body, `${actionButton('timer-cancel', 'Cancel')}${actionButton('timer-save', 'Save result', 'primary')}`), metricKey: testState.parameter.key };
    render();
  };
  const startTimerTest = parameter => {
    testState = { type: 'timer', parameter, length: 120, start: Date.now() };
    const body = `<p>${parameter.key === 'gait' ? 'Keep walking.' : 'Stay balanced on one leg.'} When the timer ends you can set how long you managed.</p><strong class="hc-timer">2:00</strong><div class="hc-progress"><i></i></div>`;
    modal = { html: modalTitle(`Timer · ${parameter.name}`, body, `${actionButton('timer-finish', 'Finish early', 'primary')}${actionButton('timer-cancel', 'Cancel')}`), metricKey: parameter.key };
    render();
    const tick = () => {
      if (!testState || testState.type !== 'timer') return;
      const elapsed = clamp((Date.now() - testState.start) / 1000, 0, 120);
      const left = Math.max(0, Math.ceil(120 - elapsed));
      const timer = modalHost.querySelector('.hc-timer');
      const progress = modalHost.querySelector('.hc-progress i');
      if (timer) timer.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (progress) progress.style.width = `${elapsed / 1.2}%`;
      if (left <= 0) { timerResult(120, true); return; }
      testTimer = setTimeout(tick, 200);
    };
    tick();
  };
  const evaluate = parameter => {
    const titleType = parameter.mode === 'scale' ? 'Check-in'
      : parameter.mode === 'log' || parameter.mode === 'cycle' ? 'Log'
        : parameter.mode === 'measure' ? 'Evaluate' : 'Test';
    const title = `${titleType} · ${parameter.name}`;
    const help = `<p>${escape(parameter.note)}</p>`;
    if (parameter.key === 'slog') {
      skinNotes = [];
      openModal(modalTitle(title, `<p>Pick what fits, then use the chat for anything else. Everything is saved with your entry and evaluated later.</p><div class="hc-option-list">${parameter.options.map(option => `<button class="hc-button small" data-action="skin-select" data-value="${escape(option)}" aria-pressed="false">${escape(option)}</button>`).join('')}</div><div class="hc-chat-messages" data-skin-chat role="log" aria-live="polite" aria-relevant="additions"><p class="hc-chat-message">Add anything else here: where it is, how big, how long, what you applied.</p></div><div class="hc-chat-composer"><input data-field="skin-note" type="text" maxlength="800" placeholder="Type a note…" aria-label="Note for this entry" autocomplete="off"><button class="hc-button primary" data-action="skin-send">Send</button></div>`, actionButton('skin-save', 'Save entry', 'primary')), parameter.key);
    } else if (parameter.mode === 'log' || parameter.mode === 'cycle') {
      openModal(modalTitle(title, `<p>Pick what fits. You can add more later.</p><div class="hc-option-list">${parameter.options.map(option => `<button class="hc-button small" data-action="log-option" data-value="${escape(option)}">${escape(option)}</button>`).join('')}</div>`), parameter.key);
    } else if (parameter.mode === 'scale') {
      const minimum = parameter.low ?? 0, maximum = parameter.high ?? 10;
      const values = Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
      openModal(modalTitle(title, `<p>${escape(parameter.anchors)}</p><div class="hc-option-list" role="group" aria-label="${escape(parameter.name)} rating">${values.map(value => `<button class="hc-button small" data-action="save-scale" data-value="${value}" aria-label="${value}">${value}</button>`).join('')}</div>`), parameter.key);
    } else if (parameter.mode === 'pvt') {
      openModal(modalTitle(title, '<p>Tap as soon as the circle lights up. Three quick trials, about one minute.</p>', actionButton('pvt-start', 'Start test', 'primary')), parameter.key);
    } else if (parameter.mode === 'memory') {
      openModal(modalTitle(`Game · ${parameter.name}`, '<p>16 cards are shown for 5 seconds, then they turn over. Flip two at a time. A match scores +10 and stays open. A miss costs −2 and the cards turn back. Keep going until every pair is found.</p>', actionButton('memory-start', 'Start game', 'primary')), parameter.key);
    } else if (parameter.mode === 'accuracy') {
      openModal(modalTitle(title, '<p>Ten quick rounds. In each round, tap the one symbol that is different from the others. Accuracy matters more than speed.</p>', actionButton('accuracy-start', 'Start', 'primary')), parameter.key);
    } else if (parameter.mode === 'acuity') {
      testState = { type: 'acuity', parameter, eye: 'Both', score: 0, rows: [1, 2, 3, 4, 5].map(count => Array.from({ length: count }, () => 'CDHKNORSVZ'[Math.floor(Math.random() * 10)]).join(' ')) };
      const eyes = ['Left', 'Right', 'Both'].map(eye => `<button class="hc-button small ${eye === 'Both' ? 'selected' : ''}" data-action="acuity-eye" data-eye="${eye}" aria-pressed="${eye === 'Both'}">${eye}</button>`).join('');
      const body = `<p>Stand about 3 m (10 ft) from the screen and mark the spot, so you test from the same place each time. Turn the brightness up. Keep glasses or contacts on if you use them.</p><p>Which eye? Cover the other one.</p><div class="hc-button-row" role="group" aria-label="Select eye">${eyes}</div>`;
      openModal(modalTitle(title, body, actionButton('acuity-show', 'Show chart', 'primary')), parameter.key);
    } else if (parameter.mode === 'timer') {
      const instruction = parameter.key === 'gait'
        ? 'Walk at a comfortable pace along your marked route for 2 minutes.'
        : 'Stand on one leg with your eyes closed. Stay next to a wall or rail for safety.';
      openModal(modalTitle(title, `${help}<p>${instruction} A 2-minute timer starts when you press the button, and you can cancel it at any time.</p>`, actionButton('timer-start', 'Start test', 'primary')), parameter.key);
    } else if (parameter.mode === 'test') {
      openModal(modalTitle(title, `${help}<p>About two minutes. Get comfortable and stay relaxed.</p>`, actionButton('test-start', 'Start test', 'primary')), parameter.key);
    } else if (parameter.mode === 'measure') {
      openModal(modalTitle(title, '<p>Connect a compatible device to take this measurement.</p><div class="hc-button-row" role="group" aria-label="Device connection"><button class="hc-button small" data-action="device-port" data-value="Bluetooth" aria-pressed="true">Bluetooth</button><button class="hc-button small" data-action="device-port" data-value="USB cable" aria-pressed="false">USB cable</button><button class="hc-button small" data-action="device-port" data-value="Onboard sensor port" aria-pressed="false">Onboard sensor port</button></div>', actionButton('device-measure', 'Connect and measure', 'primary')), parameter.key);
    } else {
      openModal(modalTitle(title, `${help}<p>Latest generated value: <b>${escape(formatMetric(parameter))}</b></p>`, actionButton('close-modal', 'Done', 'primary')), parameter.key);
    }
  };

  const handleActionClick = event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const state = store.getState();
    if (action === 'backdrop' && event.target === button) { closeModal(); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'home') { returnHome(); return; }
    if (action === 'back') { back(); return; }
    if (action === 'scroll') {
      shell.querySelector(`#${CSS.escape(button.dataset.target)}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      say(button.dataset.target === 'hc-dashboard' ? TIPS.dash : button.dataset.target === 'hc-reminders' ? TIPS.notes : TIPS.apps);
      return;
    }
    if (action === 'area') {
      if (button.dataset.area === 'gym' || button.dataset.area === 'nutrition') navigate(button.dataset.area);
      else navigate('area', button.dataset.area);
      return;
    }
    if (action === 'system') { const target = getSystem(button.dataset.system); if (target) navigate('system', target.area, target.id); return; }
    if (action === 'range') { range = button.dataset.range; render(); return; }
    if (action === 'toggle-metric') {
      const key = button.dataset.metric;
      if (expandedMetrics.has(key)) expandedMetrics.delete(key); else expandedMetrics.add(key);
      render();
      return;
    }
    if (action === 'indicator') {
      const parameter = getMetric(button.dataset.metric);
      if (parameter) {
        const owner = systems.find(item => item.metrics.some(metric => metric.key === parameter.key));
        if (owner) {
          expandedMetrics.add(parameter.key);
          navigate('system', owner.area, owner.id, parameter.key);
          requestAnimationFrame(() => shell.querySelector(`#metric-${CSS.escape(parameter.key)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          say(parameter.note);
        }
      }
      else say(`${button.dataset.metric} details are not available.`);
      return;
    }
    if (action === 'metric-info') {
      const parameter = getMetric(button.dataset.metric);
      if (parameter) { selectedParameterKey = parameter.key; openModal(modalTitle(parameter.name, `<p>${escape(parameter.note)}</p><p>${escape(parameter.name)} is a demonstration indicator. Interpret it with its context and data quality.</p>`, actionButton('close-modal', 'Close', 'primary')), parameter.key); }
      return;
    }
    if (action === 'evaluate') { const parameter = getMetric(button.dataset.metric); if (parameter) { selectedParameterKey = parameter.key; evaluate(parameter); } return; }
    if (action === 'device-port') {
      button.parentElement.querySelectorAll('[data-action="device-port"]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      return;
    }
    if (action === 'tip') { say(button.dataset.tip); return; }
    if (action === 'ack-reminder') { notifyStore(store.update(s => { s.reminders[button.dataset.id] = { state: 'acknowledged', at: new Date().toISOString() }; })); say('Acknowledged. The alert stays in the audit history.'); return; }
    if (action === 'choose-defer') { notifyStore(store.update(s => { s.reminders[button.dataset.id] = { state: 'choose-reason' }; })); say('Please pick a reason for deferring.'); return; }
    if (action === 'defer-reminder') { notifyStore(store.update(s => { s.reminders[button.dataset.id] = { state: 'deferred', reason: button.dataset.reason, at: new Date().toISOString() }; })); say('Deferred. It will come back when the new date arrives.'); return; }
    if (action === 'undo-reminder') { notifyStore(store.update(s => { delete s.reminders[button.dataset.id]; })); return; }
    if (action === 'reminder-open') {
      const item = reminders.find(reminder => reminder.id === button.dataset.id);
      if (item?.metric) {
        const found = systems.find(x => x.metrics.some(m => m.key === item.metric));
        if (found) {
          goTest(found.id, item.metric, item.evaluate);
        }
      }
      else navigate('coming', item?.page || item?.title || 'Health assessment package');
      return;
    }
    if (action === 'toggle-cycle') {
      const enabled = !state.menstrual.enabled;
      notifyStore(store.update(s => { s.menstrual.enabled = enabled; }));
      say(enabled ? 'Menstrual cycle tracking is on for this profile.' : 'Menstrual cycle tracking is off.');
      return;
    }
    if (action === 'connect-sensors') {
      button.textContent = 'Connecting…';
      button.disabled = true;
      clearTimeout(connectTimer);
      connectTimer = setTimeout(() => {
        notifyStore(store.update(s => { s.sensorsConnected = true; }));
        liveReadings = nextLiveReadings();
        render();
        say('Sensors connected. They keep surveying the station 24/7, so you do not need to connect again.');
      }, 1200);
      return;
    }
    if (action === 'gym-day') { navigate('gym', button.dataset.day); return; }
    if (action === 'gym-camera') { setGymCamera(Number(button.dataset.day), button.getAttribute('aria-checked') !== 'true'); return; }
    if (action === 'replace-video') { shell.querySelector(`[data-field="gym-video"][data-day="${CSS.escape(button.dataset.day)}"]`)?.click(); return; }
    if (action === 'water-add') {
      const amount = Number(button.dataset.amount);
      notifyStore(store.update(s => {
        s.nutrition.waterMl = (s.nutrition.waterMl || 0) + amount;
        s.nutrition.meals.unshift({ label: `Water · ${amount} ml`, category: 'water', water: amount, at: new Date().toISOString() });
      }));
      say('Water added.');
      return;
    }
    if (action === 'meal-preset') {
      const preset = mealPresets[Number(button.dataset.index)];
      if (!preset) return;
      notifyStore(store.update(s => addMealToState(s, preset)));
      say(`Logged: ${preset.label}.`);
      return;
    }
    if (action === 'digestive') { notifyStore(store.record('digestive', { label: button.dataset.label })); say('Noted. Your suggestions have been updated.'); return; }
    if (action === 'cycle-day') { calendar.selected = button.dataset.date; render(); return; }
    if (action === 'cycle-month') { const date = new Date(calendar.year, calendar.month + Number(button.dataset.delta), 1); calendar.year = date.getFullYear(); calendar.month = date.getMonth(); render(); return; }
    if (action === 'cycle-year') { calendar.year += Number(button.dataset.delta); render(); return; }
    if (action === 'cycle-mode') { calendar.mode = calendar.mode === 'year' ? 'month' : 'year'; render(); return; }
    if (action === 'cycle-month-select') { calendar.month = Number(button.dataset.month); calendar.mode = 'month'; render(); return; }
    if (action === 'cycle-window') { calendar.window = Number(button.dataset.window); render(); return; }
    if (action === 'cycle-log-symptoms') {
      cycleSymptomDate = button.dataset.date;
      const current = state.menstrual.symptoms?.[cycleSymptomDate];
      cycleSymptomSelection = Array.isArray(current) ? [...current] : current ? [current] : [];
      const day = new Date(`${cycleSymptomDate}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const choices = ['Cramps', 'Headache', 'Fatigue', 'Mood change', 'Bloating', 'Breast tenderness', 'Spotting'];
      const body = `<p>Pick all that apply.</p><div class="hc-option-list">${choices.map(label => `<button class="hc-button small ${cycleSymptomSelection.includes(label) ? 'selected' : ''}" data-action="cycle-symptom-toggle" data-label="${escape(label)}" aria-pressed="${cycleSymptomSelection.includes(label)}">${escape(label)}</button>`).join('')}</div>`;
      selectedParameterKey = 'msym';
      openModal(modalTitle(`Symptoms · ${day}`, body, actionButton('cycle-symptom-save', 'Save', 'primary')), 'msym');
      return;
    }
    if (action === 'cycle-symptom-toggle') {
      const label = button.dataset.label;
      const selected = cycleSymptomSelection.includes(label);
      cycleSymptomSelection = selected ? cycleSymptomSelection.filter(item => item !== label) : [...cycleSymptomSelection, label];
      button.classList.toggle('selected', !selected);
      button.setAttribute('aria-pressed', String(!selected));
      return;
    }
    if (action === 'cycle-symptom-save') {
      const date = cycleSymptomDate;
      const selected = [...cycleSymptomSelection];
      notifyStore(store.update(s => {
        s.menstrual.symptoms ||= {};
        if (selected.length) {
          s.menstrual.symptoms[date] = selected;
          addHistoryEntry(s, 'msym', { label: selected.join(', '), date });
        } else {
          delete s.menstrual.symptoms[date];
        }
      }));
      cycleSymptomDate = '';
      cycleSymptomSelection = [];
      closeModal();
      say('Symptoms saved for this day.');
      return;
    }
    if (action === 'period-start') {
      const date = button.dataset.date;
      const historyPeriods = state.menstrual.periods.length ? state.menstrual.periods : cycleDemoHistory();
      const durations = historyPeriods.filter(item => item.end).map(item =>
        Math.round((new Date(`${item.end}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000) + 1).filter(value => value > 0 && value <= 14);
      const averageDuration = durations.length ? mean(durations) : 5;
      notifyStore(store.update(s => {
        const periods = ensureCyclePeriods(s);
        if (!periods.some(item => item.start === date)) periods.push({ start: date, end: null, lastDay: date });
        addHistoryEntry(s, 'cyc', { label: 'Period started', date });
      }));
      selectedParameterKey = 'cyc';
      say(`Period start logged. From your history it usually lasts about ${Math.round(averageDuration)} days, so those days are coloured as predicted.`); return;
    }
    if (action === 'period-end') {
      const date = button.dataset.date;
      const historyPeriods = state.menstrual.periods.length ? state.menstrual.periods : cycleDemoHistory();
      const period = [...historyPeriods].reverse().find(item => {
        const age = Math.round((new Date(`${date}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000);
        return item.start <= date && age >= 0 && age <= 14 && (!item.end || date <= item.end);
      });
      if (!period) return;
      const duration = Math.round((new Date(`${date}T12:00:00`) - new Date(`${period.start}T12:00:00`)) / 86400000) + 1;
      notifyStore(store.update(s => {
        const periods = ensureCyclePeriods(s);
        const current = [...periods].reverse().find(item => {
          const age = Math.round((new Date(`${date}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000);
          return item.start <= date && age >= 0 && age <= 14 && (!item.end || date <= item.end);
        });
        if (current) { current.end = date; current.lastDay = date; addHistoryEntry(s, 'cyc', { label: 'Period ended', date }); }
      }));
      selectedParameterKey = 'cyc';
      say(`Period end logged. This period lasted ${duration} days.`); return;
    }
    if (action === 'period-add-day') {
      const date = button.dataset.date;
      const historyPeriods = state.menstrual.periods.length ? state.menstrual.periods : cycleDemoHistory();
      const period = [...historyPeriods].reverse().find(item => {
        const age = Math.round((new Date(`${date}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000);
        return item.start <= date && age >= 0 && age <= 14;
      });
      if (!period || date <= (period.end || period.start)) return;
      const duration = Math.round((new Date(`${date}T12:00:00`) - new Date(`${period.start}T12:00:00`)) / 86400000) + 1;
      notifyStore(store.update(s => {
        const periods = ensureCyclePeriods(s);
        const period = [...periods].reverse().find(item => {
          const age = Math.round((new Date(`${date}T12:00:00`) - new Date(`${item.start}T12:00:00`)) / 86400000);
          return item.start <= date && age >= 0 && age <= 14;
        });
        if (period && date > (period.end || period.start)) { period.lastDay = date; period.end = date; addHistoryEntry(s, 'cyc', { label: 'Added period day', date }); }
      }));
      selectedParameterKey = 'cyc';
      say(`Day added. This period now lasts ${duration} days.`); return;
    }
    if (action === 'log-option') {
      const parameter = getMetric(modal?.metricKey);
      if (parameter) saveEntry(parameter, { label: button.dataset.value }, 'Added to your log.');
      return;
    }
    if (action === 'skin-select') {
      const selected = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
      return;
    }
    if (action === 'skin-send') {
      const input = modalHost.querySelector('[data-field="skin-note"]');
      const note = input?.value.trim();
      if (!note) { say('Type a note before sending it.'); return; }
      skinNotes.push(note);
      const messages = modalHost.querySelector('[data-skin-chat]');
      if (messages) messages.insertAdjacentHTML('beforeend', `<p class="hc-chat-message">${escape(note)}</p>`);
      input.value = '';
      input.focus();
      return;
    }
    if (action === 'skin-review') {
      const history = modalHost.querySelector('[data-skin-review-history]');
      if (history) {
        history.hidden = !history.hidden;
        button.setAttribute('aria-expanded', String(!history.hidden));
      }
      return;
    }
    if (action === 'skin-save') {
      const parameter = getMetric('slog');
      const labels = [...modalHost.querySelectorAll('[data-action="skin-select"][aria-pressed="true"]')].map(item => item.dataset.value);
      const pendingNote = modalHost.querySelector('[data-field="skin-note"]')?.value.trim() || '';
      if (pendingNote) skinNotes.push(pendingNote);
      if (!labels.length && !skinNotes.length) { say('Pick an option or write a note first.'); return; }
      if (parameter) saveEntry(parameter, { label: labels.join(', ') || 'Skin note', selections: labels, notes: [...skinNotes], reviewed: true }, 'Saved to your skin history for later review.');
      return;
    }
    if (action === 'save-scale') {
      const parameter = getMetric(modal?.metricKey), value = Number(button.dataset.value);
      if (parameter && Number.isFinite(value)) saveEntry(parameter, { value, label: `${parameter.name} · ${value}` }, 'Added to your check-in history.');
      return;
    }
    if (action === 'pvt-start') { const parameter = getMetric(modal?.metricKey); if (parameter) startPvt(parameter); return; }
    if (action === 'pvt-retry') { runPvtRound(); return; }
    if (action === 'pvt-tap') { pvtTap(); return; }
    if (action === 'memory-start') { const parameter = getMetric(modal?.metricKey); if (parameter) startMemory(parameter); return; }
    if (action === 'memory-card') { memoryCard(Number(button.dataset.index)); return; }
    if (action === 'accuracy-start') { const parameter = getMetric(modal?.metricKey); if (parameter) startAccuracy(parameter); return; }
    if (action === 'accuracy-pick') { accuracyPick(button.dataset.index); return; }
    if (action === 'acuity-eye' && testState?.type === 'acuity') {
      testState.eye = button.dataset.eye;
      modalHost.querySelectorAll('[data-action="acuity-eye"]').forEach(item => {
        const selected = item === button;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      return;
    }
    if (action === 'acuity-show' && testState?.type === 'acuity') {
      const { rows } = testState;
      modal = { html: modalTitle(`Chart · ${testState.parameter.name}`, `<p>Read the symbols aloud from the top, row by row, as far as you can. Check them against the chart.</p><div class="hc-acuity-chart">${rows.map((row, index) => `<div style="font-size:${[58, 42, 30, 21, 15][index]}px">${row}</div>`).join('')}</div><p>How many symbols did you read correctly?</p><div class="hc-button-row"><button class="hc-button" data-action="acuity-count" data-delta="-1" aria-label="One less">−</button><b data-acuity-score>${testState.score} of 15</b><button class="hc-button" data-action="acuity-count" data-delta="1" aria-label="One more">+</button></div>`, `${actionButton('acuity-cancel', 'Cancel')}${actionButton('acuity-save', 'Save result', 'primary')}`), metricKey: testState.parameter.key };
      render(); return;
    }
    if (action === 'acuity-count' && testState?.type === 'acuity') {
      testState.score = clamp(testState.score + Number(button.dataset.delta), 0, 15);
      const output = modalHost.querySelector('[data-acuity-score]');
      if (output) output.textContent = `${testState.score} of 15`;
      return;
    }
    if (action === 'acuity-cancel') { testState = null; closeModal(); return; }
    if (action === 'acuity-save' && testState?.type === 'acuity') {
      const parameter = testState.parameter, score = testState.score, eye = testState.eye;
      const thresholds = [1, 3, 6, 10, 15];
      const band = thresholds.filter(count => score >= count).length;
      const decimal = [0, .2, .4, .6, .8, 1][band];
      testState = null;
      saveEntry(parameter, { value: `Visual acuity · ${eye} · ${score} of 15 symbols correct (about ${decimal.toFixed(1)} decimal)`, score: decimal, symbols: score, eye }, decimal >= .8 ? 'Within your usual range.' : 'Lower than usual. Check the distance and lighting, then repeat.');
      return;
    }
    if (action === 'timer-start') { const parameter = getMetric(modal?.metricKey); if (parameter) startTimerTest(parameter); return; }
    if (action === 'timer-finish') { if (testState?.type === 'timer') timerResult((Date.now() - testState.start) / 1000, false); return; }
    if (action === 'timer-cancel') { clearTimeout(testTimer); testTimer = 0; testState = null; closeModal(); say('Timer cancelled. Nothing was saved.'); return; }
    if (action === 'timer-save' && testState?.type === 'timer') {
      const parameter = testState.parameter, seconds = Number(modalHost.querySelector('[data-field="timer-time"]')?.value || 0);
      const percent = Math.round(seconds / testState.length * 100);
      testState = null;
      saveEntry(parameter, { value: `${seconds} seconds (${percent}% of 2 min)`, seconds, percent }, 'Timed test result saved.');
      return;
    }
    if (action === 'device-measure' || action === 'test-start') {
      const parameter = getMetric(modal?.metricKey);
      if (!parameter) return;
      const deviceMode = action === 'device-measure';
      const port = deviceMode ? modalHost.querySelector('[data-action="device-port"][aria-pressed="true"]')?.dataset.value || 'Bluetooth' : '';
      modal = { html: modalTitle(deviceMode ? 'Connecting and measuring' : 'Test in progress', '<p>Please keep still.</p><div class="hc-progress hc-device-progress"><i></i></div>', '') };
      render();
      testTimer = setTimeout(() => {
        const generated = generateMeasurement(parameter);
        const result = `${generated.map(value => Number(value.toFixed(parameter.digits))).join('/')}${parameter.unit ? ` ${parameter.unit}` : ''}`;
        saveEntry(parameter, { value: result, score: generated[0], ...(deviceMode ? { port } : {}) }, 'Within your usual range. Compared with your own baseline.');
      }, 1900);
      return;
    }
  };
  shell.addEventListener('click', handleActionClick);
  modalHost.addEventListener('click', handleActionClick);

  modalHost.addEventListener('input', event => {
    if (event.target.matches('[data-field="scale-value"]')) {
      const output = modalHost.querySelector('[data-scale-output]');
      if (output) output.value = event.target.value;
    }
    if (event.target.matches('[data-field="timer-time"]') && testState?.type === 'timer') {
      const seconds = Number(event.target.value), percent = Math.round(seconds / testState.length * 100);
      const other = modalHost.querySelector('[data-field="timer-percent"]');
      if (other) other.value = percent;
      modalHost.querySelector('[data-timer-time-label]').textContent = formatTimerDuration(seconds);
      modalHost.querySelector('[data-timer-percent-label]').textContent = `${percent}%`;
    }
    if (event.target.matches('[data-field="timer-percent"]') && testState?.type === 'timer') {
      const percent = Number(event.target.value), seconds = Math.round(percent / 100 * testState.length);
      const other = modalHost.querySelector('[data-field="timer-time"]');
      if (other) other.value = seconds;
      modalHost.querySelector('[data-timer-time-label]').textContent = formatTimerDuration(seconds);
      modalHost.querySelector('[data-timer-percent-label]').textContent = `${percent}%`;
    }
  });
  const onDocumentPointerDown = event => {
    const wrap = modalHost.querySelector('.hc-zibo-wrap');
    if (askOpen && !wrap?.contains(event.target)) setAskOpen(false);
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  modalHost.addEventListener('pointerdown', event => {
    const wrap = event.target.closest('.hc-zibo-wrap');
    if (!wrap || event.target.closest('.hc-zibo-ask')) return;
    const rect = wrap.getBoundingClientRect();
    draggingZibo = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    wrap.setPointerCapture?.(event.pointerId);
  });
  modalHost.addEventListener('pointermove', event => {
    if (!draggingZibo || event.pointerId !== draggingZibo.id) return;
    const dx = event.clientX - draggingZibo.startX, dy = event.clientY - draggingZibo.startY;
    if (!draggingZibo.moved && Math.hypot(dx, dy) < 6) return;
    draggingZibo.moved = true;
    const wrap = modalHost.querySelector('.hc-zibo-wrap');
    const bounds = ziboBounds();
    const x = clamp(draggingZibo.left + dx, bounds.minX, bounds.maxX);
    const y = clamp(draggingZibo.top + dy, bounds.minY, bounds.maxY);
    if (wrap) {
      wrap.classList.add('drag');
      wrap.style.cssText = `left:${x}px;top:${y}px;right:auto;bottom:auto`;
    }
    event.preventDefault();
  });
  const finishZiboDrag = event => {
    if (!draggingZibo || event.pointerId !== draggingZibo.id) return;
    if (draggingZibo.moved) {
      const wrap = modalHost.querySelector('.hc-zibo-wrap');
      const rect = wrap?.getBoundingClientRect();
      wrap?.classList.remove('drag');
      if (rect) notifyStore(store.update(s => {
        s.zibo.position = {
          unit: 'px',
          x: clamp(rect.left, 0, Math.max(0, window.innerWidth - rect.width)),
          y: clamp(rect.top, 0, Math.max(0, window.innerHeight - rect.height)),
        };
      }));
      event.preventDefault();
    } else {
      toggleAsk();
    }
    draggingZibo = null;
  };
  modalHost.addEventListener('pointerup', finishZiboDrag);
  modalHost.addEventListener('pointercancel', event => {
    if (!draggingZibo || event.pointerId !== draggingZibo.id) return;
    modalHost.querySelector('.hc-zibo-wrap')?.classList.remove('drag');
    draggingZibo = null;
  });
  shell.addEventListener('change', event => {
    if (event.target.matches('[data-field="water-goal"]')) {
      const goal = clamp(Number(event.target.value) || 2000, 250, 6000);
      notifyStore(store.update(s => { s.nutrition.goalMl = goal; }));
    }
    if (event.target.matches('[data-field="gym-video"]')) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.type && !file.type.startsWith('video/')) { console.error('Health Center guided workout upload must be a video file.'); return; }
      const dayIndex = Number(event.target.dataset.day);
      const media = gymMedia[dayIndex];
      if (media.url) URL.revokeObjectURL(media.url);
      media.url = URL.createObjectURL(file);
      media.fileName = file.name;
      notifyStore(store.update(s => { s.gym.videoNames[dayIndex] = file.name; }));
      render();
    }
  });
  modalHost.addEventListener('submit', event => {
    const form = event.target.closest('.hc-zibo-ask');
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector('input');
    const question = input?.value.trim();
    if (!question) return;
    input.value = '';
    setAskOpen(false);
    say('Thinking…');
    ziboAsk(question).then(answer => say(String(answer || ZIBO_FALLBACK(question))))
      .catch(error => say(error.message || ZIBO_FALLBACK(question)));
  });
  const handleModalKeydown = event => {
    if (event.key === 'Escape') {
      const inZibo = !!event.target.closest?.('.hc-zibo-wrap');
      if (inZibo && askOpen) {
        event.preventDefault();
        event.stopPropagation();
        setAskOpen(false, true);
        return;
      }
      if (modal) { event.preventDefault(); event.stopPropagation(); closeModal(); return; }
      if (inZibo) { event.preventDefault(); event.stopPropagation(); return; }
    }
    if (event.key === 'Enter' && event.target.matches('[data-field="skin-note"]')) {
      event.preventDefault();
      modalHost.querySelector('[data-action="skin-send"]')?.click();
      return;
    }
    if (event.key === 'Tab' && modal) {
      const dialog = modalHost.querySelector('.hc-modal');
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  shell.addEventListener('keydown', handleModalKeydown);
  modalHost.addEventListener('keydown', handleModalKeydown);
  const storeChange = () => {
    if (store.getState().sensorsConnected) {
      if (!Object.keys(liveReadings).length) liveReadings = nextLiveReadings();
      if (!liveTimer) liveTimer = setInterval(() => {
        liveReadings = nextLiveReadings();
        if (view === 'system' && getSystem(system)?.area === 'environment' || view === 'area' && area === 'environment') render();
      }, 2000);
    } else {
      clearInterval(liveTimer);
      liveTimer = 0;
    }
    render();
  };
  store.addEventListener('change', storeChange);

  try { window.history.pushState({ ...(window.history.state || {}), __healthCenter: { token: historyToken, index: 0 } }, ''); }
  catch { /* The shell may disable history state updates. */ }

  const buildHealthContext = () => {
    const state = store.getState();
    const parameter = getMetric(selectedParameterKey);
    const today = localDate();
    const nutrition = {
      ...state.nutrition,
      meals: (state.nutrition.meals || []).filter(item => item.at && localDate(new Date(item.at)) === today).slice(0, 7),
    };
    const context = {
      currentView: { id: view, area: area || null, system: system || null },
      currentParameter: parameter ? { key: parameter.key, name: parameter.name, unit: parameter.unit } : null,
      keyIndicators: tiles.map(([name, value, unit, status, , key]) => ({ name, value, unit, status, key })),
      activeNotices: reminders.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        state: state.reminders[item.id]?.state || 'default',
        reason: state.reminders[item.id]?.reason || null,
      })),
      recentHistory: selectedParameterKey ? (state.history[selectedParameterKey] || []).slice(0, 10) : [],
      nutrition: { ...nutrition, targets: selectedTargets() },
      gym: {
        ...state.gym,
        today: {
          day: exercises[2][0],
          session: exercises[2][1],
          type: exercises[2][2],
          exercises: exercises[2][3],
        },
      },
      menstrualTrackingEnabled: !!state.menstrual.enabled,
    };
    if (state.menstrual.enabled) context.menstrualCycle = state.menstrual;
    return context;
  };

  async function sendZibo(cleanQuestion) {
    const healthContext = buildHealthContext();
    ziboEvents.publish('question', { question: cleanQuestion, healthContext });
    const point = { view, area, system, parameter: selectedParameterKey, range, calendar: { ...calendar }, stack: stack.map(item => ({ ...item })), scroll: getScrollPosition() };
    openAssistant(point);
    const ai = window.BZG?.ai;
    let conversationId;
    let answer = '';
    if (!ai?.backend) {
      answer = ZIBO_FALLBACK(cleanQuestion);
      ziboEvents.publish('error', { message: 'AI assistant is unavailable.' });
    } else {
      try {
        answer = await ai.backend([{ role: 'user', content: cleanQuestion }], {
          stream: true, newConversation: true, healthContext,
          onConversation: id => { conversationId = id; },
          onToken: text => { answer = text; },
        });
      } catch (error) {
        answer = ZIBO_FALLBACK(cleanQuestion);
        ziboEvents.publish('error', { message: error.message || 'Connection failed.' });
      }
    }
    if (window.BZG?.ai) window.BZG.ai.pending = {
      history: [
        { role: 'user', content: cleanQuestion },
        ...(answer ? [{ role: 'assistant', content: answer }] : []),
      ],
      conversationId, healthContext,
    };
    if (typeof window.__bszOpenPageById === 'function') window.__bszOpenPageById('assistant');
    else answer = ZIBO_FALLBACK(cleanQuestion);
    ziboEvents.publish('opened', { question: cleanQuestion, conversationId, healthContext });
    ziboEvents.publish('answer', { question: cleanQuestion, answer });
    return answer || 'Opening the Health Center assistant with your question.';
  }

  const previousZiboAsk = window.ziboAsk;
  const ziboAsk = question => {
    const cleanQuestion = String(question || '').trim().slice(0, 600);
    if (!cleanQuestion) return Promise.reject(new Error('Enter a question first.'));
    return sendZibo(cleanQuestion);
  };
  window.ziboAsk = ziboAsk;

  const onKey = event => {
    const zibo = event.target.closest?.('.hc-zibo-wrap');
    if (zibo && !event.target.closest('.hc-zibo-ask') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleAsk();
      return;
    }
    if (event.key === 'Escape' && askOpen && event.target.closest?.('.hc-zibo-wrap')) {
      event.preventDefault();
      event.stopPropagation();
      setAskOpen(false, true);
      return;
    }
  };
  modalHost.addEventListener('keydown', onKey);
  window.addEventListener('popstate', onPopState);

  if (savedPoint) {
    view = savedPoint.view || 'home'; area = savedPoint.area || ''; system = savedPoint.system || ''; range = savedPoint.range || 'week';
    if (view === 'area' && area === 'gym') view = 'gym';
    if (view === 'area' && area === 'nutrition') view = 'nutrition';
    calendar = { ...calendar, ...(savedPoint.calendar || {}) };
    if (Array.isArray(savedPoint.stack)) stack = savedPoint.stack.map(item => ({ ...item }));
    else if (view === 'system') stack.push({ view: 'area', area, system: '', range, scroll: 0 });
    else if (view === 'area' || view === 'gym' || view === 'nutrition' || view === 'cycle') stack.push({ view: 'home', area: '', system: '', range, scroll: 0 });
  }
  store.load().then(() => {
    if (!gone) {
      render();
      if (savedPoint) setScrollPosition(savedPoint.scrollY ?? savedPoint.scroll ?? 0);
    }
  });
  render();
  helloTimer = setTimeout(() => say(ZIBO_HELLO), 900);
  return {
    back,
    restore,
    cleanup() {
      gone = true;
      clearTimeout(testTimer);
      clearTimeout(ziboTimer);
      clearTimeout(helloTimer);
      clearTimeout(connectTimer);
      clearInterval(liveTimer);
      observer?.disconnect();
      stopCamera();
      gymMedia.forEach(media => { if (media.url) URL.revokeObjectURL(media.url); });
      if (window.ziboAsk === ziboAsk) window.ziboAsk = previousZiboAsk;
      store.removeEventListener('change', storeChange);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      modalHost.removeEventListener('keydown', onKey);
      if (window.history.state?.__healthCenter?.token === historyToken) {
        try { const state = { ...window.history.state }; delete state.__healthCenter; window.history.replaceState(state, ''); } catch { /* History state is optional in embedded shells. */ }
      }
      shell.replaceChildren();
      modalHost.remove();
      root.classList.remove('hc-root');
      if (root._hcStore === store) delete root._hcStore;
    },
  };
}
