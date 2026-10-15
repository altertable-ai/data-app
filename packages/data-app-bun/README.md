# @altertable/data-app-bun

Bun local serving, server-only lakehouse access, and single-file app previews.

```ts
import { localLakehouse, serveLocalApp } from '@altertable/data-app-bun';
import { serveAppFile } from '@altertable/data-app-bun/preview';
```

Requires the Bun runtime. Keep credentials and authorization in server modules.
For portable request handling, use `@altertable/data-app/server`.
The preview host is bundled at build time; this package does not require React peers.

See the [guide](https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md)
and [repository](https://github.com/altertable-ai/data-app) for examples.
