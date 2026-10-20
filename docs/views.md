# Views and displayed results

## Bind a view

```tsx
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  DataApp,
  DataSection,
} from '@altertable/data-app-react';
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
Keep scope variable values in required operation input fields with the same names
to derive their bindings. Other input shapes require typed
`bindings` that read each selection back unchanged. Derive scalar SQL parameters
inside the operation rather than replacing the selections in the view input.
The operation and `ActivityWidgets` are app-owned. Define [filters](variables.md),
[bindings](widgets.md#declare-datasets-and-metrics), and [evidence](data-context.md)
for the app's question. Use the same [date contract](contract.md#shared-date-ranges)
for the operation and time view.

## Preserve displayed results

Bind widgets to the source supplied by `view.content()`. Derive scope labels,
stories, and exports from its displayed input, including during refreshes.
Use `result.scope` inside `view.content()` and `view.scope(snapshot)` in stories.
Keep related datasets in one view for a consistent snapshot. Use `<DataSection>`
for independently queried content and let views own request state. Keep static
introductions outside loading boundaries; skeletonize only dynamic content.

A measured zero is valid data. Define `isEmpty` for the analysis and provide
useful `emptyFallback` copy.

## Detail destinations

Use `createDataHooks(client).defineDetailView()` for a scoped population or entity.
The destination owns its input parser, operation, datasets, evidence, and content.
Pass its content to `<DataApp details={[ordersDetail]}>`:

```tsx
const ordersView = defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'orders',
  dataContext,
  parseInput: operations.orders.input,
  describeInput: describeOrderScope,
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No contributing orders' },
});
const ordersDetail = ordersView.content(source => (
  <TableWidget dataset={orders} source={source} />
));
```

Declare `orders` with `ordersView.dataset()`. Detail inputs contain serializable
scope and IDs; exclude entire records, credentials, and protected server values.
Validate selected members through the same `variableInput()` parser used by the dashboard.
The main app owns stories and exports, including when a detail is open.

### Contributing metric records

Attach a destination to a metric and supply it to the existing inspection trigger:

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

Match record inclusion to the metric and explain non-additive metrics. State
completeness limits visibly. Query matching records rather than filtering a
capped dashboard preview; use server pagination for larger populations.
