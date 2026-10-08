# Build this local data app

Read [AGENTS.md](https://github.com/altertable-ai/data-app/blob/main/AGENTS.md) first, then use the app files below.

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

Read the installed package's `AGENTS.md` and `docs/app-authoring.md` before
changing the app. Follow their task routes for views, variables, widgets, evidence,
and stories/export. Prefer generated controls and bound readings; keep static
context visible during requests. Update this app's instructions when a reusable
app-specific convention changes. Package internals remain dependencies.
