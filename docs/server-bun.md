# Local Bun server

Use this Bun server for local data apps. Start from the CLI scaffold or
[local data app starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app).

Import `serveLocalApp()` and `localLakehouse()` from
`@altertable/data-app/server/bun`. This entry requires Bun; install `@types/bun`
when typechecking a Bun app.

```ts
import { serveLocalApp } from '@altertable/data-app/server/bun';
import page from './index.html';
import { operations } from './operations';

serveLocalApp({ page, operations, title: 'Activity' });
```

Keep `queries.json` beside the server entry. It maps query IDs to SQL statements,
as in a [hosted app](hosted-apps.md#create-and-update-registration). Operations
call `query(id, values)`; see [named queries](contract.md#execute-named-queries).
The server reads the file at startup and again for each query, so edits apply
without a restart. Pass `queries` to supply the map directly.

The server binds to `127.0.0.1`. Its default port is `25837`, overridable through
`PORT` or the `port` option. It serves the Bun HTML bundle and operation requests.

`localLakehouse(queries)` resolves each query ID to its statement and sends the
values as DuckDB bind parameters. It reads the CLI proxy URL and token from
`ALTERTABLE_DATA_PROXY_URL` and `ALTERTABLE_DATA_PROXY_TOKEN`. It also supports
server-only `ALTERTABLE_LAKEHOUSE_USERNAME` and
`ALTERTABLE_LAKEHOUSE_PASSWORD`, with an optional `ALTERTABLE_API_BASE`.
Missing credentials fail the query. Keep these variables out of browser code.

Local serving permits SQL disclosure and does not authenticate hosted viewers.
Use [the portable server handler](server.md) with per-request authorization when
hosting an app for other people.
