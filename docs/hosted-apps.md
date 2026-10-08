# Author a data app

Follow the [shared authoring flow](app-authoring.md) using [index.tsx](../examples/starter-data-app/index.tsx) for a hosted / remote / cloud data app. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Declare `const dataApp = defineDataApp({ ... })` at module top level,
using `defineDataApp()` from `/config`.
Pass literal values throughout, without spreads, computed keys, variable references,
other calls, or template interpolation. This lets the backend bundler extract the argument
through its AST by recognizing the imported call; the variable name is unrestricted. An export is only needed for imports by other modules. Static apps use `queries: {}`.

Replace the sample config queries, parsers, filters, data context, CSV export, story, and configuration with
an exploration of the source data you inspected. The starter uses two SQL
`VALUES` rows, so it needs no production table.

For execution details, see [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps).

## Convert a local data app

1. Combine the app's operations and parsers, data context, views, story,
   CSV export, configuration, and browser entry into one `index.tsx`, following the
   [single-file starter](../examples/starter-data-app/index.tsx).
2. Replace the HTTP client with `createDataClient({ operations })`, using the
   operation registry as a value. See [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps)
   for execution through the host.
3. Remove the Bun server, HTML, server adapters, credentials, and relative or
   app-alias imports. Rewrite any operation that depends on server-only code
   to use the operation's `query()` helper.
4. Confirm the host can query the same catalogs, tables, and fields.
   [Verify the app](app-authoring.md#verify-the-app) in the hosted runtime against
   the local version's filters and findings.
