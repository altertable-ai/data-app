# Local Bun server

Use this Bun server for local data apps. Start from the CLI scaffold or
[local data app starter](https://github.com/altertable-ai/data-app/tree/main/packages/data-app-examples/templates/starter-local-data-app).

Import `serveLocalApp()` and `localLakehouse()` from
`@altertable/data-app-bun`. This entry requires Bun; install `@types/bun`
when typechecking a Bun app.

```ts
import { serveLocalApp } from '@altertable/data-app-bun';
import page from './index.html';
import { operations } from './operations';

serveLocalApp({ page, operations, title: 'Activity' });
```

The server binds to `127.0.0.1`. Its default port is `25837`, overridable through
`PORT` or the `port` option. It serves the Bun HTML bundle and operation requests.

`localLakehouse()` reads the CLI proxy URL and token from
`ALTERTABLE_DATA_PROXY_URL` and `ALTERTABLE_DATA_PROXY_TOKEN`. It also supports
server-only `ALTERTABLE_LAKEHOUSE_USERNAME` and
`ALTERTABLE_LAKEHOUSE_PASSWORD`, with an optional `ALTERTABLE_API_BASE`.
Missing credentials fail the query. Keep these variables out of browser code.

Local serving does not authenticate hosted viewers.
Use [the portable server handler](server.md) with per-request authorization when
hosting an app for other people.

## Preview a single-file app

Import `serveAppFile()` from `@altertable/data-app-bun/preview` to preview
an app in the hosted sandbox. The caller supplies the server-only lakehouse.
The runtime owns bundling, imported-file watching, reloads, navigation, and exports.

```ts
import { serveAppFile } from '@altertable/data-app-bun/preview';
import { localLakehouse } from '@altertable/data-app-bun';

const preview = await serveAppFile({
  file: '/absolute/path/index.tsx',
  lakehouse: localLakehouse(),
});
console.log(preview.url);
// When the launcher stops:
await preview.stop();
```

The preview resolves `@altertable/data-app` and React from its own installation.
It binds to localhost and accepts SQL only from its own origin,
with a streaming limit of 100,000 UTF-8 bytes per query request. The caller
owns profile validation, dependency installation, and credentials. This entry requires Bun and adds no Bun installation or dependency
to browser consumers. Keep it separate from browser imports.
