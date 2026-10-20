# @altertable/data-app-examples

Canonical starter templates for Altertable data apps, shared by the CLI and
app authors. Templates use the published runtime packages and ship as editable
source files. Scaffolding does not install runtime dependencies.

## Use from scaffolding tools

```ts
import { copyExample } from '@altertable/data-app-examples';

await copyExample('starter-local-data-app', destination);
```

`dataAppExamples` supplies stable IDs, titles, descriptions, and execution modes
for tools that present a starter picker. Use the ID directly when the starter is
already known.
`copyExample()` copies the starter and restores `_gitignore` to `.gitignore`
(npm excludes `.gitignore` from published archives). The destination must not
exist. Keep project naming, destination checks, and dependency installation
in the consuming tool. Generated apps do not depend on this package.

`getExampleDirectory()` returns an absolute source path for tools that need to
inspect templates. Both functions reject unknown IDs.

## Preview a single-file app

Install this package alongside the starter's pinned runtime dependencies in the
preview project. The Bun-only `@altertable/data-app-examples/preview` entry starts
`serveAppFile()` from `@altertable/data-app-bun/preview`:

```fish
cd /absolute/path/to/installed-preview-project
set -lx ALTERTABLE_APP_FILE /absolute/path/to/app.tsx
set -lx PORT 25837
set -lx ALTERTABLE_DATA_PROXY_URL http://127.0.0.1:12345
set -lx ALTERTABLE_DATA_PROXY_TOKEN your-loopback-proxy-token
bun -e 'await import("@altertable/data-app-examples/preview")'
```

The process working directory must be the installed preview project. Data-app and
React imports resolve there, even when the external source file has conflicting
ancestor `node_modules`. Do not use this package's `dist` directory as the
resolution base: Bun's isolated installs can place it away from the project's
runtime dependencies.

The preview project needs `@altertable/data-app-examples`,
`@altertable/data-app-bun`, `@altertable/data-app`, `@altertable/data-app-react`,
`react`, and `react-dom`; use matching exact data-app package versions and the
starter's lockfile. The Bun package is an optional peer so scaffolding consumers
can install examples alone.

`ALTERTABLE_APP_FILE` must be an absolute source file path. `PORT` defaults to
25837; use `0` for an available port. Startup prints the preview URL and source
path. SIGINT and SIGTERM stop the preview and release its reload connections and
file watchers before exiting.

The consuming CLI owns manifest extraction, profile selection and scope checks,
dependency installation, and the loopback lakehouse proxy. Pass only its proxy URL
and token to the launcher; profile credentials stay in the CLI. The launcher
passes the environment to `localLakehouse()` and uses the existing Bun preview
server for bundling, reload, and query forwarding.

## Starters

| ID                       | Use                                                                       |
| ------------------------ | ------------------------------------------------------------------------- |
| `starter-data-app`       | [Hosted single-file app](templates/starter-data-app/index.tsx)            |
| `starter-local-data-app` | [Local Bun and React project](templates/starter-local-data-app/README.md) |

Pin this package to an exact version in the CLI. Its version follows the runtime
packages, and the local starter pins compatible dependencies to the same release.
The SDK authoring guides and API reference ship in `@altertable/data-app`.

## License

[MIT](LICENSE)
