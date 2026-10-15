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

## Recover widgets independently

Register independently available views on `<DataApp>` and render bound widgets
directly. Omit `source` to use the binding's registered live view:

```tsx
<DataApp
  views={{ sales: salesView, acquisition: acquisitionView }}
  datasets={[sales, acquisition]}
  story={({ sales, acquisition }) => [
    ...(sales ? salesFindings(sales) : []),
    ...(acquisition ? acquisitionFindings(acquisition) : []),
  ]}
>
  <Grid columns={2}>
    <MetricWidget metric={revenue} />
    <TableWidget dataset={acquisition} />
  </Grid>
</DataApp>
```

Widgets derive skeletons, empty results, errors, displayed scope, and retry from
their view. An initial failure replaces the body; a failed refresh retains the
last successful result and its original input. Retry refreshes the widget's whole
view. Rendering retry remounts only the failed widget, without rerunning SQL.
Access and rejected-query failures direct the reader to the app owner.

Put widgets that must agree on one view. Use separate views for independently
available data. An uncaught query failure rejects its entire operation; successful
sibling queries are not partial results. A failed request is unavailable data;
never replace it with zero or an empty array.

Reuse the same variable definition across views to show one shared control.
Conflicting variable names or URL keys are rejected. Use unique glossary and
identifier entries, or share their definitions across data contexts.

Use `view.content()` with `<DataSection>` for a shared custom layout, and pass its
`source` explicitly. Explicit sources render the supplied snapshot without starting
a request. A live widget must belong to a view registered on its containing
`<DataApp>`. Rendering boundaries catch React rendering and selector failures;
handle asynchronous callbacks through the normal request path.

See the [recovery example](../examples/recovery-data-app/README.md) for deterministic
failure controls and the same workflows exercised by browser tests.

For deliberately custom request UI, `getDataFailure(error)` returns a safe message,
typed code, retryability, and optional request ID. Keep business data separate from
request failures; default widgets need no error configuration.
