# Author a data app

Follow the [shared authoring flow](app-authoring.md) with the version-matched `starter-data-app/index.tsx` for a hosted / remote / cloud data app. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Declare `const dataApp = defineDataApp({ ... })` once at module scope using the
named import from `@altertable/data-app`.

Keep the argument literal: objects, arrays, strings (including templates without
interpolation), finite signed numbers, booleans, and null. Parentheses, `as`, and
`satisfies` are allowed. Keep executable composition outside the call; omit spreads,
computed keys, references, and callbacks. Static apps use `queries: {}`.

Replace sample queries and bindings with inspected source data. Supply `scope`
in `defineDataApp()` and `story` and `datasets` on `<DataApp>`.

Keep the starter's client, style injection, and mounting code. The host supplies
the transport; no bootstrap or message routes are needed in app code.

## Convert a local data app

1. Combine the app's operations and parsers, data context, views, story,
   CSV export, app declaration, and browser entry into one `index.tsx`, following the
   [single-file starter](app-authoring.md#use-release-matched-starters).
2. Replace the HTTP client with `createDataClient({ operations })`, using the
   operation registry as a value. See [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps)
   for execution through the host.
3. Remove the Bun server, HTML, server adapters, credentials, and relative or
   app-alias imports. Rewrite any operation that depends on server-only code
   to use the operation's `query()` helper.
4. Confirm the host can query the same catalogs, tables, and fields.
   [Verify the app](app-authoring.md#verify-the-app) in the hosted runtime against
   the local version's filters and findings.
