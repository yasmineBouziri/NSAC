# BSZ-OS (Blood, Sweat and Zero-G)

Offline, self-hosted crew health platform: display, accounts, health analysis and a sensor simulator.

## Run

- Dev: `python bsz.py` (opens an app window; `--no-window` to skip). Python 3.10+, no pip packages.
- Windows exe: run `build_exe.bat` once, then double click `dist\BSZ-OS.exe`. Data is stored in `data\` next to the exe.
- Env: `BSZ_PORT` (8787), `BSZ_HOST` (127.0.0.1, set 0.0.0.0 to serve the pod LAN).

## Layout
```
bsz.py                       core: loads engines, routes, sessions, static files
engines/<name>/engine.py     MANIFEST dict + register(core)
engines/accounts             users (scrypt), sessions, per-account state
engines/health               analysis engine: health_constants.py (all thresholds, sourced), health_analyze.py (pure logic), engine.py (store, feeds)
engines/sensors              SIMULATOR with scenario injection (replace with the real acquisition engine)
tests/                       python -m unittest discover tests
CONTRACT.md                  every interface, paste it with a single file when asking for a fix
web/                         shell, theme, applets (vanilla ES modules, vendored Motion + anime.js)
  js/core                    registry, api, auth, data, notify, pages.js (applet definitions)
  js/widgets                 reusable parts, one file per group, each calls defineWidget(). Applets embed them
  js/lib/gamelogic.js        pure logic for 2048 and Snake
```
A broken engine shows FAIL in the boot log and the Engines page, the rest keeps running.

## Plugin contract
- Widgets read data through `feed(name, simFn)`. If an engine registers `core.feed(name, fn)` the widget goes live and the SIM badge disappears. Feed shapes are listed in `engines/health/engine.py`.
- New applet: `defineApplet({id,title,icon,group,desc,render(view)})` in core/pages.js (shown on Home automatically).
- New part (widget): create a file, call `defineWidget({id,title,icon,group,size,desc,cfg,mount(body,ctx)})`, import it in `widgets/index.js`. `mount` may return a cleanup function. `ctx.cfg` is saved per widget instance, call `ctx.save()` after changing it.
- New page: `definePage({id,title,icon,render(view)})` in `core/pages.js`.
- Local model: `BZG.ai.setBackend(async messages => 'reply')`, or add `core.route("POST","/api/ai/chat",fn)` returning `{reply}`.
