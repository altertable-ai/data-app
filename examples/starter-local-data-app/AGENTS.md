# Build this local data app

Read [AGENTS.md](https://github.com/altertable-ai/data-app/blob/main/AGENTS.md) first, then use the app files below.

| Task                                     | App-owned files                                |
| ---------------------------------------- | ---------------------------------------------- |
| Define queries and inputs                | `src/operations.ts`, optional shared contracts |
| Build the exploration, export, and story | `src/App.tsx`                                  |
| Bind definitions and source evidence     | `src/data-context.ts`                          |
| Change identity and appearance           | `app.ts`                                       |
| Inject styles and mount React            | `src/main.tsx`                                 |
| Configure local serving                  | `src/server.ts`                                |

Declare `queries` and `variables` on each operation and execute with
`query(id, values)`, using the same contract as hosted apps. Export the complete
maps with `getDataAppRegistration(operations)`. Keep SQL in declarations; Bun
builds statements for the CLI proxy. Share variable definitions with the UI in
a browser-safe module and import operation types with `import type`.

See [README.md](README.md) for setup and checks.
