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
`<Skeleton>` supports custom fallback content.

## Choose a visualization

Choose the component by the user's question. Compose dataset visuals inside
`<VisualizationWidget>`; use `<MetricWidget>` for a headline value. Built-in
charts come from `/react/ui`; `<Ranking>`, `<Breakdown>`, and `<Comparison>`
are also available from `/react`.

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
compose inside authored widgets. Use [built-in charts](ui.md#charts) from `/react/ui`
inside `<VisualizationWidget dataset={dataset} source={result}>` for displayed rows.
The dataset owns evidence and empty copy; an empty row selection shows that fallback. A visualization's `views` declaration keeps
alternate-view selection shared with its inspection sheet. Give views stable IDs
and keep interactive state above the widget, since inspection may render it again.

`<TableWidget>` searches and paginates only the supplied rows. Larger datasets
need app-owned query-backed pagination with a stable sort and total count;
local pagination cannot fetch additional rows. The `limit`
mode shows a bounded preview without local pagination. Custom tables can use
`<DataTable>`, `<DataTableEmptyRow>`, `<DataTableTimestamp>`, and `<DataTableShare>`.

For custom controls, tables, and overlays, see [direct UI composition](ui.md).
For embedded theme and chrome, see [parent presentation](embed.md#parent-presentation).

`<TooltipProvider>` shares hover timing outside `<DataApp>`; the app already
provides it.

## Explore from widgets

Offer the next useful question when the data supports it. Declare named actions
on a dataset or metric, then pass them to the bound widget. Actions have explicit
effects: open details, filter a declared view, or descend through a hierarchy.
Evidence references explain definitions and queries; exploration actions change
what the reader investigates.

```tsx
const placeActions = places.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: ordersView,
    input: (row, displayedInput) => ({ ...displayedInput, placeId: row.id }),
  }),
  filter: action.filter({
    label: 'Filter to this region',
    when: row => row.level === 'region',
    target: salesView.hierarchy('geography'),
    values: row => ({ region: row.id }),
  }),
  descend: action.descend({
    target: salesView.breakdown('revenueBy'),
    member: row => row.id,
  }),
}));

<TableWidget dataset={places} source={source} actions={placeActions} />;
```

Use the action factory for contextual row and destination types. Stable object
keys supply action IDs; declaration order supplies menu order. One available
action is direct; several appear in Explore. Set the optional second argument
`{ primary: 'orders' }` only when a direct primary action is useful. All available actions
remain in the menu. A metric's row argument is `undefined`.
Use `metric.records()` to include contributing records in its existing inspection
sheet. Records becomes the first tab, followed by Glossary and Queries. The
metric keeps its usual heading trigger; no separate record-opening action is
needed. Register the [destination content](views.md#detail-destinations) on
`<DataApp details={[ordersDetail]}>`:

```tsx
const contributingOrders = orderCount.records({
  target: ordersView,
  input: displayedInput => displayedInput,
});

<MetricWidget
  metric={orderCount}
  source={source}
  records={contributingOrders}
/>;
```

The destination owns loading, errors, evidence, and completeness. Do not reuse a
capped dashboard preview when the destination promises all contributing records.
Use local pagination for a complete bounded result. Larger sources require
app-owned server paging; otherwise expose the limit or ask users to narrow scope
instead of silently truncating records. The record mapping receives the metric's displayed input,
including during dashboard updates. The inspection header uses the destination’s
`describeInput()` for the displayed scope; source context stays in Glossary.
Records load only when their tab is shown.
Record tables can use ordinary row detail actions to continue into an entity;
register those destinations on the same `<DataApp>`.

Detail mappings receive the **displayed input**, including during refreshes.
Detail sheets show contextual content without a separate app toolbar.
Register the target's [detail content](views.md#detail-destinations) on
`<DataApp>`. Match the source metric's inclusion rules and explain ratios,
distinct counts, or preview limits rather than implying every table sum
reconciles with its headline.

Filter mappings target a view's named scope variables or a bound hierarchy's
typed level IDs. Hierarchy transitions clear descendants centrally and preserve valid chart breakdowns. Ordinary view filters cannot write hierarchy state. The platform
validates the entire update before one history entry; omitted variables retain
their **currently applied** values. For ordinary scope variables, clear any
app-specific dependencies in the same mapping. Display variables cannot be changed
through ordinary view filters. Shared variables are
the explicit way to coordinate independently queried views; do not target
individual widget IDs.

For custom visuals, the second renderer argument supplies bound actions. Keep
domain rows when adapting chart inputs:

```tsx
<VisualizationWidget dataset={places} source={source} actions={placeActions}>
  {(rows, actions) => (
    <BarChart
      ariaLabel="Revenue by place"
      unit="USD"
      items={rows.map(row => ({ ...row, value: row.revenue }))}
      itemActions={actions}
    />
  )}
</VisualizationWidget>
```

`<BarChart>`, `<LineChart>`, `<AreaChart>`, and `<PieChart>` accept the same
`itemActions`. Pie slices activate the same actions as their legend items; keep
the built-in legend visible for keyboard access. Line and area points and pie legend items own pointer and keyboard
activation, menus, and a declared primary action’s More actions affordance.
A day drill can narrow the existing date range to that UTC day;
a value-band drill should pass a stable band ID that the operation validates
and resolves to server-side bounds. Fetch the matching population rather than
filtering a capped preview. Alternate visualization renderers receive the
same bound actions. For custom controls use `<ExplorationActionControl
 actions={actions} row={row} label={row.label} />`; imperative custom controls
can call `actions.run(id, row, trigger)` using IDs from `actions.items(row)`.
Initial loading offers no actions. Hierarchy row actions wait until displayed and applied hierarchy scope agree; descent also checks the chart breakdown.

See [hierarchical exploration](variables.md#hierarchical-exploration) and the
[commerce playground](https://github.com/altertable-ai/data-app/blob/main/dev/playground.tsx)
for the complete filter, breakdown, and detail workflow.
