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

## Documentation

See the [Bun guide](https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md)
for operations, credentials, and previews.
Use the local template from `@altertable/data-app-examples` at the same version as
`@altertable/data-app`. Browse the latest [local starter](https://github.com/altertable-ai/data-app/tree/main/packages/data-app-examples/templates/starter-local-data-app).

## License

[MIT](LICENSE)
