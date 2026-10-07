# Widgets and narrative

## Choose a widget

Metrics and tables from `/react` consume view bindings and a source. For static displays, use
[direct UI composition](ui.md).
Manage requests in the [view and section](views.md); show skeletons for loading
readings without inventing values. Use `isEmpty` for the predicate and
`emptyFallback` for empty-result copy.

| Need                                             | Component               |
| ------------------------------------------------ | ----------------------- |
| Metric with formatting, comparison, and evidence | `<MetricWidget>`        |
| Custom chart or alternate chart views            | `<VisualizationWidget>` |
| Defined columns, local search, and pagination    | `<TableWidget>`         |
| Custom content in the standard widget frame      | `<DataWidget>`          |
| Narrative panel                                  | `<TextWidget>`          |
| Borderless explanatory prose                     | `<TextContent>`         |
| One data-dependent phrase within static prose    | `<DataValue>`           |

Use [layout](layout.md) for `<Stack>`, `<Grid>`, and responsive `<GridItem>` spans.
`<Skeleton>` supports custom fallback content; `/react/ui` supplies
`<DataAppSkeleton>` for iframe startup.

## Declare datasets and metrics

Bind reusable selections to the view. A dataset's columns supply both formatted
table cells and raw CSV values. Widgets derive their readings, evidence, and empty fallback from the binding.

```tsx
const countries = activityView.dataset({
  name: 'Countries',
  select: data => data.countries,
  rowKey: row => row.country,
  evidence: countryEvidence,
  columns: {
    country: { value: row => row.country },
    count: { value: row => row.count, format: { kind: 'count' } },
  },
});
const total = activityView.metric(trackedIdentities, data => ({
  current: data.count,
  previous: data.previousCount,
}));
const content = activityView.content(result => (
  <Grid columns={2}>
    <MetricWidget metric={total} source={result} />
    <TableWidget dataset={countries} source={result} />
  </Grid>
));
```

Column keys supply unique IDs and readable default labels. Use `label` for a
specific display/export header. Declare selectors, raw value accessors, and
row-key callbacks explicitly; row keys must be stable and unique.
Metric comparisons require a
view date binding. `read()` returns a loading-aware value for custom visuals;
Pass the binding and `source={snapshot}` to reuse a widget in a story.
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

For data-dependent text, use `reading={result.select((data, input) => ...)}` and
provide `evidence`. Derive both the explanation and its scope from those displayed
values so it stays consistent with the visualizations while filters change.
Use `<TextContent>` for static instructions; local filters should feed the same
filtered data to the text and its related visualization.

## Custom visuals and controls

`<Ranking>`, `<Breakdown>`, `<BarChart>`, and `<Comparison>`
compose inside authored widgets. A visualization's `views` declaration keeps
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
