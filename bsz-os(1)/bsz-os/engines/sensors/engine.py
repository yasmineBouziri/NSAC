"""Sensor interface engine (SIMULATOR). Replace with the real acquisition engine, it only has to emit
core.emit('reading', {uid, metric, value, ts, kind, source}) for each measurement. uid 0 is shared habitat data.
Scenarios: POST /api/sensors/scenario {name, seconds} injects faults to exercise the health engine."""
import math, random, threading, time

MANIFEST = {"name": "sensors", "version": "0.1.0", "provides": ["reading emitter", "scenarios"], "stub": True}
SCENARIOS = ['nominal', 'poor_sleep', 'co2_leak', 'solar_flare', 'missed_exercise', 'illness']
TICK = 2.0


def register(core):
    scn = {'name': 'nominal', 'start': 0.0, 'until': 0.0}
    seeded, st = set(), {'t': 0, 'rad_total': 38.2, 'event': 0.0}

    def k():  # scenario intensity 0..1, ramps in over 60 s
        if scn['name'] == 'nominal' or time.time() > scn['until']:
            return 'nominal', 0.0
        return scn['name'], min(1.0, (time.time() - scn['start']) / 60)

    def emit(uid, m, v, ts=None, kind='sensor'):
        core.emit('reading', dict(uid=uid, metric=m, value=v, ts=ts or time.time(), kind=kind, source='sim'))

    def daily(uid, ts, name, i):
        r = random.gauss
        poor, ex = name == 'poor_sleep' and i, name == 'missed_exercise' and i
        emit(uid, 'sleep_h', r(7.3, .3) - (2.4 * i if poor else 0), ts)
        emit(uid, 'sleep_eff', r(90, 2) - (14 * i if poor else 0), ts)
        emit(uid, 'circ_shift_min', abs(r(10, 6)) + (80 * i if poor else 0), ts)
        emit(uid, 'light_lux_eve', abs(r(30, 10)), ts)
        emit(uid, 'ex_min', max(0, r(125, 10) - (105 * i if ex else 0)), ts)
        emit(uid, 'ared_wk', 4 - (4 * i if ex else 0), ts)
        emit(uid, 'grip_kg', r(40, .6) - (6 * i if ex else 0), ts)
        emit(uid, 'bone_idx', r(1.0, .004), ts)
        emit(uid, 'iop', r(16, 1), ts)
        emit(uid, 'disc_edema', 0, ts)
        emit(uid, 'sway_cm', r(18, 1), ts)
        emit(uid, 'pvt_ms', r(285, 6) * (1 + .3 * i if poor else 1), ts)
        emit(uid, 'pvt_lapses', max(0, round(r(.8, .6) + (4 * i if poor else 0))), ts)
        emit(uid, 'mass_kg', r(78, .3), ts)
        emit(uid, 'hydr_usg', r(1.012, .003), ts)
        emit(uid, 'kcal_ratio', r(1.0, .03), ts)
        emit(uid, 'voice_stress', abs(r(.3, .05)), ts)

    def seed(uid):
        now = time.time()
        for d in range(14, 0, -1):
            daily(uid, now - d * 86400, 'nominal', 0)
        seeded.add(uid)

    def crew(uid, name, i):
        t, r = st['t'], random.gauss
        ill = i if name == 'illness' else 0
        emit(uid, 'hr', 63 + 5 * math.sin(t / 40) + r(0, 1.2) + 14 * ill)
        emit(uid, 'hrv_rmssd', 52 + 6 * math.sin(t / 55) + r(0, 2) - 24 * ill)
        emit(uid, 'spo2', min(100, 97.8 + r(0, .3) - 2.5 * ill))
        emit(uid, 'resp', 14.5 + r(0, .5) + 5 * ill)
        emit(uid, 'temp_core', 36.7 + .15 * math.sin(t / 90) + r(0, .05) + 1.3 * ill)
        emit(uid, 'temp_skin', 33.6 + r(0, .1))
        emit(uid, 'bp_sys', 116 + r(0, 2)); emit(uid, 'bp_dia', 74 + r(0, 1.5)); emit(uid, 'qtc', 410 + r(0, 3))

    def ship(name, i):
        t, r = st['t'], random.gauss
        flare = i if name == 'solar_flare' else 0
        rate = 14 + 2 * math.sin(t / 80) + r(0, .6) + 70 * flare
        st['rad_total'] += rate / 1000 * TICK / 3600
        st['event'] = st['event'] + rate / 1000 * TICK / 3600 * 6 if flare else st['event'] * .98
        emit(0, 'rad_rate', max(1, rate)); emit(0, 'rad_total_msv', st['rad_total']); emit(0, 'rad_event_msv', st['event'])
        emit(0, 'solar_logflux', -6.7 + .2 * math.sin(t / 60) + 2.6 * flare + r(0, .03)); emit(0, 'kp', 2 + abs(math.sin(t / 300)) * 1.5 + 3 * flare)
        emit(0, 'co2_mmhg', 2.1 + .3 * math.sin(t / 70) + r(0, .05) + 3.2 * (i if name == 'co2_leak' else 0))
        emit(0, 'o2_pct', 20.9 + r(0, .03)); emit(0, 'cabin_kpa', 101.3 + r(0, .1)); emit(0, 'cabin_temp', 22.4 + r(0, .1))
        emit(0, 'hum', 46 + r(0, .6)); emit(0, 'noise_dba', 52 + r(0, .8)); emit(0, 'tvoc', abs(r(.2, .03)))

    def loop():
        while True:
            time.sleep(TICK)
            st['t'] += 1
            name, i = k()
            live = [u for u, ts in core.active.items() if time.time() - ts < 120]
            if not live:
                continue
            ship(name, i)
            for u in live:
                if u not in seeded:
                    seed(u)
                crew(u, name, i)
                if st['t'] % 30 == 0:
                    daily(u, time.time(), name, i)

    def scenario(req):
        n = str(req.body.get('name', ''))
        if n not in SCENARIOS:
            return 400, {'error': 'Unknown scenario', 'scenarios': SCENARIOS}
        scn.update(name=n, start=time.time(), until=time.time() + float(req.body.get('seconds', 300)))
        return {'ok': True, 'name': n}

    core.route('POST', '/api/sensors/scenario', scenario)
    core.route('GET', '/api/sensors/scenarios', lambda req: {'scenarios': SCENARIOS, 'active': k()[0]})
    threading.Thread(target=loop, daemon=True).start()
