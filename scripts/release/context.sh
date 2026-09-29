#!/usr/bin/env bash
set -euo pipefail
package_version="$(node --print "require('./package.json').version")"
if [[ "$RELEASE_TAG" != "v$package_version" ]]; then
  echo "::error::Release tag and package version differ."
  exit 1
fi
if [[ "$(gh release view "$RELEASE_TAG" --json isDraft --jq .isDraft)" != "false" ]]; then
  echo "::error::Publishing requires an existing non-draft GitHub release."
  exit 1
fi
echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
echo "tag=$RELEASE_TAG" >> "$GITHUB_OUTPUT"
