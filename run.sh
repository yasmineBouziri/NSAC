#!/usr/bin/env bash
cd "$(dirname "$0")/bsz-os" || exit 1
chmod +x run.sh 2>/dev/null
exec ./run.sh "$@"
