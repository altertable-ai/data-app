# @altertable/data-app-bun

Local Bun servers, lakehouse access, and development previews for Altertable data apps.

## Installation

```fish
bun add @altertable/data-app-bun
bun add --dev @types/bun
```

Requires Bun.

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

`data-app-preview` launches a preview from the CLI environment. Run it from the
project containing the installed, version-matched data-app and React dependencies:

```fish
cd /absolute/path/to/installed-preview-project
set -lx ALTERTABLE_APP_FILE /absolute/path/to/app.tsx
set -lx PORT 25837
set -lx ALTERTABLE_DATA_PROXY_URL http://127.0.0.1:12345
set -lx ALTERTABLE_DATA_PROXY_TOKEN your-loopback-proxy-token
bun run data-app-preview
```

Use an absolute source path. `PORT` defaults to 25837; use `0` for an available
port. The runner prints the URL and stops on SIGINT or SIGTERM.

## Documentation

See the [Bun guide](https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md)
for operations and credentials.

## License

[MIT](LICENSE)
