"""Run: python -m unittest discover tests. Uses a fake core, no server needed."""
import sys, time, unittest, sqlite3, threading, importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class FakeCore:
    def __init__(s):
        s.db, s.lock, s.feeds, s.routes, s.subs, s.active = sqlite3.connect(':memory:', check_same_thread=False), threading.Lock(), {}, {}, {}, {}
    def sql(s, q, a=()):
        with s.lock:
            c = s.db.execute(q, a); s.db.commit(); return c
    def rows(s, q, a=()):
        with s.lock: return s.db.execute(q, a).fetchall()
    def feed(s, n, f): s.feeds[n] = f
    def route(s, m, p, f, public=False): s.routes[(m, p)] = f
    def on(s, t, f): s.subs.setdefault(t, []).append(f)
    def emit(s, t, p): [f(p) for f in s.subs.get(t, [])]
    def touch(s, u): s.active[u] = time.time()


class Req:
    def __init__(s, uid=1, body=None, query=None): s.uid, s.body, s.query = uid, body or {}, query or {}


def load():
    spec = importlib.util.spec_from_file_location('he', ROOT / 'engines/health/engine.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    c = FakeCore(); m.register(c); return c


def put(c, m, v, ts=None, uid=1, kind='sensor'):
    c.emit('reading', dict(uid=uid, metric=m, value=v, ts=ts or time.time(), kind=kind))


class T(unittest.TestCase):
    def test_unknown_not_healthy(self):
        c = load()
        s = c.feeds['health.domains'](Req())
        self.assertTrue(all(d['status'] == 'unknown' for d in s))
        self.assertEqual(c.feeds['health.score'](Req())['score'], 0)

    def test_thresholds(self):
        c = load()
        put(c, 'spo2', 98); put(c, 'hr', 70); put(c, 'qtc', 410); put(c, 'resp', 15)
        for m, v in (('co2_mmhg', 2.0), ('o2_pct', 20.9), ('cabin_kpa', 101.3)): put(c, m, v, uid=0)
        d = {x['id']: x['status'] for x in c.feeds['health.domains'](Req())}
        self.assertEqual((d['resp'], d['cardio'], d['environment']), ('ok', 'ok', 'ok'))
        c = load(); put(c, 'spo2', 92); put(c, 'co2_mmhg', 5.0, uid=0)
        d = {x['id']: x['status'] for x in c.feeds['health.domains'](Req())}
        self.assertEqual((d['resp'], d['environment']), ('watch', 'alert'))
        recs = c.feeds['health.recs'](Req())
        self.assertEqual(recs[0]['p'], 'high')

    def test_stale_goes_unknown(self):
        c = load(); put(c, 'hr', 70, ts=time.time() - 4000)
        d = {x['id']: x['status'] for x in c.feeds['health.domains'](Req())}
        self.assertEqual(d['cardio'], 'unknown')

    def test_relative_baseline(self):
        c = load(); now = time.time()
        for i in range(3): put(c, 'pvt_ms', 280, ts=now - 1000 + i)
        put(c, 'pvt_ms', 380, ts=now)
        d = {x['id']: x['status'] for x in c.feeds['health.domains'](Req())}
        self.assertEqual(d['cognitive'], 'alert')

    def test_alert_caps_score(self):
        c = load(); put(c, 'spo2', 85); put(c, 'hr', 70)
        self.assertLessEqual(c.feeds['health.score'](Req())['score'], 69)

    def test_immune_low_confidence_and_inference(self):
        c = load(); put(c, 'sleep_h', 5.0)
        i = c.feeds['health.immune'](Req())
        self.assertTrue(i['inferred']); self.assertEqual(i['status'], 'unknown')
        for m, v in (('hrv_rmssd', 50), ('circ_shift_min', 120), ('tlx', 90), ('temp_core', 38)): put(c, m, v)
        i = c.feeds['health.immune'](Req())
        self.assertIn(i['status'], ('watch', 'alert'))

    def test_self_report_validation_and_career_derivation(self):
        c = load(); r = c.routes[('POST', '/api/health/report')]
        self.assertEqual(r(Req(body={'metric': 'hr', 'value': 70}))[0], 400)
        self.assertEqual(r(Req(body={'metric': 'mood', 'value': 'x'}))[0], 400)
        self.assertEqual(r(Req(body={'metric': 'mood', 'value': 2})), {'ok': True})
        put(c, 'rad_total_msv', 540, uid=0)
        d = {x['id']: x for x in c.feeds['health.domains'](Req())}
        self.assertEqual(d['radiation']['reasons'][0]['metric'], 'rad_career_pct')
        self.assertEqual(d['radiation']['status'], 'alert')

    def test_constants_are_sourced(self):
        sys.path.insert(0, str(ROOT / 'engines/health'))
        import health_constants as K
        for m in K.METRICS: self.assertIn(m['src'], K.SOURCES)
        self.assertAlmostEqual(sum(w for _, w in K.DOMAINS.values()), 1.0)
        self.assertAlmostEqual(sum(x[3] for x in K.IMMUNE), 1.0)

    def test_health_center_state_persistence(self):
        c = load()
        get_fn = c.routes[('GET', '/api/health-center/state')]
        put_fn = c.routes[('PUT', '/api/health-center/state')]
        # Initially empty state
        self.assertEqual(get_fn(Req(uid=1)), {'state': {}})
        # Persist a cognitive test evaluation (Reaction time PVT)
        test_payload = {
            'state': {
                'version': 1,
                'history': {
                    'pvt': [
                        {
                            'value': 'Reaction time · 242 ms (238, 242, 255)',
                            'score': 242,
                            'trials': [238, 242, 255],
                            'at': '2026-11-15T12:00:00.000Z'
                        }
                    ],
                    'acc': [
                        {
                            'value': 'Accuracy · 100% (10 of 10 correct)',
                            'score': 100,
                            'at': '2026-11-15T12:05:00.000Z'
                        }
                    ]
                },
                'reminders': {'rem-1': {'state': 'acknowledged'}},
            }
        }
        res = put_fn(Req(uid=1, body=test_payload))
        self.assertEqual(res, {'ok': True})
        # Retrieve and verify persistence
        saved = get_fn(Req(uid=1))
        self.assertIn('state', saved)
        pvt_history = saved['state']['history']['pvt']
        self.assertEqual(len(pvt_history), 1)
        self.assertEqual(pvt_history[0]['score'], 242)
        self.assertEqual(pvt_history[0]['trials'], [238, 242, 255])
        # Verify separate uid isolation
        self.assertEqual(get_fn(Req(uid=2)), {'state': {}})

    def test_health_center_state_validation(self):
        c = load()
        put_fn = c.routes[('PUT', '/api/health-center/state')]
        # Bad payload (not an object)
        status, err = put_fn(Req(uid=1, body={'state': 'invalid'}))
        self.assertEqual(status, 400)
        self.assertIn('error', err)
        # Empty body
        status, err = put_fn(Req(uid=1, body={}))
        self.assertEqual(status, 400)

    def test_health_center_route_aliases(self):
        c = load()
        self.assertIn(('GET', '/api/health-center/state'), c.routes)
        self.assertIn(('PUT', '/api/health-center/state'), c.routes)
        self.assertIn(('GET', '/api/health/center-state'), c.routes)
        self.assertIn(('PUT', '/api/health/center-state'), c.routes)
        self.assertIn(('PUT', '/api/health/state'), c.routes)


if __name__ == '__main__':
    unittest.main()
