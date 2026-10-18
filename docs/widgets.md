# Widgets and narrative

## Choose a widget

Metrics, tables, and visualizations from `@altertable/data-app-react` consume view bindings and a source. For static displays, use
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
`<Skeleton>` supports custom fallback content.

## Choose a visualization

Choose the component by the user's question. Compose dataset visuals inside
`<VisualizationWidget>`; use `<MetricWidget>` for a headline value. Built-in
charts come from `@altertable/data-app-react/ui`; `<Ranking>`, `<Breakdown>`, and `<Comparison>`
are also available from `@altertable/data-app-react`.

| Question or need                                                          | Component          | Guidance                                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How do categories compare?                                                | `<BarChart>`       | Compare nonnegative category values; order by value for rank or by a meaningful category order.                                                                     |
| Which items lead?                                                         | `<Ranking>`        | Use a compact ordered list with values and optional detail. Tracks scale to the largest visible item, not a total.                                                  |
| How does a measure, including conversion rate, change over calendar time? | `<LineChart>`      | Use ordered, equally spaced samples to emphasize the trend.                                                                                                         |
| How large is the measure over time?                                       | `<AreaChart>`      | Use the same samples as a line chart when filled magnitude relative to zero helps answer the question.                                                              |
| What makes up the whole?                                                  | `<PieChart>`       | Use a few mutually exclusive parts of one total; include the remainder as Other.                                                                                    |
| What share of an observed total does each part represent?                 | `<Breakdown>`      | Use a compact display of values and shares with an explicit total, including when only some parts are shown.                                                        |
| How do several measures relate on one plot?                               | `<ComposedChart>`  | Compose bars, lines, areas, or scatter series; label units clearly and use separate axes for different units.                                                       |
| How are two numeric measures related?                                     | `<ScatterChart>`   | Use independent X/Y observations to explore relationships, clusters, and outliers.                                                                                  |
| Where does a population drop off across ordered steps?                    | `<FunnelChart>`    | Show counts and drop-off across ordered steps within a population; optionally compare populations. See [inputs and examples](ui.md#product-analytics-charts).       |
| Do cohorts return at elapsed intervals after a starting event?            | `<RetentionChart>` | Show return rates over elapsed intervals after a starting event; optionally compare cohorts or segments. See [inputs and examples](ui.md#product-analytics-charts). |
| Which event paths do populations follow, and where do they branch?        | `<JourneyChart>`   | Explore full paths with population counts and outcomes. See [inputs and examples](ui.md#product-analytics-charts).                                                  |
| How did one metric change between periods?                                | `<Comparison>`     | Use the metric result and its displayed comparison period.                                                                                                          |
| What are the exact values or row details?                                 | `<TableWidget>`    | Use a bound table for lookup, search, and precise comparisons.                                                                                                      |

Prefer bars or a ranking when users need to compare similarly sized categories;
use a pie for a simple composition question. Prefer a line when the trend is
enough; use area when the fill adds meaning. Keep exact values available in a
table when they matter. Follow the [chart input constraints](ui.md#charts). For custom combinations of series,
use the [composed chart primitives](ui.md#composed-charts) within the same bound
visualization workflow.

Use widget `views` when a chart and another representation answer the same
question from the same dataset.

## Declare datasets and metrics

Bind reusable selections to the view. Declare evidence references directly;
the view validates them against its own context. A dataset's columns supply both formatted
table cells and raw CSV values. Widgets derive their readings, evidence, and empty fallback from the binding.
Declare at least one dataset column. Metric selectors may return `previous`
only for views with a date binding, including `defineTimeView()`.

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
source supplied by that binding's own view. Table search, pagination, descriptions, and
actions remain local choices. For custom cells, use `format: row => ...`; CSV
still uses the raw `value` accessor. Datasets default to “No results”; supply
`emptyFallback` for specific copy. See [export](stories-and-export.md).

`<TableWidget>` automatically shows the count of matching supplied rows. Use
`count` for a server total; other widgets can receive a count from the displayed result.

Provide useful `emptyFallback` and `noMatchesFallback` copy. Local search offers
Clear search automatically. For server-filtered tables, supply `onClearFilters`
only while filters affecting that dataset are active, preserving unrelated filters,
search, and display settings.

```tsx
<TableWidget
  dataset={customers}
  source={source}
  onClearFilters={hasActiveCustomerFilters ? clearCustomerFilters : undefined}
/>
```

## Narrative text

Use `<TextContent>` for prose within a page or custom layout, and `<TextWidget>`
when the explanation belongs in a titled panel alongside other widgets.

Give text a purpose: frame the question, explain how to interpret a comparison,
qualify a finding, or suggest what to explore next. Choose the content for the
user's question.

For data-dependent text, pass `metric` or `dataset` and `source` to `<TextWidget>`.
It derives its title and evidence. A metric formats its current value by default;
use a child renderer for authored prose. Dataset renderers receive displayed rows,
including an empty selection, so they can explain zero activity.

Use `<DataValue metric={total} source={result} />` for a formatted value inside
static prose, or pass a dataset and row renderer. Its default loading fallback is
an inline skeleton. Use `<DataValue scope={result.scope} />` for a scope label.
Use `<TextContent>` for static instructions; local filters should feed the same
filtered data to the text and its related visualization.

## Custom visuals and controls

`<Ranking>`, `<Breakdown>`, and `<Comparison>`
compose inside authored widgets. Use [built-in charts](ui.md#charts) from `@altertable/data-app-react/ui`
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

## Exploration actions

Declare actions on their dataset or metric and pass them to its widget. Detail
mappings receive the displayed operation input, including during refreshes.
Both `children` and alternate-view `render` callbacks receive the displayed rows
and the same action resolver.

```tsx
const placeActions = places.actions(
  action => ({
    orders: action.detail({
      label: 'View orders',
      target: ordersView,
      input: (row, displayedInput) => ({ ...displayedInput, placeId: row.id }),
    }),
    filter: action.filter({
      label: 'Filter to this region',
      when: row => row.dimension === 'region',
      target: salesView.filter(),
      values: row => ({
        region: {
          kind: 'include',
          members: [{ kind: 'value', value: row.id }],
        },
      }),
    }),
    drill: action.filter({
      label: 'Drill down',
      when: row => row.dimension === 'region',
      target: salesView.filter(),
      values: row => ({
        region: {
          kind: 'include',
          members: [{ kind: 'value', value: row.id }],
        },
      }),
      breakdown: {
        target: salesView.breakdown('revenueBy'),
        value: () => 'country',
      },
    }),
  }),
  { primary: 'orders' }
);

<VisualizationWidget
  dataset={places}
  source={source}
  actions={placeActions}
  breakdown={salesView.breakdown('revenueBy')}
>
  {(rows, actions) => (
    <BarChart
      ariaLabel="Revenue by place"
      unit="USD"
      items={rows.map(row => ({ ...row, value: row.revenue }))}
      itemActions={actions}
    />
  )}
</VisualizationWidget>;
```

Keep domain fields when adapting chart items. Bar, line, area, pie slices, and
pie legend items share the same action contract. Chart marks keep a sole or
declared `primary` action direct. The full pie legend row and bar label open the
menu; bar labels use a small inline disclosure chevron.

Menus retain every available action and group copying after exploration actions.
The first copy action names the text it copies. Copy summary includes the displayed
label, formatted value, unit, and pie share. Successful copies are silent; failures
are announced and shown on the chart.
Right-click opens the menu at the pointer; Shift+F10 anchors it to the control.
Breakdown controls keep their selected choice visible and their accessible names.
Custom controls can compose `<ExplorationActionControl>` from `/react/ui`.

`<TableWidget actions={placeActions}>` adds row actions without changing the
dataset or its CSV export. `<MetricWidget>` accepts actions declared with
`metric.actions()`; metric action mappings receive `undefined` for the row and
the displayed operation input as their second argument. Actions must belong to
the metric or dataset rendered by the widget.

`view.filter()` targets scope variables. An optional `breakdown` explicitly updates
one chart's display choice in the same history entry. Filters preserve unrelated
selections. Filter actions wait for displayed and applied scope to agree; actions
that also change a breakdown check that chart's displayed choice. No filter change
implicitly changes another filter or chart.

A day drill passes its day. A value-band drill passes a stable band ID; validate
it in the destination operation and derive bounds there. Query matching records
rather than filtering a capped dashboard preview. See [detail destinations](views.md#detail-destinations).
