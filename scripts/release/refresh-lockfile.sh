#!/usr/bin/env bash
set -euo pipefail
# Run only on Release Please's own branch, checked out by the release workflow.
branch="${RELEASE_PR_BRANCH:?Release Please branch is required}"
if [[ "$branch" != release-please--* ]]; then
  echo "::error::Refusing to update a branch not owned by Release Please."
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "refs/remotes/origin/$branch")" ]]; then
  echo "::error::Checkout does not match the Release Please branch."
  exit 1
fi
bun install --lockfile-only --ignore-scripts
if git diff --quiet -- bun.lock; then
  exit 0
fi
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add bun.lock
git commit -m 'chore(release): synchronize workspace lockfile'
git push origin "HEAD:refs/heads/$branch"
