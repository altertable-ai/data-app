# Live workspace explorer

Use the public runtime from this repository branch. App-owned files are `app.ts`,
`src/operations.ts`, `src/variables.ts`, `src/data-context.ts`, and `src/App.tsx`.
Follow the repository's [authoring guide](../../docs/app-authoring.md).

`app.ts` owns SQL, identity, and appearance. `app.json` retains the CLI's preview
scope. Credentials come from the CLI profile and remain on the local server.
Do not commit live query results or edit `.altertable/runtime`.

Run `altertable --profile altertable_production app check --lakehouse`, then verify
search, filters, dates, exports, and stories against live results.
