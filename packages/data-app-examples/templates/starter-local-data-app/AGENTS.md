# Build this local data app

Read `node_modules/@altertable/data-app/docs/app-authoring.md` and use this project
as the selected scaffold. If dependencies are unavailable, read the
[version-matched recipe](https://github.com/altertable-ai/data-app/blob/v0.75.0/docs/app-authoring.md). <!-- x-release-please-version -->

| Task                                     | App-owned files                                          |
| ---------------------------------------- | -------------------------------------------------------- |
| Define queries and inputs                | `app.ts`, `src/operations.ts`, optional shared contracts |
| Build the exploration, export, and story | `src/App.tsx`                                            |
| Bind definitions and source evidence     | `src/data-context.ts`                                    |
| Change identity and appearance           | `app.ts`                                                 |
| Inject styles and mount React            | `src/main.tsx`                                           |
| Configure local serving                  | `src/server.ts`                                          |

See [README.md](README.md) for setup and checks.

Keep reusable app-specific conventions here.
