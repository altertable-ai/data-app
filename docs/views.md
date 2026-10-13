# Views and displayed results

## Bind a view

```tsx
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  DataApp,
  DataSection,
} from '@altertable/data-app/react';
import type { operations } from '#app/operations.ts';

const client = createDataClient<typeof operations>();
const { defineDataView } = createDataHooks(client);
const activityView = defineDataView({
  dataContext,
  operation: 'activity',
  describeInput: () => 'all activity',
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No activity' },
});
const content = activityView.content(result => (
  <ActivityWidgets source={result} />
));

function App() {
  return (
    <DataApp view={activityView} story={story} datasets={[activityDataset]}>
      <DataSection content={content} />
    </DataApp>
  );
}
```

Omit `variables` when there are no controls. Omit `input` when the resolved
variables match the operation input; nested or different inputs need a mapper.
Keep dimension, numeric, and boolean selections in required operation input fields
with the same names to derive their bindings. Other input shapes require typed
`bindings` that read each selection back unchanged. Derive scalar SQL parameters
inside the operation rather than replacing the selections in the view input.
The operation and `ActivityWidgets` are app-owned. The bound widgets derive
loading content from their source; see [widgets](widgets.md) and the
[complete starter](../examples/starter-data-app/index.tsx). Define
[filters](variables.md), [context and evidence](data-context.md), and
[story and datasets](stories-and-export.md) for the app's question.

Render static text immediately; skeletonize only dynamic content. Keep section
introductions outside request boundaries so they remain visible on empty and
error states.

Use `<DataSection>` for each independently fetched subtree and `view.content()`
to share its loading and ready layout. Refreshes retain displayed content.

Use `<DataValue>` for a dynamic value within static prose:

```tsx
<p>
  Orders in the last 7 days: <DataValue metric={weeklyOrders} source={result} />
</p>
```

Bind the whole sentence with `<TextWidget>` when its wording depends on the result.
Use `<DataValue scope={result.scope} />` for the displayed scope label.

Use the same [date range contract](contract.md#shared-date-ranges) for the
operation and its view. For nested inputs in `defineTimeView()`, use
`bindings.period` to extract the selected period; see the
[time-view example](variables.md#declare-controls-once).

Use `result.scope` inside `view.content()` to show scope text. In stories and exports,
`view.scope(snapshot)` returns the same label from the displayed input, using
`describeInput` or the view's date label.

Declare standard controls in the view's [variables](variables.md). Keep
local-only filters out of the operation's `input`.

For large tables, use query-backed pagination with a stable sort and total
count. Client pagination and search cover only the rows already returned.

Declare evidence references on `view.dataset()` for charts and tables. `<MetricWidget>` uses
its metric definition for the label, format, and evidence; keep view-specific
descriptions on the widget.

`<MetricWidget>` and `<Comparison>` share a metric result. Comparisons
follow the displayed result's range.

Use the [format helpers](formatting-and-appearance.md) for metric formats and values in tables,
charts, and custom views.

## Preserve displayed results

Bind widgets to the source supplied by `view.content()`. Derive scope labels,
stories, and exports from its displayed input, including during refreshes.
Keep related datasets in one view so their results stay consistent; use
`<DataSection>` for independently queried content. Let the view handle loading,
errors, and refreshes instead of duplicating request state in app code.

A measured zero is valid data. Define `isEmpty` for the analysis and provide
useful `emptyFallback` copy.

## Detail destinations

Use `defineDetailView()` for a query-backed destination opened from a metric,
chart item, or table row. It receives an explicit input; dashboard variables
remain owned by the source view. Reuse the operation's input parser to validate
both detail actions and shared links.

```tsx
const ordersView = defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'orders',
  dataContext,
  parseInput: operations.orders.input,
  describeInput: input => describeOrderScope(input),
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No contributing orders' },
});
const orders = ordersView.dataset({
  name: 'Orders',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: { id: { value: row => row.id } },
  evidence: { id: 'orders', queryNames: ['orders'] },
});
const ordersDetail = ordersView.content(source => (
  <TableWidget dataset={orders} source={source} />
));
```

Register content with `<DataApp details={[ordersDetail]} …>` and declare a
[detail action](widgets.md#explore-from-widgets) on the source binding. Detail
content and evidence use the destination's displayed result. Detail sheets omit
the app toolbar; refresh, export, and story actions belong to the main app.
The sheet keeps the dashboard mounted and restores focus when closed.

Destination inputs must be JSON-serializable, contain only the scope needed by
the operation, and fit in the shared URL. Use IDs rather than entire records;
keep credentials and protected execution parameters out of inputs. Resolve
relative periods to explicit dates when the investigation must retain its
original dates. `describeInput()` should name the entity or population, period,
and relevant filters. Reopened links validate input before executing a request.

Browser Back/Forward follows detail URL state. Close and Escape remove the detail
state from the current URL, preserving dashboard variables. Initial failures
show Retry; refresh failures retain the displayed result and its scope. A
missing entity should return an empty result with useful recovery copy.
