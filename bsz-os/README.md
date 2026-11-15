# BSZ-OS (Blood, Sweat and Zero-G)

Offline, self-hosted crew health platform: display, accounts, health analysis and a sensor simulator.

## Run

- Linux: from the repository's `bsz-os` directory, run `python3 runtime_bootstrap.py`
  (use `--no-window` for server-only mode). If you accidentally run `python3 bsz.py`,
  it automatically switches into the local `.venv`.
- Windows: double-click `BSZ-OS.bat`, or open Command Prompt in `bsz-os` and run
  `python runtime_bootstrap.py`. For a standalone build, run `build_exe.bat` once
  and then launch `dist\BSZ-OS.exe`.
  The first launch creates `bsz-os/.venv`, checks the local AI runtime, installs
  missing packages such as `llama-cpp-python`, and detects both GGUF files.
  Package installation requires network access once; later launches are local.
  Set `BSZ_AI_AUTO_INSTALL=0` to disable automatic installation.
- Windows with an NVIDIA GPU and a compatible driver uses the CUDA-enabled
  llama.cpp wheel automatically. If GPU offload cannot be initialized, AI
  reports the error instead of silently switching to CPU; explicitly set
  `BSZ_AI_GPU_LAYERS=0` to allow CPU inference.
- Data is stored in `data\` next to the source/runtime or executable, so conversation
  history persists across restarts. Do not delete the `data` directory.
- Env: `BSZ_PORT` (8787), `BSZ_HOST` (127.0.0.1, set 0.0.0.0 to serve the pod LAN).

## Layout
```
bsz.py                       core: loads engines, routes, sessions, static files
engines/<name>/engine.py     MANIFEST dict + register(core)
engines/accounts             users (scrypt), sessions, per-account state
engines/health               analysis engine: health_constants.py (all thresholds, sourced), health_analyze.py (pure logic), engine.py (store, feeds)
engines/sensors              SIMULATOR with scenario injection (replace with the real acquisition engine)
engines/ai                  local GGUF health assistant with SQLite retrieval and conversations
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
- Local model: the `ai` engine uses `llama-cpp-python` with
  `Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf` and
  `nomic-embed-text-v1.5.f16.gguf` when they are next to the repository. Set
  `BSZ_LLM_MODEL` and `BSZ_EMBED_MODEL` to override paths. `BSZ_AI_GPU_LAYERS`,
  `BSZ_AI_CONTEXT`, `BSZ_AI_MAX_TOKENS`, and `BSZ_AI_BATCH` tune conservative
  local inference. If the optional runtime or either model is unavailable, the
  rest of BSZ-OS continues running and the AI endpoint reports the failure.
  On Linux, an NVIDIA GPU is used automatically when the CUDA toolkit compiler
  (`nvcc`) is available. The NVIDIA driver and `nvidia-smi` alone are not enough
  to compile GPU support. If no CUDA or Vulkan build toolchain is installed,
  startup keeps the working CPU build and reports the missing toolchain instead
  of retrying a failing rebuild.
- Runtime preflight: `python runtime_bootstrap.py --check` validates the local
  environment without starting the UI. The Windows executable built with
  `build_exe.bat` bundles the AI runtime and does not need pip at startup.
