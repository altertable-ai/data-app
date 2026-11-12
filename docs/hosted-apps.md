# Author a data app

Follow the [SDK integration guide](app-authoring.md) with a version-matched hosted
starter selected by the authoring workflow. The shared starter
is `starter-data-app/index.tsx`; its sample content is replaceable. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Declare `const dataApp = defineDataApp({ ... })` once at module scope using the
named import from `@altertable/data-app`.

Keep the argument literal: objects, arrays, strings (including templates without
interpolation), finite signed numbers, booleans, and null. Parentheses, `as`, and
`satisfies` are allowed. Keep executable composition outside the call; omit spreads,
computed keys, references, and callbacks. Static apps use `queries: {}`.

Replace sample queries, operations, and datasets with inspected source data. Supply `scope`
in `defineDataApp()`. When using bound `<DataApp>`, follow its current
[story and dataset requirements](stories-and-export.md).

Keep the starter's client, style injection, and mounting code. The current
single-file starter collects the operations with `dataApp.defineOperations()`
and selects browser execution with `operations.createDataClient({ execution:
'browser' })`. Its host supplies the SQL route; no bootstrap or message routes
are needed in app code. A hosting build that registers operations on the backend
can use `operations.createDataClient({ execution: 'server' })` and the named
`data:query` route instead.

## Convert a local data app

1. Combine the app's filters, operations, data context, views, any presentation
   and export features, app declaration, and browser entry into one `index.tsx`, following the
   [single-file starter](app-authoring.md#use-release-matched-starters).
2. Collect the operations with `dataApp.defineOperations()` and select browser
   execution with `operations.createDataClient({ execution: 'browser' })`. The
   registry supplies the operations' filters, so drop the `filters` option. See
   [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps)
   for execution through the host.
3. Remove the Bun server, HTML, server adapters, credentials, and relative or
   app-alias imports. Rewrite any operation that depends on server-only code
   to use the operation's `query()` helper.
4. Confirm the host can query the same catalogs, tables, and fields.
   [Verify the app](app-authoring.md#verify-the-app) in the hosted runtime against
   the local version's filters and findings.
