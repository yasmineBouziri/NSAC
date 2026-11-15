"""Helper utility to check and configure local AI models for BSZ-OS.

BSZ-OS core runs 100% offline with zero dependencies.
This script assists in detecting or configuring the local GGUF models
used by the AI chatbot (Zibo) engine.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS = {
    "BSZ_LLM_MODEL": {
        "filename": "Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf",
        "desc": "Primary Medical LLM (GGUF format)",
    },
    "BSZ_EMBED_MODEL": {
        "filename": "nomic-embed-text-v1.5.f16.gguf",
        "desc": "Embedding model for semantic health context (GGUF format)",
        "download_url": "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.f16.gguf"
    }
}


def check_models():
    print("=" * 60)
    print("BSZ-OS Local AI Model Status")
    print("=" * 60)
    all_found = True
    for env_var, info in MODELS.items():
        fname = info["filename"]
        desc = info["desc"]
        env_val = os.environ.get(env_var)
        candidates = [
            Path(env_val).resolve() if env_val else None,
            (ROOT / fname).resolve(),
            (ROOT / "bsz-os" / fname).resolve(),
            (Path.cwd() / fname).resolve(),
        ]
        found = next((p for p in candidates if p and p.is_file()), None)
        if found:
            size_mb = found.stat().st_size / (1024 * 1024)
            print(f"[FOUND] {env_var}:")
            print(f"        Path: {found}")
            print(f"        Size: {size_mb:.1f} MB ({desc})")
        else:
            all_found = False
            print(f"[MISSING] {env_var}:")
            print(f"          Expected: {fname}")
            print(f"          Description: {desc}")
            if "download_url" in info:
                print(f"          Download URL: {info['download_url']}")
        print()

    if all_found:
        print("All local AI models are ready! Launch BSZ-OS using BSZ-OS.bat or python bsz-os/bsz.py")
    else:
        print("Note: BSZ-OS core runs 100% offline without these models (vitals, sensors,")
        print("world clock, alarms, and health telemetry are fully operational).")
        print("To enable the local AI Chatbot (Zibo), place the GGUF files in this directory")
        print("or set the environment variables BSZ_LLM_MODEL and BSZ_EMBED_MODEL.")
    print("=" * 60)
    return 0 if all_found else 1


if __name__ == "__main__":
    sys.exit(check_models())
