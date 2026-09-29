#!/usr/bin/env bash
set -euo pipefail
if command -v actionlint >/dev/null 2>&1; then
  actionlint
else
  go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12
fi
shellcheck scripts/*.sh scripts/release/*.sh
