# View authoring

Lead with a supported finding and provide useful ways to explore the question.
Check actual content at phone and desktop widths in both themes.

Read `node_modules/@altertable/data-app/docs/react.md` for typed views,
variables, request states, skeletons, metrics, evidence, and Present steps.
Use `createDataClient<typeof operations>()` with a type-only registry import.
The same call is the hosted path.
Keep the stylesheet import in `src/main.tsx`.

Replace `GettingStarted` in `src/App.tsx` with a view of your operation's result.
Distinguish measured zero, unavailable values, and empty results. Preserve the
input associated with displayed data while refreshing or showing an error.
Define terms and query evidence in `src/data-context.ts`.
