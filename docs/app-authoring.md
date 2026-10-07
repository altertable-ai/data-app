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
borderless prose. Render static titles, descriptions, and instructions immediately. Use metric and dataset
bindings for dynamic values and `<DataValue>` for values within static prose.
Skeletonize only the content that needs data. Reuse bindings and the displayed
source in narrative so values, formatting, and evidence follow filter changes,
refresh, and failure.

Use compact counts for headline metrics and chart labels, full counts for precise
table comparisons, and raw numbers for exports. Declare formatting on bindings
and reuse package helpers; see [format values](formatting-and-appearance.md#format-values).

| Task                                             | Documentation                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Choose components, CSS tokens, and styling hooks | [Styling](styling.md)                                             |
| Define queries, inputs, and result parsing       | [Operations](contract.md)                                         |
| Build views, filters, and request states         | [Views](views.md)                                                 |
| Introduce and explain visualizations             | [Narrative text](widgets.md#narrative-text)                       |
| Find formatters and presentation helpers         | [App helpers](formatting-and-appearance.md)                       |
| Register source names                            | [Source identifiers](data-context.md#register-source-identifiers) |
| Choose date and field filters                    | [Filter variables](variables.md)                                  |
| Handle refresh and stale results                 | [Displayed results](views.md#preserve-displayed-results)          |
| Export displayed data as CSV                     | [CSV export](stories-and-export.md#export-displayed-data-as-csv)  |
| Render widgets and custom visuals                | [Widgets](widgets.md)                                             |
| Bind definitions and source evidence             | [Data context](data-context.md#bind-evidence)                     |

Declare reusable [datasets and metrics](widgets.md#declare-datasets-and-metrics)
on the view so tables, exports, and stories share values and evidence.

Every data app supplies a [story and CSV export](stories-and-export.md)
from the displayed result. Export all distinct datasets at their displayed grain;
reuse a dataset when several visuals derive from the same rows. Present the
findings that answer the reader's question, rather than every row or chart.
Use the [standard layout](layout.md) and built-in toolbar actions.

### Organize the exploration

Use sections for a focused question and for findings readers should compare
side by side. Add app-level `<Tabs>` from `/react/ui` when the exploration has
distinct analytical questions, such as Overview, Retention, and Segments, each
with its own context and group of widgets. Lead with the most useful overview
and label tabs by the question or subject they explore.

Use `<VisualizationWidget>`'s `views` for alternate representations of the same
dataset, such as a chart and its rows. Keep these choices within the widget;
use filter variables when the reader is changing the data scope.

Navigation tabs, widget views, and declared data views have different roles.
A declared view owns inputs, requests, and displayed results; a tab does not
require a separate data view. Keep related datasets in one view for a coherent
snapshot. Use independent views and `<DataSection>` boundaries when content
needs separate requests. Keep filter placement consistent across tabs and make
each filter's scope clear. Derive findings, story, and export from the displayed
results and their inputs.

Choose each visual for the question it answers; see
[visualization selection](widgets.md#choose-a-visualization).

## Verify the app

Follow the [UI quality contract](ui-quality.md) for hierarchy, responsive
composition, typography, and control states.

Verify findings against the source and the user's question. Distinguish measured
zero, unavailable values, and empty results. Check filters, refresh, loading,
empty, error, and stale states, then present the story. Download CSV from the
standalone and embedded toolbar and verify its filename, columns, raw values,
and filter scope against the displayed result. Export and Present story must be
available once results are shown; initial loading, empty, and initial
errors keep both actions visible and disabled. Inspect both experiences
at phone and desktop widths in light and dark themes.

Keep credentials, authorization, and enforced query limits in the host/backend.
Edit app-owned files; installed package files are dependencies.
