#!/usr/bin/env bash
set -euo pipefail
package_version="$(node --print "require('./package.json').version")"
if [[ "$RELEASE_TAG" != "v$package_version" ]]; then
  echo "::error::Release tag and package version differ."
  exit 1
fi
node --input-type=module <<'NODE'
import { readFileSync, readdirSync } from 'node:fs';
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
for (const directory of readdirSync('packages')) {
  const manifest = JSON.parse(readFileSync(`packages/${directory}/package.json`, 'utf8'));
  if (manifest.version !== version) throw new Error(`Release version mismatch: ${manifest.name}`);
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(manifest[section] ?? {})) {
      if (/^@altertable\/data-app(?:-|$)/.test(name) && range !== version)
        throw new Error(`Release dependency mismatch: ${manifest.name} -> ${name}`);
    }
  }
}
NODE
if [[ "$(gh release view "$RELEASE_TAG" --json isDraft --jq .isDraft)" != "false" ]]; then
  echo "::error::Publishing requires an existing non-draft GitHub release."
  exit 1
fi
echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
echo "tag=$RELEASE_TAG" >> "$GITHUB_OUTPUT"
