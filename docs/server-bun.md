# Local Bun server

Import `serveLocalApp()` from `@altertable/data-app/server/bun`. It builds a browser
entrypoint and serves it inside the same sandboxed iframe runtime as hosted apps.
Use [the local authoring guide](local-data-apps.md) for the three app artifacts and
server example. This entry requires Bun; install `@types/bun` for typechecking.

The server binds to `127.0.0.1`. The default port is `25837`, overridable with `PORT`
or `port`. Supply `entrypoint`, the separate `{ queries, variables }` registration,
and `title`. The registration is validated and snapshotted at startup.

Browser operations call `query(id, values)` through `postMessage`. Only the trusted
local shell forwards requests to `/api/query`, using a session token. Bun looks up
the statement, validates variables, and calls the CLI proxy over HTTP. Raw SQL
requests are not exposed. Server row and duration limits default to 10,000 rows
and 30 seconds; use `maxQueryRows` and `maxDurationMs` to configure them.

`localLakehouse()` is the server-only HTTP adapter. It reads the CLI proxy URL and
token from `ALTERTABLE_DATA_PROXY_URL` and `ALTERTABLE_DATA_PROXY_TOKEN`. It also
supports `ALTERTABLE_LAKEHOUSE_USERNAME` and `ALTERTABLE_LAKEHOUSE_PASSWORD`, with
an optional `ALTERTABLE_API_BASE`. Missing credentials fail the query. These values
must never enter the iframe bundle.

Local serving uses the selected CLI profile and does not authorize hosted viewers.
Production hosts must enforce viewer authorization and limits on their backend.
The [portable operation handler](server.md) remains available for custom HTTP apps.
