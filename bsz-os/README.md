# BSZ-OS (Blood, Sweat and Zero-G) Application Core

This folder contains the complete, self-contained application runtime, micro-engines, client interface, and execution scripts for BSZ-OS.

---

## 🚀 Running the App

### Windows
From inside this directory, double-click or run:
```cmd
BSZ-OS.bat
```
*(Or run `python runtime_bootstrap.py`).*

### Linux & macOS
```bash
chmod +x run.sh
./run.sh
```
*(Or run `python3 runtime_bootstrap.py`).*

### Standalone Executable (Windows)
Run `build_exe.bat` once to produce `dist\BSZ-OS.exe`.

---

## 🤖 Local AI Assistant (Zibo) Setup

1. **Download the GGUF models from the repository GitHub Releases section:**
   - `Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf`
   - `nomic-embed-text-v1.5.f16.gguf`
2. **Place them into the `models/` directory:**
   ```text
   bsz-os/models/
   ```
3. **Verify with the preflight tool:**
   ```bash
   python setup_models.py
   ```

---

## 📂 Architecture

- **`bsz.py`**: Core HTTP server, micro-engine loader, session manager, and static file router.
- **`runtime_bootstrap.py`**: Manages the local `.venv`, loads CUDA 13.0 DLLs, checks GPU availability, and sets environment variables.
- **`engines/`**:
  - `accounts/`: User authentication (scrypt), sessions, and per-user state storage.
  - `ai/`: Private local GGUF medical assistant (Zibo) with SQLite vector retrieval and streaming responses.
  - `display/`: Theme, layout, and window state.
  - `health/`: Pure deterministic clinical analysis (`health_analyze.py`), verified thresholds (`health_constants.py`), and storage feeds (`engine.py`).
  - `sensors/`: Cabin life-support & environmental telemetry simulator with fault and scenario injection.
- **`web/`**: Vanilla ES6 application shell (no bundlers, no build step, vendored Motion + anime.js).
- **`docs/`**: Architecture and design documents, including `ASTRA_HEALTH_Design_Document.pdf` and `BSZ_MASTER_CONTEXT_HUB.md`.
- **`tests/`**: Unit test suites (`python -m unittest discover tests`).
- **`CONTRACT.md`**: Micro-engine and widget contract specification.
