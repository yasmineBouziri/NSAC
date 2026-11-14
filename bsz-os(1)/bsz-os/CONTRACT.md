# BSZ-OS contract
Paste this file next to any single source file when asking for a fix. It lists every interface between parts.

## Core (bsz.py) passed to each engine's register(core)
- `core.route(method, path, fn, public=False)`: fn(req) returns obj or (status, obj) or (status, obj, [(header, value)]). req has uid, body (dict), query (dict), token.
- `core.feed(name, fn)`: GET /api/feed/<name>, fn(req) returns JSON. Needs a signed in user.
- `core.on(topic, fn)`, `core.emit(topic, payload)`: in-process bus. Topic `reading` carries measurements.
- `core.touch(uid)`: marks a user active so the sensor layer produces data for them.
- `core.sql(q, args)`, `core.rows(q, args)`: shared SQLite (data/bsz.db). `core.static`: display root.
- Engine file: `engines/<name>/engine.py` with `MANIFEST = {name, version, provides[], stub?}` and `register(core)`.

## Reading record (sensors, self report, derived)
`{uid, metric, value, ts, kind: 'sensor'|'self_report'|'derived', source}`. uid 0 means shared habitat sensor. Metric ids and thresholds are in `engines/health/health_constants.py`. Unknown metric ids are ignored.

## Health feeds (shapes the widgets read)
| feed | shape |
|---|---|
| health.vitals | {hr, spo2, temp, resp, hrv} |
| health.score | {score 0-100, parts:{Sleep,Cardio,Bone,Mood}} |
| health.recs | [{p:'high'\|'med'\|'low', t, d}] |
| health.sleep | {hours:[last 7 nights]} |
| health.domains | [{id, label, status:'ok'\|'watch'\|'alert'\|'unknown', confidence 0-1, reasons:[{metric,label,value,x,unit,status,why,age,src,verify,kind}]}] |
| health.immune | {index 0-100 or null, status, confidence, inferred:true, contrib:[{label,pct}]} |
| space.radiation | {usvh, mission_msv, band} |
| space.solar | {logflux, kp} |
| cabin.atmo | {o2, co2 (ppm), kpa, hum, temp} |
| earth.weather?city=X | {temp, hourly[12], hum, wind, cond} (not provided yet, widget simulates) |

Routes: GET /api/health/state, GET /api/health/history?metric=&window=sec, GET /api/health/constants, POST /api/health/report {metric, value} (self report metrics only), POST /api/health/rebase {metric}, POST /api/sensors/scenario {name, seconds}, GET /api/sensors/scenarios, POST /api/ai/chat {messages} returns {reply} (not provided yet).

## Analysis rules (health_analyze.py)
- Status per metric: inside `ok` bounds ok, inside `warn` bounds watch, else alert. `rel` metrics use percent change from the person's own baseline (first `bn` samples, resettable).
- Data older than `maxage` is dropped. A domain with no fresh data is unknown, never ok. An ok domain with under MIN_CONFIDENCE of its metrics reporting is unknown.
- Readiness score is a weighted domain average. Any alert domain caps it at 69.
- Immune index is inferred from proxies and always labelled inferred with a confidence.

## Display engine
- `defineWidget({id,title,icon,group,size:'s'|'m'|'l'|'x',desc,cfg?,mount(body, ctx)})`, mount returns an optional cleanup. ctx: `{cfg (saved per widget), save(), S (account state), sim(bool)}`. Call `ctx.sim(true)` to show the SIM badge.
- `feed(name, simFn, ms)(cb)` in core/data.js returns an unsubscribe. cb(value, isSim). A 404 from the feed falls back to simFn.
- `definePage({id,title,icon,render(view)})` in core/pages.js. Add widget files to widgets/index.js.
- Account state shape: `{widgets:[{uid,type,size,cfg}], settings:{accent,motion,h24,city,stars,density}, recent:[{id,t}]}`.
- `BZG.ai.setBackend(async messages => 'reply')` plugs the local model.

## Tests
`python -m unittest discover tests` covers thresholds, staleness, baselines, score cap, immune index, report validation.
