#!/usr/bin/env bash
export BSZ_AI_GPU_LAYERS="${BSZ_AI_GPU_LAYERS:--1}"
cd "$(dirname "$0")" || exit 1

# Check for local virtual environment
if [ -f ".venv/bin/python" ]; then
    PYTHON_EXE=".venv/bin/python"
elif [ -f ".venv/Scripts/python.exe" ]; then
    PYTHON_EXE=".venv/Scripts/python.exe"
elif command -v python3.12 >/dev/null 2>&1; then
    PYTHON_EXE="python3.12"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_EXE="python3"
else
    PYTHON_EXE="python"
fi

exec "$PYTHON_EXE" runtime_bootstrap.py "$@"
