#!/usr/bin/env bash
set -euo pipefail
git fetch --no-tags origin "refs/tags/$RELEASE_TAG"
if [[ "$(git rev-parse 'FETCH_HEAD^{commit}')" != "$RELEASE_SHA" ]]; then
  echo "::error::The release tag changed after verification."
  exit 1
fi
if [[ -z "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" || -z "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" || -n "${NODE_AUTH_TOKEN:-}" ]]; then
  echo "::error::Publishing requires GitHub OIDC and no NODE_AUTH_TOKEN."
  exit 1
fi
