"""Helper utility to check and configure local AI models for BSZ-OS.

BSZ-OS core runs 100% offline with zero dependencies.
This script assists in detecting or configuring the local GGUF models
used by the AI chatbot (Zibo) engine.

Both models can be downloaded from the GitHub Releases section of this repository:
https://github.com/<your-org>/<your-repo>/releases
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS = {
    "BSZ_LLM_MODEL": {
        "filename": "Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf",
        "desc": "Primary Medical LLM (GGUF Q4_K_M)",
        "release_asset": "Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf",
    },
    "BSZ_EMBED_MODEL": {
        "filename": "nomic-embed-text-v1.5.f16.gguf",
        "desc": "Embedding model for semantic health context (GGUF f16)",
        "download_url": "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.f16.gguf",
        "release_asset": "nomic-embed-text-v1.5.f16.gguf",
    }
}


def check_models():
    print("=" * 65)
    print("BSZ-OS Local AI Model Preflight Check")
    print("=" * 65)
    all_found = True
    for env_var, info in MODELS.items():
        fname = info["filename"]
        desc = info["desc"]
        env_val = os.environ.get(env_var)
        candidates = [
            Path(env_val).resolve() if env_val else None,
            (ROOT / "models" / fname).resolve(),
            (ROOT / fname).resolve(),
            (ROOT / "bsz-os" / "models" / fname).resolve(),
            (ROOT / "bsz-os" / fname).resolve(),
            (ROOT.parent / "models" / fname).resolve(),
            (ROOT.parent / fname).resolve(),
            (Path.cwd() / "models" / fname).resolve(),
            (Path.cwd() / fname).resolve(),
        ]
        found = next((p for p in candidates if p and p.is_file()), None)
        if found:
            size_mb = found.stat().st_size / (1024 * 1024)
            print(f"[FOUND]   {env_var}:")
            print(f"          Path: {found}")
            print(f"          Size: {size_mb:.1f} MB ({desc})")
        else:
            all_found = False
            print(f"[MISSING] {env_var}:")
            print(f"          Filename:    {fname}")
            print(f"          Description: {desc}")
            print(f"          How to get:  Download from GitHub Releases and place in 'bsz-os/models/'")
            if "download_url" in info:
                print(f"          Mirror:      {info['download_url']}")
        print()

    if all_found:
        print("[SUCCESS] All local AI models are ready!")
        print("Launch BSZ-OS using BSZ-OS.bat (Windows) or ./run.sh (Linux/macOS).")
    else:
        print("=" * 65)
        print("Note: BSZ-OS core runs 100% offline without these models (vitals, sensors,")
        print("world clock, alarms, timer, MET, and health telemetry are fully operational).")
        print("To enable the local AI Chatbot (Zibo):")
        print("  1. Download the model files from the GitHub Releases page.")
        print("  2. Place them into the 'bsz-os/models/' folder (or project root).")
        print("  3. Run this script again to verify.")
    print("=" * 65)
    return 0 if all_found else 1


if __name__ == "__main__":
    sys.exit(check_models())
