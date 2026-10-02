# Author a data app

Build an exploration that answers the user's question and a story that presents
its strongest findings. Include CSV export so readers can take the displayed
results into their own tools. Exploration, export, and story use the same
queries, definitions, and evidence.

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
Register inspected tables and fields with `defineDataIdentifiers()` and use
`<DataIdentifier>` when naming sources. Register terms and query evidence so
readers can inspect the source of each claim.

Connect visualizations with introductions and explanations. Use `<TextWidget>`
for a narrative panel with the standard widget frame, or `<TextContent>` for
borderless prose. Bind claims to `result.select((data, input) => ...)` so their
values and scope follow the displayed results through filter changes, refresh,
and failure.

| Task                                       | Documentation                                              |
| ------------------------------------------ | ---------------------------------------------------------- |
| Define queries, inputs, and result parsing | [Operations](contract.md)                                  |
| Build views, filters, and request states   | [React](react.md)                                          |
| Introduce and explain visualizations       | [Narrative text](react.md#narrative-text)                  |
| Find formatters and presentation helpers   | [App helpers](react.md#reuse-app-helpers)                  |
| Register source names                      | [Source identifiers](react.md#register-source-identifiers) |
| Choose date and field filters              | [Filter variables](react.md#time-views-and-field-filters)  |
| Handle refresh and stale results           | [Displayed results](react.md#preserve-displayed-results)   |
| Export displayed data as CSV               | [CSV export](react.md#export-displayed-data-as-csv)        |
| Enable precise feedback on custom content  | [Annotations](react.md#annotate-app-elements)              |
| Bind definitions and source evidence       | [Data context](react.md#bind-evidence)                     |

Use the exported types for configuration, appearance, formatting, and component
options. Declare configuration with `satisfies DataAppConfig` so appearance
fields and values are checked before bundling.

## Compose the layout

See the [layout contract](layout.md).

## Export the displayed results

Provide `DataApp.csvExport` in every analytical app. The request-backed API
requires a callback that selects an explicit filename and named datasets with ordered columns and raw
rows from the displayed snapshot. Follow [CSV export](react.md#export-displayed-data-as-csv)
and the [starter](../examples/starter-data-app/index.tsx); use the built-in toolbar
action rather than adding a custom download button.

Export every distinct analytical dataset at its displayed grain, including relevant
dimensions and measures. Reuse one dataset for charts or metrics derived from the
same rows. One dataset downloads as CSV; multiple datasets offer individual CSVs
and **Export all** as a ZIP archive. Use the displayed input for scope labels and filenames. Export the
bounded result the app already has; do not issue a different query or mix pending
filters into the visible result. Setup and static screens may omit export.

## Present the findings

Compose a [story](react.md#present-data-with-stories) from the exploration's
findings. Lead with the answer, then show the evidence and comparisons that
explain it. Select the findings that matter to the audience; do not turn every
row or chart into a step.

## Verify the app

Verify findings against the source and the user's question. Distinguish measured
zero, unavailable values, and empty results. Check filters, refresh, loading,
empty, error, and stale states, then present the story. Download CSV from the
standalone and embedded toolbar and verify its filename, columns, raw values,
and filter scope against the displayed result. Export and Present story must be
available once analytical results are shown; initial loading, empty, and initial
errors keep both actions visible and disabled. Inspect both experiences
at phone and desktop widths in light and dark themes.

Keep widget `annotationId` values unique and stable so user feedback continues to
identify the intended visual. When a user supplies annotation feedback, use its
comment as the requested change and its captured filters/text as context; check
the current app source when the feedback refers to an earlier version.

The app owns its queries, result parsing, business definitions, configuration,
and presentation. Credentials, authorization, and enforced access/query limits
stay backend-owned. Edit app-owned files; installed package files are dependencies.
