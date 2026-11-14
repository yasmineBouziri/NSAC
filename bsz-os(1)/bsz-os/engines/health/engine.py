"""Health engine. Ingests readings (sensors, self report, derived), keeps rolling windows and baselines,
analyses every domain against health_constants and serves feeds. See CONTRACT.md for record and feed shapes."""
import sys, time, threading
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import health_constants as K  # noqa: E402
import health_analyze as A    # noqa: E402

MANIFEST = {"name": "health", "version": "0.1.0", "provides": ["health.vitals", "health.score", "health.recs", "health.sleep",
            "health.domains", "health.immune", "cabin.atmo", "space.radiation", "space.solar", "POST /api/health/report"]}
SPECS = A.SPECS


def register(core):
    core.sql("create table if not exists readings(uid int, metric text, value real, ts real, kind text, source text)")
    core.sql("create index if not exists rd on readings(uid, metric, ts)")
    core.sql("create table if not exists health_base(uid int, metric text, value real, primary key(uid, metric))")
    buf, base, acc, last_w, cache = {}, {}, {}, {}, {}
    lock = threading.Lock()
    for uid, m, v in core.rows("select uid, metric, value from health_base"):
        base[(uid, m)] = v

    def ingest(r):
        m, uid = r['metric'], r.get('uid', 0)
        spec = SPECS.get(m)
        if not spec:
            return
        ts = r.get('ts') or time.time()
        v = float(r['value'])
        key = (0 if spec['scope'] == 'ship' else uid, m)
        with lock:
            buf.setdefault(key, deque(maxlen=4000)).append((ts, v))
            if spec['mode'] == 'rel' and key not in base:
                a = acc.setdefault(key, [])
                a.append(v)
                if len(a) >= spec['bn']:
                    base[key] = sum(a) / len(a)
                    core.sql("insert or replace into health_base values(?,?,?)", (key[0], m, base[key]))
            if ts - last_w.get(key, 0) >= 30 or r.get('kind') == 'self_report':
                last_w[key] = ts
                core.sql("insert into readings values(?,?,?,?,?,?)", (key[0], m, v, ts, r.get('kind', 'sensor'), r.get('source', '')))
        cache.clear()
        if m == 'rad_total_msv':
            ingest(dict(uid=0, metric='rad_career_pct', value=100 * (K.CAREER_PRIOR_MSV + v) / K.CAREER_LIMIT_MSV, ts=ts))

    core.on('reading', ingest)

    def snap(uid):
        now = time.time()
        c = cache.get(uid)
        if c and now - c[0] < 1:
            return c[1]
        with lock:
            s = A.analyze(lambda sp: list(buf.get((0 if sp['scope'] == 'ship' else uid, sp['id']), ())),
                          lambda sp: base.get((0 if sp['scope'] == 'ship' else uid, sp['id'])), now)
            s['raw'] = {k[1]: (list(v)[-1][1] if v else None) for k, v in buf.items() if k[0] in (uid, 0)}
            s['hist'] = {m: [p[1] for p in list(buf.get((0 if SPECS[m]['scope'] == 'ship' else uid, m), ()))[-60:]] for m in ('sleep_h', 'rad_rate')}
            s['sleep7'] = [round(p[1], 1) for p in list(buf.get((uid, 'sleep_h'), ()))[-7:]]
        cache[uid] = (now, s)
        return s

    def val(s, m, d=None):
        r = s['values'].get(m)
        return r['value'] if r else s['raw'].get(m, d)

    def feed(name, fn):
        def f(req):
            core.touch(req.uid)
            return fn(snap(req.uid))
        core.feed(name, f)

    def vitals(s):
        out = {k: val(s, m) for k, m in (('hr', 'hr'), ('spo2', 'spo2'), ('temp', 'temp_core'), ('resp', 'resp'), ('hrv', 'hrv_rmssd'))}
        return {k: v for k, v in out.items() if v is not None}

    def radiation(s):
        r = s['values'].get('rad_rate')
        if not r:
            return {'usvh': 0, 'mission_msv': 0, 'band': 'unknown'}
        return {'usvh': r['value'], 'mission_msv': round(s['raw'].get('rad_total_msv', 0), 3), 'band': r['status']}

    feed('health.vitals', vitals)
    feed('health.score', lambda s: {'score': s['score'] if s['score'] is not None else 0, 'parts': s['parts']})
    feed('health.recs', lambda s: s['recs'])
    feed('health.sleep', lambda s: {'hours': s['sleep7'] or [0]})
    feed('health.domains', lambda s: s['domains'])
    feed('health.immune', lambda s: s['immune'])
    feed('space.radiation', radiation)
    feed('space.solar', lambda s: {'logflux': s['raw'].get('solar_logflux', -7), 'kp': s['raw'].get('kp', 0)})
    feed('cabin.atmo', lambda s: {'o2': val(s, 'o2_pct', 0), 'co2': round(val(s, 'co2_mmhg', 0) / (val(s, 'cabin_kpa', 101.3) * 7.50062) * 1e6),
                                  'kpa': val(s, 'cabin_kpa', 0), 'hum': val(s, 'hum', 0), 'temp': val(s, 'cabin_temp', 0)})

    def report(req):
        m, spec = str(req.body.get('metric', '')), None
        spec = SPECS.get(m)
        if not spec or spec['kind'] != 'self':
            return 400, {'error': 'Not a self report metric'}
        try:
            v = float(req.body.get('value'))
        except (TypeError, ValueError):
            return 400, {'error': 'Value must be a number'}
        core.emit('reading', dict(uid=req.uid, metric=m, value=v, kind='self_report', source='user'))
        cache.pop(req.uid, None)
        return {'ok': True}

    def history(req):
        m = req.query.get('metric', '')
        if m not in SPECS:
            return 400, {'error': 'Unknown metric'}
        w = min(float(req.query.get('window', 3600)), 30 * 86400)
        key = 0 if SPECS[m]['scope'] == 'ship' else req.uid
        return [{'ts': t, 'v': v} for t, v in core.rows("select ts, value from readings where uid=? and metric=? and ts>? order by ts", (key, m, time.time() - w))]

    def constants(req):
        return {'metrics': K.METRICS, 'domains': K.DOMAINS, 'sources': K.SOURCES}

    def rebase(req):
        m = str(req.body.get('metric', ''))
        key = (req.uid, m)
        with lock:
            base.pop(key, None)
            acc[key] = []
        core.sql("delete from health_base where uid=? and metric=?", key)
        return {'ok': True}

    core.route('GET', '/api/health/state', lambda req: (core.touch(req.uid), {k: v for k, v in snap(req.uid).items() if k not in ('raw', 'hist')})[1])
    core.route('POST', '/api/health/report', report)
    core.route('GET', '/api/health/history', history)
    core.route('GET', '/api/health/constants', constants)
    core.route('POST', '/api/health/rebase', rebase)
