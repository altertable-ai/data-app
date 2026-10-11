# Live workspace explorer

A real-data app for designing this branch's UI features. It reads workspace,
environment, and data-app metadata from `app_pg` in **Altertable / production**.
It uses the branch's built public runtime rather than the CLI's bundled runtime.

From the repository root:

```fish
bun run build
bun install
altertable --profile altertable_production app check --dir examples/live-workspace --lakehouse
altertable --profile altertable_production app dev --dir examples/live-workspace --port 27420
```

Open <http://127.0.0.1:27420>. Rebuild the package and reinstall dependencies after
changing the runtime; restart the preview after a runtime build.

Search combines workspace and app names. Workspace, period, and “Has data apps”
filters update the same displayed source as charts, tables, CSV, and stories.
Queries read bounded live inventory; typed filters run on the local server because
the installed CLI proxy does not forward SQL parameters. The period uses each
record's latest update, not an activity log. Workspace app
and environment totals describe current inventory. Both record lists are capped
at 200 rows; dates are formatted from UTC metadata timestamps.

Edit `src/App.tsx` to try new compositions and `app.ts` for named SQL. See
[app authoring](../../docs/app-authoring.md). `app.json` is retained for CLI scope
validation. No lakehouse credentials or live data are stored in the app source.
