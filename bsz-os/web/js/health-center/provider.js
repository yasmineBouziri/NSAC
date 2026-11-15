const metric = (key, name, unit, digits, base, spread, trend, note, extra = {}) => ({
  key, name, unit, digits, base, spread, trend, note, mode: extra.mode || 'measure',
  low: extra.low, high: extra.high, rangeLow: extra.rangeLow ?? spread * 1.5,
  rangeHigh: extra.rangeHigh ?? spread * 1.5, recurrence: extra.recurrence || 0,
  secondBase: extra.secondBase, secondSpread: extra.secondSpread,
  live: !!extra.live, options: extra.options || [], events: extra.events || [], eventCounts: extra.eventCounts || [], eventLabel: extra.eventLabel,
  eventOnly: !!extra.eventOnly, missing: extra.missing || [0, 1, 2],
  anchors: extra.anchors || '',
});

const groups = [
  {
    id: 'cardio', area: 'physical', name: 'Cardiovascular', icon: '♥',
    description: 'Heart rate, HRV, ECG, blood pressure, SpO₂, recovery.',
    detail: 'Your history since the start of the mission. Averages first. Open any test to see its full history.',
    metrics: [
      metric('rhr', 'Resting heart rate', 'bpm', 0, 58, 1.4, 1, 'Resting and active periods are kept separate. Logged events appear as annotations on the chart.', { recurrence: 6, rangeLow: 4, rangeHigh: 5, missing: [0, 0, 1] }),
      metric('hrv', 'Heart-rate variability (HRV)', 'ms', 0, 48, 4, -1, 'HRV is context-sensitive. Compare with sleep, workload and exercise before reading a change.', { rangeLow: 8, rangeHigh: 8, missing: [1, 3, 9] }),
      metric('bp', 'Blood pressure', 'mmHg', 0, 118, 2.5, 1, 'Systolic and diastolic are plotted together. Posture and time are saved with every reading.', { secondBase: 76, secondSpread: 2, rangeLow: 0, rangeHigh: 0 }),
      metric('spo2', 'SpO₂', '%', 1, 97.5, .4, -1, 'Time below a threshold is shown only once an approved threshold is validated.', { high: 100, rangeLow: 1.5, rangeHigh: .4, missing: [0, 0, 0] }),
      metric('ecg', 'ECG / rhythm events', '', 0, 0, 0, 0, 'Timestamped ECG strips and event summaries. Flags organize evidence for clinical review and are not a diagnosis.', { mode: 'measure', eventOnly: true, eventLabel: 'Rhythm flags for review', eventCounts: [1, 3, 14], events: [['Nov 12 · 22:14', 'Irregular-rhythm flag for review (12 s)', 'No symptoms linked'], ['Nov 03 · 06:40', 'Short pause flag for review (2 s)', 'Dizziness logged'], ['Oct 21 · 14:05', 'Rapid-rhythm flag for review (9 s)', 'During exercise']] }),
      metric('rec', 'Recovery heart rate', 'bpm drop', 0, 32, 2, -1, 'Measured after a standardized exercise protocol, one value per scheduled test.', { rangeLow: 3, rangeHigh: 3, missing: [0, 0, 0] }),
    ],
  },
  { id: 'musc', area: 'physical', name: 'Musculoskeletal', icon: '↔', description: 'Grip strength, exercise performance, endurance.', detail: 'Strength, performance and endurance. These results shape your gym plan and nutrition suggestions.', metrics: [
    metric('grip', 'Grip strength', 'kg', 1, 38, 1.6, -1, 'Best of three trials per hand. A drop here adds grip work to your gym plan.', { mode: 'test', recurrence: -2.5 }),
    metric('perf', 'Exercise performance', '% of baseline', 0, 92, 3, -1, 'Scored from your gym sessions against your own pre-flight baseline.', { mode: 'test' }),
    metric('end', 'Endurance', 'min to fatigue', 0, 14, 1.2, -1, 'Time to fatigue on a standard protocol. It sets the load of your endurance days.', { mode: 'test' }),
  ] },
  { id: 'resp', area: 'physical', name: 'Respiratory', icon: '⌁', description: 'Respiratory rate, SpO₂, spirometry (FVC / FEV1).', detail: 'Breathing rate, oxygen saturation and lung function from spirometry.', metrics: [
    metric('rr', 'Respiratory rate', 'breaths/min', 0, 15, .8, 1, 'Taken at rest. Cabin air quality is checked alongside any change.'),
    metric('spo2r', 'SpO₂', '%', 1, 97.5, .4, -1, 'Shared with the cardiovascular page. Values below your usual range are flagged for review.', { high: 100 }),
    metric('fvc', 'Forced vital capacity (FVC)', 'L', 2, 4.6, .08, -1, 'Spirometer blow, best of three. Lung volumes can shift slightly in microgravity.'),
    metric('fev1', 'FEV1', 'L', 2, 3.8, .07, -1, 'Air blown out in the first second of the same spirometry test.'),
  ] },
  { id: 'neuro', area: 'physical', name: 'Neurological & Sensorimotor', icon: '◉', description: 'Balance, gait, motion-sickness check-in.', detail: 'Balance, walking pattern and motion-sickness symptoms. Changes are expected after gravity transitions.', metrics: [
    metric('bal', 'Balance (eyes closed)', 's held', 0, 28, 3, -1, 'Single-leg stance with eyes closed, best of three. Expect a dip after gravity changes.', { mode: 'timer' }),
    metric('gait', 'Gait speed', 'm/s', 2, 1.35, .05, -1, 'Comfortable walking speed over a marked distance.', { mode: 'timer' }),
    metric('ms', 'Motion-sickness score', '0 to 10', 1, 1.5, .6, 1, 'Daily check-in. 0 is no symptoms, 10 is severe. Dizziness and nausea are tracked together.', { mode: 'scale', low: 0, high: 10, anchors: '0 is no symptoms, 10 is severe. Tap a number.' }),
  ] },
  { id: 'blood', area: 'physical', name: 'Blood & Hematological', icon: '◌', description: 'CBC, ferritin, reticulocytes.', detail: 'Monthly onboard analyzer panel. Space flight lowers red-cell mass, so the trend matters more than a single value.', metrics: [
    metric('hb', 'Hemoglobin', 'g/dL', 1, 14.8, .25, -1, 'From the onboard CBC. One value per scheduled draw.'),
    metric('fer', 'Ferritin', 'ng/mL', 0, 92, 8, -1, 'Iron stores. High values are as relevant as low ones in flight.'),
    metric('ret', 'Reticulocytes', '%', 2, 1.1, .12, -1, 'Young red cells. Shows how fast your body is replacing red blood cells.'),
  ] },
  { id: 'meta', area: 'physical', name: 'Metabolic', icon: 'ϟ', description: 'Glucose, lactate, lipid profile.', detail: 'Blood sugar, lactate after exercise and lipid profile from the onboard analyzer.', metrics: [
    metric('glu', 'Glucose (fasting)', 'mg/dL', 0, 92, 5, 1, 'Fasting finger-stick. Meal timing is saved with every reading.'),
    metric('lac', 'Lactate (post-exercise)', 'mmol/L', 1, 1.2, .25, 1, 'Measured after the standard exercise protocol. It links to your gym load.'),
    metric('ldl', 'LDL cholesterol', 'mg/dL', 0, 98, 6, 1, 'Lipid cartridge, monthly. Diet changes in flight can move it.'),
  ] },
  { id: 'kid', area: 'physical', name: 'Kidney & Urinary', icon: '◐', description: 'Hydration, urine strips, creatinine.', detail: 'Hydration status, urine strips and creatinine. Kidney stones are a known flight risk, so fluids matter.', metrics: [
    metric('hyd', 'Hydration status', '% of goal', 0, 74, 5, -1, 'Estimated from fluid intake and urine strips. It also feeds your nutrition suggestions.'),
    metric('sg', 'Urine specific gravity', '', 3, 1.015, .003, 1, 'Urine strip reading. A rising value means more concentrated urine.'),
    metric('cr', 'Creatinine', 'mg/dL', 2, .9, .05, 1, 'From the onboard analyzer. Reflects kidney filtering and muscle mass.'),
  ] },
  { id: 'vis', area: 'physical', name: 'Vision & Ocular', icon: '◎', description: 'Visual acuity, symptoms, eye pressure.', detail: 'Visual acuity, eye pressure and symptoms. Vision changes are tracked closely on long missions.', metrics: [
    metric('va', 'Visual acuity', 'decimal', 2, 1, .05, -1, 'Chart at a set distance. Log how many symbols you read correctly.', { mode: 'acuity', high: 1.5 }),
    metric('iop', 'Eye pressure', 'mmHg', 0, 15, 1.2, 1, 'Tonometer reading. Rises can accompany head-ward fluid shift.'),
    metric('vsym', 'Eye symptoms', '', 0, 0, 0, 0, 'Log anything unusual as soon as it happens. Entries are shared with the flight medical team.', { mode: 'log', eventOnly: true, eventLabel: 'Symptoms logged', eventCounts: [0, 1, 1], events: [['Nov 09 · 21:30', 'Dryness and mild strain after long screen work', 'Resolved with eye drops']], options: ['Blurred vision', 'Dryness', 'Flashes or halos', 'Eye strain', 'Headache'] }),
  ] },
  { id: 'skin', area: 'physical', name: 'Skin', icon: '◇', description: 'Daily skin and wound log.', detail: 'A daily skin and wound log. Add an entry when you notice a rash, irritation or a cut.', metrics: [
    metric('slog', 'Skin & wound log', '', 0, 0, 0, 0, 'Entries are timestamped. Photos and treatment steps can be attached in the full build.', { mode: 'log', eventOnly: true, eventCounts: [0, 0, 0], eventLabel: 'Entries logged', options: ['Rash', 'Dryness', 'Irritation', 'Cut or abrasion', 'Wound check, healing well'] }),
  ] },
  { id: 'mens', area: 'physical', name: 'Menstrual Cycle', icon: '◒', description: 'Calendar, symptoms, trends', detail: 'Calendar, symptoms and trends. This page is private to this profile and only shown when enabled.', status: 'Cycle day 14 · tracking on', metrics: [
    metric('cyc', 'Cycle length', 'days', 0, 28, 1, 0, 'Length of your last cycles. Flight can shift timing slightly.', { mode: 'cycle', options: ['Cycle started today', 'Cycle ended today'] }),
    metric('btt', 'Basal body temperature', '°C', 2, 36.5, .12, 1, 'Morning reading before getting up. A small rise marks ovulation.'),
    metric('msym', 'Symptoms', '', 0, 0, 0, 0, 'Symptoms are plotted against cycle day to show your own pattern.', { mode: 'log', eventOnly: true, eventLabel: 'Symptoms logged', eventCounts: [1, 2, 6], events: [['Nov 13 · 08:00', 'Cramps, mild', 'Day 1 of cycle']], options: ['Cramps', 'Headache', 'Fatigue', 'Mood change', 'No symptoms'] }),
  ] },
  { id: 'cog', area: 'mental', name: 'Cognitive Performance', icon: '⌘', description: 'Reaction time, accuracy and working memory.', detail: 'Short tests for reaction time, accuracy and working memory. Speed and accuracy are always read together.', metrics: [
    metric('pvt', 'Reaction time (PVT median)', 'ms', 0, 262, 10, 1, 'Psychomotor vigilance test. Three quick trials, median kept. Slower values often follow short sleep.', { mode: 'pvt' }),
    metric('acc', 'Accuracy', '%', 0, 96, 1.5, -1, 'Odd-one-out task: ten quick rounds. Read alongside speed.', { mode: 'accuracy', high: 100 }),
    metric('wm', 'Working memory (N-back)', 'score', 0, 78, 5, -1, 'Card-matching game: memorize a 4×4 grid, then find every pair.', { mode: 'memory' }),
  ] },
  { id: 'emo', area: 'mental', name: 'Emotional Well-being', icon: '♡', description: 'Mood, crew connection and worry check-ins.', detail: 'Short daily check-ins. No audio or video is used, and answers stay inside your health record.', metrics: [
    metric('mood', 'Mood (daily check-in)', '1 to 10', 1, 7.2, .6, -1, '1 is very low, 10 is very good. A drop of more than 1 point from your usual is flagged.', { mode: 'scale', low: 1, high: 10, anchors: '1 is very low, 10 is very good. Tap a number.' }),
    metric('conn', 'Connected to your crew', '1 to 5', 1, 4.1, .35, -1, 'How connected you felt to the crew today. Used for the crew cohesion indicator.', { mode: 'scale', low: 1, high: 5, anchors: '1 not at all, 5 very connected.' }),
    metric('anx', 'Worry or tension', '0 to 10', 1, 2.2, .7, 1, 'How tense or worried you felt today. Trends matter more than single days.', { mode: 'scale', low: 0, high: 10, anchors: '0 is calm, 10 is very tense. Tap a number.' }),
  ] },
  { id: 'str', area: 'mental', name: 'Stress', icon: '∿', description: 'Perceived stress, workload and recovery.', detail: 'How stressed you feel, how heavy the workload is and how well you are recovering.', metrics: [
    metric('stress', 'Perceived stress', '0 to 10', 1, 4.1, .9, 1, 'Quick self-rating. It feeds the fatigue indicator on the dashboard.', { mode: 'scale', low: 0, high: 10, anchors: '0 is none, 10 is extreme. Tap a number.' }),
    metric('work', 'Workload', '1 to 5', 1, 3.4, .5, 1, 'How heavy today’s schedule felt. Peaks of workload are followed by a recovery check.', { mode: 'scale', low: 1, high: 5, anchors: '1 very light, 5 very heavy.' }),
    metric('recov', 'Recovery readiness', '%', 0, 71, 6, -1, 'From your wearable: resting heart rate, HRV and sleep together.', { high: 100 }),
  ] },
  { id: 'slp', area: 'mental', name: 'Sleep & Circadian', icon: '☾', description: 'Sleep duration, efficiency and body-clock timing.', detail: 'Sleep length and quality, plus how well your body clock fits the station schedule.', metrics: [
    metric('dur', 'Sleep duration', 'h', 1, 7.3, .4, -1, 'From your wearable or bed sensor. Your goal is shown as the dashed line.'),
    metric('eff', 'Sleep efficiency', '%', 0, 90, 2.5, -1, 'Time asleep divided by time in bed.', { high: 100 }),
    metric('reg', 'Bedtime regularity', '± min', 0, 28, 10, 1, 'How much your bedtime moves from night to night.'),
    metric('circ', 'Circadian phase shift', 'h', 1, .4, .3, 1, 'How far your body clock sits from the station clock. Light timing helps pull it back.'),
    metric('kss', 'Morning sleepiness', '1 to 9', 1, 3.5, .8, 1, 'Karolinska scale check-in on waking. 1 is very alert, 9 is very sleepy.', { mode: 'scale', low: 1, high: 9, anchors: '1 very alert, 9 very sleepy.' }),
  ] },
  { id: 'rad', area: 'environment', name: 'Radiation', icon: '☢', description: 'Dose rate and cumulative dose, measured 24/7.', detail: 'Dosimeters record dose rate and your running total all day. Spikes during solar events are flagged.', metrics: [
    metric('rdr', 'Dose rate', 'mSv/day', 2, .32, .03, 1, 'Compared with the approved daily range.', { live: true }),
    metric('rcu', 'Cumulative dose', 'mSv', 1, 18.4, .2, 1, 'Running total since launch, against the mission limit.', { live: true }),
  ] },
  { id: 'air', area: 'environment', name: 'Cabin Air', icon: '≋', description: 'CO₂, carbon monoxide and trace gases.', detail: 'Gas sensors across the cabin check what you breathe, around the clock.', metrics: [
    metric('co2', 'Carbon dioxide', 'ppm', 0, 820, 40, 1, 'Rises where air circulation is poor. Headaches can follow high values.', { live: true }),
    metric('co', 'Carbon monoxide', 'ppm', 1, 1.2, .3, 1, 'Should stay near zero. A rise triggers an alert straight away.', { live: true }),
    metric('voc', 'Trace gases (VOC)', 'ppb', 0, 180, 25, 1, 'Off-gassing from materials and equipment.', { live: true }),
  ] },
  { id: 'temp', area: 'environment', name: 'Temperature & Humidity', icon: '♨', description: 'Comfort and condensation risk.', detail: 'Comfort readings from several cabin zones. Humidity also tells you about condensation and mold risk.', metrics: [
    metric('tmp', 'Temperature', '°C', 1, 22.4, .3, 1, 'Cabin zone average.', { live: true }),
    metric('hum', 'Relative humidity', '%', 0, 46, 2.5, 1, 'Comfort range is roughly 30 to 60%.', { live: true }),
  ] },
  { id: 'pres', area: 'environment', name: 'Pressure & Oxygen', icon: '◉', description: 'Cabin pressure and oxygen level.', detail: 'Pressure and oxygen sensors guard against leaks and low-oxygen air.', metrics: [
    metric('prs', 'Cabin pressure', 'kPa', 1, 101.2, .3, -1, 'A steady fall would suggest a leak.', { live: true }),
    metric('o2', 'Oxygen', '%', 1, 20.9, .1, -1, 'Normal air is about 20.9%.', { live: true }),
  ] },
  { id: 'noise', area: 'environment', name: 'Noise & Lighting', icon: '◖', description: 'Sound level and light level.', detail: 'Loud or constant noise and poorly timed light both hurt sleep and focus.', metrics: [
    metric('nse', 'Noise level', 'dB', 0, 47, 3, 1, 'Sleep quarters should stay quieter than the work areas.', { live: true }),
    metric('lux', 'Light level', 'lux', 0, 320, 40, -1, 'Bright light by day and dim light at night keep your body clock steady.', { live: true }),
  ] },
  { id: 'water', area: 'environment', name: 'Water Quality', icon: '◒', description: 'pH, conductivity and turbidity.', detail: 'Drinking-water sensors check what comes out of the dispenser.', metrics: [
    metric('ph', 'pH', '', 2, 7.1, .05, 1, 'Target range is about 6.5 to 8.5.', { live: true }),
    metric('cond', 'Conductivity', 'µS/cm', 0, 180, 10, 1, 'Rises when dissolved minerals or contaminants increase.', { live: true }),
    metric('turb', 'Turbidity', 'NTU', 2, .3, .05, 1, 'Cloudiness. Should stay very low.', { live: true }),
  ] },
  { id: 'micro', area: 'environment', name: 'Microbial / Particulate', icon: '✣', description: 'Airborne particles and microbial load.', detail: 'Particle counters and air samplers watch for dust and microbial growth.', metrics: [
    metric('pm', 'Fine particles (PM2.5)', 'µg/m³', 1, 6, 1.2, 1, 'Dust and fine particles in the air.', { live: true }),
    metric('mic', 'Microbial load', 'CFU/m³', 0, 95, 12, 1, 'Air sampler estimate. Rising values prompt a surface check.', { live: true }),
  ] },
  { id: 'accel', area: 'environment', name: 'Acceleration & Vibration', icon: '⌁', description: 'Residual acceleration and vibration.', detail: 'Motion sensors record the residual acceleration and vibration you live and sleep in.', metrics: [
    metric('acc2', 'Residual acceleration', 'µg', 0, 850, 120, 1, 'Small accelerations from thrusters, crew motion and equipment.', { live: true }),
    metric('vib', 'Vibration', 'mm/s RMS', 2, .12, .03, 1, 'Machinery vibration in your area.', { live: true }),
  ] },
];

const systemPresentation = {
  cardio: { cardName: 'Cardiovascular', status: '▲ 1 alert · 1 due', pageTitle: 'Cardiovascular health' },
  musc: { cardName: 'Musculoskeletal', status: 'Grip test due Day 3', pageTitle: 'Musculoskeletal health' },
  resp: { cardName: 'Respiratory', status: '✔ Stable', pageTitle: 'Respiratory health' },
  neuro: { cardName: 'Neurological & Sensorimotor', status: 'Balance test Day 5', pageTitle: 'Neurological & sensorimotor' },
  blood: { cardName: 'Blood', status: 'Monthly · Day 8', pageTitle: 'Blood & hematological' },
  meta: { cardName: 'Metabolic', status: 'Glucose · Day 10', pageTitle: 'Metabolic health' },
  kid: { cardName: 'Kidney & Urinary', status: 'Urine test · Day 9', pageTitle: 'Kidney & urinary health' },
  vis: { cardName: 'Vision', status: 'Acuity · Day 4', pageTitle: 'Vision & ocular health' },
  skin: { cardName: 'Skin', status: '✔ No entries', pageTitle: 'Skin health' },
  mens: { cardName: 'Menstrual Cycle', status: 'Cycle day 14 · tracking on', pageTitle: 'Menstrual cycle' },
  cog: { cardName: 'Cognitive', status: '1 overdue', pageTitle: 'Cognitive performance' },
  emo: { cardName: 'Emotional Well-being', status: '▲ Mood below usual', pageTitle: 'Emotional well-being' },
  str: { cardName: 'Stress', status: '▲ Above usual', pageTitle: 'Stress' },
  slp: { cardName: 'Sleep & Circadian', status: '✔ 92% of goal', pageTitle: 'Sleep & circadian rhythm' },
  rad: { cardName: 'Radiation', pageTitle: 'Radiation' },
  air: { cardName: 'Cabin Air', pageTitle: 'Cabin air' },
  temp: { cardName: 'Temperature & Humidity', pageTitle: 'Temperature & humidity' },
  pres: { cardName: 'Pressure & Oxygen', pageTitle: 'Pressure & oxygen' },
  noise: { cardName: 'Noise & Lighting', pageTitle: 'Noise & lighting' },
  water: { cardName: 'Water Quality', pageTitle: 'Water quality' },
  micro: { cardName: 'Microbial/Particulate', pageTitle: 'Microbial & particulate' },
  accel: { cardName: 'Acceleration & Vibration', pageTitle: 'Acceleration & vibration' },
};
groups.forEach(system => Object.assign(system, systemPresentation[system.id]));

export const areas = [
  { id: 'physical', title: 'Physical Health', icon: '⌁', description: 'Heart, lungs, muscles, blood, kidneys, vision, skin and more.' },
  { id: 'mental', title: 'Mental Health', icon: '♡', description: 'Focus, mood, stress and sleep, tracked gently over time.' },
  { id: 'environment', title: 'Space Environment & Exposure', icon: '⌘', description: 'What the station air, light, water and radiation are doing around you.' },
];
export const systems = groups;
export const demoContent = {
  appPages: {
    physical: { number: 1, name: 'Physical Health', subtitle: '' },
    mental: { number: 2, name: 'Mental Health', subtitle: 'Focus, mood, stress and sleep, tracked gently over time. Open an area to take a test or browse its history.' },
    environment: { number: 3, name: 'Space Environment & Exposure', subtitle: 'Sensors measure the station around you around the clock. Connect once and they keep surveying on their own.' },
  },
  appGroups: {
    physical: [
      ['Heart, lungs & movement', ['cardio', 'musc', 'resp', 'neuro']],
      ['Blood & lab tests · need onboard analyzers', ['blood', 'meta', 'kid']],
      ['Senses, skin & cycle', ['vis', 'skin', 'mens']],
    ],
    mental: [['Mind & rhythm', ['cog', 'emo', 'str', 'slp']]],
    environment: [
      ['Air, radiation & climate', ['rad', 'air', 'temp', 'pres']],
      ['Light, water & motion', ['noise', 'water', 'micro', 'accel']],
    ],
  },
  tiles: [
    ['Resting heart rate', '64', 'bpm', '▲ +6 vs usual', 'warn', 'rhr', 'Resting heart rate is 6 bpm above your usual range for 3 days. The records behind it are linked, and I won’t guess a cause.'],
    ['HRV', '—', '', '◆ Low signal quality', 'info', 'hrv', 'The wearable signal was poor overnight, so HRV was left out. Missing data is shown, never read as normal.'],
    ['Blood pressure', '118/76', 'mmHg', '✔ In usual range', 'ok', 'bp', 'Both numbers sit inside your personal range.'],
    ['SpO₂', '98', '%', '✔ In usual range', 'ok', 'spo2', 'Oxygen saturation is steady.'],
    ['Sleep', '7 h 20', '', '✔ 92% of goal', 'ok', 'dur', '7 h 20 min last night, 92% of your goal.'],
    ['Hydration', '64', '%', '▲ 1.3 of 2 L', 'warn', 'hyd', 'About 300 ml more would bring you back toward your usual range.'],
    ['Cognitive (PVT median)', '262', 'ms', '✔ Steady trend', 'ok', 'pvt', 'Reaction time is within your baseline. Accuracy and speed are tracked side by side.'],
    ['Radiation dose', '0.32', 'mSv/day', '✔ Within safe range', 'ok', 'rdr', 'Today’s dose rate is within the approved range.'],
  ],
  domains: [
    ['Physical', 'Heart rate above usual. Hydration low. Blood pressure, SpO₂ steady.', '▲ Monitor', '09:40', 'warn', 'physical'],
    ['Mental', 'Mood and stress check-ins slightly off baseline. Cognitive trend steady.', '▲ Monitor', '08:15', 'warn', 'mental'],
    ['Environment', 'Cabin air, temperature, pressure and radiation all within range.', '✔ Stable', '09:42', 'ok', 'environment'],
  ],
  analysis: [
    ['Immune health', '◆ Limited data', 'info', 'Concluded from temperature and symptom check-ins, sleep, stress, nutrition and radiation. No blood count is carried on this flight, and missing data is never read as normal.'],
    ['Behavioral health', '✔ Stable', 'ok', 'From the daily well-being survey, stress check-in, sleep and cognitive trends.'],
    ['Crew cohesion', '✔ Stable', 'ok', 'From the “connected to your crew” answers and participation patterns. No audio or video is used.'],
    ['Fatigue', '▲ Monitor', 'warn', 'Stress and workload were above usual for 3 days, and sleep was short.'],
    ['Resilience', '✔ Stable', 'ok', 'From recovery after workload peaks, sleep regularity and mood over the last weeks.'],
  ],
  reminders: [
    { id: 'urgent-bp', type: 'Urgent · medical review', title: 'Potentially serious change detected. Medical review required.', detail: 'Blood pressure · today 08:52', action: 'View evidence', metric: 'bp', ack: true, reason: 'Potentially serious change detected. Medical review required.' },
    { id: 'rhr-trend', type: 'Important trend', title: 'Resting heart rate has risen above its usual range', detail: 'Resting heart rate · 3 days · +6 bpm', action: 'Open history', metric: 'rhr', reason: 'Resting heart rate has risen above its usual range.' },
    { id: 'pvt-due', type: 'Overdue', title: 'Weekly cognitive battery overdue', detail: 'Cognitive tests · due yesterday · about 12 min', action: 'Start test', metric: 'pvt', evaluate: true, reason: 'Weekly cognitive battery is overdue.' },
    { id: 'ground-review', type: 'Ground communication', title: 'Send health assessment package to Earth for review', detail: 'Link available · you confirm before anything is sent', action: 'Review package', page: 'Health assessment package', reason: 'Review the health assessment package before sharing.' },
    { id: 'bp-due', type: 'Routine reminder', title: 'Blood pressure check due today', detail: 'Cardiovascular · today', action: 'Open', metric: 'bp', evaluate: true, reason: 'Blood pressure check is due today.' },
  ],
  deferReasons: ['Crew task', 'Equipment', 'Symptoms'],
  apps: [
    { id: 'physical', name: 'Physical Health', icon: '⌁', detail: areas[0].description, systems: groups.filter(x => x.area === 'physical'), status: '3 due', updated: '09:40' },
    { id: 'mental', name: 'Mental Health', icon: '♡', detail: areas[1].description, systems: groups.filter(x => x.area === 'mental'), status: '1 overdue', updated: '08:15' },
    { id: 'environment', name: 'Space Environment & Exposure', icon: '⌘', detail: areas[2].description, systems: groups.filter(x => x.area === 'environment'), status: 'All in range', updated: '09:42' },
    { id: 'gym', name: 'Gym', icon: '↔', detail: 'Your seven-day plan with guided workout and warm-up and stretching.', status: 'Today: Day 3', updated: 'yesterday' },
    { id: 'nutrition', name: 'Nutrition', icon: '◒', detail: 'Log meals and fluids, and spot shortfalls before they matter.', status: 'Water low', updated: '09:10' },
  ],
  exercises: [
    ['Monday', 'Lower-body strength', 'str', ['Squats · 4 × 8', 'Romanian deadlift · 3 × 8', 'Heel raises · 3 × 15', 'Plank · 3 × 45 s']],
    ['Tuesday', 'Aerobic intervals', 'end', ['Treadmill · 5 × 3 min hard, 2 min easy', 'Cool-down walk · 5 min', 'Breathing drill · 3 min']],
    ['Wednesday', 'Upper body + grip', 'str', ['Rows · 4 × 10', 'Overhead press · 3 × 8', 'Grip squeeze or dead hang · 3 × 30 s', 'Push-ups · 3 × 12']],
    ['Thursday', 'Active recovery', 'rec', ['Easy cycling · 25 min', 'Joint mobility flow · 10 min', 'Self-massage and release · 5 min']],
    ['Friday', 'Full-body circuit', 'str', ['Squat to press · 3 × 10', 'Lunges · 3 × 10 each leg', 'Bent-over row · 3 × 10', 'Core circuit · 8 min']],
    ['Saturday', 'Long endurance', 'end', ['Cycle ergometer · 40 min steady', 'Stretching · 8 min']],
    ['Sunday', 'Rest & stretching', 'rec', ['Full-body stretching · 20 min', 'Easy walk or light mobility · 10 min', 'Wind-down routine before sleep']],
  ],
};
export const getSystem = id => groups.find(system => system.id === id);
export const getMetric = key => groups.flatMap(system => system.metrics).find(item => item.key === key);
export const options = {
  gym: ['7-day workout plan', 'Joint Mobility & Stretching'],
  nutrition: ['Nutrition & Hydration', 'Digestive Health'],
};

function hash(seed) {
  let value = 7;
  for (let i = 0; i < seed.length; i++) value = Math.imul(value ^ seed.charCodeAt(i), 16777619);
  return value;
}

function random(seed) {
  let state = seed;
  return () => {
    state = state + 1831565813 | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export const seededGenerator = Object.freeze({ hash, random });

export function getMetricHistory(parameter) {
  if (parameter.eventOnly || parameter.mode === 'events') return [];
  const rng = random(hash(parameter.key));
  const baselines = [parameter.base, parameter.secondBase].filter(value => value != null);
  const columns = baselines.map((baseline, seriesIndex) => {
    const spread = seriesIndex ? parameter.secondSpread : parameter.spread;
    const values = [];
    for (let index = 0; index < 365; index++) {
      let value = baseline + spread * (rng() + rng() + rng() - 1.5) * 1.6 + Math.sin(index / 40) * spread * .6;
      if (index >= 362 && parameter.recurrence) value += parameter.recurrence;
      if (parameter.high != null) value = Math.min(parameter.high, value);
      if (parameter.low != null) value = Math.max(parameter.low, value);
      const low = value - parameter.rangeLow * (.7 + .6 * rng());
      const high = value + parameter.rangeHigh * (.7 + .6 * rng());
      values.push({ value, low, high });
    }
    return values;
  });
  return Array.from({ length: 365 }, (_, index) => columns.map(column => column[index]));
}

export function generateMeasurement(parameter) {
  const baselines = [parameter.base];
  if (parameter.secondBase != null) baselines.push(parameter.secondBase);
  return baselines.map(baseline => {
    let value = baseline + (Math.random() - .5) * 1.4 * parameter.spread;
    if (parameter.high != null) value = Math.min(parameter.high, value);
    if (parameter.low != null) value = Math.max(parameter.low, value);
    return value;
  });
}

const RANGE_SIZE = { week: 7, month: 30, year: 360 };
const MISSING_INDEX = { week: 0, month: 1, year: 2 };

export function sampleMetricHistory(parameter, range = 'week') {
  const history = getMetricHistory(parameter);
  if (!history.length) return { series: [], missing: 0, range };
  const sampleDays = RANGE_SIZE[range] || RANGE_SIZE.week;
  const selected = range === 'week' ? history.slice(358, 365)
    : range === 'month' ? history.slice(335, 365)
      : null;
  const source = range === 'year'
    ? Array.from({ length: 12 }, (_, month) => history.slice(5 + month * 30, 35 + month * 30))
    : selected.map(day => [day]);
  const series = Array.from({ length: history[history.length - 1].length }, (_, seriesIndex) =>
    source.map(bucket => {
      const points = bucket.map(day => day[seriesIndex]).filter(Boolean);
      return {
        value: points.reduce((sum, point) => sum + point.value, 0) / points.length,
        low: Math.min(...points.map(point => point.low)),
        high: Math.max(...points.map(point => point.high)),
      };
    }));
  return {
    series,
    missing: parameter.missing?.[MISSING_INDEX[range]] || 0,
    range,
    periodDays: sampleDays,
  };
}

export function nextLiveReadings() {
  const readings = {};
  for (const parameter of groups.flatMap(system => system.metrics).filter(item => item.live)) {
    const perturbation = (Math.random() - .5) * 1.4 * parameter.spread;
    let value = parameter.base + perturbation;
    if (parameter.high != null) value = Math.min(parameter.high, value);
    if (parameter.low != null) value = Math.max(parameter.low, value);
    readings[parameter.key] = value;
  }
  return readings;
}

export const nutrientTargets = Object.freeze({
  energy: 2800,
  protein: 110,
  water: 2000,
  calcium: 1200,
  vitaminD: 800,
  sodium: 2300,
});

export function cycleDemoHistory(today = new Date()) {
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const addDays = (key, amount) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    date.setDate(date.getDate() + amount);
    return dateKey(date);
  };
  const lengths = [26, 29, 28, 27, 30, 28, 29, 27, 28];
  const periodLengths = [5, 4, 5, 6, 5, 5, 4, 5, 5, 5, 5];
  let start = addDays(dateKey(today), -13);
  const starts = [start];
  lengths.forEach(length => {
    start = addDays(start, -length);
    starts.unshift(start);
  });
  return starts.map((cycleStart, index) => {
    const lastDay = addDays(cycleStart, periodLengths[index] - 1);
    return { start: cycleStart, end: lastDay, lastDay, demo: true };
  });
}

export const mealPresets = [
  { label: 'Oatmeal and whey shake', energy: 520, protein: 38, water: 350, calcium: 300, vitaminD: 200, sodium: 240 },
  { label: 'Rehydrated chicken and rice', energy: 640, protein: 42, water: 200, calcium: 90, vitaminD: 0, sodium: 620 },
  { label: 'Yogurt and fortified cereal', energy: 410, protein: 22, water: 150, calcium: 420, vitaminD: 100, sodium: 260 },
  { label: 'Salmon pouch and crackers', energy: 480, protein: 32, water: 100, calcium: 60, vitaminD: 420, sodium: 540 },
  { label: 'Tortilla, cheese and beans', energy: 560, protein: 26, water: 100, calcium: 380, vitaminD: 60, sodium: 780 },
  { label: 'Protein bar and nuts', energy: 360, protein: 24, water: 0, calcium: 160, vitaminD: 0, sodium: 180 },
  { label: 'Calcium and vitamin D supplement', energy: 0, protein: 0, water: 0, calcium: 500, vitaminD: 600, sodium: 0 },
];

export function snapshot() {
  return {
    generatedAt: new Date().toISOString(),
    disclaimer: 'Demonstration data only; not a medical device or diagnosis.',
    systems: groups.map(system => ({
      id: system.id,
      name: system.name,
      area: system.area,
      metrics: system.metrics.map(parameter => {
        const history = getMetricHistory(parameter);
        const sample = history[history.length - 1] || [];
        return {
          key: parameter.key, name: parameter.name, unit: parameter.unit,
          value: sample.length ? Number(sample[0].value.toFixed(parameter.digits)) : null,
          recentEvents: parameter.events,
        };
      }),
    })),
  };
}
