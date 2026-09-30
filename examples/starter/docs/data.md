# Data authoring

Inspect catalogs, time coverage, and existing definitions before selecting an
exploration. Use bounded queries and observed results.

| File                  | Owns                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `app.json`            | Title, verified scope, and appearance.                                |
| `src/operations.ts`   | Server-side queries, input/output validation, and fixed check inputs. |
| `src/contracts.ts`    | Optional browser-safe input parsers and date range contracts.         |
| `src/data-context.ts` | Description, glossary, named queries, and source identifiers.         |
| `src/App.tsx`         | Findings, controls, and request states.                               |

Read `node_modules/@altertable/data-app/docs/contract.md` to define named
operations. Credentials and SQL stay on the server. Browser code imports the
operation registry with `import type`; share input contracts in a separate module.
Use a date variable for ongoing questions and a fixed period for deliberate
historical explorations. Verify source identity and available coverage before
labeling the app's scope.

The connection operation checks SQL access only. It does not establish access to
particular datasets or supply an analytical finding.
