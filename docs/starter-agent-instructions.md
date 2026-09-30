# Starter agent instructions

The package ships `AGENTS.md`, public documentation in `docs/`, and declarations
referenced by its export map. Its agent guide describes package usage and includes
a separate section for contributors working in the package source repository.

A starter application's `AGENTS.md` owns its file paths, commands, and analysis
context. Keep it in the consuming app and explicitly direct agents to the
installed package guide. Dependency instructions are not guaranteed to be loaded
automatically: for example, [Codex discovers project instructions along the path
from the project root to its working directory](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
not by scanning every dependency.

These installed docs replace references to the old vendored `.altertable/runtime`
layout for apps using this package.

Adapt this template to the starter's actual files and scripts:

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

Edit app-owned source and import public package entries. Keep SQL and credentials
on the server, and import operation types with `import type` in browser code.
Do not edit installed package files. The connectivity screen is scaffolding,
not an example analysis.

Run the app's typecheck, lint, and build scripts. Inspect its findings and
interactions at phone and desktop widths, including loading, empty, error, and
stale states. Verify that the exploration answers the user's question.
```

A runnable port of the CLI starter lives in
[`examples/starter`](https://github.com/altertable-ai/data-app/tree/main/examples/starter). It consumes the built public
package and keeps its own app instructions. Updating CLI scaffolding to consume
the published package remains a separate migration.
