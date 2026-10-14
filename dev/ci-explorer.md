# CI job explorer

[ci-explorer.tsx](ci-explorer.tsx) is a single-file app built against this branch's
public APIs. It reads the Altertable organization's verified `ci.main.job_runs`
source for October 7–13, 2026 UTC.

- `app.defineHierarchy()` declares Repository → Workflow → Job. Registered
  queries supply options and validate selected members under their parents.
- `hierarchy.input()` attaches that contract to the job operation.
- `view.hierarchy()` binds filter and descent actions to the view.
- Dataset actions open matching records from a hierarchy member, UTC day, or
  outcome. Pie slices and legend items use the same action.
- `metric.records()` adds Records before Glossary and Queries in the existing
  inspection sheet. Failed-job records apply the metric's failure predicate.
- The overview derives every chart and metric from one complete job population.
  The detail view reuses the same operation with narrower input. A 20,000-row
  guard rejects oversized populations instead of truncating records.

The local showcase uses a read-only snapshot retrieved on October 14, 2026:
5,067 executions, including 289 failures. Snapshot rows and temporary preview
infrastructure are outside the repository; the app source contains SQL, not
embedded production rows or credentials. Missing repository values remain
explicitly unrecorded; negative durations display as unavailable.

The source is ready for the hosted runtime once it includes this branch's
hierarchy and detail APIs. The current hosted validator does not support them.

The CI hierarchy owns shared selections. The chart owns `jobsBy`, a separate
URL variable created with `hierarchy.breakdown()`. Its header selects the breakdown;
the Filters sheet and floating bar describe only the included population.
