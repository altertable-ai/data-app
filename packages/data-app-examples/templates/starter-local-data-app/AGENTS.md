# Build this local data app

If dependencies are installed, read `node_modules/@altertable/data-app/AGENTS.md`
first. Otherwise, read the [version-matched SDK instructions](https://github.com/altertable-ai/data-app/blob/v0.72.0/AGENTS.md). <!-- x-release-please-version -->
Then use the app files below. Browse the latest
[SDK instructions](https://github.com/altertable-ai/data-app/blob/main/AGENTS.md) on GitHub.

| Task                                     | App-owned files                                          |
| ---------------------------------------- | -------------------------------------------------------- |
| Define queries and inputs                | `app.ts`, `src/operations.ts`, optional shared contracts |
| Build the exploration, export, and story | `src/App.tsx`                                            |
| Bind definitions and source evidence     | `src/data-context.ts`                                    |
| Change identity and appearance           | `app.ts`                                                 |
| Inject styles and mount React            | `src/main.tsx`                                           |
| Configure local serving                  | `src/server.ts`                                          |

See [README.md](README.md) for setup and checks.

## Focused guidance

Read the SDK's `docs/app-authoring.md` before changing the app, and search its
`REFERENCE.md` for props and signatures. Use the installed package when available;
otherwise follow these files in the same version tag as the instructions above. Follow their task routes for views, variables, widgets, evidence,
and stories/export. Prefer generated controls and bound readings; keep static
context visible during requests. Update this app's instructions when a reusable
app-specific convention changes. Package internals remain dependencies.
