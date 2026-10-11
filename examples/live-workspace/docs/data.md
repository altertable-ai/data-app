# Data

Queries and defaults live in `../app.ts`; server operations validate inputs and
results in `../src/operations.ts`. The sources are live `app_pg.public` metadata.
App titles come from `data_app_versions` joined through `latest_version_id`.

Follow [operations](../../../docs/contract.md) and
[data context](../../../docs/data-context.md). Use bounded read-only queries and preserve typed predicates when filtering
the live result. Preserve UTC timestamps as offset-bearing strings for display
and export. Keep credentials on the server and live results out of Git.
