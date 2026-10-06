# React

Import hooks, components, and UI helpers from `@altertable/data-app/react`.
React 19.2 or newer and React DOM 19.2 or newer are peer dependencies.

## Mount the app

`mountDataApp({ config, component })` mounts into `#root`, sets the document
title and language, attaches navigation to an available iframe transport, and
installs `<DataAppProvider>`. Uncaught React rendering errors are logged and
reported to the iframe host as fatal app failures. When mounting through another
framework, wrap the app in `<DataAppProvider>` yourself.

```tsx
import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';

injectDataAppStyles();
mountDataApp({ config, component: App });
```

Importing the package does not inject styles. For server rendering, call the
injector on the client before mounting or hydrating. With a restrictive CSP,
pass a permitted nonce; the first call sets it for the document. No CSS loader
or separate stylesheet asset is needed.

## Bind a view

```tsx
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  dateRangeVariable,
  DataApp,
  DataSection,
  Grid,
  MetricWidget,
  DataValue,
  Skeleton,
  VisualizationWidget,
  Ranking,
} from '@altertable/data-app/react';
import type { operations } from '#app/operations.ts';
import { calendar } from '#app/contracts.ts';
import { dataContext, trackedIdentities } from '#app/data-context.tsx';
import config from '#config';

const period = dateRangeVariable({
  key: 'period',
  contract: calendar,
  comparison: true,
  defaultValue: { kind: 'preset', id: 'last-30' },
});
const { defineDataView, useView } =
  createDataHooks(createDataClient<typeof operations>());
const activityView = defineDataView({
  operation: 'activity',
  variables: { period },
  input: ({ period }) => period,
  date: { variable: 'period', input: input => input },
  isEmpty: data => data.features.length === 0,
  empty: { title: 'No activity in this range' },
});
const featureEvidence = dataContext.evidence({
  id: 'feature-use',
  queryNames: [dataContext.queryNames.activity],
});
const content = activityView.content(result => (
  <Grid columns={2}>
    <MetricWidget
      metric={trackedIdentities}
      reading={result.metric(data => ({
        current: data.count,
        previous: data.previousCount,
      }))}
    />
    <VisualizationWidget
      title="Feature use"
      evidence={featureEvidence}
      reading={result.select(data => data.features)}
      isEmpty={features => features.length === 0}
      empty={{ title: 'No features' }}
      skeleton={{ variant: 'ranking', rows: 6 }}
    >
      {features => <Ranking items={features} />}
    </VisualizationWidget>
  </Grid>
));
function App() {
  const activity = useView(activityView);
  return (
    <DataApp
      config={config}
      dataContext={dataContext}
      request={activity}
      csvExport={({ data }) => ({
        filename: 'activity.csv',
        tables: [
          {
            name: 'Tracked identities',
            columns: ['Current count', 'Previous count'],
            rows: [[data.count, data.previousCount]],
          },
          {
            name: 'Feature use',
            columns: ['Feature ID', 'Count'],
            rows: data.features.map(feature => [feature.id, feature.value]),
          },
        ],
      })}
      story={({ data }) => [
        dataContext.finding({
          id: 'feature-use',
          headline: 'Feature use in the selected period',
          visual: <Ranking items={data.features} />,
          evidence: featureEvidence,
        }),
      ]}
    >
      <DataSection
        result={activity}
        emptyFallback={activity.empty}
        {...content}
      />
    </DataApp>
  );
}
```

Render static text immediately; skeletonize only dynamic content. Keep section
introductions outside request boundaries so they remain visible on empty and
error states.

Use `<DataSection>` for each independently fetched subtree and `view.content()`
to share its loading and ready layout. Refreshes retain displayed content.

Use `<DataValue>` for a dynamic value within static prose:

```tsx
<p>
  Orders in the last 7 days:{' '}
  <DataValue
    reading={result.select(data => data.weeklyOrders)}
    loadingFallback={<Skeleton inline />}
  >
    {count => formatCount(count)}
  </DataValue>
</p>
```

Bind the whole sentence when its wording depends on the result.

Use the same [date range contract](contract.md#shared-date-ranges) for the
operation and its view. For nested inputs, bind the range with
`input: input => input.period`.

Use `result.variables.bind(name)` for custom controls. Keep local-only filters
out of the operation's `input`.

For large tables, use query-backed pagination with a stable sort and total
count. Client pagination and search cover only the rows already returned.

Use `context.evidence(...)` for bound charts and tables. `<MetricWidget>` uses
its metric definition for the label, format, and evidence; keep view-specific
descriptions on the widget.

`<MetricWidget>` and `<Comparison>` share a metric reading. Comparisons
follow the displayed result's range.

Use the [app helpers](#reuse-app-helpers) for metric formats and values in tables,
charts, and custom views.

For manually managed requests, use `defineDataContent()` to share loading and
ready layouts.

## Layout

Use `<Stack>` for sections, `<Grid>` for peer widgets, and `<GridItem>` for spans.
They share the app layout gap and own responsive behavior. Follow the
[layout contract](layout.md) for spacing ownership and composition guidance.

## Narrative text

Use `<TextContent>` for prose within a page or custom layout, and `<TextWidget>`
when the explanation belongs in a titled panel alongside other widgets.

Give text a purpose: frame the question, explain how to interpret a comparison,
qualify a finding, or suggest what to explore next. Choose the content for the
reader's question and the decisions the exploration supports.

For data-dependent text, use `reading={result.select((data, input) => ...)}` and
provide `evidence`. Derive both the explanation and its scope from those displayed
values so it stays consistent with the visualizations while filters change.
Static instructions can use ordinary children; local filters should feed the same
filtered data to the text and its related visualization.

## Reuse app helpers

Use the shared helpers for common app tasks. Follow the entry points below to
find their exports, types, and usage constraints.

| Task                                                                                        | Entry point                                                                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Format numbers, counts, percentages, currency, date ranges, and plural labels (`pluralize`) | [Format helpers](https://github.com/altertable-ai/data-app/blob/main/src/core/format.ts)          |
| Choose chart colors                                                                         | [Chart colors](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/chartColor.ts)    |
| Search items and highlight matches                                                          | [Search helpers](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/searchItems.ts) |
| Read and synchronize URL query state                                                        | [URL state helpers](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/search.ts)   |
| Render timestamps, freshness, table shares, periods, and metric comparisons                 | [React exports](https://github.com/altertable-ai/data-app/blob/main/src/react/index.ts)           |
| Configure appearance and theme preferences                                                  | [Appearance helpers](https://github.com/altertable-ai/data-app/blob/main/src/core/appearance.ts)  |
| Build the app's scoped document title                                                       | [Configuration helpers](https://github.com/altertable-ai/data-app/blob/main/src/core/config.ts)   |

## Register source identifiers

Use `defineDataIdentifiers()` from `/react` to register exact catalog, schema,
table, and field names. Use `<DataIdentifier>` in descriptions and glossary
entries to render those source references consistently.

```tsx
import { defineDataIdentifiers } from '@altertable/data-app/react';

const identifiers = defineDataIdentifiers({
  tables: {
    events: {
      catalog: 'product_analytics',
      schema: 'analytics',
      name: 'events',
    },
  },
  columns: { identity: { table: 'events', name: 'identity_uuid' } },
});
const { DataIdentifier } = identifiers;

<DataIdentifier id="tables.events" />;
<DataIdentifier id="columns.events.identity" />;
```

Pass `identifiers.definitions` to `createDataContext()` so the context carries the
same source registry. Source identifiers name physical data; glossary entries
explain its business meaning, and query evidence records how it was queried.

## Bind evidence

```tsx
const queries = defineQueryNames({ activity: 'feature-activity' });
// In the server operation: queryNames: queries
const context = createDataContext(queries)({
  identifiers: identifiers.definitions,
  description: (
    <>
      Explore activity in <DataIdentifier id="tables.events" />.
    </>
  ),
  glossary: {
    identities: {
      term: 'Tracked identities',
      definition: (
        <>
          Distinct <DataIdentifier id="columns.events.identity" /> values.
        </>
      ),
      queryNames: [queries.activity],
    },
  },
});
const evidence = context.evidence({
  id: 'identities',
  glossaryIds: ['identities'],
  queryNames: [queries.activity],
});
const trackedIdentities = context.metric({
  id: 'actions',
  glossaryId: 'identities',
  label: 'Tracked identities',
  format: { kind: 'count' },
});
const finding = context.finding({
  id: 'activity',
  headline: 'What people do',
  visual: <ActivityChart />,
  evidence: { id: 'activity-evidence', queryNames: [queries.activity] },
});
```

Import `defineQueryNames()` from `/contract` and the context/identifier factories from `/react`. Use the same registry in `defineOperation({ queryNames: queries, ... })`. Unknown glossary/query references fail type checks and registry validation; the server also validates returned query names.

## Time views and field filters

`createDataHooks(client).defineTimeView()` owns the `period` variable, calendar
controls, and displayed-period label. Declare `time: { contract, defaultValue }`,
an operation, `isEmpty`, and `empty`. With no additional variables, its default
input is the calendar request. With additional variables, it is `{ period, ...variables }`.
Supply an `input` mapper for a different operation shape and `bindings` to extract
nested period or field-filter inputs. Mappings must preserve the selected values.

`dimensionFilter()` from `/contract` requires exactly one option source: fixed `options` or a `facet`.
Use `defineFacetFilter()` to bind a facet operation and its typed input. The generated
`<DimensionPicker>` preserves cached options during refresh and failure, offers
missing values separately, and retains selected values absent from a result with
zero counts. `<BarChart>` exposes values through tooltips.

## Preserve displayed results

The callback in `view.content()` receives the displayed result and its original
input during refreshes and failures. Use that input when labeling the data.

Previous data and evidence are retained only when the input changes within the
same operation. Switching to another operation shows its own cached response or
an initial loading/error state; it never inherits another operation's result.

Operation and facet caches are scoped to the `DataClient` instance. Hooks created
from the same client share queries; separate clients do not share results, stale
data, or cancellation even under one provider. Keep client instances stable
across renders to preserve their cache.

`<Comparison>` compares a metric across periods, and `<BarChart>` displays
bars with tooltips for each category.

## Findings and inspection

Data display widgets share one frame:

- `<DataWidget>` provides the base card, heading, actions, feedback, and inspection.
- `<VisualizationWidget>` uses that card for any data display, including charts,
  tables, and metrics. It supports alternate views, an `insight`, and a `footer`
  for controls placed before the insight.
- `<MetricWidget>` and `<TableWidget>` use `<VisualizationWidget>` with their
  own display content. They retain metric formatting and comparison behavior,
  and table columns, search, and pagination respectively.
- `<TextWidget>` is a sibling of `<VisualizationWidget>`: it uses `<DataWidget>`
  directly with `<TextContent>` for narrative prose.

Use `<VisualizationWidget>` around a custom data display; use `<DataWidget>`
when composing a different kind of panel.

`<DataWidget>` composes a body, toolbar feedback, and footer. Widgets and their
inspection sheets render the same visual and controls. Keep interactive state
above both mounts when authoring custom children.

When a trusted parent supplies [parent presentation](embed.md#parent-presentation),
`<DataApp>` follows its resolved theme and suppresses local theme controls,
including in presentations. On an embedded surface (`surface: 'embedded'`),
only toolbar actions remain above the app body; the title, scope, description, and
footer are omitted. Variables and request states remain available.

## Present data with stories

Include a story in every analytical app. Stories turn the exploration's findings
into a presentation. Set the `story` prop on `<DataApp>`
to enable **Present story** in the toolbar; use `<PresentStory>` directly for a
custom shell. Start from the [data app starter](../examples/starter-data-app/index.tsx).

Return one to four findings with a headline, a visual, and registered source
evidence. Use `context.finding()` to bind the evidence.

The callback receives the displayed data and its original input, including
during refresh or failure. Derive the story from that snapshot so it agrees with
the visible exploration. Initial loading, empty results, and initial errors have
no story to present; the toolbar keeps its story action visible and disabled.

## Export displayed data as CSV

Every request-backed `<DataApp>` requires `story` and `csvExport`. Select all distinct named datasets
from the displayed snapshot so the built-in **Export** action is available
whenever analytical results are shown. Include this alongside the app's story;
setup and static shells may omit it. One dataset downloads directly as CSV. Multiple
datasets offer individual CSV downloads and **Export all** as a ZIP archive.
While no displayed snapshot is available, the export action stays visible and disabled.

Example:

```tsx
<DataApp
  config={config}
  dataContext={dataContext}
  request={result}
  story={story}
  csvExport={({ data, input }) => ({
    filename: `counts-${input.groupName || 'all'}.csv`,
    tables: [
      {
        name: 'Sample counts',
        columns: ['Group', 'Sample count'],
        rows: data.map(row => [row.groupName, row.sampleCount]),
      },
    ],
  })}
>
  <DataSection
    result={result}
    emptyFallback={result.empty}
    loadingFallback={<ResultsSkeleton />}
  >
    {(data, input) => <Results data={data} input={input} />}
  </DataSection>
</DataApp>
```

## Line and area charts

`<LineChart>` and `<AreaChart>` use the same API as `<BarChart>`:
`items`, `unit`, `ariaLabel`, and optional
`formatValue`. Each item has a unique nonempty `id`, a `label`, and a finite
numeric `value`. Samples are equally spaced in the supplied order; fill missing
periods explicitly when showing a time series. Negative values are supported,
and the area fill extends to zero. A single sample renders a point; empty items
show “No data”. Long series scroll horizontally.

```tsx
<VisualizationWidget
  title="Daily events"
  visual={
    <LineChart items={days} unit="events" ariaLabel="Daily event trend" />
  }
/>
```

All five charts show a tooltip on hover. Chart points are skipped by Tab and
do not open tooltips on keyboard focus. On touch screens, tap a point to
show its tooltip, then tap it again or tap outside to dismiss. Escape dismisses
a tooltip; scrolling the page or a nested container also dismisses it. Each point has an accessible label
with its values, even when its tooltip is closed. There is no persistent
selection state to manage. Custom visuals can use `<Tooltip variant="chart">`
and its `onOpenChange` callback to coordinate emphasis with tooltip visibility.
Tooltips use the shared chart styling and stay
inside the viewport, including in widget inspection panels.

## Pie charts

`<PieChart>` uses the same `items`, `unit`,
`ariaLabel`, and optional `formatValue` API as `<BarChart>`. It shows shares of
**the sum of supplied values**. Supply mutually exclusive categories and include
an Other category if needed to represent the whole. Values must be finite and
nonnegative; IDs must be unique and nonempty. Prefer a few distinct categories.

Hover a slice or its legend label to inspect its value and share. The
inspected slice keeps its color while the others fade. Legend labels also
support touch tooltips.
Zero values remain in the legend without a slice; an all-zero series shows a
neutral empty circle, and an empty series shows “No data”. Colors use the app’s
chart palette in item order. Compose it inside `<VisualizationWidget>`.

## Scatter charts

`<ScatterChart>` positions independent observations by numeric X and Y values.
Pass `items` with unique nonempty `id`, `label`, and finite `x` and `y` values,
plus `ariaLabel`. Name the axes with
`xLabel`, `yLabel`, `xUnit`, and `yUnit`; optionally format values with `formatX`
and `formatY`. Both axes use linear scales that include zero and support negative
values. Empty data shows “No data”; constant axes remain valid.

```tsx
<ScatterChart
  items={workspaces}
  xLabel="Request volume"
  yLabel="Response time"
  xUnit="requests"
  yUnit="ms"
  ariaLabel="Workspace performance"
/>
```

Tooltips show the observation label and both named coordinates with their units.
Each observation retains an accessible label. Compose the chart inside
`<VisualizationWidget>`.
