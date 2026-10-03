# Author a data app

Follow the [shared authoring flow](app-authoring.md) using [index.tsx](../examples/starter-data-app/index.tsx) for a hosted / remote / cloud data app. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Replace the sample SQL, parsers, filters, data context, CSV export, story, and configuration with
an exploration of the source data you inspected. The starter uses two SQL
`VALUES` rows, so it needs no production table.

For execution details, see [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps).

## Create and update registration

Declare every named statement and its frontend variable definitions with the
[operation contract](contract.md#execute-named-queries). Use
`getDataAppRegistration(operations)` to obtain the complete `queries` and
`variables` maps. The single-file starter exports this as `registration`.

Submit source, queries, and variables together for both creation and source
updates. Treat the maps as complete replacements for the same app revision,
including deleted entries and empty maps. Retrieve existing source and metadata
before an edit. Validate the replacement source and registration before saving.
Use the live create/update tool schema for argument names and required metadata.
If the host lacks registration support, report that integration requirement;
do not drop the maps or fall back to unrestricted SQL for a registered app.

The backend must validate registration and enforce viewer permissions and query
limits. The trusted host selects the app revision and uses the
[registered query route](embed.md#registered-query-route). Runtime requests carry
the registered query name and variable values; they cannot register new SQL.
Platform storage/versioning and create/update tool changes are owned by the host,
not implemented by this package.

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
4. Register the complete queries and variables with the source. Confirm the host can query the same catalogs, tables, and fields.
   [Verify the app](app-authoring.md#verify-the-app) in the hosted runtime against
   the local version's filters and findings.

## Preview in this repository

```fish
bun install --frozen-lockfile
bun run build
bun browser-tests/server.ts
```

Open [the starter preview](http://127.0.0.1:27418/starter-data-app).
Its test host executes the sample SQL through the iframe bridge using SQLite.

For checks, see [Contributing](../CONTRIBUTING.md).
