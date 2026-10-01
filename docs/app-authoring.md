# Author a data app

Build an exploration that answers the user's question and a story that presents
its strongest findings. Both use the same queries, definitions, and evidence.

## Inspect the data

Inspect the relevant catalogs, tables, and fields, their time coverage, and
existing definitions. Choose a question the available data can answer.

## Build the exploration

Choose the execution path:

| App                                | Guide                                   |
| ---------------------------------- | --------------------------------------- |
| Data app (hosted / remote / cloud) | [Single-file authoring](hosted-apps.md) |
| Local data app                     | [Local authoring](local-data-apps.md)   |

Lead with a supported finding and expose the relevant fields as filter variables. Use a date filter for questions worth exploring over time,
or a fixed period snapshot for a deliberate historical analysis.
Register terms and query evidence so readers can inspect the source of each claim.

| Task                                       | Documentation                          |
| ------------------------------------------ | -------------------------------------- |
| Define queries, inputs, and result parsing | [Operations](contract.md)              |
| Build views, filters, and request states   | [React](react.md)                      |
| Bind definitions and source evidence       | [Data context](react.md#bind-evidence) |

Use the exported types for configuration, appearance, formatting, and component
options.

## Present the findings

Compose a [story](react.md#present-data-with-stories) from the exploration's
findings. Lead with the answer, then show the evidence and comparisons that
explain it. Select the findings that matter to the audience; do not turn every
row or chart into a step.

## Verify the app

Verify findings against the source and the user's question. Distinguish measured
zero, unavailable values, and empty results. Check filters, refresh, loading,
empty, error, and stale states, then present the story. Inspect both experiences
at phone and desktop widths in light and dark themes.

The app owns its queries, result parsing, business definitions, configuration,
and presentation. Credentials, authorization, and enforced access/query limits
stay backend-owned. Edit app-owned files; installed package files are dependencies.
