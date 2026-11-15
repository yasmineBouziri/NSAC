#!/usr/bin/env bash
cd "$(dirname "$0")/bsz-os" || exit 1
python3 runtime_bootstrap.py "$@"
