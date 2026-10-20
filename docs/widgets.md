# Widgets and narrative

## Choose a widget

Metrics, tables, and visualizations from `@altertable/data-app-react` consume view bindings and a source. For static displays, use
[direct UI composition](ui.md).
Manage requests in [views](views.md).

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

| Question                         | Component and constraint                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Compare categories               | `<BarChart>` for nonnegative values; order by rank or meaningful category order |
| Show leaders                     | `<Ranking>`; tracks scale to the largest visible item                           |
| Show a time trend                | `<LineChart>` for equally spaced samples                                        |
| Show magnitude over time         | `<AreaChart>` when fill relative to zero adds meaning                           |
| Show parts of a whole            | `<PieChart>` for a few exclusive parts; include Other                           |
| Show shares of an observed total | `<Breakdown>` with an explicit total                                            |
| Combine measures or marks        | `<ComposedChart>`; label units and use separate axes when needed                |
| Relate two numeric measures      | `<ScatterChart>` with independent X/Y observations                              |
| Show ordered step drop-off       | `<FunnelChart>` with counts from one population                                 |
| Show return by elapsed interval  | `<RetentionChart>` with cohort counts and rates                                 |
| Explore event paths              | `<JourneyChart>` with full paths, counts, and outcomes                          |
| Compare periods                  | `<Comparison>` with a bound metric                                              |
| Inspect exact values             | `<TableWidget>` with a dataset binding                                          |

Use widget `views` for alternate representations of one dataset. Check
[chart input constraints](ui.md#charts) before adapting rows, and keep exact
values available in a table when they matter.

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

Column keys supply IDs and default labels; set `label` for a different header.
Keep row keys stable and unique. Custom cells use `format: row => ...`; CSV uses
the raw `value` accessor. Metric comparisons require a view date binding.
Reuse bindings in stories with `source={snapshot}` from the same view.

Tables search and paginate only supplied rows. Use query-backed pagination with a
stable sort and total `count` for larger datasets. Provide useful `emptyFallback`
and `noMatchesFallback` copy. Supply `onClearFilters` only while relevant server
filters are active, preserving unrelated selections.

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

For custom controls, tables, and overlays, see [direct UI composition](ui.md).

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

Keep domain fields when adapting chart items so action mappings retain IDs and
scope. Pass dataset actions to `<TableWidget>` or `<VisualizationWidget>`;
metric actions use `metric.actions()` and `<MetricWidget>`. Actions must belong
to the binding rendered by the widget. Metric mappings receive `undefined` for
the row and displayed input as their second argument.

`view.filter()` targets scope variables. An optional `breakdown` explicitly updates
one chart's display choice in the same history entry. Filters preserve unrelated selections. Declare chart breakdown choices
independently of scope filters.

A day drill passes its day. A value-band drill passes a stable band ID; validate
it in the destination operation and derive bounds there. Query matching records
rather than filtering a capped dashboard preview. See [detail destinations](views.md#detail-destinations).
