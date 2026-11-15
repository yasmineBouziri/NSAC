# ASTRA Health · BSZ-OS (Blood, Sweat and Zero-G)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10--3.12](https://img.shields.io/badge/Python-3.10%20|%203.11%20|%203.12-brightgreen.svg)](https://www.python.org/)
[![Platform: Windows | Linux | macOS](https://img.shields.io/badge/Platform-Windows%20|%20Linux%20|%20macOS-lightgrey.svg)]()
[![Hardware: NVIDIA CUDA | CPU](https://img.shields.io/badge/Hardware-NVIDIA%20CUDA%20|%20CPU%20Fallback-76B900.svg)]()
[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-Challenge%20Project-0B3D91.svg)](https://www.spaceappschallenge.org/)

> **Autonomous, 100% offline-capable, bio-regenerative astronaut health monitoring and clinical decision-support operating system.**  
> Engineered specifically for long-duration exploration missions (Artemis Lunar Base, Deep Space Gateway, and Mars transit) where light-speed communication latency prevents real-time tele-medical ground support.

---

## 🛰️ Overview & Key Capabilities

BSZ-OS operates on a self-contained, air-gapped architecture. The core application runs directly on local hardware without requiring internet connectivity, third-party cloud APIs, or build toolchains.

- **◷ Precision Chronometry & Mission Time**:
  - **World Clock**: Multi-city solar time synchronization with daylight saving time logic, day/night terminators, and quick-access landing shortcuts.
  - **Mission Elapsed Time (MET)**: Spacecraft mission clock tracking launch T-0, with zero-point calibration and persistent state across restarts.
  - **Alarms, Timer & Stopwatch**: High-precision monotonic timers with lap delta highlighting, circular visual progress rings, and synthesized audio alerts.
  - **Mission Calendar**: Interactive schedule and task tracking.
- **✚ Physical Health Telemetry**: Real-time crew biometrics (Heart Rate, HRV, SpO2, Blood Pressure, Core Temperature, Radiation Dosimetry) with deterministic clinical triage evaluations.
- **☯ Mental Health & Readiness**: Psychomotor Vigilance Task (PVT reaction fatigue testing), guided Box Breathing HRV pacing, and confidential mood logs.
- **☢ Environmental Life Support**: Habitat telemetry monitoring (O2, CO2, atmospheric pressure, ambient temperature, cosmic radiation, and solar flare warning triggers).
- **✦ Zibo: Local AI Health Assistant**: Completely private, on-device quantized Large Language Model (GGUF) with semantic Retrieval-Augmented Generation (RAG) over the astronaut's personal telemetry.
- **☰ Mission Control Themes**: 8 spacecraft display profiles (Aurora, Nebula Horizon, Glass, Clay, Brutal, HUD, Paper, Retro) with high-legibility Space Mono typography.

---

## 🚀 Quick Start (Running Locally)

The core OS and all health, sensor, and chronometry applets run with **only Python 3.10+ and a standard web browser** (no Node.js, no compilation, zero external packages needed for core operation).

### Windows
Double-click `BSZ-OS.bat` in the repository root, or open Command Prompt / PowerShell:
```cmd
BSZ-OS.bat
```
*(You can also run `cd bsz-os && BSZ-OS.bat` directly).*

### Linux & macOS
Run the startup script:
```bash
chmod +x run.sh bsz-os/run.sh
./run.sh
```
*(Or from the app folder: `cd bsz-os && ./run.sh`)*

Once started, the application automatically launches in your browser at:  
👉 **`http://127.0.0.1:8787`**

---

## 🔑 Login & Demonstration Crew Accounts

BSZ-OS initializes its local database (`bsz.db`) automatically and pre-seeds a demonstration astronaut profile:

| Crew Call Sign | Access Key (Password) | Role |
| :--- | :--- | :--- |
| **`ayla`** | **`sol-3-key`** | Commander / Medical Officer |

*New crew accounts can also be created directly from the "Create account" tab on the login screen.*

---

## 🤖 Local AI Chatbot (Zibo) Setup

BSZ-OS includes **Zibo**, a private, localized medical AI decision-support assistant powered by quantized GGUF models.

### 1. Downloading the Model Files
Because model weights are large binary files (>2 GB), they are hosted as release assets rather than stored in git history.

📦 **Download the model files directly from the [GitHub Releases](../../releases) section of this repository:**

1. **Primary Medical LLM**:
   - File: `Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf` (~1.92 GB)
   - Fine-tuned 3B parameter model optimized for astronaut health, physiological telemetry interpretation, and clinical decision support.
2. **Semantic Embedding Model**:
   - File: `nomic-embed-text-v1.5.f16.gguf` (~261 MB)
   - High-dimensional embedding model used for local vector search across historical health readings.
   - *(Optional mirror available on [Hugging Face](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.f16.gguf)).*

### 2. Placing the Models
Place both downloaded `.gguf` files into the `bsz-os/models/` directory:
```text
bsz-os/
└── models/
    ├── Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf
    └── nomic-embed-text-v1.5.f16.gguf
```
*(BSZ-OS will also automatically detect them if placed in `bsz-os/` or in the project root).*

### 3. Verify Model Installation
Run the preflight model verification script:
```bash
python bsz-os/setup_models.py
```
You should see:
```text
=================================================================
BSZ-OS Local AI Model Preflight Check
=================================================================
[FOUND]   BSZ_LLM_MODEL:
          Path: .../bsz-os/models/Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf
          Size: 1925.8 MB (Primary Medical LLM (GGUF Q4_K_M))

[FOUND]   BSZ_EMBED_MODEL:
          Path: .../bsz-os/models/nomic-embed-text-v1.5.f16.gguf
          Size: 261.6 MB (Embedding model for semantic health context (GGUF f16))

[SUCCESS] All local AI models are ready!
=================================================================
```

### 4. GPU Acceleration vs. CPU Fallback
- **Recommended Python Version**: **Python 3.10 – 3.12** is strongly recommended. Pre-built wheels with CUDA support install automatically without requiring Microsoft Visual Studio C++ Build Tools or CMake.
- **NVIDIA GPU Acceleration**: When an NVIDIA GPU is detected (e.g. GeForce RTX / GTX or laptop GPUs), BSZ-OS automatically offloads all 29 model layers to VRAM (`BSZ_AI_GPU_LAYERS=-1`), achieving sub-second token latency and real-time streaming.
- **CPU Fallback**: On machines without an NVIDIA GPU, inference runs automatically on CPU.

---

## ⚙️ Environment Configuration (`.env`)

BSZ-OS is fully functional with default settings. To customize host ports, GPU layer allocation, or token context windows, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `BSZ_HOST` | `127.0.0.1` | Network interface (`0.0.0.0` exposes BSZ-OS to your local habitat network). |
| `BSZ_PORT` | `8787` | Web server port. |
| `BSZ_AI_GPU_LAYERS` | `-1` | GPU offload layers (`-1` = full GPU, `0` = force CPU only, `1-28` = hybrid). |
| `BSZ_AI_CONTEXT` | `8192` | Context window size in tokens (auto-sized to 4096 on CPU / low VRAM). |
| `BSZ_AI_MAX_TOKENS` | `384` | Maximum tokens generated per AI assistant response. |
| `BSZ_AI_BATCH` | `512` | Batch evaluation size (`512` on GPU, `256` on CPU). |
| `BSZ_AI_AUTO_INSTALL` | `1` | Automatically install `llama-cpp-python` in `.venv` if missing. |
| `BSZ_LLM_MODEL` | *(auto)* | Explicit custom path to primary LLM GGUF model. |
| `BSZ_EMBED_MODEL` | *(auto)* | Explicit custom path to embedding GGUF model. |

---

## 📁 Repository Structure

```text
├── .env.example              # Configuration template for environment variables
├── .gitignore                # Comprehensive ignore rules (keeps large weights & local DBs out of git)
├── BSZ-OS.bat                # Windows 1-click launcher (root wrapper)
├── requirements.txt          # Python requirements documentation
├── run.sh                    # Linux / macOS 1-click launcher (root wrapper)
├── setup_models.py           # Model verification & preflight script
└── bsz-os/                   # Core application directory
    ├── BSZ-OS.bat            # Windows application launcher
    ├── build_exe.bat         # Standalone Windows executable builder
    ├── bsz.py                # Core application server, router & engine loader
    ├── CONTRACT.md           # Micro-engine API specification
    ├── README.md             # Engine-level documentation
    ├── requirements.txt      # Dependency specification
    ├── run.sh                # Linux / macOS application launcher
    ├── runtime_bootstrap.py  # Environment manager (venv, CUDA DLLs, preflight)
    ├── setup_models.py       # Local model preflight check
    ├── docs/                 # Documentation & architectural specifications
    │   ├── ASTRA_HEALTH_Design_Document.pdf
    │   └── BSZ_MASTER_CONTEXT_HUB.md
    ├── engines/              # Modular micro-engines
    │   ├── accounts/         # Crew authentication & persistent state (SQLite)
    │   ├── ai/               # Local GGUF LLM and RAG health assistant (Zibo)
    │   ├── display/          # Display and theme engine
    │   ├── health/           # Clinical vitals telemetry & threshold evaluator
    │   └── sensors/          # Life support & environmental radiation simulator
    ├── models/               # Local AI model storage directory (.gitkeep)
    │   ├── Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf (downloaded)
    │   └── nomic-embed-text-v1.5.f16.gguf (downloaded)
    ├── tests/                # Automated unit tests
    │   └── test_health.py    # Health engine validation test suite
    └── web/                  # Vanilla ES6 browser client (no build step needed)
        ├── index.html        # Main application portal
        ├── css/os.css        # Responsive stylesheets, themes & typography
        ├── js/core/          # Applet router, state store, audio synthesiser
        └── js/widgets/       # Clock applet, health widgets, chatbot UI
```

---

## 🧪 Automated Testing

Run the automated test suite for the health analysis engine:
```bash
python -m unittest discover -s bsz-os/tests
```

---

## 📜 Open Source License

BSZ-OS is open-source software licensed under the **MIT License**.  
Contributions, issue reports, and mission-adaptation pull requests are welcome!
