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

`<DataApp>` owns one primary view and its toolbar. Use `<DataSection>` for
independently queried content, passing each view's source to its bound widgets:

```tsx
const salesContent = salesView.content(source => (
  <MetricWidget metric={revenue} source={source} />
));
const acquisitionContent = acquisitionView.content(source => (
  <TableWidget dataset={acquisition} source={source} />
));

<DataApp view={salesView} datasets={[sales]} story={salesFindings}>
  <DataSection content={salesContent} />
  <DataSection content={acquisitionContent} />
</DataApp>;
```

Widgets preserve their frames across loading, empty results, and errors. A failed
refresh retains the displayed data and its original input. Query Retry refreshes
the whole view; rendering Retry remounts only the failed widget without SQL.
Access and rejected-query failures omit ineffective retries.

Derive labels, findings, and exports from the displayed input. For custom content,
narrow with `'data' in source` before reading data. Live content also provides
`refetch()` and `cancel()`. A widget never starts a request.

Keep results that must agree in one operation and view. An uncaught query failure
rejects the entire operation. Never substitute zero or empty arrays for a failure;
a measured zero is data. Define `isEmpty` and useful `emptyFallback` copy.

Use `getDataFailure(error)` for safe custom feedback and retryability. Rendering
boundaries catch selectors and React rendering; asynchronous callbacks use the
normal request path.
