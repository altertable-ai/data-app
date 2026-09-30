# Author a data app

An app owns its question, SQL, result parsing, business definitions, configuration,
and presentation. The package supplies contracts, request handling, typed client
calls, and reusable React UI.

Import public subpaths: `@altertable/data-app/client`, `/contract`, `/react`,
`/react/styles.css`, `/config`, `/appearance`, `/format`, `/embed`, `/server`,
and `/server/bun`. The package has no root export. There is no
`@altertable/data-app-runtime` entry. Installed package files are dependencies;
customize the app's own source rather than editing `node_modules`.

Write one app for local Bun, a self-hosted server, and the Altertable product host.
Define named operations, call them with `createDataClient` and `useDataView` (or
`client.query`), and do not add a second data path for hosted apps.

1. Inspect the source data, time coverage, and existing definitions before choosing
   the exploration. Build findings from observed results and distinguish
   association from cause.
2. Define named, bounded [operations](contract.md). Put shared input contracts in
   a browser-safe module and validate outputs before returning them.
3. Local and self-hosted apps execute those operations in a [server handler](server.md)
   or the [Bun adapter](server-bun.md). SQL, credentials, and viewer authorization
   stay on that server.
4. Create one typed [client](client.md) and compose [React views](react.md). Pass
   the same operations registry into `createDataClient({ operations })` when the
   app may run in a host that does not implement `data:query`. The client still
   sends `{ operation, input }`. A local server or preview host handles that
   route and does not run the registry in the browser. A host that rejects the
   route runs the operation and executes each statement itself.
5. Define glossary and query evidence, handle empty results, and preserve the
   displayed input while a request refreshes or fails. A measured zero and an
   unavailable value must remain distinct.
6. Verify the app's findings and interactions against the original question.
   Inspect loading, error, stale, and empty states at desktop and phone widths.

A local-only bundle may omit `operations` and import the registry with
`import type`, so its SQL stays on the server. Do not call `getDataAppTransport()`
to send SQL from the app.

For agent-assisted authoring, see the [starter AGENTS.md template](starter-agent-instructions.md).
