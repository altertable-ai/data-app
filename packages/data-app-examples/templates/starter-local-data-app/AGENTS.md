# Build this local data app

Read `node_modules/@altertable/data-app/docs/app-authoring.md` and use this project
as the selected scaffold. If dependencies are unavailable, read the
[version-matched recipe](https://github.com/altertable-ai/data-app/blob/v0.77.0/docs/app-authoring.md). <!-- x-release-please-version -->

| Task                                       | App-owned files                                        |
| ------------------------------------------ | ------------------------------------------------------ |
| Define queries, filters, and operations    | `app.ts`, `src/operations.ts`, shared `src/filters.ts` |
| Compose app content and supported features | `src/App.tsx`                                          |
| Bind definitions and source evidence       | `src/data-context.ts`                                  |
| Change identity and appearance             | `app.ts`                                               |
| Inject styles and mount React              | `src/main.tsx`                                         |
| Configure local serving                    | `src/server.ts`                                        |

See [README.md](README.md) for setup and checks.

Keep reusable app-specific conventions here.
