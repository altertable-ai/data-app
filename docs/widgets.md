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

Use `<Stack>` for reading order and `<Grid>` for peers. Read [layout](layout.md)
only when changing spans or shell composition.
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

Continue the starter's `sampleCountsView`. Use `<BarChart>` from
`@altertable/data-app-react/ui`.
Bind reusable selections to the view. Declare evidence references directly;
the view validates them against its own context. A dataset's columns supply both formatted
table cells and raw CSV values. Widgets derive their readings, evidence, and empty fallback from the binding.
Declare at least one dataset column. Metric selectors may return `previous`
only for views with a date binding, including `defineTimeView()`.

```tsx
// ... sampleCountsView and imports
const sampleCounts = sampleCountsView.dataset({
  name: 'Sample counts',
  select: rows => rows,
  rowKey: row => row.groupName,
  evidence: { id: 'counts-by-group', glossaryIds: ['sampleCount'] },
  columns: {
    groupName: { label: 'Group', value: row => row.groupName },
    sampleCount: { value: row => row.sampleCount, format: { kind: 'count' } },
  },
});
const totalSamples = sampleCountsView.metric(
  {
    id: 'total-samples',
    glossaryId: 'sampleCount',
    label: 'Total samples',
    format: { kind: 'count', compact: true },
  },
  rows => ({ current: rows.reduce((sum, row) => sum + row.sampleCount, 0) })
);
const sampleContent = sampleCountsView.content(result => (
  <Grid columns={2}>
    <MetricWidget metric={totalSamples} source={result} />
    <TableWidget dataset={sampleCounts} source={result} />
    <VisualizationWidget dataset={sampleCounts} source={result}>
      {rows => (
        <BarChart
          ariaLabel="Sample counts by group"
          unit="samples"
          items={rows.map(row => ({
            ...row,
            id: row.groupName,
            label: row.groupName,
            value: row.sampleCount,
          }))}
        />
      )}
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

Use `<DataValue metric={totalSamples} source={result} />` for a formatted value inside
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

Use custom controls, tables, or overlays only when bound components cannot
express the requirement; see [direct UI composition](ui.md).

## Exploration actions

Declare actions on their dataset or metric and pass them to its widget. Detail
mappings receive the displayed operation input, including during refreshes.
Both `children` and alternate-view `render` callbacks receive the displayed rows
and the same action resolver.

```tsx
// ... sampleCountsView, sampleCounts, and groupView
const groupActions = sampleCounts.actions(
  action => ({
    group: action.detail({
      label: 'View group',
      target: groupView,
      input: row => ({ groupName: row.groupName }),
    }),
  }),
  { primary: 'group' }
);

const sampleContent = sampleCountsView.content(result => (
  <VisualizationWidget
    dataset={sampleCounts}
    source={result}
    actions={groupActions}
  >
    {(rows, actions) => (
      <BarChart
        ariaLabel="Sample counts by group"
        unit="samples"
        items={rows.map(row => ({
          ...row,
          id: row.groupName,
          label: row.groupName,
          value: row.sampleCount,
        }))}
        itemActions={actions}
      />
    )}
  </VisualizationWidget>
));
```

`groupView` is the destination from the detail-view example.
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
