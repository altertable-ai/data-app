# Starter agent instructions

Keep app paths, commands, and analysis context in the consuming app's `AGENTS.md`.
Link to the installed package guide and adapt this template to the app:

```markdown
# Build this data app

Inspect source data, time coverage, and existing definitions before choosing an
exploration. Build conclusions from observed results; do not present association
as cause. Keep copy concise and relevant to the reader.

Read `node_modules/@altertable/data-app/AGENTS.md` first, then
`node_modules/@altertable/data-app/docs/app-authoring.md`.

| Task                                     | App-owned files                             | Package documentation                  |
| ---------------------------------------- | ------------------------------------------- | -------------------------------------- |
| Define queries and inputs                | `src/operations.ts`, shared input contracts | `docs/contract.md`, `docs/server.md`   |
| Build views, filters, and request states | `src/App.tsx`                               | `docs/react.md`                        |
| Explain terms and query evidence         | `src/data-context.ts` or `.tsx`             | `docs/react.md#bind-evidence`          |
| Change identity and brand                | App configuration                           | `docs/config.md`, `docs/appearance.md` |
| Configure local serving or hosting       | `src/server.ts`                             | `docs/server-bun.md`, `docs/server.md` |

Package documentation paths above are relative to
`node_modules/@altertable/data-app/`.

Edit app-owned source and import public entries. HTTP apps keep operations on
the server and import their types in browser code. Bundle apps execute operations
through the authorized host SQL bridge. Credentials and enforced access/query
limits stay on the backend.
Do not edit installed package files. The connectivity screen is scaffolding,
not an example analysis.

Run the app's typecheck, lint, and build scripts. Inspect its findings and
interactions at phone and desktop widths, including loading, empty, error, and
stale states. Verify that the exploration answers the user's question.
```

See [the runnable starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter).
