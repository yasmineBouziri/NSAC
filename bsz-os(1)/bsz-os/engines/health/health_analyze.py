"""Pure analysis, no I/O. analyze(points, baseline, now) -> snapshot dict.
points(spec) -> [(ts, value)] oldest first. baseline(spec) -> float or None."""
import health_constants as K

SPECS = {m['id']: m for m in K.METRICS}
RANK = {'unknown': -1, 'ok': 0, 'watch': 1, 'alert': 2}


def _in(x, b):
    return (b[0] is None or x >= b[0]) and (b[1] is None or x <= b[1])


def rate(x, ok, warn):
    return 'ok' if _in(x, ok) else 'watch' if _in(x, warn) else 'alert'


def _rng(b):
    lo, hi = b
    return f'>= {lo}' if hi is None else f'<= {hi}' if lo is None else f'{lo} to {hi}'


def evaluate(spec, pts, base, now):
    if spec['ok'] is None or not pts or now - pts[-1][0] > spec['maxage']:
        return None
    if spec['agg'] == 'last':
        v = pts[-1][1]
    else:
        w = [p[1] for p in pts if now - p[0] <= spec['win']] or [pts[-1][1]]
        v = sum(w) / len(w)
    x = v
    if spec['mode'] == 'rel':
        if not base:
            return None
        x = 100 * (v - base) / base
    st = rate(x, spec['ok'], spec['warn'])
    why = f"{spec['label']} {x:+.1f}% vs baseline, expected {_rng(spec['ok'])}%" if spec['mode'] == 'rel' else \
          f"{spec['label']} {v:.2f} {spec['unit']}, expected {_rng(spec['ok'])}"
    return dict(metric=spec['id'], label=spec['label'], value=round(v, 2), x=round(x, 2), unit=spec['unit'], status=st,
                why=why, age=int(now - pts[-1][0]), src=spec['src'], verify=spec['verify'], kind=spec['kind'])


def immune(res):
    got, tot, parts = 0.0, 0.0, []
    for mid, good, bad, w in K.IMMUNE:
        tot += w
        r = res.get(mid)
        if not r:
            continue
        f = max(0.0, min(1.0, (r['x'] - good) / (bad - good)))
        got += w
        parts.append((w * f, r['label'], f))
    if got < 0.3 * tot:
        return dict(index=None, status='unknown', confidence=round(got / tot, 2), contrib=[], inferred=True)
    load = sum(p[0] for p in parts) / got
    idx = round(100 * (1 - load))
    st = 'ok' if idx >= K.IMMUNE_BANDS[0] else 'watch' if idx >= K.IMMUNE_BANDS[1] else 'alert'
    top = sorted(parts, reverse=True)[:4]
    return dict(index=idx, status=st, confidence=round(got / tot, 2), inferred=True,
                contrib=[dict(label=p[1], pct=round(100 * p[0] / got)) for p in top if p[0] > 0])


def analyze(points, baseline, now):
    res = {}
    for s in K.METRICS:
        r = evaluate(s, points(s), baseline(s), now)
        if r:
            res[s['id']] = r
    doms = []
    for did, (label, w) in K.DOMAINS.items():
        specs = [s for s in K.METRICS if s['domain'] == did]
        rs = [res[s['id']] for s in specs if s['id'] in res]
        st = max((r['status'] for r in rs), key=RANK.get) if rs else 'unknown'
        if st == 'ok' and len(rs) / len(specs) < K.MIN_CONFIDENCE:
            st = 'unknown'
        doms.append(dict(id=did, label=label, status=st, confidence=round(len(rs) / len(specs), 2), weight=w,
                         reasons=sorted(rs, key=lambda r: -RANK[r['status']])))
    by = {d['id']: d for d in doms}
    known = [d for d in doms if d['status'] != 'unknown']
    wsum = sum(d['weight'] for d in known)
    score = None
    if known:
        score = sum(K.POINTS[d['status']] * d['weight'] for d in known) / wsum
        if any(d['status'] == 'alert' for d in known):
            score = min(score, K.ALERT_CAP)
        score = round(score)
    parts = {}
    for name, ids in K.SCORE_PARTS.items():
        ks = [by[i] for i in ids if by[i]['status'] != 'unknown']
        parts[name] = round(sum(K.POINTS[d['status']] for d in ks) / len(ks)) if ks else '-'
    imm = immune(res)
    return dict(ts=now, domains=doms, score=score, parts=parts, immune=imm, recs=recs(res, imm), values=res)


def recs(res, imm):
    out = []
    for r in res.values():
        if r['status'] == 'ok':
            continue
        adv = SPECS[r['metric']]['advice']
        out.append(dict(p='high' if r['status'] == 'alert' else 'med', t=r['label'] + (' needs action' if r['status'] == 'alert' else ' is off target'),
                        d=r['why'] + '. ' + adv, _o=RANK[r['status']]))
    if imm['status'] in ('watch', 'alert'):
        out.append(dict(p='high' if imm['status'] == 'alert' else 'med', t='Inferred immune load is elevated',
                        d='Top contributors: ' + ', '.join(c['label'] for c in imm['contrib'][:3]) + '. Low confidence estimate.', _o=1))
    out.sort(key=lambda x: -x['_o'])
    for o in out:
        del o['_o']
    return out[:8] or [dict(p='low', t='All tracked metrics nominal', d='Keep the current routine and log your check-ins.')]
