# Build this data app

Inspect source data, time coverage, and existing definitions before choosing an
exploration. Build conclusions from observed results; do not present association
as cause. Keep copy concise and relevant to the reader.

Read `node_modules/@altertable/data-app/AGENTS.md` and
`node_modules/@altertable/data-app/docs/app-authoring.md` first.

| Task                                     | App-owned files                                | Package documentation                                        |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Define queries and inputs                | `src/operations.ts`, optional shared contracts | `docs/contract.md`, `docs/server.md`                         |
| Call those operations from views         | `src/App.tsx` and the data client              | `docs/client.md#local-and-hosted-execution`, `docs/react.md` |
| Build views, filters, and request states | `src/App.tsx`                                  | `docs/react.md`                                              |
| Explain terms and evidence               | `src/data-context.ts`                          | `docs/react.md#bind-evidence`                                |
| Change identity and brand                | `app.json`                                     | `docs/config.md`, `docs/appearance.md`                       |
| Configure local serving or hosting       | `src/server.ts`                                | `docs/server-bun.md`, `docs/server.md`                       |

Package documentation paths are relative to `node_modules/@altertable/data-app/`.
Edit app-owned files and import public package entries. Use `#app/*` and
`#config` for app imports. Use function declarations for named functions and
leave blank lines around declarations, effects, and before returns.
Import `@altertable/data-app/*` subpaths. This local starter keeps SQL and
credentials on the server; use `import type` for operation types in browser
code. The same operations and `createDataClient({ operations })` also run in a
hosted app; do not send SQL from the app. Import the stylesheet once in the
browser entry.
The connectivity screen is scaffolding, not an example analysis.

Run `bun run check`. Inspect findings and interactions at phone and desktop
widths, including loading, empty, error, and stale states. Verify the exploration
answers the user's question. Read README.md for local setup and credentials.
