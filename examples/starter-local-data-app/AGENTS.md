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

See [README.md](README.md) for setup and checks.
