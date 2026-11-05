#!/usr/bin/env bash
set -euo pipefail

# GitHub's Azure mirror can stall browser dependency downloads until the job times out.
# Prefer the runner's official Ubuntu archive entry while retaining its fallbacks.
if [ "${GITHUB_ACTIONS:-}" = true ] && [ -f /etc/apt/apt-mirrors.txt ]; then
  sudo sed -i '\|^https://archive\.ubuntu\.com/ubuntu/|s/priority:[0-9][0-9]*/priority:0/' /etc/apt/apt-mirrors.txt
fi

if [ "$#" -eq 0 ]; then
  set -- chromium
fi
bunx --no-install playwright install --with-deps "$@"
