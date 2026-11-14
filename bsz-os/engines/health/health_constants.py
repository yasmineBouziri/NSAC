"""All health thresholds live here. Edit values only, no logic.
Bounds are (low, high), None means open. A value inside ok is ok, inside warn is watch, outside is alert.
mode 'rel' compares percent deviation from the person's own baseline. scope 'ship' means one shared habitat sensor.
verify=True means the number is a working default not confirmed against the primary document. Check before real use."""

SOURCES = {
    'STD3001': 'NASA-STD-3001 Vol 1 Rev C, Vol 2 Rev D (OCHMO). CO2 3 mmHg 1-h average [V2 6004], career dose 600 mSv [V1 4030], SPE 250 mSv [V1 4031]',
    'TB004': 'NASA-STD-3001 Technical Brief, Carbon Dioxide (OCHMO-TB-004): symptoms from 3.5 mmHg, more above 4.5 mmHg',
    'SIMONSEN': 'Simonsen et al., NASA NTRS 20250006168: ISS 0.2 to 0.5 mSv/day, GCR free-space limit 1.3 mSv/day',
    'NAS21': 'National Academies 2021, Space Radiation and Astronaut Health (3% REID, about 600 mSv career)',
    'BARGER14': 'Barger et al. 2014, Lancet Neurology 13:904. NASA schedules 8.5 h, ISS crews averaged 6.09 h',
    'AASM': 'AASM and SRS consensus, adults need 7 h or more (Watson 2015)',
    'AHA17': 'ACC/AHA 2017 blood pressure guideline',
    'CLIN': 'Standard adult resting reference ranges (AHA, NIH)',
    'SANS': 'NASA HRP Evidence, Spaceflight Associated Neuro-ocular Syndrome (Frisen grade, IOP)',
    'HRPBONE': 'NASA HRP Evidence, Risk of Bone Fracture due to Spaceflight (about 1 to 1.5 %/month loss)',
    'ISSCM': 'NASA ISS exercise countermeasures, about 2 h/day with ARED resistive loading',
    'BASNER11': 'Basner and Dinges 2011 PVT-B, NASA 3 min PVT (Jones et al. 2022, Sleep 45)',
    'HIDH': 'NASA Human Integration Design Handbook SP-2010-3407',
    'TLX': 'Hart and Staveland, NASA Task Load Index',
    'CRUCIAN18': 'Crucian et al. 2018, Front Immunol 9:1437, immune dysregulation in spaceflight',
    'WORKING': 'Working default, no primary source confirmed',
}
SCALES = {'sensor': 'sensor', 'self': 'self_report'}
CAREER_LIMIT_MSV = 600.0
CAREER_PRIOR_MSV = 0.0          # dose from earlier flights, add per crew member
H, D = 3600, 86400


def _m(id, label, unit, domain, ok, warn, src, *, mode='abs', agg='mean', win=60, maxage=300, kind='sensor',
       scope='crew', bn=30, verify=False, advice=''):
    return dict(id=id, label=label, unit=unit, domain=domain, ok=ok, warn=warn, src=src, mode=mode, agg=agg, win=win,
                maxage=maxage, kind=kind, scope=scope, bn=bn, verify=verify, advice=advice)


METRICS = [m['id'] and m for m in [
    # continuous, wearable grade
    _m('hr', 'Heart rate', 'bpm', 'cardio', (50, 100), (40, 120), 'CLIN', advice='Rest and recheck. Persistent change needs a medical review.'),
    _m('hrv_rmssd', 'HRV (RMSSD)', '%', 'cardio', (-20, None), (-40, None), 'WORKING', mode='rel', verify=True, advice='HRV fell against your baseline. Check sleep, load and illness signs.'),
    _m('bp_sys', 'Systolic BP', 'mmHg', 'cardio', (None, 129), (None, 139), 'AHA17', win=H, maxage=D, advice='Repeat the cuff reading at rest. Review sodium, fluid and exercise.'),
    _m('bp_dia', 'Diastolic BP', 'mmHg', 'cardio', (None, 79), (None, 89), 'AHA17', win=H, maxage=D),
    _m('qtc', 'QTc (ECG)', 'ms', 'cardio', (None, 450), (None, 500), 'CLIN', win=H, maxage=D, advice='Prolonged QTc. Send the ECG to the flight surgeon.'),
    _m('resp', 'Respiration rate', '/min', 'resp', (12, 20), (8, 25), 'CLIN', advice='Check cabin CO2 and exertion. Report breathing difficulty.'),
    _m('spo2', 'SpO2', '%', 'resp', (95, None), (90, None), 'CLIN', advice='Low SpO2. Check cabin O2 and sensor fit, report if confirmed.'),
    _m('temp_core', 'Core temperature', 'C', 'thermo', (36.1, 37.5), (35.5, 38.3), 'CLIN', advice='Temperature out of range. Check for infection and cabin heat.'),
    _m('temp_skin', 'Skin temperature', 'C', 'thermo', (31, 35.5), (29, 36.5), 'WORKING', verify=True),
    # sleep and circadian
    _m('sleep_h', 'Sleep, 7 night mean', 'h', 'sleep', (7, None), (5.5, None), 'AASM', win=7 * D, maxage=3 * D, advice='Protect the sleep window. NASA schedules 8.5 h, ISS crews average about 6 h.'),
    _m('sleep_eff', 'Sleep efficiency', '%', 'sleep', (85, None), (75, None), 'AASM', win=3 * D, maxage=3 * D, verify=True),
    _m('circ_shift_min', 'Circadian shift', 'min', 'sleep', (None, 30), (None, 90), 'WORKING', win=3 * D, maxage=3 * D, verify=True, advice='Body clock is drifting. Use scheduled light and keep a fixed lights out.'),
    _m('light_lux_eve', 'Evening light', 'lux', 'sleep', (None, 50), (None, 200), 'WORKING', win=2 * H, maxage=D, verify=True, advice='Dim and warm the lights 2 h before sleep.'),
    # activity and countermeasures
    _m('ex_min', 'Exercise, 7 day mean', 'min/day', 'activity', (90, None), (45, None), 'ISSCM', win=7 * D, maxage=3 * D, verify=True, advice='Do the scheduled countermeasure session. Skipping accelerates bone and muscle loss.'),
    _m('ared_wk', 'Resistive sessions per week', 'n', 'activity', (3, None), (2, None), 'ISSCM', agg='last', maxage=3 * D, verify=True, advice='Schedule resistive loading to protect bone.'),
    # bone and muscle proxies
    _m('grip_kg', 'Grip strength', '%', 'bonemuscle', (-10, None), (-20, None), 'WORKING', mode='rel', agg='last', maxage=7 * D, bn=3, verify=True, advice='Strength is falling. Review resistive load and protein intake.'),
    _m('bone_idx', 'Bone ultrasound index', '%', 'bonemuscle', (-2, None), (-5, None), 'HRPBONE', mode='rel', agg='last', maxage=30 * D, bn=2, verify=True, advice='Bone proxy trending down. Raise resistive load and check vitamin D and calcium.'),
    # vision and fluid shift
    _m('iop', 'Intraocular pressure', 'mmHg', 'vision', (10, 21), (8, 25), 'SANS', agg='last', maxage=14 * D, advice='Raised pressure. Repeat tonometry and notify ground.'),
    _m('disc_edema', 'Optic disc edema (Frisen)', 'grade', 'vision', (None, 0), (None, 1), 'SANS', agg='last', maxage=30 * D, advice='Disc edema detected. Imaging review needed.'),
    # vestibular and balance
    _m('sway_cm', 'Postural sway', '%', 'vestibular', (None, 25), (None, 60), 'WORKING', mode='rel', agg='last', maxage=14 * D, bn=3, verify=True),
    # cognition
    _m('pvt_ms', 'Reaction time (PVT)', '%', 'cognitive', (None, 15), (None, 30), 'BASNER11', mode='rel', agg='last', maxage=7 * D, bn=3, verify=True, advice='Slower reactions. Treat as fatigue. Avoid critical tasks and rest.'),
    _m('pvt_lapses', 'PVT lapses', 'n', 'cognitive', (None, 2), (None, 4), 'BASNER11', agg='last', maxage=7 * D, verify=True),
    # body, hydration, nutrition
    _m('mass_kg', 'Body mass', '%', 'body', (-3, 3), (-5, 5), 'CLIN', mode='rel', agg='last', maxage=7 * D, bn=3, advice='Mass changing. Review intake and hydration.'),
    _m('hydr_usg', 'Urine specific gravity', '', 'body', (1.003, 1.020), (1.000, 1.030), 'CLIN', agg='last', maxage=3 * D, advice='Drink more fluid.'),
    _m('kcal_ratio', 'Energy intake vs need', 'ratio', 'body', (0.9, 1.15), (0.8, 1.3), 'WORKING', win=3 * D, maxage=3 * D, verify=True, advice='Energy intake is off target. Log meals and adjust.'),
    # habitat (shared sensors)
    _m('co2_mmhg', 'Cabin CO2', 'mmHg', 'environment', (None, 3.0), (None, 4.5), 'TB004', scope='ship', advice='Check scrubber flow and ventilation. Headaches begin near 3.5 mmHg.'),
    _m('o2_pct', 'Cabin O2', '%', 'environment', (19.5, 23.1), (18, 24.1), 'STD3001', scope='ship', verify=True),
    _m('cabin_kpa', 'Cabin pressure', 'kPa', 'environment', (97.9, 102.7), (95, 104), 'STD3001', scope='ship', verify=True),
    _m('cabin_temp', 'Cabin temperature', 'C', 'environment', (18.3, 26.7), (15, 30), 'HIDH', scope='ship', verify=True),
    _m('hum', 'Humidity', '%', 'environment', (25, 70), (20, 75), 'HIDH', scope='ship', verify=True),
    _m('noise_dba', 'Noise', 'dBA', 'environment', (None, 60), (None, 72), 'HIDH', scope='ship', verify=True),
    _m('tvoc', 'VOCs', 'mg/m3', 'environment', (None, 0.5), (None, 2), 'WORKING', scope='ship', verify=True),
    # radiation (shared dosimeter)
    _m('rad_rate', 'Dose rate', 'uSv/h', 'radiation', (None, 21), (None, 54), 'SIMONSEN', scope='ship', advice='Dose rate above the ISS range. Move to the best shielded area if it keeps rising.'),
    _m('rad_event_msv', 'Event dose', 'mSv', 'radiation', (None, 50), (None, 150), 'STD3001', scope='ship', advice='Solar particle event dose rising toward the 250 mSv event limit. Shelter now.'),
    _m('rad_career_pct', 'Career dose used', '%', 'radiation', (None, 50), (None, 80), 'STD3001', scope='ship', agg='last', maxage=D, advice='Career dose budget is being used up.'),
    # information only, no thresholds
    _m('rad_total_msv', 'Mission dose', 'mSv', 'info', None, None, 'SIMONSEN', scope='ship', agg='last', maxage=D),
    _m('solar_logflux', 'Solar X-ray flux (log10 W/m2)', '', 'info', None, None, 'WORKING', scope='ship', agg='last'),
    _m('kp', 'Kp index', '', 'info', None, None, 'WORKING', scope='ship', agg='last'),
    # behavioral and self report
    _m('mood', 'Mood (1 to 5)', '', 'behavioral', (3.5, None), (2.5, None), 'WORKING', kind='self', agg='last', maxage=3 * D, advice='Low mood. Talk to a crewmate or the behavioral health team.'),
    _m('kss', 'Sleepiness (KSS 1 to 9)', '', 'behavioral', (None, 5), (None, 7), 'WORKING', kind='self', agg='last', maxage=2 * D, advice='High sleepiness. Short rest, avoid risky tasks.'),
    _m('tlx', 'Workload (TLX 0 to 100)', '', 'behavioral', (None, 60), (None, 80), 'TLX', kind='self', agg='last', maxage=3 * D, verify=True, advice='Workload is high. Ask for task reallocation.'),
    _m('phq9', 'PHQ-9', '', 'behavioral', (None, 4), (None, 9), 'WORKING', kind='self', agg='last', maxage=14 * D, advice='Mood score above normal range. Schedule a private call with ground support.'),
    _m('gad7', 'GAD-7', '', 'behavioral', (None, 4), (None, 9), 'WORKING', kind='self', agg='last', maxage=14 * D, advice='Anxiety score above normal range. Schedule a private call with ground support.'),
    _m('social', 'Social contacts per day', 'n', 'behavioral', (2, None), (1, None), 'WORKING', kind='self', agg='last', maxage=3 * D, verify=True, advice='Increase crew or family contact.'),
    _m('voice_stress', 'Voice stress (experimental)', '', 'behavioral', (None, 0.5), (None, 0.7), 'WORKING', agg='last', maxage=3 * D, verify=True),
]]

DOMAINS = {  # id: (label, weight in readiness score)
    'cardio': ('Cardiovascular', .12), 'resp': ('Respiratory', .08), 'thermo': ('Thermoregulation', .05),
    'sleep': ('Sleep and circadian', .14), 'activity': ('Exercise compliance', .07), 'bonemuscle': ('Bone and muscle', .08),
    'vision': ('Vision and fluid shift', .05), 'vestibular': ('Balance', .03), 'cognitive': ('Cognition', .08),
    'body': ('Body, hydration, nutrition', .06), 'environment': ('Habitat air and climate', .08),
    'radiation': ('Radiation', .06), 'behavioral': ('Behavioral health', .10),
}
MIN_CONFIDENCE = 0.34             # an ok domain with fewer fresh metrics than this share reports unknown
POINTS = {'ok': 100, 'watch': 60, 'alert': 20}
ALERT_CAP = 69                      # any alert domain caps the readiness score
SCORE_PARTS = {'Sleep': ['sleep'], 'Cardio': ['cardio'], 'Bone': ['bonemuscle', 'activity'], 'Mood': ['behavioral']}

# Inferred immune index. (metric, good value, bad value, weight). No direct immune sensor exists, so this is a
# transparent stress load model built from proxies, see CRUCIAN18. Uses the same x as the status check.
IMMUNE = [('sleep_h', 7.5, 5.0, .22), ('hrv_rmssd', 0, -50, .15), ('circ_shift_min', 0, 120, .10), ('tlx', 40, 90, .10),
          ('temp_core', 36.6, 38.0, .10), ('rad_rate', 10, 54, .08), ('kcal_ratio', 1.0, 0.7, .08), ('ex_min', 120, 20, .07),
          ('mood', 4, 2, .05), ('phq9', 0, 15, .05)]
IMMUNE_BANDS = (70, 50)             # index >= 70 ok, >= 50 watch, else alert
