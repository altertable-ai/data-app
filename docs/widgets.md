# Widgets and narrative

## Choose a widget

Metrics, tables, and visualizations from `/react` consume view bindings and a source. For static displays, use
[direct UI composition](ui.md).
Manage requests in the [view and section](views.md); show skeletons for loading
readings without inventing values. Use `isEmpty` for the predicate and
`emptyFallback` for empty-result copy.

| Need                                             | Component               |
| ------------------------------------------------ | ----------------------- |
| Metric with formatting, comparison, and evidence | `<MetricWidget>`        |
| Custom chart or alternate chart views            | `<VisualizationWidget>` |
| Defined columns, local search, and pagination    | `<TableWidget>`         |
| Narrative panel                                  | `<TextWidget>`          |
| Borderless explanatory prose                     | `<TextContent>`         |
| One data-dependent phrase within static prose    | `<DataValue>`           |

Use [layout](layout.md) for `<Stack>`, `<Grid>`, and responsive `<GridItem>` spans.
`<Skeleton>` supports custom fallback content; `/react/ui` supplies
`<DataAppSkeleton>` for iframe startup.

## Annotate widgets

Widgets, including `<TextWidget>`, register the whole card as an annotation
target. Automatic IDs identify each rendered widget independently of its evidence.
Use a unique `annotationId` when feedback must retain its target across app changes.

Annotation mode supports scrolling, touch panning, and Page Up/Down. Click a
card or drag with a mouse or pen to select an area; keyboard area selection uses
Shift+Enter. Clicking outside the comment editor cancels unfinished text without
saving it or changing saved annotations. Select another target with a second click.
Escape first warns about unsaved text;
a second Escape cancels it.

## Choose a visualization

Choose the component by the reader's question. Compose dataset visuals inside
`<VisualizationWidget>`; use `<MetricWidget>` for a headline value. Built-in
charts come from `/react/ui`; `<Ranking>`, `<Breakdown>`, and `<Comparison>`
are also available from `/react`.

| Question or need                                          | Component          | Guidance                                                                                                           |
| --------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| How do categories compare?                                | `<BarChart>`       | Compare nonnegative category values; order by value for rank or by a meaningful category order.                    |
| Which items lead?                                         | `<Ranking>`        | Use a compact ordered list with values and optional detail. Tracks scale to the largest visible item, not a total. |
| How does a measure change over time?                      | `<LineChart>`      | Use ordered, equally spaced samples to emphasize the trend.                                                        |
| How large is the measure over time?                       | `<AreaChart>`      | Use the same samples as a line chart when filled magnitude relative to zero helps answer the question.             |
| What makes up the whole?                                  | `<PieChart>`       | Use a few mutually exclusive parts of one total; include the remainder as Other.                                   |
| What share of an observed total does each part represent? | `<Breakdown>`      | Use a compact display of values and shares with an explicit total, including when only some parts are shown.       |
| How do several measures relate on one plot?               | `<ComposedChart>`  | Compose bars, lines, areas, or scatter series; label units clearly and use separate axes for different units.      |
| How are two numeric measures related?                     | `<ScatterChart>`   | Use independent X/Y observations to explore relationships, clusters, and outliers.                                 |
| Where do users drop out of a sequence?                    | `<FunnelChart>`    | Use ordered counts from the same population reaching each successive step.                                         |
| Do cohorts return over time?                              | `<RetentionChart>` | Use query-defined rates and retained counts by numeric offset; mark incomplete periods.                            |
| Which paths do users take?                                | `<JourneyChart>`   | Use full paths with population counts and outcomes; explore branches step by step.                                 |
| How did one metric change between periods?                | `<Comparison>`     | Use the metric reading and its displayed comparison period.                                                        |
| What are the exact values or row details?                 | `<TableWidget>`    | Use a bound table for lookup, search, and precise comparisons.                                                     |

Prefer bars or a ranking when readers need to compare similarly sized categories;
use a pie for a simple composition question. Prefer a line when the trend is
enough; use area when the fill adds meaning. Keep exact values available in a
table when they matter. Follow the [chart input constraints](ui.md#charts). For multiple or mixed series,
use the [composed chart primitives](ui.md#composed-charts) within the same bound
visualization workflow.

Use widget `views` when a chart and another representation answer the same
question from the same dataset.

## Declare datasets and metrics

Bind reusable selections to the view. Declare evidence references directly;
the view validates them against its own context. A dataset's columns supply both formatted
table cells and raw CSV values. Widgets derive their readings, evidence, and empty fallback from the binding.

```tsx
const countries = activityView.dataset({
  name: 'Countries',
  select: data => data.countries,
  rowKey: row => row.country,
  evidence: { id: 'countries', glossaryIds: ['identities'] },
  columns: {
    country: { value: row => row.country },
    count: { value: row => row.count, format: { kind: 'count' } },
  },
});
const total = activityView.metric(
  {
    id: 'tracked-identities',
    glossaryId: 'identities',
    format: { kind: 'count', compact: true },
  },
  data => ({
    current: data.count,
    previous: data.previousCount,
  })
);
const content = activityView.content(result => (
  <Grid columns={2}>
    <MetricWidget metric={total} source={result} />
    <TableWidget dataset={countries} source={result} />
    <VisualizationWidget dataset={countries} source={result}>
      {rows => <CountryChart rows={rows} />}
    </VisualizationWidget>
  </Grid>
));
```

Column keys supply unique IDs and readable default labels. Use `label` for a
specific display/export header. Declare selectors, raw value accessors, and
row-key callbacks explicitly; row keys must be stable and unique.
Metric comparisons require a
view date binding. `read()` returns a loading-aware value for custom prose.
Pass the binding and `source={snapshot}` to reuse a widget in a story. Use the
source supplied by that binding's own view; reconstructed or foreign sources
are rejected before selection.
Selectors do not run during loading. Table search, pagination, descriptions, and
actions remain local choices. For custom cells, use `format: row => ...`; CSV
still uses the raw `value` accessor. Datasets default to “No results”; supply
`emptyFallback` for specific copy. See [export](stories-and-export.md).

## Narrative text

Use `<TextContent>` for prose within a page or custom layout, and `<TextWidget>`
when the explanation belongs in a titled panel alongside other widgets.

Give text a purpose: frame the question, explain how to interpret a comparison,
qualify a finding, or suggest what to explore next. Choose the content for the
reader's question.

For data-dependent text, pass `metric` or `dataset` and `source` to `<TextWidget>`.
It derives its title and evidence. A metric formats its current value by default;
use a child renderer for authored prose. Dataset renderers receive displayed rows,
including an empty selection, so they can explain zero activity.

Use `<DataValue metric={total} source={result} />` for a formatted value inside
static prose, or pass a dataset and row renderer. Its default loading fallback is
an inline skeleton. Use `<DataValue scope={result.scope} />` for a scope label.
All selectors use the displayed source; loading selectors do not run.
Use `<TextContent>` for static instructions; local filters should feed the same
filtered data to the text and its related visualization.

## Custom visuals and controls

`<Ranking>`, `<Breakdown>`, and `<Comparison>`
compose inside authored widgets. Use [built-in charts](ui.md#charts) from `/react/ui`
inside `<VisualizationWidget dataset={dataset} source={result}>` for displayed rows.
The dataset owns evidence and empty copy; an empty row selection shows that fallback. A visualization's `views` declaration keeps
alternate-view selection shared with its inspection sheet. Give views stable IDs
and keep interactive state above the widget, since inspection may render it again.

`<TableWidget>` searches and paginates only the supplied rows. Use query-backed
pagination with a stable sort and total count for larger datasets. The `limit`
mode shows a bounded preview without local pagination. Custom tables can use
`<DataTable>`, `<DataTableEmptyRow>`, `<DataTableTimestamp>`, and `<DataTableShare>`.

For custom controls, tables, and overlays, see [direct UI composition](ui.md).
For embedded theme and chrome, see [parent presentation](embed.md#parent-presentation).

`<TooltipProvider>` shares hover timing outside `<DataApp>`; the app already
provides it.
