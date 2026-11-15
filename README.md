# ASTRA Health · BSZ-OS (Blood, Sweat and Zero-G)

> **Offline-first, modular space crew health monitoring & decision-support operating environment.**  
> Designed for long-duration orbital and deep-space missions where communication delays prevent reliance on ground support or cloud infrastructure.

---

## 🚀 Quick Start (Running Locally)

BSZ-OS is designed to run **100% locally and offline**. The core platform requires **only Python 3.10+ and a modern web browser** (no build steps, no Node.js build tools, no mandatory pip installs for the core system).

### Windows
Double-click `BSZ-OS.bat` in this repository root, or open Command Prompt / PowerShell and run:
```cmd
BSZ-OS.bat
```
*(Alternatively, you can run `python bsz-os\bsz.py` directly).*

### Linux & macOS
Run the startup script from the repository root:
```bash
chmod +x run.sh
./run.sh
```
*(Alternatively: `python3 bsz-os/bsz.py`)*

Once started, BSZ-OS opens automatically in your browser at:
👉 **`http://127.0.0.1:8787`**

---

## 🔑 Login & Accounts

On first launch, BSZ-OS automatically initializes its local database (`bsz.db`) and seeds a demonstration crew account:

| Crew Member | Password | Role |
| :--- | :--- | :--- |
| **`ayla`** | **`sol-3-key`** | Commander / Medical Officer |

You can also click the **"Create account"** tab on the sign-in screen at any time to register custom crew accounts with their own saved preferences, home timezones, and health history.

---

## 🛰️ Included Applets & Systems

- **◷ Clock & Mission Time**:
  - **World Clock**: Multi-city world time with daylight saving time calculations, day/night indicators, timezone search, and custom reference timezones.
  - **Alarms**: Recurring and single alarms with audio alerts and snooze/dismiss controls.
  - **Stopwatch**: High-precision monotonic timer with lap tracking, fastest/slowest lap highlighting.
  - **Countdown Timer**: Custom duration timer with visual circular progress ring and audible alert.
  - **Mission Elapsed Time (MET)**: Persistent spacecraft mission clock tracking launch T-0, with pause, resume, and zero-point calibration.
  - **Calendar**: Interactive monthly and mission scheduling calendar.
- **✚ Physical Health**: Real-time crew vitals telemetry (Heart Rate, HRV, SpO2, Blood Pressure, Core Temperature, Radiation Load) with clinical threshold evaluations.
- **☯ Mental Health**: Psychomotor Vigilance Task (PVT reaction test for fatigue tracking), box breathing guide, and mood logging.
- **☢ Cabin & Space Sensors**: Simulated life-support telemetry (O2, CO2, cabin pressure, ambient temperature, cosmic radiation, and solar flare telemetry).
- **✦ AI Chatbot (Zibo)**: Offline localized conversational assistant with persistent conversation history, search, and integrated medical context.
- **◉ Entertainment & Drills**: Offline games (Snake, 2048) and orbital station maneuver drills.
- **☰ Themes & Personalization**: Multiple high-contrast, HUD, space, and paper visual themes (Aurora, Nebula Horizon, Clay, Glass, Brutal, HUD, Paper, Retro) with responsive Space Mono typography.

---

## 🤖 Optional: Local AI Chatbot (Zibo) Setup

The core OS and all health, sensor, clock, and simulation engines run with **zero external dependencies**.

To enable the local LLM assistant powered by GGUF models:

1. **Check model status**:
   ```bash
   python setup_models.py
   ```
2. **Models used**:
   - Primary LLM: `Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf`
   - Embedding Model: `nomic-embed-text-v1.5.f16.gguf`
3. Place both `.gguf` files in the repository root or specify their paths via environment variables:
   ```bash
   export BSZ_LLM_MODEL="/path/to/Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf"
   export BSZ_EMBED_MODEL="/path/to/nomic-embed-text-v1.5.f16.gguf"
   ```
4. If an NVIDIA GPU is detected, `runtime_bootstrap.py` automatically configures GPU offload for accelerated inference.

---

## 📁 Repository Structure

```
├── BSZ-OS.bat                # Windows 1-click launcher
├── run.sh                    # Linux / macOS 1-click launcher
├── setup_models.py           # Model verification & setup helper
├── requirements.txt          # Python dependencies (for optional AI engine)
├── .gitignore                # Comprehensive ignore rules (keeps large weights & local DBs out of Git)
├── ASTRA_HEALTH_Design_Document.pdf
└── bsz-os/
    ├── bsz.py                # Core Python server & engine loader
    ├── runtime_bootstrap.py  # Python runtime environment manager
    ├── engines/              # Modular micro-engines
    │   ├── accounts/         # Crew authentication & persistent state (SQLite)
    │   ├── ai/               # Local GGUF LLM and RAG health assistant
    │   ├── display/          # Display and layout engine
    │   ├── health/           # Clinical vitals analysis & medical thresholds
    │   └── sensors/          # Spacecraft telemetry & sensor simulator
    ├── tests/                # Automated health engine test suites
    └── web/                  # Vanilla ES6 client interface
        ├── css/os.css        # Complete OS stylesheets and themes
        ├── index.html        # Main application entry point
        ├── js/core/          # Applet router, state manager, audio synthesiser
        └── js/widgets/       # Clock applet, health widgets, chatbot UI
```

---

## 🧪 Testing

Run the automated test suite for the health analysis engine:
```bash
python -m unittest discover -s bsz-os/tests
```
