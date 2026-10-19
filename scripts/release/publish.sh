#!/usr/bin/env bash
set -euo pipefail
# Keep dependency order aligned with scripts/packages.ts.
for directory in packages/data-app-manifest packages/data-app packages/data-app-embed packages/data-app-react packages/data-app-bun packages/data-app-worker; do
  package_name="$(node --print "require('./$directory/package.json').name")"
  package_version="$(node --print "require('./$directory/package.json').version")"
  registry_name="$(node --print "encodeURIComponent(require('./$directory/package.json').name)")"
  status="$(curl --silent --show-error --output published.json --write-out '%{http_code}' "https://registry.npmjs.org/$registry_name/$package_version")"
  if [[ "$status" == "200" ]]; then
    PACKAGE_VERSION="$package_version" node -e 'if (JSON.parse(require("node:fs").readFileSync("published.json", "utf8")).version !== process.env.PACKAGE_VERSION) process.exit(1)'
    echo "$package_name@$package_version is already published; skipping."
  elif [[ "$status" == "404" ]]; then
    npm publish "./$directory" --provenance
  else
    echo "::error::Registry lookup for $package_name failed with HTTP $status."
    cat published.json >&2
    exit 1
  fi
done
