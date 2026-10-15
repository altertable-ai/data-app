# @altertable/data-app

Portable app definitions, contracts, formatting, browser clients, and request handling.

```ts
import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import { createDataHandler } from '@altertable/data-app/server';
```

This package has no React peer requirement. Add `@altertable/data-app-react` to
build app UI, `@altertable/data-app-embed` to host iframes, or
`@altertable/data-app-bun` for local Bun serving.

See the [guide](https://github.com/altertable-ai/data-app/blob/main/docs/app-authoring.md)
and [repository](https://github.com/altertable-ai/data-app) for examples.

For agent-assisted authoring, read [AGENTS.md](AGENTS.md) and the
[authoring guide](docs/app-authoring.md). Guides and starters ship with this package.
