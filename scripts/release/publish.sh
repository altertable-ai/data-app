#!/usr/bin/env bash
set -euo pipefail
package_name="$(node --print "require('./package.json').name")"
package_version="$(node --print "require('./package.json').version")"
registry_name="$(node --print "encodeURIComponent(require('./package.json').name)")"
status="$(curl --silent --show-error --output published.json --write-out '%{http_code}' "https://registry.npmjs.org/$registry_name/$package_version")"
if [[ "$status" == "200" ]]; then
  node -e 'if (JSON.parse(require("node:fs").readFileSync("published.json", "utf8")).version !== require("./package.json").version) process.exit(1)'
  echo "$package_name@$package_version is already published; skipping."
elif [[ "$status" == "404" ]]; then
  npm publish --provenance
else
  echo "::error::Registry lookup failed with HTTP $status."
  cat published.json >&2
  exit 1
fi
