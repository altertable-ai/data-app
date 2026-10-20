# Build this local data app

If dependencies are installed, read `node_modules/@altertable/data-app/AGENTS.md`
first. Otherwise, read the [version-matched SDK instructions](https://github.com/altertable-ai/data-app/blob/v0.72.0/AGENTS.md). <!-- x-release-please-version -->

| Task                                     | App-owned files                                          |
| ---------------------------------------- | -------------------------------------------------------- |
| Define queries and inputs                | `app.ts`, `src/operations.ts`, optional shared contracts |
| Build the exploration, export, and story | `src/App.tsx`                                            |
| Bind definitions and source evidence     | `src/data-context.ts`                                    |
| Change identity and appearance           | `app.ts`                                                 |
| Inject styles and mount React            | `src/main.tsx`                                           |
| Configure local serving                  | `src/server.ts`                                          |

See [README.md](README.md) for setup and checks.

Read the SDK's `docs/app-authoring.md` and follow its task routes. Search
`REFERENCE.md` for props and signatures. Use installed guides when available;
otherwise use the version tag linked above. Keep this file for reusable app-specific
conventions.
