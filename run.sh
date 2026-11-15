#!/usr/bin/env bash
export BSZ_AI_GPU_LAYERS="${BSZ_AI_GPU_LAYERS:--1}"
cd "$(dirname "$0")/bsz-os" || exit 1
python3 runtime_bootstrap.py "$@"
