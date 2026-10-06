# Author a data app

Follow the [shared authoring flow](app-authoring.md) using [index.tsx](../examples/starter-data-app/index.tsx) for a hosted / remote / cloud data app. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Replace the sample SQL, parsers, filters, data context, CSV export, story, and configuration with
an exploration of the source data you inspected. The starter uses two SQL
`VALUES` rows, so it needs no production table.

For execution details, see [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps).

## Create and update registration

Produce the browser source, a separate `queries.json` map, and a `variables.json`
list following the [operation contract](contract.md#execute-named-queries).
Each variable requires `name`, `type`, `nullable`, and `default`. Validate the
metadata with `defineDataAppRegistration({ queries, variables })` on the host.
SQL belongs only in the external query map; app code calls `query(id, values)`
through `createDataClient({ operations })`. The starter supplies all three artifacts.

Submit source, queries, and variables together for both creation and source
updates. Treat the query map and variable list as complete replacements for the same app revision,
including deleted entries and empty collections. Retrieve existing source and metadata
before an edit. Validate the replacement source and registration before saving.
Use the live create/update tool schema for argument names and required metadata.
If the host lacks registration support, report that integration requirement;
do not drop the registration or fall back to unrestricted SQL for a registered app.

The backend must validate registration and enforce viewer permissions and query
limits. The trusted host selects the app revision and uses the
[registered query route](embed.md#registered-query-route). Runtime requests carry
the registered query name and variable values; they cannot register new SQL.
Platform storage/versioning and create/update tool changes are owned by the host,
not implemented by this package.

## Convert a local data app

1. Combine the operation orchestration, parsers, views, story, and CSV export into the
   [single-file starter](../examples/starter-data-app/index.tsx) format.
2. Move SQL from local server operations into `queries.json`, define typed variables
   in `variables.json`, and replace statement calls with `query(id, values)`. Use
   `createDataClient({ operations })` in the browser.
3. Remove local serving files and app-alias imports. Keep queries and variable
   metadata separate from the browser source.
4. Submit all three artifacts for the same revision. Confirm the host can access
   the same catalogs and verify filters, results, export, and story.

## Preview in this repository

```fish
bun install --frozen-lockfile
bun run build
bun browser-tests/server.ts
```

Open [the starter preview](http://127.0.0.1:27418/starter-data-app).
Its test host executes the sample SQL through the iframe bridge using SQLite.

For checks, see [Contributing](../CONTRIBUTING.md).
