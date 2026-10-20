#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -eq 0 ]; then
  set -- chromium
fi
bunx --no-install playwright install --with-deps "$@"
