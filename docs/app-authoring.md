# Author a data app

An app owns its question, SQL, result parsing, business definitions, configuration,
and presentation. The package supplies contracts, request handling, typed client
calls, and reusable React UI.

Import public subpaths: `@altertable/data-app/client`, `/contract`, `/react`,
`/react/styles.css`, `/config`, `/appearance`, `/format`, `/embed`, `/server`,
and `/server/bun`. The package has no root export. There is no
`@altertable/data-app-runtime` entry. Installed package files are dependencies;
customize the app's own source rather than editing `node_modules`.

Write one app for local Bun, a self-hosted server, and a hosted embed. Define
named operations, call them with `createDataClient` and `useDataView` (or
`client.query`), and keep that data path the same everywhere.

1. Inspect the source data, time coverage, and existing definitions before choosing
   the exploration. Build findings from observed results and distinguish
   association from cause.
2. Define named, bounded [operations](contract.md). Put shared input contracts in
   a browser-safe module and validate outputs before returning them.
3. Execute those operations in a [server handler](server.md) or the
   [Bun adapter](server-bun.md). A hosted embed uses the same registry through
   [Hosting named operations](server.md#hosting-named-operations). SQL,
   credentials, and viewer authorization stay on that host.
4. Create one typed [client](client.md) and compose [React views](react.md).
   Import the operation registry with `import type`. The client sends
   `{ operation, input }` on `data:query`.
5. Define glossary and query evidence, handle empty results, and preserve the
   displayed input while a request refreshes or fails. A measured zero and an
   unavailable value must remain distinct.
6. Verify the app's findings and interactions against the original question.
   Inspect loading, error, stale, and empty states at desktop and phone widths.

Do not send SQL from app code, and do not call `getDataAppTransport()` to run
queries. The host adapts `data:query` to its SQL executor.

For agent-assisted authoring, see the [starter AGENTS.md template](starter-agent-instructions.md).
