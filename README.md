# BSZ-OS

BSZ-OS is an offline-first health operating system prototype for astronaut
health and habitat telemetry. It provides local accounts, health analysis,
sensor simulation, a browser interface, and an optional on-device AI assistant.

The core application runs without a cloud service. The AI assistant uses local
GGUF models and is not a substitute for medical advice or a certified medical
device.

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
