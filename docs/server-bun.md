# Local Bun server

Import `serveLocalApp` and `localLakehouse` from
`@altertable/data-app/server/bun`. This entry requires Bun; install `@types/bun`
when typechecking a Bun app.

```ts
import { serveLocalApp } from '@altertable/data-app/server/bun';
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

Local serving permits SQL disclosure and does not authenticate hosted viewers.
Use [the portable server handler](server.md) with per-request authorization when
hosting an app for other people.

The local adapter validates NDJSON metadata, optional string or typed column
headers, and array rows before returning a result. Query IDs must be strings.
Rows must match the column count when a header is present; headerless array rows
remain supported with empty column metadata. Empty results remain valid.
