# React

Import hooks, components, and UI helpers from `@altertable/data-app/react`.
Import `@altertable/data-app/react/styles.css` once in the browser entry.
React 19.2 or newer and React DOM 19.2 or newer are peer dependencies.

`mountDataApp({ config, component })` mounts into `#root`, sets the document
title and language, attaches navigation to an available iframe transport, and
installs `DataAppProvider`. When mounting through another
framework, wrap the app in `DataAppProvider` yourself.

## Find UI by task

All of these APIs are exported from `/react`. Each component's stylesheet lives beside its implementation.

| Task                                              | Start here                                                                                                                                                                                                       | Related APIs                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary request and page shell                    | [DataApp](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/DataApp.tsx)                                                                                                                          | AppLayout, AppHeader, AppToolbar, AppFooter, AppScope, ThemeToggle                                                                                                                                                                                 |
| Initial connection check                          | [GettingStarted](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/GettingStarted.tsx)                                                                                                            | Pair with `connectionCheck()` from `/contract`                                                                                                                                                                                                     |
| Arrange content                                   | [Grid](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Grid.tsx), [Stack](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Stack.tsx)                                           | DataWidget                                                                                                                                                                                                                                         |
| Show a key number                                 | [MetricWidget](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/MetricWidget.tsx)                                                                                                                | ComparisonVisual                                                                                                                                                                                                                                   |
| Show charts and collections                       | [VisualizationWidget](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/VisualizationWidget.tsx), [TableWidget](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/TableWidget.tsx) | DataTable, Ranking, Breakdown, chartColor                                                                                                                                                                                                          |
| Handle a request's loading, error, and stale data | [DataSection](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/DataSection.tsx)                                                                                                                  | DataBoundary, DataViewToast, EmptyState, StatusPanel, Skeleton                                                                                                                                                                                     |
| Show freshness and refresh                        | [UpdatedAt](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/UpdatedAt.tsx), [AppToolbar](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/AppToolbar.tsx)                       | RefreshRegion, LiveControl                                                                                                                                                                                                                         |
| Bind filters to the URL                           | [variables](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/variables.ts), [DateRangePicker](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/DateRangePicker.tsx)              | Combobox, PeriodSummary, Tabs, useViewTab                                                                                                                                                                                                          |
| Search a loaded collection                        | [searchItems](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/searchItems.ts), [SearchMatch](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/SearchMatch.tsx)                  | SearchField                                                                                                                                                                                                                                        |
| Explain context, glossary, and queries            | [AboutData](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/AboutData.tsx), [DataContext](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/data-context.ts)                     | [GlossaryDefinition](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/GlossaryDefinition.tsx), GlossaryExplanation, [defineDataIdentifiers](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/data-identifiers.tsx) |
| Present loaded findings                           | [PresentStory](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/PresentStory.tsx)                                                                                                                | StoryFinding                                                                                                                                                                                                                                       |
| Build custom controls and overlays                | [Button](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Button.tsx), [Sheet](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Sheet.tsx)                                       | IconButton, Tooltip, HelpPopover, Kbd                                                                                                                                                                                                              |

## Bound views and widgets

| Definition        | Runtime owns                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defineOperation` | Input/output validation, check inputs, query limits and cancellation; `query(name, sql)` accepts registered names and records executed evidence. |
| `defineDataView`  | URL variables, operation input, emptiness and the primary date binding. `useView` connects the result and controls to `DataApp`.                 |
| `DataApp`         | Header, variable bar, refresh state, stale-result notice and dimming, default inspection empty states.                                           |
| `view.content`    | One loading/ready layout. `result.select` never evaluates loading data; `result.metric` binds comparisons to the displayed input.                |
| `context.metric`  | Label, numeric format, glossary evidence and optional direction of improvement.                                                                  |
| `WidgetViewTabs`  | Valid, unique selection IDs and a required empty state per tab.                                                                                  |

SQL and business definitions belong to the app. Hosted adapters authorize every request; local development can use the CLI proxy. SQL disclosure also requires server permission.

A measured zero and unavailable data have different meanings. Metric readings use `null` for an unavailable previous value. The app defines whether a result is empty. `Breakdown` shows parts of a total; `Ranking` scales against its largest value. Percent formats accept ratios.

## Bind a view

```tsx
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  dateRangeVariable,
  DataApp,
  Grid,
  MetricWidget,
  VisualizationWidget,
  Ranking,
} from '@altertable/data-app/react';
import type { operations } from '#app/operations.ts';
import { calendar } from '#app/contracts.ts';
import { dataContext, actions } from '#app/data-context.tsx';
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
      metric={actions}
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
      {...content}
    />
  );
}
```

The `date` binding identifies the controlling variable and extracts its range from the operation input. Nested inputs use, for example, `input: (input) => input.period`. The runtime rejects mappings that silently change the selected range or comparison. Non-date views supply `describeInput`; date views can override it when other inputs also need describing.

The shared calendar lives in a browser-safe module:

```ts
import { defineDateRangeContract } from '@altertable/data-app/contract';
export const calendar = defineDateRangeContract({
  minDate: '2026-01-01',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
// Server operation: input: calendar.parseRequest
```

`useView` generates controls for date, text and fixed-option select variables; custom controls use `result.variables.bind(name)`. `input` chooses which variables reach the operation, so local search can stay local. The callback in `view.content` receives the displayed result, including its original input during refreshes and failures. Hooks belong in the enclosing component.

`TableWidget` also accepts `reading={result.select((data) => data.rows)}` and optional `skeletonRows`. Columns and empty states are declared once for both loading and ready layouts. Bounded tables default to 10 rows per page with a bottom footer shared with inspection. Set `pagination={{ pageSize: 8 }}` to change the page size or `pagination={false}` to show all rows. Search runs before pagination; the footer counts only the supplied rows. `limit` remains a separate, mutually exclusive display cap. Large catalogs need query-backed pagination with a stable sort and total count.

Bound `VisualizationWidget` and `TableWidget` calls require `evidence` from `context.evidence(...)`. A bound `MetricWidget` gets evidence from its metric definition. Evidence must name at least one glossary entry or query. Static widgets may omit it.

`MetricWidget` and `ComparisonVisual` both accept the same `metric` and `reading`. The comparison is enabled by the displayed result's range. The definition supplies formatting and evidence; a reading cannot override those or provide a second value. `favorableDirection` is optional; changes are neutral until the author defines whether up or down is favorable.

`defineDataContent` remains available for manually managed requests. Its optional `{ date: (input) => rangeRequest }` binds comparison readings. `DataSection` handles independent requests. Low-level widgets, tabs and layout components remain available for custom interfaces.

## Bind evidence

```tsx
const queries = defineQueryNames({ activity: 'feature-activity' });
// In the server operation: queryNames: queries
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
const actions = context.metric({
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

Import `defineQueryNames` from `/contract` and the context/identifier factories from `/react`. Use the same registry in `defineOperation({ queryNames: queries, ... })`. Unknown glossary/query references fail type checks and registry validation; the server also validates returned query names. Physical source identity stays in the identifier registry for future linking.

## Authoring constraints

- Date views declare `date: { variable: "period", input: (input) => input }`, or supply `describeInput` for a non-date view.
- Numeric metrics use `value={count} format={{ kind: "count" }}`. Custom formatted JSX or strings use `content={...}` instead of `value`.
- Supply `empty` to secondary `DataSection` requests or pass a bound `useView` result. A primary `DataApp` accepts it either from `useView` or as an explicit prop.
- For alternate views of the same bound result, pass `views={[{ id, label, render }]}` and `viewLabel` to `VisualizationWidget`. Its required `isEmpty` and `empty` apply to the whole result; the widget owns selection. Use `WidgetViewTabs` directly only when views have independent empty states.
- Variable URL keys cannot use `view`, `about`, `tab`, `present`, or `step`.

## Time views and dimension filters

`createDataHooks(client).defineTimeView` owns the `period` variable, calendar
controls, and displayed-period label. Declare `time: { contract, defaultValue }`,
an operation, `isEmpty`, and `empty`. With no additional variables, its default
input is the calendar request. With additional variables, it is `{ period, ...variables }`.
Supply an `input` mapper for a different operation shape and `bindings` to extract
nested period or dimension inputs. Mappings must preserve the selected values.

`dimensionFilter` requires exactly one option source: fixed `options` or a `facet`.
Use `defineFacetFilter` to bind a facet operation and its typed input. The generated
`DimensionPicker` preserves cached options during refresh and failure, offers
missing values separately, and retains selected values absent from a result with
zero counts. `SelectableBarChart` can share controlled selection with the picker.

## Findings and inspection

`DataWidget` composes a body, toolbar feedback, and footer. Widgets and their
inspection sheets render the same visual and controls. Keep interactive state
above both mounts when authoring custom children.

`DataApp.story` receives the displayed snapshot, including its original input
during refresh or failure. Return one to four `StoryFinding` values with unique
IDs and registered evidence. `PresentStory` presents those findings directly;
`context.finding` validates their evidence against the context registry.

### Migration from the earlier runtime

- `DataWidget` replaces the internal `DataPanel` shell and `StorySection` layout.
- `PresentStory` replaces `PlayStory`; provide `findings` with explicit `evidence`.
- `context.finding` replaces `context.storyStep`.
- Table pagination is enabled by default; use `pagination={false}` for complete tables.

## Component gallery

Contributors can preview `/gallery` on the browser fixture server with
`bun browser-tests/server.ts`. The gallery covers control, widget, request,
inspection, and narrow-layout defaults. `bun run test:browser` verifies desktop
and phone interactions. Fixtures are excluded from the published package.

Previous data and evidence are retained only when the input changes within the
same operation. Switching to another operation shows its own cached response or
an initial loading/error state; it never inherits another operation's result.

When a trusted parent supplies [parent presentation](embed.md#parent-presentation),
`DataApp` follows its resolved theme and suppresses local theme controls,
including in presentations. In the Altertable frontend (`surface: 'altertable'`),
only toolbar actions remain above the app body; the title, scope, description, and
footer are omitted. Variables and request states remain available.
