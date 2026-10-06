# Author a data app

Follow the [shared authoring flow](app-authoring.md) using [index.tsx](../examples/starter-data-app/index.tsx) for a hosted / remote / cloud data app. Keep the app in
one file with public package imports; omit server files, HTML, credentials, and
relative or app-alias imports.

Replace the sample SQL, parsers, filters, data context, CSV export, story, and configuration with
an exploration of the source data you inspected. The starter uses two SQL
`VALUES` rows, so it needs no production table.

For execution details, see [browser-owned operations](client.md#browser-owned-operations-for-bundle-apps).

## Create and update registration

Produce three artifacts, as shown in the starter:

- [App source](../examples/starter-data-app/index.tsx): calls `query(id, values)`
  through browser-owned operations.
- [queries.json](../examples/starter-data-app/queries.json): maps query IDs to SQL
  templates. Keep this map out of the browser bundle.
- [variables.json](../examples/starter-data-app/variables.json): lists the
  [typed variable definitions](contract.md#query-variables), which app code may
  also use for parsing and controls.

Submit all three together on creation and every source update. Queries and
variables are complete replacements, including removals and empty collections.
Follow the [hosted build skill](https://github.com/altertable-ai/skills/blob/main/skills/build-data-app/SKILL.md)
for the create/update tool workflow.

`defineDataAppRegistration({ queries, variables })` validates registration,
including duplicate names and undefined placeholders. Host implementers should
follow the [registered query route](embed.md#registered-query-route).

## Convert a local data app

1. Combine the operation orchestration, parsers, views, story, and CSV export into the
   [single-file starter](../examples/starter-data-app/index.tsx) format.
2. Move SQL from local server operations into `queries.json`, define typed variables
   in `variables.json`, and replace statement calls with `query(id, values)`. Use
   `createDataClient({ operations })` in the browser.
3. Remove local serving files and app-alias imports. Confirm the host can access
   the same catalogs, then follow the [shared verification steps](app-authoring.md#verify-the-app).

## Preview in this repository

```fish
bun install --frozen-lockfile
bun run build
bun browser-tests/server.ts
```

Open [the starter preview](http://127.0.0.1:27418/starter-data-app).
Its test host executes the sample SQL through the iframe bridge using SQLite.

For checks, see [Contributing](../CONTRIBUTING.md).
