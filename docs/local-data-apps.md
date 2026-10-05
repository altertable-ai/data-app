# Author a local data app

Follow the [shared authoring flow](app-authoring.md) and start from the
[local starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app).
Local and hosted apps use the same browser-owned operations and iframe bridge.

## App artifacts

Author the browser code, a `queries.json` map, and a `variables.json` list using
[the operation contract](contract.md#execute-named-queries). Every variable has
`name`, `type`, `nullable`, and a valid `default`. Keep SQL in `queries.json` and
out of browser imports. Operations call `query(id, values)`; views use
`createDataClient({ operations })`, just as in hosted apps.

The server reads the external registration and serves the app in a sandboxed iframe:

```ts
import { serveLocalApp } from '@altertable/data-app/server/bun';
import { defineDataAppRegistration } from '@altertable/data-app/contract';
import queries from '../queries.json';
import variables from '../variables.json';

await serveLocalApp({
  entrypoint: new URL('./main.tsx', import.meta.url).pathname,
  registration: defineDataAppRegistration({ queries, variables }),
  title: 'Activity',
});
```

## Request flow

1. The iframe runs the same app code as hosted apps and posts a query ID and values.
2. The local shell forwards `{ operation, variables, limit }` to Bun at `/api/query`.
3. Bun resolves the statement using its saved registration, validates values, and
   builds SQL. It sends `{ statement, limit }` by HTTP to the CLI's authenticated proxy.
4. The CLI proxy makes the lakehouse HTTP call with the selected profile; results
   return through the same iframe bridge. No lakehouse SDK is needed in the app.

The local host exposes no raw SQL endpoint. The iframe has an opaque origin and
cannot fetch the registration or query endpoint directly. Credentials stay in the
CLI/server process. Registration is loaded for the server revision; restart after
changing it (the starter uses Bun hot reload). Reload the page to rebuild app code.

Use the same variable selectors, CSV export, and story as hosted apps. The local
host handles navigation and file exports. Its default port is 25837; see
[Bun serving](server-bun.md) for credentials and limits.

To publish, combine the browser source into the hosted single-file format and
submit the same queries and variable list alongside it. The execution calls and
query IDs stay unchanged. See [hosted authoring](hosted-apps.md).
