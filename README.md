# BSZ-OS

BSZ-OS is an offline-first health operating system prototype for astronaut
health and habitat telemetry. It provides local accounts, health analysis,
sensor simulation, a browser interface, and an on-device AI assistant.

The core application runs without a cloud service. The AI assistant uses local
GGUF models and is not a substitute for medical advice or a certified medical
device.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10--3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.10 to 3.12">
  <img src="https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111111" alt="Vanilla JavaScript">
  <img src="https://img.shields.io/badge/SQLite-local--first-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-2ea44f?style=for-the-badge" alt="MIT License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/LLM-Llama%203.2-7F52FF?style=flat-square" alt="Llama 3.2">
  <img src="https://img.shields.io/badge/Embeddings-nomic--embed--text-FF6F00?style=flat-square" alt="nomic-embed-text">
  <img src="https://img.shields.io/badge/Runtime-llama.cpp-111111?style=flat-square" alt="llama.cpp">
  <img src="https://img.shields.io/badge/Acceleration-CUDA%20%7C%20CPU-76B900?style=flat-square&logo=nvidia&logoColor=white" alt="CUDA or CPU acceleration">
</p>

## Technology stack

| **🧠 Local intelligence** | **🛰️ Mission platform** |
|:---|:---|
| **Llama 3.2** — on-device generation | **Python standard library** — lightweight local server |
| **nomic-embed-text** — semantic retrieval | **SQLite** — local accounts, state, and telemetry |
| **GGUF + llama.cpp** — efficient model runtime | **Vanilla HTML, CSS, and JavaScript** — zero-build web UI |
| **CUDA or CPU fallback** — flexible hardware support | **Windows, Linux, and macOS** — portable launchers |

<p align="center"><sub>✦ Private by default · Offline-capable · No cloud API required ✦</sub></p>

## Run

Requirements: Python 3.10+ and a modern web browser.

### Linux and macOS

```bash
cd bsz-os
./run.sh
```

### Windows

Run `bsz-os/BSZ-OS.bat`, or launch it from Command Prompt:

```bat
cd bsz-os
BSZ-OS.bat
```

Open <http://127.0.0.1:8787> when the server starts.

## Local AI models

The optional local assistant uses:

- **Llama 3.2 3B Instruct Medical Finetuned** for generation:
  `Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf`
- **nomic-embed-text-v1.5** for local embeddings and retrieval:
  `nomic-embed-text-v1.5.f16.gguf`

Place both files in `bsz-os/models/` or the repository root. Run the preflight
check with:

```bash
python bsz-os/setup_models.py
```

The model files are large and may be downloaded separately from the project
releases or their upstream model pages. Their licenses remain separate from
BSZ-OS:

- [Llama 3.2 license](https://www.llama.com/llama3_2/license/)
- [nomic-embed-text-v1.5 model page](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF)

**Made with Llama** and nomic-embed-text for local generation and embeddings.

## Test

```bash
python -m unittest discover -s bsz-os/tests
```

## License

The BSZ-OS source code is licensed under the [MIT License](LICENSE).

Third-party dependencies, vendored browser libraries, and model weights are
covered by their own licenses. See their respective project and model pages
before redistributing them.
