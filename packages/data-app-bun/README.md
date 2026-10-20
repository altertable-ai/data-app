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

Local serving does not authenticate hosted viewers; use
`@altertable/data-app/server` with per-request authorization for hosted apps.

## Preview a single-file app

`runAppFilePreview()` launches a preview from the CLI environment. Run it from the
project containing the installed, version-matched data-app and React dependencies:

```fish
cd /absolute/path/to/installed-preview-project
set -lx ALTERTABLE_APP_FILE /absolute/path/to/app.tsx
set -lx PORT 25837
set -lx ALTERTABLE_DATA_PROXY_URL http://127.0.0.1:12345
set -lx ALTERTABLE_DATA_PROXY_TOKEN your-loopback-proxy-token
bun -e 'import { runAppFilePreview } from "@altertable/data-app-bun/preview"; await runAppFilePreview()'
```

The source path must be absolute. `PORT` defaults to 25837; use `0` for an available
port. The runner resolves data-app and React imports from the working directory,
prints the preview URL, and stops on SIGINT or SIGTERM. The CLI owns dependency
installation, profile and scope checks, and the lakehouse proxy.

For explicit options and caller-owned credentials and signal handling, use
`serveAppFile()` from the same entrypoint. Both functions return `{ url, stop }`.
Calling `stop()` releases preview resources and any signal handlers the runner
installed.

## Documentation

See the [Bun guide](https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md)
for operations and credentials.
Use the local template from `@altertable/data-app-examples` at the same version as
`@altertable/data-app`. Browse the latest [local starter](https://github.com/altertable-ai/data-app/tree/main/packages/data-app-examples/templates/starter-local-data-app).

## License

[MIT](LICENSE)
