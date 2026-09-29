# Author a data app

An app owns its question, SQL, result parsing, business definitions, configuration,
and presentation. The package supplies contracts, request handling, typed client
calls, and reusable React UI.

1. Inspect the source data, time coverage, and existing definitions before choosing
   the exploration. Build findings from observed results and distinguish
   association from cause.
2. Define named, bounded [operations](contract.md) on the server. Put shared input
   contracts in a browser-safe module and validate outputs before returning them.
3. Use a [server handler](server.md) that authorizes each request, or the
   [Bun adapter](server-bun.md) for local development.
4. Create a typed [client](client.md) and compose [React views](react.md). Import
   the operation registry with `import type` in browser code.
5. Define glossary and query evidence, handle empty results, and preserve the
   displayed input while a request refreshes or fails. A measured zero and an
   unavailable value must remain distinct.
6. Verify the app's findings and interactions against the original question.
   Inspect loading, error, stale, and empty states at desktop and phone widths.

Import through `@altertable/data-app/<entry>`. Installed package files are
dependencies; customize the app's own source rather than editing `node_modules`.
SQL, credentials, and viewer authorization belong on the server.

For agent-assisted authoring, see the [starter AGENTS.md template](starter-agent-instructions.md).
