# @altertable/data-app-bun

Local Bun servers, lakehouse access, and development previews for Altertable data apps.

## Installation

```fish
bun add @altertable/data-app-bun
bun add --dev @types/bun
```

Requires the Bun runtime. Add `@types/bun` when using TypeScript.

## Usage

Serve a local app's HTML entry and operation registry:

```ts
import { serveLocalApp } from '@altertable/data-app-bun';
import page from './index.html';
import { operations } from './operations.ts';

serveLocalApp({ page, operations, title: 'Activity' });
```

The app supplies `index.html` and `operations.ts`. Use `localLakehouse()` inside
server operations for lakehouse access. Keep credentials on the server.

For single-file previews, use `serveAppFile()` from
`@altertable/data-app-bun/preview`. Its host is bundled; consumers need no React
peers. Local serving does not authenticate hosted viewers; use
`@altertable/data-app/server` with per-request authorization for hosted apps.

## Preview a single-file app

The Bun-only `@altertable/data-app-bun/preview/cli` entry starts
`serveAppFile()` from `@altertable/data-app-bun/preview`:

```fish
cd /absolute/path/to/installed-preview-project
set -lx ALTERTABLE_APP_FILE /absolute/path/to/app.tsx
set -lx PORT 25837
set -lx ALTERTABLE_DATA_PROXY_URL http://127.0.0.1:12345
set -lx ALTERTABLE_DATA_PROXY_TOKEN your-loopback-proxy-token
bun -e 'await import("@altertable/data-app-bun/preview/cli")'
```

The process working directory must be the installed preview project. Data-app and
React imports resolve there, even when the external source file has conflicting
ancestor `node_modules`. Do not use this package's `dist` directory as the
resolution base: Bun's isolated installs can place it away from the project's
runtime dependencies.

The preview project needs `@altertable/data-app-bun`, `@altertable/data-app`, `@altertable/data-app-react`,
`react`, and `react-dom`; use matching exact data-app package versions and the
starter's lockfile. The examples package is only needed to obtain templates.

`ALTERTABLE_APP_FILE` must be an absolute source file path. `PORT` defaults to
25837; use `0` for an available port. Startup prints the preview URL and source
path. SIGINT and SIGTERM stop the preview and release its reload connections and
file watchers before exiting.

The consuming CLI owns manifest extraction, profile selection and scope checks,
dependency installation, and the loopback lakehouse proxy. Pass only its proxy URL
and token to the launcher; profile credentials stay in the CLI. The launcher
passes the environment to `localLakehouse()` and uses the existing Bun preview
server for bundling, reload, and query forwarding.

## Documentation

See the [Bun guide](https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md)
for operations, credentials, and previews.
Use the local template from `@altertable/data-app-examples` at the same version as
`@altertable/data-app`. Browse the latest [local starter](https://github.com/altertable-ai/data-app/tree/main/packages/data-app-examples/templates/starter-local-data-app).

## License

[MIT](LICENSE)
